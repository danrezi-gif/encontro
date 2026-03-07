import * as THREE from "three";

/**
 * EnergyFieldBokeh — subtle ambient glow beneath the body of light.
 *
 * Clipped to the lower hemisphere. Toned-down blue-white bokeh orbs
 * that drift slowly downward, representing scattered light refractions
 * in the air below the cascading figure. Not the main event — just
 * atmospheric support for the Viola body above.
 */

const VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
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
  varying vec2 vUv;

  // Muted blue-white palette
  const vec3 deepBlue  = vec3(0.15, 0.2, 0.55);
  const vec3 paleBlue  = vec3(0.4, 0.5, 0.8);
  const vec3 softWhite = vec3(0.6, 0.65, 0.8);

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

    // ── Lower hemisphere clip ──────────────────────────────────
    // theta < PI/2 means upper hemisphere → fade out
    // theta = 0 is straight up, PI is straight down
    // We want visible only in the lower half (theta > ~PI/3)
    float hemiMask = smoothstep(0.3, 0.55, uv.y); // uv.y = theta/PI

    if (hemiMask < 0.01) discard;

    float time = uTime * 0.4; // slower than before
    float effectStrength = 0.5 + uBreath * 0.2;
    float baseSize = 0.25 * (1.0 + uBreath * 0.1);

    // Hand energy — subtle
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

    // ── 5 soft drifting orbs (downward drift bias) ─────────────
    // Orb 1
    vec2 p1 = vec2(0.3, 0.6) + vec2(sin(time * 0.7) * 0.06, cos(time * 0.5) * 0.04 + time * 0.02);
    p1.y = fract(p1.y); // wrap around
    float c1 = circle(uv, p1, baseSize * 1.1 * effectStrength);

    // Orb 2
    vec2 p2 = vec2(0.7, 0.7) + vec2(cos(time * 0.6 + 1.0) * 0.05, sin(time * 0.4) * 0.05 + time * 0.015);
    p2.y = fract(p2.y);
    float c2 = circle(uv, p2, baseSize * 0.9 * effectStrength);

    // Orb 3
    vec2 p3 = vec2(0.5, 0.65) + vec2(sin(time * 0.8 + 2.5) * 0.04, cos(time * 0.3 + 1.0) * 0.06 + time * 0.018);
    p3.y = fract(p3.y);
    float c3 = circle(uv, p3, baseSize * 1.2 * effectStrength);

    // Orb 4
    vec2 p4 = vec2(0.2, 0.75) + vec2(cos(time * 0.5 + 4.0) * 0.07, sin(time * 0.6) * 0.03 + time * 0.012);
    p4.y = fract(p4.y);
    float c4 = circle(uv, p4, baseSize * 0.8 * effectStrength);

    // Orb 5
    vec2 p5 = vec2(0.8, 0.55) + vec2(sin(time * 0.9 + 3.0) * 0.05, cos(time * 0.4 + 2.0) * 0.04 + time * 0.016);
    p5.y = fract(p5.y);
    float c5 = circle(uv, p5, baseSize * 1.0 * effectStrength);

    // Color — muted blue-white
    float opacity = 0.25 + handEnergy * 0.15;
    vec3 overlay = deepBlue  * c1 * opacity
                 + paleBlue  * c2 * opacity * 0.8
                 + softWhite * c3 * opacity * 0.6
                 + deepBlue  * c4 * opacity * 0.7
                 + paleBlue  * c5 * opacity * 0.5;

    float totalAlpha = (c1 + c2 + c3 + c4 + c5) * 0.08;
    totalAlpha *= hemiMask;
    totalAlpha *= effectStrength * 0.4;

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

  constructor() {
    this.group = new THREE.Group();

    this.geometry = new THREE.SphereGeometry(1.2, 32, 24);

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
    this.mesh.position.copy(this.headPos);
    this.mesh.position.y -= 0.2;

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
