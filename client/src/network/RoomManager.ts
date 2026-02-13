import { NetworkManager } from "./NetworkManager";
import type { ServerMessage } from "@shared/NetworkMessages";

/**
 * Manages room join/leave lifecycle and tracks participants.
 */
export class RoomManager {
  private participants = new Set<string>();
  private localUserId: string | null = null;
  private roomId: string | null = null;

  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onConnected?: (userId: string, participants: string[]) => void;

  constructor(private network: NetworkManager) {
    this.network.onMessage((msg) => this.handleMessage(msg));
  }

  joinRoom(roomId: string): void {
    this.roomId = roomId;
    this.network.connect(roomId);
  }

  leaveRoom(): void {
    this.network.send({ type: "leave_room" });
    this.participants.clear();
    this.localUserId = null;
    this.roomId = null;
    this.network.disconnect();
  }

  markReady(): void {
    this.network.send({ type: "ready" });
  }

  get userId(): string | null {
    return this.localUserId;
  }

  get currentRoomId(): string | null {
    return this.roomId;
  }

  getParticipants(): string[] {
    return Array.from(this.participants);
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "welcome":
        this.localUserId = message.userId;
        this.participants.clear();
        message.participants.forEach((id) => this.participants.add(id));
        this.onConnected?.(message.userId, message.participants);
        break;
      case "user_joined":
        this.participants.add(message.userId);
        this.onUserJoined?.(message.userId);
        break;
      case "user_left":
        this.participants.delete(message.userId);
        this.onUserLeft?.(message.userId);
        break;
    }
  }
}
