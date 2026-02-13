import { NetworkManager } from "./NetworkManager";
import { StateSync } from "./StateSync";
import type { PresenceState } from "@shared/PresenceState";
import type { ServerMessage } from "@shared/NetworkMessages";

/**
 * Synchronizes presence state between local and remote participants.
 * Sends local state at 30 Hz, receives and interpolates remote states.
 */
export class PresenceSync {
  private remoteSyncs = new Map<string, StateSync>();
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private localState: PresenceState | null = null;
  private readonly sendRate = 30; // Hz

  constructor(private network: NetworkManager) {
    this.network.onMessage((msg) => this.handleMessage(msg));
  }

  /** Begin sending local presence updates */
  startSending(): void {
    if (this.sendInterval) return;
    this.sendInterval = setInterval(() => {
      if (this.localState) {
        this.localState.timestamp = Date.now();
        this.network.sendPresenceUpdate(this.localState);
      }
    }, 1000 / this.sendRate);
  }

  stopSending(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
  }

  /** Update local presence state (called each frame from tracking data) */
  setLocalState(state: PresenceState): void {
    this.localState = state;
  }

  /** Get interpolated remote presence state */
  getRemoteState(userId: string): PresenceState | null {
    const sync = this.remoteSyncs.get(userId);
    return sync?.getInterpolatedState() ?? null;
  }

  /** Get all remote user IDs with active state */
  getRemoteUserIds(): string[] {
    return Array.from(this.remoteSyncs.keys());
  }

  removeRemote(userId: string): void {
    this.remoteSyncs.delete(userId);
  }

  private handleMessage(message: ServerMessage): void {
    if (message.type === "remote_presence_update") {
      let sync = this.remoteSyncs.get(message.userId);
      if (!sync) {
        sync = new StateSync();
        this.remoteSyncs.set(message.userId, sync);
      }
      sync.pushState(message.state);
    } else if (message.type === "user_left") {
      this.remoteSyncs.delete(message.userId);
    }
  }

  dispose(): void {
    this.stopSending();
    this.remoteSyncs.clear();
  }
}
