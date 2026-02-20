import * as THREE from "three";

/**
 * Particle-based sky dome — slowly drifting star-like particles
 * surrounding the user in a vast dark sphere.
 *
 * Provides the visual backdrop during signal creation and ceremony.
 */
export class CosmicSky {
  readonly group: THREE.Group;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleCount: number;
  private velocities: Float32Array;

  constructor(particleCount = 800) {
    this.group = new THREE.Group();
    this.particleCount = particleCount;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    this.velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Distribute on a large sphere shell (radius 80-200)
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Cool hues: blues to purples with occasional warm accent
      const isWarm = Math.random() < 0.08;
      const hue = isWarm ? 0.05 + Math.random() * 0.08 : 0.55 + Math.random() * 0.15;
      const sat = 0.3 + Math.random() * 0.4;
      const light = 0.4 + Math.random() * 0.4;
      const color = new THREE.Color().setHSL(hue, sat, light);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.3 + Math.random() * 1.5;

      // Slow drift velocity
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  update(_delta: number, elapsed: number): void {
    // Slow overall rotation
    this.group.rotation.y = elapsed * 0.008;
    this.group.rotation.x = Math.sin(elapsed * 0.003) * 0.05;

    // Breathing opacity
    this.material.opacity = 0.4 + 0.2 * Math.sin(elapsed * 0.3);

    // Drift individual particles
    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] += this.velocities[i3];
      positions[i3 + 1] += this.velocities[i3 + 1];
      positions[i3 + 2] += this.velocities[i3 + 2];

      // Keep particles within sphere shell
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist > 200 || dist < 80) {
        this.velocities[i3] *= -1;
        this.velocities[i3 + 1] *= -1;
        this.velocities[i3 + 2] *= -1;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
