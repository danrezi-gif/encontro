import * as THREE from "three";

/**
 * Levitation system — the user's body of light slowly rises from the ground
 * and drifts forward when stillness is detected.
 *
 * Works by translating a world-root group downward/backward, so the user
 * (whose position is locked to XR tracking) appears to float upward.
 *
 * Phases:
 *   grounding  → user just entered, standing on the meadow, settling in
 *   lifting    → stillness detected, slow rise begins (ease-in)
 *   floating   → hovering, gentle drift, hand gestures subtly influence movement
 */
export class Levitation {
  /** World offset — applied to the environment root group each frame.
   *  Negative Y = world moves down = user appears to rise. */
  readonly offset = new THREE.Vector3(0, 0, 0);

  /** Current height above starting position (positive = higher). */
  get height(): number {
    return -this.offset.y;
  }

  /** Normalized lift progress 0..1 */
  get progress(): number {
    return this.liftProgress;
  }

  // ── Phase state ──────────────────────────────────────────────
  private phase: "grounding" | "lifting" | "floating" = "grounding";
  private stillnessTimer = 0;
  private liftProgress = 0; // 0→1 over the full rise

  // ── Drift accumulator (world-space XZ) ───────────────────────
  private driftVelocity = new THREE.Vector3(0, 0, 0);

  // ── Bobbing ──────────────────────────────────────────────────
  private bobPhase = 0;

  // ── Temp vectors (reused to avoid GC) ────────────────────────
  private _avgHand = new THREE.Vector3();
  private _handDelta = new THREE.Vector3();

  // ── Tuning constants ─────────────────────────────────────────
  /** Total body activity (m/s) below which we count as "still" */
  private readonly STILLNESS_THRESHOLD = 0.3;
  /** Seconds of stillness before lift begins */
  private readonly STILLNESS_REQUIRED = 3.0;
  /** Maximum height the user can reach (metres) */
  private readonly MAX_HEIGHT = 4.0;
  /** Base lift rate (metres/sec at full ease) */
  private readonly LIFT_RATE = 0.12;
  /** Forward drift speed at full height (metres/sec) */
  private readonly DRIFT_FORWARD = 0.2;
  /** How much hand vertical gesture influences height (metres/sec per metre offset) */
  private readonly HAND_VERTICAL_GAIN = 0.15;
  /** How much hand lateral spread influences drift direction (metres/sec per metre offset) */
  private readonly HAND_LATERAL_GAIN = 0.06;
  /** Bobbing amplitude (metres) */
  private readonly BOB_AMPLITUDE = 0.06;
  /** Bobbing frequency (rad/sec) */
  private readonly BOB_FREQ = 0.7;

  // ─────────────────────────────────────────────────────────────
  update(
    delta: number,
    elapsed: number,
    headPos: THREE.Vector3,
    headVelocity: THREE.Vector3,
    leftHandPos: THREE.Vector3,
    rightHandPos: THREE.Vector3,
    leftActive: boolean,
    rightActive: boolean,
    leftHandSpeed: number,
    rightHandSpeed: number,
    headForward: THREE.Vector3,
  ): void {
    // ── Measure overall activity ───────────────────────────────
    const headSpeed = headVelocity.length();
    const handActivity =
      (leftActive ? leftHandSpeed : 0) + (rightActive ? rightHandSpeed : 0);
    const totalActivity = headSpeed + handActivity * 0.5;

    switch (this.phase) {
      // ── GROUNDING ─────────────────────────────────────────────
      case "grounding":
        if (totalActivity < this.STILLNESS_THRESHOLD) {
          this.stillnessTimer += delta;
          if (this.stillnessTimer >= this.STILLNESS_REQUIRED) {
            this.phase = "lifting";
          }
        } else {
          // Reset timer quickly if the user moves
          this.stillnessTimer = Math.max(
            0,
            this.stillnessTimer - delta * 2,
          );
        }
        break;

      // ── LIFTING ───────────────────────────────────────────────
      case "lifting": {
        this.liftProgress = Math.min(
          1,
          this.liftProgress + delta * this.LIFT_RATE,
        );
        const eased = easeInOutCubic(this.liftProgress);

        // Rise
        this.offset.y = -eased * this.MAX_HEIGHT;

        // Begin gentle forward drift (ramps in with height)
        const forwardDrift = this.DRIFT_FORWARD * eased * delta;
        this.offset.x -= headForward.x * forwardDrift;
        this.offset.z -= headForward.z * forwardDrift;

        // Transition to floating once noticeably airborne
        if (this.liftProgress >= 0.25) {
          this.phase = "floating";
        }
        break;
      }

      // ── FLOATING ──────────────────────────────────────────────
      case "floating": {
        // Continue slow rise toward max
        this.liftProgress = Math.min(
          1,
          this.liftProgress + delta * this.LIFT_RATE * 0.25,
        );
        const eased = easeInOutCubic(this.liftProgress);

        // ── Hand-based height influence ────────────────────────
        let handHeightDelta = 0;
        let handLateralDelta = 0;
        let handsActive = 0;

        if (leftActive || rightActive) {
          // Average hand position
          this._avgHand.set(0, 0, 0);
          if (leftActive) {
            this._avgHand.add(leftHandPos);
            handsActive++;
          }
          if (rightActive) {
            this._avgHand.add(rightHandPos);
            handsActive++;
          }
          if (handsActive > 0) {
            this._avgHand.divideScalar(handsActive);
          }

          // Hand height relative to head → vertical influence
          // Hands above head = rise, below chest = descend slightly
          const handRelativeY = this._avgHand.y - headPos.y;
          // Positive when hands above head, negative when below
          // Neutral zone: -0.3 to 0.0 (normal resting position)
          const neutralY = -0.15;
          handHeightDelta =
            (handRelativeY - neutralY) * this.HAND_VERTICAL_GAIN;

          // Lateral hand offset relative to facing → drift direction
          // Project average hand position onto the right vector
          const right = new THREE.Vector3()
            .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
            .normalize();
          this._handDelta.copy(this._avgHand).sub(headPos);
          handLateralDelta =
            this._handDelta.dot(right) * this.HAND_LATERAL_GAIN;
        }

        // Base height from progress curve
        let targetY = -eased * this.MAX_HEIGHT;

        // Modulate with hand influence (clamped)
        targetY -= handHeightDelta * delta * 60; // scale to frame-rate independent
        targetY = Math.max(-this.MAX_HEIGHT, Math.min(0, targetY));

        // Smooth toward target
        this.offset.y += (targetY - this.offset.y) * Math.min(1, delta * 2);

        // ── Forward drift ──────────────────────────────────────
        const driftMag = this.DRIFT_FORWARD * eased;
        // Base forward
        this.driftVelocity.set(
          -headForward.x * driftMag,
          0,
          -headForward.z * driftMag,
        );
        // Lateral hand influence
        const right2 = new THREE.Vector3()
          .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
          .normalize();
        this.driftVelocity.addScaledVector(right2, -handLateralDelta);

        this.offset.x += this.driftVelocity.x * delta;
        this.offset.z += this.driftVelocity.z * delta;

        // ── Gentle bobbing ─────────────────────────────────────
        this.bobPhase += delta * this.BOB_FREQ;
        const bob = Math.sin(this.bobPhase) * this.BOB_AMPLITUDE * eased;
        this.offset.y += bob;

        break;
      }
    }
  }

  /** Reset to grounding phase (e.g. when re-entering VR). */
  reset(): void {
    this.phase = "grounding";
    this.stillnessTimer = 0;
    this.liftProgress = 0;
    this.offset.set(0, 0, 0);
    this.driftVelocity.set(0, 0, 0);
    this.bobPhase = 0;
  }

  /** Current phase name (useful for debugging / UI). */
  get currentPhase(): string {
    return this.phase;
  }
}

// ── Utils ────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
