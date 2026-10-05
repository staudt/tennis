// Court geometry in metres. Origin at the net centre.
// x: across the court, y: along it (human side is +y / bottom of the screen, CPU is -y), z: height.
export const COURT = {
  halfW: 5.485, // doubles width: a wider court to cover
  halfL: 11.885,
  serviceY: 6.4,
  playMinY: 1.2,
  playMaxY: 13.8,
  playHalfX: 7.2,
  /** Grass apron beyond which the stands begin. */
  apronX: 9.5,
};

/** Logical (pre-scale) canvas size in pixels. The play area is always DESIGN_H tall and at least MIN_W wide. */
export const view = { w: 960, h: 720 };

const DESIGN_H = 720;
const MIN_W = 760;
const PX_PER_M = 50;
const Z_PX_PER_M = 42;
const Y_RANGE = 15;
const TOP = DESIGN_H * 0.1;
const SPAN = DESIGN_H * 0.82;

/**
 * Fits the play area into a window of cw x ch CSS pixels without stretching.
 * Extra width (or height) is left over for the scenery. Returns the scale factor.
 */
export function layout(cw: number, ch: number): number {
  const k = Math.min(ch / DESIGN_H, cw / MIN_W);
  view.w = cw / k;
  view.h = ch / k;
  return k;
}

export interface Projected {
  x: number;
  y: number;
  /** Perspective scale: 1 near the camera, smaller far away. */
  s: number;
}

/** Maps a world point to logical screen pixels with mild perspective. */
export function project(x: number, y: number, z = 0): Projected {
  const u = (y + Y_RANGE) / (2 * Y_RANGE);
  const s = 0.68 + 0.32 * u;
  return {
    x: view.w / 2 + x * PX_PER_M * s,
    y: (view.h - DESIGN_H) / 2 + TOP + u * SPAN - z * Z_PX_PER_M * s,
    s,
  };
}

/** Inverse of the screen-y mapping on the ground plane: the (unclamped) depth fraction u for a screen row. */
export function rowToU(sy: number): number {
  return (sy - (view.h - DESIGN_H) / 2 - TOP) / SPAN;
}

export const PX = PX_PER_M;
