// Drawing: floor, walls, crates, exit, guards and their vision cones,
// the thief, and the HUD. Everything is flat vector shapes on one
// canvas — no image assets, so the game loads with no network.
'use strict';

const FLOOR_A = '#161a26';
const FLOOR_B = '#12151f';
const WALL_FILL = '#2c3550';
const WALL_TOP = '#46557e';
const CRATE_FILL = '#6b4f2a';
const CRATE_EDGE = '#8a6a3c';
const EXIT_GLOW = '#39d98a';
const CONE_CALM = 'rgba(255, 214, 90, 0.20)';
const CONE_ALERT = 'rgba(255, 70, 70, 0.32)';
const PLAYER_FILL = '#35d0ff';

function drawFloor(ctx, w, h) {
  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = FLOOR_B;
  const tile = 80;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      if (((x + y) / tile) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
}

function drawWalls(ctx, walls) {
  for (const r of walls) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(r.x, r.y, r.w, 4);
  }
}

function drawCrates(ctx, crates) {
  for (const r of crates) {
    ctx.fillStyle = CRATE_FILL;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = CRATE_EDGE;
    ctx.lineWidth = 3;
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.moveTo(r.x + r.w, r.y);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.stroke();
  }
}

function drawArtifacts(ctx, artifacts) {
  for (const a of artifacts) {
    if (a.taken) continue;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 14;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

function drawExit(ctx, exit, time) {
  const pulse = 0.7 + 0.3 * Math.sin(time * 3);
  ctx.save();
  ctx.fillStyle = EXIT_GLOW;
  ctx.globalAlpha = 0.25 * pulse;
  ctx.fillRect(exit.x - 8, exit.y - 8, exit.w + 16, exit.h + 16);
  ctx.globalAlpha = 1;
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = '#06281a';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 5);
  ctx.restore();
}

function drawCone(ctx, guard) {
  const alerted = guard.state === 'alert' || guard.state === 'search';
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, GUARD_CONE_RANGE, guard.angle - GUARD_CONE_HALF_ANGLE, guard.angle + GUARD_CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = alerted ? CONE_ALERT : CONE_CALM;
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, guard) {
  drawCone(ctx, guard);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = guard.state === 'alert' ? '#ff4444' : '#e8b64c';
  ctx.beginPath();
  ctx.arc(0, 0, GUARD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick so the guard's direction reads at a glance.
  ctx.strokeStyle = '#1a1206';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * GUARD_RADIUS, Math.sin(guard.angle) * GUARD_RADIUS);
  ctx.stroke();
  ctx.restore();
  if (guard.state === 'suspicious') {
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
  } else if (guard.state === 'alert') {
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
  }
}

function drawPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = PLAYER_FILL;
  ctx.shadowColor = PLAYER_FILL;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#062a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(player.faceAngle) * player.radius, Math.sin(player.faceAngle) * player.radius);
  ctx.stroke();
  ctx.restore();
}

// Faint dashed patrol routes, so the loops can be learned.
function drawPatrolRoutes(ctx, guards) {
  ctx.save();
  ctx.strokeStyle = 'rgba(232, 182, 76, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  for (const g of guards) {
    ctx.beginPath();
    g.waypoints.forEach((wp, i) => {
      if (i === 0) ctx.moveTo(wp[0], wp[1]);
      else ctx.lineTo(wp[0], wp[1]);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state) {
  // Top bar.
  ctx.fillStyle = 'rgba(8, 10, 18, 0.85)';
  ctx.fillRect(0, 0, LEVEL.width, 44);
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('GHOSTLIGHT — reach the exit unseen', 16, 28);
  ctx.textAlign = 'right';
  ctx.fillText('Artifacts ' + state.player.artifacts + '/3   ' + formatTime(state.time), LEVEL.width - 16, 28);

  // Detection meter.
  const mw = 220;
  const mx = LEVEL.width / 2 - mw / 2;
  ctx.fillStyle = '#20242f';
  ctx.fillRect(mx, 52, mw, 14);
  const frac = state.detection / 100;
  ctx.fillStyle = frac < 0.4 ? '#ffd65a' : frac < 0.8 ? '#ff9a3c' : '#ff4444';
  ctx.fillRect(mx, 52, mw * frac, 14);
  ctx.strokeStyle = '#e8ecff';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, 52, mw, 14);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(state.detection >= 100 ? 'SPOTTED!' : state.detection >= 40 ? 'SUSPICIOUS' : 'UNSEEN', LEVEL.width / 2, 80);
  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillStyle = '#8a93ad';
  ctx.fillText('WASD / arrows move   SHIFT sneak   R restart', 16, LEVEL.height - 12);
}

function drawBanner(ctx, title, sub) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, LEVEL.height / 2 - 70, LEVEL.width, 140);
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, LEVEL.width / 2, LEVEL.height / 2 - 8);
  ctx.font = '18px monospace';
  ctx.fillStyle = '#8a93ad';
  ctx.fillText(sub, LEVEL.width / 2, LEVEL.height / 2 + 32);
  ctx.restore();
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// One full frame of the game.
function renderGame(ctx, state) {
  drawFloor(ctx, LEVEL.width, LEVEL.height);
  drawPatrolRoutes(ctx, state.guards);
  drawArtifacts(ctx, LEVEL.artifacts);
  drawExit(ctx, LEVEL.exit, state.time);
  drawWalls(ctx, LEVEL.walls);
  drawCrates(ctx, LEVEL.crates);
  for (const g of state.guards) drawGuard(ctx, g);
  drawPlayer(ctx, state.player);
  drawHud(ctx, state);
  if (state.mode === 'title') {
    drawBanner(ctx, 'GHOSTLIGHT', 'A museum at night. Four guards. One way out. Press ENTER.');
  } else if (state.mode === 'won') {
    drawBanner(ctx, 'ESCAPED — UNSEEN', 'Time ' + formatTime(state.time) + '   Artifacts ' + state.player.artifacts + '/3   Press R to play again.');
  } else if (state.mode === 'lost') {
    drawBanner(ctx, 'CAUGHT', 'The alarm went up. Press R to try again.');
  }
}
