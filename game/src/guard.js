// Guards: patrol, suspicion, alert. A guard walks a fixed loop of
// waypoints, turns to face where it walks, and watches a cone in front
// of it. When it sees the thief it gets suspicious, then raises the
// alarm and chases the last place it saw them.
'use strict';

const GUARD_PATROL_SPEED = 70;
const GUARD_CHASE_SPEED = 150;
const GUARD_RADIUS = 14;
const GUARD_CONE_RANGE = 220;
const GUARD_CONE_HALF_ANGLE = 0.56; // ~32 degrees each side

function Guard(def) {
  this.waypoints = def.waypoints;
  this.x = def.waypoints[0][0];
  this.y = def.waypoints[0][1];
  this.nextWaypoint = 1;
  this.angle = 0; // facing, radians; 0 = east
  this.state = 'patrol'; // patrol | suspicious | alert | search
  this.stateTime = 0;
  this.lastSeenX = 0;
  this.lastSeenY = 0;
  this.searchX = 0;
  this.searchY = 0;
}

Guard.prototype.moveToward = function (tx, ty, speed, dt) {
  const dx = tx - this.x;
  const dy = ty - this.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  this.x += (dx / dist) * step;
  this.y += (dy / dist) * step;
  this.angle = Math.atan2(dy, dx);
  return dist - step < 2;
};

// One tick of guard behaviour. `seen` says whether the guard can see
// the thief right now; `detection` is the shared alarm meter (0-100).
Guard.prototype.update = function (dt, seen, playerX, playerY, detection) {
  this.stateTime += dt;

  if (this.state === 'patrol') {
    const wp = this.waypoints[this.nextWaypoint];
    if (this.moveToward(wp[0], wp[1], GUARD_PATROL_SPEED, dt)) {
      this.nextWaypoint = (this.nextWaypoint + 1) % this.waypoints.length;
    }
    if (seen && detection >= 40) {
      this.state = 'suspicious';
      this.stateTime = 0;
    }
  } else if (this.state === 'suspicious') {
    // Freeze, turn toward the thief, give them a heartbeat to hide.
    this.angle = Math.atan2(playerY - this.y, playerX - this.x);
    if (!seen && this.stateTime > 1.0) {
      this.state = 'patrol';
      this.stateTime = 0;
    }
  } else if (this.state === 'alert') {
    // Chase the last seen spot. Lose the trail and the guard searches,
    // then gives up and goes back to its loop.
    const arrived = this.moveToward(this.lastSeenX, this.lastSeenY, GUARD_CHASE_SPEED, dt);
    if (seen) {
      this.lastSeenX = playerX;
      this.lastSeenY = playerY;
    }
    if (arrived && !seen) {
      this.state = 'search';
      this.stateTime = 0;
      this.searchX = this.lastSeenX;
      this.searchY = this.lastSeenY;
    }
  } else if (this.state === 'search') {
    // Look around the last seen spot, then return to patrol.
    this.angle += dt * 2.2;
    if (this.stateTime > 2.0) {
      this.state = 'patrol';
      this.stateTime = 0;
    }
  }

  if (seen && detection >= 100 && this.state !== 'alert') {
    this.state = 'alert';
    this.stateTime = 0;
    this.lastSeenX = playerX;
    this.lastSeenY = playerY;
  }
};

// True when the thief is caught: an alert guard close enough to grab.
Guard.prototype.canCatch = function (playerX, playerY) {
  if (this.state !== 'alert') return false;
  return Math.hypot(playerX - this.x, playerY - this.y) < 30;
};
