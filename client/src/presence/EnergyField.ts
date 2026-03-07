import * as THREE from "three";

/**
 * EnergyField — Bill Viola-inspired body of cascading light.
 *
 * The user's body is a human silhouette made entirely of light that
 * streams downward like luminous water. Built from capsule SDFs (torso + arms)
 * with downward-scrolling FBM noise creating the cascade effect.
 *
 * Head/upper torso glows brightest. Light dims and breaks into streaming
 * trails below the hips, dissolving before reaching the ground.
 * Blue-white palette with warm white at peak density.
 */

const VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vNormal;

  void main() {
    vLocalPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uBreath;
  uniform vec3 uHeadPos;
  uniform vec3 uLeftHandPos;
  uniform vec3 uRightHandPos;
  uniform float uLeftHandActive;
  uniform float uRightHandActive;
  uniform float uLeftHandSpeed;
  uniform float uRightHandSpeed;
  uniform float uMovementIntensity;

  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vNormal;

  // ── Noise ────────────────────────────────────────────────────
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = dot(i, vec3(1.0, 57.0, 113.0));
    return mix(
      mix(mix(hash(n),         hash(n + 1.0),   f.x),
          mix(hash(n + 57.0),  hash(n + 58.0),  f.x), f.y),
      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec3(100.0);
      a *= 0.5;
    }
    return v;
  }

  // ── SDF primitives ───────────────────────────────────────────
  float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // ── Body SDF ─────────────────────────────────────────────────
  float bodyField(vec3 p) {
    // Torso: crown of head to hips
    vec3 headTop = uHeadPos + vec3(0.0, 0.12, 0.0);
    vec3 hips    = uHeadPos + vec3(0.0, -0.6, 0.0);
    float torso  = sdCapsule(p, headTop, hips, 0.16);

    // Head: slightly wider at crown
    float head = length(p - uHeadPos - vec3(0.0, 0.05, 0.0)) - 0.13;
    torso = smin(torso, head, 0.08);

    float body = torso;

    // Arms — only when tracked
    if (uLeftHandActive > 0.5) {
      vec3 shoulder = uHeadPos + vec3(-0.2, -0.18, 0.0);
      body = smin(body, sdCapsule(p, shoulder, uLeftHandPos, 0.05), 0.1);
    }
    if (uRightHandActive > 0.5) {
      vec3 shoulder = uHeadPos + vec3(0.2, -0.18, 0.0);
      body = smin(body, sdCapsule(p, shoulder, uRightHandPos, 0.05), 0.1);
    }

    return body;
  }

  void main() {
    float T = uTime;

    vec3 rd = normalize(vWorldPos - cameraPosition);
    vec3 center = uHeadPos - vec3(0.0, 0.3, 0.0);
    float zMax = 2.5;

    vec3 entryPoint = vWorldPos;
    if (length(entryPoint - center) > zMax * 1.5) discard;

    vec3 col  = vec3(0.0);
    float totalAlpha = 0.0;

    float cascadeSpeed = 1.8;
    float z = 0.05;

    for (float i = 0.0; i < 50.0; i++) {
      vec3 p = entryPoint + rd * z;

      // Body distance
      float bd = bodyField(p);

      // Height relative to head
      float relY = p.y - uHeadPos.y;

      // ── Cascading noise (scrolls downward) ─────────────────
      vec3 cp = p * 3.5;
      cp.y -= T * cascadeSpeed;
      float cascade = fbm(cp);

      // Fine detail (cheaper single noise lookup)
      float fine = noise(p * 8.0 + vec3(0.0, -T * cascadeSpeed * 1.4, 0.0));

      // Create vein-like streaming patterns
      float veins = 1.0 - abs(cascade - 0.5) * 2.0;
      veins = pow(max(veins, 0.0), 2.5);

      float fineVeins = 1.0 - abs(fine - 0.5) * 2.0;
      fineVeins = pow(max(fineVeins, 0.0), 3.0);

      float stream = veins * 0.7 + fineVeins * 0.3;

      // ── Density ────────────────────────────────────────────
      float density = 0.0;

      // Inside body: bright cascading light
      float bodyMask = smoothstep(0.12, -0.06, bd);
      density += bodyMask * (0.3 + stream * 0.7);

      // Surface glow: luminous edge
      density += smoothstep(0.08, 0.0, abs(bd)) * 0.4;

      // Streaming below body — light pours from the hips
      float belowHips = smoothstep(uHeadPos.y - 0.4, uHeadPos.y - 0.7, p.y);
      float colRadius = 0.2 + belowHips * 0.5;
      float colDist   = length(p.xz - uHeadPos.xz);
      float streamCol = smoothstep(colRadius, colRadius * 0.2, colDist);
      float streamFade = smoothstep(uHeadPos.y - 2.5, uHeadPos.y - 0.6, p.y);
      density += streamCol * stream * belowHips * streamFade * 0.45;

      // Hand disturbance — movement scatters light
      if (uLeftHandActive > 0.5) {
        float dL = distance(p, uLeftHandPos);
        density += smoothstep(0.4, 0.0, dL) * uLeftHandSpeed * stream * 0.3;
      }
      if (uRightHandActive > 0.5) {
        float dR = distance(p, uRightHandPos);
        density += smoothstep(0.4, 0.0, dR) * uRightHandSpeed * stream * 0.3;
      }

      // ── Height brightness (Viola: head brightest) ──────────
      float heightBright = smoothstep(-2.0, 0.3, relY);
      heightBright = 0.3 + heightBright * 0.7;
      density *= heightBright;

      // ── Color: blue-white, warming at peak density ─────────
      vec3 coolBlue  = vec3(0.35, 0.45, 0.9);
      vec3 paleBlue  = vec3(0.6, 0.72, 1.0);
      vec3 warmWhite = vec3(1.0, 0.95, 0.88);

      vec3 lightCol = mix(coolBlue, paleBlue, heightBright);
      lightCol = mix(lightCol, warmWhite, density * heightBright);

      // Accumulate
      col += lightCol * density * 0.06;
      totalAlpha += density * 0.05;

      // Adaptive step — finer near the body surface
      float step = bd < 0.25 ? 0.025 : max(bd * 0.4, 0.03);
      z += step;
      if (z > zMax) break;
    }

    // Tone map
    col = tanh(col * 1.2);

    // Edge fade
    totalAlpha *= smoothstep(zMax, zMax * 0.3, length(entryPoint - center));

    // Breathing modulation
    totalAlpha *= 0.8 + uBreath * 0.2;

    totalAlpha = clamp(totalAlpha, 0.0, 0.9);
    if (totalAlpha < 0.005) discard;

    gl_FragColor = vec4(col, totalAlpha);
  }
`;

export class EnergyField {
  readonly group: THREE.Group;
  private mesh: THREE.Mesh;
  private geometry: THREE.IcosahedronGeometry;
  private material: THREE.ShaderMaterial;

  // External inputs
  private headPos = new THREE.Vector3(0, 1.6, 0);
  private leftHandPos = new THREE.Vector3();
  private rightHandPos = new THREE.Vector3();
  private leftHandActive = false;
  private rightHandActive = false;
  private leftHandSpeed = 0;
  private rightHandSpeed = 0;
  private movementIntensity = 0;

  constructor() {
    this.group = new THREE.Group();

    // Large enough to contain the full body + streaming trails below
    this.geometry = new THREE.IcosahedronGeometry(2.5, 4);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uHeadPos: { value: new THREE.Vector3(0, 1.6, 0) },
        uLeftHandPos: { value: new THREE.Vector3() },
        uRightHandPos: { value: new THREE.Vector3() },
        uLeftHandActive: { value: 0 },
        uRightHandActive: { value: 0 },
        uLeftHandSpeed: { value: 0 },
        uRightHandSpeed: { value: 0 },
        uMovementIntensity: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  setTracking(
    headPos: THREE.Vector3,
    leftHandPos: THREE.Vector3,
    rightHandPos: THREE.Vector3,
    leftHandActive: boolean,
    rightHandActive: boolean,
    leftHandSpeed: number,
    rightHandSpeed: number,
    movementIntensity: number,
  ): void {
    this.headPos.copy(headPos);
    this.leftHandPos.copy(leftHandPos);
    this.rightHandPos.copy(rightHandPos);
    this.leftHandActive = leftHandActive;
    this.rightHandActive = rightHandActive;
    this.leftHandSpeed = leftHandSpeed;
    this.rightHandSpeed = rightHandSpeed;
    this.movementIntensity = movementIntensity;
  }

  update(_delta: number, elapsed: number): void {
    // Center the volume on the body (slightly below head)
    this.mesh.position.copy(this.headPos);
    this.mesh.position.y -= 0.3;

    const u = this.material.uniforms;
    u.uTime.value = elapsed;
    u.uBreath.value = Math.sin(elapsed * 0.8) * 0.5 + 0.5;
    u.uMovementIntensity.value = this.movementIntensity;
    u.uHeadPos.value.copy(this.headPos);
    u.uLeftHandPos.value.copy(this.leftHandPos);
    u.uRightHandPos.value.copy(this.rightHandPos);
    u.uLeftHandActive.value = this.leftHandActive ? 1.0 : 0.0;
    u.uRightHandActive.value = this.rightHandActive ? 1.0 : 0.0;
    u.uLeftHandSpeed.value = this.leftHandSpeed;
    u.uRightHandSpeed.value = this.rightHandSpeed;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
