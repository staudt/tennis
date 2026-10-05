export interface Config {
  playerSpeed: number;
  playerAccel: number;
  serveMinSpeed: number;
  serveMaxSpeed: number;
  tossSpeed: number;
  tossGravity: number;
  ballBaseSpeed: number;
  gravity: number;
  bounceDamping: number;
  racketReach: number;
  racketWidth: number;
  sweetSpotWidth: number;
  maxAngleDeg: number;
  minPower: number;
  maxHitHeight: number;
  netHeight: number;
  aiReactionMs: number;
  aiSpeedFactor: number;
  aiAimError: number;
  aiPositionError: number;
  aiServeJitter: number;
  fixedStepHz: number;
}

export const config: Config = {
  playerSpeed: 11,
  playerAccel: 90,
  serveMinSpeed: 16,
  serveMaxSpeed: 34,
  tossSpeed: 5.4,
  tossGravity: 9,
  ballBaseSpeed: 30,
  gravity: 18,
  bounceDamping: 0.72,
  racketReach: 1.3,
  racketWidth: 1.6,
  sweetSpotWidth: 0.5,
  maxAngleDeg: 55,
  minPower: 0.5,
  maxHitHeight: 2.2,
  netHeight: 0.91,
  aiReactionMs: 180,
  aiSpeedFactor: 0.85,
  aiAimError: 1.2,
  aiPositionError: 1.0,
  aiServeJitter: 0.18,
  fixedStepHz: 120,
};
