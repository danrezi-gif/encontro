import * as THREE from "three";

/**
 * Handles controller and hand input for WebXR sessions.
 * In non-XR mode, provides mouse/keyboard fallback for testing.
 */
export class InputManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private enabled = true;

  // Non-XR fallback: mouse look
  private isPointerLocked = false;
  private euler = new THREE.Euler(0, 0, 0, "YXZ");
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveSpeed = 2.0;

  constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    this.renderer = renderer;
    this.camera = camera;

    this.setupDesktopControls();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  private setupDesktopControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("click", () => {
      if (!this.enabled) return;
      if (!this.renderer.xr.isPresenting) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.isPointerLocked || !this.enabled) return;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= event.movementX * 0.002;
      this.euler.x -= event.movementY * 0.002;
      this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    document.addEventListener("keydown", (event) => {
      if (!this.enabled) return;
      this.handleKey(event.code, true);
    });

    document.addEventListener("keyup", (event) => {
      this.handleKey(event.code, false);
    });
  }

  private handleKey(code: string, pressed: boolean): void {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.moveForward = pressed;
        break;
      case "KeyS":
      case "ArrowDown":
        this.moveBackward = pressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.moveLeft = pressed;
        break;
      case "KeyD":
      case "ArrowRight":
        this.moveRight = pressed;
        break;
    }
  }

  update(delta: number, _elapsed: number): void {
    if (!this.enabled) return;

    // Desktop fallback movement (ignored in WebXR — headset tracking takes over)
    if (!this.renderer.xr.isPresenting && this.isPointerLocked) {
      const direction = new THREE.Vector3();
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();

      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (this.moveForward) direction.add(forward);
      if (this.moveBackward) direction.sub(forward);
      if (this.moveLeft) direction.sub(right);
      if (this.moveRight) direction.add(right);

      if (direction.lengthSq() > 0) {
        direction.normalize();
        this.camera.position.addScaledVector(
          direction,
          this.moveSpeed * delta
        );
      }
    }
  }
}
