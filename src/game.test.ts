import { describe, expect, it } from 'vitest';
import { AI_PRESETS } from './ai';
import { config } from './config';
import { Game } from './game';
import type { Input } from './input';

/** A fake input that chases the ball with perfect tracking; the easy CPU makes the rallies end, so we can run full matches headlessly. */
function botInput(game: Game): Input {
  return {
    get x() {
      const d = game.ball.x - game.human.x;
      return Math.max(-1, Math.min(1, d / 0.3));
    },
    get y() {
      const target = Math.max(game.ball.y, 8);
      return Math.max(-1, Math.min(1, (target - game.human.y) / 0.3));
    },
    consumeAction: () => true,
  } as Input;
}

describe('game', () => {
  it('plays points to completion and eventually ends the match', () => {
    Object.assign(config, AI_PRESETS.easy);
    const g = new Game();
    const input = botInput(g);
    let points = 0;
    let prev = g.score.points[0] + g.score.points[1] + g.score.games[0] + g.score.games[1];
    for (let i = 0; i < 120 * 60 * 20 && g.state !== 'over'; i++) {
      g.update(1 / 120, input);
      const now = g.score.points[0] + g.score.points[1] + g.score.games[0] + g.score.games[1];
      if (now !== prev) points++;
      prev = now;
    }
    expect(points).toBeGreaterThan(10);
    expect(g.state).toBe('over');
  });
});

describe('serve', () => {
  /** Human serves: toss, hit at `hitAt` seconds into the toss, aiming with `aim` (-1..1). */
  function serveAt(hitAt: number, aim: number) {
    const g = new Game();
    let press = false;
    const input = { x: 0, y: 0, consumeAction: () => { const p = press; press = false; return p; } } as unknown as Input;
    g.update(1 / 120, input);
    press = true;
    g.update(1 / 120, input); // toss
    expect(g.servePhase).toBe('toss');
    (input as { x: number }).x = aim;
    while (g.tossT < hitAt && g.state === 'serve') g.update(1 / 120, input);
    press = true;
    g.update(1 / 120, input);
    expect(g.state).toBe('rally');
    const speed = Math.hypot(g.ball.vx, g.ball.vy);
    while (g.ball.bounces === 0 && g.state === 'rally') g.update(1 / 120, input);
    return { speed, state: g.state, x: g.ball.x, y: g.ball.y, g };
  }

  it('every timing and aim clears the net and lands in the service box', () => {
    const apex = new Game().tossApex;
    for (const dt of [0, 0.1, 0.2, 0.4]) {
      for (const sign of [-1, 1]) {
        for (const aim of [-1, 0, 1]) {
          const r = serveAt(Math.max(0, apex + sign * dt), aim);
          expect(r.state).toBe('rally');
          expect(r.y).toBeLessThan(0);
          expect(r.y).toBeGreaterThan(-6.4);
        }
      }
    }
  });

  it('a perfect serve is faster than a mistimed one', () => {
    const apex = new Game().tossApex;
    const perfect = serveAt(apex, 0).speed;
    const late = serveAt(apex + 0.3, 0).speed;
    expect(perfect).toBeGreaterThan(late * 1.3);
  });
});
