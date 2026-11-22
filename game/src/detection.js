// Seeing and the alarm meter. A guard sees the thief when the thief is
// inside its vision cone with a clear line of sight. Being seen fills
// the meter; hiding drains it. A full meter raises the alarm — but the
// thief can still slip away and let it cool down.
'use strict';

const DETECTION_RISE_PER_SECOND = 60;
const DETECTION_FALL_PER_SECOND = 30;
const SNEAK_GAIN = 0.5; // sneaking fills the meter half as fast

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// True when any solid rectangle blocks the straight line between two points.
function segmentBlocked(x1, y1, x2, y2, rects) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const r of rects) {
      if (pointInRect(px, py, r)) return true;
    }
  }
  return false;
}

// Can this guard see the thief right now? Returns { seen, dist }.
function guardSeesThief(guard, player, rects) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_CONE_RANGE) return { seen: false, dist };
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toPlayer, guard.angle)) > GUARD_CONE_HALF_ANGLE) {
    return { seen: false, dist };
  }
  if (segmentBlocked(guard.x, guard.y, player.x, player.y, rects)) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}

// Move the shared alarm meter (0-100) for one tick.
function updateDetection(state, dt) {
  let anySeen = false;
  let gain = 0;
  for (const guard of state.guards) {
    const check = guardSeesThief(guard, state.player, state.rects);
    guard.seenNow = check.seen;
    if (check.seen) {
      anySeen = true;
      // Closer is worse: being seen point-blank fills the meter fastest.
      const closeness = 1 - (check.dist / GUARD_CONE_RANGE) * 0.5;
      gain = Math.max(gain, DETECTION_RISE_PER_SECOND * closeness);
    }
  }
  if (anySeen) {
    if (state.player.sneaking) gain *= SNEAK_GAIN;
    state.detection = Math.min(100, state.detection + gain * dt);
  } else {
    state.detection = Math.max(0, state.detection - DETECTION_FALL_PER_SECOND * dt);
  }
  return anySeen;
}
