import { describe, expect, it } from 'vitest';
import data from '../characters/fighter-zero.json';
import type { CharacterData } from './types';

const char = data as CharacterData;

describe('fighter-zero frame data', () => {
  it('has sane global stats', () => {
    expect(char.health).toBeGreaterThan(0);
    expect(char.walkF).toBeGreaterThan(char.walkB * 0.5);
    expect(char.jumpVelY).toBeLessThan(0);
    expect(char.gravity).toBeGreaterThan(0);
  });

  it('every move has valid phases, damage and level', () => {
    for (const [id, m] of Object.entries(char.moves)) {
      expect(m.startup, `${id} startup`).toBeGreaterThan(0);
      expect(m.active, `${id} active`).toBeGreaterThan(0);
      expect(m.recovery, `${id} recovery`).toBeGreaterThanOrEqual(0);
      expect(m.damage, `${id} damage`).toBeGreaterThanOrEqual(0);
      expect(['mid', 'low', 'high']).toContain(m.level);
      if (m.hitbox) {
        expect(m.hitbox.w, `${id} hitbox w`).toBeGreaterThan(0);
        expect(m.hitbox.h, `${id} hitbox h`).toBeGreaterThan(0);
      }
    }
  });

  it('light attacks are faster than heavies', () => {
    expect(char.moves['5LP'].startup).toBeLessThan(char.moves['5HP'].startup);
    expect(char.moves['5LK'].startup).toBeLessThan(char.moves['5HK'].startup);
  });

  it('required core moves exist', () => {
    for (const id of ['5LP', '5MP', '5HP', '5LK', '5MK', '5HK', '2LK', '2HK', 'jP', 'jK', 'QCFP', 'DPP', 'throw']) {
      expect(char.moves[id], id).toBeDefined();
    }
  });
});
