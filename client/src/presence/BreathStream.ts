import * as THREE from "three";

/**
 * BreathStream — a stream of golden light particles emitted from the
 * soul's mouth, driven by microphone amplitude.
 *
 * When the user breathes, hums, or sings, warm golden particles pour
 * outward in the direction the soul is facing. The louder / more
 * intentional the sound, the more particles and the further they trail.
 *
 * Microphone permission is requested once on construction.
 * If permission is denied the system silently does nothing.
 *
 * Particles live in SCENE space (not world-root space) so they retain
 * their emitted positions as the world drifts beneath the flying soul.
 */

// ── PARAMS ────────────────────────────────────────────────────────────
/** Total particle budget (dead particles are recycled). */
const PARTICLE_COUNT = 300;

/** Minimum particle lifetime (seconds). */
const LIFETIME_MIN = 1.2;

/** Maximum particle lifetime (seconds). */
const LIFETIME_MAX = 2.8;

/** Base forward speed of emitted particles (m/s). */
const BASE_SPEED = 1.4;

/** Speed variance (±) for each particle. */
const SPEED_VARIANCE = 0.5;

/** Half-angle of the emission cone (radians). */
const SPREAD_ANGLE = 0.22;

/** Particle size in clip-space units. */
const PARTICLE_SIZE = 4.5;

/** Particles emitted per second at full amplitude. */
const EMIT_RATE = 90;

/** Raw RMS amplitude threshold below which no particles are emitted. */
const AMPLITUDE_THRESHOLD = 0.012;

/** Gain applied to raw RMS to produce a 0-1 activation level. */
const AMPLITUDE_GAIN = 40.0;

/** Exponential velocity drag coefficient per second (lower = more drag). */
const DRAG_PER_SEC = 0.88;

/** Gentle upward buoyancy applied to each particle (m/s² near mouth). */
const BUOYANCY = 0.06;

/** Mouth offset from head position: forward (m). */
const MOUTH_FORWARD_OFFSET = 0.13;

/** Mouth offset from head position: downward (m). */
const MOUTH_DOWN_OFFSET = 0.11;

// ── SHADERS ───────────────────────────────────────────────────────────
const BREATH_VERTEX = /* glsl */ `
  attribute float aAge;
  attribute float aLifetime;

  uniform float uSize;

  varying float vLife;
  varying float vIntensity;

  void main() {
    vLife = clamp(aAge / max(aLifetime, 0.001), 0.0, 1.0);

    // Size: ramps up fast then fades gently
    float sizeRamp = smoothstep(0.0, 0.08, vLife);
    float sizeFade = 1.0 - smoothstep(0.6, 1.0, vLife);
    float sz = uSize * sizeRamp * sizeFade;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = sz * (80.0 / max(-mvPos.z, 0.1));
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPos;

    // Intensity fades quadratically toward end of life
    vIntensity = (1.0 - vLife) * (1.0 - vLife);
  }
`;

const BREATH_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vLife;
  varying float vIntensity;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;

    // Soft glow falloff: tight core + wide halo
    float core = exp(-r * r * 22.0);
    float halo = exp(-r * r * 5.5) * 0.45;
    float shape = core + halo;

    // Golden amber → warm white: core is deepest gold, outer is pale
    vec3 colorCore  = vec3(1.0, 0.68, 0.05);
    vec3 colorOuter = vec3(1.0, 0.92, 0.55);
    vec3 color = mix(colorOuter, colorCore, core);

    // Older particles shift slightly redder/dimmer
    color = mix(color, vec3(0.9, 0.4, 0.05), vLife * 0.25);

    float alpha = shape * vIntensity * 0.9;
    gl_FragColor = vec4(color * (1.0 + core * 0.5), alpha);
  }
`;

// ── Microphone monitor ────────────────────────────────────────────────
class MicrophoneMonitor {
  private analyser: AnalyserNode | null = null;
  private dataArray = new Uint8Array(0);
  private _amplitude = 0;
  private _ready = false;

  get amplitude(): number { return this._amplitude; }
  get ready(): boolean { return this._ready; }

  async init(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx = new AudioCtx() as AudioContext;
      const src = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.6;
      src.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this._ready = true;
    } catch {
      // Mic unavailable or denied — BreathStream simply stays silent
    }
  }

  update(): void {
    if (!this.analyser) return;
    this.analyser.getByteTimeDomainData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] / 128.0) - 1.0;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    this._amplitude = this._amplitude * 0.75 + rms * 0.25;
  }
}

// ── BreathStream ──────────────────────────────────────────────────────
export class BreathStream {
  readonly group: THREE.Group;

  private mic = new MicrophoneMonitor();

  // Per-particle state (typed arrays to avoid GC pressure)
  private positions: Float32Array;
  private velocities: Float32Array;
  private ages: Float32Array;
  private lifetimes: Float32Array;

  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;

  // Fractional emission debt
  private emitAccum = 0;

  // Cached mouth pose (fed from app.ts each frame)
  private mouthPos = new THREE.Vector3();
  private mouthFwd = new THREE.Vector3(0, 0, -1);

  // Scratch
  private _tmp = new THREE.Vector3();

  /** Normalized microphone amplitude after threshold & gain (0-1). */
  get micAmplitude(): number {
    const v = this.mic.amplitude * AMPLITUDE_GAIN - AMPLITUDE_THRESHOLD * AMPLITUDE_GAIN;
    return Math.max(0, Math.min(v, 1));
  }

  constructor() {
    this.group = new THREE.Group();
    this.group.renderOrder = 999; // draw on top of most things

    this.positions  = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.ages       = new Float32Array(PARTICLE_COUNT);
    this.lifetimes  = new Float32Array(PARTICLE_COUNT);

    // All particles start dead
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.ages[i] = 9999;
      this.lifetimes[i] = 1.0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.geometry.setAttribute(
      "aAge",
      new THREE.BufferAttribute(this.ages, 1),
    );
    this.geometry.setAttribute(
      "aLifetime",
      new THREE.BufferAttribute(this.lifetimes, 1),
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader: BREATH_VERTEX,
      fragmentShader: BREATH_FRAGMENT,
      uniforms: {
        uSize: { value: PARTICLE_SIZE },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.group.add(points);

    // Request mic access immediately
    this.mic.init();
  }

  /**
   * Set mouth pose from head position and forward direction.
   * Call every frame before update().
   */
  setMouth(headPos: THREE.Vector3, headForward: THREE.Vector3): void {
    this.mouthPos.copy(headPos);
    this.mouthPos.addScaledVector(headForward, MOUTH_FORWARD_OFFSET);
    this.mouthPos.y -= MOUTH_DOWN_OFFSET;
    this.mouthFwd.copy(headForward);
  }

  /** Find the index of the first dead particle, or -1 if all alive. */
  private findDead(): number {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this.ages[i] >= this.lifetimes[i]) return i;
    }
    return -1;
  }

  /** Emit one particle from the mouth. */
  private emit(): void {
    const idx = this.findDead();
    if (idx < 0) return;
    const i3 = idx * 3;

    // Position: at mouth with tiny jitter
    this.positions[i3]     = this.mouthPos.x + (Math.random() - 0.5) * 0.03;
    this.positions[i3 + 1] = this.mouthPos.y + (Math.random() - 0.5) * 0.03;
    this.positions[i3 + 2] = this.mouthPos.z + (Math.random() - 0.5) * 0.03;

    // Velocity: forward cone spread
    const speed = BASE_SPEED + (Math.random() - 0.5) * SPEED_VARIANCE;
    const sx = (Math.random() - 0.5) * SPREAD_ANGLE;
    const sy = (Math.random() - 0.5) * SPREAD_ANGLE;
    this._tmp.copy(this.mouthFwd);
    this._tmp.x += sx;
    this._tmp.y += sy;
    this._tmp.normalize();
    this.velocities[i3]     = this._tmp.x * speed;
    this.velocities[i3 + 1] = this._tmp.y * speed;
    this.velocities[i3 + 2] = this._tmp.z * speed;

    // Lifetime
    this.ages[idx] = 0;
    this.lifetimes[idx] =
      LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN);
  }

  update(delta: number, _elapsed: number): void {
    this.mic.update();

    const amp = this.micAmplitude;

    // Emit proportional to amplitude
    if (amp > 0) {
      this.emitAccum += EMIT_RATE * amp * delta;
      while (this.emitAccum >= 1) {
        this.emit();
        this.emitAccum -= 1;
      }
    } else {
      this.emitAccum = 0;
    }

    // Integrate particle physics
    const drag = Math.pow(DRAG_PER_SEC, delta);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this.ages[i] >= this.lifetimes[i]) continue;

      this.ages[i] += delta;

      const i3 = i * 3;

      // Drag
      this.velocities[i3]     *= drag;
      this.velocities[i3 + 1] *= drag;
      this.velocities[i3 + 2] *= drag;

      // Gentle upward buoyancy
      this.velocities[i3 + 1] += BUOYANCY * delta;

      // Integrate
      this.positions[i3]     += this.velocities[i3]     * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;
    }

    // Upload to GPU
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAge as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aLifetime as THREE.BufferAttribute).needsUpdate = true;
  }
}
