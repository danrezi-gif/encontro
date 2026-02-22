import * as THREE from "three";

/**
 * EnergyField — the user's visible self as a dynamic cloud of luminous particles.
 *
 * No body, no hands, no avatar — just a living field of light centered on
 * the user's tracked position. Particles orbit, breathe, and respond to
 * movement velocity. When hands move, particles near that region scatter
 * and glow brighter, creating a sense of embodied energy without literal form.
 *
 * Uses InstancedBufferGeometry + custom ShaderMaterial for GPU performance.
 */

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uBreath;
  uniform float uMovementIntensity;
  uniform vec3 uHeadPos;
  uniform vec3 uLeftHandPos;
  uniform vec3 uRightHandPos;
  uniform float uLeftHandActive;
  uniform float uRightHandActive;
  uniform float uLeftHandSpeed;
  uniform float uRightHandSpeed;

  attribute vec3 offset;
  attribute float seed;
  attribute float orbitSpeed;
  attribute float orbitRadius;
  attribute float particleSize;

  varying float vAlpha;
  varying float vGlow;
  varying vec3 vColor;

  // Simplex-like noise for organic motion
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float t = uTime;

    // Base orbital motion around the offset point
    float angle = t * orbitSpeed + seed * 6.2831;
    float angle2 = t * orbitSpeed * 0.7 + seed * 3.14;
    vec3 orbit = vec3(
      cos(angle) * orbitRadius,
      sin(angle2) * orbitRadius * 0.6,
      sin(angle) * orbitRadius
    );

    // Breathing — expand/contract rhythmically
    float breath = 1.0 + uBreath * 0.15 * sin(t * 0.8 + seed * 6.28);

    // Particle world position
    vec3 particlePos = uHeadPos + (offset + orbit) * breath;

    // Hand influence — particles near active hands get pulled and energized
    float handInfluence = 0.0;
    float handGlow = 0.0;

    if (uLeftHandActive > 0.5) {
      float dL = distance(particlePos, uLeftHandPos);
      float influenceL = smoothstep(0.8, 0.05, dL);
      // Push particles outward from hand, proportional to hand speed
      vec3 dirL = normalize(particlePos - uLeftHandPos + vec3(0.001));
      particlePos += dirL * influenceL * uLeftHandSpeed * 0.3;
      handInfluence += influenceL;
      handGlow += influenceL * uLeftHandSpeed;
    }

    if (uRightHandActive > 0.5) {
      float dR = distance(particlePos, uRightHandPos);
      float influenceR = smoothstep(0.8, 0.05, dR);
      vec3 dirR = normalize(particlePos - uRightHandPos + vec3(0.001));
      particlePos += dirR * influenceR * uRightHandSpeed * 0.3;
      handInfluence += influenceR;
      handGlow += influenceR * uRightHandSpeed;
    }

    // Movement response — faster movement = wider dispersion
    float dispersion = 1.0 + uMovementIntensity * 0.5;
    particlePos = uHeadPos + (particlePos - uHeadPos) * dispersion;

    // Gentle turbulence
    float turbulence = hash(seed * 100.0 + t * 0.3) * 0.02;
    particlePos += vec3(
      sin(t * 0.5 + seed * 10.0) * turbulence,
      cos(t * 0.3 + seed * 7.0) * turbulence,
      sin(t * 0.4 + seed * 13.0) * turbulence
    );

    vec4 mvPosition = modelViewMatrix * vec4(particlePos, 1.0);

    // Distance-based alpha — particles fade at edges
    float distFromCenter = length(offset + orbit);
    float coreAlpha = smoothstep(0.7, 0.0, distFromCenter);
    float edgeAlpha = smoothstep(1.2, 0.5, distFromCenter) * 0.3;
    vAlpha = mix(edgeAlpha, coreAlpha, 0.6);

    // Breathing alpha modulation
    vAlpha *= 0.5 + 0.5 * sin(t * 0.8 + seed * 6.28);
    vAlpha = max(vAlpha, 0.05);

    // Hand proximity boost
    vAlpha += handInfluence * 0.4;
    vAlpha = min(vAlpha, 1.0);

    // Glow from hand movement
    vGlow = clamp(handGlow, 0.0, 1.0);

    // Color: base cool blue-white, warm shift near active hands
    vec3 baseColor = vec3(0.55, 0.7, 1.0); // cool blue-white
    vec3 warmColor = vec3(1.0, 0.85, 0.6);  // warm gold
    vec3 hotColor = vec3(1.0, 0.5, 0.3);    // hot orange for fast movement
    vColor = mix(baseColor, warmColor, handInfluence * 0.5);
    vColor = mix(vColor, hotColor, vGlow * 0.3);

    // Size: base + breath + hand glow
    float size = particleSize * (0.8 + uBreath * 0.2) * (1.0 + handGlow * 2.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying float vGlow;
  varying vec3 vColor;

  void main() {
    // Soft circular particle with glow falloff
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft radial falloff
    float softEdge = 1.0 - smoothstep(0.0, 0.5, dist);
    float coreGlow = exp(-dist * dist * 8.0);

    // Combine core brightness with soft halo
    float intensity = mix(softEdge * 0.5, coreGlow, 0.6 + vGlow * 0.4);

    vec3 color = vColor * intensity;

    // Add white-hot core for high-glow particles
    color += vec3(1.0) * coreGlow * vGlow * 0.5;

    float alpha = vAlpha * intensity;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class EnergyField {
  readonly group: THREE.Group;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private particleCount: number;

  // External inputs updated each frame
  private headPos = new THREE.Vector3(0, 1.6, 0);
  private leftHandPos = new THREE.Vector3();
  private rightHandPos = new THREE.Vector3();
  private leftHandActive = false;
  private rightHandActive = false;
  private leftHandSpeed = 0;
  private rightHandSpeed = 0;
  private movementIntensity = 0;

  constructor(particleCount = 3000) {
    this.group = new THREE.Group();
    this.particleCount = particleCount;

    const offsets = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount);
    const orbitSpeeds = new Float32Array(particleCount);
    const orbitRadii = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Gaussian-distributed offsets — dense core, sparse edges
      const r = gaussianRandom() * 0.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      offsets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      offsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) - 0.2; // slightly below head
      offsets[i * 3 + 2] = r * Math.cos(phi);

      seeds[i] = Math.random();
      orbitSpeeds[i] = 0.3 + Math.random() * 0.8;
      orbitRadii[i] = 0.02 + Math.random() * 0.08;
      sizes[i] = 0.01 + Math.random() * 0.04;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
    this.geometry.setAttribute("offset", new THREE.BufferAttribute(offsets, 3));
    this.geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
    this.geometry.setAttribute("orbitSpeed", new THREE.BufferAttribute(orbitSpeeds, 1));
    this.geometry.setAttribute("orbitRadius", new THREE.BufferAttribute(orbitRadii, 1));
    this.geometry.setAttribute("particleSize", new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uMovementIntensity: { value: 0 },
        uHeadPos: { value: new THREE.Vector3(0, 1.6, 0) },
        uLeftHandPos: { value: new THREE.Vector3() },
        uRightHandPos: { value: new THREE.Vector3() },
        uLeftHandActive: { value: 0 },
        uRightHandActive: { value: 0 },
        uLeftHandSpeed: { value: 0 },
        uRightHandSpeed: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false; // always render — it's centered on user
    this.group.add(this.points);
  }

  /** Update tracking inputs — call before update() */
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

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
