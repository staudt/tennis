import { config } from '../config';
import type { Player } from '../entities/player';
import type { Game } from '../game';
import { pointLabel } from '../scoring';
import { COURT, PX, layout, project, rowToU, view } from '../world';
import type { Renderer } from './Renderer';

const CROWD_COLORS = ['#e8d5b5', '#d9453b', '#3b7dd9', '#f2c94c', '#8e5bd9', '#f08fb0', '#ffffff', '#4fb286'];

export class ShapeRenderer implements Renderer {
  private real: CanvasRenderingContext2D;
  private backdrop = document.createElement('canvas');
  private scale = 1;

  constructor(private ctx: CanvasRenderingContext2D) {
    this.real = ctx;
  }

  /** Call when the window size changes. Rebuilds the cached grass, crowd and court layer. */
  resize(cssW: number, cssH: number, dpr: number): void {
    this.scale = layout(cssW, cssH) * dpr;
    this.backdrop.width = Math.round(cssW * dpr);
    this.backdrop.height = Math.round(cssH * dpr);
    const b = this.backdrop.getContext('2d')!;
    b.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx = b;
    this.scenery();
    this.court();
    this.ctx = this.real;
  }

  /** Stands (crowd dots) over the whole canvas, then the grass apron on top of them. */
  private scenery(): void {
    const c = this.ctx;
    c.fillStyle = '#26263a';
    c.fillRect(0, 0, view.w, view.h);

    let seed = 12345;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let sy = 4; sy < view.h; ) {
      const s = 0.68 + 0.32 * Math.min(1, Math.max(0, rowToU(sy)));
      const r = 4.5 * s;
      const step = r * 2.6;
      for (let sx = (rand() * step) | 0; sx < view.w; sx += step) {
        c.fillStyle = CROWD_COLORS[(rand() * CROWD_COLORS.length) | 0];
        c.beginPath();
        c.arc(sx + (rand() - 0.5) * 3, sy + (rand() - 0.5) * 3, r, 0, Math.PI * 2);
        c.fill();
      }
      sy += step * 0.9;
    }

    // Grass apron: a trapezoid with the same perspective as the court.
    const far = -15;
    const near = 15;
    const a = project(-COURT.apronX, far);
    const b = project(COURT.apronX, far);
    const d = project(COURT.apronX, near);
    const e = project(-COURT.apronX, near);
    c.fillStyle = '#2a6a3a';
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.lineTo(d.x, d.y);
    c.lineTo(e.x, e.y);
    c.closePath();
    c.fill();

    this.barricades(far, near);
  }

  /** Low advertising boards along both sides and the far end. The near end is left open: the crowd is in front of it. */
  private barricades(far: number, near: number): void {
    const c = this.ctx;
    const x = COURT.apronX;
    const h = 1.0;
    const quad = (pts: [number, number, number][], fill: string) => {
      c.fillStyle = fill;
      c.beginPath();
      pts.forEach(([px, py, pz], i) => {
        const q = project(px, py, pz);
        if (i) c.lineTo(q.x, q.y);
        else c.moveTo(q.x, q.y);
      });
      c.closePath();
      c.fill();
    };
    const panel = (i: number) => (i % 2 ? '#1f3b8a' : '#2f55c4');
    const seg = 2;

    // Far end, between the side boards.
    for (let i = 0, px = -x; px < x; px += seg, i++) {
      const x2 = Math.min(px + seg, x);
      quad([[px, far, 0], [x2, far, 0], [x2, far, h], [px, far, h]], panel(i));
    }
    quad([[-x, far, h], [x, far, h], [x, far, h + 0.1], [-x, far, h + 0.1]], '#f0f0f0');

    // Sides.
    for (const sx of [-1, 1]) {
      for (let i = 0, py = far; py < near; py += seg, i++) {
        const y2 = Math.min(py + seg, near);
        quad([[sx * x, py, 0], [sx * x, y2, 0], [sx * x, y2, h], [sx * x, py, h]], panel(i));
      }
      quad([[sx * x, far, h], [sx * x, near, h], [sx * x, near, h + 0.1], [sx * x, far, h + 0.1]], '#f0f0f0');
    }
    c.fillStyle = '#fff';
  }

  render(game: Game): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.backdrop, 0, 0);
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    // Far to near, so closer things overlap farther ones.
    this.player(game.cpu, '#d9453b');
    this.net();
    this.ball(game);
    this.player(game.human, '#3b7dd9');
    this.serveUi(game);
    this.hud(game);
  }

  private line(x1: number, y1: number, x2: number, y2: number): void {
    const a = project(x1, y1);
    const b = project(x2, y2);
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }

  private court(): void {
    const c = this.ctx;
    const { halfW: w, halfL: l, serviceY: s } = COURT;
    const tl = project(-w, -l);
    const tr = project(w, -l);
    const br = project(w, l);
    const bl = project(-w, l);
    c.fillStyle = '#3d8a52';
    c.beginPath();
    c.moveTo(tl.x, tl.y);
    c.lineTo(tr.x, tr.y);
    c.lineTo(br.x, br.y);
    c.lineTo(bl.x, bl.y);
    c.closePath();
    c.fill();

    c.strokeStyle = '#fff';
    c.lineWidth = 2;
    c.stroke();
    this.line(-w, -s, w, -s);
    this.line(-w, s, w, s);
    this.line(0, -s, 0, s);
  }

  private net(): void {
    const c = this.ctx;
    const a = project(-COURT.halfW - 0.6, 0, 0);
    const b = project(COURT.halfW + 0.6, 0, 0);
    const h = config.netHeight * 42 * a.s;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(a.x, a.y - h, b.x - a.x, h);
    c.strokeStyle = '#fff';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(a.x, a.y - h);
    c.lineTo(b.x, b.y - h);
    c.stroke();
  }

  private player(p: Player, color: string): void {
    const c = this.ctx;
    const g = project(p.x, p.y);
    const w = 0.8 * PX * g.s;
    const h = 1.8 * 42 * g.s;
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(g.x, g.y, w * 0.7, w * 0.25, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = color;
    c.fillRect(g.x - w / 2, g.y - h, w, h);

    // Racket bar, extended in front of the player; tilts while swinging.
    const rw = config.racketWidth * PX * g.s;
    const ry = g.y - h * 0.45 - p.side * (p.swing > 0 ? 10 : 4) * g.s;
    c.fillStyle = '#ffe14d';
    c.fillRect(g.x - rw / 2, ry, rw, 5 * g.s);
    c.fillStyle = '#fff3';
    c.fillRect(g.x - (config.sweetSpotWidth * PX * g.s) / 2, ry, config.sweetSpotWidth * PX * g.s, 5 * g.s);
  }

  private ball(game: Game): void {
    const c = this.ctx;
    const b = game.ball;
    const sh = project(b.x, b.y, 0);
    const p = project(b.x, b.y, b.z);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(sh.x, sh.y, 6 * sh.s, 3 * sh.s, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8ff3a';
    c.beginPath();
    c.arc(p.x, p.y, 6 * p.s, 0, Math.PI * 2);
    c.fill();
  }

  /** Serve helpers: where the server may stand, the landing marker, and timing feedback on the ball. */
  private serveUi(game: Game): void {
    if (game.state !== 'serve' || game.score.server !== 0) return;
    const c = this.ctx;

    if (game.servePhase === 'aim') {
      const { min, max } = game.serveRange;
      const y = game.human.y;
      const p = [project(min, y - 0.5), project(max, y - 0.5), project(max, y + 0.5), project(min, y + 0.5)];
      c.fillStyle = 'rgba(255,225,77,0.25)';
      c.beginPath();
      p.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
      c.closePath();
      c.fill();
      return;
    }

    if (game.serveAim) {
      const m = project(game.serveAim.x, game.serveAim.y);
      c.strokeStyle = '#ffe14d';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(m.x, m.y, 14 * m.s, 7 * m.s, 0, 0, Math.PI * 2);
      c.moveTo(m.x - 20 * m.s, m.y);
      c.lineTo(m.x + 20 * m.s, m.y);
      c.stroke();
    }

    // Timing feedback lives on the ball: a target ring at the toss peak, and a halo that goes red -> green
    // as the ball nears it. Press SPACE when it is green.
    const apexZ = 1.2 + (config.tossSpeed * config.tossSpeed) / (2 * config.tossGravity);
    const { human: srv, ball } = game;
    const target = project(srv.x, srv.y, apexZ);
    const q = game.serveQuality(game.tossT);
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.arc(target.x, target.y, 16 * target.s, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    const bp = project(ball.x, ball.y, ball.z);
    c.strokeStyle = `hsl(${Math.round(q * 120)}, 90%, 55%)`;
    c.lineWidth = q >= 1 ? 5 : 3;
    c.beginPath();
    c.arc(bp.x, bp.y, 11 * bp.s, 0, Math.PI * 2);
    c.stroke();

  }

  private hud(game: Game): void {
    const c = this.ctx;
    const s = game.score;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, view.w, 40);
    c.fillStyle = '#fff';
    c.font = 'bold 18px monospace';
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText(`YOU ${s.games[0]}  ${pointLabel(s, 0)}${s.server === 0 ? ' •' : ''}`, 12, 20);
    c.textAlign = 'right';
    c.fillText(`${s.server === 1 ? '• ' : ''}${pointLabel(s, 1)}  ${s.games[1]} CPU`, view.w - 12, 20);

    if (game.message) {
      c.textAlign = 'center';
      c.font = 'bold 26px monospace';
      c.fillStyle = '#000a';
      c.fillRect(0, view.h / 2 - 28, view.w, 56);
      c.fillStyle = '#fff';
      c.fillText(game.message, view.w / 2, view.h / 2);
    }
  }
}
