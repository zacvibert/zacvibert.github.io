import { describe, expect, it } from 'vitest';
import { overlaps } from './collision';

describe('overlaps', () => {
  it('detects overlapping rects', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  it('detects containment', () => {
    expect(overlaps({ x: 0, y: 0, w: 20, h: 20 }, { x: 5, y: 5, w: 2, h: 2 })).toBe(true);
  });

  it('rejects rects that only share an edge', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('rejects separated rects', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 30, y: 30, w: 10, h: 10 })).toBe(false);
  });
});
