import * as THREE from "three";
import { createScene } from "./scene";
import { createRenderer } from "./renderer";
import { InputManager } from "./input";
import { XRSessionManager } from "../xr/XRSessionManager";
import { EnergyField } from "../presence/EnergyField";
import { EnergyFieldBokeh } from "../presence/EnergyFieldBokeh";
import { LightTrail } from "../presence/LightTrail";
import { CosmicSky } from "../environment/CosmicSky";
import { DarkMeadow } from "../environment/DarkMeadow";
import { Levitation } from "../presence/Levitation";

/**
 * Main application — bootstraps the Three.js scene, WebXR session,
 * energy field presence, and the animation loop.
 *
 * The user's presence is rendered as two layered fields:
 * - EnergyField: raymarched iridescent volume (inner core, prismatic liquid light)
 * - EnergyFieldBokeh: flowing bokeh gradient orbs (outer aura, soft color blobs)
 *
 * Both react to hand tracking and movement. The light trail adds
 * ephemeral traces from arm sweeps.
 */
export class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private input: InputManager;
  private xr: XRSessionManager;
  private energyField: EnergyField;
  private energyFieldBokeh: EnergyFieldBokeh;
  private lightTrail: LightTrail;
  private cosmicSky: CosmicSky;
  private darkMeadow: DarkMeadow;
  private levitation: Levitation;
  private worldRoot: THREE.Group; // environment objects — moved by levitation
  private isRunning = false;
  private vrButton: HTMLElement | null = null;

  // Smoothed hand speed for reactive systems
  private leftHandSpeedSmooth = 0;
  private rightHandSpeedSmooth = 0;
  private movementIntensitySmooth = 0;

  // Desktop camera velocity tracking (for levitation stillness detection)
  private prevCameraPos = new THREE.Vector3(0, 1.6, 0);
  private desktopHeadVelocity = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    const { scene, camera } = createScene();
    this.scene = scene;
    this.camera = camera;
    this.clock = new THREE.Clock();
    this.input = new InputManager(this.renderer, this.camera);

    // XR session manager — handles VR lifecycle and hand tracking
    this.xr = new XRSessionManager(this.renderer);

    // Energy fields — layered for depth
    // Inner: raymarched iridescent volume (prismatic liquid core)
    this.energyField = new EnergyField();
    this.scene.add(this.energyField.group);

    // Outer: flowing bokeh gradient orbs (soft aura)
    this.energyFieldBokeh = new EnergyFieldBokeh();
    this.scene.add(this.energyFieldBokeh.group);

    // Light trail — ephemeral traces from hand movement
    this.lightTrail = new LightTrail(2000);
    this.scene.add(this.lightTrail.group);

    // Environment — parented to worldRoot so levitation can move them
    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    this.cosmicSky = new CosmicSky(2500);
    this.worldRoot.add(this.cosmicSky.group);

    this.darkMeadow = new DarkMeadow();
    this.worldRoot.add(this.darkMeadow.group);

    // Levitation — rises the user by translating the world downward
    this.levitation = new Levitation();

    // Reset levitation when entering/exiting VR
    this.xr.onSessionStart(() => this.levitation.reset());
    this.xr.onSessionEnd(() => this.levitation.reset());

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.handleResize();

    // Create VR entry button
    this.createVRButton();
  }

  async start(): Promise<void> {
    this.isRunning = true;

    this.renderer.setAnimationLoop((time, frame) => {
      this.update(time, frame);
    });
  }

  private update(_time: number, frame?: XRFrame): void {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update XR tracking (extracts hand/head positions from XR frame)
    this.xr.update(frame, delta);

    // Determine head position — XR camera or desktop camera
    const headPos = new THREE.Vector3();
    if (this.xr.isPresenting) {
      headPos.copy(this.xr.head.position);
    } else {
      headPos.copy(this.camera.position);
    }

    // Smooth hand speeds (exponential moving average)
    const leftSpeed = this.xr.leftHand.active ? this.xr.leftHand.velocity.length() : 0;
    const rightSpeed = this.xr.rightHand.active ? this.xr.rightHand.velocity.length() : 0;
    this.leftHandSpeedSmooth = this.leftHandSpeedSmooth * 0.85 + leftSpeed * 0.15;
    this.rightHandSpeedSmooth = this.rightHandSpeedSmooth * 0.85 + rightSpeed * 0.15;

    // Overall movement intensity from head velocity
    const headSpeed = this.xr.isPresenting ? this.xr.head.velocity.length() : 0;
    this.movementIntensitySmooth = this.movementIntensitySmooth * 0.9 + Math.min(headSpeed * 0.5, 1.0) * 0.1;

    // Determine hand positions
    const leftHandPos = new THREE.Vector3();
    const rightHandPos = new THREE.Vector3();
    let leftActive = this.xr.leftHand.active;
    let rightActive = this.xr.rightHand.active;

    if (this.xr.isPresenting) {
      leftHandPos.copy(this.xr.leftHand.position);
      rightHandPos.copy(this.xr.rightHand.position);
    } else {
      // Desktop: simulate hands offset from camera for visual testing
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      leftHandPos.copy(this.camera.position)
        .addScaledVector(right, -0.3)
        .addScaledVector(forward, 0.4);
      leftHandPos.y -= 0.3;

      rightHandPos.copy(this.camera.position)
        .addScaledVector(right, 0.3)
        .addScaledVector(forward, 0.4);
      rightHandPos.y -= 0.3;

      leftActive = true;
      rightActive = true;
      this.leftHandSpeedSmooth = this.movementIntensitySmooth * 2;
      this.rightHandSpeedSmooth = this.movementIntensitySmooth * 2;
    }

    // Tracking data shared by both energy field layers
    const trackingArgs: [
      THREE.Vector3, THREE.Vector3, THREE.Vector3,
      boolean, boolean,
      number, number, number,
    ] = [
      headPos, leftHandPos, rightHandPos,
      leftActive, rightActive,
      this.leftHandSpeedSmooth, this.rightHandSpeedSmooth,
      this.movementIntensitySmooth,
    ];

    // Update both energy field layers
    this.energyField.setTracking(...trackingArgs);
    this.energyField.update(delta, elapsed);

    this.energyFieldBokeh.setTracking(...trackingArgs);
    this.energyFieldBokeh.update(delta, elapsed);

    // Emit light trails from hand movement
    this.lightTrail.emit(
      elapsed, delta,
      leftHandPos, rightHandPos,
      leftActive, rightActive,
      this.leftHandSpeedSmooth, this.rightHandSpeedSmooth,
    );
    this.lightTrail.update(delta, elapsed);

    // ── Levitation ─────────────────────────────────────────────
    // Compute head forward direction (horizontal only)
    const headForward = new THREE.Vector3();
    if (this.xr.isPresenting) {
      // In XR, use the camera's forward from the XR camera
      const xrCam = this.renderer.xr.getCamera();
      xrCam.getWorldDirection(headForward);
    } else {
      this.camera.getWorldDirection(headForward);
    }
    headForward.y = 0;
    headForward.normalize();

    // Compute head velocity for levitation (desktop: derive from camera movement)
    let headVelocity: THREE.Vector3;
    if (this.xr.isPresenting) {
      headVelocity = this.xr.head.velocity;
    } else {
      this.desktopHeadVelocity
        .subVectors(this.camera.position, this.prevCameraPos)
        .divideScalar(Math.max(delta, 0.001));
      this.prevCameraPos.copy(this.camera.position);
      headVelocity = this.desktopHeadVelocity;
    }

    this.levitation.update(
      delta, elapsed,
      headPos,
      headVelocity,
      leftHandPos, rightHandPos,
      leftActive, rightActive,
      this.leftHandSpeedSmooth, this.rightHandSpeedSmooth,
      headForward,
    );

    // Apply levitation offset to the world root (world moves down = user rises)
    this.worldRoot.position.copy(this.levitation.offset);

    // Update subsystems
    this.input.update(delta, elapsed);
    this.cosmicSky.update(delta, elapsed);
    this.darkMeadow.update(delta, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * VR entry button — minimal, glowing, matching encontro aesthetic.
   */
  private createVRButton(): void {
    if (!navigator.xr) {
      console.log("[App] WebXR not available — desktop mode only");
      return;
    }

    navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
      if (!supported) {
        console.log("[App] immersive-vr not supported — desktop mode only");
        return;
      }

      const btn = document.createElement("button");
      btn.textContent = "enter vr";
      btn.style.cssText = `
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        font-family: 'Inter', sans-serif;
        font-size: 0.8rem;
        font-weight: 300;
        letter-spacing: 0.15em;
        color: rgba(255,255,255,0.6);
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px;
        padding: 14px 40px;
        cursor: pointer;
        transition: all 0.6s ease;
      `;

      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "rgba(140,180,255,0.4)";
        btn.style.color = "rgba(255,255,255,0.9)";
        btn.style.boxShadow = "0 0 40px 10px rgba(100,150,255,0.08)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "rgba(255,255,255,0.15)";
        btn.style.color = "rgba(255,255,255,0.6)";
        btn.style.boxShadow = "none";
      });

      btn.addEventListener("click", () => {
        this.xr.enterVR();
        btn.style.opacity = "0";
        btn.style.pointerEvents = "none";
      });

      this.xr.onSessionEnd(() => {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
      });

      document.body.appendChild(btn);
      this.vrButton = btn;

      // Fade in
      btn.style.opacity = "0";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          btn.style.opacity = "1";
        });
      });
    });
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
    this.xr.dispose();
    this.energyField.dispose();
    this.energyFieldBokeh.dispose();
    this.lightTrail.dispose();
    this.cosmicSky.dispose();
    this.darkMeadow.dispose();
    this.renderer.dispose();
    this.vrButton?.remove();
  }
}
