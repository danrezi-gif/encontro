import * as THREE from "three";

/**
 * Particle-based sky dome with slowly drifting star-like particles.
 *
 * TODO: Implement
 * - Large sphere of point particles
 * - Slow rotation
 * - Density varies with ceremony phase
 * - Subtle color variation (warm/cool)
 */
export class CosmicSky {
  readonly group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    // TODO: Implement particle sky dome
  }

  update(_delta: number, _elapsed: number): void {}

  dispose(): void {}
}
