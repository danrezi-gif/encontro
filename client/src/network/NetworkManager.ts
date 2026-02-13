import type {
  ClientMessage,
  ServerMessage,
} from "@shared/NetworkMessages";
import type { PresenceState } from "@shared/PresenceState";

type MessageHandler = (message: ServerMessage) => void;

/**
 * Manages WebSocket connection lifecycle.
 * Handles connecting, reconnecting, and message routing.
 */
export class NetworkManager {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private serverUrl: string;

  constructor() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.serverUrl = `${protocol}//${window.location.host}/ws`;
  }

  connect(roomId: string): void {
    this.disconnect();
    this.reconnectAttempts = 0;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log("[Network] Connected to server");
        this.reconnectAttempts = 0;
        this.send({ type: "join_room", roomId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.handlers.forEach((handler) => handler(message));
        } catch (err) {
          console.error("[Network] Failed to parse message:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[Network] Disconnected");
        this.attemptReconnect(roomId);
      };

      this.ws.onerror = (err) => {
        console.error("[Network] WebSocket error:", err);
      };
    } catch (err) {
      console.error("[Network] Failed to connect:", err);
      this.attemptReconnect(roomId);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendPresenceUpdate(state: PresenceState): void {
    this.send({ type: "presence_update", state });
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private attemptReconnect(roomId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[Network] Max reconnect attempts reached");
      return;
    }

    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    console.log(
      `[Network] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(roomId);
    }, delay);
  }
}
