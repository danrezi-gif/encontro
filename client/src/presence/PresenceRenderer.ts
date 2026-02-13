import * as THREE from "three";

/**
 * GPU instanced particle system for rendering a single luminous presence.
 * Each presence = 2,000-5,000 particles with custom shaders.
 *
 * TODO: Implement with InstancedBufferGeometry
 * - Particles orbit center point (user's tracked position)
 * - Gaussian distribution for orbital radius
 * - Sinusoidal breathing rhythm
 * - HSL color with slow drift
 * - Alpha falloff from center (soft edges)
 * - Velocity-responsive dispersion
 *
 * Performance budget: 3,000 particles per presence, 5 presences max = 15K total
 * Target: 72 Hz on Quest 2, 90 Hz on Quest 3
 */
export class PresenceRenderer {
  private particleCount: number;
  private mesh: THREE.Points | null = null;

  constructor(particleCount = 3000) {
    this.particleCount = particleCount;
  }

  /** Create the particle system (placeholder — returns simple point cloud) */
  createMesh(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);

    // Initialize with Gaussian distribution
    for (let i = 0; i < this.particleCount; i++) {
      const r = gaussianRandom() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x7dcfff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(geometry, material);
    return this.mesh;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
  }
}

/** Box-Muller transform for Gaussian random */
function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
