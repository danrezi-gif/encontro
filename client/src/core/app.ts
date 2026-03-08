import * as THREE from "three";
import { createScene } from "./scene";
import { createRenderer } from "./renderer";
import { InputManager } from "./input";
import { XRSessionManager } from "../xr/XRSessionManager";
import { EnergyField } from "../presence/EnergyField";
import { EnergyFieldBokeh } from "../presence/EnergyFieldBokeh";
import { BreathStream } from "../presence/BreathStream";
import { CosmicSky } from "../environment/CosmicSky";
import { DarkMeadow } from "../environment/DarkMeadow";
import { EtherealMist } from "../environment/EtherealMist";
import { DustStreams } from "../environment/DustStreams";
import { Levitation } from "../presence/Levitation";
import { AudioEngine } from "../audio/AudioEngine";

/**
 * Main application — bootstraps the Three.js scene, WebXR session,
 * energy field presence, and the animation loop.
 *
 * The user's presence is rendered as a Bill Viola-inspired body of cascading light:
 * - EnergyField: raymarched body SDF with downward-flowing light (the figure)
 * - EnergyFieldBokeh: subtle ambient glow beneath the body (scattered light)
 *
 * Hand gestures steer the aura — the ground illumination follows
 * the direction the user's hands point.
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
  private cosmicSky: CosmicSky;
  private darkMeadow: DarkMeadow;
  private etherealMist: EtherealMist;
  private dustStreams: DustStreams;
  private breathStream: BreathStream;
  private levitation: Levitation;
  private audio: AudioEngine;
  private worldRoot: THREE.Group;
  private isRunning = false;
  private vrButton: HTMLElement | null = null;

  // Smoothed hand speed for reactive systems
  private leftHandSpeedSmooth = 0;
  private rightHandSpeedSmooth = 0;
  private movementIntensitySmooth = 0;

  // Desktop camera velocity tracking
  private prevCameraPos = new THREE.Vector3(0, 1.6, 0);
  private desktopHeadVelocity = new THREE.Vector3();

  // Smoothed gesture direction (head → avg hand, world space)
  private gestureDir = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    const { scene, camera } = createScene();
    this.scene = scene;
    this.camera = camera;
    this.clock = new THREE.Clock();
    this.input = new InputManager(this.renderer, this.camera);

    this.xr = new XRSessionManager(this.renderer);

    // Body of cascading light
    this.energyField = new EnergyField();
    this.scene.add(this.energyField.group);

    // Subtle ambient glow beneath (disabled — too strong, revisit later)
    this.energyFieldBokeh = new EnergyFieldBokeh();
    // this.scene.add(this.energyFieldBokeh.group);

    // Environment
    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    this.cosmicSky = new CosmicSky(2500);
    this.scene.add(this.cosmicSky.group); // sky stays fixed during levitation

    this.darkMeadow = new DarkMeadow();
    this.worldRoot.add(this.darkMeadow.group);

    this.etherealMist = new EtherealMist();
    this.worldRoot.add(this.etherealMist.group);

    this.dustStreams = new DustStreams();
    this.worldRoot.add(this.dustStreams.group);

    // Breath stream — lives in scene space so particles stay put in the world
    this.breathStream = new BreathStream();
    this.scene.add(this.breathStream.group);

    // Levitation
    this.levitation = new Levitation();
    this.xr.onSessionStart(() => this.levitation.reset());
    this.xr.onSessionEnd(() => this.levitation.reset());

    this.audio = new AudioEngine();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.handleResize();

    this.createVRButton();
  }

  start(): void {
    this.isRunning = true;
    this.audio.play();
    this.renderer.setAnimationLoop((time, frame) => {
      this.update(time, frame);
    });
  }

  private update(_time: number, frame?: XRFrame): void {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.xr.update(frame, delta);

    // ── Desktop velocity (compute FIRST so we can use it below) ──
    if (!this.xr.isPresenting) {
      this.desktopHeadVelocity
        .subVectors(this.camera.position, this.prevCameraPos)
        .divideScalar(Math.max(delta, 0.001));
      this.prevCameraPos.copy(this.camera.position);
    }

    // Head position
    const headPos = new THREE.Vector3();
    if (this.xr.isPresenting) {
      headPos.copy(this.xr.head.position);
    } else {
      headPos.copy(this.camera.position);
    }

    // Head speed — works on both XR and desktop now
    const headSpeed = this.xr.isPresenting
      ? this.xr.head.velocity.length()
      : this.desktopHeadVelocity.length();

    // Smooth hand speeds
    const leftSpeed = this.xr.leftHand.active ? this.xr.leftHand.velocity.length() : 0;
    const rightSpeed = this.xr.rightHand.active ? this.xr.rightHand.velocity.length() : 0;
    this.leftHandSpeedSmooth = this.leftHandSpeedSmooth * 0.85 + leftSpeed * 0.15;
    this.rightHandSpeedSmooth = this.rightHandSpeedSmooth * 0.85 + rightSpeed * 0.15;

    // Overall movement intensity
    this.movementIntensitySmooth = this.movementIntensitySmooth * 0.9
      + Math.min(headSpeed * 0.5, 1.0) * 0.1;

    // Hand positions
    const leftHandPos = new THREE.Vector3();
    const rightHandPos = new THREE.Vector3();
    let leftActive = this.xr.leftHand.active;
    let rightActive = this.xr.rightHand.active;

    // Head direction — full 3D (for flight) and horizontal (for ground systems)
    const headDirection = new THREE.Vector3();
    if (this.xr.isPresenting) {
      const xrCam = this.renderer.xr.getCamera();
      xrCam.getWorldDirection(headDirection);
    } else {
      this.camera.getWorldDirection(headDirection);
    }
    const headForward = new THREE.Vector3(headDirection.x, 0, headDirection.z).normalize();

    if (this.xr.isPresenting) {
      leftHandPos.copy(this.xr.leftHand.position);
      rightHandPos.copy(this.xr.rightHand.position);
    } else {
      // Desktop: simulate hands offset from camera
      const right = new THREE.Vector3().crossVectors(headForward, new THREE.Vector3(0, 1, 0)).normalize();

      leftHandPos.copy(this.camera.position)
        .addScaledVector(right, -0.3)
        .addScaledVector(headForward, 0.4);
      leftHandPos.y -= 0.3;

      rightHandPos.copy(this.camera.position)
        .addScaledVector(right, 0.3)
        .addScaledVector(headForward, 0.4);
      rightHandPos.y -= 0.3;

      leftActive = true;
      rightActive = true;

      // Desktop hand speeds derive from camera velocity
      const desktopSpeed = this.desktopHeadVelocity.length();
      this.leftHandSpeedSmooth = this.leftHandSpeedSmooth * 0.85 + desktopSpeed * 0.5 * 0.15;
      this.rightHandSpeedSmooth = this.rightHandSpeedSmooth * 0.85 + desktopSpeed * 0.5 * 0.15;
    }

    // ── Gesture direction (head → avg hand) ─────────────────────
    const rawGesture = new THREE.Vector3();
    if (leftActive || rightActive) {
      const avgHand = new THREE.Vector3();
      let count = 0;
      if (leftActive) { avgHand.add(leftHandPos); count++; }
      if (rightActive) { avgHand.add(rightHandPos); count++; }
      if (count > 0) avgHand.divideScalar(count);
      rawGesture.subVectors(avgHand, headPos);
    }
    // Smooth it
    this.gestureDir.lerp(rawGesture, Math.min(1, delta * 4));

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

    // Prayer gesture: hands approaching each other
    let handProximity = 0;
    if (leftActive && rightActive) {
      const handDist = leftHandPos.distanceTo(rightHandPos);
      handProximity = 1.0 - Math.min(handDist / 0.4, 1.0); // 0.4m = max distance, 0 = touching
      handProximity = Math.max(0, handProximity);
    }

    this.energyField.setTracking(...trackingArgs);
    this.energyField.setHandProximity(handProximity);
    this.energyField.update(delta, elapsed);

    this.energyFieldBokeh.setTracking(...trackingArgs);
    this.energyFieldBokeh.setHeight(this.levitation.height);
    this.energyFieldBokeh.update(delta, elapsed);

    // ── Levitation ──────────────────────────────────────────────
    let headVelocity: THREE.Vector3;
    if (this.xr.isPresenting) {
      headVelocity = this.xr.head.velocity;
    } else {
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
      headDirection,
    );

    this.worldRoot.position.copy(this.levitation.offset);

    // ── Subsystems ──────────────────────────────────────────────
    this.input.update(delta, elapsed);

    const soulHeight = this.levitation.height;

    this.cosmicSky.setHeight(soulHeight);
    this.cosmicSky.update(delta, elapsed);

    this.darkMeadow.setTracking(headPos, this.gestureDir);
    this.darkMeadow.setHeight(soulHeight);
    this.darkMeadow.update(delta, elapsed);

    // Soul position in world-root space for mist/dust parting
    const soulWorldPos = new THREE.Vector3(
      headPos.x + this.levitation.offset.x,
      headPos.y + this.levitation.offset.y,
      headPos.z + this.levitation.offset.z,
    );

    this.etherealMist.setSoulPos(soulWorldPos);
    this.etherealMist.update(delta, elapsed);

    this.dustStreams.setSoulWorldPos(soulWorldPos);
    this.dustStreams.setSoulPos(headPos);
    this.dustStreams.update(delta, elapsed);

    // Breath stream: mouth just below and ahead of head
    this.breathStream.setMouth(headPos, headDirection);
    this.breathStream.update(delta, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

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
    this.audio.dispose();
    this.xr.dispose();
    this.energyField.dispose();
    this.energyFieldBokeh.dispose();
    this.cosmicSky.dispose();
    this.darkMeadow.dispose();
    this.etherealMist.dispose();
    this.dustStreams.dispose();
    this.renderer.dispose();
    this.vrButton?.remove();
  }
}
