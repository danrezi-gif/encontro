# Soul Flight — Physics & Implementation Reference

> Comprehensive physics model for hand-tracking-based VR flight in WebXR + Three.js.
> Synthesized from WebXR Hand Input spec, Meta/Microsoft comfort guidelines, shipped VR flight games (Birdly, Windlands, Population: ONE, Iron Man VR), and game physics best practices.

---

## 1. Head Direction → Flight Vector

### Core Principle: "Look Where You Fly"
The camera's forward vector in world space IS the flight direction. This is the most intuitive mapping and what every successful VR flying game uses.

### Extracting Head Direction in WebXR + Three.js

```typescript
// In XR frame loop:
const xrCamera = renderer.xr.getCamera();
const headForward = new THREE.Vector3(0, 0, -1);
headForward.applyQuaternion(xrCamera.quaternion); // full 3D direction

// Flattened forward (for lateral reference):
const headForwardFlat = new THREE.Vector3(headForward.x, 0, headForward.z).normalize();
```

### Pitch Mapping
| Look direction | Result |
|---|---|
| Straight ahead (pitch ≈ 0°) | Horizontal glide |
| Up (pitch > 0°) | Ascend — fly upward |
| Down (pitch < 0°) | Descend — dive toward ground |

### Important: Use the full quaternion, NOT Euler angles
Euler angles suffer from gimbal lock. Extract direction from the quaternion directly:

```typescript
// GOOD — gimbal-lock free
const flyDir = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat);

// BAD — gimbal lock at ±90° pitch
const euler = new THREE.Euler().setFromQuaternion(headQuat);
```

### Velocity-Direction Blending (Smooth Steering)
Don't snap the flight direction — **slerp** the current velocity direction toward head direction:

```typescript
// Frame-rate independent direction blending
const steerRate = 3.0; // radians/sec equivalent
const t = 1 - Math.exp(-steerRate * dt);  // exponential smoothing

const currentDir = velocity.clone().normalize();
const targetDir = headForward.clone().normalize();
const blendedDir = currentDir.lerp(targetDir, t).normalize();

// Apply blended direction at current speed
velocity.copy(blendedDir).multiplyScalar(speed);
```

The key: `1 - Math.exp(-rate * dt)` gives **frame-rate independent** exponential smoothing. At 72 fps and rate=3.0, `t ≈ 0.041` per frame. At 36 fps, `t ≈ 0.080`. The result over 1 second is identical.

---

## 2. Hand-Tracking Steering

### Joint Hierarchy (WebXR Hand Input spec)
25 joints per hand. The most useful for flight:
- `wrist` — overall hand position, stable reference
- `middle-finger-metacarpal` — center of palm
- `index-finger-tip` / `thumb-tip` — pinch detection
- `middle-finger-tip` — point direction

### Pose Extraction

```typescript
function getHandData(
  frame: XRFrame,
  source: XRInputSource,
  refSpace: XRReferenceSpace
): { position: THREE.Vector3; direction: THREE.Vector3; palmNormal: THREE.Vector3 } | null {
  if (!source.hand) return null;

  const wrist = source.hand.get('wrist');
  const middleMeta = source.hand.get('middle-finger-metacarpal');
  if (!wrist || !middleMeta) return null;

  const wristPose = frame.getJointPose(wrist, refSpace);
  const palmPose = frame.getJointPose(middleMeta, refSpace);
  if (!wristPose || !palmPose) return null;

  const pos = new THREE.Vector3(
    wristPose.transform.position.x,
    wristPose.transform.position.y,
    wristPose.transform.position.z
  );

  // Palm direction: -Z axis of the metacarpal joint (points along fingers)
  const quat = new THREE.Quaternion(
    palmPose.transform.orientation.x,
    palmPose.transform.orientation.y,
    palmPose.transform.orientation.z,
    palmPose.transform.orientation.w
  );
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

  // Palm normal: -Y axis (perpendicular to palm, outward)
  const palmNormal = new THREE.Vector3(0, -1, 0).applyQuaternion(quat);

  return { position: pos, direction, palmNormal };
}
```

### Steering Model: Hand Position Relative to Head

**Banking (yaw/roll):** Lateral offset of hands from head center-line:

```typescript
const headRight = new THREE.Vector3(1, 0, 0).applyQuaternion(headQuat);
const handOffset = avgHandPos.clone().sub(headPos);
const lateralOffset = handOffset.dot(headRight); // negative = left, positive = right

// Map to yaw rate (rad/s)
const yawRate = lateralOffset * YAW_GAIN; // YAW_GAIN ≈ 1.5-2.5
```

**Pitch (hand height):** Vertical offset from neutral hand position (~30cm below head):

```typescript
const neutralHandY = headPos.y - 0.3; // resting hand height
const verticalOffset = avgHandPos.y - neutralHandY;

// Map to pitch influence
const pitchInfluence = verticalOffset * PITCH_GAIN; // PITCH_GAIN ≈ 0.8
```

**Recommended: Hands as modifiers, NOT primary control.** Head direction is primary. Hands add ±20-30% directional variance. This is more comfortable because:
1. Arms fatigue quickly (gorilla arm effect, per Microsoft Mixed Reality guidelines)
2. Head direction is involuntary/effortless
3. Reduces motion sickness — visual-vestibular conflict is smaller

### Banking Formula (Additive to Head Direction)

```typescript
// Combine head direction with hand modifiers
const finalFlyDir = headForward.clone();

// Lateral steering from hand offset
const right = new THREE.Vector3().crossVectors(headForward, UP).normalize();
finalFlyDir.addScaledVector(right, lateralOffset * LATERAL_GAIN);

// Vertical adjustment from hand height
finalFlyDir.y += pitchInfluence;

finalFlyDir.normalize();
```

### Two-Hand Differential Steering (Advanced)

If both hands tracked, asymmetric poses create roll/yaw:

```typescript
const leftToRight = rightHandPos.clone().sub(leftHandPos);
const handAngle = Math.atan2(leftToRight.y, leftToRight.length()); // roll angle
const asymmetry = leftToRight.dot(headRight); // lateral imbalance → yaw
```

This is the "airplane arms" model (Birdly-style). Tilt left arm down + right arm up = bank left.

---

## 3. Speed Control via Hand Gestures

### Model 1: Arm Extension (Recommended for "Soul Flight")
Arms out = faster, arms in = slower. Natural and low-fatigue.

```typescript
// Forward extension: how far in front of chest are hands?
const forwardExt = Math.max(0, handOffset.dot(headForwardFlat));

// Lateral spread: how far apart are hands?
const handSpread = leftActive && rightActive 
  ? leftHandPos.distanceTo(rightHandPos) 
  : 0;

// Height extension: arms raised above neutral
const raiseExt = Math.max(0, avgHandPos.y - neutralHandY);

// Combined thrust factor [0..1]
const thrustFactor = Math.min(1.0,
  forwardExt * 1.2 +       // reaching forward
  handSpread * 0.4 +        // arms spread wide (wingspan)
  raiseExt * 0.6            // arms raised (superman pose)
);

// Map to speed range
const targetSpeed = MIN_SPEED + thrustFactor * (MAX_SPEED - MIN_SPEED);
```

### Model 2: Fist/Open Hand (Alternative)
Open palms = brake (air resistance), fists = streamlined (faster). Requires finger curl detection:

```typescript
// Finger curl: compare tip distance to metacarpal distance
function getFingerCurl(frame: XRFrame, hand: XRHand, refSpace: XRReferenceSpace): number {
  const tips = ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'];
  const metas = ['index-finger-metacarpal', 'middle-finger-metacarpal', 'ring-finger-metacarpal', 'pinky-finger-metacarpal'];
  
  let totalCurl = 0;
  for (let i = 0; i < tips.length; i++) {
    const tipPose = frame.getJointPose(hand.get(tips[i])!, refSpace);
    const metaPose = frame.getJointPose(hand.get(metas[i])!, refSpace);
    if (tipPose && metaPose) {
      const dist = /* distance between tip and metacarpal */;
      const maxDist = 0.12; // approximate extended finger length
      totalCurl += 1.0 - Math.min(1.0, dist / maxDist);
    }
  }
  return totalCurl / tips.length; // 0 = open, 1 = fist
}
```

### Model 3: Pinch Gesture (Simple & Reliable)
Pinch = thrust on. Release = coast. Good for accessibility.

```typescript
const indexTip = frame.getJointPose(hand.get('index-finger-tip')!, refSpace);
const thumbTip = frame.getJointPose(hand.get('thumb-tip')!, refSpace);
if (indexTip && thumbTip) {
  const pinchDist = /* distance between index tip and thumb tip */;
  const isPinching = pinchDist < 0.025; // 2.5 cm threshold
}
```

### Recommended Constants for "Soul Flight"

| Parameter | Value | Notes |
|---|---|---|
| `MIN_SPEED` | 0.0 m/s | Full stop when hands at sides |
| `CRUISE_SPEED` | 1.5 m/s | Comfortable default drift |
| `MAX_SPEED` | 4.0 m/s | Superman pose, arms full out |
| `ACCELERATION` | 2.0 m/s² | Gentle ramp-up |
| `DECELERATION` | 1.5 m/s² | Slightly slower than accel for momentum feel |

---

## 4. Comfort: Vection Sickness Mitigation

### Vignette/Tunneling Effect
The **#1 most effective** technique. Reduce FOV during fast movement:

```typescript
// Compute vignette strength based on speed
const speedRatio = velocity.length() / MAX_SPEED;
const vignetteStrength = smoothstep(0.2, 0.8, speedRatio); // starts at 20% speed

// Also increase on turning (angular velocity causes more sickness than linear)
const angularVelocity = /* difference in heading per second */;
const turnVignette = smoothstep(0.5, 2.0, Math.abs(angularVelocity));

// Combined
const totalVignette = Math.min(1.0, vignetteStrength * 0.6 + turnVignette * 0.4);

// Apply as post-process: darken edges of view
// Typical: inner radius 0.4-0.6, outer radius 0.7-0.9 of screen
```

GLSL for vignette:
```glsl
uniform float uVignetteStrength;
varying vec2 vUv;

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered);
  float inner = mix(0.5, 0.2, uVignetteStrength); // tighter at higher speeds
  float outer = mix(0.8, 0.4, uVignetteStrength);
  float vignette = smoothstep(inner, outer, dist);
  
  vec4 scene = texture2D(tDiffuse, vUv);
  gl_FragColor = mix(scene, vec4(0.0, 0.0, 0.0, 1.0), vignette * uVignetteStrength);
}
```

### Acceleration Curves (Never Instant Velocity Changes)
Abrupt speed changes are the primary cause of vection sickness. Always use smooth acceleration:

```typescript
// S-curve acceleration (Hermite interpolation)
function smoothAcceleration(current: number, target: number, rate: number, dt: number): number {
  const diff = target - current;
  const maxStep = rate * dt;
  if (Math.abs(diff) < maxStep) return target;
  
  // Ease-in/ease-out at start and end of acceleration
  const t = Math.min(1, Math.abs(diff) / (rate * 0.5));
  const eased = t * t * (3 - 2 * t); // smoothstep
  return current + Math.sign(diff) * maxStep * eased;
}
```

### Fixed Reference Frame ("Cockpit Nose")
Add a subtle fixed-in-view reference (nose, particle streaks, HUD ring). This gives the vestibular system a "stable" reference. Even a small dot at the center of view reduces sickness 20-30%.

### Acceleration Limits

| Metric | Comfort Zone | Danger Zone |
|---|---|---|
| Linear acceleration | < 2 m/s² | > 5 m/s² |
| Angular velocity (yaw) | < 45°/s | > 90°/s |
| Angular velocity (pitch) | < 30°/s | > 60°/s |
| Vertical acceleration | < 1.5 m/s² | > 3 m/s² (falling sensation) |

### Additional Techniques
- **Blur at periphery** during fast motion (simulates natural speed perception)
- **Particle streamlines** moving in flight direction (gives optical flow that matches vestibular input)
- **Avoid pure rotation** — always couple turning with forward motion
- **Never take control of the camera** — the user's head IS the camera. Move the world, not the camera
- **Gradual startup** — don't throw the user into full-speed flight. Ramp up over 2-3 seconds

---

## 5. Damping/Drag Model — "Dreamy but Responsive"

### The Critical Formula: Frame-Rate Independent Exponential Decay

**WRONG** (frame-rate dependent):
```typescript
velocity.multiplyScalar(0.98); // different behavior at 72fps vs 36fps!
```

**RIGHT** (frame-rate independent):
```typescript
const halfLife = 2.0; // seconds — time for velocity to halve
const decay = Math.pow(0.5, dt / halfLife);
velocity.multiplyScalar(decay);
```

This is mathematically: $v(t) = v_0 \cdot 2^{-t/h}$ where $h$ is the half-life.

Equivalent exponential form: $v(t) = v_0 \cdot e^{-\lambda t}$ where $\lambda = \ln(2) / h$.

```typescript
// Alternative: using lambda directly
const lambda = 0.693 / halfLife; // ln(2) / halfLife
const decay = Math.exp(-lambda * dt);
velocity.multiplyScalar(decay);
```

### Choosing Half-Life Values

| Feel | Half-Life | Description |
|---|---|---|
| Snappy/arcade | 0.3-0.5s | Stops quickly, responsive |
| Standard flight | 1.0-1.5s | Good balance |
| **Dreamy/ethereal** | **2.0-3.5s** | **Long glide, soul-like** |
| Zero-G drift | 5.0-10.0s | Almost no friction |

### Recommended for "Soul Flight": **2.5 second half-life**
This means: 
- After 2.5s of no thrust: 50% speed remains
- After 5.0s: 25% speed remains  
- After 10.0s: 6% speed remains — gentle coast to stop

### Anisotropic Damping (Different per axis)
Vertical motion should damp faster than horizontal for comfort:

```typescript
const horizontalHalfLife = 2.5;  // long horizontal glide
const verticalHalfLife = 1.5;    // vertical settles faster (reduces stomach-drop)

const hDecay = Math.pow(0.5, dt / horizontalHalfLife);
const vDecay = Math.pow(0.5, dt / verticalHalfLife);

velocity.x *= hDecay;
velocity.z *= hDecay;
velocity.y *= vDecay;
```

### Speed-Dependent Drag (Quadratic)
For a more physical feel, faster speeds experience more drag (like air resistance):

```typescript
const speed = velocity.length();
const dragCoeff = 0.1; // tune this
const dragForce = dragCoeff * speed * speed; // quadratic drag
const dragDecel = Math.min(dragForce * dt, speed); // don't overshoot

if (speed > 0.001) {
  velocity.addScaledVector(velocity.clone().normalize(), -dragDecel);
}
```

Combined with linear damping:
$$F_{drag} = -(\lambda_{linear} \cdot v + c_{quad} \cdot |v|^2 \cdot \hat{v})$$

For the dreamy feel, use mostly linear damping with just a touch of quadratic at high speeds to create a soft speed ceiling.

---

## 6. Gravity Model

### Recommendation: Subtle downward drift, NOT real gravity

Real gravity ($9.81\, m/s^2$) is way too strong and causes instant sickness. Use a fraction:

```typescript
const GRAVITY = 0.3; // m/s² — gentle downward pull (3% of real gravity)

// Only apply when not actively thrusting upward
if (thrustFactor < 0.1) {
  velocity.y -= GRAVITY * dt;
}
```

### Height-Dependent Gravity (Keeps Users in the "Sweet Zone")

```typescript
const FLOAT_HEIGHT = 10.0;  // ideal cruising altitude
const height = getPlayerHeight();

// Stronger pull when very high, weaker near float height
const gravityMult = height > FLOAT_HEIGHT 
  ? 1.0 + (height - FLOAT_HEIGHT) * 0.05  // gently pulls back down
  : Math.max(0, 1.0 - (FLOAT_HEIGHT - height) * 0.2); // weakens near ground

velocity.y -= GRAVITY * gravityMult * dt;
```

### Buoyancy Model (Alternative: "Floating Soul")
Instead of gravity, apply a buoyancy force toward a target altitude:

```typescript
const TARGET_HEIGHT = 5.0;
const BUOYANCY_STRENGTH = 0.5; // m/s² 
const heightError = TARGET_HEIGHT - currentHeight;
const buoyancyForce = BUOYANCY_STRENGTH * Math.sign(heightError) * Math.pow(Math.abs(heightError), 0.5);

velocity.y += buoyancyForce * dt;
```

This creates a "natural resting altitude" — the soul floats at a certain height and gently returns to it.

### Ground Repulsion (Soft Floor)

```typescript
const GROUND_Y = 0;
const REPULSION_RANGE = 3.0;  // meters
const REPULSION_STRENGTH = 2.0;

const distFromGround = currentHeight - GROUND_Y;
if (distFromGround < REPULSION_RANGE) {
  const t = 1.0 - distFromGround / REPULSION_RANGE;
  const repulsion = REPULSION_STRENGTH * t * t; // quadratic ramp
  velocity.y += repulsion * dt;
}
```

---

## 7. Common Pitfalls & Solutions

### Pitfall 1: Frame-Rate Dependent Physics
**Problem:** Using fixed multipliers instead of `dt`-based calculations.
**Solution:** Every velocity/acceleration operation must multiply by `dt`:

```typescript
// ✗ BAD
velocity.multiplyScalar(0.98);
velocity.add(thrust);

// ✓ GOOD  
velocity.multiplyScalar(Math.pow(0.5, dt / halfLife));
velocity.addScaledVector(thrustDir, thrustMag * dt);
```

### Pitfall 2: Damping That Kills All Motion
**Problem:** `velocity *= 0.92` at 72fps → after 1 second: $0.92^{72} = 0.0027$ → 99.7% velocity LOST.
**Solution:** Use half-life based damping (see section 5). A half-life of 2.5s retains 50% after 2.5 seconds regardless of framerate.

### Pitfall 3: Moving the Camera Instead of the World
**Problem:** Translating the XR camera directly breaks head tracking.
**Solution:** Move a "world root" group in the opposite direction:

```typescript
// Move the world, not the camera
worldGroup.position.sub(velocity.clone().multiplyScalar(dt));

// Or equivalently, offset the XR reference space:
// This is the "proper" WebXR way but requires creating a new XRReferenceSpace
```

### Pitfall 4: Quaternion vs Euler for Direction
**Problem:** Using euler.x for pitch → gimbal lock at ±90°.
**Solution:** Always extract direction as a vector from quaternion.

### Pitfall 5: Hand Tracking Jitter
**Problem:** Raw hand joint positions jitter ±1-3mm per frame.
**Solution:** One-euro filter or exponential smoothing:

```typescript
class SmoothVector3 {
  private smoothed = new THREE.Vector3();
  private initialized = false;
  
  update(raw: THREE.Vector3, dt: number, cutoff: number = 3.0): THREE.Vector3 {
    if (!this.initialized) {
      this.smoothed.copy(raw);
      this.initialized = true;
      return this.smoothed;
    }
    // Exponential smoothing (low-pass filter)
    const alpha = 1.0 - Math.exp(-cutoff * dt);
    this.smoothed.lerp(raw, alpha);
    return this.smoothed;
  }
}
```

For best results, use a **one-euro filter** which adapts its cutoff based on speed — smooth when still, responsive when moving fast:

```typescript
class OneEuroFilter3 {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private prev = new THREE.Vector3();
  private dprev = new THREE.Vector3();
  private initialized = false;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x: THREE.Vector3, dt: number): THREE.Vector3 {
    if (!this.initialized) {
      this.prev.copy(x);
      this.dprev.set(0, 0, 0);
      this.initialized = true;
      return this.prev.clone();
    }

    const dx = x.clone().sub(this.prev).divideScalar(dt);
    const edx = dx.clone();
    const a_d = this.alpha(this.dCutoff, dt);
    edx.lerp(this.dprev, 1 - a_d);
    this.dprev.copy(edx);

    const cutoff = this.minCutoff + this.beta * edx.length();
    const a = this.alpha(cutoff, dt);
    const result = x.clone();
    result.lerp(this.prev, 1 - a);
    this.prev.copy(result);
    return result;
  }
}
```

### Pitfall 6: Not Handling Hand Loss Gracefully
**Problem:** Hand tracking drops out momentarily (hands occluded, gesture conflicts).
**Solution:** Coast on last known velocity, fade thrust to zero over 0.5s:

```typescript
let handLostTimer = 0;
const HAND_LOST_GRACE = 0.5; // seconds

if (!handActive) {
  handLostTimer += dt;
  const graceFactor = Math.max(0, 1.0 - handLostTimer / HAND_LOST_GRACE);
  thrust *= graceFactor; // gradually reduce thrust
} else {
  handLostTimer = 0;
}
```

### Pitfall 7: Velocity Accumulation on Pause/Tab-Switch
**Problem:** Large `dt` spike when user tabs back → massive velocity jump.
**Solution:** Clamp `dt`:

```typescript
const dt = Math.min(rawDelta, 0.1); // cap at 100ms (10fps minimum)
```

---

## 8. Complete Physics Model Summary

### Per-Frame Update (Pseudocode)

```typescript
function updateSoulFlight(dt: number, state: FlightState, input: FlightInput): void {
  // 0. Clamp dt
  dt = Math.min(dt, 0.1);

  // 1. Extract head direction (primary flight vector)
  const headDir = new THREE.Vector3(0, 0, -1).applyQuaternion(input.headQuat);

  // 2. Compute hand influence
  const handData = computeHandInfluence(input, headDir);
  
  // 3. Compute target flight direction
  const targetDir = headDir.clone();
  targetDir.addScaledVector(handData.lateralOffset, LATERAL_GAIN);
  targetDir.y += handData.pitchOffset * PITCH_GAIN;
  targetDir.normalize();

  // 4. Smoothly steer current direction toward target
  const steerAlpha = 1 - Math.exp(-STEER_RATE * dt);
  const currentDir = state.velocity.length() > 0.01
    ? state.velocity.clone().normalize()
    : targetDir.clone();
  currentDir.lerp(targetDir, steerAlpha).normalize();

  // 5. Compute thrust magnitude
  const thrustMag = BASE_THRUST + handData.thrustFactor * MAX_EXTRA_THRUST;

  // 6. Accelerate
  state.velocity.addScaledVector(currentDir, thrustMag * dt);

  // 7. Apply gravity/buoyancy
  const buoyancy = computeBuoyancy(state.height);
  state.velocity.y += buoyancy * dt;

  // 8. Apply damping (frame-rate independent)
  const hDecay = Math.pow(0.5, dt / HORIZONTAL_HALF_LIFE);
  const vDecay = Math.pow(0.5, dt / VERTICAL_HALF_LIFE);
  state.velocity.x *= hDecay;
  state.velocity.z *= hDecay;
  state.velocity.y *= vDecay;

  // 9. Clamp speed
  const speed = state.velocity.length();
  if (speed > MAX_SPEED) {
    state.velocity.multiplyScalar(MAX_SPEED / speed);
  }

  // 10. Ground repulsion
  if (state.height < GROUND_REPULSION_RANGE) {
    const t = 1 - state.height / GROUND_REPULSION_RANGE;
    state.velocity.y += GROUND_REPULSION_FORCE * t * t * dt;
  }

  // 11. Integrate position (move world, not camera)
  state.worldOffset.addScaledVector(state.velocity, -dt);
  
  // 12. Update comfort vignette
  state.vignetteStrength = computeVignette(state.velocity, dt);
}
```

### Recommended Constants

```typescript
// Steering
const STEER_RATE = 3.0;          // direction blend rate (1/s)
const LATERAL_GAIN = 0.35;       // hand lateral → direction weight
const PITCH_GAIN = 0.25;         // hand vertical → pitch weight

// Thrust
const BASE_THRUST = 0.5;         // m/s² baseline forward drift
const MAX_EXTRA_THRUST = 3.0;    // m/s² additional from hand gestures
const MAX_SPEED = 4.0;           // m/s hard cap

// Damping (dreamy feel)
const HORIZONTAL_HALF_LIFE = 2.5; // seconds
const VERTICAL_HALF_LIFE = 1.8;   // seconds (slightly faster vertical settle)

// Gravity/buoyancy
const GRAVITY = 0.25;            // m/s² gentle downward pull
const FLOAT_HEIGHT = 5.0;        // m — natural resting altitude
const BUOYANCY_STRENGTH = 0.4;   // m/s² toward float height

// Ground
const GROUND_REPULSION_RANGE = 2.0;  // m
const GROUND_REPULSION_FORCE = 3.0;  // m/s²

// Comfort
const VIGNETTE_SPEED_THRESHOLD = 1.5; // m/s — vignette starts here
const VIGNETTE_MAX_AT_SPEED = 3.5;    // m/s — full vignette strength
const MAX_VIGNETTE_STRENGTH = 0.5;    // maximum darkening

// Safety
const MAX_DT = 0.1;             // seconds — prevents physics explosion
```

### Reference: Units and Coordinate System
- All positions in **meters** (WebXR native unit)
- All velocities in **m/s**
- All accelerations in **m/s²**
- Three.js coordinate system: **Y-up, right-handed** (-Z is forward)
- WebXR `local-floor` reference space: Y=0 at floor level

---

## 9. WebXR-Specific Implementation Notes

### Moving the User (XR Rig Pattern)
In WebXR you cannot move the camera directly. The standard pattern:

```typescript
// Create a rig group that the camera lives inside
const xrRig = new THREE.Group();
scene.add(xrRig);
// The renderer.xr camera is automatically parented to this group

// To "move" the user, move the rig:
xrRig.position.addScaledVector(velocity, dt);

// OR move all world content in the opposite direction:
worldGroup.position.subScaledVector(velocity, dt);
```

For Encontro, the existing pattern of `offset` on the world group is correct.

### Hand Tracking Feature Detection

```typescript
const session = await navigator.xr.requestSession('immersive-vr', {
  requiredFeatures: ['local-floor'],
  optionalFeatures: ['hand-tracking']
});

// Check if hand tracking is available per-source:
for (const source of session.inputSources) {
  if (source.hand) {
    // Native hand tracking available
    // source.hand is XRHand with 25 joints
  } else if (source.gripSpace) {
    // Controller fallback
  }
}
```

### Performance: Use `fillPoses()` for Batch Joint Reading
Instead of calling `getJointPose()` 25× per hand per frame:

```typescript
const jointSpaces: XRJointSpace[] = [];
for (const [, jointSpace] of source.hand!) {
  jointSpaces.push(jointSpace);
}
const transforms = new Float32Array(25 * 16);
const allValid = frame.fillPoses(jointSpaces, refSpace, transforms);
// Now transforms contains all 25 4×4 matrices packed sequentially
```

This is significantly faster on Quest hardware.

---

## 10. Lessons from Shipped VR Flight Games

### Population: ONE (Battle Royale, Skydiving)
- Arms-out superman pose = maximum speed
- Arms to sides = immediate deceleration
- Head direction for steering
- No gravity during glide (only when arms tucked)
- Very aggressive vignette during fast turns

### Iron Man VR 
- Palms-backward thrust (like repulsor jets)
- Palm direction IS thrust direction (not head)
- Speed proportional to arm extension angle
- Used strong speed lines + tunnel vignette

### Birdly (Research/Art Installation)
- Full-body prone position with arm flapping
- Arm angle = angle of attack (pitch)
- Arm spread = lift coefficient  
- Arm flap frequency = base thrust
- Very slow speeds (comfort-first)

### Windlands (Grappling + Glide)
- Head direction for glide after jump
- No hand-tracking (controller trigger = thrust)
- Aggressive FOV reduction during swings
- Long float/glide with very low damping

### Key Takeaways
1. **Head direction as primary flight vector** — universal across all titles
2. **Hands as thrust modulators** — the degree varies but hands rarely override head
3. **Comfort trumps realism** — nobody uses real gravity, everybody uses vignettes
4. **Long damping half-lives** (1.5-3s) feel better than short ones (<0.5s)
5. **Gradual starts** — never throw user into fast motion from standstill
6. **Ground avoidance** — either invisible floor or gentle upward force near ground
