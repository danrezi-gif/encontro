// Merge effect vertex shader
// Particles crossing ownership boundaries during merge

uniform float uTime;
uniform float uMergeDepth; // 0-1 merge intensity

attribute float aOwner; // 0 or 1 — which presence owns this particle

varying float vOwner;
varying float vAlpha;

void main() {
  vOwner = aOwner;

  // During merge, particles cross the ownership boundary
  // based on merge depth
  vec3 pos = position;

  vAlpha = 1.0;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 3.0;
}
