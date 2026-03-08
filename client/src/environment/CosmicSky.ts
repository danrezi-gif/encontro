import * as THREE from "three";

/**
 * Realistic night sky dome — thousands of stars with proper astronomical feel.
 *
 * Each star has:
 * - Soft circular glow (gaussian falloff, not square)
 * - Brightness following a magnitude power-law distribution
 * - Color temperature (blue-white hot stars, warm orange-red cool stars)
 * - Subtle individual twinkling (scintillation)
 * - A faint milky way band of dense dim stars along one axis
 *
 * Rendered as GL_POINTS with a custom ShaderMaterial.
 * Stars are static on the dome — only a very slow rotation gives parallax.
 */

const SKY_VERTEX = /* glsl */ `
  attribute float brightness;
  attribute float temperature;
  attribute float twinklePhase;
  attribute float twinkleSpeed;
  attribute float starSize;

  uniform float uTime;
  uniform float uSoulHeight;

  varying float vBrightness;
  varying float vTemperature;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Scintillation — subtle brightness flicker
    float twinkle = 0.85 + 0.15 * sin(uTime * twinkleSpeed + twinklePhase);
    // Occasional sharper flicker for bright stars
    twinkle *= 0.95 + 0.05 * sin(uTime * twinkleSpeed * 3.7 + twinklePhase * 2.1);

    // Stars brighten as soul rises — atmosphere thins
    float heightBoost = 1.0 + smoothstep(5.0, 50.0, uSoulHeight) * 0.6;

    vBrightness = brightness * twinkle * heightBoost;
    vTemperature = temperature;
    vTwinkle = twinkle;

    // Brighter stars appear larger
    float size = starSize * (0.6 + brightness * 2.4);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    // Minimum visible size
    gl_PointSize = max(gl_PointSize, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  varying float vBrightness;
  varying float vTemperature;
  varying float vTwinkle;

  // Star color from temperature (0 = cool red/orange, 1 = hot blue-white)
  vec3 starColor(float temp) {
    // Cool stars: warm orange-red
    vec3 cool = vec3(1.0, 0.6, 0.3);
    // Mid stars: white-yellow
    vec3 mid = vec3(1.0, 0.95, 0.85);
    // Hot stars: blue-white
    vec3 hot = vec3(0.7, 0.8, 1.0);

    vec3 color = mix(cool, mid, smoothstep(0.0, 0.5, temp));
    color = mix(color, hot, smoothstep(0.5, 1.0, temp));
    return color;
  }

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Soft gaussian core — realistic star point-spread function
    float core = exp(-dist * dist * 32.0);
    // Broader halo for bright stars
    float halo = exp(-dist * dist * 8.0) * 0.3;
    // Very faint diffraction spikes (cross pattern)
    float spike = 0.0;
    float ax = abs(center.x);
    float ay = abs(center.y);
    spike += exp(-ay * 60.0) * exp(-ax * 8.0) * 0.15;
    spike += exp(-ax * 60.0) * exp(-ay * 8.0) * 0.15;
    spike *= vBrightness; // only visible on bright stars

    float intensity = core + halo * vBrightness + spike;

    vec3 color = starColor(vTemperature);
    // White-hot core for all stars
    vec3 coreColor = mix(color, vec3(1.0), core * 0.6);

    float alpha = intensity * vBrightness;
    // Dim stars still visible
    alpha = max(alpha, core * 0.08);

    gl_FragColor = vec4(coreColor * intensity, alpha);
  }
`;

export class CosmicSky {
  readonly group: THREE.Group;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;

  constructor(starCount = 2500) {
    this.group = new THREE.Group();

    const positions = new Float32Array(starCount * 3);
    const brightness = new Float32Array(starCount);
    const temperature = new Float32Array(starCount);
    const twinklePhase = new Float32Array(starCount);
    const twinkleSpeed = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);

    // Milky way band axis — tilted across the sky
    const milkyWayAxis = new THREE.Vector3(0.3, 0.8, 0.5).normalize();

    for (let i = 0; i < starCount; i++) {
      const radius = 150 + Math.random() * 50;

      // Distribute on sphere
      let theta = Math.random() * Math.PI * 2;
      let phi = Math.acos(2 * Math.random() - 1);

      // 30% of stars cluster near milky way band
      const isMilkyWay = Math.random() < 0.3;
      if (isMilkyWay) {
        // Generate point near the milky way great circle
        const randomAxis = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize();
        const bandPoint = new THREE.Vector3().crossVectors(milkyWayAxis, randomAxis).normalize();
        // Scatter slightly off the band (gaussian spread ~15 degrees)
        const scatter = gaussianRand() * 0.26; // radians
        bandPoint.applyAxisAngle(milkyWayAxis, Math.random() * Math.PI * 2);
        const perpAxis = new THREE.Vector3().crossVectors(bandPoint, milkyWayAxis).normalize();
        bandPoint.applyAxisAngle(perpAxis, scatter);
        bandPoint.normalize().multiplyScalar(radius);

        // Mirror below-ground stars to upper hemisphere
        if (bandPoint.y < 0) bandPoint.y = -bandPoint.y;

        positions[i * 3] = bandPoint.x;
        positions[i * 3 + 1] = bandPoint.y;
        positions[i * 3 + 2] = bandPoint.z;
      } else {
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        positions[i * 3] = x;
        positions[i * 3 + 1] = Math.abs(y); // upper hemisphere only
        positions[i * 3 + 2] = z;
      }

      // Brightness follows power law — many dim stars, few bright ones
      const u = Math.random();
      brightness[i] = isMilkyWay
        ? Math.pow(u, 4.0) * 0.4 // milky way stars are mostly dim
        : Math.pow(u, 2.5); // general field

      // Temperature: most stars mid-range, with tails to hot and cool
      temperature[i] = 0.3 + gaussianRand() * 0.25;
      temperature[i] = Math.max(0.0, Math.min(1.0, temperature[i]));

      // Brighter stars skew hotter
      if (brightness[i] > 0.6) {
        temperature[i] = Math.min(1.0, temperature[i] + 0.3);
      }

      twinklePhase[i] = Math.random() * Math.PI * 2;
      twinkleSpeed[i] = 1.5 + Math.random() * 3.0;

      // Size varies — mostly small, a few prominent
      starSize[i] = isMilkyWay
        ? 0.5 + Math.random() * 0.5
        : 0.8 + Math.random() * 1.8;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("brightness", new THREE.BufferAttribute(brightness, 1));
    this.geometry.setAttribute("temperature", new THREE.BufferAttribute(temperature, 1));
    this.geometry.setAttribute("twinklePhase", new THREE.BufferAttribute(twinklePhase, 1));
    this.geometry.setAttribute("twinkleSpeed", new THREE.BufferAttribute(twinkleSpeed, 1));
    this.geometry.setAttribute("starSize", new THREE.BufferAttribute(starSize, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSoulHeight: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  private soulHeight = 0;

  update(_delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uSoulHeight.value = this.soulHeight;

    // Very slow celestial rotation — barely perceptible
    this.group.rotation.y = elapsed * 0.003;
  }

  /** Set soul altitude for height-based atmosphere effects. */
  setHeight(h: number): void {
    this.soulHeight = h;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function gaussianRand(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
