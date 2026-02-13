// Cosmic sky dome vertex shader

varying vec3 vDirection;

void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 2.0;
}
