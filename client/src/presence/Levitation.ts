import * as THREE from "three";

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  LEVITATION — TUNABLE PARAMETERS                                    ║
// ║  All flight‑feel constants live here for fast iteration.            ║
// ║  Search "PARAM:" to jump to any constant.                           ║
// ╚══════════════════════════════════════════════════════════════════════╝

/** PARAM: Seconds of stillness before flight begins. */
const GROUNDING_DURATION = 1.5;

/** PARAM: Gentle upward speed (m/s) during first metres of lift. */
const INITIAL_LIFT = 0.4;

/** PARAM: Height (m) at which INITIAL_LIFT fades to zero. */
const INITIAL_LIFT_FADE = 3.0;

// ── Thrust ───────────────────────────────────────────────────────────
/** PARAM: Passive drift acceleration in look‑direction (m/s²). */
const BASE_THRUST = 0.3;

/** PARAM: Maximum acceleration from hand gestures (m/s²). */
const MAX_HAND_THRUST = 3.0;

/** PARAM: Weight of forward arm extension in thrust formula (0‑1). */
const THRUST_W_FORWARD = 0.50;

/** PARAM: Weight of arm raise component in thrust formula (0‑1). */
const THRUST_W_RAISE = 0.30;

/** PARAM: Weight of hand spread (both arms out) in thrust formula (0‑1). */
const THRUST_W_SPREAD = 0.20;

// ── Steering ─────────────────────────────────────────────────────────
/** PARAM: Exponential steering blend rate (higher = snappier turning). */
const STEER_RATE = 3.0;

/** PARAM: Lateral hand offset → yaw correction gain. */
const HAND_STEER_GAIN = 0.5;

/** PARAM: Average hand height vs head → pitch bias gain. */
const HAND_PITCH_GAIN = 0.3;

// ── Speed limits ─────────────────────────────────────────────────────
/** PARAM: Hard speed cap (m/s). */
const MAX_SPEED = 4.0;

/** PARAM: Maximum acceleration magnitude (m/s²) — VR comfort. */
const MAX_ACCEL = 2.0;

// ── Damping (frame‑rate independent half‑life model) ─────────────────
/**
 * PARAM: Horizontal velocity half‑life (seconds).
 * velocity_xz *= pow(0.5, dt / HALF_LIFE_H) each frame.
 * 2.5 s → dreamy glide that still responds to steering.
 */
const HALF_LIFE_H = 2.5;

/**
 * PARAM: Vertical velocity half‑life (seconds).
 * Shorter than horizontal so the user settles vertically faster,
 * reducing the stomach‑drop feeling.
 */
const HALF_LIFE_V = 1.8;

// ── Gravity / Buoyancy ───────────────────────────────────────────────
/** PARAM: Subtle downward pull (m/s²). ~3 % of real gravity. */
const GRAVITY = 0.25;

/** PARAM: Natural floating equilibrium height (m). */
const BUOYANCY_HEIGHT = 5.0;

/** PARAM: Strength of pull toward BUOYANCY_HEIGHT (m/s²). */
const BUOYANCY_STRENGTH = 0.15;

// ── Ground repulsion ─────────────────────────────────────────────────
/** PARAM: Height (m) below which ground repulsion activates. */
const GROUND_REPULSION_CEIL = 1.0;

/** PARAM: Peak repulsion acceleration (m/s² at height = 0). */
const GROUND_REPULSION_K = 2.0;

// ── Hand tracking robustness ─────────────────────────────────────────
/** PARAM: Seconds to coast on last hand values after tracking loss. */
const GRACE_PERIOD = 0.5;

// ── One‑Euro filter defaults ─────────────────────────────────────────
/** PARAM: Minimum cutoff Hz (lower = smoother, more latency). */
const FILTER_MIN_CUTOFF = 1.5;

/** PARAM: Speed coefficient — higher means less smoothing at high speed. */
const FILTER_BETA = 0.007;

/** PARAM: Derivative smoothing cutoff Hz. */
const FILTER_D_CUTOFF = 1.0;

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ONE‑EURO FILTER — adaptive low‑pass for hand positions             ║
// ╚══════════════════════════════════════════════════════════════════════╝

class LowPass {
  private s = 0;
  private initialized = false;
  filter(x: number, alpha: number): number {
    if (!this.initialized) { this.s = x; this.initialized = true; return x; }
    this.s = alpha * x + (1 - alpha) * this.s;
    return this.s;
  }
  reset(): void { this.initialized = false; }
}

function smoothingFactor(dt: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
}

class OneEuroFilter {
  private x = new LowPass();
  private dx = new LowPass();
  private lastX = 0;
  private initialized = false;

  constructor(
    private minCutoff = FILTER_MIN_CUTOFF,
    private beta = FILTER_BETA,
    private dCutoff = FILTER_D_CUTOFF,
  ) {}

  filter(x: number, dt: number): number {
    const dx = this.initialized ? (x - this.lastX) / dt : 0;
    this.initialized = true;
    this.lastX = x;

    const edx = this.dx.filter(dx, smoothingFactor(dt, this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(x, smoothingFactor(dt, cutoff));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.initialized = false;
  }
}

class Vec3Filter {
  private fx = new OneEuroFilter();
  private fy = new OneEuroFilter();
  private fz = new OneEuroFilter();

  filter(v: THREE.Vector3, dt: number, out: THREE.Vector3): THREE.Vector3 {
    out.set(
      this.fx.filter(v.x, dt),
      this.fy.filter(v.y, dt),
      this.fz.filter(v.z, dt),
    );
    return out;
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  LEVITATION CLASS                                                   ║
// ╚══════════════════════════════════════════════════════════════════════╝

/**
 * Levitation — head‑directed soul flight with hand‑tracking steering.
 *
 * After a brief grounding period the user begins to gently lift.
 * Head direction is the PRIMARY flight vector (look up → ascend,
 * look forward → glide, look down → descend).
 * Hands modulate thrust (arm extension = speed) and add fine steering
 * (lateral offset = banking/yaw, vertical offset = pitch bias).
 *
 * Physics are fully frame‑rate independent.
 * The world moves — the camera never does — for VR comfort.
 */
export class Levitation {
  // ── Public API ─────────────────────────────────────────────
  /** World offset — applied to the environment root group each frame.
   *  Negative Y = world moves down = user appears to rise. */
  readonly offset = new THREE.Vector3(0, 0, 0);

  /** Current height above starting position (positive = higher). */
  get height(): number {
    return -this.offset.y;
  }

  // ── Internal state ─────────────────────────────────────────
  private groundingTimer = 0;
  private isRising = false;
  private velocity = new THREE.Vector3(0, 0, 0);

  // Hand tracking grace period
  private lastHandThrust = 0;
  private lastLateralSteer = 0;
  private lastPitchBias = 0;
  private timeSinceHands = 0;

  // ── Filters ────────────────────────────────────────────────
  private leftHandFilter = new Vec3Filter();
  private rightHandFilter = new Vec3Filter();

  // ── Scratch vectors (avoid GC) ─────────────────────────────
  private _filteredLeft = new THREE.Vector3();
  private _filteredRight = new THREE.Vector3();
  private _avgHand = new THREE.Vector3();
  private _handDelta = new THREE.Vector3();
  private _desiredDir = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _accel = new THREE.Vector3();

  // ─────────────────────────────────────────────────────────────
  // UPDATE
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
    headDirection: THREE.Vector3,
  ): void {
    // Keep signature stable — mark deliberately‑unused params
    void elapsed;
    void headVelocity;
    void leftHandSpeed;
    void rightHandSpeed;

    // ── Clamp dt to prevent physics explosions (tab‑switch) ────
    const dt = Math.min(delta, 0.1);

    // ── Grounding phase ────────────────────────────────────────
    if (!this.isRising) {
      this.groundingTimer += dt;
      if (this.groundingTimer >= GROUNDING_DURATION) {
        this.isRising = true;
      }
      return;
    }

    // ── Filter hand positions ──────────────────────────────────
    const fLeft = this.leftHandFilter.filter(leftHandPos, dt, this._filteredLeft);
    const fRight = this.rightHandFilter.filter(rightHandPos, dt, this._filteredRight);

    // ── Head look → primary flight direction ───────────────────
    const flyDir = this._desiredDir.copy(headDirection).normalize();

    // ── Right axis (head‑space) ────────────────────────────────
    this._right.crossVectors(headForward, new THREE.Vector3(0, 1, 0)).normalize();

    // ── Hand influence ──────────────────────────────────────────
    const handsAvailable = leftActive || rightActive;
    let handThrust = 0;
    let lateralSteer = 0;
    let pitchBias = 0;

    if (handsAvailable) {
      this.timeSinceHands = 0;

      // Average hand position
      this._avgHand.set(0, 0, 0);
      let count = 0;
      if (leftActive) { this._avgHand.add(fLeft); count++; }
      if (rightActive) { this._avgHand.add(fRight); count++; }
      if (count > 0) this._avgHand.divideScalar(count);

      // Delta from head to average hand
      this._handDelta.subVectors(this._avgHand, headPos);

      // ─ Thrust components ─
      const forwardExt = Math.max(0, this._handDelta.dot(headForward));
      const raiseComponent = Math.max(0, this._handDelta.y + 0.1);
      const handSpread = (leftActive && rightActive)
        ? fLeft.distanceTo(fRight)
        : 0;

      // Weighted sum → 0‑1 normalized → scale by MAX_HAND_THRUST
      const raw = forwardExt * THRUST_W_FORWARD
                + raiseComponent * THRUST_W_RAISE
                + handSpread * THRUST_W_SPREAD;
      handThrust = Math.min(raw * 2.0, 1.0) * MAX_HAND_THRUST;

      // ─ Lateral steering (yaw) ─
      lateralSteer = this._handDelta.dot(this._right) * HAND_STEER_GAIN;

      // ─ Pitch bias (hand height vs head) ─
      pitchBias = this._handDelta.y * HAND_PITCH_GAIN;

      // Cache for grace period
      this.lastHandThrust = handThrust;
      this.lastLateralSteer = lateralSteer;
      this.lastPitchBias = pitchBias;
    } else {
      // Grace period — coast on last values, fading out
      this.timeSinceHands += dt;
      if (this.timeSinceHands < GRACE_PERIOD) {
        const fade = 1.0 - this.timeSinceHands / GRACE_PERIOD;
        handThrust = this.lastHandThrust * fade;
        lateralSteer = this.lastLateralSteer * fade;
        pitchBias = this.lastPitchBias * fade;
      }
    }

    // ── Desired flight direction ────────────────────────────────
    if (Math.abs(lateralSteer) > 0.001) {
      flyDir.addScaledVector(this._right, lateralSteer);
    }
    if (Math.abs(pitchBias) > 0.001) {
      flyDir.y += pitchBias;
    }
    flyDir.normalize();

    // ── Steer velocity toward desired direction ─────────────────
    const speed = this.velocity.length();
    if (speed > 0.01) {
      const steerT = 1 - Math.exp(-STEER_RATE * dt);
      const velDir = this.velocity.clone().normalize();
      velDir.lerp(flyDir, steerT).normalize();
      this.velocity.copy(velDir).multiplyScalar(speed);
    }

    // ── Compute acceleration ────────────────────────────────────
    const totalThrust = BASE_THRUST + handThrust;
    this._accel.set(0, 0, 0);

    // Thrust in flight direction
    this._accel.addScaledVector(flyDir, totalThrust);

    // Initial lift bias (fades with height)
    if (this.height < INITIAL_LIFT_FADE) {
      const liftBias = INITIAL_LIFT * (1.0 - this.height / INITIAL_LIFT_FADE);
      this._accel.y += liftBias;
    }

    // Gravity (subtle downward)
    this._accel.y -= GRAVITY;

    // Buoyancy toward natural float height
    const buoyancyOffset = BUOYANCY_HEIGHT - this.height;
    this._accel.y += buoyancyOffset * BUOYANCY_STRENGTH;

    // Ground repulsion (quadratic ramp below ceiling)
    if (this.height < GROUND_REPULSION_CEIL) {
      const t = 1.0 - this.height / GROUND_REPULSION_CEIL;
      this._accel.y += GROUND_REPULSION_K * t * t;
    }

    // ── Clamp acceleration for VR comfort ───────────────────────
    const accelMag = this._accel.length();
    if (accelMag > MAX_ACCEL) {
      this._accel.multiplyScalar(MAX_ACCEL / accelMag);
    }

    // ── Integrate velocity ──────────────────────────────────────
    this.velocity.addScaledVector(this._accel, dt);

    // ── Anisotropic damping (frame‑rate independent) ────────────
    const dampH = Math.pow(0.5, dt / HALF_LIFE_H);
    const dampV = Math.pow(0.5, dt / HALF_LIFE_V);
    this.velocity.x *= dampH;
    this.velocity.z *= dampH;
    this.velocity.y *= dampV;

    // ── Speed cap ───────────────────────────────────────────────
    const finalSpeed = this.velocity.length();
    if (finalSpeed > MAX_SPEED) {
      this.velocity.multiplyScalar(MAX_SPEED / finalSpeed);
    }

    // ── Soft ground clamp ───────────────────────────────────────
    const projectedHeight = this.height + this.velocity.y * dt;
    if (projectedHeight < 0 && this.velocity.y < 0) {
      this.velocity.y *= 0.1;
    }

    // ── Apply to world offset ───────────────────────────────────
    this.offset.x -= this.velocity.x * dt;
    this.offset.y -= this.velocity.y * dt;
    this.offset.z -= this.velocity.z * dt;
  }

  // ─────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────
  /** Reset to grounding (e.g. when re‑entering VR). */
  reset(): void {
    this.groundingTimer = 0;
    this.isRising = false;
    this.offset.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.lastHandThrust = 0;
    this.lastLateralSteer = 0;
    this.lastPitchBias = 0;
    this.timeSinceHands = 0;
    this.leftHandFilter.reset();
    this.rightHandFilter.reset();
  }
}
