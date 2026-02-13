/**
 * Server-specific type definitions.
 * Shared types live in /shared/ — these are server-only.
 */

export interface ServerConfig {
  port: number;
  maxRoomSize: number;
  maxRooms: number;
  presenceUpdateRate: number; // Hz
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 3001,
  maxRoomSize: 6,
  maxRooms: 50,
  presenceUpdateRate: 30,
};
