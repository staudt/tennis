import GUI from 'lil-gui';
import { AI_PRESETS } from './ai';
import { config } from './config';
import type { Game } from './game';

/** Live tuning panel, enabled with ?debug. */
export function setupDebug(game: Game): void {
  const gui = new GUI({ title: 'Tuning' });
  const move = gui.addFolder('Movement');
  move.add(config, 'playerSpeed', 4, 30);
  move.add(config, 'playerAccel', 20, 400);
  const ball = gui.addFolder('Ball');
  const serve = gui.addFolder('Serve');
  serve.add(config, 'serveMinSpeed', 8, 40);
  serve.add(config, 'serveMaxSpeed', 8, 60);
  serve.add(config, 'tossSpeed', 3, 9);
  serve.add(config, 'tossGravity', 4, 25);
  ball.add(config, 'ballBaseSpeed', 8, 50);
  ball.add(config, 'gravity', 8, 40);
  ball.add(config, 'bounceDamping', 0.3, 0.95);
  const racket = gui.addFolder('Racket');
  racket.add(config, 'racketReach', 0.5, 3);
  racket.add(config, 'racketWidth', 0.8, 3);
  racket.add(config, 'sweetSpotWidth', 0.1, 1.5);
  racket.add(config, 'maxAngleDeg', 10, 80);
  racket.add(config, 'minPower', 0.2, 1);
  racket.add(config, 'maxHitHeight', 1, 4);
  const ai = gui.addFolder('CPU');
  ai.add(config, 'aiReactionMs', 0, 600);
  ai.add(config, 'aiSpeedFactor', 0.3, 1.3);
  ai.add(config, 'aiAimError', 0, 4);
  ai.add(config, 'aiPositionError', 0, 2.5);
  ai.add(config, 'aiServeJitter', 0, 0.5);
  const presets = {
    easy: () => Object.assign(config, AI_PRESETS.easy),
    normal: () => Object.assign(config, AI_PRESETS.normal),
    hard: () => Object.assign(config, AI_PRESETS.hard),
    restart: () => game.newMatch(),
  };
  gui.add(presets, 'easy').onChange(() => gui.controllersRecursive().forEach((c) => c.updateDisplay()));
  gui.add(presets, 'normal').onChange(() => gui.controllersRecursive().forEach((c) => c.updateDisplay()));
  gui.add(presets, 'hard').onChange(() => gui.controllersRecursive().forEach((c) => c.updateDisplay()));
  gui.add(presets, 'restart');
}
