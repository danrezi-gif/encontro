import * as THREE from "three";

/**
 * DarkMeadow — bioluminescent ground plane.
 *
 * A near-black ground that glows with soft luminous pools directly
 * beneath the user's body of light. The cascading light "lands" on
 * the ground and collects into organic, slowly pulsing pools.
 * Ripples emanate outward. Fades to deep darkness at distance.
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
  uniform vec3 uUserPos; // head position in world space

  varying vec3 vWorldPos;

  // ── Noise ────────────────────────────────────────────────────
  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise2d(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i),                  hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y);
  }

  float fbm2(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2d(p);
      p = p * 2.0 + vec2(50.0, 30.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 gp = vWorldPos.xz; // ground position
    vec2 up = uUserPos.xz;  // user XZ projection

    float dist = distance(gp, up);
    float heightAbove = uUserPos.y - vWorldPos.y; // how high user is above ground

    // Scale pool radius with height (higher = wider, dimmer pools)
    float poolScale = 1.0 + heightAbove * 0.3;
    float scaledDist = dist / poolScale;

    // ── Main bioluminescent pool ───────────────────────────────
    // Organic noise-modulated shape
    float n = fbm2(gp * 0.8 + vec2(uTime * 0.05, uTime * 0.03));
    float poolShape = smoothstep(2.5 + n * 0.8, 0.2, scaledDist);

    // Inner bright core
    float innerGlow = smoothstep(1.2 + n * 0.4, 0.0, scaledDist);
    innerGlow = pow(innerGlow, 1.5);

    // ── Ripples emanating outward ──────────────────────────────
    float ripple = sin(dist * 6.0 - uTime * 1.2 + n * 3.0) * 0.5 + 0.5;
    ripple *= smoothstep(4.0, 0.5, scaledDist); // only near the pool
    ripple *= 0.3;

    // ── Organic vein patterns on the ground ────────────────────
    float veins = fbm2(gp * 2.5 + vec2(uTime * 0.02));
    float veinPattern = 1.0 - abs(veins - 0.5) * 2.0;
    veinPattern = pow(max(veinPattern, 0.0), 4.0);
    veinPattern *= smoothstep(3.5, 0.5, scaledDist) * 0.2;

    // ── Brightness (dimmer when user is higher) ────────────────
    float heightDim = 1.0 / (1.0 + heightAbove * 0.15);

    // ── Combine ────────────────────────────────────────────────
    float intensity = (poolShape * 0.4 + innerGlow * 0.6 + ripple + veinPattern) * heightDim;

    // Color: blue-white matching the cascading body light
    vec3 poolDeep = vec3(0.08, 0.12, 0.35);
    vec3 poolBright = vec3(0.3, 0.4, 0.75);
    vec3 poolCore = vec3(0.5, 0.6, 0.9);

    vec3 poolColor = mix(poolDeep, poolBright, innerGlow);
    poolColor = mix(poolColor, poolCore, innerGlow * innerGlow);

    // Dark ambient ground
    vec3 groundDark = vec3(0.015, 0.015, 0.035);

    // Subtle distant noise texture so the ground isn't perfectly flat black
    float groundNoise = noise2d(gp * 0.3) * 0.01;

    vec3 finalColor = groundDark + groundNoise + poolColor * intensity;

    // Alpha: mostly opaque ground, with pool glow on top
    gl_FragColor = vec4(finalColor, 0.95);
  }
`;

export class DarkMeadow {
  readonly group: THREE.Group;
  private material: THREE.ShaderMaterial;
  private userPos = new THREE.Vector3(0, 1.6, 0);

  constructor() {
    this.group = new THREE.Group();

    const geometry = new THREE.PlaneGeometry(200, 200, 1, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uUserPos: { value: new THREE.Vector3(0, 1.6, 0) },
      },
    });

    const plane = new THREE.Mesh(geometry, this.material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    this.group.add(plane);
  }

  /** Pass the user's head position (world space) for pool projection. */
  setTracking(headPos: THREE.Vector3): void {
    this.userPos.copy(headPos);
  }

  update(_delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uUserPos.value.copy(this.userPos);
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
