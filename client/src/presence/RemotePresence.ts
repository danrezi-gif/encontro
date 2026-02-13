import * as THREE from "three";
import type { PresenceState } from "@shared/PresenceState";

/**
 * Renders a remote participant's presence.
 * Currently a placeholder — will evolve into GPU particle cloud.
 */
export class RemotePresence {
  readonly userId: string;
  readonly group: THREE.Group;
  private currentState: PresenceState | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.group = new THREE.Group();
  }

  updateState(state: PresenceState): void {
    this.currentState = state;
    this.group.position.set(state.position.x, state.position.y, state.position.z);
    this.group.quaternion.set(
      state.rotation.x,
      state.rotation.y,
      state.rotation.z,
      state.rotation.w
    );
  }

  getState(): PresenceState | null {
    return this.currentState;
  }

  dispose(): void {
    // Clean up GPU resources when particle system is implemented
  }
}
