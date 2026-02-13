/**
 * Re-export shared network message types for client convenience.
 */
export type {
  ClientMessage,
  ServerMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  PresenceUpdateMessage,
  MergeInitiateMessage,
  MergeReleaseMessage,
  ReadyMessage,
  WelcomeMessage,
  UserJoinedMessage,
  UserLeftMessage,
  RemotePresenceUpdateMessage,
  PhaseChangeMessage,
  CeremonyStartMessage,
  MergeConfirmMessage,
  MergeDenyMessage,
  ErrorMessage,
} from "@shared/NetworkMessages";
