import { CeremonyPhase } from "./CeremonyPhase";
import type { PresenceState } from "./PresenceState";

// ─── Client → Server ────────────────────────────────────────────

export interface JoinRoomMessage {
  type: "join_room";
  roomId: string;
}

export interface LeaveRoomMessage {
  type: "leave_room";
}

export interface PresenceUpdateMessage {
  type: "presence_update";
  state: PresenceState;
}

export interface MergeInitiateMessage {
  type: "merge_initiate";
  targetUserId: string;
}

export interface MergeReleaseMessage {
  type: "merge_release";
}

export interface ReadyMessage {
  type: "ready";
}

export type ClientMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | PresenceUpdateMessage
  | MergeInitiateMessage
  | MergeReleaseMessage
  | ReadyMessage;

// ─── Server → Client ────────────────────────────────────────────

export interface WelcomeMessage {
  type: "welcome";
  userId: string;
  roomId: string;
  participants: string[];
}

export interface UserJoinedMessage {
  type: "user_joined";
  userId: string;
}

export interface UserLeftMessage {
  type: "user_left";
  userId: string;
}

export interface RemotePresenceUpdateMessage {
  type: "remote_presence_update";
  userId: string;
  state: PresenceState;
}

export interface PhaseChangeMessage {
  type: "phase_change";
  phase: CeremonyPhase;
  startTime: number;
  duration: number;
}

export interface CeremonyStartMessage {
  type: "ceremony_start";
  startTime: number;
}

export interface MergeConfirmMessage {
  type: "merge_confirm";
  partnerUserId: string;
}

export interface MergeDenyMessage {
  type: "merge_deny";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage =
  | WelcomeMessage
  | UserJoinedMessage
  | UserLeftMessage
  | RemotePresenceUpdateMessage
  | PhaseChangeMessage
  | CeremonyStartMessage
  | MergeConfirmMessage
  | MergeDenyMessage
  | ErrorMessage;
