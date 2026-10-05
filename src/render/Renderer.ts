import type { Game } from '../game';

/** Swap implementations (shapes now, sprites later) without touching game logic. */
export interface Renderer {
  render(game: Game): void;
}
