import * as THREE from "three";

/**
 * EnergyField — the user's visible self as a flowing iridescent volume.
 *
 * Inspired by raymarched iridescent distance fields (Shadertoy "rotate i" style).
 * Instead of thousands of discrete particles, the user is surrounded by a
 * continuous luminous form — prismatic light that flows, breathes, and reacts
 * to hand movement. The iridescence comes from view-angle-dependent color
 * using dot-product hue shifting.
 *
 * Rendered on an icosphere mesh centered on the user, with raymarching
 * happening in the fragment shader using the mesh surface as the entry point.
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

  #define PI 3.141596
  #define TAU 6.283185

  // Rotation matrix for domain warping
  mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  // FBM noise for organic distortion
  float fbm(vec3 p) {
    float n = 0.0;
    for (int i = 0; i < 4; i++) {
      n += abs(dot(cos(p), vec3(0.1)));
      p *= 1.8;
    }
    return n;
  }

  void main() {
    float T = uTime;

    // Ray from camera through this fragment
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - cameraPosition);

    // Raymarch volume centered on head position
    vec3 center = uHeadPos;
    float zMax = 1.5;  // max march depth (volume radius)
    float z = 0.05;

    vec3 col = vec3(0.0);
    float totalAlpha = 0.0;

    // Start from the mesh surface
    vec3 entryPoint = vWorldPos;
    float entryDist = length(entryPoint - center);

    // Only march if we're within the volume
    if (entryDist > zMax * 2.0) discard;

    // Breathing modulation
    float breathScale = 1.0 + uBreath * 0.1;

    for (float i = 0.0; i < 60.0; i++) {
      vec3 p = entryPoint + rd * z;

      // Relative to field center
      vec3 rp = (p - center) / breathScale;

      // Hand influence — warp space near hands
      if (uLeftHandActive > 0.5) {
        vec3 toHand = p - uLeftHandPos;
        float handDist = length(toHand);
        float influence = smoothstep(0.8, 0.0, handDist);
        // Swirl space around hand
        rp.xz *= rotate(influence * uLeftHandSpeed * 2.0);
        rp.yz *= rotate(influence * uLeftHandSpeed * 1.3);
        // Push density outward
        rp += normalize(toHand + vec3(0.001)) * influence * uLeftHandSpeed * 0.2;
      }

      if (uRightHandActive > 0.5) {
        vec3 toHand = p - uRightHandPos;
        float handDist = length(toHand);
        float influence = smoothstep(0.8, 0.0, handDist);
        rp.xz *= rotate(-influence * uRightHandSpeed * 2.0);
        rp.yz *= rotate(-influence * uRightHandSpeed * 1.3);
        rp += normalize(toHand + vec3(0.001)) * influence * uRightHandSpeed * 0.2;
      }

      // Domain rotation — creates the flowing, twisting form
      rp.xz *= rotate(T * 0.3 + i * 0.02);
      rp.yz *= rotate(T * 0.2 + i * 0.015);

      // Distance field with FBM distortion
      float d = length(rp) - 0.4;
      d = abs(d) * 0.6 + 0.01;

      // FBM adds organic complexity
      d += fbm(rp * 1.8 + T * 0.2) * 0.2;

      // Iridescent color — view-angle and position-dependent
      // This is the key technique from the reference:
      // color shifts based on dot product of position with a constant,
      // creating prismatic rainbow refraction
      vec3 iridescence = (1.1 + sin(vec3(3.0, 2.0, 1.0) + dot(rp, vec3(1.0)) + T * 0.5)) / d;

      // Hand proximity warm shift
      float handWarmth = 0.0;
      if (uLeftHandActive > 0.5) {
        float dL = distance(p, uLeftHandPos);
        handWarmth += smoothstep(0.6, 0.0, dL) * uLeftHandSpeed;
      }
      if (uRightHandActive > 0.5) {
        float dR = distance(p, uRightHandPos);
        handWarmth += smoothstep(0.6, 0.0, dR) * uRightHandSpeed;
      }
      handWarmth = min(handWarmth, 1.0);

      // Warm shift near hands
      vec3 warmShift = vec3(0.3, 0.1, -0.2) * handWarmth;
      iridescence += warmShift;

      // Accumulate color with depth-based falloff
      float density = 1.0 / (d * d * 200.0 + 1.0);
      col += iridescence * density * 0.035;
      totalAlpha += density * 0.04;

      // Adaptive step — larger steps in empty space
      z += max(d * 0.5, 0.01);

      if (z > zMax) break;
    }

    // Tone mapping
    col = tanh(col * 0.8);

    // Edge fade — soften the volume boundary
    float edgeFade = smoothstep(zMax, zMax * 0.3, length(entryPoint - center));
    totalAlpha *= edgeFade;

    // Breathing alpha modulation
    totalAlpha *= 0.7 + uBreath * 0.3;

    // Movement intensity boost
    totalAlpha *= 1.0 + uMovementIntensity * 0.5;

    totalAlpha = clamp(totalAlpha, 0.0, 0.85);

    // Discard near-invisible fragments
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

    // Icosphere volume container — large enough to encompass the user
    this.geometry = new THREE.IcosahedronGeometry(1.2, 4);

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
      side: THREE.BackSide, // Render inside of sphere — we're inside it
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
    // Move the mesh to follow the user
    this.mesh.position.copy(this.headPos);
    this.mesh.position.y -= 0.2; // center slightly below head (torso area)

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
