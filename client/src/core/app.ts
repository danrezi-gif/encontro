import * as THREE from "three";
import { createScene } from "./scene";
import { createRenderer } from "./renderer";
import { InputManager } from "./input";
import { NetworkManager } from "../network/NetworkManager";
import { CosmicSky } from "../environment/CosmicSky";
import { DarkMeadow } from "../environment/DarkMeadow";
import type { SignalArtifact } from "@shared/SignalArtifact";

/**
 * Main application — bootstraps the Three.js scene, renderer, WebXR,
 * and the animation loop.
 *
 * Starts immediately when the user clicks "begin" on the landing page.
 * During signal creation, the camera auto-orbits while the user
 * interacts with glass overlay panels. Once the signal is cast,
 * the user gets full first-person control.
 */
export class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private input: InputManager;
  private network: NetworkManager;
  private cosmicSky: CosmicSky;
  private darkMeadow: DarkMeadow;
  private isRunning = false;
  private autoOrbit = false;
  private artifact: SignalArtifact | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    const { scene, camera } = createScene();
    this.scene = scene;
    this.camera = camera;
    this.clock = new THREE.Clock();
    this.input = new InputManager(this.renderer, this.camera);
    this.network = new NetworkManager();

    // Add environment
    this.cosmicSky = new CosmicSky(800);
    this.scene.add(this.cosmicSky.group);

    this.darkMeadow = new DarkMeadow();
    this.scene.add(this.darkMeadow.group);

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  setAutoOrbit(enabled: boolean): void {
    this.autoOrbit = enabled;
    this.input.setEnabled(!enabled);
  }

  setArtifact(artifact: SignalArtifact): void {
    this.artifact = artifact;
    console.log("[App] Artifact received:", artifact);
  }

  async start(): Promise<void> {
    this.isRunning = true;

    this.renderer.setAnimationLoop((time, frame) => {
      this.update(time, frame);
    });
  }

  private update(_time: number, _frame?: XRFrame): void {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Auto-orbit camera during signal creation
    if (this.autoOrbit) {
      const orbitRadius = 3;
      const orbitSpeed = 0.06;
      this.camera.position.x = Math.sin(elapsed * orbitSpeed) * orbitRadius;
      this.camera.position.z = Math.cos(elapsed * orbitSpeed) * orbitRadius;
      this.camera.position.y = 1.6 + Math.sin(elapsed * 0.15) * 0.3;
      this.camera.lookAt(0, 1.2, 0);
    }

    // Update subsystems
    this.input.update(delta, elapsed);
    this.cosmicSky.update(delta, elapsed);
    this.darkMeadow.update(delta, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.isRunning = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.handleResize);
    this.network.disconnect();
    this.cosmicSky.dispose();
    this.darkMeadow.dispose();
    this.renderer.dispose();
  }
}
