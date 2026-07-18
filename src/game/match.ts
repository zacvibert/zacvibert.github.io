import { overlaps, type Rect } from '../engine/collision';
import type { InputManager, PadState } from '../engine/input';
import { emptyPad } from '../engine/input';
import { VIEW_W, VIEW_H } from '../engine/renderer';
import { Fighter, GROUND_Y, neutralInput, type FrameInput } from './fighter';
import { Projectile } from './projectile';
import type { CharacterData } from './types';

export const STAGE_W = 960;
const ROUND_TIME = 99;
const WINS_NEEDED = 2;

type Phase = 'intro' | 'fight' | 'roundEnd' | 'matchOver';

// Fixed layouts for the placeholder stage parallax layers.
const FAR_BUILDINGS = [70, 120, 90, 150, 60, 130, 100, 80, 140, 95, 110, 75];
const MID_PILLARS = [0, 180, 360, 540, 720, 900];

export class Match {
  players: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  phase: Phase = 'intro';
  phaseSf = 0;
  round = 1;
  timer = ROUND_TIME;
  timerTicks = 0;
  hitstop = 0;
  camX = 0;
  announce = '';
  winner: 0 | 1 | null = null;
  private prevHeld: [PadState, PadState] = [emptyPad(), emptyPad()];

  constructor(private input: InputManager, data: CharacterData) {
    this.players = [
      new Fighter(data, STAGE_W / 2 - 120, 1),
      new Fighter(data, STAGE_W / 2 + 120, -1),
    ];
    this.camX = STAGE_W / 2 - VIEW_W / 2;
  }

  private readInputs(): [FrameInput, FrameInput] {
    const out: FrameInput[] = [];
    for (const i of [0, 1] as const) {
      const held = this.input.read(i);
      const prev = this.prevHeld[i];
      const pressed = emptyPad();
      for (const k of Object.keys(held) as (keyof PadState)[]) {
        pressed[k] = held[k] && !prev[k];
      }
      this.prevHeld[i] = held;
      out.push({ held, pressed });
    }
    return out as [FrameInput, FrameInput];
  }

  update(): void {
    this.phaseSf++;
    const live = this.readInputs();
    const inputs: [FrameInput, FrameInput] =
      this.phase === 'fight' ? live : [neutralInput(), neutralInput()];

    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    const [p1, p2] = this.players;
    for (const i of [0, 1] as const) {
      this.players[i].canFire = !this.projectiles.some((pr) => pr.alive && pr.owner === i);
    }
    p1.update(inputs[0], p2);
    p2.update(inputs[1], p1);

    this.holdThrownVictim();
    this.spawnProjectiles();
    for (const pr of this.projectiles) pr.update(STAGE_W);
    this.projectiles = this.projectiles.filter((pr) => pr.alive);

    this.separatePushboxes();
    for (const f of this.players) f.x = Math.min(STAGE_W - 24, Math.max(24, f.x));
    this.updateCamera();

    if (this.phase === 'fight') {
      this.resolveThrows();
      this.resolveHits();
      this.tickTimer();
      this.checkRoundEnd();
    } else if (this.phase === 'intro' && this.phaseSf >= 90) {
      this.setPhase('fight');
    } else if (this.phase === 'roundEnd' && this.phaseSf >= 150) {
      this.finishRound();
    }
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseSf = 0;
  }

  private holdThrownVictim(): void {
    for (const i of [0, 1] as const) {
      const a = this.players[i];
      const d = this.players[1 - i];
      if (a.state === 'throwHold' && d.state === 'thrown') {
        d.x = a.x + a.facing * 34;
        d.y = GROUND_Y;
        if (a.sf === 16) {
          d.receiveThrow(a.data.moves.throw.damage, a.facing);
          this.hitstop = 8;
        }
      }
    }
  }

  private spawnProjectiles(): void {
    for (const i of [0, 1] as const) {
      const f = this.players[i];
      if (f.wantsProjectile) {
        f.wantsProjectile = false;
        if (f.canFire) {
          this.projectiles.push(new Projectile(
            i, f.x + f.facing * 40, GROUND_Y - 60,
            f.facing * f.data.projectileSpeed, f.data.moves.QCFP,
          ));
        }
      }
    }
  }

  private separatePushboxes(): void {
    const [a, b] = this.players;
    const ra = a.pushbox();
    const rb = b.pushbox();
    if (!overlaps(ra, rb)) return;
    const overlap = Math.min(ra.x + ra.w, rb.x + rb.w) - Math.max(ra.x, rb.x);
    const dir = a.x <= b.x ? 1 : -1;
    a.x -= (dir * overlap) / 2;
    b.x += (dir * overlap) / 2;
  }

  private updateCamera(): void {
    const mid = (this.players[0].x + this.players[1].x) / 2;
    const target = Math.min(STAGE_W - VIEW_W, Math.max(0, mid - VIEW_W / 2));
    this.camX += (target - this.camX) * 0.2;
    for (const f of this.players) {
      f.x = Math.min(this.camX + VIEW_W - 24, Math.max(this.camX + 24, f.x));
    }
  }

  private resolveThrows(): void {
    for (const i of [0, 1] as const) {
      const a = this.players[i];
      const d = this.players[1 - i];
      if (a.moveId !== 'throw' || a.state !== 'attack' || a.moveHasHit) continue;
      const m = a.data.moves.throw;
      if (a.sf <= m.startup || a.sf > m.startup + m.active) continue;
      const reach = a.data.throwRange + a.data.pushbox.w;
      if (Math.abs(a.x - d.x) <= reach && d.throwable && d.invuln === 0) {
        a.moveHasHit = true;
        a.state = 'throwHold';
        a.sf = 0;
        d.state = 'thrown';
        d.sf = 0;
      }
    }
  }

  private resolveHits(): void {
    interface Contact { attacker: Fighter; defender: Fighter; moveKey: 'fighter' | Projectile }
    const contacts: Contact[] = [];

    for (const i of [0, 1] as const) {
      const a = this.players[i];
      const d = this.players[1 - i];
      if (d.untargetable) continue;
      const hurt = d.hurtboxes();
      if (a.hitboxes().some((hb) => hurt.some((r) => overlaps(hb, r)))) {
        contacts.push({ attacker: a, defender: d, moveKey: 'fighter' });
      }
      for (const pr of this.projectiles) {
        if (pr.alive && pr.owner === i && hurt.some((r) => overlaps(pr.rect(), r))) {
          contacts.push({ attacker: a, defender: d, moveKey: pr });
        }
      }
    }

    // projectile vs projectile: clash destroys both
    const [pa, pb] = [
      this.projectiles.find((p) => p.owner === 0 && p.alive),
      this.projectiles.find((p) => p.owner === 1 && p.alive),
    ];
    if (pa && pb && overlaps(pa.rect(), pb.rect())) {
      pa.alive = pb.alive = false;
      this.hitstop = 6;
    }

    for (const c of contacts) {
      const move = c.moveKey === 'fighter' ? c.attacker.activeAttack() : c.moveKey.move;
      if (!move) continue;
      if (c.moveKey === 'fighter') c.attacker.moveHasHit = true;
      else c.moveKey.alive = false;
      const blocked = c.defender.canBlock(move.level, c.attacker.x);
      c.defender.receiveHit(move, c.attacker.x, blocked);
      this.hitstop = Math.max(this.hitstop, blocked ? 5 : move.damage >= 70 ? 10 : 8);
    }
  }

  private tickTimer(): void {
    if (++this.timerTicks >= 60) {
      this.timerTicks = 0;
      if (--this.timer <= 0) {
        const [p1, p2] = this.players;
        this.announce = 'TIME UP';
        this.roundWinner = p1.health === p2.health ? null : p1.health > p2.health ? 0 : 1;
        this.setPhase('roundEnd');
      }
    }
  }

  private roundWinner: 0 | 1 | null = null;

  private checkRoundEnd(): void {
    const [p1, p2] = this.players;
    if (p1.health === 0 || p2.health === 0) {
      this.announce = 'K.O.';
      this.roundWinner = p1.health === 0 && p2.health === 0 ? null : p1.health === 0 ? 1 : 0;
      this.setPhase('roundEnd');
    }
  }

  private finishRound(): void {
    if (this.roundWinner !== null) this.players[this.roundWinner].wins++;
    const champ = this.players.findIndex((f) => f.wins >= WINS_NEEDED);
    if (champ >= 0) {
      this.winner = champ as 0 | 1;
      this.announce = `PLAYER ${champ + 1} WINS`;
      this.setPhase('matchOver');
      return;
    }
    this.round++;
    this.timer = ROUND_TIME;
    this.timerTicks = 0;
    this.projectiles = [];
    this.players[0].resetForRound(STAGE_W / 2 - 120, 1);
    this.players[1].resetForRound(STAGE_W / 2 + 120, -1);
    this.setPhase('intro');
  }

  // ------------------------------------------------------------------ drawing

  draw(ctx: CanvasRenderingContext2D, debug: boolean): void {
    this.drawStage(ctx);
    for (const i of [0, 1] as const) this.drawFighter(ctx, i);
    this.drawProjectiles(ctx);
    if (debug) this.drawDebug(ctx);
    this.drawHud(ctx);
    this.drawAnnouncements(ctx);
  }

  private sx(x: number, parallax = 1): number {
    return Math.round(x - this.camX * parallax);
  }

  private drawStage(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1b2440';
    ctx.fillRect(0, 0, VIEW_W, 180);
    ctx.fillStyle = '#273356';
    ctx.fillRect(0, 180, VIEW_W, GROUND_Y - 180);
    // far skyline (slow parallax)
    ctx.fillStyle = '#202a49';
    FAR_BUILDINGS.forEach((h, i) => {
      ctx.fillRect(this.sx(i * 90, 0.3), GROUND_Y - h - 40, 70, h + 40);
    });
    // mid pillars
    ctx.fillStyle = '#2e3a63';
    for (const px of MID_PILLARS) {
      ctx.fillRect(this.sx(px, 0.6), GROUND_Y - 150, 26, 150);
    }
    // floor
    ctx.fillStyle = '#3a3746';
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = '#575269';
    ctx.fillRect(0, GROUND_Y, VIEW_W, 2);
    ctx.fillStyle = '#443f52';
    for (let gx = 0; gx <= STAGE_W; gx += 40) {
      ctx.fillRect(this.sx(gx), GROUND_Y + 4, 2, VIEW_H - GROUND_Y - 4);
    }
  }

  private drawFighter(ctx: CanvasRenderingContext2D, i: 0 | 1): void {
    const f = this.players[i];
    const base = i === 0 ? '#46c8a5' : '#e8794e';
    const dark = i === 0 ? '#2c8a72' : '#a54f31';
    const px = this.sx(f.x);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px - 22, GROUND_Y - 3, 44, 6);

    if (f.state === 'knockdown' || (f.state === 'launched' && f.vy > 4)) {
      ctx.fillStyle = dark;
      ctx.fillRect(px - 40, Math.round(f.y) - 24, 80, 24);
      return;
    }

    const pb = f.pushbox();
    const flash = (f.state === 'hitstun' || f.state === 'thrown') && f.sf % 4 < 2;
    ctx.fillStyle = flash ? '#ffffff' : base;
    ctx.fillRect(this.sx(pb.x), Math.round(pb.y), pb.w, pb.h);
    // head block with an eye marker showing facing
    ctx.fillStyle = dark;
    const headX = px + (f.facing === 1 ? 2 : -18);
    ctx.fillRect(headX, Math.round(pb.y) - 2, 16, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + (f.facing === 1 ? 12 : -16), Math.round(pb.y) + 2, 4, 4);

    // active hitbox shown as the striking limb
    for (const hb of f.hitboxes()) {
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(this.sx(hb.x), Math.round(hb.y), hb.w, hb.h);
    }
    // block shield
    if (f.state === 'blockstun') {
      ctx.fillStyle = '#6fd7ff';
      const shieldX = f.facing === 1 ? this.sx(pb.x) + pb.w : this.sx(pb.x) - 4;
      ctx.fillRect(shieldX, Math.round(pb.y), 4, pb.h);
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const pr of this.projectiles) {
      const r = pr.rect();
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(this.sx(r.x), Math.round(r.y), r.w, r.h);
      ctx.fillStyle = 'rgba(255,210,62,0.4)';
      ctx.fillRect(this.sx(r.x) - Math.sign(pr.vx) * 18, Math.round(r.y) + 4, 16, r.h - 8);
    }
  }

  private strokeRects(ctx: CanvasRenderingContext2D, rects: Rect[], color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (const r of rects) ctx.strokeRect(this.sx(r.x) + 0.5, Math.round(r.y) + 0.5, r.w, r.h);
  }

  private drawDebug(ctx: CanvasRenderingContext2D): void {
    for (const i of [0, 1] as const) {
      const f = this.players[i];
      this.strokeRects(ctx, [f.pushbox()], '#5599ff');
      this.strokeRects(ctx, f.hurtboxes(), '#44ff66');
      this.strokeRects(ctx, f.hitboxes(), '#ff4444');
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = i === 0 ? 'left' : 'right';
      const tx = i === 0 ? 8 : VIEW_W - 8;
      const move = f.moveId ?? (f.airMove ? 'air' : '-');
      ctx.fillText(`${f.state} f${f.sf} ${move} hp${f.health}`, tx, 70);
    }
    for (const pr of this.projectiles) this.strokeRects(ctx, [pr.rect()], '#ff4444');
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    const barW = 250;
    for (const i of [0, 1] as const) {
      const f = this.players[i];
      const x = i === 0 ? 20 : VIEW_W - 20 - barW;
      ctx.fillStyle = '#101018';
      ctx.fillRect(x - 2, 14, barW + 4, 22);
      ctx.fillStyle = '#5a2430';
      ctx.fillRect(x, 16, barW, 18);
      const ratio = f.health / f.data.health;
      const w = Math.round(barW * ratio);
      ctx.fillStyle = ratio > 0.5 ? '#ffe94a' : ratio > 0.25 ? '#ff9d3b' : '#ff4b4b';
      ctx.fillRect(i === 0 ? x + barW - w : x, 16, w, 18);
      // round pips
      for (let p = 0; p < 2; p++) {
        ctx.fillStyle = f.wins > p ? '#ffe94a' : '#3a3a4c';
        const pipX = i === 0 ? x + p * 14 : x + barW - 10 - p * 14;
        ctx.fillRect(pipX, 40, 10, 6);
      }
      ctx.fillStyle = '#cfd3e6';
      ctx.font = '10px monospace';
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillText(`P${i + 1} ${f.data.name}`, i === 0 ? x : x + barW, 56);
    }
    ctx.fillStyle = '#101018';
    ctx.fillRect(VIEW_W / 2 - 26, 10, 52, 30);
    ctx.fillStyle = this.timer <= 10 ? '#ff4b4b' : '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.timer).padStart(2, '0'), VIEW_W / 2, 33);
  }

  private drawAnnouncements(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    if (this.phase === 'intro') {
      ctx.font = 'bold 34px monospace';
      ctx.fillText(this.phaseSf < 55 ? `ROUND ${this.round}` : 'FIGHT!', VIEW_W / 2, 150);
    } else if (this.phase === 'roundEnd') {
      ctx.font = 'bold 40px monospace';
      ctx.fillText(this.announce, VIEW_W / 2, 150);
    } else if (this.phase === 'matchOver') {
      ctx.font = 'bold 34px monospace';
      ctx.fillText(this.announce, VIEW_W / 2, 140);
      ctx.font = '14px monospace';
      ctx.fillText('press ENTER for a rematch', VIEW_W / 2, 170);
    }
  }
}
