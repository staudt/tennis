import type { Config } from './config';
import { COURT } from './world';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Shot {
  vx: number;
  vy: number;
  vz: number;
  /** 0..1, how close to the racket's sweet spot the ball was. */
  sweetness: number;
  /** -1..1, where on the racket the ball met it. */
  offset: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Builds a velocity that sends the ball from `from` to land at (tx, ty),
 * taking roughly distance/speed seconds but arcing high enough to clear the net.
 */
export function aimShot(from: Vec3, tx: number, ty: number, speed: number, cfg: Config) {
  const g = cfg.gravity;
  const z0 = Math.max(from.z, 0.3);
  const dist = Math.hypot(tx - from.x, ty - from.y);
  const dirY = Math.sign(ty - from.y) || 1;
  const clearance = cfg.netHeight + 0.25;
  const flight = (vz: number) => (vz + Math.sqrt(vz * vz + 2 * g * z0)) / g;

  let T = Math.max(dist / speed, 0.2);
  let vz = (g * T * T) / 2 / T - z0 / T;
  for (let i = 0; i < 4; i++) {
    const tn = (T * Math.abs(from.y)) / Math.max(Math.abs(ty - from.y), 0.001);
    const needed = (clearance - z0 + (g * tn * tn) / 2) / Math.max(tn, 0.05);
    if (vz >= needed) break;
    vz = needed;
    T = flight(vz);
  }
  const vy = (dirY * Math.abs(ty - from.y)) / T;
  return { vx: (tx - from.x) / T, vy, vz };
}

/** Racket contact test: ball is inside the racket box, low enough, and heading toward the player. */
export function canHit(
  player: { x: number; y: number; side: 1 | -1 },
  ball: Vec3 & { vy: number },
  cfg: Config,
): boolean {
  return (
    ball.vy * player.side > 0 &&
    ball.z <= cfg.maxHitHeight &&
    Math.abs(ball.y - player.y) <= cfg.racketReach &&
    Math.abs(ball.x - player.x) <= cfg.racketWidth / 2 + 0.15
  );
}

/** Where the ball meets the racket decides direction and power. `aimError` shifts the target sideways. */
export function computeShot(
  player: { x: number; side: 1 | -1 },
  ball: Vec3,
  cfg: Config,
  aimError = 0,
): Shot {
  const half = cfg.racketWidth / 2;
  const offset = clamp((ball.x - player.x) / half, -1, 1);
  const sweet = cfg.sweetSpotWidth / cfg.racketWidth;
  const a = Math.abs(offset);
  const sweetness = a <= sweet ? 1 : 1 - (a - sweet) / (1 - sweet);
  const power = lerp(cfg.minPower, 1, sweetness);

  const maxAngle = (cfg.maxAngleDeg * Math.PI) / 180;
  const tx = offset * Math.sin(maxAngle) * COURT.halfW * 1.1 + aimError;
  const depth = lerp(6, 10.8, sweetness);
  const ty = -player.side * depth;

  const { vx, vy, vz } = aimShot(ball, tx, ty, cfg.ballBaseSpeed * power, cfg);
  return { vx, vy, vz, sweetness, offset };
}
