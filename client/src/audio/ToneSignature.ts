/**
 * Each user's unique sonic identity derived from movement patterns.
 *
 * TODO: Implement
 * - Base frequency from average movement speed (slow = low, active = higher)
 * - Overtones from movement smoothness (smooth = pure, jerky = harmonics)
 * - Modulation from hand gestures (reach = pitch bend, circle = tremolo)
 */
export class ToneSignature {
  update(_movementRhythm: number): void {}
  dispose(): void {}
}
