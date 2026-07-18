import type { Rect } from '../engine/collision';

export type HitLevel = 'mid' | 'low' | 'high';

export interface AttackData {
  name: string;
  stance: 'stand' | 'crouch' | 'air';
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  level: HitLevel;
  pushbackHit: number;
  pushbackBlock: number;
  cancelable?: boolean;
  knockdown?: boolean;
  invuln?: number;
  projectile?: boolean;
  special?: boolean;
  // Relative to the fighter origin (feet center), facing right:
  // x = offset toward the opponent, y = height of the box bottom above the feet.
  hitbox?: Rect;
}

export interface CharacterData {
  name: string;
  health: number;
  walkF: number;
  walkB: number;
  jumpVelY: number;
  jumpVelX: number;
  gravity: number;
  prejump: number;
  pushbox: { w: number; hStand: number; hCrouch: number; hAir: number };
  throwRange: number;
  projectileSpeed: number;
  moves: Record<string, AttackData>;
}
