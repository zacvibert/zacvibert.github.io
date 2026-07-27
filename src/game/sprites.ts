// Sprite-sheet rendering: when a character folder in public/assets/characters/
// provides a sheet.png + frames.json (see docs/SPRITE_SPEC.md), those
// animations replace the procedural renderer one animation at a time.
// Anything not in the sheet falls back to the procedural paper-doll.

export interface AnimDef {
  row: number;
  frames: number;
  fps?: number; // playback speed for state anims (default 10)
  loop?: boolean; // default true; false = hold last frame
  sync?: 'move'; // attack anims: spread frames across startup+active+recovery
}

export interface SheetMeta {
  cell: { w: number; h: number };
  anchor: { x: number; y: number }; // feet position inside a cell
  animations: Record<string, AnimDef>;
}

export function animKeyFor(f: { state: string; moveId: string | null; airMoveId: string | null }): string {
  if (f.state === 'attack' && f.moveId) return f.moveId;
  if (f.state === 'jump' && f.airMoveId) return f.airMoveId;
  return f.state;
}

export function pickFrame(def: AnimDef, sf: number, moveTotal?: number): number {
  if (def.sync === 'move' && moveTotal) {
    return Math.max(0, Math.min(def.frames - 1, Math.floor((sf / moveTotal) * def.frames)));
  }
  const fps = def.fps ?? 10;
  const idx = Math.floor(Math.max(0, sf) / (60 / fps));
  return def.loop === false ? Math.min(idx, def.frames - 1) : idx % def.frames;
}

export class SpriteSet {
  constructor(public img: HTMLImageElement, public meta: SheetMeta) {}

  has(key: string): boolean {
    return key in this.meta.animations;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    frame: number,
    screenX: number,
    feetY: number,
    facing: 1 | -1,
  ): void {
    const def = this.meta.animations[key];
    const { w, h } = this.meta.cell;
    ctx.save();
    ctx.translate(screenX, feetY);
    ctx.scale(facing, 1);
    ctx.drawImage(this.img, frame * w, def.row * h, w, h, -this.meta.anchor.x, -this.meta.anchor.y, w, h);
    ctx.restore();
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export async function loadSpriteSet(id: string, alt = false): Promise<SpriteSet | null> {
  const base = `${import.meta.env.BASE_URL}assets/characters/${id}`;
  try {
    const res = await fetch(`${base}/frames.json`);
    if (!res.ok) return null;
    const meta = (await res.json()) as SheetMeta;
    let img: HTMLImageElement;
    try {
      img = await loadImage(`${base}/${alt ? 'sheet-alt.png' : 'sheet.png'}`);
    } catch {
      if (!alt) return null;
      img = await loadImage(`${base}/sheet.png`); // alt palette optional
    }
    return new SpriteSet(img, meta);
  } catch {
    return null;
  }
}
