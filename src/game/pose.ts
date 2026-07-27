import type { Fighter } from './fighter';

// Articulated "paper-doll" fighter rendering. All original artwork, drawn
// procedurally: a skeleton of joints posed per state, rendered as thick
// rounded limbs with a gi, belt, headband and fists. Coordinates are relative
// to the feet origin, facing right (+x toward the opponent, y up as negative).

export interface Palette {
  skin: string;
  gi: string;
  giDark: string;
  accent: string; // headband / belt tips
}

type Pt = [number, number];

interface Pose {
  head: Pt;
  neck: Pt;
  hip: Pt;
  nearElbow: Pt; nearHand: Pt;
  farElbow: Pt; farHand: Pt;
  nearKnee: Pt; nearFoot: Pt;
  farKnee: Pt; farFoot: Pt;
  rotate?: number; // radians, applied around the origin (for launched spins)
  lying?: boolean;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function standPose(bounce = 0): Pose {
  return {
    head: [3, -97 + bounce],
    neck: [0, -86 + bounce],
    hip: [0, -48 + bounce],
    nearElbow: [12, -70 + bounce], nearHand: [14, -84 + bounce],
    farElbow: [6, -68 + bounce], farHand: [9, -80 + bounce],
    nearKnee: [9, -26], nearFoot: [12, 0],
    farKnee: [-7, -26], farFoot: [-11, 0],
  };
}

function crouchPose(): Pose {
  return {
    head: [6, -66],
    neck: [2, -56],
    hip: [-2, -30],
    nearElbow: [12, -46], nearHand: [15, -58],
    farElbow: [6, -44], farHand: [9, -54],
    nearKnee: [16, -22], nearFoot: [14, 0],
    farKnee: [-14, -22], farFoot: [-14, 0],
  };
}

function jumpPose(vy: number): Pose {
  const rise = Math.max(-1, Math.min(1, vy / 8)); // -1 rising, 1 falling
  return {
    head: [4, -92],
    neck: [0, -82],
    hip: [0, -46],
    nearElbow: [14, -72], nearHand: [20, -84 + rise * 6],
    farElbow: [-8, -70], farHand: [-14, -80],
    nearKnee: [10, -30], nearFoot: [4, -16],
    farKnee: [-4, -28], farFoot: [-10, -12],
  };
}

// Attack extension: wind-up during startup, full extension during active,
// pull back during recovery.
function attackT(sf: number, startup: number, active: number, recovery: number): number {
  if (sf <= startup) return -0.25 * (sf / startup);
  if (sf <= startup + active) return 1;
  const r = (sf - startup - active) / Math.max(1, recovery);
  return Math.max(0, 1 - r * 1.4);
}

function posePunch(base: Pose, t: number, target: Pt): Pose {
  const guard: Pt = base.nearHand;
  const wind: Pt = [guard[0] - 8, guard[1] + 2];
  const hand = t < 0 ? lerpPt(guard, wind, -t / 0.25) : lerpPt(wind, target, t);
  return {
    ...base,
    nearHand: hand,
    nearElbow: [lerp(base.nearElbow[0], (hand[0] + base.neck[0]) / 2, Math.max(0, t)), lerp(base.nearElbow[1], hand[1] + 4, Math.max(0, t))],
    head: [base.head[0] + Math.max(0, t) * 3, base.head[1]],
  };
}

function poseKick(base: Pose, t: number, target: Pt): Pose {
  const rest: Pt = base.nearFoot;
  const chamber: Pt = [rest[0] + 4, rest[1] - 18];
  const foot = t < 0 ? lerpPt(rest, chamber, -t / 0.25) : lerpPt(chamber, target, t);
  return {
    ...base,
    nearFoot: foot,
    nearKnee: [lerp(base.nearKnee[0], foot[0] * 0.55, Math.max(0, t)), lerp(base.nearKnee[1], foot[1] - 14, Math.max(0, t))],
    nearHand: [base.nearHand[0] - Math.max(0, t) * 6, base.nearHand[1]],
    head: [base.head[0] - Math.max(0, t) * 2, base.head[1]],
  };
}

export function buildPose(f: Fighter, tick: number, celebrating: boolean): Pose {
  const bounce = Math.sin(tick / 9) * 1.5;

  switch (f.state) {
    case 'idle':
      break;
    case 'walkF': case 'walkB': {
      const ph = tick / 4;
      const p = standPose(Math.abs(Math.sin(ph)) * -1.5);
      p.nearFoot = [12 + Math.sin(ph) * 10, -Math.max(0, Math.sin(ph + 1)) * 4];
      p.farFoot = [-11 - Math.sin(ph) * 10, -Math.max(0, -Math.sin(ph + 1)) * 4];
      return p;
    }
    case 'crouch':
      return crouchPose();
    case 'prejump': {
      const p = crouchPose();
      p.nearHand = [10, -70]; p.farHand = [4, -66];
      return p;
    }
    case 'jump': {
      const p = jumpPose(f.vy);
      const m = f.airMove;
      if (m) {
        const t = attackT(f.airMoveSf, m.startup, m.active, 8);
        return m.name.includes('Punch')
          ? posePunch(p, t, [34, -60])
          : poseKick(p, t, [42, -34]);
      }
      return p;
    }
    case 'attack': {
      const m = f.move!;
      const t = attackT(f.sf, m.startup, m.active, m.recovery);
      const id = f.moveId ?? '';
      const base = m.stance === 'crouch' ? crouchPose() : standPose(0);
      if (id === 'QCFP') {
        // both palms thrust forward
        const p = standPose(0);
        p.nearHand = lerpPt([8, -76], [34, -68], Math.max(0, t));
        p.farHand = lerpPt([4, -72], [32, -62], Math.max(0, t));
        p.nearElbow = [18, -72]; p.farElbow = [14, -66];
        p.head = [1, -95];
        return p;
      }
      if (id === 'DPP') {
        const p = standPose(0);
        const tt = Math.max(0, t);
        p.nearHand = lerpPt([12, -70], [20, -132], tt);
        p.nearElbow = lerpPt([12, -66], [14, -104], tt);
        p.farHand = [-6, -60];
        p.hip = [0, lerp(-44, -52, tt)];
        p.head = [5, lerp(-92, -102, tt)];
        p.nearKnee = [12, -30]; p.nearFoot = [6, lerp(0, -10, tt)];
        return p;
      }
      if (id === 'throw') {
        const p = standPose(0);
        p.nearHand = [30, -74]; p.farHand = [28, -64];
        p.nearElbow = [16, -72]; p.farElbow = [14, -64];
        return p;
      }
      if (id === '2HK') return poseKick(base, t, [46, -12]);
      if (id.endsWith('K')) {
        const height = id === '5LK' ? -46 : id === '5MK' ? -52 : -68;
        return poseKick(base, t, [44, height]);
      }
      const py = id === '5HP' ? -72 : m.stance === 'crouch' ? -18 : -78;
      const px = id === '5HP' ? 42 : m.stance === 'crouch' ? 38 : id === '5LP' ? 34 : 40;
      return posePunch(base, t, [px, py]);
    }
    case 'hitstun': {
      const p = standPose(0);
      p.head = [-8, -94]; p.neck = [-4, -84]; p.hip = [2, -46];
      p.nearHand = [-2, -60]; p.nearElbow = [4, -66];
      p.farHand = [-10, -70]; p.farElbow = [-4, -72];
      return p;
    }
    case 'blockstun': {
      const p = f.input.held.down ? crouchPose() : standPose(0);
      p.nearHand = [12, p.hip[1] - 26]; p.nearElbow = [10, p.hip[1] - 16];
      p.farHand = [10, p.hip[1] - 34]; p.farElbow = [6, p.hip[1] - 22];
      p.head = [p.head[0] - 3, p.head[1]];
      return p;
    }
    case 'launched': case 'thrown': {
      const p = jumpPose(4);
      p.rotate = f.state === 'thrown' ? -0.6 : Math.max(-1.6, Math.min(0, -f.sf * 0.08));
      p.nearHand = [-16, -88]; p.farHand = [-20, -70];
      return p;
    }
    case 'knockdown': {
      return {
        lying: true,
        head: [-36, -10],
        neck: [-26, -9],
        hip: [4, -8],
        nearElbow: [-18, -16], nearHand: [-8, -18],
        farElbow: [-22, -4], farHand: [-14, -2],
        nearKnee: [16, -14], nearFoot: [30, -6],
        farKnee: [14, -4], farFoot: [28, -2],
      };
    }
    case 'wakeup': {
      const t = Math.min(1, f.sf / 15);
      const p = crouchPose();
      p.hip[1] = lerp(-16, -30, t);
      p.neck[1] = lerp(-36, -56, t);
      p.head[1] = lerp(-44, -66, t);
      return p;
    }
    case 'throwHold': {
      const p = standPose(0);
      p.nearHand = [26, -90]; p.farHand = [24, -60];
      return p;
    }
  }

  if (celebrating) {
    const p = standPose(bounce);
    p.nearHand = [10, -122 + bounce]; p.nearElbow = [10, -100 + bounce];
    p.farHand = [-6, -52]; p.farElbow = [-4, -62];
    return p;
  }
  return standPose(bounce);
}

function seg(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, p: Pt, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFighterSprite(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  screenX: number,
  pal: Palette,
  tick: number,
  celebrating: boolean,
): void {
  const pose = buildPose(f, tick, celebrating);
  const flash = f.state === 'hitstun' && f.sf % 4 < 2;
  const skin = flash ? '#ffffff' : pal.skin;
  const gi = flash ? '#ffffff' : pal.gi;
  const giDark = flash ? '#dddddd' : pal.giDark;

  ctx.save();
  ctx.translate(screenX, Math.round(f.y));
  ctx.scale(f.facing, 1);
  if (pose.rotate) ctx.rotate(pose.rotate);

  const m = (p: Pt): Pt => p;

  // far limbs first (darker for depth)
  seg(ctx, [m(pose.neck), m(pose.farElbow), m(pose.farHand)], giDark, 9);
  seg(ctx, [m(pose.hip), m(pose.farKnee), m(pose.farFoot)], giDark, 10);
  dot(ctx, m(pose.farHand), 4.5, skin);
  // torso
  seg(ctx, [m(pose.neck), m(pose.hip)], gi, 17);
  // belt
  const beltY = pose.hip[1] + (pose.lying ? 0 : -2);
  seg(ctx, [[pose.hip[0] - 8, beltY], [pose.hip[0] + 8, beltY]], flash ? '#ffffff' : pal.accent, 4);
  // near leg
  seg(ctx, [m(pose.hip), m(pose.nearKnee), m(pose.nearFoot)], gi, 11);
  // feet
  dot(ctx, m(pose.nearFoot), 4, giDark);
  dot(ctx, m(pose.farFoot), 4, giDark);
  // head + headband
  dot(ctx, m(pose.head), 9.5, skin);
  seg(ctx, [[pose.head[0] - 8, pose.head[1] - 3], [pose.head[0] + 8, pose.head[1] - 3]], flash ? '#ffffff' : pal.accent, 4);
  // eye
  dot(ctx, [pose.head[0] + 5, pose.head[1] - 0.5], 1.4, '#1a1a24');
  // near arm
  seg(ctx, [m(pose.neck), m(pose.nearElbow), m(pose.nearHand)], gi, 10);
  dot(ctx, m(pose.nearHand), 5, skin);

  ctx.restore();
}
