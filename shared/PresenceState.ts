/**
 * Presence state synchronized over the network at 30 Hz.
 * ~200 bytes per update — trivial bandwidth.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface HandState {
  position: Vec3;
  rotation: Quat;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export interface PresenceState {
  /** Head position in world space */
  position: Vec3;
  /** Head rotation quaternion */
  rotation: Quat;
  /** Left hand/controller state */
  leftHand: HandState | null;
  /** Right hand/controller state */
  rightHand: HandState | null;
  /** Movement smoothness metric (0-1) — smooth = high, jerky = low */
  movementRhythm: number;
  /** Current presence color */
  colorState: ColorHSL;
  /** Breathing rate if detectable (optional, Hz) */
  breathRate: number | null;
  /** Who this presence is merging with (userId or null) */
  mergeTarget: string | null;
  /** Merge intensity 0-1 */
  mergeDepth: number;
  /** Timestamp for interpolation */
  timestamp: number;
}

/** Create a default/initial presence state */
export function createDefaultPresenceState(): PresenceState {
  return {
    position: { x: 0, y: 1.6, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    leftHand: null,
    rightHand: null,
    movementRhythm: 0,
    colorState: { h: Math.random() * 360, s: 0.7, l: 0.6 },
    breathRate: null,
    mergeTarget: null,
    mergeDepth: 0,
    timestamp: Date.now(),
  };
}
