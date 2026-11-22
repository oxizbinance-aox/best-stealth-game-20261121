// The thief: a small hooded figure slipping through the gallery.
// WASD or arrows to move, Shift to sneak (slower, harder to spot).
'use strict';

const PLAYER_RADIUS = 12;
const PLAYER_WALK_SPEED = 170;
const PLAYER_SNEAK_SPEED = 95;

function Player(x, y) {
  this.x = x;
  this.y = y;
  this.radius = PLAYER_RADIUS;
  this.sneaking = false;
  this.moving = false;
  this.faceAngle = -Math.PI / 2; // facing up at the start
  this.artifacts = 0;
}

// Move one step, sliding along walls instead of sticking to them.
Player.prototype.update = function (dt, keys, rects) {
  let dx = 0;
  let dy = 0;
  if (keys['arrowleft'] || keys['a']) dx -= 1;
  if (keys['arrowright'] || keys['d']) dx += 1;
  if (keys['arrowup'] || keys['w']) dy -= 1;
  if (keys['arrowdown'] || keys['s']) dy += 1;

  this.sneaking = !!(keys['shift']);
  this.moving = dx !== 0 || dy !== 0;
  if (!this.moving) return;

  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  this.faceAngle = Math.atan2(dy, dx);

  const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  this.moveAxis(dx * speed * dt, 0, rects);
  this.moveAxis(0, dy * speed * dt, rects);
};

// Move along one axis, pushed back out of any solid rectangle.
Player.prototype.moveAxis = function (dx, dy, rects) {
  this.x += dx;
  this.y += dy;
  for (const r of rects) {
    const nx = Math.max(r.x, Math.min(this.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(this.y, r.y + r.h));
    const ddx = this.x - nx;
    const ddy = this.y - ny;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 < this.radius * this.radius) {
      if (d2 === 0) {
        // Dead centre of a wall: push up out of it.
        this.y = r.y - this.radius;
      } else {
        const d = Math.sqrt(d2);
        this.x = nx + (ddx / d) * this.radius;
        this.y = ny + (ddy / d) * this.radius;
      }
    }
  }
};
