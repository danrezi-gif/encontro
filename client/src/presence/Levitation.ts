import * as THREE from "three";

/**
 * Levitation — spontaneous ascent toward the sky.
 *
 * After a brief grounding period, the user begins to rise continuously.
 * The rise accelerates gently, creating the feeling of being lifted
 * by the body of light. Hand gestures modulate direction and speed:
 *   - Hands raised → rise faster
 *   - Hands extended forward → drift forward faster
 *   - Lateral hand offset → steer sideways
 *
 * There is no ceiling. The user ascends into the sky.
 */
export class Levitation {
  /** World offset — applied to the environment root group each frame.
   *  Negative Y = world moves down = user appears to rise. */
  readonly offset = new THREE.Vector3(0, 0, 0);

  /** Current height above starting position (positive = higher). */
  get height(): number {
    return -this.offset.y;
  }

  // ── State ──────────────────────────────────────────────────
  private groundingTimer = 0;
  private riseSpeed = 0;
  private isRising = false;

  // ── Drift accumulator (world-space XZ) ──────────────────────
  private driftVelocity = new THREE.Vector3(0, 0, 0);

  // ── Temp vectors ───────────────────────────────────────────
  private _avgHand = new THREE.Vector3();
  private _handDelta = new THREE.Vector3();

  // ── Tuning ─────────────────────────────────────────────────
  /** Seconds before levitation begins */
  private readonly GROUNDING_DURATION = 1.5;
  /** Rise acceleration (m/s²) — slow base, hands provide the main lift */
  private readonly RISE_ACCEL = 0.02;
  /** Maximum rise speed (m/s) */
  private readonly RISE_MAX_SPEED = 0.8;
  /** Base forward drift speed (m/s), scales with height */
  private readonly DRIFT_FORWARD = 0.12;
  /** How much hands-up accelerates rise — PRIMARY vertical control */
  private readonly HAND_UP_GAIN = 0.5;
  /** How much hands-forward amplifies drift — PRIMARY horizontal control */
  private readonly HAND_FORWARD_GAIN = 0.5;
  /** How much lateral hand offset steers */
  private readonly HAND_LATERAL_GAIN = 0.25;

  // ─────────────────────────────────────────────────────────────
  update(
    delta: number,
    _elapsed: number,
    headPos: THREE.Vector3,
    _headVelocity: THREE.Vector3,
    leftHandPos: THREE.Vector3,
    rightHandPos: THREE.Vector3,
    leftActive: boolean,
    rightActive: boolean,
    _leftHandSpeed: number,
    _rightHandSpeed: number,
    headForward: THREE.Vector3,
  ): void {
    // ── Grounding pause ────────────────────────────────────────
    if (!this.isRising) {
      this.groundingTimer += delta;
      if (this.groundingTimer >= this.GROUNDING_DURATION) {
        this.isRising = true;
      }
      return;
    }

    // ── Compute hand influence ─────────────────────────────────
    let handUpInfluence = 0;
    let handForwardInfluence = 0;
    let handLateralInfluence = 0;

    if (leftActive || rightActive) {
      this._avgHand.set(0, 0, 0);
      let count = 0;
      if (leftActive) { this._avgHand.add(leftHandPos); count++; }
      if (rightActive) { this._avgHand.add(rightHandPos); count++; }
      if (count > 0) this._avgHand.divideScalar(count);

      // Hand position relative to head
      this._handDelta.subVectors(this._avgHand, headPos);

      // Hands above head → rise faster (neutral at -0.15 = resting position)
      const relY = this._handDelta.y + 0.15;
      handUpInfluence = Math.max(0, relY) * this.HAND_UP_GAIN;

      // Hands extended forward → drift faster
      handForwardInfluence = Math.max(0, this._handDelta.dot(headForward)) * this.HAND_FORWARD_GAIN;

      // Lateral offset → steer
      const right = new THREE.Vector3()
        .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
        .normalize();
      handLateralInfluence = this._handDelta.dot(right) * this.HAND_LATERAL_GAIN;
    }

    // ── Rise ───────────────────────────────────────────────────
    // Gentle acceleration, boosted by hands-up gesture
    this.riseSpeed += (this.RISE_ACCEL + handUpInfluence) * delta;
    this.riseSpeed = Math.min(this.riseSpeed, this.RISE_MAX_SPEED);

    this.offset.y -= this.riseSpeed * delta;

    // ── Forward drift (increases with height) ──────────────────
    const height = this.height;
    const heightFactor = Math.min(1, height * 0.15); // ramps over ~7m
    const driftMag = this.DRIFT_FORWARD * heightFactor + handForwardInfluence;

    this.driftVelocity.set(
      -headForward.x * driftMag,
      0,
      -headForward.z * driftMag,
    );

    // Lateral steering
    if (Math.abs(handLateralInfluence) > 0.001) {
      const right = new THREE.Vector3()
        .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
        .normalize();
      this.driftVelocity.addScaledVector(right, -handLateralInfluence);
    }

    this.offset.x += this.driftVelocity.x * delta;
    this.offset.z += this.driftVelocity.z * delta;
  }

  /** Reset to grounding (e.g. when re-entering VR). */
  reset(): void {
    this.groundingTimer = 0;
    this.riseSpeed = 0;
    this.isRising = false;
    this.offset.set(0, 0, 0);
    this.driftVelocity.set(0, 0, 0);
  }
}
