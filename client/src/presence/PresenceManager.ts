import * as THREE from "three";
import type { PresenceState } from "@shared/PresenceState";

/**
 * Manages creation, update, and destruction of presence entities.
 * Each presence is a luminous particle cloud representing a participant.
 */
export class PresenceManager {
  private presences = new Map<string, THREE.Group>();

  constructor(private scene: THREE.Scene) {}

  /** Create or update a presence for the given user */
  updatePresence(userId: string, state: PresenceState): void {
    let group = this.presences.get(userId);
    if (!group) {
      group = this.createPresenceGroup(userId);
      this.presences.set(userId, group);
      this.scene.add(group);
    }

    group.position.set(state.position.x, state.position.y, state.position.z);
    group.quaternion.set(
      state.rotation.x,
      state.rotation.y,
      state.rotation.z,
      state.rotation.w
    );
  }

  removePresence(userId: string): void {
    const group = this.presences.get(userId);
    if (group) {
      this.scene.remove(group);
      this.presences.delete(userId);
    }
  }

  /** Placeholder — will be replaced with GPU particle system */
  private createPresenceGroup(_userId: string): THREE.Group {
    const group = new THREE.Group();

    // Temporary: simple sphere to represent presence
    // Will be replaced with PresenceRenderer GPU particles
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      transparent: true,
      opacity: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    return group;
  }

  dispose(): void {
    Array.from(this.presences.keys()).forEach((userId) => {
      this.removePresence(userId);
    });
  }
}
