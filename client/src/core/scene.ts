import * as THREE from "three";

/**
 * Creates the base Three.js scene for the dark meadow.
 * Minimal ambient light — most illumination comes from presences.
 */
export function createScene(): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Very faint ambient — the space is mostly dark
  const ambient = new THREE.AmbientLight(0x111122, 0.05);
  scene.add(ambient);

  // Camera defaults to standing height (1.6m) — WebXR will override
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.6, 0);

  return { scene, camera };
}
