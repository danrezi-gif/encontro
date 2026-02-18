import * as THREE from "three";
import { createScene } from "./scene";
import { createRenderer } from "./renderer";
import { InputManager } from "./input";
import { NetworkManager } from "../network/NetworkManager";
import type { SignalArtifact } from "@shared/SignalArtifact";

/**
 * Main application — bootstraps the Three.js scene, renderer, WebXR,
 * and the animation loop. This is the entry point for the experience.
 *
 * Receives a SignalArtifact from the Signal Layer (Phase 0) to seed
 * presence aesthetics — color, sound signature, mark texture.
 */
export class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private input: InputManager;
  private network: NetworkManager;
  private isRunning = false;
  private artifact: SignalArtifact | null;

  constructor(private canvas: HTMLCanvasElement, artifact?: SignalArtifact) {
    this.artifact = artifact ?? null;
    this.renderer = createRenderer(canvas);
    const { scene, camera } = createScene();
    this.scene = scene;
    this.camera = camera;
    this.clock = new THREE.Clock();
    this.input = new InputManager(this.renderer, this.camera);
    this.network = new NetworkManager();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  async start(): Promise<void> {
    this.isRunning = true;

    // Set up the XR animation loop (works for both XR and non-XR)
    this.renderer.setAnimationLoop((time, frame) => {
      this.update(time, frame);
    });
  }

  private update(_time: number, _frame?: XRFrame): void {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update subsystems
    this.input.update(delta, elapsed);

    // Render
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
    this.renderer.dispose();
  }
}
