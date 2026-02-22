import * as THREE from "three";

/**
 * LightTrail — ephemeral trails of light left by hand movement.
 *
 * When the user moves their arms, luminous particles are spawned at the
 * hand positions and fade out over time, creating ripple-like traces of
 * energy through the dark space. Faster movement = brighter, wider trails.
 *
 * Uses a particle pool that recycles oldest particles for zero allocation.
 */

const TRAIL_VERTEX = /* glsl */ `
  attribute float birthTime;
  attribute float speed;
  attribute vec3 trailColor;

  uniform float uTime;
  uniform float uLifetime;

  varying float vAlpha;
  varying vec3 vColor;
  varying float vAge;

  void main() {
    float age = uTime - birthTime;
    float life = age / uLifetime;

    // Dead particles — move offscreen
    if (life > 1.0 || birthTime < 0.0) {
      gl_Position = vec4(0.0, 0.0, -999.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vColor = vec3(0.0);
      vAge = 1.0;
      return;
    }

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Fade out over lifetime
    float fadeIn = smoothstep(0.0, 0.05, life);
    float fadeOut = 1.0 - smoothstep(0.3, 1.0, life);
    vAlpha = fadeIn * fadeOut;

    // Brighter for faster movement
    vAlpha *= 0.3 + speed * 0.7;

    // Size expands then shrinks — ripple effect
    float expand = 1.0 + life * 3.0;
    float shrink = 1.0 - smoothstep(0.5, 1.0, life);
    float size = 0.03 * expand * shrink * (0.5 + speed * 1.5);

    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vColor = trailColor;
    vAge = life;
  }
`;

const TRAIL_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  varying float vAge;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    // Ripple ring pattern — hollow ring that expands
    float ringWidth = 0.15;
    float ringRadius = vAge * 0.4;
    float ring = smoothstep(ringRadius - ringWidth, ringRadius, dist)
               * (1.0 - smoothstep(ringRadius, ringRadius + ringWidth, dist));

    // Core glow that fades with age
    float core = exp(-dist * dist * 12.0) * (1.0 - vAge);

    float intensity = max(ring * 0.6, core);
    vec3 color = vColor * intensity;

    // White-hot core for very new particles
    color += vec3(1.0) * core * (1.0 - vAge) * 0.3;

    gl_FragColor = vec4(color, vAlpha * intensity);
  }
`;

interface TrailParticle {
  index: number;
  birthTime: number;
}

export class LightTrail {
  readonly group: THREE.Group;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private maxParticles: number;

  private positions: Float32Array;
  private birthTimes: Float32Array;
  private speeds: Float32Array;
  private colors: Float32Array;

  private pool: TrailParticle[] = [];
  private nextIndex = 0;

  // Spawn rate control
  private spawnAccumulator = 0;
  private readonly SPAWN_RATE = 60; // particles per second per active hand
  private readonly LIFETIME = 3.0; // seconds

  constructor(maxParticles = 2000) {
    this.group = new THREE.Group();
    this.maxParticles = maxParticles;

    this.positions = new Float32Array(maxParticles * 3);
    this.birthTimes = new Float32Array(maxParticles);
    this.speeds = new Float32Array(maxParticles);
    this.colors = new Float32Array(maxParticles * 3);

    // Initialize all particles as dead
    this.birthTimes.fill(-1);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("birthTime", new THREE.BufferAttribute(this.birthTimes, 1));
    this.geometry.setAttribute("speed", new THREE.BufferAttribute(this.speeds, 1));
    this.geometry.setAttribute("trailColor", new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERTEX,
      fragmentShader: TRAIL_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uLifetime: { value: this.LIFETIME },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  /**
   * Spawn trail particles from hand positions.
   * Only spawns when hands are moving above a speed threshold.
   */
  emit(
    elapsed: number,
    delta: number,
    leftPos: THREE.Vector3,
    rightPos: THREE.Vector3,
    leftActive: boolean,
    rightActive: boolean,
    leftSpeed: number,
    rightSpeed: number,
  ): void {
    const speedThreshold = 0.3; // m/s — don't trail when hands are still

    this.spawnAccumulator += delta;
    const spawnInterval = 1.0 / this.SPAWN_RATE;

    while (this.spawnAccumulator >= spawnInterval) {
      this.spawnAccumulator -= spawnInterval;

      if (leftActive && leftSpeed > speedThreshold) {
        this.spawnParticle(
          leftPos,
          leftSpeed,
          elapsed,
          0.55, 0.7, 1.0, // cool blue base
        );
      }

      if (rightActive && rightSpeed > speedThreshold) {
        this.spawnParticle(
          rightPos,
          rightSpeed,
          elapsed,
          0.55, 0.7, 1.0,
        );
      }
    }
  }

  private spawnParticle(
    pos: THREE.Vector3,
    speed: number,
    elapsed: number,
    r: number, g: number, b: number,
  ): void {
    const i = this.nextIndex;
    this.nextIndex = (this.nextIndex + 1) % this.maxParticles;

    // Slight random scatter from spawn point
    const scatter = 0.03;
    this.positions[i * 3] = pos.x + (Math.random() - 0.5) * scatter;
    this.positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * scatter;
    this.positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * scatter;

    this.birthTimes[i] = elapsed;
    this.speeds[i] = Math.min(speed / 3.0, 1.0); // normalize speed 0-1

    // Color shifts warmer with speed
    const warmth = Math.min(speed / 4.0, 1.0);
    this.colors[i * 3] = r + warmth * 0.45;
    this.colors[i * 3 + 1] = g + warmth * 0.15;
    this.colors[i * 3 + 2] = b - warmth * 0.4;

    this.pool.push({ index: i, birthTime: elapsed });
  }

  update(_delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    // Clean expired particles from pool
    this.pool = this.pool.filter((p) => elapsed - p.birthTime < this.LIFETIME);

    // Upload changes
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.birthTime.needsUpdate = true;
    this.geometry.attributes.speed.needsUpdate = true;
    this.geometry.attributes.trailColor.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
