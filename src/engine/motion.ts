// Directions in numpad notation, relative to facing (6 = toward opponent).
export function toNumpad(up: boolean, down: boolean, back: boolean, forward: boolean): number {
  if (up && forward) return 9;
  if (up && back) return 7;
  if (up) return 8;
  if (down && forward) return 3;
  if (down && back) return 1;
  if (down) return 2;
  if (forward) return 6;
  if (back) return 4;
  return 5;
}

export const QCF = [2, 3, 6] as const; // quarter-circle forward
export const DP = [6, 2, 3] as const; // dragon-punch motion

interface Seg {
  dir: number;
  t: number;
}

// Records direction *changes* as segments; a held direction counts as recent
// as long as its segment is still active inside the detection window.
export class MotionDetector {
  private hist: Seg[] = [];

  record(dir: number, t: number): void {
    const last = this.hist[this.hist.length - 1];
    if (!last || last.dir !== dir) {
      this.hist.push({ dir, t });
      if (this.hist.length > 32) this.hist.shift();
    }
  }

  matches(seq: readonly number[], now: number, window = 18): boolean {
    const cutoff = now - window;
    let i = 0;
    for (let k = 0; k < this.hist.length; k++) {
      const end = k + 1 < this.hist.length ? this.hist[k + 1].t : now;
      if (end < cutoff) continue;
      if (this.hist[k].dir === seq[i]) {
        i++;
        if (i === seq.length) return true;
      }
    }
    return false;
  }

  clear(): void {
    this.hist = [];
  }
}
