# Tennis

A fast, casual tennis game inspired by Atari 2600 Tennis. You only move: the racket swings by itself, and *where* the
ball meets it decides the shot.

**[▶ Play it here](https://staudt.github.io/tennis/)**

Graphics are placeholder shapes for now; sprites and nicer art are planned.

## Controls

| Key | Action |
|---|---|
| Arrow keys / WASD | Move |
| Space | Toss and hit the serve |

## How it plays

- **Hitting:** get the ball into your racket. Hitting near the centre (the sweet spot) gives a faster, deeper shot;
  hitting off-centre is weaker. The side of the racket you hit with sets the direction.
- **Serving:** slide along your half of the baseline, press Space to toss, then press Space again as the ball reaches
  the top. Better timing means a faster, deeper serve. Hold left/right to aim inside the service box.
- **Scoring:** full tennis scoring: 15/30/40, deuce and advantage, games, a first-to-6 set, and a tiebreak at 6-6.
- **Opponent:** a CPU player with easy, normal and hard presets.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scoring, hit math, serve physics, full headless matches
npm run build    # typecheck + production build into dist/
```

Add `?debug` to the URL (e.g. `http://localhost:5173/?debug`) for a live tuning panel: player speed, ball speed,
racket size, serve timing and CPU difficulty. All tunable values live in [`src/config.ts`](src/config.ts).

## Code layout

| Path | What it does |
|---|---|
| `src/game.ts` | Match flow: serve, rally, point, game over |
| `src/hit.ts` | Pure shot maths: racket offset to angle and power |
| `src/scoring.ts` | Tennis scoring state machine |
| `src/ai.ts` | CPU opponent and difficulty presets |
| `src/world.ts` | Court geometry and the world-to-screen projection |
| `src/render/` | `Renderer` interface and the placeholder `ShapeRenderer`; sprites will plug in here |

## Deployment

Pushes to `main` build and deploy to GitHub Pages with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
