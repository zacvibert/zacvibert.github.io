// Image-based stages: public/assets/stages/<id>/stage.json lists parallax
// layers (each a PNG, optionally an animated horizontal strip). When present,
// image layers replace the procedural stage; otherwise the procedural stage
// renders. See docs/STAGE_SPEC.md.

export interface StageLayerDef {
  image: string;
  delta: number; // parallax factor: 0 fixed, 1 moves with the floor
  x?: number; // world-space offset (default 0)
  y?: number; // screen-space top (default 0)
  frames?: number; // animated strip: frame count (frame w = image w / frames)
  fps?: number; // animated strip playback (default 8)
  front?: boolean; // draw in front of the fighters (rain, foreground props)
}

export interface StageMeta {
  layers: StageLayerDef[];
}

interface LoadedLayer {
  img: HTMLImageElement;
  def: StageLayerDef;
}

export class StageSet {
  constructor(public layers: LoadedLayer[]) {}

  draw(ctx: CanvasRenderingContext2D, camX: number, animTick: number, front = false): void {
    for (const { img, def } of this.layers) {
      if ((def.front ?? false) !== front) continue;
      const sx = Math.round((def.x ?? 0) - camX * def.delta);
      const sy = def.y ?? 0;
      if (def.frames && def.frames > 1) {
        const fw = Math.floor(img.width / def.frames);
        const frame = Math.floor(animTick / (60 / (def.fps ?? 8))) % def.frames;
        ctx.drawImage(img, frame * fw, 0, fw, img.height, sx, sy, fw, img.height);
      } else {
        ctx.drawImage(img, sx, sy);
      }
    }
  }
}

export async function loadStage(id: string): Promise<StageSet | null> {
  const base = `${import.meta.env.BASE_URL}assets/stages/${id}`;
  try {
    const res = await fetch(`${base}/stage.json`);
    if (!res.ok) return null;
    const meta = (await res.json()) as StageMeta;
    const layers = await Promise.all(
      meta.layers.map(async (def) => {
        const img = new Image();
        img.src = `${base}/${def.image}`;
        await img.decode();
        return { img, def };
      }),
    );
    return new StageSet(layers);
  } catch {
    return null;
  }
}
