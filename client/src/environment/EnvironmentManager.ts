import * as THREE from "three";
import type { PhaseConfig } from "../ceremony/CeremonyConfig";

/**
 * Phase-responsive environment parameter manager.
 * Controls the dark meadow's lighting, ground glow, sky particles, and fog
 * as the ceremony progresses.
 */
export class EnvironmentManager {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Update environment parameters from interpolated phase config */
  applyConfig(config: PhaseConfig): void {
    if (this.ambientLight) {
      this.ambientLight.intensity = config.environment.ambientLight;
    }
    // TODO: Apply groundGlow, skyParticleDensity, fogDensity
  }

  update(_delta: number, _elapsed: number): void {
    // TODO: Animate environment elements
  }

  dispose(): void {}
}
