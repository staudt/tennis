import type { Config } from '../config';
import { COURT } from '../world';

export class Player {
  x = 0;
  y: number;
  vx = 0;
  vy = 0;
  /** Seconds left on the swing animation. */
  swing = 0;

  constructor(
    readonly id: 0 | 1,
    /** +1 = bottom of the screen (human), -1 = top (CPU). */
    readonly side: 1 | -1,
  ) {
    this.y = side * 11.5;
  }

  /** ix, iy in -1..1 in world axes. Accelerates quickly toward full speed, Atari style. */
  update(dt: number, ix: number, iy: number, cfg: Config, speedFactor = 1): void {
    const len = Math.hypot(ix, iy) || 1;
    const max = cfg.playerSpeed * speedFactor;
    const tvx = (ix / Math.max(len, 1)) * max;
    const tvy = (iy / Math.max(len, 1)) * max;
    const dv = cfg.playerAccel * dt;
    this.vx += Math.max(-dv, Math.min(dv, tvx - this.vx));
    this.vy += Math.max(-dv, Math.min(dv, tvy - this.vy));
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = Math.max(-COURT.playHalfX, Math.min(COURT.playHalfX, this.x));
    const lo = this.side === 1 ? COURT.playMinY : -COURT.playMaxY;
    const hi = this.side === 1 ? COURT.playMaxY : -COURT.playMinY;
    this.y = Math.max(lo, Math.min(hi, this.y));
    if (this.swing > 0) this.swing -= dt;
  }

  stop(): void {
    this.vx = 0;
    this.vy = 0;
  }
}
