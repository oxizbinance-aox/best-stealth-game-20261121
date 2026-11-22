// GHOSTLIGHT hand-in (Node 22, standard library only).
//
// The game lives in game/ as plain static files and the screenshots in
// screenshots/. This program copies both into the output directory and
// writes dossier.json, the summary the judge reads, using the kit's
// vendored library (vendor/makefun-game.ts, unchanged).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve everything from this file's own folder, never from the
// working directory: the grader runs the program from /.
const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the bounty rules: the dossier text is
// capped at 160 KiB; the rest only refuse an entry the scorer would
// refuse, so failing here is failing the same way the gate would.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
};

// Check the entry is complete before copying it anywhere: a missing
// index.html or the wrong number of screenshots is a refused entry.
function checkEntry() {
  const indexPath = join(here, 'game', 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error('game/index.html is missing — the game cannot load');
  }
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) {
    throw new Error('screenshots/ is missing — the entry needs 3 or 4 screenshots');
  }
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error('expected 3 or 4 screenshots, found ' + shots.length);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > 262144) {
      throw new Error('screenshot ' + name + ' is ' + bytes + ' bytes, over the 256 KiB cap');
    }
  }
  return shots.length;
}

const shotCount = checkEntry();

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));

// The grader runs this program twice and both runs must write the same
// bytes, so prove the dossier is deterministic before finishing: build
// it a second time and refuse to hand in a dossier that changes.
const firstWrite = buildDossier(outDir, DOSSIER_CAPS);
const secondWrite = buildDossier(outDir, DOSSIER_CAPS);
if (!Buffer.from(firstWrite).equals(Buffer.from(secondWrite))) {
  throw new Error('dossier.json is not deterministic across builds — refusing to hand in');
}

console.log('handed in: game/ + ' + shotCount + ' screenshots + dossier.json -> ' + outDir);
