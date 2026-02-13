/** Easing functions for smooth transitions between ceremony phases */

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return --t * t * t + 1;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/** Smooth sine ease — good for breathing rhythms */
export function easeSine(t: number): number {
  return (1 - Math.cos(t * Math.PI)) / 2;
}

/** Elastic ease out — good for "snap" moments */
export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}
