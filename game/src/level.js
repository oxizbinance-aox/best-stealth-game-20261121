// GHOSTLIGHT level: the Meridian Museum gallery at night.
// One room, 1280x720 pixels. Walls and crates block movement and sight;
// the exit glows in the far corner. All coordinates are pixels.
'use strict';

const LEVEL = {
  width: 1280,
  height: 720,

  // Solid walls. The first four are the room border.
  walls: [
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 696, w: 1280, h: 24 },
    { x: 0, y: 0, w: 24, h: 720 },
    { x: 1256, y: 0, w: 24, h: 720 },
    { x: 400, y: 80, w: 24, h: 300 },
    { x: 400, y: 480, w: 24, h: 160 },
    { x: 840, y: 200, w: 24, h: 280 },
    { x: 560, y: 520, w: 280, h: 24 },
    { x: 640, y: 120, w: 200, h: 24 }
  ],

  // Crates are cover: they block movement and line of sight.
  crates: [
    { x: 540, y: 200, w: 44, h: 44 },
    { x: 620, y: 340, w: 44, h: 44 },
    { x: 980, y: 180, w: 44, h: 44 },
    { x: 1060, y: 420, w: 44, h: 44 },
    { x: 300, y: 520, w: 44, h: 44 },
    { x: 700, y: 420, w: 44, h: 44 },
    { x: 950, y: 560, w: 44, h: 44 },
    { x: 220, y: 300, w: 44, h: 44 }
  ],

  // Optional pickups on the riskier routes. Worth the detour.
  artifacts: [
    { x: 600, y: 140, taken: false },
    { x: 1100, y: 300, taken: false },
    { x: 300, y: 620, taken: false }
  ],

  // The way out. Reach it unseen and the job is done.
  exit: { x: 1180, y: 60, w: 56, h: 90 },

  // Where the thief slips in.
  spawn: { x: 90, y: 630 },

  // Four guards, each on a fixed loop you can learn.
  guards: [
    { waypoints: [[520, 160], [760, 180], [760, 300], [520, 300]] },
    { waypoints: [[960, 140], [1150, 140], [1150, 420], [960, 420]] },
    { waypoints: [[120, 200], [300, 200], [300, 440], [120, 440]] },
    { waypoints: [[480, 640], [900, 640], [900, 580], [480, 580]] }
  ]
};

// Every solid rectangle in the level (walls + crates) for collision and sight.
function solidRects() {
  return LEVEL.walls.concat(LEVEL.crates);
}
