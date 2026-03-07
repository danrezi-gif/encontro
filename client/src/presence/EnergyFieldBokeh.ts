import * as THREE from "three";

/**
 * EnergyFieldBokeh — ambient light that transitions with ascent.
 *
 * At ground level: subtle glow beneath the body (scattered light on water).
 * As the user ascends: the glow expands and rises, filling the sky around
 * and above the user — ascending into light itself.
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
  uniform float uHeight;  // levitation height (0 = ground, grows as user rises)
  uniform vec3 uHeadPos;
  uniform vec3 uLeftHandPos;
  uniform vec3 uRightHandPos;
  uniform float uLeftHandActive;
  uniform float uRightHandActive;
  uniform float uLeftHandSpeed;
  uniform float uRightHandSpeed;
  uniform float uMovementIntensity;

  varying vec3 vWorldPos;

  const float softness = 0.25;

  float circle(vec2 uv, vec2 pos, float radius) {
    return 1.0 - smoothstep(radius - softness, radius + softness, distance(uv, pos));
  }

  void main() {
    vec3 localDir = normalize(vWorldPos - uHeadPos);

    // Spherical UV mapping
    float phi   = atan(localDir.z, localDir.x);
    float theta = acos(clamp(localDir.y, -1.0, 1.0));
    vec2 uv = vec2(phi / 6.2831 + 0.5, theta / 3.14159);
    // uv.y: 0 = straight up, 1 = straight down

    // ── Height-driven hemisphere transition ────────────────────
    // At ground (height=0): only lower hemisphere visible (uv.y > 0.35)
    // As user ascends: visible region expands upward
    // At height ~10+: full sphere, brighter above (ascending into light)
    float heightFactor = clamp(uHeight / 10.0, 0.0, 1.0);

    // Cutoff point moves from 0.35 (lower-only) to -0.1 (everything)
    float cutoff = mix(0.35, -0.1, heightFactor);
    float hemiMask = smoothstep(cutoff, cutoff + 0.2, uv.y);

    // At height, also add an upper-hemisphere glow
    float upperGlow = smoothstep(0.5, 0.0, uv.y) * heightFactor;
    hemiMask = max(hemiMask, upperGlow);

    if (hemiMask < 0.01) discard;

    float time = uTime * 0.4;
    float effectStrength = 0.5 + uBreath * 0.2;
    float baseSize = 0.25 * (1.0 + uBreath * 0.1);

    // Intensity increases with height (ascending into light)
    float heightIntensity = 1.0 + heightFactor * 2.5;

    // Hand energy
    float handEnergy = 0.0;
    if (uLeftHandActive > 0.5) {
      vec3 hL = normalize(uLeftHandPos - uHeadPos);
      vec2 hUvL = vec2(atan(hL.z, hL.x) / 6.2831 + 0.5, acos(clamp(hL.y, -1.0, 1.0)) / 3.14159);
      handEnergy += smoothstep(0.4, 0.0, distance(uv, hUvL)) * uLeftHandSpeed * 0.5;
    }
    if (uRightHandActive > 0.5) {
      vec3 hR = normalize(uRightHandPos - uHeadPos);
      vec2 hUvR = vec2(atan(hR.z, hR.x) / 6.2831 + 0.5, acos(clamp(hR.y, -1.0, 1.0)) / 3.14159);
      handEnergy += smoothstep(0.4, 0.0, distance(uv, hUvR)) * uRightHandSpeed * 0.5;
    }
    handEnergy = min(handEnergy, 0.8);

    // ── Drifting orbs ────────────────────────────────────────
    // At ground: drift downward. At height: drift upward (ascending).
    float driftDir = mix(1.0, -1.0, heightFactor); // +1 = down in uv, -1 = up in uv

    vec2 p1 = vec2(0.3, 0.6) + vec2(sin(time * 0.7) * 0.08, cos(time * 0.5) * 0.06 + time * 0.02 * driftDir);
    p1 = fract(p1);
    float c1 = circle(uv, p1, baseSize * 1.1 * effectStrength);

    vec2 p2 = vec2(0.7, 0.7) + vec2(cos(time * 0.6 + 1.0) * 0.07, sin(time * 0.4) * 0.05 + time * 0.015 * driftDir);
    p2 = fract(p2);
    float c2 = circle(uv, p2, baseSize * 0.9 * effectStrength);

    vec2 p3 = vec2(0.5, 0.4) + vec2(sin(time * 0.8 + 2.5) * 0.06, cos(time * 0.3 + 1.0) * 0.07 + time * 0.018 * driftDir);
    p3 = fract(p3);
    float c3 = circle(uv, p3, baseSize * 1.3 * effectStrength);

    vec2 p4 = vec2(0.2, 0.75) + vec2(cos(time * 0.5 + 4.0) * 0.09, sin(time * 0.6) * 0.04 + time * 0.012 * driftDir);
    p4 = fract(p4);
    float c4 = circle(uv, p4, baseSize * 0.85 * effectStrength);

    vec2 p5 = vec2(0.8, 0.3) + vec2(sin(time * 0.9 + 3.0) * 0.06, cos(time * 0.4 + 2.0) * 0.05 + time * 0.016 * driftDir);
    p5 = fract(p5);
    float c5 = circle(uv, p5, baseSize * 1.0 * effectStrength);

    // At height, add extra upper orbs
    vec2 p6 = vec2(0.4, 0.2) + vec2(cos(time * 0.45 + 5.0) * 0.08, sin(time * 0.35) * 0.06 + time * 0.01 * driftDir);
    p6 = fract(p6);
    float c6 = circle(uv, p6, baseSize * 1.4 * effectStrength) * heightFactor;

    vec2 p7 = vec2(0.6, 0.15) + vec2(sin(time * 0.55 + 2.0) * 0.07, cos(time * 0.25 + 3.0) * 0.08 + time * 0.014 * driftDir);
    p7 = fract(p7);
    float c7 = circle(uv, p7, baseSize * 1.2 * effectStrength) * heightFactor;

    // Color — warmer and brighter as user ascends
    vec3 deepBlue  = vec3(0.15, 0.2, 0.55);
    vec3 paleBlue  = vec3(0.4, 0.5, 0.8);
    vec3 softWhite = vec3(0.6, 0.65, 0.8);
    vec3 warmGlow  = vec3(0.7, 0.7, 0.85);

    // At height, shift palette warmer
    vec3 col1 = mix(deepBlue, warmGlow, heightFactor * 0.5);
    vec3 col2 = mix(paleBlue, softWhite, heightFactor * 0.3);
    vec3 col3 = mix(softWhite, warmGlow, heightFactor * 0.4);

    float opacity = 0.25 + handEnergy * 0.15;
    vec3 overlay = col1 * c1 * opacity
                 + col2 * c2 * opacity * 0.8
                 + col3 * c3 * opacity * 0.7
                 + col1 * c4 * opacity * 0.7
                 + col2 * c5 * opacity * 0.6
                 + col3 * c6 * opacity * 0.9
                 + warmGlow * c7 * opacity * 0.8;

    float totalAlpha = (c1 + c2 + c3 + c4 + c5 + c6 + c7) * 0.08;
    totalAlpha *= hemiMask;
    totalAlpha *= effectStrength * 0.4 * heightIntensity;

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

    // Larger sphere for atmospheric effect
    this.geometry = new THREE.SphereGeometry(3.0, 32, 24);

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

  /** Set the current levitation height for sky glow transition. */
  setHeight(h: number): void {
    this.liftHeight = h;
  }

  update(_delta: number, elapsed: number): void {
    this.mesh.position.copy(this.headPos);
    this.mesh.position.y -= 0.2;

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
