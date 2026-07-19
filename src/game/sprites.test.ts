import { describe, expect, it } from 'vitest';
import { animKeyFor, pickFrame, type AnimDef } from './sprites';

describe('animKeyFor', () => {
  it('uses the move id during attacks', () => {
    expect(animKeyFor({ state: 'attack', moveId: '5HP', airMoveId: null })).toBe('5HP');
  });
  it('uses the air move id during jump attacks', () => {
    expect(animKeyFor({ state: 'jump', moveId: null, airMoveId: 'jK' })).toBe('jK');
  });
  it('falls back to the state name', () => {
    expect(animKeyFor({ state: 'walkF', moveId: null, airMoveId: null })).toBe('walkF');
    expect(animKeyFor({ state: 'jump', moveId: null, airMoveId: null })).toBe('jump');
  });
});

describe('pickFrame', () => {
  const looping: AnimDef = { row: 0, frames: 4, fps: 10 };
  const oneShot: AnimDef = { row: 1, frames: 3, fps: 10, loop: false };
  const synced: AnimDef = { row: 2, frames: 5, sync: 'move' };

  it('loops state animations at the given fps', () => {
    expect(pickFrame(looping, 0)).toBe(0);
    expect(pickFrame(looping, 6)).toBe(1); // 10fps = 6 ticks per frame
    expect(pickFrame(looping, 24)).toBe(0); // wraps after 4 frames
  });

  it('holds the last frame of one-shot animations', () => {
    expect(pickFrame(oneShot, 600)).toBe(2);
  });

  it('spreads move-synced animations across the move duration', () => {
    const total = 20; // startup+active+recovery
    expect(pickFrame(synced, 0, total)).toBe(0);
    expect(pickFrame(synced, 10, total)).toBe(2);
    expect(pickFrame(synced, 19, total)).toBe(4);
    expect(pickFrame(synced, 25, total)).toBe(4); // clamped
  });
});
