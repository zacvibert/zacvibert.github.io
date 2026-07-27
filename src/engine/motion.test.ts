import { describe, expect, it } from 'vitest';
import { MotionDetector, QCF, DP, toNumpad } from './motion';

function feed(det: MotionDetector, dirs: Array<[number, number]>): void {
  for (const [dir, t] of dirs) det.record(dir, t);
}

describe('toNumpad', () => {
  it('maps cardinal and diagonal directions', () => {
    expect(toNumpad(false, false, false, false)).toBe(5);
    expect(toNumpad(false, true, false, false)).toBe(2);
    expect(toNumpad(false, true, false, true)).toBe(3);
    expect(toNumpad(false, false, false, true)).toBe(6);
    expect(toNumpad(false, false, true, false)).toBe(4);
    expect(toNumpad(false, true, true, false)).toBe(1);
    expect(toNumpad(true, false, false, true)).toBe(9);
    expect(toNumpad(true, false, true, false)).toBe(7);
    expect(toNumpad(true, false, false, false)).toBe(8);
  });
});

describe('MotionDetector', () => {
  it('detects a quarter-circle forward', () => {
    const det = new MotionDetector();
    feed(det, [[5, 0], [2, 10], [3, 12], [6, 14]]);
    expect(det.matches(QCF, 16)).toBe(true);
  });

  it('rejects QCF when the diagonal is skipped', () => {
    const det = new MotionDetector();
    feed(det, [[5, 0], [2, 10], [6, 14]]);
    expect(det.matches(QCF, 16)).toBe(false);
  });

  it('rejects a stale QCF outside the window', () => {
    const det = new MotionDetector();
    feed(det, [[2, 10], [3, 12], [6, 14], [5, 15]]);
    expect(det.matches(QCF, 60)).toBe(false);
  });

  it('detects a dragon punch', () => {
    const det = new MotionDetector();
    feed(det, [[5, 0], [6, 10], [5, 12], [2, 14], [3, 16]]);
    expect(det.matches(DP, 18)).toBe(true);
  });

  it('detects DP after walking forward (held direction stays live)', () => {
    const det = new MotionDetector();
    // forward held from t=0 to t=50, then 2, 3
    feed(det, [[6, 0], [2, 50], [3, 52]]);
    expect(det.matches(DP, 54)).toBe(true);
  });

  it('does not read a plain QCF as a DP', () => {
    const det = new MotionDetector();
    feed(det, [[5, 0], [2, 40], [3, 42], [6, 44]]);
    expect(det.matches(DP, 46)).toBe(false);
  });

  it('detects crouch-buffered QCF (down held long)', () => {
    const det = new MotionDetector();
    feed(det, [[2, 0], [3, 60], [6, 62]]);
    expect(det.matches(QCF, 64)).toBe(true);
  });

  it('finds nothing on neutral mash', () => {
    const det = new MotionDetector();
    feed(det, [[5, 0]]);
    expect(det.matches(QCF, 20)).toBe(false);
    expect(det.matches(DP, 20)).toBe(false);
  });
});
