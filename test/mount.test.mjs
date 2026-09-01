/* ---------------------------------------------------------------
   Mounts the whole App in jsdom and checks the things that actually
   matter: it renders without throwing, the page has its sections,
   the gates lock and unlock, the mobile menu opens, and — the point
   of this pass — the real cursor is never hidden.
   --------------------------------------------------------------- */

import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, '.tmp-mount');

let fails = 0;
function ok(cond, msg) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) fails++;
}

/* ---- a browser ---- */
const dom = new JSDOM('<!doctype html><html data-theme="dark"><body><div id="root"></div></body></html>', {
  url: 'https://example.test/',
  pretendToBeVisual: true,
});
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
/* node 21+ defines navigator as a getter-only global */
Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator, configurable: true, writable: true,
});
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.Element = window.Element;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* jsdom has no canvas and no matchMedia; supply just enough */
window.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  const o = { canvas: this };
  for (const n of [
    'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse',
    'closePath', 'fill', 'stroke', 'fillRect', 'clearRect', 'rect', 'clip',
    'translate', 'rotate', 'scale', 'fillText', 'strokeText', 'quadraticCurveTo',
    'setLineDash',
  ]) o[n] = noop;
  o.createLinearGradient = o.createRadialGradient = () => ({ addColorStop: noop });
  o.measureText = (t) => ({ width: String(t).length * 6 });
  return o;
};
/* pretend we are a desktop with a real mouse, so the ring should render */
window.matchMedia = (q) => ({
  media: q,
  matches: /hover: hover|pointer: fine/.test(q),
  addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {},
});

/* ---- bundle the app for node ---- */
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'app.mjs');
await build({
  entryPoints: [join(root, 'src/App.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
  logLevel: 'error',
});

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');
const App = (await import(pathToFileURL(outfile).href)).default;

const host = window.document.getElementById('root');
const root_ = createRoot(host);

let renderError = null;
try {
  await act(async () => {
    root_.render(React.createElement(App));
  });
} catch (e) {
  renderError = e;
}

console.log('\nApp mount');
ok(!renderError, 'the app renders without throwing' + (renderError ? ' — ' + renderError.message : ''));

const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => Array.from(window.document.querySelectorAll(sel));

/* ---- structure ---- */
for (const id of ['hero', 'showcase', 'about', 'education', 'achievements', 'coaching', 'projects', 'skills', 'contact']) {
  ok(!!$('#' + id), `section #${id} is on the page`);
}
ok($$('nav .nav-links a').length === 6, `nav has ${$$('nav .nav-links a').length} links (5 + CV)`);
ok($$('.medal-card').length === 12, `all 12 medals rendered`);
ok($$('.project-card').length === 4, `all 4 projects rendered`);
ok($$('.contact-link').length === 5, `all 5 contact links rendered`);
ok($$('.stat-card').length === 4, `all 4 stat cards rendered`);

/* ---- the hero portrait slot ---- */
const photo = $('.hero-photo');
ok(!!photo, 'the hero has a portrait slot');
ok(photo.parentElement.classList.contains('hero-right'), 'it sits in the hero, above the stats');
ok(photo.previousElementSibling === null, 'it is the first thing in that column');
const img = $('.hero-photo img');
ok(!!img, 'it renders an <img> pointing at the photo');
ok(img.getAttribute('src') === 'photo.jpg', `src is "${img.getAttribute('src')}"`);
ok(!!img.getAttribute('alt'), 'the image has alt text');
ok(!$('.hero-photo figcaption'), 'no card chrome — the circle is the whole thing');
/* jsdom never loads images, so fire the error path the same way a missing file would */
await act(async () => { img.dispatchEvent(new window.Event('error')); });
ok(!!$('.hp-empty'), 'a missing photo falls back to the same circle with the mark');
ok(/photo\.jpg/.test($('.hp-hint').textContent), 'the placeholder names the file to drop in');

/* the shape really is round, and both states share it */
const photoCss = readFileSync(join(root, 'src/styles/page.css'), 'utf8');
const block = photoCss.slice(photoCss.indexOf('.hero-photo {'));
ok(/border-radius:\s*50%/.test(block), 'the portrait is a circle');
ok(/border:\s*2px solid var\(--orange\)/.test(block), 'it has an orange rim');
ok(/\.hp-img,\s*\n\.hp-empty\s*\{[^}]*border-radius:\s*50%/.test(block),
   'the photo and the placeholder are both clipped to the circle');
ok(/aspect-ratio:\s*1/.test(block), 'it stays perfectly round at any width');

/* ---- THE CURSOR ---- */
const ring = $('#cursor');
ok(!!ring, 'the orange accent ring renders on a fine-pointer device');
const css = readFileSync(join(root, 'src/styles/page.css'), 'utf8')
  + readFileSync(join(root, 'src/styles/world.css'), 'utf8');
ok(!/cursor:\s*none/.test(css), 'no rule anywhere hides the real mouse cursor');
ok(/body\s*\{\s*cursor:\s*auto/.test(css), 'body explicitly restores the normal arrow cursor');

/* ---- the gates start locked, and the skip opens them ---- */
ok($$('.gate-wrap.locked').length === 4, `${$$('.gate-wrap.locked').length} sections start locked`);
ok($$('.gc-skip').length === 4, 'every lock card offers a skip');

await act(async () => { $('#skipWorld').click(); });
ok($$('.gate-wrap.locked').length === 0, 'Skip unlocks every gated section');
ok(/already unlocked/i.test($('.skip-note').textContent), 'the note updates to say everything is open');

/* ---- the mobile menu ---- */
const burger = $('.nav-burger');
ok(!!burger, 'the mobile menu button exists');
ok(burger.getAttribute('aria-expanded') === 'false', 'menu starts closed');
await act(async () => { burger.click(); });
ok($('nav').classList.contains('nav-open'), 'tapping the burger opens the menu');
ok(burger.getAttribute('aria-expanded') === 'true', 'aria-expanded flips to true');
await act(async () => {
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
ok(!$('nav').classList.contains('nav-open'), 'Escape closes it');

/* ---- the world opens ---- */
await act(async () => { $('#enterWorld').click(); });
ok($('#arcade').classList.contains('on'), 'Play / Explore opens the world overlay');
ok(!!$('#arcade canvas'), 'the world has its canvas');
ok($$('.minimap .mm-row').length === 3, 'the minimap shows three floors');
await act(async () => { $('.arc-exit').click(); });
ok(!$('#arcade').classList.contains('on'), 'Back to the site closes it again');

rmSync(outDir, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nthe React app mounts and behaves');
process.exit(fails ? 1 : 0);
