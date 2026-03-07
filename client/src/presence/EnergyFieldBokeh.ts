import * as THREE from "three";

/**
 * EnergyFieldBokeh — transcendent sky glow during ascent.
 *
 * At ground level: subtle glow beneath the body.
 * As the user ascends: the sky fills with luminous orbs of light,
 * growing in size, brightness, and number — the user is ascending
 * into a celestial field of light. Spectacular, not subtle.
 */

const VERTEX = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uBreath;
  uniform float uHeight;
  uniform vec3 uHeadPos;
  uniform vec3 uLeftHandPos;
  uniform vec3 uRightHandPos;
  uniform float uLeftHandActive;
  uniform float uRightHandActive;
  uniform float uLeftHandSpeed;
  uniform float uRightHandSpeed;
  uniform float uMovementIntensity;

  varying vec3 vWorldPos;

  float circle(vec2 uv, vec2 pos, float radius, float soft) {
    return 1.0 - smoothstep(radius - soft, radius + soft, distance(uv, pos));
  }

  void main() {
    vec3 localDir = normalize(vWorldPos - uHeadPos);

    float phi   = atan(localDir.z, localDir.x);
    float theta = acos(clamp(localDir.y, -1.0, 1.0));
    vec2 uv = vec2(phi / 6.2831 + 0.5, theta / 3.14159);

    // Height factor: 0 at ground, 1 at ~8m
    float hf = clamp(uHeight / 8.0, 0.0, 1.0);
    // Extended factor for continued growth beyond 8m
    float hfExt = clamp(uHeight / 15.0, 0.0, 1.0);

    // ── Hemisphere transition ────────────────────────────────
    // Ground: lower hemisphere only. Ascent: expands to full sky.
    float cutoff = mix(0.35, -0.3, hf);
    float hemiMask = smoothstep(cutoff, cutoff + 0.15, uv.y);
    // Upper sky glow ramps in strongly
    float skyGlow = smoothstep(0.6, 0.0, uv.y) * hf * 1.5;
    hemiMask = max(hemiMask, skyGlow);

    if (hemiMask < 0.01) discard;

    float time = uTime * 0.35;
    float breath = 0.5 + uBreath * 0.2;
    // Orbs grow much larger during ascent
    float baseSize = mix(0.2, 0.45, hf) * (1.0 + uBreath * 0.1);
    float soft = mix(0.2, 0.35, hf); // softer at height

    // Drift direction: downward at ground, upward during ascent
    float drift = mix(0.02, -0.03, hf);

    // Hand energy
    float handEnergy = 0.0;
    if (uLeftHandActive > 0.5) {
      vec3 hL = normalize(uLeftHandPos - uHeadPos);
      vec2 hUvL = vec2(atan(hL.z, hL.x) / 6.2831 + 0.5, acos(clamp(hL.y, -1.0, 1.0)) / 3.14159);
      handEnergy += smoothstep(0.5, 0.0, distance(uv, hUvL)) * uLeftHandSpeed * 0.6;
    }
    if (uRightHandActive > 0.5) {
      vec3 hR = normalize(uRightHandPos - uHeadPos);
      vec2 hUvR = vec2(atan(hR.z, hR.x) / 6.2831 + 0.5, acos(clamp(hR.y, -1.0, 1.0)) / 3.14159);
      handEnergy += smoothstep(0.5, 0.0, distance(uv, hUvR)) * uRightHandSpeed * 0.6;
    }
    handEnergy = min(handEnergy, 1.0);

    // ── Base orbs (always present) ─────────────────────────────
    float c1 = circle(uv, fract(vec2(0.3, 0.6)  + vec2(sin(time*0.7)*0.08,  time*drift + cos(time*0.5)*0.05)),  baseSize * 1.0 * breath, soft);
    float c2 = circle(uv, fract(vec2(0.7, 0.65) + vec2(cos(time*0.6+1.0)*0.07, time*drift*0.8 + sin(time*0.4)*0.04)), baseSize * 0.85 * breath, soft);
    float c3 = circle(uv, fract(vec2(0.5, 0.5)  + vec2(sin(time*0.8+2.5)*0.06, time*drift*1.1 + cos(time*0.35)*0.06)), baseSize * 1.2 * breath, soft);
    float c4 = circle(uv, fract(vec2(0.15, 0.7) + vec2(cos(time*0.5+4.0)*0.09, time*drift*0.7 + sin(time*0.55)*0.04)), baseSize * 0.9 * breath, soft);
    float c5 = circle(uv, fract(vec2(0.85, 0.45)+ vec2(sin(time*0.9+3.0)*0.06, time*drift*0.9 + cos(time*0.45)*0.05)), baseSize * 1.05 * breath, soft);

    // ── Sky orbs (appear during ascent) ────────────────────────
    float c6 = circle(uv, fract(vec2(0.4, 0.2)  + vec2(cos(time*0.4+5.0)*0.1,  time*drift*1.2 + sin(time*0.3)*0.07)),   baseSize * 1.4 * breath, soft) * hf;
    float c7 = circle(uv, fract(vec2(0.65, 0.15)+ vec2(sin(time*0.5+2.0)*0.08, time*drift*1.0 + cos(time*0.28)*0.08)),  baseSize * 1.3 * breath, soft) * hf;
    float c8 = circle(uv, fract(vec2(0.2, 0.25) + vec2(cos(time*0.35+1.5)*0.09, time*drift*1.3 + sin(time*0.22)*0.06)), baseSize * 1.6 * breath, soft) * hf;
    float c9 = circle(uv, fract(vec2(0.8, 0.1)  + vec2(sin(time*0.45+6.0)*0.07, time*drift*0.8 + cos(time*0.4)*0.09)),  baseSize * 1.1 * breath, soft) * hfExt;
    float c10= circle(uv, fract(vec2(0.5, 0.08) + vec2(cos(time*0.3+3.5)*0.11, time*drift*1.4 + sin(time*0.2)*0.07)),   baseSize * 1.8 * breath, soft) * hfExt;

    // ── Ambient sky wash at high altitude ──────────────────────
    // A soft overall glow that fills the upper sky
    float ambientSky = smoothstep(0.6, 0.0, uv.y) * hfExt * 0.15;

    // ── Color palette — warmer and more luminous at height ─────
    vec3 deepBlue   = vec3(0.12, 0.18, 0.5);
    vec3 paleBlue   = vec3(0.35, 0.45, 0.8);
    vec3 warmWhite  = vec3(0.8, 0.78, 0.9);
    vec3 celestial  = vec3(0.9, 0.85, 0.95);
    vec3 goldenGlow = vec3(0.95, 0.88, 0.7);

    vec3 col1 = mix(deepBlue, warmWhite, hf * 0.6);
    vec3 col2 = mix(paleBlue, celestial, hf * 0.5);
    vec3 col3 = mix(warmWhite, goldenGlow, hf * 0.3);

    float opacity = mix(0.3, 0.7, hf) + handEnergy * 0.2;

    vec3 overlay = col1 * c1 * opacity
                 + col2 * c2 * opacity * 0.9
                 + col3 * c3 * opacity * 0.8
                 + col1 * c4 * opacity * 0.85
                 + col2 * c5 * opacity * 0.75
                 + col3 * c6 * opacity * 1.0
                 + celestial * c7 * opacity * 0.95
                 + warmWhite * c8 * opacity * 1.1
                 + goldenGlow * c9 * opacity * 0.9
                 + celestial * c10 * opacity * 1.2;

    // Ambient sky wash color
    overlay += mix(deepBlue, celestial, hfExt) * ambientSky;

    float totalAlpha = (c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + c9 + c10) * 0.1;
    totalAlpha += ambientSky;
    totalAlpha *= hemiMask;

    // Intensity ramps dramatically with height
    float intensityMult = mix(0.5, 4.0, hf);
    totalAlpha *= breath * intensityMult;

    if (totalAlpha < 0.005) discard;

    gl_FragColor = vec4(overlay, totalAlpha);
  }
`;

export class EnergyFieldBokeh {
  readonly group: THREE.Group;
  private mesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;
  private material: THREE.ShaderMaterial;

  private headPos = new THREE.Vector3(0, 1.6, 0);
  private leftHandPos = new THREE.Vector3();
  private rightHandPos = new THREE.Vector3();
  private leftHandActive = false;
  private rightHandActive = false;
  private leftHandSpeed = 0;
  private rightHandSpeed = 0;
  private movementIntensity = 0;
  private liftHeight = 0;

  constructor() {
    this.group = new THREE.Group();

    // Large sphere — encompasses the user's sky view
    this.geometry = new THREE.SphereGeometry(5.0, 32, 24);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uHeight: { value: 0 },
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

  setHeight(h: number): void {
    this.liftHeight = h;
  }

  update(_delta: number, elapsed: number): void {
    this.mesh.position.copy(this.headPos);

    const u = this.material.uniforms;
    u.uTime.value = elapsed;
    u.uBreath.value = Math.sin(elapsed * 0.8) * 0.5 + 0.5;
    u.uHeight.value = this.liftHeight;
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
