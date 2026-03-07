import * as THREE from "three";

/**
 * Levitation — head-directed soul flight.
 *
 * After a brief grounding period, the user begins to gently lift.
 * Head direction is the PRIMARY flight vector — look up to ascend,
 * look forward to glide, look down to descend slowly.
 * Hands provide thrust (extend arms = more speed) and fine steering
 * (lateral hand offset = banking).
 *
 * The result is a dreamy, floating-soul flight experience.
 * There is no ceiling. The user flies freely through space.
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

  // ── Velocity (scene-space, smoothed) ───────────────────────
  private velocity = new THREE.Vector3(0, 0, 0);

  // ── Temp vectors ───────────────────────────────────────────
  private _avgHand = new THREE.Vector3();
  private _handDelta = new THREE.Vector3();

  // ── Tuning ─────────────────────────────────────────────────
  /** Seconds before flight begins */
  private readonly GROUNDING_DURATION = 1.5;
  /** Gentle initial lift speed (m/s) — soft start before head takes over */
  private readonly INITIAL_LIFT = 0.15;
  /** Base thrust when hands are at rest (m/s²) — gentle drift in look dir */
  private readonly BASE_THRUST = 0.08;
  /** Thrust gain from hand extension (m/s² per unit) */
  private readonly HAND_THRUST_GAIN = 0.6;
  /** How much head direction steers (lerp factor per second) */
  private readonly STEER_RATE = 2.5;
  /** Maximum speed (m/s) */
  private readonly MAX_SPEED = 1.2;
  /** Velocity damping — dreamy deceleration */
  private readonly DAMPING = 0.92;
  /** Lateral hand steering gain */
  private readonly LATERAL_GAIN = 0.4;
  /** Minimum upward bias so user doesn't crash into ground */
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
    headDirection: THREE.Vector3, // full 3D look direction (not flattened)
  ): void {
    // ── Grounding pause ────────────────────────────────────────
    if (!this.isRising) {
      this.groundingTimer += delta;
      if (this.groundingTimer >= this.GROUNDING_DURATION) {
        this.isRising = true;
      }
      return;
    }

    // ── Head look direction = flight direction ─────────────────
    // Full 3D direction: look up → fly up, look forward → glide
    const flyDir = headDirection.clone().normalize();

    // ── Hand influence ──────────────────────────────────────────
    let handThrust = 0;
    let lateralSteer = 0;

    if (leftActive || rightActive) {
      this._avgHand.set(0, 0, 0);
      let count = 0;
      if (leftActive) { this._avgHand.add(leftHandPos); count++; }
      if (rightActive) { this._avgHand.add(rightHandPos); count++; }
      if (count > 0) this._avgHand.divideScalar(count);

      // Hand position relative to head
      this._handDelta.subVectors(this._avgHand, headPos);

      // Hand extension forward = thrust (how far hands are from body)
      const forwardExt = Math.max(0, this._handDelta.dot(headForward));
      // Hands raised = thrust (arms up or out = go faster)
      const handSpread = leftActive && rightActive
        ? leftHandPos.distanceTo(rightHandPos)
        : 0;
      const raiseComponent = Math.max(0, this._handDelta.y + 0.1);

      handThrust = (forwardExt * 1.5 + raiseComponent * 0.8 + handSpread * 0.3) * this.HAND_THRUST_GAIN;

      // Lateral offset → banking/steering
      const right = new THREE.Vector3()
        .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
        .normalize();
      lateralSteer = this._handDelta.dot(right) * this.LATERAL_GAIN;
    }

    // ── Compute acceleration ─────────────────────────────────
    const thrust = this.BASE_THRUST + handThrust;

    // Desired velocity direction: mostly head, with lateral hand offset
    const desiredDir = flyDir.clone();

    // Add lateral steering from hands
    if (Math.abs(lateralSteer) > 0.001) {
      const right = new THREE.Vector3()
        .crossVectors(headForward, new THREE.Vector3(0, 1, 0))
        .normalize();
      desiredDir.addScaledVector(right, lateralSteer);
      desiredDir.normalize();
    }

    // Always add a gentle upward bias in early flight
    const heightBias = this.height < 3.0
      ? this.INITIAL_LIFT * (1.0 - this.height / 3.0)
      : 0;

    // Accelerate toward desired direction
    this.velocity.addScaledVector(desiredDir, thrust * delta);

    // Add initial lift bias
    if (heightBias > 0) {
      this.velocity.y += heightBias * delta;
    }

    // Damping for dreamy feel
    const damping = Math.pow(this.DAMPING, delta * 60);
    this.velocity.multiplyScalar(damping);

    // Clamp speed
    const speed = this.velocity.length();
    if (speed > this.MAX_SPEED) {
      this.velocity.multiplyScalar(this.MAX_SPEED / speed);
    }

    // Prevent going below ground
    const projectedHeight = this.height + this.velocity.y * delta;
    if (projectedHeight < this.MIN_HEIGHT && this.velocity.y < 0) {
      this.velocity.y *= 0.3; // soft ground bounce
    }

    // ── Apply to world offset ────────────────────────────────
    // Negative because world moves opposite to user
    this.offset.x -= this.velocity.x * delta;
    this.offset.y -= this.velocity.y * delta;
    this.offset.z -= this.velocity.z * delta;
  }

  /** Reset to grounding (e.g. when re-entering VR). */
  reset(): void {
    this.groundingTimer = 0;
    this.isRising = false;
    this.offset.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
  }
}
