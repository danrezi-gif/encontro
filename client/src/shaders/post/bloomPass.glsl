// Bloom post-processing pass
// Extracts bright areas and applies Gaussian blur

uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uIntensity;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // Extract bright areas
  float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 bloom = color.rgb * smoothstep(uThreshold, uThreshold + 0.1, brightness);

  gl_FragColor = vec4(color.rgb + bloom * uIntensity, color.a);
}
