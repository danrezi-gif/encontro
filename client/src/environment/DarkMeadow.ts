import * as THREE from "three";

/**
 * DarkMeadow — bioluminescent ground plane.
 *
 * A near-black ground that glows with soft luminous pools beneath
 * the user's body of light. The pool shifts in the direction the
 * user's hands gesture — forward, sideways, wherever the aura leads.
 * When hands point upward the pool dims (light directed away from ground).
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
  uniform vec3 uUserPos;     // head position in world space
  uniform vec3 uGestureDir;  // hand gesture direction (from head to avg hand)

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
    vec2 gp = vWorldPos.xz;
    vec2 up = uUserPos.xz;
    float heightAbove = uUserPos.y - vWorldPos.y;

    // ── Gesture-driven pool shift ──────────────────────────────
    // XZ component shifts the pool center toward where hands point
    vec2 gestureXZ = uGestureDir.xz;
    float gestureLen = length(gestureXZ);

    // Pool center shifts up to ~2m in gesture direction
    vec2 poolCenter = up + gestureXZ * 3.0;

    // Gesture Y: hands pointing up → dim pool (light goes up, not down)
    // hands pointing down → brighten pool
    float gestureDim = 1.0 - clamp(uGestureDir.y * 1.5, -0.3, 0.7);

    // Distance from pool center
    float dist = distance(gp, poolCenter);

    // Also compute distance from user (for base proximity glow)
    float userDist = distance(gp, up);

    // Scale pool with height — moderate widening, not too aggressive
    float poolScale = 1.0 + heightAbove * 0.25;
    float scaledDist = dist / poolScale;
    float scaledUserDist = userDist / poolScale;

    // ── Main bioluminescent pool ───────────────────────────────
    float n = fbm2(gp * 0.8 + vec2(uTime * 0.05, uTime * 0.03));
    float poolShape = smoothstep(2.5 + n * 0.8, 0.2, scaledDist);

    // Inner core
    float innerGlow = smoothstep(1.2 + n * 0.4, 0.0, scaledDist);
    innerGlow = pow(innerGlow, 1.5);

    // Ambient base glow under user (always present, doesn't shift as much)
    float baseGlow = smoothstep(3.0, 0.5, scaledUserDist) * 0.3;

    // Stretch pool along gesture direction
    if (gestureLen > 0.01) {
      vec2 gestureNorm = gestureXZ / gestureLen;
      vec2 toFrag = gp - up;
      float along = dot(toFrag, gestureNorm);
      float perp = length(toFrag - gestureNorm * along);

      // Elongate: compressed perpendicular, stretched along
      float stretchFactor = 1.0 + gestureLen * 2.0;
      float elongatedDist = length(vec2(perp, along / stretchFactor)) / poolScale;
      float elongatedPool = smoothstep(2.0 + n * 0.5, 0.1, elongatedDist);
      poolShape = max(poolShape, elongatedPool * 0.7);
    }

    // ── Ripples ────────────────────────────────────────────────
    float ripple = sin(dist * 6.0 - uTime * 1.2 + n * 3.0) * 0.5 + 0.5;
    ripple *= smoothstep(4.0, 0.5, scaledDist) * 0.3;

    // ── Organic vein patterns ──────────────────────────────────
    float veins = fbm2(gp * 2.5 + vec2(uTime * 0.02));
    float veinPattern = 1.0 - abs(veins - 0.5) * 2.0;
    veinPattern = pow(max(veinPattern, 0.0), 4.0);
    veinPattern *= smoothstep(3.5, 0.5, scaledDist) * 0.2;

    // ── Brightness ─────────────────────────────────────────────
    float heightDim = 1.0 / (1.0 + heightAbove * 0.12);

    // ── Distance fade — hide plane edges, infinite horizon illusion ──
    float edgeFade = smoothstep(90.0, 40.0, length(gp));

    float intensity = (poolShape * 0.4 + innerGlow * 0.6 + baseGlow + ripple + veinPattern)
                    * heightDim * gestureDim * edgeFade;

    // Color
    vec3 poolDeep   = vec3(0.08, 0.12, 0.35);
    vec3 poolBright = vec3(0.3, 0.4, 0.75);
    vec3 poolCore   = vec3(0.5, 0.6, 0.9);

    vec3 poolColor = mix(poolDeep, poolBright, innerGlow);
    poolColor = mix(poolColor, poolCore, innerGlow * innerGlow);

    // Dark ambient ground
    vec3 groundDark = vec3(0.015, 0.015, 0.035);
    float groundNoise = noise2d(gp * 0.3) * 0.01;

    vec3 finalColor = groundDark + groundNoise + poolColor * intensity;

    // Fade alpha at distance so plane dissolves into void
    float alphaFade = smoothstep(95.0, 50.0, length(gp));
    gl_FragColor = vec4(finalColor, 0.95 * alphaFade);
  }
`;

export class DarkMeadow {
  readonly group: THREE.Group;
  private material: THREE.ShaderMaterial;
  private userPos = new THREE.Vector3(0, 1.6, 0);
  private gestureDir = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();

    const geometry = new THREE.PlaneGeometry(200, 200, 1, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uUserPos: { value: new THREE.Vector3(0, 1.6, 0) },
        uGestureDir: { value: new THREE.Vector3() },
      },
      transparent: true,
    });

    const plane = new THREE.Mesh(geometry, this.material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    this.group.add(plane);
  }

  /** Pass user head position and hand gesture direction (world space). */
  setTracking(headPos: THREE.Vector3, gestureDir: THREE.Vector3): void {
    this.userPos.copy(headPos);
    this.gestureDir.copy(gestureDir);
  }

  update(_delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uUserPos.value.copy(this.userPos);
    this.material.uniforms.uGestureDir.value.copy(this.gestureDir);
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
