// Presence particle fragment shader
// HSL-based color with soft glow, additive blending

uniform vec3 uColor;
uniform float uBrightness;
uniform float uTime;

varying float vAlpha;
varying float vDistFromCenter;

void main() {
  // Circular point shape with soft edges
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  float softEdge = smoothstep(0.5, 0.2, dist);

  // Color with time-based subtle hue drift
  vec3 col = uColor * uBrightness;

  // Glow intensity from center distance
  float glow = vAlpha * softEdge;

  gl_FragColor = vec4(col, glow);
}
