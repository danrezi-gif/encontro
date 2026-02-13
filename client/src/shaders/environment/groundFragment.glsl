// Dark meadow ground fragment shader
// Bioluminescent patterns responding to presence proximity

uniform float uTime;
uniform float uGroundGlow;
uniform vec3 uPresencePositions[6];
uniform int uPresenceCount;

varying vec2 vUv;
varying vec3 vWorldPos;

// Simple noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Base dark ground
  vec3 col = vec3(0.02, 0.02, 0.05);

  // Bioluminescent noise pattern
  float n = noise(vWorldPos.xz * 0.3 + uTime * 0.05);
  n *= noise(vWorldPos.xz * 0.7 - uTime * 0.03);
  col += vec3(0.0, 0.05, 0.1) * n * uGroundGlow;

  // Proximity glow from presences
  for (int i = 0; i < 6; i++) {
    if (i >= uPresenceCount) break;
    float dist = distance(vWorldPos.xz, uPresencePositions[i].xz);
    float glow = exp(-dist * dist * 0.1) * uGroundGlow;
    col += vec3(0.05, 0.1, 0.15) * glow;
  }

  gl_FragColor = vec4(col, 1.0);
}
