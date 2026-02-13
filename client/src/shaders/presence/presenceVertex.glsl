// Presence particle vertex shader
// Particles orbit center point with Gaussian distribution
// Sinusoidal breathing rhythm, velocity-responsive dispersion

uniform float uTime;
uniform float uBreathRate;
uniform float uMovementRhythm;
uniform float uMergeField;
uniform vec3 uMergeTarget;

attribute float aRadius;
attribute float aPhase;
attribute float aSpeed;

varying float vAlpha;
varying float vDistFromCenter;

void main() {
  // Orbital motion
  float angle = aPhase + uTime * aSpeed;

  // Breathing: sinusoidal scale oscillation
  float breath = 1.0 + 0.1 * sin(uTime * uBreathRate * 6.28318);

  // Movement dispersion: faster movement = more spread
  float dispersion = 1.0 + uMovementRhythm * 0.5;

  float r = aRadius * breath * dispersion;

  vec3 offset = vec3(
    r * cos(angle) * sin(aPhase * 3.14),
    r * sin(angle) * cos(aPhase * 2.0),
    r * cos(angle + aPhase)
  );

  // Merge field: particles drift toward merge target
  if (uMergeField > 0.0) {
    vec3 toTarget = uMergeTarget - position;
    offset += toTarget * uMergeField * 0.3;
  }

  vec3 worldPos = position + offset;

  // Alpha falls off with distance from center (soft edges)
  vDistFromCenter = length(offset);
  vAlpha = exp(-vDistFromCenter * vDistFromCenter * 4.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  gl_PointSize = 3.0 * (1.0 - vDistFromCenter * 0.5);
}
