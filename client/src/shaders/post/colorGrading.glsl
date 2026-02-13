// Color grading post-processing
// Subtle warm/cool shifts for ceremony atmosphere

uniform sampler2D tDiffuse;
uniform float uWarmth;
uniform float uExposure;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // Exposure
  color.rgb *= uExposure;

  // Warmth shift
  color.r *= 1.0 + uWarmth * 0.1;
  color.b *= 1.0 - uWarmth * 0.05;

  // Subtle vignette
  vec2 center = vUv - 0.5;
  float vignette = 1.0 - dot(center, center) * 0.5;
  color.rgb *= vignette;

  gl_FragColor = color;
}
