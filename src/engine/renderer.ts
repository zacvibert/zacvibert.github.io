export const VIEW_W = 640;
export const VIEW_H = 360;

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.imageSmoothingEnabled = false;

  const resize = (): void => {
    const scale = Math.max(1, Math.floor(Math.min(innerWidth / VIEW_W, (innerHeight - 60) / VIEW_H)));
    canvas.style.width = `${VIEW_W * scale}px`;
    canvas.style.height = `${VIEW_H * scale}px`;
  };
  addEventListener('resize', resize);
  resize();
  return ctx;
}
