/**
 * Optional: derive biometric signals from controller input.
 * Heart rate estimation from micro-tremor in controller tracking.
 *
 * TODO: Research feasibility
 * - Quest controllers have limited tracking precision
 * - May need to detect breathing from head movement patterns instead
 * - Low priority — focus on core experience first
 */
export class BiometricsEstimator {
  private samples: number[] = [];

  /** Feed position samples to detect breathing rhythm */
  addSample(headY: number): void {
    this.samples.push(headY);
    if (this.samples.length > 300) {
      this.samples.shift();
    }
  }

  /** Estimate breath rate in Hz (very approximate) */
  estimateBreathRate(): number | null {
    if (this.samples.length < 60) return null;
    // TODO: FFT-based breath detection from head bob
    return null;
  }
}
