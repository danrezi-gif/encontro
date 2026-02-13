import * as THREE from "three";

/**
 * The base environment — a bioluminescent ground plane extending
 * into darkness, with subtle ground glow that responds to presence proximity.
 *
 * TODO: Implement with custom shaders
 * - Dark ground plane with subtle bioluminescent patterns
 * - Ground responds to nearby presences (glows brighter)
 * - Extends far enough to feel infinite
 * - Subtle noise-based texture animation
 */
export class DarkMeadow {
  readonly group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();

    // Placeholder ground plane
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshBasicMaterial({
      color: 0x050510,
      transparent: true,
      opacity: 0.8,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    this.group.add(plane);
  }

  update(_delta: number, _elapsed: number): void {
    // TODO: Animate bioluminescent patterns
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
