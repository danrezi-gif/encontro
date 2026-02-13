import { CeremonyPhase } from "@shared/CeremonyPhase";

/**
 * Per-phase configuration controlling environment, presence visibility, and audio.
 * Clients interpolate between these configs over the transitionDuration.
 */
export interface PhaseConfig {
  duration: number;
  transitionDuration: number;
  environment: {
    ambientLight: number;
    groundGlow: number;
    skyParticleDensity: number;
    fogDensity: number;
  };
  presence: {
    visibilityRange: number;
    brightnessMultiplier: number;
    mergeEnabled: boolean;
    mergeThreshold: number;
  };
  audio: {
    ambientVolume: number;
    toneVolume: number;
    harmonicBlending: number;
  };
}

export const PHASE_CONFIGS: Record<CeremonyPhase, PhaseConfig> = {
  [CeremonyPhase.Lobby]: {
    duration: Infinity,
    transitionDuration: 2000,
    environment: { ambientLight: 0.02, groundGlow: 0.1, skyParticleDensity: 0.3, fogDensity: 0.0 },
    presence: { visibilityRange: 0, brightnessMultiplier: 0.5, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.3, toneVolume: 0, harmonicBlending: 0 },
  },
  [CeremonyPhase.Arrival]: {
    duration: 180_000,
    transitionDuration: 5000,
    environment: { ambientLight: 0.03, groundGlow: 0.15, skyParticleDensity: 0.5, fogDensity: 0.02 },
    presence: { visibilityRange: 0, brightnessMultiplier: 1.0, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.5, toneVolume: 0.2, harmonicBlending: 0 },
  },
  [CeremonyPhase.Sensing]: {
    duration: 180_000,
    transitionDuration: 5000,
    environment: { ambientLight: 0.04, groundGlow: 0.2, skyParticleDensity: 0.6, fogDensity: 0.03 },
    presence: { visibilityRange: 50, brightnessMultiplier: 0.3, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.5, toneVolume: 0.4, harmonicBlending: 0.2 },
  },
  [CeremonyPhase.Approach]: {
    duration: 300_000,
    transitionDuration: 5000,
    environment: { ambientLight: 0.05, groundGlow: 0.3, skyParticleDensity: 0.7, fogDensity: 0.02 },
    presence: { visibilityRange: 100, brightnessMultiplier: 0.7, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.5, toneVolume: 0.6, harmonicBlending: 0.5 },
  },
  [CeremonyPhase.Encounter]: {
    duration: 600_000,
    transitionDuration: 5000,
    environment: { ambientLight: 0.06, groundGlow: 0.4, skyParticleDensity: 0.8, fogDensity: 0.01 },
    presence: { visibilityRange: 200, brightnessMultiplier: 1.0, mergeEnabled: true, mergeThreshold: 2.0 },
    audio: { ambientVolume: 0.4, toneVolume: 0.8, harmonicBlending: 1.0 },
  },
  [CeremonyPhase.Release]: {
    duration: 180_000,
    transitionDuration: 5000,
    environment: { ambientLight: 0.04, groundGlow: 0.25, skyParticleDensity: 0.6, fogDensity: 0.03 },
    presence: { visibilityRange: 100, brightnessMultiplier: 0.5, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.5, toneVolume: 0.4, harmonicBlending: 0.3 },
  },
  [CeremonyPhase.Reflection]: {
    duration: 120_000,
    transitionDuration: 5000,
    environment: { ambientLight: 0.03, groundGlow: 0.15, skyParticleDensity: 0.4, fogDensity: 0.02 },
    presence: { visibilityRange: 0, brightnessMultiplier: 1.0, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.5, toneVolume: 0.2, harmonicBlending: 0 },
  },
  [CeremonyPhase.Complete]: {
    duration: Infinity,
    transitionDuration: 5000,
    environment: { ambientLight: 0.02, groundGlow: 0.1, skyParticleDensity: 0.3, fogDensity: 0.0 },
    presence: { visibilityRange: 0, brightnessMultiplier: 0.5, mergeEnabled: false, mergeThreshold: 0 },
    audio: { ambientVolume: 0.3, toneVolume: 0, harmonicBlending: 0 },
  },
};
