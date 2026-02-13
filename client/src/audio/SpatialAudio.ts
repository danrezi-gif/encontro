/**
 * 3D positioned audio for remote presences using WebAudio PannerNodes.
 * HRTF model for natural positioning.
 *
 * TODO: Implement
 * - PannerNode per remote presence
 * - HRTF model
 * - Inverse-square distance attenuation
 * - In merge state: binaural centered audio
 */
export class SpatialAudio {
  update(_delta: number): void {}
  dispose(): void {}
}
