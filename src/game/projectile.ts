import type { Rect } from '../engine/collision';
import type { AttackData } from './types';

export class Projectile {
  alive = true;

  constructor(
    public owner: 0 | 1,
    public x: number,
    public y: number,
    public vx: number,
    public move: AttackData,
  ) {}

  rect(): Rect {
    return { x: this.x - 14, y: this.y - 9, w: 28, h: 18 };
  }

  update(stageW: number): void {
    this.x += this.vx;
    if (this.x < -60 || this.x > stageW + 60) this.alive = false;
  }
}
