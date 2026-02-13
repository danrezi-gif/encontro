// Cosmic sky dome fragment shader

uniform float uTime;
uniform float uDensity;

varying vec3 vDirection;

void main() {
  // Subtle star-like points
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  float brightness = smoothstep(0.5, 0.0, dist);
  brightness *= uDensity;

  // Warm/cool color variation
  float warmth = sin(vDirection.x * 3.0 + uTime * 0.1) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.5, 0.6, 1.0), vec3(1.0, 0.8, 0.6), warmth);

  gl_FragColor = vec4(col * brightness, brightness);
}
