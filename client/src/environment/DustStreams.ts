import * as THREE from "three";

/**
 * DustStreams — flowing light particles at various altitudes.
 *
 * Tiny luminous motes drift through the air, caught in slow currents.
 * They provide continuous motion feedback during flight — even when
 * no clouds are nearby, dust particles rushing past confirm velocity.
 *
 * Rendered as GL_POINTS with a custom shader. Particles exist in a
 * cube around the soul and are recycled (wrapped) to always stay nearby.
 */

// ── PARAM: Dust tuning ──────────────────────────────────────────────
/** Total number of particles. */
const PARTICLE_COUNT = 600;

/** Half-extent of the particle volume around the soul (m). */
const VOLUME_HALF = 60;

/** Base particle size. */
const PARTICLE_SIZE = 2.5;

/** Maximum drift speed of particles (m/s). */
const DRIFT_SPEED = 0.3;

/** How much particles glow brighter near the soul (radius m). */
const SOUL_GLOW_RADIUS = 8.0;

const DUST_VERTEX = /* glsl */ `
  attribute float aBrightness;
  attribute float aPhase;

  uniform float uTime;
  uniform vec3 uSoulPos;
  uniform float uParticleSize;

  varying float vBrightness;
  varying float vProximity;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Proximity glow near soul
    float dist = distance(position, uSoulPos);
    vProximity = exp(-dist * dist / (${SOUL_GLOW_RADIUS.toFixed(1)} * ${SOUL_GLOW_RADIUS.toFixed(1)}));

    // Twinkle
    float twinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aPhase * 6.28);
    vBrightness = aBrightness * twinkle;

    gl_PointSize = uParticleSize * (1.0 + vProximity * 2.0) * (100.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.8);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DUST_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vBrightness;
  varying float vProximity;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);

    // Soft glow falloff
    float core = exp(-r * r * 32.0);
    float halo = exp(-r * r * 8.0) * 0.3;
    float intensity = core + halo;

    // Color: cool blue-white, warmer near soul
    vec3 color = mix(
      vec3(0.3, 0.4, 0.7),    // ambient
      vec3(0.6, 0.65, 0.9),   // near soul
      vProximity
    );

    float alpha = intensity * vBrightness * (0.3 + vProximity * 0.7);

    gl_FragColor = vec4(color * intensity, alpha);
  }
`;

export class DustStreams {
  readonly group: THREE.Group;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private phases: Float32Array;
  private driftOffsets: Float32Array; // per-particle drift direction
  private soulPos = new THREE.Vector3(0, 1.6, 0);
  private soulWorldPos = new THREE.Vector3(0, 1.6, 0); // in world root space

  constructor() {
    this.group = new THREE.Group();

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    const brightness = new Float32Array(PARTICLE_COUNT);
    this.phases = new Float32Array(PARTICLE_COUNT);
    this.driftOffsets = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random position in volume around origin
      this.positions[i * 3]     = (Math.random() - 0.5) * VOLUME_HALF * 2;
      this.positions[i * 3 + 1] = Math.random() * VOLUME_HALF * 2; // mostly above ground
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * VOLUME_HALF * 2;

      brightness[i] = 0.2 + Math.random() * 0.8;
      this.phases[i] = Math.random();

      // Random drift direction
      this.driftOffsets[i * 3]     = (Math.random() - 0.5) * 2;
      this.driftOffsets[i * 3 + 1] = (Math.random() - 0.5) * 0.5; // less vertical drift
      this.driftOffsets[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
    this.geometry.setAttribute("aPhase", new THREE.BufferAttribute(this.phases, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: DUST_VERTEX,
      fragmentShader: DUST_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSoulPos: { value: new THREE.Vector3() },
        uParticleSize: { value: PARTICLE_SIZE },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.group.add(points);
  }

  /** Set the soul position in world-root space (with levitation offset accounted). */
  setSoulWorldPos(pos: THREE.Vector3): void {
    this.soulWorldPos.copy(pos);
  }

  /** Set the soul position for glow calculation (before offset). */
  setSoulPos(pos: THREE.Vector3): void {
    this.soulPos.copy(pos);
  }

  update(delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uSoulPos.value.copy(this.soulWorldPos);

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;

    // Animate particles: drift + wrap around soul
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;

      // Drift
      this.positions[ix]     += this.driftOffsets[ix]     * DRIFT_SPEED * delta;
      this.positions[ix + 1] += this.driftOffsets[ix + 1] * DRIFT_SPEED * delta;
      this.positions[ix + 2] += this.driftOffsets[ix + 2] * DRIFT_SPEED * delta;

      // Wrap: keep particles in a volume around the soul's world-root position
      const sx = this.soulWorldPos.x;
      const sy = this.soulWorldPos.y;
      const sz = this.soulWorldPos.z;

      if (this.positions[ix]     > sx + VOLUME_HALF) this.positions[ix]     -= VOLUME_HALF * 2;
      if (this.positions[ix]     < sx - VOLUME_HALF) this.positions[ix]     += VOLUME_HALF * 2;
      if (this.positions[ix + 1] > sy + VOLUME_HALF) this.positions[ix + 1] -= VOLUME_HALF * 2;
      if (this.positions[ix + 1] < sy - VOLUME_HALF) this.positions[ix + 1] += VOLUME_HALF * 2;
      if (this.positions[ix + 2] > sz + VOLUME_HALF) this.positions[ix + 2] -= VOLUME_HALF * 2;
      if (this.positions[ix + 2] < sz - VOLUME_HALF) this.positions[ix + 2] += VOLUME_HALF * 2;

      // Keep above ground
      if (this.positions[ix + 1] < 0.5) this.positions[ix + 1] = 0.5 + Math.random() * 2;
    }

    posAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
