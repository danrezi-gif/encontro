import {
  CeremonyPhase,
  CEREMONY_SEQUENCE,
  PHASE_DURATIONS,
} from "../../shared/CeremonyPhase";

interface UserState {
  userId: string;
  ready: boolean;
  mergeTarget: string | null;
}

/**
 * Server-side room state management.
 * Tracks participants, readiness, ceremony phase, and merge requests.
 */
export class CeremonyRoom {
  readonly roomId: string;
  private users = new Map<string, UserState>();
  private phase: CeremonyPhase = CeremonyPhase.Lobby;
  private phaseStartTime = 0;
  private ceremonyStartTime = 0;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;

  /** Called when a phase changes — server pushes this to clients */
  onPhaseChange?: (
    phase: CeremonyPhase,
    startTime: number,
    duration: number
  ) => void;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  addUser(userId: string): void {
    this.users.set(userId, {
      userId,
      ready: false,
      mergeTarget: null,
    });
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    // Clear any merge references to the removed user
    this.users.forEach((user) => {
      if (user.mergeTarget === userId) {
        user.mergeTarget = null;
      }
    });
  }

  markReady(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.ready = true;
    }
  }

  getUserIds(): string[] {
    return Array.from(this.users.keys());
  }

  get participantCount(): number {
    return this.users.size;
  }

  get isEmpty(): boolean {
    return this.users.size === 0;
  }

  get allReady(): boolean {
    if (this.users.size < 2) return false;
    return Array.from(this.users.values()).every((u) => u.ready);
  }

  get currentPhase(): CeremonyPhase {
    return this.phase;
  }

  startCeremony(startTime: number): void {
    this.ceremonyStartTime = startTime;
    this.advancePhase(0);
  }

  private advancePhase(index: number): void {
    if (index >= CEREMONY_SEQUENCE.length) {
      this.phase = CeremonyPhase.Complete;
      this.onPhaseChange?.(CeremonyPhase.Complete, Date.now(), Infinity);
      return;
    }

    const nextPhase = CEREMONY_SEQUENCE[index];
    const duration = PHASE_DURATIONS[nextPhase];
    this.phase = nextPhase;
    this.phaseStartTime = Date.now();

    this.onPhaseChange?.(nextPhase, this.phaseStartTime, duration);

    // Schedule next phase
    if (duration !== Infinity) {
      this.phaseTimer = setTimeout(() => {
        this.advancePhase(index + 1);
      }, duration);
    }
  }

  handleMergeRequest(fromUserId: string, toUserId: string): void {
    const user = this.users.get(fromUserId);
    if (user) {
      user.mergeTarget = toUserId;
    }
  }

  handleMergeRelease(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.mergeTarget = null;
    }
  }

  /** Check if both users have requested merge with each other */
  isMergePairConfirmed(userA: string, userB: string): boolean {
    const a = this.users.get(userA);
    const b = this.users.get(userB);
    return a?.mergeTarget === userB && b?.mergeTarget === userA;
  }

  dispose(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }
  }
}
