import * as THREE from "three";
import { createDefaultPresenceState, type PresenceState } from "@shared/PresenceState";

/**
 * Tracks the local user's presence state from XR tracking data.
 * Computes movement rhythm, color shifts, and other derived metrics.
 */
export class LocalPresence {
  private state: PresenceState;
  private prevPosition = new THREE.Vector3();
  private velocitySmooth = 0;

  constructor() {
    this.state = createDefaultPresenceState();
  }

  /** Update from XR frame data or desktop camera */
  updateFromCamera(camera: THREE.Camera): void {
    const pos = camera.position;
    const rot = camera.quaternion;

    this.state.position = { x: pos.x, y: pos.y, z: pos.z };
    this.state.rotation = { x: rot.x, y: rot.y, z: rot.z, w: rot.w };
    this.state.timestamp = Date.now();

    // Compute movement rhythm from velocity smoothness
    const velocity = pos.distanceTo(this.prevPosition);
    this.velocitySmooth = this.velocitySmooth * 0.95 + velocity * 0.05;
    this.state.movementRhythm = Math.min(this.velocitySmooth * 10, 1.0);

    this.prevPosition.copy(pos);
  }

  getState(): PresenceState {
    return this.state;
  }
}
