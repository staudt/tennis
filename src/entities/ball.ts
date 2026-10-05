import type { Config } from '../config';

export interface BallEvents {
  bounced: boolean;
  netHit: boolean;
}

export class Ball {
  x = 0;
  y = 0;
  z = 1;
  vx = 0;
  vy = 0;
  vz = 0;
  /** Who hit it last: 0 = human, 1 = CPU. */
  lastHitter: 0 | 1 = 0;
  /** Bounces since the last hit. */
  bounces = 0;
  /** Increments on every hit, so the AI can tell shots apart. */
  hitCount = 0;
  /** True from a serve until the first bounce. */
  serving = false;
  /** Frozen while waiting for a serve. */
  held = true;

  step(dt: number, cfg: Config): BallEvents {
    const ev: BallEvents = { bounced: false, netHit: false };
    if (this.held) return ev;

    const prevY = this.y;
    this.vz -= cfg.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;

    if ((prevY < 0 && this.y >= 0) || (prevY > 0 && this.y <= 0)) {
      if (this.z < cfg.netHeight) {
        ev.netHit = true;
        this.y = prevY;
        this.vx *= 0.1;
        this.vy *= -0.15;
      }
    }

    if (this.z <= 0 && this.vz < 0) {
      this.z = 0;
      this.vz = -this.vz * cfg.bounceDamping;
      this.vx *= 0.9;
      this.vy *= 0.9;
      ev.bounced = true;
    }
    return ev;
  }

  clone(): Ball {
    return Object.assign(new Ball(), this);
  }
}
