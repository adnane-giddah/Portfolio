

import {
  BPADS, CRATES, FLOORS, LIFTS, MOVERS, NPCS, PLATS, SIGILS,
} from '../data/world';
import type { BouncePad, Crate, Mover, Npc, PromptState, Sigil } from '../types';


const INK = '#E8E0D8';
const ACCENT = '#F9DB08';
const ACCENT_DIM = '#B39E06';


const RUN = 300;
const ACC = 2300;
const FRIC = 2600;
const AIRC = 1500;
const GRAV = 2000;
const JUMP = -700;
const MAXFALL = 980;
const BOUNCE = -1080;
export const PW = 32;
export const PH = 42;

const SYM = ['e', 'i', 'π', '+', '1', '=', '0'];

// Physics runs at a fixed rate; drawing interpolates between the last two
// steps, so motion stays smooth whatever the display's refresh rate.
const STEP = 1 / 60;
const MAX_STEPS = 5;

// Distant ridgelines: one tileable period each, sampled once.
const RIDGE_TILE = 1600;
const RIDGES = [
  { px: 0.08, py: 0.05, horizon: 0.5, amp: 74, seed: 1, top: '#221C3A', bot: '#16122A' },
  { px: 0.18, py: 0.08, horizon: 0.57, amp: 60, seed: 2, top: '#16122A', bot: '#0F0D1C' },
  { px: 0.32, py: 0.12, horizon: 0.63, amp: 48, seed: 3, top: '#0D0B17', bot: '#090810' },
];

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  const x = cv.getContext('2d');
  if (!x) throw new Error('2d canvas context unavailable');
  return [cv, x];
}

/** White alpha shape → tinted copy, so one gradient serves every color. */
function tint(cv: HTMLCanvasElement, x: CanvasRenderingContext2D, color: string) {
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, cv.width, cv.height);
  x.globalCompositeOperation = 'source-over';
  return cv;
}

function rnd(s: number) {
  const x = Math.sin(s * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
export function floorY(f: number) {
  return FLOORS[f].y;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; t: number; c: string; r: number }
interface TrailDot { x: number; y: number; t: number }
interface Star { x: number; y: number; r: number; a: number }
interface Mote { x: number; y: number; s: string; sc: number; a: number }
interface Bokeh { x: number; y: number; r: number; a: number; sp: number; c: string }

interface Ride { from: number; to: number; x: number; t: number; dur: number }

export interface EngineCallbacks {

  onHud: () => void;

  onPrompt: (p: PromptState | null) => void;

  onEnterCave: (npc: Npc) => void;

  onExitCave: () => void;

  onOpenContent: (npc: Npc) => void;

  onSigil: (sigil: Sigil, collected: number, total: number) => void;
}

export type View = 'world' | 'cave' | 'panel';

const CAVE_HALF = 60;
const CORRIDOR_LEN = 720;
const JEWEL_X = CORRIDOR_LEN / 2;
const JEWEL_RANGE = 46;

type PxColor = 'K' | 'D' | 'M' | 'H' | 'W' | 'Y' | 'A';
const PX_PALETTE: Record<PxColor, string> = {
  K: '#0B0A08',
  D: '#1E1B17',
  M: '#34302A',
  H: '#7A7468',
  W: '#F2ECDD',
  Y: '#F9DB08',
  A: '#C9A227',
};

const PX_BODY: [number, number][][] = [
  [[6, 7]],
  [[5, 8]],
  [[4, 9]],
  [[3, 10]],
  [[3, 10]],
  [[2, 11]],
  [[2, 11]],
  [[2, 11]],
  [[2, 11]],
  [[1, 12]],
  [[1, 12]],
  [[1, 12]],
  [[1, 12]],
  [[1, 12]],
  [[1, 12]],
  [[1, 12]],
  [[2, 11]],
  [[2, 11]],
  [[2, 11]],
  [[3, 5], [8, 10]],
  [[3, 5], [8, 10]],
];
const PX_EYES: [number, number][] = [[6, 4], [6, 9]];
const PX_SASH: [number, number][] = [[9, 3], [10, 4], [11, 5], [12, 6], [13, 7], [14, 8], [15, 9]];
const PX_ACCENT: [number, number] = [13, 7];
const PX_BOOT_ROWS = [19, 20];

const PX_LANTERN: [number, number, PxColor][] = [
  [0, 1, 'H'],
  [1, 0, 'Y'], [1, 1, 'A'], [1, 2, 'Y'],
  [2, 0, 'Y'], [2, 1, 'A'], [2, 2, 'Y'],
  [3, 0, 'Y'], [3, 1, 'A'], [3, 2, 'Y'],
  [4, 1, 'Y'],
];
const PX_WEAPON: [number, number, PxColor][] = [
  [0, 0, 'Y'], [1, 0, 'Y'], [1, 1, 'Y'], [2, 1, 'Y'],
];

export class WorldEngine {
  private cvs: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;


  found: Record<string, boolean> = {};
  got: Record<string, boolean> = {};
  muted = false;

  view: View = 'world';
  running = false;

  private W = 0; private H = 0; private S = 1;
  private VW = 960; private VH = 540; private DPR = 1;
  private camX = 0; private camY = 0; private t = 0;

  player = {
    x: 280, y: -PH, vx: 0, vy: 0, floor: 0,
    ground: true, rot: 0, squash: 0, facing: 1,
    rideOn: null as Mover | null,
  };
  input = { left: false, right: false };

  private coyote = 0;
  private buffer = 0;
  private ride: Ride | null = null;
  private activeCave: Npc | null = null;
  private caveReturn: { floor: number; x: number } | null = null;
  private nearJewel = false;
  private parts: Particle[] = [];
  private trail: TrailDot[] = [];
  private stars: Star[] = [];
  private motes: Mote[] = [];
  private bokeh: Bokeh[] = [];
  private ridges: number[][] = [];
  private raf = 0;
  private last = 0;
  private acc = 0;
  private alpha = 1;
  private prev = { x: 0, y: 0, cx: 0, cy: 0, t: 0 };
  private look = 0;

  private host: HTMLElement | null = null;
  private dprCap = 2;
  private frameAvg = STEP;
  private frameCount = 0;

  // Sprites are resolution-independent and built once; `scaled` holds
  // patterns and gradients tied to the canvas size and is dropped on resize.
  private glows = new Map<string, HTMLCanvasElement>();
  private strips = new Map<string, HTMLCanvasElement>();
  private moteSprites = new Map<string, HTMLCanvasElement>();
  private grads = new Map<string, CanvasGradient>();
  private heroSprite: HTMLCanvasElement | null = null;
  private scaled: {
    fills: Map<string, CanvasPattern | string>;
    sky?: CanvasGradient; vig?: CanvasGradient; caveSky?: CanvasGradient; caveVig?: CanvasGradient;
    ridge: CanvasGradient[];
  } = { fills: new Map(), ridge: [] };
  private promptKey: string | null = null;

  private ac: AudioContext | null | false = null;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.cvs = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context unavailable');
    this.ctx = ctx;
    this.cb = cb;

    for (let i = 0; i < 190; i++) {
      this.stars.push({
        x: rnd(i) * 3600 - 300, y: rnd(i + 91) * 1500 - 1100,
        r: rnd(i + 7) * 1.6 + 0.4, a: rnd(i + 31) * 0.55 + 0.18,
      });
    }
    for (let j = 0; j < 60; j++) {
      this.motes.push({
        x: rnd(j + 3) * 3400 - 260, y: rnd(j + 51) * 1400 - 1050,
        s: SYM[Math.floor(rnd(j + 13) * SYM.length)],
        sc: rnd(j + 77) * 20 + 15, a: rnd(j + 5) * 0.09 + 0.035,
      });
    }
    for (let k = 0; k < 22; k++) {
      this.bokeh.push({
        x: rnd(k + 211) * 1400, y: rnd(k + 307) * 800,
        r: rnd(k + 401) * 16 + 6, a: rnd(k + 503) * 0.07 + 0.03,
        sp: rnd(k + 601) * 10 + 4, c: rnd(k + 701) < 0.6 ? ACCENT : INK,
      });
    }
    for (const R of RIDGES) {
      const ph = [0, 1, 2, 3].map((i) => rnd(R.seed * 7 + i) * 6);
      const pts: number[] = [];
      for (let x = 0; x <= RIDGE_TILE; x += 16) {
        const u = (x / RIDGE_TILE) * Math.PI * 2;
        const y = 0.5 * Math.sin(u * 2 + ph[0]) + 0.28 * Math.sin(u * 5 + ph[1]) +
          0.14 * Math.sin(u * 11 + ph[2]) + 0.06 * Math.sin(u * 23 + ph[3]);
        pts.push(-(y * 0.5 + 0.5) * R.amp);
      }
      this.ridges.push(pts);
    }
    // Motes are text sprites; redraw them once the webfont has arrived.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => this.moteSprites.clear());
    }
  }


  private audio(): AudioContext | null {
    if (this.ac === null) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        this.ac = Ctor ? new Ctor() : false;
      } catch { this.ac = false; }
    }
    return this.ac || null;
  }
  blip(freq: number, dur: number, type: OscillatorType = 'triangle', vol = 0.055) {
    if (this.muted) return;
    const a = this.audio();
    if (!a) return;
    if (a.state === 'suspended') void a.resume();
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }
  sweep(f1: number, f2: number, dur: number, type: OscillatorType = 'sine') {
    if (this.muted) return;
    const a = this.audio();
    if (!a) return;
    if (a.state === 'suspended') void a.resume();
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), a.currentTime + dur);
    g.gain.setValueAtTime(0.06, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }
  unlockAudio() { this.audio(); }


  resize(host: HTMLElement) {
    this.host = host;
    this.scaled = { fills: new Map(), ridge: [] };
    this.W = host.clientWidth || window.innerWidth;
    this.H = host.clientHeight || window.innerHeight;
    this.DPR = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.cvs.width = Math.round(this.W * this.DPR);
    this.cvs.height = Math.round(this.H * this.DPR);
    this.cvs.style.width = this.W + 'px';
    this.cvs.style.height = this.H + 'px';
    this.S = this.H / 540;
    if (this.W / this.S < 620) this.S = this.W / 620;
    if (this.W / this.S > 1200) this.S = this.W / 1200;
    this.VW = this.W / this.S;
    this.VH = this.H / this.S;
    this.snapCam(1);
  }


  spawn(seekId?: string) {
    const seek = seekId ? NPCS.find((n) => n.id === seekId) : undefined;
    if (seek) {
      this.player.floor = seek.f;
      this.player.x = clamp(seek.x - 300, FLOORS[seek.f].x0, FLOORS[seek.f].x1 - PW);
    }
    this.player.y = floorY(this.player.floor) - PH;
    this.player.vx = 0; this.player.vy = 0; this.player.facing = 1;
    this.player.ground = true; this.player.rideOn = null;
    this.ride = null;
    this.input.left = false; this.input.right = false;
    this.trail.length = 0; this.parts.length = 0;
    this.look = 0;
    this.snapCam(1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  destroy() {
    this.stop();
    if (this.ac) { try { void this.ac.close(); } catch {  } }
  }

  private frame = (ts: number) => {
    if (!this.running) return;
    if (!this.last) this.last = ts;
    let el = (ts - this.last) / 1000;
    this.last = ts;
    // A hidden tab or a long hitch: carry on rather than fast-forward.
    if (el > 0.25 || el < 0) el = STEP;
    this.acc += el;
    let n = 0;
    while (this.acc >= STEP && n < MAX_STEPS) {
      this.savePrev();
      this.update(STEP);
      this.acc -= STEP;
      n++;
    }
    if (n === MAX_STEPS) this.acc = 0;
    this.alpha = clamp(this.acc / STEP, 0, 1);
    this.tuneQuality(el);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private savePrev() {
    const p = this.prev;
    p.x = this.player.x; p.y = this.player.y;
    p.cx = this.camX; p.cy = this.camY; p.t = this.t;
  }

  /** Fall back to 1x resolution if the device can't hold ~45fps at 2x. */
  private tuneQuality(el: number) {
    if (!this.host || this.DPR <= 1 || el > 0.1) return;
    this.frameAvg = this.frameAvg * 0.95 + el * 0.05;
    if (++this.frameCount < 150) return;
    this.frameCount = 0;
    if (this.frameAvg > 1 / 45) {
      this.dprCap = 1;
      this.resize(this.host);
    }
  }


  jump() {
    if ((this.view !== 'world' && this.view !== 'cave') || this.ride) return;
    if (this.player.ground || this.coyote > 0) {
      this.player.vy = JUMP;
      this.player.ground = false;
      this.coyote = 0; this.buffer = 0;
      this.player.squash = 1;
      this.blip(500, 0.09, 'triangle', 0.045);
      this.puff(this.player.x + PW / 2, this.player.y + PH, 6, '#F9DB08');
    } else {
      this.buffer = 0.18;
    }
  }
  releaseJump() {
    if (this.player.vy < -230) this.player.vy = -230;
  }


  act() {
    if (this.ride) return;
    if (this.view === 'world') {
      const L = this.liftHere();
      if (L) {
        this.ride = { from: this.player.floor, to: L.to, x: L.lift.x, t: 0, dur: 0.62 };
        this.player.vx = 0; this.player.vy = 0;
        this.sweep(300, 900, 0.5, 'sine');
      }
    } else if (this.view === 'cave' && this.nearJewel) {
      this.openContent();
    }
  }

  closePanel() {
    if (this.view !== 'panel') return;
    this.view = 'cave';
    this.blip(420, 0.1, 'sine', 0.04);
  }

  private openContent() {
    if (!this.activeCave) return;
    this.view = 'panel';
    this.blip(660, 0.1, 'triangle', 0.05);
    this.cb.onOpenContent(this.activeCave);
  }

  private enterCave(n: Npc) {
    this.activeCave = n;
    this.caveReturn = { floor: n.f, x: n.x };
    this.view = 'cave';
    const fromLeft = this.player.facing >= 0;
    this.player.x = fromLeft ? 0 : CORRIDOR_LEN - PW;
    this.player.y = -PH;
    this.player.vx = 0; this.player.vy = 0;
    this.player.ground = true; this.player.rideOn = null;
    this.nearJewel = false;
    this.showPrompt(null);
    this.blip(520, 0.14, 'triangle', 0.05);
    this.snapCaveCam(1);
    this.cb.onEnterCave(n);
  }

  private exitCave(side: 'left' | 'right') {
    const back = this.caveReturn;
    if (!back) return;
    this.view = 'world';
    this.player.floor = back.floor;
    this.player.x = clamp(
      side === 'left' ? back.x - CAVE_HALF - 26 : back.x + CAVE_HALF + 26,
      FLOORS[back.floor].x0, FLOORS[back.floor].x1 - PW,
    );
    this.player.y = floorY(back.floor) - PH;
    this.player.vx = 0; this.player.vy = 0;
    this.player.ground = true; this.player.rideOn = null;
    this.player.facing = side === 'left' ? -1 : 1;
    this.blip(420, 0.1, 'sine', 0.04);
    this.activeCave = null;
    this.caveReturn = null;
    this.snapCam(1);
    this.cb.onExitCave();
  }


  private puff(x: number, y: number, n: number, c: string) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x, y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.9) * 260,
        life: 0.45 + Math.random() * 0.4,
        t: 0, c, r: 2 + Math.random() * 3,
      });
    }
  }

  private liftHere() {
    if (!this.player.ground) return null;
    for (const L of LIFTS) {
      if (Math.abs(this.player.x + PW / 2 - L.x) > 46) continue;
      if (this.player.floor === L.a) return { lift: L, to: L.b };
      if (this.player.floor === L.b) return { lift: L, to: L.a };
    }
    return null;
  }

  private caveMouthHere(): Npc | null {
    if (!this.player.ground) return null;
    for (const n of NPCS) {
      if (n.f !== this.player.floor) continue;
      if (Math.abs(this.player.x + PW / 2 - n.x) >= CAVE_HALF) continue;
      if (n.dy && Math.abs(this.player.y + PH - (floorY(n.f) - n.dy)) >= 34) continue;
      return n;
    }
    return null;
  }

  private moverX(m: Mover) {
    return m.x0 + (m.x1 - m.x0) * (0.5 - 0.5 * Math.cos(this.t * m.sp + m.ph));
  }
  private moverTop(m: Mover) {
    return floorY(m.f) - m.dy;
  }
  private padUnder(): BouncePad | null {
    for (const b of BPADS) {
      if (b.f !== this.player.floor) continue;
      if (this.player.x + PW > b.x && this.player.x < b.x + b.w) return b;
    }
    return null;
  }

  gotCount() {
    return SIGILS.filter((g) => this.got[g.id]).length;
  }
  foundCount() {
    return NPCS.filter((n) => this.found[n.id]).length;
  }


  private update(dt: number) {
    this.t += dt;

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 820 * dt;
      if (p.t >= p.life) this.parts.splice(i, 1);
    }
    for (const q of this.trail) q.t += dt;


    for (const M of MOVERS) {
      const mx = this.moverX(M);
      M.dx = M.cx === undefined ? 0 : mx - M.cx;
      if (Math.abs(M.dx) > 14) M.dx = 0;
      M.cx = mx;
    }

    if (this.view === 'panel') {
      this.showPrompt(null);
      return;
    }
    if (this.view === 'cave') {
      this.updateCave(dt);
      return;
    }


    if (this.ride) {
      this.ride.t += dt;
      const k = clamp(this.ride.t / this.ride.dur, 0, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.player.x = this.ride.x - PW / 2;
      this.player.y = floorY(this.ride.from) + (floorY(this.ride.to) - floorY(this.ride.from)) * e - PH;
      if (this.ride.t % 0.1 < dt) this.puff(this.ride.x, this.player.y + PH, 2, INK);
      if (k >= 1) {
        this.player.floor = this.ride.to;
        this.player.ground = true;
        this.player.vy = 0;
        this.ride = null;
        this.blip(760, 0.14, 'triangle', 0.05);
        this.cb.onHud();
      }
      this.snapCam(0.14);
      return;
    }


    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (dir !== 0) {
      this.player.vx += dir * (this.player.ground ? ACC : AIRC) * dt;
    } else {
      const f = (this.player.ground ? FRIC : AIRC * 0.6) * dt;
      this.player.vx = this.player.vx > 0
        ? Math.max(0, this.player.vx - f)
        : Math.min(0, this.player.vx + f);
    }
    this.player.vx = clamp(this.player.vx, -RUN, RUN);
    if (Math.abs(this.player.vx) > 12) this.player.facing = this.player.vx > 0 ? 1 : -1;
    if (this.player.rideOn && this.player.ground) {
      this.player.x += this.player.rideOn.dx ?? 0;
    }
    const prevX = this.player.x;
    this.player.x += this.player.vx * dt;

    const F = FLOORS[this.player.floor];
    if (this.player.x < F.x0) { this.player.x = F.x0; this.player.vx = 0; }
    if (this.player.x + PW > F.x1) { this.player.x = F.x1 - PW; this.player.vx = 0; }


    for (const C of CRATES) {
      if (C.f !== this.player.floor) continue;
      const cTop = floorY(C.f) - C.h;
      if (this.player.y + PH <= cTop + 5) continue;
      if (this.player.y >= floorY(C.f)) continue;
      if (prevX + PW <= C.x && this.player.x + PW > C.x) {
        this.player.x = C.x - PW; this.player.vx = 0;
      } else if (prevX >= C.x + C.w && this.player.x < C.x + C.w) {
        this.player.x = C.x + C.w; this.player.vx = 0;
      }
    }


    const prevBottom = this.player.y + PH;
    this.player.vy = Math.min(MAXFALL, this.player.vy + GRAV * dt);
    this.player.y += this.player.vy * dt;
    const wasGround = this.player.ground;
    this.player.ground = false;
    this.player.rideOn = null;

    const gy = floorY(this.player.floor);
    if (this.player.vy >= 0 && this.player.y + PH >= gy && prevBottom <= gy + 28) {
      this.player.y = gy - PH; this.player.vy = 0; this.player.ground = true;
    }
    for (const pl of PLATS) {
      if (pl.f !== this.player.floor) continue;
      const top = floorY(pl.f) - pl.dy;
      if (this.player.x + PW * 0.85 > pl.x && this.player.x + PW * 0.15 < pl.x + pl.w &&
          this.player.vy >= 0 && this.player.y + PH >= top && prevBottom <= top + 24) {
        this.player.y = top - PH; this.player.vy = 0; this.player.ground = true;
      }
    }

    for (const cr of CRATES) {
      if (cr.f !== this.player.floor) continue;
      const ct = floorY(cr.f) - cr.h;
      if (this.player.x + PW * 0.85 > cr.x && this.player.x + PW * 0.15 < cr.x + cr.w &&
          this.player.vy >= 0 && this.player.y + PH >= ct && prevBottom <= ct + 24) {
        this.player.y = ct - PH; this.player.vy = 0; this.player.ground = true;
      }
    }

    for (const mo of MOVERS) {
      if (mo.f !== this.player.floor) continue;
      const mt = this.moverTop(mo);
      const mox = mo.cx ?? this.moverX(mo);
      if (this.player.x + PW * 0.85 > mox && this.player.x + PW * 0.15 < mox + mo.w &&
          this.player.vy >= 0 && this.player.y + PH >= mt && prevBottom <= mt + 26) {
        this.player.y = mt - PH; this.player.vy = 0;
        this.player.ground = true; this.player.rideOn = mo;
      }
    }

    if (this.player.y > gy + 200) {
      this.player.y = gy - PH; this.player.vy = 0; this.player.ground = true;
    }

    if (this.player.ground) {
      if (!wasGround) {
        this.player.squash = 1;
        this.blip(170, 0.05, 'sine', 0.028);
        this.puff(this.player.x + PW / 2, this.player.y + PH, 4, INK);
      }
      this.coyote = 0.16;

      const onFloor = Math.abs(this.player.y + PH - floorY(this.player.floor)) < 2;
      const bp = onFloor ? this.padUnder() : null;
      if (bp) {
        this.player.vy = BOUNCE;
        this.player.ground = false;
        this.coyote = 0;
        this.player.squash = 1;
        bp.flash = 1;
        this.sweep(320, 880, 0.26, 'triangle');
        this.puff(this.player.x + PW / 2, this.player.y + PH, 9, ACCENT);
      }
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }
    for (const b of BPADS) if (b.flash) b.flash = Math.max(0, b.flash - dt * 2.2);


    for (const G of SIGILS) {
      if (G.f !== this.player.floor || this.got[G.id]) continue;
      const gx = G.x;
      const gyy = floorY(G.f) - G.dy;
      if (Math.abs(this.player.x + PW / 2 - gx) < 30 &&
          Math.abs(this.player.y + PH / 2 - gyy) < 34) {
        this.got[G.id] = true;
        this.puff(gx, gyy, 12, ACCENT);
        this.blip(880 + this.gotCount() * 40, 0.13, 'triangle', 0.05);
        if (this.gotCount() === SIGILS.length) this.sweep(420, 1250, 0.7, 'sine');
        this.cb.onSigil(G, this.gotCount(), SIGILS.length);
      }
    }

    if (this.buffer > 0) {
      this.buffer -= dt;
      if (this.player.ground || this.coyote > 0) this.jump();
    }
    this.player.squash = Math.max(0, this.player.squash - dt * 4.5);

    const want = (this.player.vx / RUN) * 0.18 +
      (this.player.ground ? 0 : clamp(this.player.vy / 900, -1, 1) * 0.09);
    this.player.rot += (want - this.player.rot) * Math.min(1, dt * 9);

    if (Math.abs(this.player.vx) > 30 || !this.player.ground) {
      this.trail.push({ x: this.player.x + PW / 2, y: this.player.y + PH / 2, t: 0 });
      if (this.trail.length > 20) this.trail.shift();
    } else if (this.trail.length && Math.random() < 0.3) {
      this.trail.shift();
    }


    const mouth = this.caveMouthHere();
    if (mouth) {
      this.enterCave(mouth);
      return;
    }

    const L = this.liftHere();
    if (L) {
      this.showPrompt({ glyph: '↕', text: 'Lift to ', bold: FLOORS[L.to].name, key: 'E' });
    } else {
      this.showPrompt(null);
    }

    this.followCam(dt);
  }

  /** Soft follow with a little look-ahead in the direction of travel. */
  private followCam(dt: number) {
    this.look += ((this.player.vx / RUN) * 90 - this.look) * (1 - Math.pow(0.05, dt));
    this.snapCam(1 - Math.pow(0.004, dt), 1 - Math.pow(0.003, dt));
  }

  private updateCave(dt: number) {
    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (dir !== 0) {
      this.player.vx += dir * (this.player.ground ? ACC : AIRC) * dt;
    } else {
      const f = (this.player.ground ? FRIC : AIRC * 0.6) * dt;
      this.player.vx = this.player.vx > 0
        ? Math.max(0, this.player.vx - f)
        : Math.min(0, this.player.vx + f);
    }
    this.player.vx = clamp(this.player.vx, -RUN, RUN);
    if (Math.abs(this.player.vx) > 12) this.player.facing = this.player.vx > 0 ? 1 : -1;
    this.player.x += this.player.vx * dt;

    const prevBottom = this.player.y + PH;
    this.player.vy = Math.min(MAXFALL, this.player.vy + GRAV * dt);
    this.player.y += this.player.vy * dt;
    const wasGround = this.player.ground;
    this.player.ground = false;
    if (this.player.vy >= 0 && this.player.y + PH >= 0 && prevBottom <= 28) {
      this.player.y = -PH; this.player.vy = 0; this.player.ground = true;
    }
    if (this.player.ground) {
      if (!wasGround) {
        this.player.squash = 1;
        this.blip(170, 0.05, 'sine', 0.028);
      }
      this.coyote = 0.16;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }
    if (this.buffer > 0) {
      this.buffer -= dt;
      if (this.player.ground || this.coyote > 0) this.jump();
    }
    this.player.squash = Math.max(0, this.player.squash - dt * 4.5);
    const want = (this.player.vx / RUN) * 0.18 +
      (this.player.ground ? 0 : clamp(this.player.vy / 900, -1, 1) * 0.09);
    this.player.rot += (want - this.player.rot) * Math.min(1, dt * 9);

    if (this.player.x <= -30) { this.exitCave('left'); return; }
    if (this.player.x >= CORRIDOR_LEN - PW + 30) { this.exitCave('right'); return; }

    this.nearJewel = !!this.activeCave &&
      Math.abs(this.player.x + PW / 2 - JEWEL_X) < JEWEL_RANGE && this.player.ground;
    if (this.activeCave) {
      this.showPrompt(this.nearJewel
        ? { glyph: this.activeCave.glyph, text: 'Open ', bold: this.activeCave.title, key: 'E' }
        : null);
    }

    this.snapCaveCam(1 - Math.pow(0.004, dt));
  }

  private showPrompt(p: PromptState | null) {
    const key = p ? p.glyph + p.text + p.bold + p.key : null;
    if (key === this.promptKey) return;
    this.promptKey = key;
    this.cb.onPrompt(p);
  }

  private snapCam(a?: number, ay = a) {
    let tx = this.player.x + PW / 2 + this.look - this.VW * 0.5;
    let ty = this.player.y + PH - this.VH * 0.66;
    const f0 = floorY(0); const f2 = floorY(2);
    ty = clamp(ty, f2 - this.VH * 0.66 - 190, f0 - this.VH * 0.66 + 120);
    tx = clamp(tx, FLOORS[0].x0 - 40, FLOORS[0].x1 - this.VW + 40);
    if (a === undefined || a >= 1) { this.camX = tx; this.camY = ty; this.savePrev(); }
    else { this.camX += (tx - this.camX) * a; this.camY += (ty - this.camY) * (ay ?? a); }
  }

  private snapCaveCam(a?: number) {
    let tx = this.player.x + PW / 2 - this.VW * 0.5;
    tx = clamp(tx, -100, CORRIDOR_LEN - this.VW + 100);
    const ty = -this.VH * 0.66 + 120;
    if (a === undefined || a >= 1) { this.camX = tx; this.camY = ty; this.savePrev(); }
    else { this.camX += (tx - this.camX) * a; this.camY += (ty - this.camY) * a; }
  }


  private rr(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }


  // ── cached sprites ─────────────────────────────────────────────────────
  // shadowBlur and per-frame gradients are the expensive parts of canvas 2D.
  // Glows, lit edges, hex grids and the hero are drawn once into small
  // canvases and stamped with drawImage / pattern fills from then on.

  private glowSprite(color: string) {
    let s = this.glows.get(color);
    if (!s) {
      const [cv, x] = makeCanvas(64, 64);
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.2, 'rgba(255,255,255,0.62)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.24)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.07)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      s = tint(cv, x, color);
      this.glows.set(color, s);
    }
    return s;
  }

  /** Soft round light centred on (x, y). */
  private glow(color: string, x: number, y: number, rx: number, a: number, ry = rx) {
    if (a <= 0.003 || rx <= 0) return;
    const c = this.ctx;
    c.globalAlpha = Math.min(1, a);
    c.drawImage(this.glowSprite(color), x - rx, y - ry, rx * 2, ry * 2);
    c.globalAlpha = 1;
  }

  private stripSprite(color: string) {
    let s = this.strips.get(color);
    if (!s) {
      const [cv, x] = makeCanvas(2, 64);
      const g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.16)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 2, 64);
      s = tint(cv, x, color);
      this.strips.set(color, s);
    }
    return s;
  }

  /** A lit edge: solid core with a soft halo above and below. */
  private glowLine(color: string, x: number, y: number, w: number, h: number, blur: number, a = 0.6) {
    const c = this.ctx;
    c.globalAlpha = a;
    c.drawImage(this.stripSprite(color), x - blur * 0.4, y + h / 2 - blur, w + blur * 0.8, blur * 2);
    c.globalAlpha = 1;
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  }

  /**
   * Running-bond stone courses as a repeating pattern, rendered at the
   * canvas's real resolution: a dark joint with a faint highlight under it.
   */
  private stoneFill(course: number, block: number, alpha: number): CanvasPattern | string {
    const key = course + ':' + block + ':' + alpha;
    const hit = this.scaled.fills.get(key);
    if (hit) return hit;
    const k = this.DPR * this.S;
    const tw = block; const th = course * 2;
    const [cv, x] = makeCanvas(Math.round(tw * k), Math.round(th * k));
    const sx = cv.width / tw; const sy = cv.height / th;
    x.scale(sx, sy);
    for (let row = 0; row < 2; row++) {
      const y = row * course;
      const seam = row ? block / 2 : 0;
      x.fillStyle = 'rgba(0,0,0,' + alpha * 3 + ')';
      x.fillRect(0, y, tw, 1.2);
      x.fillRect(seam, y, 1.2, course);
      x.fillStyle = 'rgba(232,224,216,' + alpha + ')';
      x.fillRect(0, y + 1.2, tw, 1);
      x.fillRect(seam + 1.2, y + 1.2, 1, course - 1.2);
    }
    let fill: CanvasPattern | string = 'rgba(0,0,0,0)';
    const pat = this.ctx.createPattern(cv, 'repeat');
    if (pat && typeof DOMMatrix !== 'undefined' && pat.setTransform) {
      pat.setTransform(new DOMMatrix([1 / sx, 0, 0, 1 / sy, 0, 0]));
      fill = pat;
    }
    this.scaled.fills.set(key, fill);
    return fill;
  }

  /** A vertical gradient in local coordinates, made once and reused under translate(). */
  private vGrad(key: string, h: number, stops: [number, string][]) {
    let g = this.grads.get(key);
    if (!g) {
      g = this.ctx.createLinearGradient(0, 0, 0, h);
      for (const [o, col] of stops) g.addColorStop(o, col);
      this.grads.set(key, g);
    }
    return g;
  }

  /** The hero, painted once at 8px per cell and scaled at draw time. */
  private heroCanvas() {
    if (this.heroSprite) return this.heroSprite;
    const C = 8;
    const [cv, x] = makeCanvas(19 * C, 21 * C);
    const left = 4 * C;
    const eyeSet = new Set(PX_EYES.map(([r, cc]) => r + ',' + cc));
    const sashSet = new Set(PX_SASH.map(([r, cc]) => r + ',' + cc));
    const bootSet = new Set(PX_BOOT_ROWS);
    for (let row = 0; row < PX_BODY.length; row++) {
      for (const [x0, x1] of PX_BODY[row]) {
        for (let col = x0; col <= x1; col++) {
          const key = row + ',' + col;
          let color: string;
          if (row === PX_ACCENT[0] && col === PX_ACCENT[1]) color = PX_PALETTE.Y;
          else if (eyeSet.has(key)) color = PX_PALETTE.W;
          else if (sashSet.has(key)) color = PX_PALETTE.H;
          else if (bootSet.has(row)) color = PX_PALETTE.K;
          else if (col === x0 || col === x1) color = ACCENT;
          else color = col < 7 ? PX_PALETTE.D : PX_PALETTE.M;
          x.fillStyle = color;
          x.fillRect(left + col * C, row * C, C, C);
        }
      }
    }
    for (const [row, col, colKey] of PX_LANTERN) {
      x.fillStyle = PX_PALETTE[colKey];
      x.fillRect(left - 4 * C + col * C, (11 + row) * C, C, C);
    }
    for (const [row, col, colKey] of PX_WEAPON) {
      x.fillStyle = PX_PALETTE[colKey];
      x.fillRect(left + (13 + col) * C, (16 + row) * C, C, C);
    }
    this.heroSprite = cv;
    return cv;
  }

  private drawPixelChar(originX: number, feetY: number, px: number) {
    this.ctx.drawImage(this.heroCanvas(), originX - 11 * px, feetY - 21 * px, 19 * px, 21 * px);
  }

  private moteSprite(s: string) {
    let sp = this.moteSprites.get(s);
    if (!sp) {
      const [cv, x] = makeCanvas(96, 96);
      x.fillStyle = ACCENT_DIM;
      x.font = 'italic 64px "Instrument Serif", Georgia, serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(s, 48, 48);
      sp = cv;
      this.moteSprites.set(s, sp);
    }
    return sp;
  }

  private onScreen(x0: number, x1: number, y0: number, y1: number) {
    return x1 > this.camX - 80 && x0 < this.camX + this.VW + 80 &&
      y1 > this.camY - 80 && y0 < this.camY + this.VH + 80;
  }


  // ── backdrop ───────────────────────────────────────────────────────────

  private drawBackdrop() {
    const c = this.ctx;
    const VW = this.VW; const VH = this.VH;
    const cx = this.camX; const t = this.t;
    // 0 on the ground floor, negative as the camera climbs.
    const dy = this.camY + VH * 0.66;

    if (!this.scaled.sky) {
      const g = c.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#05050B');
      g.addColorStop(0.45, '#0B0A18');
      g.addColorStop(1, '#1B1324');
      this.scaled.sky = g;
    }
    c.fillStyle = this.scaled.sky;
    c.fillRect(0, 0, VW, VH);

    // Nebulae and the warm band on the horizon.
    this.glow('#5B3FA8', VW * 0.26 - cx * 0.03 + Math.sin(t * 0.07) * 40, VH * 0.28 - dy * 0.03, VW * 0.5, 0.13, VW * 0.3);
    this.glow('#1F6F80', VW * 0.8 - cx * 0.03 + Math.cos(t * 0.05) * 40, VH * 0.16 - dy * 0.03, VW * 0.38, 0.08, VW * 0.22);
    this.glow(ACCENT, VW * 0.5, VH * 0.58 - dy * 0.05, VW * 0.85, 0.07, VH * 0.24);

    // The moon.
    const mx = VW * 0.64 - cx * 0.02; const my = VH * 0.2 - dy * 0.02;
    this.glow(INK, mx, my, 190, 0.1);
    this.glow(ACCENT, mx, my, 64, 0.16);
    c.fillStyle = '#EFE6CF';
    c.beginPath(); c.arc(mx, my, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(160,148,128,0.35)';
    c.beginPath();
    c.arc(mx - 6, my - 4, 4.5, 0, Math.PI * 2);
    c.moveTo(mx + 9, my + 5); c.arc(mx + 6, my + 5, 3, 0, Math.PI * 2);
    c.moveTo(mx + 5, my - 8); c.arc(mx + 3, my - 8, 2, 0, Math.PI * 2);
    c.fill();

    // Stars.
    c.fillStyle = '#CBD8FF';
    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i];
      const sx = st.x - cx * 0.22;
      const sy = st.y - this.camY * 0.22;
      if (sx < -4 || sx > VW + 4 || sy < -4 || sy > VH + 4) continue;
      c.globalAlpha = st.a * (0.65 + 0.35 * Math.sin(t * 1.4 + i));
      const d = st.r * 1.7;
      c.fillRect(sx - d / 2, sy - d / 2, d, d);
    }
    c.globalAlpha = 1;

    // Ridgelines, far to near, each with a little haze at its foot.
    const haze = this.stripSprite('#3A2E55');
    for (let i = 0; i < RIDGES.length; i++) {
      const R = RIDGES[i];
      const base = VH * R.horizon - dy * R.py;
      if (base - R.amp > VH) continue;
      let g = this.scaled.ridge[i];
      if (!g) {
        g = c.createLinearGradient(0, -R.amp, 0, VH * 0.4);
        g.addColorStop(0, R.top);
        g.addColorStop(1, R.bot);
        this.scaled.ridge[i] = g;
      }
      const pts = this.ridges[i];
      const off = -((((cx * R.px) % RIDGE_TILE) + RIDGE_TILE) % RIDGE_TILE);
      c.save();
      c.translate(off, base);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, VH * 2);
      let lastX = 0;
      for (let tile = 0; off + tile * RIDGE_TILE < VW; tile++) {
        for (let j = 0; j < pts.length; j++) {
          lastX = tile * RIDGE_TILE + j * 16;
          c.lineTo(lastX, pts[j]);
        }
      }
      c.lineTo(lastX, VH * 2);
      c.closePath();
      c.fill();
      c.restore();
      c.globalAlpha = 0.12;
      c.drawImage(haze, 0, base - 34, VW, 68);
      c.globalAlpha = 1;
    }

    // Drifting symbols.
    for (let m = 0; m < this.motes.length; m++) {
      const mo = this.motes[m];
      const mx2 = mo.x - cx * 0.4;
      const my2 = mo.y - this.camY * 0.4 + Math.sin(t * 0.8 + m) * 7;
      if (mx2 < -70 || mx2 > VW + 70 || my2 < -70 || my2 > VH + 70) continue;
      const size = mo.sc * 1.5;
      c.globalAlpha = mo.a;
      c.drawImage(this.moteSprite(mo.s), mx2 - size / 2, my2 - size / 2, size, size);
    }
    c.globalAlpha = 1;
  }

  /** Out-of-focus specks in front of everything, for depth. */
  private drawBokeh() {
    const W = this.VW + 200; const H = this.VH + 200;
    for (const b of this.bokeh) {
      let x = (b.x - this.camX * 1.15) % W; if (x < 0) x += W;
      let y = (b.y - this.camY * 1.15 - this.t * b.sp) % H; if (y < 0) y += H;
      this.glow(b.c, x - 100, y - 100, b.r, b.a * (0.7 + 0.3 * Math.sin(this.t * 0.7 + b.x)));
    }
  }

  private vignette(key: 'vig' | 'caveVig', inner: number, outer: number, a: number) {
    const c = this.ctx;
    let vg = this.scaled[key];
    if (!vg) {
      vg = c.createRadialGradient(
        this.VW / 2, this.VH / 2, this.VH * inner,
        this.VW / 2, this.VH / 2, this.VH * outer,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,' + a + ')');
      this.scaled[key] = vg;
    }
    c.fillStyle = vg;
    c.fillRect(0, 0, this.VW, this.VH);
  }


  // ── world pieces ───────────────────────────────────────────────────────

  /** Each floor is a floating stone shelf: lit lip, coursed face, soft underside. */
  private drawFloorSlab(f: number) {
    const c = this.ctx;
    const F = FLOORS[f];
    const gy = F.y;
    const x0 = Math.max(F.x0 - 60, this.camX - 20);
    const x1 = Math.min(F.x1 + 60, this.camX + this.VW + 20);
    if (x1 <= x0 || !this.onScreen(x0, x1, gy - 20, gy + 200)) return;
    const w = x1 - x0;

    c.save();
    c.translate(0, gy);
    c.fillStyle = this.vGrad('slab', 200, [
      [0, '#2C2339'], [0.05, '#211A2D'], [0.4, '#130F1C'], [0.75, '#0A0910'], [1, 'rgba(8,8,14,0)'],
    ]);
    c.fillRect(x0, 0, w, 200);
    c.restore();

    c.fillStyle = this.stoneFill(26, 150, 0.035);
    c.fillRect(x0, gy + 12, w, 110);
    c.fillStyle = this.vGrad('slabFade', 110, [[0, 'rgba(19,15,28,0)'], [1, 'rgba(10,9,16,1)']]);
    c.save(); c.translate(0, gy + 12); c.fillRect(x0, 0, w, 110); c.restore();

    // The lip: a bright cap, then a shadow line where the face begins.
    c.fillStyle = 'rgba(232,224,216,0.07)';
    c.fillRect(x0, gy, w, 9);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(x0, gy + 9, w, 2);

    this.glow(ACCENT, (x0 + x1) / 2, gy - 4, w * 0.6, 0.05, 26);
    this.glowLine(ACCENT, x0, gy - 2.5, w, 2.5, 20, 0.7);

    c.fillStyle = 'rgba(249,219,8,0.5)';
    c.font = '600 11px "DM Mono", monospace';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('FLOOR ' + (f + 1) + ' — ' + F.name, F.x0 + 74, gy + 36);
    c.fillStyle = 'rgba(232,224,216,0.25)';
    c.font = '9px "DM Mono", monospace';
    c.fillText(F.sub.toUpperCase(), F.x0 + 74, gy + 52);
  }

  private drawLift(L: { x: number; a: number; b: number }) {
    const c = this.ctx;
    const ya = floorY(L.a); const yb = floorY(L.b);
    const top = Math.min(ya, yb); const bot = Math.max(ya, yb);
    if (!this.onScreen(L.x - 60, L.x + 60, top - 215, bot)) return;

    // The beam of light.
    const g = c.createLinearGradient(0, top - 190, 0, bot);
    g.addColorStop(0, 'rgba(249,219,8,0)');
    g.addColorStop(0.35, 'rgba(249,219,8,0.07)');
    g.addColorStop(1, 'rgba(249,219,8,0.02)');
    c.fillStyle = g;
    c.fillRect(L.x - 38, top - 190, 76, bot - top + 190);
    this.glow(ACCENT, L.x, (top + bot) / 2, 70, 0.05, (bot - top) * 0.7);

    // Rails, with faint rungs.
    const rail = c.createLinearGradient(0, top - 190, 0, bot);
    rail.addColorStop(0, 'rgba(232,224,216,0)');
    rail.addColorStop(0.3, 'rgba(232,224,216,0.45)');
    rail.addColorStop(1, 'rgba(232,224,216,0.3)');
    c.fillStyle = rail;
    c.fillRect(L.x - 44, top - 190, 3, bot - top + 190);
    c.fillRect(L.x + 41, top - 190, 3, bot - top + 190);
    c.fillStyle = 'rgba(232,224,216,0.07)';
    for (let yy = bot - 30; yy > top - 160; yy -= 30) {
      c.fillRect(L.x - 41, yy, 6, 1.5);
      c.fillRect(L.x + 35, yy, 6, 1.5);
    }

    // Chevrons climbing the shaft.
    c.strokeStyle = INK; c.lineWidth = 2.5; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 7; i++) {
      const yy = bot - ((this.t * 70 + i * 80) % (bot - top + 150));
      c.globalAlpha = Math.max(0, 0.16 + 0.3 * Math.sin(this.t * 3 + i));
      c.beginPath();
      c.moveTo(L.x - 14, yy); c.lineTo(L.x, yy - 12); c.lineTo(L.x + 14, yy);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.lineCap = 'butt'; c.lineJoin = 'miter';

    // Landing plates, with lamp posts.
    for (const y of [ya, yb]) {
      c.save();
      c.translate(0, y - 10);
      c.fillStyle = this.vGrad('liftPlate', 10, [[0, '#3A3044'], [1, '#17131D']]);
      this.rr(L.x - 48, 0, 96, 10, 4); c.fill();
      c.restore();
      this.glowLine(ACCENT, L.x - 45, y - 10, 90, 2, 16, 0.7);
      for (const px of [L.x - 44, L.x + 44]) {
        c.fillStyle = '#221C28';
        c.fillRect(px - 1.5, y - 34, 3, 24);
        this.glow(ACCENT, px, y - 36, 12, 0.6 + 0.2 * Math.sin(this.t * 2 + px));
        c.fillStyle = ACCENT;
        c.beginPath(); c.arc(px, y - 36, 2.4, 0, Math.PI * 2); c.fill();
      }
    }

    c.fillStyle = 'rgba(232,224,216,0.7)';
    c.font = '600 10px "DM Mono", monospace';
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('LIFT', L.x, top - 202);
  }

  /** A floating ledge: bevelled stone with a lit edge and glowing end studs. */
  private drawPlatform(x: number, y: number, w: number, edge = INK) {
    const c = this.ctx;
    this.glow(edge, x + w / 2, y + 20, w * 0.55, 0.05, 12);
    c.save();
    c.translate(x, y);
    c.fillStyle = this.vGrad('plat', 17, [[0, '#3B3346'], [0.45, '#221C2B'], [1, '#121017']]);
    this.rr(0, 0, w, 17, 6); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(6, 13, w - 12, 1.5);
    c.restore();
    this.glowLine(edge, x + 4, y, w - 8, 2, 12, 0.45);
    c.fillStyle = edge;
    c.globalAlpha = 0.7;
    c.beginPath();
    c.arc(x + 9, y + 9, 1.8, 0, Math.PI * 2);
    c.arc(x + w - 9, y + 9, 1.8, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  /** A riveted cargo box; tall stacks read as two boxes. */
  private drawCrate(cr: Crate) {
    const c = this.ctx;
    const y = floorY(cr.f) - cr.h;
    if (!this.onScreen(cr.x, cr.x + cr.w, y, y + cr.h)) return;
    c.save();
    c.translate(cr.x, y);
    for (let by = 0; by < cr.h; by += 56) {
      const bh = Math.min(56, cr.h - by);
      c.save();
      c.translate(0, by);
      c.fillStyle = this.vGrad('crate', 56, [[0, '#342C3C'], [1, '#17131C']]);
      this.rr(0.5, 0.5, cr.w - 1, bh - 1, 5); c.fill();
      c.strokeStyle = 'rgba(232,224,216,0.14)'; c.lineWidth = 1.4;
      this.rr(5, 5, cr.w - 10, bh - 10, 3); c.stroke();
      c.strokeStyle = 'rgba(232,224,216,0.08)'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(9, bh - 9); c.lineTo(cr.w - 9, 9);
      c.stroke();
      c.fillStyle = 'rgba(249,219,8,0.5)';
      for (const [bx, byy] of [[9, 9], [cr.w - 9, 9], [9, bh - 9], [cr.w - 9, bh - 9]]) {
        c.fillRect(bx - 1.3, byy - 1.3, 2.6, 2.6);
      }
      c.restore();
    }
    c.restore();
    this.glowLine(ACCENT_DIM, cr.x + 3, y, cr.w - 6, 2, 10, 0.5);
  }

  /** A spring pad: base, coil and a plate that kicks up when used. */
  private drawPad(b: BouncePad) {
    const c = this.ctx;
    const y = floorY(b.f); const k = b.flash ?? 0; const lift = k * 9;
    if (!this.onScreen(b.x, b.x + b.w, y - 110, y)) return;
    const plateY = y - 24 - lift;
    const cx = b.x + b.w / 2;

    const g = c.createLinearGradient(0, y - 100, 0, y);
    g.addColorStop(0, 'rgba(249,219,8,0)');
    g.addColorStop(1, 'rgba(249,219,8,' + (0.1 + k * 0.3) + ')');
    c.fillStyle = g; c.fillRect(b.x + 6, y - 100, b.w - 12, 100);

    c.fillStyle = '#16121B';
    this.rr(b.x + 8, y - 7, b.w - 16, 7, 3); c.fill();

    c.strokeStyle = 'rgba(232,224,216,0.55)'; c.lineWidth = 2; c.lineJoin = 'round';
    c.beginPath();
    const coilTop = plateY + 7; const coilBot = y - 7; const turns = 3;
    for (let i = 0; i <= turns * 2; i++) {
      const yy = coilBot + (coilTop - coilBot) * (i / (turns * 2));
      const xx = cx + (i % 2 ? 14 : -14);
      if (i === 0) c.moveTo(cx - 14, yy); else c.lineTo(xx, yy);
    }
    c.stroke();
    c.lineJoin = 'miter';

    c.save();
    c.translate(0, plateY);
    c.fillStyle = this.vGrad('padPlate', 7, [[0, '#4A3E2A'], [1, '#1E1914']]);
    this.rr(b.x, 0, b.w, 7, 3.5); c.fill();
    c.restore();
    this.glowLine(ACCENT, b.x + 4, plateY, b.w - 8, 2.5, 18 + k * 26, 0.65 + k * 0.35);
    if (k > 0) this.glow(ACCENT, cx, plateY, b.w * 0.8, k * 0.35, 40);

    // Chevrons that rise and fade.
    c.strokeStyle = ACCENT; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = (this.t * 0.8 + i / 3) % 1;
      const ay = plateY - 12 - ph * 46;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.75;
      c.beginPath();
      c.moveTo(cx - 12, ay); c.lineTo(cx, ay - 10); c.lineTo(cx + 12, ay);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.lineCap = 'butt'; c.lineJoin = 'miter';
  }

  private drawMover(m: Mover) {
    const c = this.ctx;
    const x = this.moverX(m);
    const y = this.moverTop(m);
    if (!this.onScreen(m.x0, m.x1 + m.w, y - 20, y + 30)) return;

    // The track: a dotted rail between two anchor studs.
    const ty = y + 8; const a = m.x0 + 6; const z = m.x1 + m.w - 6;
    c.fillStyle = 'rgba(232,224,216,0.16)';
    for (let tx = a; tx <= z; tx += 14) c.fillRect(tx - 1, ty - 1, 2, 2);
    for (const ex of [a, z]) {
      this.glow(ACCENT, ex, ty, 10, 0.35);
      c.fillStyle = 'rgba(249,219,8,0.7)';
      c.beginPath(); c.arc(ex, ty, 2.5, 0, Math.PI * 2); c.fill();
    }

    this.drawPlatform(x, y, m.w, ACCENT);
    c.fillStyle = 'rgba(249,219,8,0.55)';
    c.font = '600 9px "DM Mono", monospace';
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('⇄', x + m.w / 2, y + 13);
  }


  /** A floating symbol inside a slowly turning ring, with two orbiting sparks. */
  private drawSigil(g: Sigil) {
    if (this.got[g.id]) return;
    const c = this.ctx;
    const y = floorY(g.f) - g.dy + Math.sin(this.t * 2.1 + g.x) * 5;
    if (!this.onScreen(g.x - 40, g.x + 40, y - 40, y + 40)) return;
    const pulse = 0.55 + 0.35 * Math.sin(this.t * 2.4 + g.x);
    this.glow(ACCENT, g.x, y, 44, 0.22 * pulse);

    c.save();
    c.translate(g.x, y);
    c.rotate(this.t * 0.5 + g.x);
    c.strokeStyle = 'rgba(232,224,216,0.32)'; c.lineWidth = 1.3;
    c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(249,219,8,0.55)'; c.lineWidth = 1.8;
    c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 0.5); c.stroke();
    c.beginPath(); c.arc(0, 0, 16, Math.PI, Math.PI * 1.5); c.stroke();
    c.fillStyle = 'rgba(232,224,216,0.5)';
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.fillRect(-0.8, -21, 1.6, 4);
    }
    c.restore();

    for (let i = 0; i < 2; i++) {
      const an = this.t * 1.8 + g.x + i * Math.PI;
      const ox = g.x + Math.cos(an) * 23; const oy = y + Math.sin(an) * 9;
      this.glow(ACCENT, ox, oy, 7, 0.7);
      c.fillStyle = '#FFF4B0';
      c.fillRect(ox - 1, oy - 1, 2, 2);
    }

    this.glow(ACCENT, g.x, y, 14, 0.28 * pulse);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '600 19px "DM Mono", monospace';
    c.fillStyle = '#F2E6A8';
    c.fillText(g.s, g.x, y + 1);
    c.textBaseline = 'alphabetic';
  }


  private caveArchPath(x: number, top: number, left: number, w: number, gy: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(left, gy);
    c.lineTo(left, top + 34);
    c.quadraticCurveTo(left, top, x, top);
    c.quadraticCurveTo(left + w, top, left + w, top + 34);
    c.lineTo(left + w, gy);
  }

  /** A stone gate: coursed pillars, an inner arch, a lit keystone gem. */
  private drawCave(n: Npc) {
    const c = this.ctx;
    const gy = floorY(n.f) - (n.dy ?? 0);
    const x = n.x;
    if (!this.onScreen(x - 120, x + 120, gy - 100, gy + 30)) return;
    const seen = !!this.found[n.id];
    const col = seen ? ACCENT : INK;
    const w = 120, h = 72;
    const left = x - w / 2, top = gy - h;

    this.glow(col, x, gy, 120, seen ? 0.22 : 0.1, 32);

    c.save();
    c.translate(0, top);
    c.fillStyle = this.vGrad('arch', h, [[0, '#3A3145'], [1, '#17131D']]);
    this.caveArchPath(x, 0, left, w, h);
    c.closePath();
    c.fill();
    c.restore();

    // Block joints on each pillar, and the inner arch.
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.2;
    c.beginPath();
    for (const jy of [gy - 22, gy - 44]) {
      c.moveTo(left + 1, jy); c.lineTo(left + 18, jy);
      c.moveTo(left + w - 18, jy); c.lineTo(left + w - 1, jy);
    }
    c.stroke();
    this.caveArchPath(x, top + 9, left + 9, w - 18, gy);
    c.strokeStyle = 'rgba(232,224,216,0.12)'; c.lineWidth = 1.4;
    c.stroke();

    this.caveArchPath(x, top, left, w, gy);
    c.strokeStyle = col;
    c.globalAlpha = 0.55;
    c.lineWidth = 2.2;
    c.stroke();
    c.globalAlpha = 1;

    const mouthW = w * 0.52, mouthH = h * 0.72;
    const mg = c.createRadialGradient(x, gy - 2, 2, x, gy - 2, mouthW * 0.75);
    mg.addColorStop(0, seen ? 'rgba(249,219,8,0.4)' : 'rgba(232,224,216,0.22)');
    mg.addColorStop(1, 'rgba(8,7,10,0.95)');
    c.fillStyle = mg;
    c.beginPath();
    c.moveTo(x - mouthW / 2, gy);
    c.lineTo(x - mouthW / 2, gy - mouthH + 20);
    c.quadraticCurveTo(x - mouthW / 2, gy - mouthH, x, gy - mouthH);
    c.quadraticCurveTo(x + mouthW / 2, gy - mouthH, x + mouthW / 2, gy - mouthH + 20);
    c.lineTo(x + mouthW / 2, gy);
    c.closePath();
    c.fill();

    // Keystone with a gem.
    c.fillStyle = '#463B52';
    c.beginPath();
    c.moveTo(x - 9, top - 1); c.lineTo(x + 9, top - 1);
    c.lineTo(x + 6, top + 13); c.lineTo(x - 6, top + 13);
    c.closePath(); c.fill();
    const gem = 0.55 + 0.2 * Math.sin(this.t * 3 + x);
    this.glow(ACCENT, x, top + 6, 20, gem);
    c.save();
    c.translate(x, top + 6);
    c.rotate(Math.PI / 4);
    c.fillStyle = ACCENT;
    c.fillRect(-3.2, -3.2, 6.4, 6.4);
    c.restore();

    c.font = '600 9px "DM Mono", monospace';
    c.fillStyle = seen ? col : 'rgba(232,224,216,0.45)';
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(n.name.toUpperCase(), x, top - (seen ? 18 : 10));
    if (seen) {
      c.fillStyle = 'rgba(249,219,8,0.75)';
      c.font = '8px "DM Mono", monospace';
      c.fillText('· found ·', x, top - 7);
    }
  }

  private drawHero(aura: boolean) {
    const c = this.ctx;
    c.save();
    c.translate(this.player.x + PW / 2, this.player.y + PH / 2);
    c.rotate(this.player.rot);
    c.scale((1 + this.player.squash * 0.24) * this.player.facing, 1 - this.player.squash * 0.26);
    if (aura) this.glow(ACCENT, 0, 0, 52, 0.32);
    this.drawPixelChar(0, 17, 1.7);
    c.restore();
  }

  private drawCaveScene() {
    const c = this.ctx;
    const n = this.activeCave;
    const seen = !!(n && this.found[n.id]);

    if (!this.scaled.caveSky) {
      const sg = c.createLinearGradient(0, 0, 0, this.VH);
      sg.addColorStop(0, '#120D08'); sg.addColorStop(1, '#050403');
      this.scaled.caveSky = sg;
    }
    c.fillStyle = this.scaled.caveSky; c.fillRect(0, 0, this.VW, this.VH);

    c.save();
    c.translate(-this.camX, -this.camY);

    const top = -230;
    const x0 = -100, span = CORRIDOR_LEN + 200;

    // Back wall: warm stone, darker towards the ceiling.
    c.save();
    c.translate(0, top);
    c.fillStyle = this.vGrad('corridor', -top, [[0, '#0E0B10'], [0.55, '#211A22'], [1, '#2A2128']]);
    c.fillRect(x0, 0, span, -top);
    c.restore();
    c.fillStyle = this.stoneFill(30, 110, 0.04);
    c.fillRect(x0, top, span, -top);

    // Pillars between the torches.
    for (let px = 5; px <= CORRIDOR_LEN; px += 130) {
      c.save();
      c.translate(0, top);
      c.fillStyle = this.vGrad('pillar', -top, [[0, '#120E14'], [1, '#2E252E']]);
      c.fillRect(px - 11, 0, 22, -top);
      c.restore();
      c.fillStyle = 'rgba(232,224,216,0.06)';
      c.fillRect(px - 11, top, 2, -top);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(px + 9, top, 2, -top);
    }

    // Ceiling beam and floor slab.
    c.fillStyle = '#0B090D';
    c.fillRect(x0, top, span, 16);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x0, top + 16, span, 6);
    c.fillStyle = this.vGrad('corridorFloor', 320, [[0, '#2C2339'], [0.06, '#1A1424'], [0.5, '#0B0910'], [1, '#050404']]);
    c.fillRect(x0, 0, span, 320);
    c.fillStyle = 'rgba(232,224,216,0.07)';
    c.fillRect(x0, 0, span, 7);

    this.glowLine(ACCENT, x0, -2.5, span, 2.5, 18, 0.7);

    // Torches: an iron bracket and a flickering flame.
    for (let tx = 70; tx < CORRIDOR_LEN; tx += 130) {
      const flick = 0.75 + 0.25 * Math.sin(this.t * 9 + tx) * Math.sin(this.t * 5.3 + tx * 0.7);
      this.glow(ACCENT, tx, -150, 95 * flick, 0.2);
      this.glow('#FF8A1F', tx, -168, 34 * flick, 0.35);
      c.fillStyle = '#0C0A08';
      this.rr(tx - 3, -160, 6, 30, 2); c.fill();
      this.rr(tx - 8, -164, 16, 5, 2); c.fill();
      c.fillStyle = '#FFB547';
      c.beginPath();
      c.moveTo(tx - 5, -165);
      c.quadraticCurveTo(tx - 6, -174, tx + Math.sin(this.t * 7 + tx) * 1.5, -165 - 15 * flick);
      c.quadraticCurveTo(tx + 6, -174, tx + 5, -165);
      c.closePath(); c.fill();
      c.fillStyle = '#FFF4B0';
      c.beginPath(); c.ellipse(tx, -168, 2, 4 * flick, 0, 0, Math.PI * 2); c.fill();
    }

    // Exits: lit doorframes.
    for (const ex of [0, CORRIDOR_LEN]) {
      this.glow(ACCENT, ex, -60, 40, 0.12, 120);
      c.fillStyle = 'rgba(249,219,8,0.45)';
      c.fillRect(ex - 1.5, top + 22, 3, -top - 24);
    }

    if (n) {
      const jy = -30 + Math.sin(this.t * 2) * 4;
      const pulse = 0.6 + 0.4 * Math.sin(this.t * 2.4);
      const col = seen ? ACCENT : INK;
      this.glow(ACCENT, JEWEL_X, jy, 70, 0.4 * pulse);
      this.glow(ACCENT, JEWEL_X, jy, 24, 0.5 * pulse);

      c.save();
      c.translate(JEWEL_X, jy);
      c.rotate(Math.PI / 4 + Math.sin(this.t * 1.4) * 0.08);
      c.fillStyle = col;
      c.fillRect(-9, -9, 18, 18);
      c.strokeStyle = '#0B0A08'; c.lineWidth = 1.4;
      c.strokeRect(-9, -9, 18, 18);
      c.restore();

      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = '600 9px "DM Mono", monospace';
      c.fillStyle = this.nearJewel ? col : 'rgba(232,224,216,0.5)';
      c.fillText(n.title.toUpperCase(), JEWEL_X, jy - 32);
      if (seen) {
        c.fillStyle = 'rgba(249,219,8,0.7)';
        c.font = '8px "DM Mono", monospace';
        c.fillText('· found ·', JEWEL_X, jy - 21);
      }
    }

    this.drawHero(false);

    c.restore();
    this.vignette('caveVig', 0.3, 0.9, 0.6);
  }

  private drawWorld() {
    const c = this.ctx;
    this.drawBackdrop();

    c.save();
    c.translate(-this.camX, -this.camY);

    for (let f2 = 2; f2 >= 0; f2--) this.drawFloorSlab(f2);
    LIFTS.forEach((L) => this.drawLift(L));

    for (const pl of PLATS) {
      const ty = floorY(pl.f) - pl.dy;
      if (this.onScreen(pl.x, pl.x + pl.w, ty, ty + 17)) this.drawPlatform(pl.x, ty, pl.w);
    }

    for (const b of BPADS) this.drawPad(b);
    for (const cr of CRATES) this.drawCrate(cr);
    for (const m of MOVERS) this.drawMover(m);
    for (const g of SIGILS) this.drawSigil(g);

    for (const n of NPCS) this.drawCave(n);

    for (const pt of this.parts) {
      c.globalAlpha = Math.max(0, 1 - pt.t / pt.life);
      c.fillStyle = pt.c;
      c.fillRect(pt.x, pt.y, pt.r, pt.r);
    }
    c.globalAlpha = 1;

    c.fillStyle = ACCENT;
    for (let ti = 0; ti < this.trail.length; ti++) {
      const tr = this.trail[ti];
      c.globalAlpha = (ti / this.trail.length) * 0.4 * Math.max(0, 1 - tr.t * 1.6);
      c.beginPath();
      c.arc(tr.x, tr.y, 3 + (ti / this.trail.length) * 6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    this.drawHero(true);

    c.restore();

    this.drawBokeh();
    this.vignette('vig', 0.34, 0.95, 0.55);
  }

  /** Draws the scene as it stood `alpha` of the way between the last two steps. */
  private draw() {
    const c = this.ctx;
    const p = this.player; const pv = this.prev; const a = this.alpha;
    const real = { x: p.x, y: p.y, cx: this.camX, cy: this.camY, t: this.t };
    p.x = pv.x + (real.x - pv.x) * a;
    p.y = pv.y + (real.y - pv.y) * a;
    this.camX = pv.cx + (real.cx - pv.cx) * a;
    this.camY = pv.cy + (real.cy - pv.cy) * a;
    this.t = pv.t + (real.t - pv.t) * a;

    c.save();
    c.scale(this.DPR * this.S, this.DPR * this.S);
    try {
      if (this.view === 'world') this.drawWorld();
      else this.drawCaveScene();
    } finally {
      c.restore();
      p.x = real.x; p.y = real.y;
      this.camX = real.cx; this.camY = real.cy; this.t = real.t;
    }
  }
}
