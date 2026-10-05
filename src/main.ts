import { config } from './config';
import { Game } from './game';
import { Input } from './input';
import { ShapeRenderer } from './render/ShapeRenderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const game = new Game();
const input = new Input();
const renderer = new ShapeRenderer(ctx);

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  renderer.resize(window.innerWidth, window.innerHeight, dpr);
}
window.addEventListener('resize', resize);
resize();

if (new URLSearchParams(location.search).has('debug')) {
  import('./debug').then((m) => m.setupDebug(game));
}

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  const step = 1 / config.fixedStepHz;
  acc = Math.min(acc + (now - last) / 1000, 0.1);
  last = now;
  while (acc >= step) {
    game.update(step, input);
    acc -= step;
  }
  renderer.render(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
