/**
 * Post-encounter residual effects.
 * After a merge, each presence retains a subtle color trace
 * borrowed from the other participant.
 *
 * TODO: Implement trace mechanics
 * - Color shift persistence after merge release
 * - Gradual fade over time
 * - Visual "memory" of the encounter
 */
export class TraceSystem {
  private traces = new Map<string, TraceData>();

  addTrace(fromUserId: string, colorHue: number): void {
    this.traces.set(fromUserId, {
      hue: colorHue,
      intensity: 1.0,
      createdAt: Date.now(),
    });
  }

  getTraces(): TraceData[] {
    return Array.from(this.traces.values());
  }

  update(_delta: number): void {
    // TODO: Fade traces over time
  }

  dispose(): void {
    this.traces.clear();
  }
}

interface TraceData {
  hue: number;
  intensity: number;
  createdAt: number;
}
