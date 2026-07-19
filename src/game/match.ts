import { overlaps, type Rect } from '../engine/collision';
import type { InputManager, PadState } from '../engine/input';
import { emptyPad } from '../engine/input';
import { VIEW_W, VIEW_H } from '../engine/renderer';
import { Fighter, GROUND_Y, neutralInput, type FrameInput } from './fighter';
import { Projectile } from './projectile';
import { drawFighterSprite } from './pose';
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
  animTick = 0;
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
    this.animTick++;

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
    // sunset sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#2b1a4e');
    sky.addColorStop(0.45, '#7a3558');
    sky.addColorStop(0.8, '#d96a4e');
    sky.addColorStop(1, '#f2a556');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, GROUND_Y);
    // sun
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(this.sx(560, 0.15), 150, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,217,138,0.25)';
    ctx.beginPath();
    ctx.arc(this.sx(560, 0.15), 150, 58, 0, Math.PI * 2);
    ctx.fill();
    // clouds
    ctx.fillStyle = 'rgba(255,190,160,0.35)';
    for (const [cx, cy, cw] of [[80, 70, 120], [340, 45, 90], [640, 95, 150], [900, 60, 110]] as const) {
      ctx.fillRect(this.sx(cx, 0.2), cy, cw, 10);
      ctx.fillRect(this.sx(cx, 0.2) + 18, cy - 8, cw * 0.6, 8);
    }
    // far skyline silhouette with lit windows
    ctx.fillStyle = '#3a2247';
    FAR_BUILDINGS.forEach((h, i) => {
      const bx = this.sx(i * 90, 0.35);
      ctx.fillRect(bx, GROUND_Y - h - 46, 70, h + 46);
      ctx.fillStyle = 'rgba(255,214,120,0.55)';
      for (let wy = GROUND_Y - h - 34; wy < GROUND_Y - 26; wy += 16) {
        for (let wx = bx + 8; wx < bx + 62; wx += 16) {
          if ((wx + wy + i * 7) % 48 < 30) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      ctx.fillStyle = '#3a2247';
    });
    // mid-ground rooftop band with railing
    ctx.fillStyle = '#552e44';
    ctx.fillRect(0, GROUND_Y - 88, VIEW_W, 88);
    ctx.fillStyle = '#6b3a50';
    for (const px of MID_PILLARS) {
      ctx.fillRect(this.sx(px, 0.6), GROUND_Y - 118, 22, 118);
      ctx.fillRect(this.sx(px, 0.6) - 6, GROUND_Y - 124, 34, 8);
    }
    ctx.fillStyle = '#7c4257';
    ctx.fillRect(0, GROUND_Y - 92, VIEW_W, 6);
    // fighting floor
    const floor = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
    floor.addColorStop(0, '#8a5a4a');
    floor.addColorStop(1, '#4a2f2a');
    ctx.fillStyle = floor;
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = '#a5705a';
    ctx.fillRect(0, GROUND_Y, VIEW_W, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let gx = 0; gx <= STAGE_W; gx += 64) {
      ctx.fillRect(this.sx(gx), GROUND_Y + 6, 2, VIEW_H - GROUND_Y - 6);
    }
    ctx.fillRect(0, GROUND_Y + 22, VIEW_W, 2);
  }

  private drawFighter(ctx: CanvasRenderingContext2D, i: 0 | 1): void {
    const f = this.players[i];
    const px = this.sx(f.x);
    const pal = i === 0 ? f.data.appearance : f.data.altAppearance;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, GROUND_Y + 2, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const celebrating =
      (this.phase === 'roundEnd' || this.phase === 'matchOver') &&
      f.health > 0 && this.players[1 - i].health < f.health;
    drawFighterSprite(ctx, f, px, pal, this.animTick, celebrating);
    // block spark
    if (f.state === 'blockstun' && f.sf < 6) {
      ctx.fillStyle = '#8fe0ff';
      ctx.beginPath();
      ctx.arc(px + f.facing * 24, Math.round(f.y) - 60, 8 - f.sf, 0, Math.PI * 2);
      ctx.fill();
    }
    // hit spark
    if (f.state === 'hitstun' && f.sf < 6) {
      ctx.fillStyle = '#ffd23e';
      const sy = Math.round(f.y) - 70;
      const sxp = px + f.facing * 18;
      for (let s = 0; s < 5; s++) {
        const a = (s / 5) * Math.PI * 2 + f.sf;
        ctx.fillRect(sxp + Math.cos(a) * (4 + f.sf * 2), sy + Math.sin(a) * (4 + f.sf * 2), 4, 4);
      }
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const pr of this.projectiles) {
      const r = pr.rect();
      const cx = this.sx(r.x) + r.w / 2;
      const cy = Math.round(r.y) + r.h / 2;
      const pulse = 1 + Math.sin(this.animTick / 2) * 0.15;
      ctx.fillStyle = 'rgba(120,200,255,0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, 15 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9fdcff';
      ctx.beginPath();
      ctx.arc(cx, cy, 10 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - Math.sign(pr.vx) * 2, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      // trail
      ctx.fillStyle = 'rgba(120,200,255,0.25)';
      for (let t = 1; t <= 3; t++) {
        ctx.beginPath();
        ctx.arc(cx - Math.sign(pr.vx) * t * 12, cy, 10 - t * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
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
    const barW = 246;
    for (const i of [0, 1] as const) {
      const f = this.players[i];
      const x = i === 0 ? 22 : VIEW_W - 22 - barW;
      // bordered bar frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 3, 13, barW + 6, 24);
      ctx.fillStyle = '#14141e';
      ctx.fillRect(x - 1, 15, barW + 2, 20);
      ctx.fillStyle = '#7a1f2a';
      ctx.fillRect(x, 16, barW, 18);
      const ratio = f.health / f.data.health;
      const w = Math.round(barW * ratio);
      const grad = ctx.createLinearGradient(0, 16, 0, 34);
      grad.addColorStop(0, '#fff7a8');
      grad.addColorStop(0.5, '#ffe94a');
      grad.addColorStop(1, '#e0a91f');
      ctx.fillStyle = ratio > 0.25 ? grad : '#ff4b4b';
      ctx.fillRect(i === 0 ? x + barW - w : x, 16, w, 18);
      // round pips
      for (let p = 0; p < 2; p++) {
        const pipX = i === 0 ? x + p * 16 : x + barW - 12 - p * 16;
        ctx.fillStyle = '#14141e';
        ctx.fillRect(pipX - 1, 41, 14, 10);
        ctx.fillStyle = f.wins > p ? '#ffe94a' : '#3a3a4c';
        ctx.fillRect(pipX, 42, 12, 8);
      }
      // name plate
      ctx.fillStyle = 'rgba(20,20,30,0.75)';
      const nameW = 110;
      ctx.fillRect(i === 0 ? x : x + barW - nameW, 54, nameW, 14);
      ctx.fillStyle = '#ffe94a';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillText(`${f.data.name}`, i === 0 ? x + 4 : x + barW - 4, 64);
    }
    // timer plate
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(VIEW_W / 2 - 30, 8, 60, 36);
    ctx.fillStyle = '#14141e';
    ctx.fillRect(VIEW_W / 2 - 28, 10, 56, 32);
    ctx.fillStyle = this.timer <= 10 ? '#ff4b4b' : '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.timer).padStart(2, '0'), VIEW_W / 2, 34);
  }

  private bigText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number): void {
    ctx.textAlign = 'center';
    ctx.font = `bold ${size}px monospace`;
    ctx.fillStyle = '#14141e';
    ctx.fillText(text, VIEW_W / 2 + 3, y + 3);
    ctx.fillStyle = '#ffe94a';
    ctx.fillText(text, VIEW_W / 2, y);
  }

  private drawAnnouncements(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'intro') {
      this.bigText(ctx, this.phaseSf < 55 ? `ROUND ${this.round}` : 'FIGHT!', 155, 40);
    } else if (this.phase === 'roundEnd') {
      this.bigText(ctx, this.announce, 155, 48);
    } else if (this.phase === 'matchOver') {
      this.bigText(ctx, this.announce, 145, 40);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('press ENTER for a rematch', VIEW_W / 2, 175);
    }
  }
}
