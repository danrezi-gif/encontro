import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { CeremonyRoom } from "./CeremonyRoom";
import type { ClientMessage, ServerMessage } from "../../shared/NetworkMessages";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

/** Active ceremony rooms */
const rooms = new Map<string, CeremonyRoom>();

/** Map WebSocket → userId */
const clients = new Map<WebSocket, { userId: string; roomId: string | null }>();

let nextUserId = 1;

function generateUserId(): string {
  return `user_${nextUserId++}_${Date.now().toString(36)}`;
}

function sendTo(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getOrCreateRoom(roomId: string): CeremonyRoom {
  let room = rooms.get(roomId);
  if (!room) {
    room = new CeremonyRoom(roomId);
    rooms.set(roomId, room);
    console.log(`[Server] Room created: ${roomId}`);
  }
  return room;
}

wss.on("connection", (ws) => {
  const userId = generateUserId();
  clients.set(ws, { userId, roomId: null });
  console.log(`[Server] Client connected: ${userId}`);

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;
      handleMessage(ws, userId, message);
    } catch (err) {
      console.error(`[Server] Bad message from ${userId}:`, err);
      sendTo(ws, { type: "error", message: "Invalid message format" });
    }
  });

  ws.on("close", () => {
    const client = clients.get(ws);
    if (client?.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        room.removeUser(userId);
        // Broadcast departure
        broadcastToRoom(client.roomId, { type: "user_left", userId }, ws);
        // Clean up empty rooms
        if (room.isEmpty) {
          rooms.delete(client.roomId);
          console.log(`[Server] Room destroyed: ${client.roomId}`);
        }
      }
    }
    clients.delete(ws);
    console.log(`[Server] Client disconnected: ${userId}`);
  });
});

function handleMessage(
  ws: WebSocket,
  userId: string,
  message: ClientMessage
): void {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case "join_room": {
      // Leave current room if in one
      if (client.roomId) {
        const oldRoom = rooms.get(client.roomId);
        if (oldRoom) {
          oldRoom.removeUser(userId);
          broadcastToRoom(client.roomId, { type: "user_left", userId }, ws);
        }
      }

      const room = getOrCreateRoom(message.roomId);
      room.addUser(userId);
      client.roomId = message.roomId;

      // Send welcome with current participant list
      sendTo(ws, {
        type: "welcome",
        userId,
        roomId: message.roomId,
        participants: room.getUserIds().filter((id) => id !== userId),
      });

      // Broadcast join to others
      broadcastToRoom(message.roomId, { type: "user_joined", userId }, ws);
      break;
    }

    case "presence_update": {
      if (!client.roomId) return;
      // Relay presence to all other users in the room
      broadcastToRoom(
        client.roomId,
        {
          type: "remote_presence_update",
          userId,
          state: message.state,
        },
        ws
      );
      break;
    }

    case "merge_initiate": {
      if (!client.roomId) return;
      const room = rooms.get(client.roomId);
      if (room) {
        room.handleMergeRequest(userId, message.targetUserId);
        // If mutual merge, confirm both parties
        if (room.isMergePairConfirmed(userId, message.targetUserId)) {
          const targetWs = findWsByUserId(message.targetUserId);
          sendTo(ws, {
            type: "merge_confirm",
            partnerUserId: message.targetUserId,
          });
          if (targetWs) {
            sendTo(targetWs, {
              type: "merge_confirm",
              partnerUserId: userId,
            });
          }
        }
      }
      break;
    }

    case "merge_release": {
      if (!client.roomId) return;
      const room = rooms.get(client.roomId);
      if (room) {
        room.handleMergeRelease(userId);
      }
      break;
    }

    case "ready": {
      if (!client.roomId) return;
      const room = rooms.get(client.roomId);
      if (room) {
        room.markReady(userId);
        // If all ready, start ceremony
        if (room.allReady) {
          const startTime = Date.now() + 3000; // 3s countdown
          broadcastToRoom(client.roomId, {
            type: "ceremony_start",
            startTime,
          });
          room.startCeremony(startTime);
        }
      }
      break;
    }

    case "leave_room": {
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
          room.removeUser(userId);
          broadcastToRoom(client.roomId, { type: "user_left", userId }, ws);
          if (room.isEmpty) {
            rooms.delete(client.roomId);
          }
        }
        client.roomId = null;
      }
      break;
    }
  }
}

function broadcastToRoom(
  roomId: string,
  message: ServerMessage,
  exclude?: WebSocket
): void {
  wss.clients.forEach((ws) => {
    if (ws === exclude) return;
    const client = clients.get(ws);
    if (client?.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function findWsByUserId(userId: string): WebSocket | undefined {
  let found: WebSocket | undefined;
  clients.forEach((client, ws) => {
    if (client.userId === userId) found = ws;
  });
  return found;
}

server.listen(PORT, () => {
  console.log(`[Server] Encontro signaling server running on port ${PORT}`);
});
