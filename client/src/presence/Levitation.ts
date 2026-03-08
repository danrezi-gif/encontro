import * as THREE from "three";

/**
 * Levitation — head-directed soul flight.
 *
 * The user spontaneously begins to levitate after a brief grounding.
 * A gentle, continuous upward pull lifts the soul. Head direction
 * steers — look up to ascend faster, look forward to glide, look
 * down to slow the rise. Hands provide thrust and lateral steering.
 *
 * Physics: linear drag model. Steady-state speed = thrust / drag.
 * This guarantees visible movement with predictable, tunable feel.
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
  private isRising = false;

  // ── Velocity (scene-space) ─────────────────────────────────
  private velocity = new THREE.Vector3(0, 0, 0);

  // ── Temp vectors ───────────────────────────────────────────
  private _avgHand = new THREE.Vector3();
  private _handDelta = new THREE.Vector3();

  // ── Tuning ─────────────────────────────────────────────────
  // Grounding
  private readonly GROUNDING_DURATION = 1.5;

  // Spontaneous lift — always pulls the soul upward
  // Steady-state rise = AUTO_LIFT / DRAG ≈ 0.5 / 1.2 ≈ 0.42 m/s
  private readonly AUTO_LIFT = 0.5;

  // Head-directed flight
  // When looking forward: adds ~0.6/1.2 = 0.5 m/s in gaze direction
  private readonly HEAD_THRUST = 0.6;

  // Hand boost — extending arms amplifies speed
  // Max hand contribution ~1.8 → total thrust ~2.9 → speed ~2.4 m/s
  private readonly HAND_THRUST_GAIN = 1.2;

  // Steering
  private readonly LATERAL_GAIN = 0.5;

  // Drag — linear drag. Higher = more resistance, lower top speed
  // All forces reach steady-state at force/drag m/s
  private readonly DRAG = 1.2;

  // Speed limit
  private readonly MAX_SPEED = 2.5;

  // Floor
  private readonly MIN_HEIGHT = 0.0;

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
    headDirection: THREE.Vector3,
  ): void {
    // ── Grounding pause ────────────────────────────────────────
    if (!this.isRising) {
      this.groundingTimer += delta;
      if (this.groundingTimer >= this.GROUNDING_DURATION) {
        this.isRising = true;
      }
      return;
    }

    // Clamp delta to avoid physics explosion on lag spikes
    const dt = Math.min(delta, 0.05);

    // ── 1. Spontaneous upward lift (always active) ─────────────
    this.velocity.y += this.AUTO_LIFT * dt;

    // ── 2. Head-directed thrust ────────────────────────────────
    // Full 3D gaze direction — look up = fly up faster, look
    // forward = glide horizontally, look down = counteract lift
    const gaze = headDirection.clone().normalize();
    this.velocity.addScaledVector(gaze, this.HEAD_THRUST * dt);

    // ── 3. Hand thrust + steering ──────────────────────────────
    if (leftActive || rightActive) {
      this._avgHand.set(0, 0, 0);
      let count = 0;
      if (leftActive) { this._avgHand.add(leftHandPos); count++; }
      if (rightActive) { this._avgHand.add(rightHandPos); count++; }
      if (count > 0) this._avgHand.divideScalar(count);

      // Hand offset from head
      this._handDelta.subVectors(this._avgHand, headPos);

      // Forward extension = thrust boost
      const forwardExt = Math.max(0, this._handDelta.dot(headForward));

      // Arms raised = upward thrust
      const raiseExt = Math.max(0, this._handDelta.y + 0.15);

      // Arms spread = general thrust
      const spread = leftActive && rightActive
        ? Math.max(0, leftHandPos.distanceTo(rightHandPos) - 0.3)
        : 0;

      const handMagnitude =
        (forwardExt * 2.0 + raiseExt * 1.0 + spread * 0.5)
        * this.HAND_THRUST_GAIN;

      // Apply hand thrust in gaze direction
      this.velocity.addScaledVector(gaze, handMagnitude * dt);

      // Lateral steering — hands offset left/right banks the flight
      const right = new THREE.Vector3()
        .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
        .normalize();
      const lateral = this._handDelta.dot(right) * this.LATERAL_GAIN;
      this.velocity.addScaledVector(right, lateral * dt);
    }

    // ── 4. Linear drag ─────────────────────────────────────────
    // v' = v - v * drag * dt  →  steady state: v = thrust / drag
    const dragFactor = 1.0 - this.DRAG * dt;
    this.velocity.multiplyScalar(Math.max(dragFactor, 0));

    // ── 5. Speed cap ───────────────────────────────────────────
    const speed = this.velocity.length();
    if (speed > this.MAX_SPEED) {
      this.velocity.multiplyScalar(this.MAX_SPEED / speed);
    }

    // ── 6. Floor constraint ────────────────────────────────────
    const nextHeight = this.height + this.velocity.y * dt;
    if (nextHeight < this.MIN_HEIGHT && this.velocity.y < 0) {
      this.velocity.y *= 0.1;
    }

    // ── 7. Apply to world offset ───────────────────────────────
    this.offset.x -= this.velocity.x * dt;
    this.offset.y -= this.velocity.y * dt;
    this.offset.z -= this.velocity.z * dt;
  }

  /** Reset to grounding (e.g. when re-entering VR). */
  reset(): void {
    this.groundingTimer = 0;
    this.isRising = false;
    this.offset.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
  }
}
