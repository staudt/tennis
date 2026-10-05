import { describe, expect, it } from 'vitest';
import { Ball } from './entities/ball';
import { config } from './config';
import { canHit, computeShot } from './hit';

const player = { x: 0, y: 11, side: 1 as const };

/** Lands the ball and returns where it first touches the ground, plus the net-crossing height. */
function land(shot: { vx: number; vy: number; vz: number }, from: { x: number; y: number; z: number }) {
  const b = new Ball();
  Object.assign(b, from, shot, { held: false });
  let netZ = NaN;
  for (let t = 0; t < 5; t += 1 / 240) {
    const prevY = b.y;
    const ev = b.step(1 / 240, config);
    if (Math.sign(prevY) !== Math.sign(b.y) && Number.isNaN(netZ)) netZ = b.z;
    if (ev.bounced) return { x: b.x, y: b.y, netZ };
  }
  throw new Error('never bounced');
}

describe('computeShot', () => {
  const ball = { x: 0, y: 11, z: 1 };

  it('is symmetric about the racket centre', () => {
    const l = computeShot(player, { ...ball, x: -0.5 }, config);
    const r = computeShot(player, { ...ball, x: 0.5 }, config);
    expect(l.vx).toBeCloseTo(-r.vx, 5);
    expect(l.vy).toBeCloseTo(r.vy, 5);
  });

  it('sweet spot is the most powerful', () => {
    const center = computeShot(player, ball, config);
    const edge = computeShot(player, { ...ball, x: 0.75 }, config);
    expect(center.sweetness).toBe(1);
    expect(edge.sweetness).toBeLessThan(1);
    expect(Math.abs(center.vy)).toBeGreaterThan(Math.abs(edge.vy));
  });

  it('sends the ball over the net and into the opponent court', () => {
    for (const x of [-0.8, -0.3, 0, 0.3, 0.8]) {
      const from = { x, y: 11, z: 1 };
      const shot = computeShot(player, from, config);
      const end = land(shot, from);
      expect(end.y).toBeLessThan(0);
      expect(end.y).toBeGreaterThan(-11.885);
      expect(Math.abs(end.x)).toBeLessThan(5.485);
      expect(end.netZ).toBeGreaterThan(config.netHeight);
    }
  });
});

describe('canHit', () => {
  it('requires the ball to be in reach and heading toward the player', () => {
    expect(canHit(player, { x: 0, y: 11, z: 1, vy: 5 }, config)).toBe(true);
    expect(canHit(player, { x: 0, y: 11, z: 1, vy: -5 }, config)).toBe(false);
    expect(canHit(player, { x: 3, y: 11, z: 1, vy: 5 }, config)).toBe(false);
    expect(canHit(player, { x: 0, y: 11, z: 3, vy: 5 }, config)).toBe(false);
  });
});
