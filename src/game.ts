import { Ai } from './ai';
import { config } from './config';
import { Ball } from './entities/ball';
import { Player } from './entities/player';
import { aimShot, canHit, computeShot } from './hit';
import type { Input } from './input';
import { newScore, pointWon, serveSide, type PlayerId, type Score } from './scoring';
import { COURT } from './world';

export type GameState = 'serve' | 'rally' | 'point' | 'over';

const POINT_PAUSE = 1.3;
const CPU_SERVE_DELAY = 1.0;
const SERVE_START_Z = 1.2;
/** The toss ends (weak auto-hit) when the ball falls back to this height. */
const SERVE_MIN_Z = 1.0;
/** Seconds either side of the apex that still counts as a perfect hit, and how far the fade-out reaches. */
export const SERVE_SWEET = 0.06;
export const SERVE_WINDOW = 0.45;

export class Game {
  readonly human = new Player(0, 1);
  readonly cpu = new Player(1, -1);
  readonly ball = new Ball();
  readonly ai = new Ai();
  score: Score = newScore(0);
  state: GameState = 'serve';
  message = '';
  private timer = 0;
  /** Sign of the x side the current serve must land on. */
  private serveTargetSign = 1;
  servePhase: 'aim' | 'toss' = 'aim';
  /** Seconds since the toss started. */
  tossT = 0;
  /** Server's allowed x range for the current serve (their half of the baseline). */
  serveRange = { min: 0.4, max: 5.2 };
  /** Predicted landing spot, shown while tossing. */
  serveAim: { x: number; y: number } | null = null;
  private cpuHitAt = 0;
  private cpuAim = 0;
  private messageTimer = 0;

  constructor() {
    this.startServe();
  }

  get players(): [Player, Player] {
    return [this.human, this.cpu];
  }

  newMatch(): void {
    this.score = newScore(0);
    this.startServe();
  }

  private startServe(): void {
    const server = this.players[this.score.server];
    const receiver = this.players[this.score.server === 0 ? 1 : 0];
    const right = serveSide(this.score) === 0;
    // "Right" is the server's right: +x for the human (bottom), -x for the CPU (top).
    const sx = (right ? 1 : -1) * server.side * 2;
    server.x = sx;
    server.y = server.side * 12.4;
    receiver.x = -sx * 0.5;
    receiver.y = receiver.side * 11;
    server.stop();
    receiver.stop();
    this.serveTargetSign = sx > 0 ? -1 : 1;
    this.serveRange = sx > 0 ? { min: 0.4, max: 5.2 } : { min: -5.2, max: -0.4 };
    this.servePhase = 'aim';
    this.serveAim = null;

    const b = this.ball;
    b.held = true;
    b.serving = false;
    b.bounces = 0;
    b.vx = b.vy = b.vz = 0;
    b.lastHitter = server.id;
    b.x = server.x;
    b.y = server.y;
    b.z = SERVE_START_Z;
    this.state = 'serve';
    this.timer = 0;
    this.message = server.id === 0 ? 'Move, then SPACE to toss' : '';
  }

  update(dt: number, input: Input): void {
    const action = input.consumeAction();
    if (this.messageTimer > 0 && (this.messageTimer -= dt) <= 0) this.message = '';
    switch (this.state) {
      case 'serve':
        this.updateServe(dt, input, action);
        break;
      case 'rally':
        this.updateRally(dt, input);
        break;
      case 'point':
        this.timer += dt;
        this.human.update(dt, input.x, input.y, config);
        this.ball.step(dt, config);
        if (this.timer >= POINT_PAUSE) {
          if (this.score.winner >= 0) {
            this.state = 'over';
            this.message = this.score.winner === 0 ? 'YOU WIN! SPACE to play again' : 'CPU WINS. SPACE to retry';
          } else {
            this.startServe();
          }
        }
        break;
      case 'over':
        if (action) this.newMatch();
        break;
    }
  }

  private moveBoth(dt: number, input: Input, freeze?: Player): void {
    if (freeze !== this.human) this.human.update(dt, input.x, input.y, config);
    if (freeze !== this.cpu) {
      const { ix, iy } = this.ai.update(dt, this.cpu, this.ball, config);
      this.cpu.update(dt, ix, iy, config, config.aiSpeedFactor);
    }
  }

  /** Toss timeline: the ball rises, peaks at tossApex, and is gone (auto weak hit) at tossEnd. */
  get tossApex(): number {
    return config.tossSpeed / config.tossGravity;
  }

  get tossEnd(): number {
    const { tossSpeed: v, tossGravity: g } = config;
    return (v + Math.sqrt(v * v + 2 * g * (SERVE_START_Z - SERVE_MIN_Z))) / g;
  }

  /** 0..1 serve quality for a hit at toss time t: 1 inside the sweet window around the apex, fading to 0. */
  serveQuality(t: number): number {
    const d = Math.abs(t - this.tossApex);
    return d <= SERVE_SWEET ? 1 : Math.max(0, 1 - (d - SERVE_SWEET) / SERVE_WINDOW);
  }

  private updateServe(dt: number, input: Input, action: boolean): void {
    const server = this.players[this.score.server];
    const isHuman = server.id === 0;
    this.moveBoth(dt, input, server);
    this.timer += dt;
    const b = this.ball;

    if (this.servePhase === 'aim') {
      if (isHuman) {
        const { min, max } = this.serveRange;
        server.x = Math.max(min, Math.min(max, server.x + input.x * config.playerSpeed * 0.6 * dt));
        if (action) this.startToss();
      } else if (this.timer >= CPU_SERVE_DELAY) {
        this.startToss();
        this.cpuHitAt = this.tossApex + (Math.random() - 0.5) * 2 * config.aiServeJitter;
      }
      b.x = server.x;
      b.z = SERVE_START_Z;
      return;
    }

    // Toss phase: the ball is in the air above the server.
    this.tossT += dt;
    const t = this.tossT;
    b.x = server.x;
    b.z = SERVE_START_Z + config.tossSpeed * t - (config.tossGravity * t * t) / 2;
    const aim = isHuman ? input.x : this.cpuAim;
    this.serveAim = this.serveTarget(server, aim, this.serveQuality(t));

    const hit = isHuman ? action : t >= this.cpuHitAt;
    if (hit || t >= this.tossEnd) this.doServe(server, aim, hit ? this.serveQuality(t) : 0);
  }

  private startToss(): void {
    this.servePhase = 'toss';
    this.tossT = 0;
    this.cpuAim = (Math.random() - 0.5) * 2;
    this.message = '';
  }

  /** Where a serve with the given aim and quality would land. Better serves go deeper into the box. */
  private serveTarget(server: Player, aim: number, q: number) {
    const sign = this.serveTargetSign;
    return {
      x: sign * Math.max(0.8, Math.min(4.8, 3.0 + aim * 1.8 * sign)),
      y: -server.side * (3.4 + 2.5 * q),
    };
  }

  private doServe(server: Player, aim: number, q: number): void {
    const { x: tx, y: ty } = this.serveTarget(server, aim, q);
    const speed = config.serveMinSpeed + (config.serveMaxSpeed - config.serveMinSpeed) * q;
    const b = this.ball;
    Object.assign(b, aimShot(b, tx, ty, speed, config));
    b.held = false;
    b.serving = true;
    b.bounces = 0;
    b.hitCount++;
    server.swing = 0.2;
    this.serveAim = null;
    this.state = 'rally';
    this.message = q >= 1 ? 'PERFECT!' : '';
    this.messageTimer = q >= 1 ? 0.8 : 0;
  }

  private updateRally(dt: number, input: Input): void {
    this.moveBoth(dt, input);
    const b = this.ball;

    for (const p of this.players) {
      if (b.lastHitter !== p.id && canHit(p, b, config)) {
        const err = p.id === 1 ? (Math.random() - 0.5) * 2 * config.aiAimError : 0;
        const shot = computeShot(p, b, config, err);
        b.vx = shot.vx;
        b.vy = shot.vy;
        b.vz = shot.vz;
        b.lastHitter = p.id;
        b.bounces = 0;
        b.serving = false;
        b.hitCount++;
        p.swing = 0.2;
      }
    }

    const hitter = b.lastHitter;
    const ev = b.step(dt, config);
    if (ev.netHit) return this.endPoint(other(hitter));

    if (ev.bounced) {
      b.bounces++;
      if (b.bounces >= 2) return this.endPoint(hitter); // receiver let it bounce twice
      if (!this.firstBounceIn(b, hitter)) return this.endPoint(other(hitter));
    }
  }

  private firstBounceIn(b: Ball, hitter: PlayerId): boolean {
    const onFarSide = hitter === 0 ? b.y < 0 : b.y > 0;
    const maxY = b.serving ? COURT.serviceY : COURT.halfL;
    if (!onFarSide || Math.abs(b.y) > maxY || Math.abs(b.x) > COURT.halfW) return false;
    if (b.serving && b.x * this.serveTargetSign < 0) return false;
    return true;
  }

  private endPoint(winner: PlayerId): void {
    this.score = pointWon(this.score, winner);
    this.state = 'point';
    this.timer = 0;
    this.message = winner === 0 ? 'POINT!' : 'CPU POINT';
    this.human.stop();
    this.cpu.stop();
  }
}

const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);
