import type { Config } from './config';
import type { Ball } from './entities/ball';
import type { Player } from './entities/player';

export const AI_PRESETS = {
  easy: { aiReactionMs: 320, aiSpeedFactor: 0.6, aiAimError: 2.2, aiPositionError: 1.7, aiServeJitter: 0.3 },
  normal: { aiReactionMs: 180, aiSpeedFactor: 0.85, aiAimError: 1.2, aiPositionError: 1.0, aiServeJitter: 0.18 },
  hard: { aiReactionMs: 80, aiSpeedFactor: 1, aiAimError: 0.5, aiPositionError: 0.6, aiServeJitter: 0.08 },
} as const;

const HOME = { x: 0, y: -11 };
const INTERCEPT_Y = -9.5;

/** Simple CPU: samples the ball every `aiReactionMs`, predicts where it will be, and runs there. */
export class Ai {
  private target = { ...HOME };
  private elapsed = 0;
  private bias = 0;
  private lastHit = -1;

  /** Returns the direction (-1..1 per axis) the CPU should move this step. */
  update(dt: number, cpu: Player, ball: Ball, cfg: Config): { ix: number; iy: number } {
    this.elapsed += dt * 1000;
    if (this.elapsed >= cfg.aiReactionMs) {
      this.elapsed = 0;
      this.target = this.pickTarget(ball, cfg);
    }
    const ix = clamp((this.target.x - cpu.x) / 0.3);
    const iy = clamp((this.target.y - cpu.y) / 0.3);
    return { ix, iy };
  }

  private pickTarget(ball: Ball, cfg: Config) {
    const incoming = !ball.held && ball.lastHitter === 0 && ball.vy < 0;
    if (!incoming) return { ...HOME };

    if (ball.hitCount !== this.lastHit) {
      this.lastHit = ball.hitCount;
      // Misjudge the ball by up to aiPositionError: small errors give angled shots, big ones are misses.
      this.bias = (Math.random() - 0.5) * 2 * cfg.aiPositionError;
    }
    const sim = ball.clone();
    for (let t = 0; t < 4; t += 1 / 60) {
      sim.step(1 / 60, cfg);
      if (sim.y <= INTERCEPT_Y && sim.z <= cfg.maxHitHeight * 0.8) break;
    }
    return { x: sim.x - this.bias, y: Math.max(sim.y, -13) };
  }
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
