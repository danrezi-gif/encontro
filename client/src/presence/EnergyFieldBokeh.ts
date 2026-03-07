import * as THREE from "three";

/**
 * EnergyFieldBokeh — flowing field of overlapping luminous bokeh orbs.
 *
 * Inspired by Shadertoy "bokeh-gradient" — multiple soft circles drifting
 * at different speeds, overlapping to create a continuous prismatic field.
 * Each orb has its own color (primary/secondary/accent), soft edges, and
 * bloom simulation. The result is a warm, living, iridescent presence.
 *
 * Rendered on a sphere mesh (viewed from inside), full-screen fragment shader.
 * Orbs move in response to time, hands warp their positions, and
 * movement intensity affects bloom and speed.
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

  // Colors — iridescent palette
  const vec3 primaryColor = vec3(0.2, 0.2, 0.9);   // deep blue
  const vec3 secondaryColor = vec3(0.8, 0.4, 0.9);  // violet
  const vec3 accentColor = vec3(0.4, 0.9, 0.6);     // cyan-green
  const vec3 warmColor = vec3(1.0, 0.6, 0.2);       // warm amber
  const vec3 hotColor = vec3(1.0, 0.3, 0.4);        // hot rose

  const float softness = 0.2;

  // Compute a single flowing orb
  float circle(vec2 uv, vec2 pos, float radius) {
    float dist = distance(uv, pos);
    return 1.0 - smoothstep(radius - softness, radius + softness, dist);
  }

  void main() {
    // Map fragment to local UV based on view direction
    vec3 viewDir = normalize(vWorldPos - cameraPosition);
    vec3 localDir = normalize(vWorldPos - uHeadPos);

    // Spherical UV mapping from the user's perspective
    float phi = atan(localDir.z, localDir.x); // -PI to PI
    float theta = acos(clamp(localDir.y, -1.0, 1.0)); // 0 to PI
    vec2 uv = vec2(phi / 6.2831 + 0.5, theta / 3.14159);

    float time = uTime * 0.6;

    // Hand speed influence
    float handEnergy = 0.0;
    vec2 handWarpL = vec2(0.0);
    vec2 handWarpR = vec2(0.0);

    if (uLeftHandActive > 0.5) {
      vec3 handLocalL = normalize(uLeftHandPos - uHeadPos);
      vec2 handUvL = vec2(
        atan(handLocalL.z, handLocalL.x) / 6.2831 + 0.5,
        acos(clamp(handLocalL.y, -1.0, 1.0)) / 3.14159
      );
      float dL = distance(uv, handUvL);
      float infL = smoothstep(0.4, 0.0, dL);
      handWarpL = normalize(uv - handUvL + vec2(0.001)) * infL * uLeftHandSpeed * 0.15;
      handEnergy += infL * uLeftHandSpeed;
    }

    if (uRightHandActive > 0.5) {
      vec3 handLocalR = normalize(uRightHandPos - uHeadPos);
      vec2 handUvR = vec2(
        atan(handLocalR.z, handLocalR.x) / 6.2831 + 0.5,
        acos(clamp(handLocalR.y, -1.0, 1.0)) / 3.14159
      );
      float dR = distance(uv, handUvR);
      float infR = smoothstep(0.4, 0.0, dR);
      handWarpR = normalize(uv - handUvR + vec2(0.001)) * infR * uRightHandSpeed * 0.15;
      handEnergy += infR * uRightHandSpeed;
    }

    handEnergy = min(handEnergy, 1.5);
    vec2 warpedUv = uv + handWarpL + handWarpR;

    // Breath modulation
    float moveSpeed = 0.6 + uMovementIntensity * 0.4;
    float t = time * moveSpeed;

    // Effect strength — controls overall visibility
    float effectStrength = 0.7 + uBreath * 0.3;
    float sizeVariation = 0.5;

    // --- 8 flowing orbs at different positions and speeds ---
    float baseSize = 0.3 * (1.0 + uBreath * 0.15);

    // Orb 1
    vec2 pos1 = vec2(0.3, 0.4) + vec2(sin(t) * 0.08, cos(t * 1.3) * 0.06) * effectStrength;
    float r1 = baseSize * (1.2 + sin(t * 2.1) * sizeVariation) * effectStrength;
    float c1 = circle(warpedUv, pos1, r1);

    // Orb 2
    vec2 pos2 = vec2(0.7, 0.6) + vec2(cos(t + 1.0) * 0.07, sin(t * 1.5) * 0.09) * effectStrength;
    float r2 = baseSize * (0.9 + cos(t * 1.8 + 1.5) * sizeVariation) * effectStrength;
    float c2 = circle(warpedUv, pos2, r2);

    // Orb 3
    vec2 pos3 = vec2(0.5, 0.3) + vec2(sin(t * 1.3 + 3.0) * 0.06, cos(t + 4.0) * 0.08) * effectStrength;
    float r3 = baseSize * (1.1 + sin(t * 2.5 + 2.0) * sizeVariation) * effectStrength;
    float c3 = circle(warpedUv, pos3, r3);

    // Orb 4
    vec2 pos4 = vec2(0.2, 0.7) + vec2(cos(t * 0.9 + 5.0) * 0.09, sin(t * 1.0) * 0.05) * effectStrength;
    float r4 = baseSize * (1.0 + cos(t * 1.9 + 3.5) * sizeVariation) * effectStrength;
    float c4 = circle(warpedUv, pos4, r4);

    // Orb 5
    vec2 pos5 = vec2(0.8, 0.2) + vec2(sin(t * 1.4 + 2.5) * 0.07, cos(t * 0.7 + 3.5) * 0.06) * effectStrength;
    float r5 = baseSize * (0.8 + sin(t * 2.2 + 4.0) * sizeVariation) * effectStrength;
    float c5 = circle(warpedUv, pos5, r5);

    // Orb 6
    vec2 pos6 = vec2(0.6, 0.8) + vec2(cos(t * 1.6 + 4.5) * 0.08, sin(t * 0.6 + 2.5) * 0.07) * effectStrength;
    float r6 = baseSize * (1.3 + cos(t * 1.7 + 5.0) * sizeVariation) * effectStrength;
    float c6 = circle(warpedUv, pos6, r6);

    // Orb 7
    vec2 pos7 = vec2(0.4, 0.6) + vec2(sin(t * 0.8 + 6.0) * 0.05, cos(t * 1.5 + 1.0) * 0.09) * effectStrength;
    float r7 = baseSize * (1.1 + sin(t * 2.8 + 1.0) * sizeVariation) * effectStrength;
    float c7 = circle(warpedUv, pos7, r7);

    // Orb 8
    vec2 pos8 = vec2(0.1, 0.5) + vec2(cos(t * 1.2 + 3.5) * 0.06, sin(t * 0.9 + 4.5) * 0.08) * effectStrength;
    float r8 = baseSize * (0.9 + cos(t * 2.0 + 2.5) * sizeVariation) * effectStrength;
    float c8 = circle(warpedUv, pos8, r8);

    // Color each orb — cycling through the palette
    float circleOpacity = 0.4 + handEnergy * 0.2;
    vec3 overlay1 = primaryColor * c1 * circleOpacity;
    vec3 overlay2 = secondaryColor * c2 * circleOpacity * 0.9;
    vec3 overlay3 = accentColor * c3 * circleOpacity * 0.8;
    vec3 overlay4 = primaryColor * c4 * circleOpacity * 0.7;
    vec3 overlay5 = secondaryColor * c5 * circleOpacity * 0.8;
    vec3 overlay6 = accentColor * c6 * circleOpacity * 0.6;
    vec3 overlay7 = primaryColor * c7 * circleOpacity * 0.7;
    vec3 overlay8 = secondaryColor * c8 * circleOpacity * 0.5;

    vec3 totalOverlay = overlay1 + overlay2 + overlay3 + overlay4
                      + overlay5 + overlay6 + overlay7 + overlay8;

    // Bloom simulation — bright orbs bleed light
    float bloomIntensity = 2.1 + handEnergy * 1.5;
    vec3 bloomColor = vec3(0.0);
    float bloom1 = c1 * 0.5;
    bloomColor += primaryColor * bloom1 * (1.0 - smoothstep(0.0, r1 * 1.5, distance(warpedUv, pos1)));
    float bloom3 = c3 * 0.4;
    bloomColor += accentColor * bloom3 * (1.0 - smoothstep(0.0, r3 * 1.5, distance(warpedUv, pos3)));
    float bloom5 = c5 * 0.3;
    bloomColor += secondaryColor * bloom5 * (1.0 - smoothstep(0.0, r5 * 1.5, distance(warpedUv, pos5)));
    bloomColor *= bloomIntensity * 0.3;

    // Hand warmth — add warm color near active hands
    vec3 handColor = mix(warmColor, hotColor, min(handEnergy, 1.0));
    totalOverlay += handColor * handEnergy * 0.25;

    // Combine
    float totalAlpha = (c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8) * 0.15;
    totalAlpha = clamp(totalAlpha, 0.0, 1.0);

    vec3 finalColor = totalOverlay + bloomColor;

    // Saturation boost
    float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
    finalColor = mix(vec3(luminance), finalColor, 1.2);

    // Vignette — fade at edges of the sphere
    float vignette = 1.0 - pow(distance(uv, vec2(0.5)), 0.9) * 1.2;
    vignette = clamp(vignette, 0.3, 1.0);
    totalAlpha *= vignette;

    // Overall alpha from breath
    totalAlpha *= effectStrength * 0.6;

    if (totalAlpha < 0.005) discard;

    gl_FragColor = vec4(finalColor, totalAlpha);
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

    // Sphere viewed from inside — the flowing bokeh is projected onto its surface
    this.geometry = new THREE.SphereGeometry(1.0, 32, 24);

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
