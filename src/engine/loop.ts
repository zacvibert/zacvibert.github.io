// Fixed-timestep update (deterministic 60Hz) with decoupled rendering.
export function startLoop(update: () => void, render: () => void): void {
  const TICK = 1000 / 60;
  let acc = 0;
  let last = performance.now();
  function frame(now: number): void {
    acc += Math.min(now - last, 250);
    last = now;
    while (acc >= TICK) {
      update();
      acc -= TICK;
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
