/* ---------------------------------------------------------------
   Physics checks for the ported engine.

   Bundles src/world/engine.ts with esbuild (already a Vite dependency),
   runs it against a minimal canvas/window stub, and asserts the same
   behaviour the original vanilla build had. Run with: npm test
   --------------------------------------------------------------- */

import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, '.tmp');

/* ---------------- stubs ---------------- */
function ctx2d() {
  const o = { canvas: {} };
  const noop = () => {};
  for (const n of [
    'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse',
    'closePath', 'fill', 'stroke', 'fillRect', 'clearRect', 'rect', 'clip',
    'translate', 'rotate', 'scale', 'fillText', 'strokeText', 'quadraticCurveTo',
    'setLineDash',
  ]) o[n] = noop;
  o.createLinearGradient = o.createRadialGradient = () => ({ addColorStop: noop });
  o.measureText = (t) => ({ width: String(t).length * 6 });
  return o;
}

function installGlobals() {
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx2d() };
  globalThis.window = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    AudioContext: undefined,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  return canvas;
}

/* ---------------- harness ---------------- */
let fails = 0;
function ok(cond, msg) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fails++;
}

const canvas = installGlobals();

mkdirSync(outDir, { recursive: true });
/* One entry re-exporting both, so the engine and the test share the very
   same module instance — otherwise each bundle gets its own MOVERS array
   and nothing the engine mutates is visible here. */
const entry = join(outDir, 'entry.ts');
const posix = (p) => p.split('\\').join('/');
writeFileSync(
  entry,
  [
    `export * from '${posix(join(root, 'src/world/engine.ts'))}';`,
    `export * from '${posix(join(root, 'src/data/world.ts'))}';`,
    '',
  ].join('\n'),
);
const outfile = join(outDir, 'bundle.mjs');
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  logLevel: 'error',
});
const {
  WorldEngine, PH, PW, floorY, SIGILS, CRATES, BPADS, MOVERS,
} = await import(pathToFileURL(outfile).href);

const noop = () => {};
const engine = new WorldEngine(canvas, {
  onHud: noop, onPrompt: noop, onTalk: noop, onSigil: noop,
});
engine.resize({ clientWidth: 1280, clientHeight: 720 });

const P = engine.player;
const step = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) engine.update(dt); };
function place(f, x) {
  P.floor = f; P.x = x; P.y = floorY(f) - PH;
  P.vx = 0; P.vy = 0; P.ground = true; P.rideOn = null;
  engine.input.left = false; engine.input.right = false;
}

console.log('\nported engine — physics');
console.log(`  data: ${SIGILS.length} sigils · ${CRATES.length} crates · ${BPADS.length} pads · ${MOVERS.length} movers`);

/* 1. a crate stops you */
place(0, 400);
engine.input.right = true;
step(220);
engine.input.right = false;
ok(Math.abs(P.x - (560 - PW)) < 3, `walking into the crate at x=560 stops you (x=${P.x.toFixed(1)})`);

/* 2. crate tops hold you up */
place(0, 560);
P.x = 560; P.y = floorY(0) - 56 - PH; P.ground = true;
step(10);
ok(P.ground && Math.abs(P.y - (floorY(0) - 56 - PH)) < 2, 'a crate top holds you up');

/* 3. a bounce pad launches you far past a jump */
const pad = BPADS[0];
place(0, pad.x + 10);
P.y = floorY(0) - PH - 40; P.ground = false; P.vy = 200;
let maxUp = 0;
for (let i = 0; i < 200; i++) { engine.update(1 / 60); maxUp = Math.max(maxUp, floorY(0) - PH - P.y); }
ok(maxUp > 180, `the pad launches you ${maxUp.toFixed(0)}px (a plain jump is ~122)`);

/* 4. a sliding ledge carries you */
const mv = MOVERS[0];
step(1);
place(0, (mv.cx ?? mv.x0) + 30);
P.y = floorY(0) - mv.dy - PH; P.ground = true;
const before = P.x;
step(120);
ok(P.rideOn === mv, 'standing on the sliding ledge registers as riding it');
ok(Math.abs(P.x - before) > 8, `the ledge carried you ${(P.x - before).toFixed(1)}px`);

/* 5. sigils get collected */
const g = SIGILS[0];
engine.got = {};
place(g.f, g.x - PW / 2);
P.y = floorY(g.f) - g.dy - PH / 2; P.vy = 0;
step(3);
ok(engine.got[g.id] === true, `walking into sigil ${g.s} collects it`);
ok(engine.gotCount() === 1, `the counter reads ${engine.gotCount()}/12`);

/* 6. you can never fall out of the level */
place(0, 900);
P.y = floorY(0) + 900; P.vy = 900;
step(40);
ok(P.y <= floorY(0) + 200, 'falling off is caught and you are set back down');

/* 7. every sigil is still reachable */
function reach(sig, seed) {
  engine.got = {};
  P.floor = sig.f;
  P.x = sig.x + (seed % 2 ? -420 : 420);
  P.y = floorY(sig.f) - PH;
  P.vx = 0; P.vy = 0; P.ground = true; P.rideOn = null;
  let r = seed * 9301 + 49297;
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < 2600; i++) {
    const toward = sig.x - (P.x + PW / 2);
    if (rand() < 0.75) { engine.input.right = toward > 0; engine.input.left = toward < 0; }
    else { engine.input.right = rand() < 0.5; engine.input.left = !engine.input.right; }
    if (rand() < 0.09) engine.jump();
    engine.update(1 / 60);
    if (engine.got[sig.id]) return i;
  }
  return -1;
}
let unreachable = 0;
for (const sig of SIGILS) {
  let hit = -1;
  for (let s = 1; s <= 140 && hit < 0; s++) hit = reach(sig, s);
  if (hit < 0) { unreachable++; console.log(`  FAIL  sigil ${sig.s} unreachable`); }
}
ok(unreachable === 0, `all ${SIGILS.length} sigils reachable`);

/* 8. long random play without a crash */
place(0, 0);
let err = null;
try {
  for (let s = 0; s < 9000; s++) {
    if (s % 97 === 0) { engine.input.right = Math.random() < 0.6; engine.input.left = !engine.input.right && Math.random() < 0.4; }
    if (s % 53 === 0) engine.jump();
    if (s % 1500 === 0) place(s % 3, 200 + Math.random() * 2500);
    engine.update(1 / 60);
    if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) throw new Error('non-finite position at step ' + s);
  }
} catch (e) { err = e; }
ok(!err, '9000 frames of random play without a crash' + (err ? ' — ' + err.message : ''));

rmSync(outDir, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nported engine matches the original behaviour');
process.exit(fails ? 1 : 0);
