// Merge effect fragment shader
// Additive blending of two presence color palettes

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uMergeDepth;

varying float vOwner;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  float softEdge = smoothstep(0.5, 0.2, dist);

  // Blend colors based on ownership and merge depth
  vec3 ownColor = mix(uColorA, uColorB, vOwner);
  vec3 mergedColor = mix(uColorA, uColorB, 0.5);
  vec3 col = mix(ownColor, mergedColor, uMergeDepth);

  gl_FragColor = vec4(col, vAlpha * softEdge);
}
