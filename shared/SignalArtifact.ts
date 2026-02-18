/**
 * SignalArtifact — the expressive object a user creates before entering
 * the encounter space. Represents their current field state, not identity.
 *
 * Ephemeral: artifacts expire. No profile. No history. Just now.
 */
export interface ColorProfile {
  /** HSL hue values (0-360), sorted by weight */
  dominantHues: number[];
  /** Mean saturation across chosen colors (0-1) */
  saturationMean: number;
  /** Brightness distribution [dark, mid, light] (0-1 each) */
  brightnessProfile: [number, number, number];
  /** -1 = full cool (blues/greens), +1 = full warm (reds/yellows) */
  warmthCoolBalance: number;
}

export interface SonicProfile {
  /** Dominant frequency band in Hz (bass 80-250, mid 250-4k, treble 4k+) */
  frequencyCenter: number;
  /** Harmonic complexity (0 = single pure tone, 1 = dense overtone stack) */
  harmonicDensity: number;
  /** Rhythmic pulse in BPM equivalent (0 = no rhythm) */
  rhythmicPulse: number;
  /** 0 = pure crystal tones, 1 = rough textured noise */
  textureRoughness: number;
  /** Active tone indices chosen by user */
  activeTones: number[];
}

export interface MarkProfile {
  /** Mean stroke velocity (pixels/ms), normalized 0-1 */
  strokeVelocityMean: number;
  /** 0 = chaotic/omnidirectional, 1 = clear directional thrust */
  directionality: number;
  /** 0 = open spiralling forms, 1 = closed contained loops */
  closureIndex: number;
  /** Spatial density distribution across 9 zones [0-8] */
  densityMap: number[];
  /** Total stroke length relative to canvas (0-1) */
  coverage: number;
}

export interface SignalArtifact {
  /** Ephemeral session key — never tied to identity */
  sessionKey: string;
  /** Unix timestamp (ms) — for freshness weighting */
  timestamp: number;
  colorProfile: ColorProfile;
  sonicProfile: SonicProfile;
  markProfile: MarkProfile;
  /** Intention symbol selections encoded as a vector (indices of chosen symbols) */
  intentionVector: number[];
}

/** Generate a cryptographically random ephemeral session key */
export function generateSessionKey(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Create a blank/default signal artifact */
export function createEmptyArtifact(): SignalArtifact {
  return {
    sessionKey: generateSessionKey(),
    timestamp: Date.now(),
    colorProfile: {
      dominantHues: [],
      saturationMean: 0.7,
      brightnessProfile: [0.2, 0.5, 0.3],
      warmthCoolBalance: 0,
    },
    sonicProfile: {
      frequencyCenter: 440,
      harmonicDensity: 0.3,
      rhythmicPulse: 0,
      textureRoughness: 0.1,
      activeTones: [],
    },
    markProfile: {
      strokeVelocityMean: 0,
      directionality: 0,
      closureIndex: 0,
      densityMap: new Array(9).fill(0),
      coverage: 0,
    },
    intentionVector: [],
  };
}
