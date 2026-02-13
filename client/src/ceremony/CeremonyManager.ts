import { CeremonyPhase, PHASE_TRANSITION_DURATION } from "@shared/CeremonyPhase";
import { PHASE_CONFIGS, type PhaseConfig } from "./CeremonyConfig";

/**
 * Client-side ceremony phase orchestration.
 * Receives authoritative phase changes from the server and interpolates
 * between phase configs for smooth visual/audio transitions.
 */
export class CeremonyManager {
  private currentPhase: CeremonyPhase = CeremonyPhase.Lobby;
  private previousPhase: CeremonyPhase = CeremonyPhase.Lobby;
  private transitionProgress = 1.0; // 0 = previous phase, 1 = current phase
  private phaseStartTime = 0;
  private phaseDuration = Infinity;

  /** Callback for phase change events */
  onPhaseChange?: (phase: CeremonyPhase) => void;

  get phase(): CeremonyPhase {
    return this.currentPhase;
  }

  get config(): PhaseConfig {
    return PHASE_CONFIGS[this.currentPhase];
  }

  /** Returns interpolated config during transitions */
  getInterpolatedConfig(): PhaseConfig {
    if (this.transitionProgress >= 1.0) {
      return PHASE_CONFIGS[this.currentPhase];
    }

    const from = PHASE_CONFIGS[this.previousPhase];
    const to = PHASE_CONFIGS[this.currentPhase];
    const t = this.transitionProgress;

    return {
      duration: to.duration,
      transitionDuration: to.transitionDuration,
      environment: {
        ambientLight: lerp(from.environment.ambientLight, to.environment.ambientLight, t),
        groundGlow: lerp(from.environment.groundGlow, to.environment.groundGlow, t),
        skyParticleDensity: lerp(from.environment.skyParticleDensity, to.environment.skyParticleDensity, t),
        fogDensity: lerp(from.environment.fogDensity, to.environment.fogDensity, t),
      },
      presence: {
        visibilityRange: lerp(from.presence.visibilityRange, to.presence.visibilityRange, t),
        brightnessMultiplier: lerp(from.presence.brightnessMultiplier, to.presence.brightnessMultiplier, t),
        mergeEnabled: t > 0.5 ? to.presence.mergeEnabled : from.presence.mergeEnabled,
        mergeThreshold: lerp(from.presence.mergeThreshold, to.presence.mergeThreshold, t),
      },
      audio: {
        ambientVolume: lerp(from.audio.ambientVolume, to.audio.ambientVolume, t),
        toneVolume: lerp(from.audio.toneVolume, to.audio.toneVolume, t),
        harmonicBlending: lerp(from.audio.harmonicBlending, to.audio.harmonicBlending, t),
      },
    };
  }

  setPhase(phase: CeremonyPhase, startTime: number, duration: number): void {
    this.previousPhase = this.currentPhase;
    this.currentPhase = phase;
    this.phaseStartTime = startTime;
    this.phaseDuration = duration;
    this.transitionProgress = 0;
    this.onPhaseChange?.(phase);
  }

  update(_delta: number): void {
    if (this.transitionProgress < 1.0) {
      const elapsed = Date.now() - this.phaseStartTime;
      this.transitionProgress = Math.min(
        elapsed / PHASE_TRANSITION_DURATION,
        1.0
      );
    }
  }

  /** Get time remaining in current phase (ms) */
  get timeRemaining(): number {
    if (this.phaseDuration === Infinity) return Infinity;
    const elapsed = Date.now() - this.phaseStartTime;
    return Math.max(0, this.phaseDuration - elapsed);
  }

  /** Get progress through current phase (0-1) */
  get phaseProgress(): number {
    if (this.phaseDuration === Infinity) return 0;
    const elapsed = Date.now() - this.phaseStartTime;
    return Math.min(elapsed / this.phaseDuration, 1.0);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
