import type { Rect } from '../engine/collision';
import { MotionDetector, QCF, DP, toNumpad } from '../engine/motion';
import { emptyPad, type PadState } from '../engine/input';
import type { AttackData, CharacterData, HitLevel } from './types';

export const GROUND_Y = 320;

export type FighterState =
  | 'idle' | 'walkF' | 'walkB' | 'crouch' | 'prejump' | 'jump'
  | 'attack' | 'hitstun' | 'blockstun'
  | 'launched' | 'knockdown' | 'wakeup'
  | 'throwHold' | 'thrown';

export interface FrameInput {
  held: PadState;
  pressed: PadState;
}

export function neutralInput(): FrameInput {
  return { held: emptyPad(), pressed: emptyPad() };
}

const PUNCHES = ['HP', 'MP', 'LP'] as const;
const KICKS = ['HK', 'MK', 'LK'] as const;

export class Fighter {
  x: number;
  y = GROUND_Y;
  vx = 0;
  vy = 0;
  facing: 1 | -1;
  health: number;
  wins = 0;
  state: FighterState = 'idle';
  sf = 0; // frames spent in current state
  moveId: string | null = null;
  move: AttackData | null = null;
  moveHasHit = false;
  airMove: AttackData | null = null;
  airMoveId: 'jP' | 'jK' | null = null;
  airMoveSf = 0;
  stun = 0;
  invuln = 0;
  jumpDir = 0; // -1 back, 0 neutral, 1 forward (relative to facing)
  canFire = true; // match clears this while own projectile is live
  wantsProjectile = false;
  input: FrameInput = neutralInput();
  private motion = new MotionDetector();
  private tick = 0;

  constructor(public data: CharacterData, x: number, facing: 1 | -1) {
    this.x = x;
    this.facing = facing;
    this.health = data.health;
  }

  get airborne(): boolean {
    return this.state === 'jump' || this.state === 'launched';
  }

  get actionable(): boolean {
    return this.state === 'idle' || this.state === 'walkF'
      || this.state === 'walkB' || this.state === 'crouch';
  }

  get throwable(): boolean {
    return this.actionable && !this.airborne;
  }

  get untargetable(): boolean {
    return this.invuln > 0
      || this.state === 'knockdown' || this.state === 'wakeup'
      || this.state === 'launched' || this.state === 'thrown';
  }

  resetForRound(x: number, facing: 1 | -1): void {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = this.vy = 0;
    this.facing = facing;
    this.health = this.data.health;
    this.state = 'idle';
    this.sf = 0;
    this.moveId = null;
    this.move = null;
    this.airMove = null;
    this.airMoveId = null;
    this.stun = 0;
    this.invuln = 0;
    this.wantsProjectile = false;
    this.motion.clear();
  }

  // --- boxes (world space) ---

  worldBox(b: Rect): Rect {
    return {
      x: this.facing === 1 ? this.x + b.x : this.x - b.x - b.w,
      y: this.y - b.y - b.h,
      w: b.w,
      h: b.h,
    };
  }

  pushbox(): Rect {
    const p = this.data.pushbox;
    const h = this.airborne ? p.hAir : this.state === 'crouch' || this.crouchingStance() ? p.hCrouch : p.hStand;
    return { x: this.x - p.w / 2, y: this.y - h, w: p.w, h };
  }

  private crouchingStance(): boolean {
    return (this.state === 'attack' && this.move?.stance === 'crouch')
      || (this.state === 'blockstun' && this.input.held.down);
  }

  hurtboxes(): Rect[] {
    if (this.state === 'knockdown' || this.state === 'wakeup' || this.state === 'thrown') return [];
    const p = this.data.pushbox;
    const h = this.airborne ? p.hAir
      : this.state === 'crouch' || this.crouchingStance() ? p.hCrouch : p.hStand;
    return [{ x: this.x - p.w / 2 - 4, y: this.y - h - (this.airborne ? 20 : 0), w: p.w + 8, h }];
  }

  hitboxes(): Rect[] {
    if (this.state === 'attack' && this.move?.hitbox && !this.moveHasHit) {
      const m = this.move;
      if (this.sf > m.startup && this.sf <= m.startup + m.active) return [this.worldBox(m.hitbox!)];
    }
    if (this.state === 'jump' && this.airMove?.hitbox) {
      const m = this.airMove;
      if (!this.moveHasHit && this.airMoveSf > m.startup && this.airMoveSf <= m.startup + m.active) {
        return [this.worldBox(m.hitbox!)];
      }
    }
    return [];
  }

  activeAttack(): AttackData | null {
    return this.state === 'jump' ? this.airMove : this.move;
  }

  // --- per-tick update ---

  private setState(s: FighterState): void {
    this.state = s;
    this.sf = 0;
  }

  startMove(id: string): void {
    this.moveId = id;
    this.move = this.data.moves[id];
    this.moveHasHit = false;
    this.vx = 0;
    this.invuln = this.move.invuln ?? 0;
    this.setState('attack');
  }

  update(inp: FrameInput, opp: Fighter): void {
    this.tick++;
    this.input = inp;
    const fwd = this.facing === 1 ? inp.held.right : inp.held.left;
    const back = this.facing === 1 ? inp.held.left : inp.held.right;
    this.motion.record(toNumpad(inp.held.up, inp.held.down, back, fwd), this.tick);
    if (this.invuln > 0) this.invuln--;
    this.sf++;

    switch (this.state) {
      case 'idle': case 'walkF': case 'walkB': case 'crouch': {
        this.vx = 0;
        this.facing = opp.x >= this.x ? 1 : -1;
        if (this.tryAct(inp)) break;
        if (inp.held.up) {
          this.jumpDir = fwd ? 1 : back ? -1 : 0;
          this.setState('prejump');
        } else if (inp.held.down) {
          this.state = 'crouch';
        } else if (fwd) {
          this.state = 'walkF';
          this.x += this.facing * this.data.walkF;
        } else if (back) {
          this.state = 'walkB';
          this.x -= this.facing * this.data.walkB;
        } else {
          this.state = 'idle';
        }
        break;
      }

      case 'prejump': {
        if (this.sf >= this.data.prejump) {
          this.vy = this.data.jumpVelY;
          this.vx = this.jumpDir * this.facing * this.data.jumpVelX;
          this.setState('jump');
          this.airMove = null;
        }
        break;
      }

      case 'jump': {
        if (!this.airMove) {
          if (PUNCHES.some((b) => inp.pressed[b])) { this.airMove = this.data.moves.jP; this.airMoveId = 'jP'; this.airMoveSf = 0; this.moveHasHit = false; }
          else if (KICKS.some((b) => inp.pressed[b])) { this.airMove = this.data.moves.jK; this.airMoveId = 'jK'; this.airMoveSf = 0; this.moveHasHit = false; }
        } else {
          this.airMoveSf++;
        }
        this.applyGravity();
        if (this.y >= GROUND_Y) this.land();
        break;
      }

      case 'attack': {
        const m = this.move!;
        if (m.projectile && this.sf === m.startup) this.wantsProjectile = true;
        // special-cancel window on contact
        if (m.cancelable && this.moveHasHit && this.sf <= m.startup + m.active + 6) {
          if (PUNCHES.some((b) => inp.pressed[b])) {
            if (this.motion.matches(DP, this.tick)) { this.startMove('DPP'); break; }
            if (this.canFire && this.motion.matches(QCF, this.tick)) { this.startMove('QCFP'); break; }
          }
        }
        if (this.sf > m.startup + m.active + m.recovery) {
          this.move = null;
          this.moveId = null;
          this.setState(inp.held.down ? 'crouch' : 'idle');
        }
        break;
      }

      case 'hitstun': case 'blockstun': {
        this.x += this.vx;
        this.vx *= 0.82;
        if (--this.stun <= 0) {
          this.vx = 0;
          this.setState(inp.held.down ? 'crouch' : 'idle');
        }
        break;
      }

      case 'launched': {
        this.applyGravity();
        if (this.y >= GROUND_Y) {
          this.y = GROUND_Y;
          this.vx = this.vy = 0;
          this.setState('knockdown');
        }
        break;
      }

      case 'knockdown': {
        if (this.sf >= 45 && this.health > 0) {
          this.invuln = 15;
          this.setState('wakeup');
        }
        break;
      }

      case 'wakeup': {
        if (this.sf >= 15) this.setState('idle');
        break;
      }

      case 'throwHold': {
        if (this.sf >= 30) this.setState('idle');
        break;
      }

      case 'thrown':
        break; // positioned by the match while held
    }
  }

  private applyGravity(): void {
    this.x += this.vx;
    this.vy += this.data.gravity;
    this.y += this.vy;
  }

  private land(): void {
    this.y = GROUND_Y;
    this.vx = this.vy = 0;
    this.airMove = null;
    this.airMoveId = null;
    this.setState('idle');
  }

  private tryAct(inp: FrameInput): boolean {
    const p = inp.pressed;
    const h = inp.held;
    // throw attempt: LP+LK together
    if ((p.LP && h.LK) || (p.LK && h.LP)) {
      this.startMove('throw');
      return true;
    }
    if (PUNCHES.some((b) => p[b])) {
      if (this.motion.matches(DP, this.tick)) { this.startMove('DPP'); return true; }
      if (this.canFire && this.motion.matches(QCF, this.tick)) { this.startMove('QCFP'); return true; }
    }
    const crouching = h.down;
    for (const b of [...PUNCHES, ...KICKS]) {
      if (p[b]) {
        const id = crouching && this.data.moves[`2${b}`] ? `2${b}` : `5${b}`;
        if (this.data.moves[id]) {
          this.startMove(id);
          return true;
        }
      }
    }
    return false;
  }

  // --- getting hit ---

  canBlock(level: HitLevel, attackerX: number): boolean {
    if (!(this.actionable || this.state === 'blockstun')) return false;
    const attackerSide = attackerX >= this.x ? 1 : -1;
    const holdingBack = attackerSide === 1 ? this.input.held.left : this.input.held.right;
    if (!holdingBack) return false;
    if (level === 'low' && !this.input.held.down) return false;
    if (level === 'high' && this.input.held.down) return false;
    return true;
  }

  receiveHit(move: AttackData, attackerX: number, blocked: boolean): void {
    const away = this.x >= attackerX ? 1 : -1;
    if (blocked) {
      this.health = Math.max(1, this.health - (move.special ? Math.floor(move.damage / 4) : 0));
      this.stun = move.blockstun;
      this.vx = away * move.pushbackBlock * 0.9;
      this.setState('blockstun');
      return;
    }
    this.health = Math.max(0, this.health - move.damage);
    const ko = this.health === 0;
    if (ko || move.knockdown || this.airborne) {
      this.vx = away * Math.max(3, move.pushbackHit * 0.7);
      this.vy = ko ? -8 : -7;
      this.y -= 1; // leave the ground so 'launched' physics take over
      this.setState('launched');
    } else {
      this.stun = move.hitstun;
      this.vx = away * move.pushbackHit * 0.9;
      this.setState('hitstun');
    }
  }

  receiveThrow(damage: number, awayDir: number): void {
    this.health = Math.max(0, this.health - damage);
    this.vx = awayDir * 5;
    this.vy = -8;
    this.y -= 1;
    this.setState('launched');
  }
}
