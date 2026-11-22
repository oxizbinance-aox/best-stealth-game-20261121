// GHOSTLIGHT: bootstrap, input, the game loop and the state machine.
// Title -> playing -> won / lost. A ?shot=N parameter stages a fixed
// scene for screenshots (the game is paused on that frame).
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  mode: 'title', // title | playing | won | lost
  time: 0,
  detection: 0,
  paused: false,
  rects: solidRects(),
  player: new Player(LEVEL.spawn.x, LEVEL.spawn.y),
  guards: LEVEL.guards.map((def) => new Guard(def)),
  keys: {},
  stepTimer: 0,
  alerted: false
};

function resetGame() {
  state.mode = 'playing';
  state.time = 0;
  state.detection = 0;
  state.paused = false;
  state.alerted = false;
  state.player = new Player(LEVEL.spawn.x, LEVEL.spawn.y);
  state.guards = LEVEL.guards.map((def) => new Guard(def));
  for (const a of LEVEL.artifacts) a.taken = false;
}

function update(dt) {
  if (state.mode !== 'playing' || state.paused) return;
  state.time += dt;

  state.player.update(dt, state.keys, state.rects);

  // Footsteps: a quiet tick every few steps, quieter when sneaking.
  if (state.player.moving) {
    state.stepTimer += dt;
    const interval = state.player.sneaking ? 0.55 : 0.38;
    if (state.stepTimer >= interval) {
      state.stepTimer = 0;
      AudioSys.footstep(state.player.sneaking);
    }
  }

  const anySeen = updateDetection(state, dt);

  for (const guard of state.guards) {
    guard.update(dt, guard.seenNow, state.player.x, state.player.y, state.detection);
    if (guard.canCatch(state.player.x, state.player.y)) {
      state.mode = 'lost';
      AudioSys.lose();
      return;
    }
  }

  // The alarm going up is a moment: sting once, then it can cool down.
  if (state.detection >= 100 && !state.alerted) {
    state.alerted = true;
    AudioSys.alertSting();
  } else if (state.detection < 40) {
    state.alerted = false;
  }

  // Pick up artifacts by walking over them.
  for (const a of LEVEL.artifacts) {
    if (!a.taken && Math.hypot(state.player.x - a.x, state.player.y - a.y) < 26) {
      a.taken = true;
      state.player.artifacts += 1;
      AudioSys.pickup();
    }
  }

  // Reach the glowing exit unseen and the job is done.
  const e = LEVEL.exit;
  if (state.player.x > e.x && state.player.x < e.x + e.w &&
      state.player.y > e.y && state.player.y < e.y + e.h) {
    state.mode = 'won';
    AudioSys.win();
  }
}

function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - (loop.last || timestamp)) / 1000 || 0);
  loop.last = timestamp;
  update(dt);
  renderGame(ctx, state);
  requestAnimationFrame(loop);
}

function keyName(e) {
  return e.key.toLowerCase();
}

window.addEventListener('keydown', (e) => {
  AudioSys.ensure();
  state.keys[keyName(e)] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName(e))) {
    e.preventDefault();
  }
  if (keyName(e) === 'enter' && state.mode === 'title') resetGame();
  if (keyName(e) === 'r' && (state.mode === 'won' || state.mode === 'lost')) resetGame();
});

window.addEventListener('keyup', (e) => {
  state.keys[keyName(e)] = false;
});

// Stage a fixed scene for a screenshot: ?shot=1..4. The game is paused
// on that frame so the render is deterministic.
function stageShot(n) {
  resetGame();
  state.paused = true;
  if (n === 1) {
    // The cover: the whole level at a glance, cones sweeping.
    state.guards[0].x = 640; state.guards[0].y = 170; state.guards[0].angle = 0;
    state.guards[1].x = 1050; state.guards[1].y = 280; state.guards[1].angle = Math.PI;
    state.guards[2].x = 210; state.guards[2].y = 320; state.guards[2].angle = Math.PI / 2;
    state.guards[3].x = 690; state.guards[3].y = 610; state.guards[3].angle = Math.PI;
    state.time = 12;
  } else if (n === 2) {
    // Sneaking: the thief crouched behind a crate as a cone sweeps past.
    state.player.x = 600; state.player.y = 400; state.player.sneaking = true;
    state.player.faceAngle = Math.PI / 2;
    state.guards[0].x = 640; state.guards[0].y = 300; state.guards[0].angle = Math.PI / 2;
    state.guards[1].x = 1050; state.guards[1].y = 280; state.guards[1].angle = Math.PI;
    state.detection = 12;
    state.time = 47;
  } else if (n === 3) {
    // Near miss: the alarm meter almost full, a guard turning toward you.
    state.player.x = 1000; state.player.y = 320; state.player.sneaking = true;
    state.player.faceAngle = Math.PI;
    state.guards[1].x = 1060; state.guards[1].y = 260; state.guards[1].angle = Math.PI / 2;
    state.guards[1].state = 'suspicious';
    state.guards[0].x = 640; state.guards[0].y = 170; state.guards[0].angle = 0;
    state.detection = 78;
    state.time = 96;
  } else if (n === 4) {
    // The win: at the exit, unseen, all three artifacts taken.
    state.player.x = 1208; state.player.y = 105;
    state.player.faceAngle = -Math.PI / 2;
    state.player.artifacts = 3;
    for (const a of LEVEL.artifacts) a.taken = true;
    state.guards[0].x = 640; state.guards[0].y = 170; state.guards[0].angle = 0;
    state.guards[1].x = 1050; state.guards[1].y = 280; state.guards[1].angle = Math.PI;
    state.detection = 0;
    state.time = 84;
    state.mode = 'won';
  }
}

const params = new URLSearchParams(window.location.search);
const shot = parseInt(params.get('shot') || '0', 10);
if (shot >= 1 && shot <= 4) {
  stageShot(shot);
} else {
  renderGame(ctx, state); // first paint before the loop starts
}
requestAnimationFrame(loop);
