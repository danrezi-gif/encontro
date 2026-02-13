/**
 * Ceremony phases — the arc of an encounter.
 * Each ceremony follows this sequence, server-authoritative timing.
 */
export enum CeremonyPhase {
  /** Waiting for participants before ceremony starts */
  Lobby = "lobby",
  /** Solo settling into the space (3 min) */
  Arrival = "arrival",
  /** Perceiving distant presences (3 min) */
  Sensing = "sensing",
  /** Moving toward resonance (5 min) */
  Approach = "approach",
  /** Merging & shared experience (10 min) */
  Encounter = "encounter",
  /** Separation & traces deposited (3 min) */
  Release = "release",
  /** Solo integration + gift (2 min) */
  Reflection = "reflection",
  /** Ceremony complete */
  Complete = "complete",
}

/** Phase timing in milliseconds */
export const PHASE_DURATIONS: Record<CeremonyPhase, number> = {
  [CeremonyPhase.Lobby]: Infinity,
  [CeremonyPhase.Arrival]: 3 * 60 * 1000,
  [CeremonyPhase.Sensing]: 3 * 60 * 1000,
  [CeremonyPhase.Approach]: 5 * 60 * 1000,
  [CeremonyPhase.Encounter]: 10 * 60 * 1000,
  [CeremonyPhase.Release]: 3 * 60 * 1000,
  [CeremonyPhase.Reflection]: 2 * 60 * 1000,
  [CeremonyPhase.Complete]: Infinity,
};

/** Transition fade duration between phases (ms) */
export const PHASE_TRANSITION_DURATION = 5000;

/** Ordered ceremony sequence (excluding lobby/complete) */
export const CEREMONY_SEQUENCE: CeremonyPhase[] = [
  CeremonyPhase.Arrival,
  CeremonyPhase.Sensing,
  CeremonyPhase.Approach,
  CeremonyPhase.Encounter,
  CeremonyPhase.Release,
  CeremonyPhase.Reflection,
];

/** Total ceremony duration (ms), excluding lobby and complete */
export const TOTAL_CEREMONY_DURATION = CEREMONY_SEQUENCE.reduce(
  (sum, phase) => sum + PHASE_DURATIONS[phase],
  0
);
