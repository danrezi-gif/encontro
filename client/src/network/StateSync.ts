import type { PresenceState, Vec3, Quat } from "@shared/PresenceState";

/**
 * Client-side interpolation for remote presence state.
 * Smooths network jitter and provides fluid motion at render rate.
 */
export class StateSync {
  private buffer: PresenceState[] = [];
  private readonly bufferSize = 3;
  private readonly interpolationDelay = 100; // ms

  pushState(state: PresenceState): void {
    this.buffer.push(state);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  /** Get interpolated state for the current render time */
  getInterpolatedState(): PresenceState | null {
    if (this.buffer.length === 0) return null;
    if (this.buffer.length === 1) return this.buffer[0];

    const renderTime = Date.now() - this.interpolationDelay;
    const prev = this.buffer[this.buffer.length - 2];
    const next = this.buffer[this.buffer.length - 1];

    if (!prev || !next) return this.buffer[this.buffer.length - 1];

    const duration = next.timestamp - prev.timestamp;
    if (duration <= 0) return next;

    const t = Math.max(0, Math.min(1, (renderTime - prev.timestamp) / duration));

    return {
      position: lerpVec3(prev.position, next.position, t),
      rotation: slerpQuat(prev.rotation, next.rotation, t),
      leftHand: prev.leftHand && next.leftHand
        ? { position: lerpVec3(prev.leftHand.position, next.leftHand.position, t), rotation: slerpQuat(prev.leftHand.rotation, next.leftHand.rotation, t) }
        : next.leftHand,
      rightHand: prev.rightHand && next.rightHand
        ? { position: lerpVec3(prev.rightHand.position, next.rightHand.position, t), rotation: slerpQuat(prev.rightHand.rotation, next.rightHand.rotation, t) }
        : next.rightHand,
      movementRhythm: lerp(prev.movementRhythm, next.movementRhythm, t),
      colorState: {
        h: lerpAngle(prev.colorState.h, next.colorState.h, t),
        s: lerp(prev.colorState.s, next.colorState.s, t),
        l: lerp(prev.colorState.l, next.colorState.l, t),
      },
      breathRate: prev.breathRate !== null && next.breathRate !== null
        ? lerp(prev.breathRate, next.breathRate, t)
        : next.breathRate,
      mergeTarget: next.mergeTarget,
      mergeDepth: lerp(prev.mergeDepth, next.mergeDepth, t),
      timestamp: renderTime,
    };
  }

  clear(): void {
    this.buffer = [];
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
}

function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  // Simplified slerp — adequate for network interpolation
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

  // Ensure shortest path
  const sign = dot < 0 ? -1 : 1;
  dot = Math.abs(dot);

  // Linear interpolation for nearly-parallel quaternions
  if (dot > 0.9995) {
    return normalizeQuat({
      x: lerp(a.x, b.x * sign, t),
      y: lerp(a.y, b.y * sign, t),
      z: lerp(a.z, b.z * sign, t),
      w: lerp(a.w, b.w * sign, t),
    });
  }

  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta * sign;

  return {
    x: a.x * wa + b.x * wb,
    y: a.y * wa + b.y * wb,
    z: a.z * wa + b.z * wb,
    w: a.w * wa + b.w * wb,
  };
}

function normalizeQuat(q: Quat): Quat {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (len === 0) return { x: 0, y: 0, z: 0, w: 1 };
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}
