import * as THREE from "three";

/**
 * Manages WebXR immersive-vr session lifecycle.
 * Handles entering/exiting VR and provides hand/controller tracking data
 * without rendering any visible hand or controller models.
 */
export class XRSessionManager {
  private renderer: THREE.WebGLRenderer;
  private referenceSpace: XRReferenceSpace | null = null;
  private _isPresenting = false;

  // Hand tracking data — positions updated each frame from XR input sources
  readonly leftHand = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    prevPosition: new THREE.Vector3(),
    active: false,
  };
  readonly rightHand = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    prevPosition: new THREE.Vector3(),
    active: false,
  };
  readonly head = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    prevPosition: new THREE.Vector3(),
  };

  private onSessionStartCallbacks: (() => void)[] = [];
  private onSessionEndCallbacks: (() => void)[] = [];

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  get isPresenting(): boolean {
    return this._isPresenting;
  }

  onSessionStart(cb: () => void): void {
    this.onSessionStartCallbacks.push(cb);
  }

  onSessionEnd(cb: () => void): void {
    this.onSessionEndCallbacks.push(cb);
  }

  /**
   * Request an immersive-vr session.
   * Features requested: local-floor for standing, hand-tracking for native hand input.
   * We deliberately do NOT add controller models or hand models to the scene.
   */
  async enterVR(): Promise<void> {
    if (!navigator.xr) {
      console.warn("[XR] WebXR not available");
      return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      console.warn("[XR] immersive-vr not supported");
      return;
    }

    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "hand-tracking"],
      });

      this.renderer.xr.setSession(session);
      this._isPresenting = true;

      session.addEventListener("end", () => {
        this._isPresenting = false;
        this.referenceSpace = null;
        this.leftHand.active = false;
        this.rightHand.active = false;
        for (const cb of this.onSessionEndCallbacks) cb();
      });

      // Get reference space
      this.referenceSpace = await session.requestReferenceSpace("local-floor");

      for (const cb of this.onSessionStartCallbacks) cb();
    } catch (err) {
      console.error("[XR] Failed to enter VR:", err);
    }
  }

  /**
   * Called each frame from the render loop.
   * Extracts hand/controller positions from XR input sources without rendering anything visible.
   */
  update(frame: XRFrame | undefined, delta: number): void {
    if (!frame || !this.referenceSpace || !this._isPresenting) return;

    const session = frame.session;
    const pose = frame.getViewerPose(this.referenceSpace);

    // Update head tracking
    if (pose) {
      const p = pose.transform.position;
      this.head.prevPosition.copy(this.head.position);
      this.head.position.set(p.x, p.y, p.z);
      if (delta > 0) {
        this.head.velocity
          .subVectors(this.head.position, this.head.prevPosition)
          .divideScalar(delta);
      }
    }

    // Update hand/controller tracking
    this.leftHand.active = false;
    this.rightHand.active = false;

    for (const source of session.inputSources) {
      const hand = source.handedness === "left" ? this.leftHand : this.rightHand;

      // Try native hand tracking first (joints)
      if (source.hand && frame.getJointPose) {
        const wrist = source.hand.get("wrist");
        if (wrist) {
          const jointPose = frame.getJointPose(wrist, this.referenceSpace);
          if (jointPose) {
            hand.prevPosition.copy(hand.position);
            const p = jointPose.transform.position;
            hand.position.set(p.x, p.y, p.z);
            hand.active = true;
            if (delta > 0) {
              hand.velocity
                .subVectors(hand.position, hand.prevPosition)
                .divideScalar(delta);
            }
          }
        }
      }
      // Fallback to grip/target ray (controllers)
      else if (source.gripSpace) {
        const gripPose = frame.getPose(source.gripSpace, this.referenceSpace);
        if (gripPose) {
          hand.prevPosition.copy(hand.position);
          const p = gripPose.transform.position;
          hand.position.set(p.x, p.y, p.z);
          hand.active = true;
          if (delta > 0) {
            hand.velocity
              .subVectors(hand.position, hand.prevPosition)
              .divideScalar(delta);
          }
        }
      }
    }
  }

  dispose(): void {
    if (this._isPresenting) {
      const session = this.renderer.xr.getSession();
      session?.end();
    }
    this.onSessionStartCallbacks = [];
    this.onSessionEndCallbacks = [];
  }
}
