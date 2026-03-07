import * as THREE from "three";

/**
 * EtherealMist — luminous cloud wisps at various altitudes.
 *
 * Flat billboard quads with noise-driven alpha placed in worldRoot
 * so they scroll with levitation. When the soul flies through a layer,
 * wisps part around the user and trail behind — providing critical
 * motion parallax that makes flight feel real.
 *
 * Each wisp is a large transparent quad with procedural noise.
 * Wisps are distributed in strata at set altitudes with random XZ scatter.
 */

// ── PARAM: Mist tuning ──────────────────────────────────────────────
/** Heights (m) at which mist strata form. */
const STRATA_HEIGHTS = [6, 10, 15, 22, 35, 50, 75];

/** Number of wisps per stratum. */
const WISPS_PER_STRATUM = 18;

/** XZ scatter radius per stratum (m). */
const SCATTER_RADIUS = 120;

/** Height scatter per stratum (m ±). */
const HEIGHT_SCATTER = 2.0;

/** Base wisp size (m). */
const WISP_SIZE_MIN = 8;
const WISP_SIZE_MAX = 25;

/** Wisp base opacity. */
const WISP_OPACITY = 0.12;

/** How strongly wisps part around the soul (m radius). */
const PART_RADIUS = 4.0;

const MIST_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aOpacity;

  uniform float uTime;
  uniform vec3 uSoulPos; // soul world position (including levitation)

  varying float vOpacity;
  varying vec2 vUv;
  varying float vPhase;
  varying float vProximity; // 0 = far, 1 = soul is right here

  void main() {
    vUv = uv;
    vPhase = aPhase;
    vOpacity = aOpacity;

    // World position of this vertex
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    // Proximity to soul — wisps part around user
    float dist = distance(worldPos.xyz, uSoulPos);
    vProximity = 1.0 - smoothstep(0.0, ${PART_RADIUS.toFixed(1)}, dist);

    // Push vertices away from soul (parting effect)
    vec3 awayDir = normalize(worldPos.xyz - uSoulPos + vec3(0.001));
    worldPos.xyz += awayDir * vProximity * 2.5;

    // Gentle drift animation
    worldPos.x += sin(uTime * 0.08 + aPhase * 6.28) * 1.5;
    worldPos.z += cos(uTime * 0.06 + aPhase * 4.17) * 1.2;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const MIST_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;

  varying float vOpacity;
  varying vec2 vUv;
  varying float vPhase;
  varying float vProximity;

  // Simple noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2(p);
      p = p * 2.0 + vec2(17.0, 31.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Centered UV
    vec2 c = vUv - 0.5;
    float r = length(c);

    // Soft circular falloff
    float circle = smoothstep(0.5, 0.15, r);

    // Noise-driven alpha for organic wisp shape
    vec2 noiseUV = vUv * 3.0 + vec2(vPhase * 10.0, uTime * 0.03);
    float n = fbm(noiseUV);

    // Wispy shape: threshold noise for holes and tendrils
    float wisp = smoothstep(0.35, 0.6, n);

    // Near the soul, wisps become more transparent (parting)
    float partFade = 1.0 - vProximity * 0.8;

    float alpha = circle * wisp * vOpacity * partFade;

    // Luminous blue-white color, slightly warmer at edges
    vec3 color = mix(
      vec3(0.25, 0.35, 0.65),  // edge
      vec3(0.5, 0.6, 0.85),    // core
      circle * wisp
    );

    // Faint glow when soul is nearby
    color += vec3(0.15, 0.2, 0.35) * vProximity;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class EtherealMist {
  readonly group: THREE.Group;
  private material: THREE.ShaderMaterial;
  private soulPos = new THREE.Vector3(0, 1.6, 0);

  constructor() {
    this.group = new THREE.Group();

    this.material = new THREE.ShaderMaterial({
      vertexShader: MIST_VERTEX,
      fragmentShader: MIST_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSoulPos: { value: new THREE.Vector3() },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.createWisps();
  }

  private createWisps(): void {
    const baseGeo = new THREE.PlaneGeometry(1, 1);

    for (const stratumH of STRATA_HEIGHTS) {
      for (let i = 0; i < WISPS_PER_STRATUM; i++) {
        // Random position in stratum
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * SCATTER_RADIUS;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = stratumH + (Math.random() - 0.5) * HEIGHT_SCATTER * 2;

        const size = WISP_SIZE_MIN + Math.random() * (WISP_SIZE_MAX - WISP_SIZE_MIN);
        const phase = Math.random();
        const opacity = WISP_OPACITY * (0.5 + Math.random() * 0.5);

        // Clone geometry and add per-vertex attributes
        const geo = baseGeo.clone();
        const vertCount = geo.attributes.position.count;

        const sizes = new Float32Array(vertCount).fill(size);
        const phases = new Float32Array(vertCount).fill(phase);
        const opacities = new Float32Array(vertCount).fill(opacity);

        geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
        geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));

        const mesh = new THREE.Mesh(geo, this.material);
        mesh.position.set(x, y, z);
        mesh.scale.setScalar(size);

        // Random rotation so wisps aren't all aligned
        mesh.rotation.x = Math.random() * 0.6 - 0.3;
        mesh.rotation.y = Math.random() * Math.PI * 2;
        mesh.rotation.z = Math.random() * 0.4 - 0.2;

        this.group.add(mesh);
      }
    }

    baseGeo.dispose();
  }

  /** Soul position in world space (before levitation offset). */
  setSoulPos(pos: THREE.Vector3): void {
    this.soulPos.copy(pos);
  }

  update(_delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uSoulPos.value.copy(this.soulPos);
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
    this.material.dispose();
  }
}
