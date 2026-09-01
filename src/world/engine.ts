/* ---------------------------------------------------------------
   The world engine.

   Deliberately framework-free: it owns a canvas, a physics step and a
   draw pass, and reports outwards through callbacks. React mounts it,
   listens, and renders the DOM overlay. Nothing in here imports React,
   which keeps the 60fps loop away from the render cycle entirely.
   --------------------------------------------------------------- */

import {
  BPADS, CAVE, CRATES, FLOORS, LIFTS, MOVERS, NPCS, PLATS, SIGILS,
} from '../data/world';
import type { BouncePad, Crate, Mover, Npc, PromptState, Sigil } from '../types';

/* ---- tuning ---- */
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

const SYM = ['∫', '∑', 'π', '∂', '∇', 'λ', 'θ', 'Σ', '√', '∞', 'φ', 'ε'];

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

interface Ride { from: number; to: number; x: number; t: number; dur: number }

export interface EngineCallbacks {
  /** floor / counts changed */
  onHud: () => void;
  /** the "press E" bubble, or null */
  onPrompt: (p: PromptState | null) => void;
  /** the player pressed E on a character */
  onTalk: (npc: Npc) => void;
  /** a sigil was picked up */
  onSigil: (sigil: Sigil, collected: number, total: number) => void;
}

export type View = 'world' | 'dlg' | 'panel';

export class WorldEngine {
  private cvs: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;

  /* progress, owned by React and handed in */
  found: Record<string, boolean> = {};
  got: Record<string, boolean> = {};
  muted = false;

  view: View = 'world';
  running = false;

  private W = 0; private H = 0; private S = 1;
  private VW = 960; private VH = 540; private DPR = 1;
  private camX = 0; private camY = 0; private t = 0;

  player = {
    x: 380, y: -PH, vx: 0, vy: 0, floor: 0,
    ground: true, rot: 0, squash: 0,
    rideOn: null as Mover | null,
  };
  input = { left: false, right: false };

  private coyote = 0;
  private buffer = 0;
  private ride: Ride | null = null;
  private near: Npc | { lift: unknown; to: number } | null = null;
  private parts: Particle[] = [];
  private trail: TrailDot[] = [];
  private stars: Star[] = [];
  private motes: Mote[] = [];
  private raf = 0;
  private last = 0;
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
  }

  /* ------------------------------------------------------------ audio */
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

  /* ------------------------------------------------------------ setup */
  resize(host: HTMLElement) {
    this.W = host.clientWidth || window.innerWidth;
    this.H = host.clientHeight || window.innerHeight;
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
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

  /** Drop the player in, optionally at a particular character. */
  spawn(seekId?: string) {
    const seek = seekId ? NPCS.find((n) => n.id === seekId) : undefined;
    if (seek) {
      this.player.floor = seek.f;
      this.player.x = clamp(seek.x - 300, FLOORS[seek.f].x0, FLOORS[seek.f].x1 - PW);
    }
    this.player.y = floorY(this.player.floor) - PH;
    this.player.vx = 0; this.player.vy = 0;
    this.player.ground = true; this.player.rideOn = null;
    this.ride = null;
    this.input.left = false; this.input.right = false;
    this.trail.length = 0; this.parts.length = 0;
    this.snapCam(1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  destroy() {
    this.stop();
    if (this.ac) { try { void this.ac.close(); } catch { /* already gone */ } }
  }

  private frame = (ts: number) => {
    if (!this.running) return;
    if (!this.last) this.last = ts;
    const dt = Math.min(0.033, (ts - this.last) / 1000);
    this.last = ts;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  /* ------------------------------------------------------------ input */
  jump() {
    if (this.view !== 'world' || this.ride) return;
    if (this.player.ground || this.coyote > 0) {
      this.player.vy = JUMP;
      this.player.ground = false;
      this.coyote = 0; this.buffer = 0;
      this.player.squash = 1;
      this.blip(500, 0.09, 'triangle', 0.045);
      this.puff(this.player.x + PW / 2, this.player.y + PH, 6, '#FF5C00');
    } else {
      this.buffer = 0.18;
    }
  }
  releaseJump() {
    if (this.player.vy < -230) this.player.vy = -230;
  }

  /** E — talk to whoever is here, or ride the lift you are standing in. */
  act() {
    if (this.view !== 'world' || this.ride) return;
    const n = this.npcHere();
    if (n) { this.cb.onTalk(n); return; }
    const L = this.liftHere();
    if (L) {
      this.ride = { from: this.player.floor, to: L.to, x: L.lift.x, t: 0, dur: 0.62 };
      this.player.vx = 0; this.player.vy = 0;
      this.sweep(300, 900, 0.5, 'sine');
    }
  }

  /* ------------------------------------------------------------ queries */
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

  private npcHere(): Npc | null {
    for (const n of NPCS) {
      if (n.f !== this.player.floor) continue;
      if (Math.abs(this.player.x + PW / 2 - n.x) < 66) return n;
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

  /* ------------------------------------------------------------ physics */
  private update(dt: number) {
    this.t += dt;

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 820 * dt;
      if (p.t >= p.life) this.parts.splice(i, 1);
    }
    for (const q of this.trail) q.t += dt;

    /* sliding ledges keep sliding even while you are talking */
    for (const M of MOVERS) {
      const mx = this.moverX(M);
      M.dx = M.cx === undefined ? 0 : mx - M.cx;
      if (Math.abs(M.dx) > 14) M.dx = 0;   /* stale frame — do not fling anyone */
      M.cx = mx;
    }

    if (this.view !== 'world') {
      this.near = null;
      this.showPrompt(null);
      return;
    }

    /* --- riding a lift between floors --- */
    if (this.ride) {
      this.ride.t += dt;
      const k = clamp(this.ride.t / this.ride.dur, 0, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.player.x = this.ride.x - PW / 2;
      this.player.y = floorY(this.ride.from) + (floorY(this.ride.to) - floorY(this.ride.from)) * e - PH;
      if (this.ride.t % 0.1 < dt) this.puff(this.ride.x, this.player.y + PH, 2, '#00D9FF');
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

    /* --- horizontal, entirely player driven --- */
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
    if (this.player.rideOn && this.player.ground) {
      this.player.x += this.player.rideOn.dx ?? 0;   /* the ledge takes you with it */
    }
    const prevX = this.player.x;
    this.player.x += this.player.vx * dt;

    const F = FLOORS[this.player.floor];
    if (this.player.x < F.x0) { this.player.x = F.x0; this.player.vx = 0; }
    if (this.player.x + PW > F.x1) { this.player.x = F.x1 - PW; this.player.vx = 0; }

    /* crates block you sideways — jump them or climb them */
    for (const C of CRATES) {
      if (C.f !== this.player.floor) continue;
      const cTop = floorY(C.f) - C.h;
      if (this.player.y + PH <= cTop + 5) continue;   /* standing on it, or above it */
      if (this.player.y >= floorY(C.f)) continue;
      if (prevX + PW <= C.x && this.player.x + PW > C.x) {
        this.player.x = C.x - PW; this.player.vx = 0;
      } else if (prevX >= C.x + C.w && this.player.x < C.x + C.w) {
        this.player.x = C.x + C.w; this.player.vx = 0;
      }
    }

    /* --- vertical --- */
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
    /* crate tops are standable too */
    for (const cr of CRATES) {
      if (cr.f !== this.player.floor) continue;
      const ct = floorY(cr.f) - cr.h;
      if (this.player.x + PW * 0.85 > cr.x && this.player.x + PW * 0.15 < cr.x + cr.w &&
          this.player.vy >= 0 && this.player.y + PH >= ct && prevBottom <= ct + 24) {
        this.player.y = ct - PH; this.player.vy = 0; this.player.ground = true;
      }
    }
    /* and the sliding ledges */
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
    /* nothing here can kill you — if you somehow drop, you are set back down */
    if (this.player.y > gy + 200) {
      this.player.y = gy - PH; this.player.vy = 0; this.player.ground = true;
    }

    if (this.player.ground) {
      if (!wasGround) {
        this.player.squash = 1;
        this.blip(170, 0.05, 'sine', 0.028);
        this.puff(this.player.x + PW / 2, this.player.y + PH, 4, '#FFB067');
      }
      this.coyote = 0.16;
      /* a pad on the floor throws you back up the moment you touch it */
      const onFloor = Math.abs(this.player.y + PH - floorY(this.player.floor)) < 2;
      const bp = onFloor ? this.padUnder() : null;
      if (bp) {
        this.player.vy = BOUNCE;
        this.player.ground = false;
        this.coyote = 0;
        this.player.squash = 1;
        bp.flash = 1;
        this.sweep(320, 880, 0.26, 'triangle');
        this.puff(this.player.x + PW / 2, this.player.y + PH, 9, '#7A5CFF');
      }
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }
    for (const b of BPADS) if (b.flash) b.flash = Math.max(0, b.flash - dt * 2.2);

    /* --- sigils: walk into one and it is yours --- */
    for (const G of SIGILS) {
      if (G.f !== this.player.floor || this.got[G.id]) continue;
      const gx = G.x;
      const gyy = floorY(G.f) - G.dy;
      if (Math.abs(this.player.x + PW / 2 - gx) < 30 &&
          Math.abs(this.player.y + PH / 2 - gyy) < 34) {
        this.got[G.id] = true;
        this.puff(gx, gyy, 12, '#7A5CFF');
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

    /* --- what is within reach --- */
    const n = this.npcHere();
    const L = n ? null : this.liftHere();
    if (n) {
      this.showPrompt({ glyph: n.glyph, text: 'Talk to ', bold: n.name, key: 'E' });
    } else if (L) {
      this.showPrompt({ glyph: '↕', text: 'Lift to ', bold: FLOORS[L.to].name, key: 'E' });
    } else {
      this.showPrompt(null);
    }
    this.near = n ?? L;

    this.snapCam(1 - Math.pow(0.001, dt));
  }

  private showPrompt(p: PromptState | null) {
    const key = p ? p.glyph + p.text + p.bold + p.key : null;
    if (key === this.promptKey) return;
    this.promptKey = key;
    this.cb.onPrompt(p);
  }

  private snapCam(a?: number) {
    let tx = this.player.x + PW / 2 - this.VW * 0.5;
    let ty = this.player.y + PH - this.VH * 0.66;
    const f0 = floorY(0); const f2 = floorY(2);
    ty = clamp(ty, f2 - this.VH * 0.66 - 190, f0 - this.VH * 0.66 + 120);
    tx = clamp(tx, FLOORS[0].x0 - 40, FLOORS[0].x1 - this.VW + 40);
    if (a === undefined || a >= 1) { this.camX = tx; this.camY = ty; }
    else { this.camX += (tx - this.camX) * a; this.camY += (ty - this.camY) * a; }
  }

  /* ------------------------------------------------------------ draw */
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

  private drawFloorSlab(f: number) {
    const c = this.ctx;
    const F = FLOORS[f];
    const gy = F.y;
    const g = c.createLinearGradient(0, gy, 0, gy + 150);
    g.addColorStop(0, '#1B1226'); g.addColorStop(1, '#08090F');
    c.fillStyle = g;
    c.fillRect(F.x0 - 60, gy, F.x1 - F.x0 + 120, 150);

    c.save();
    c.beginPath(); c.rect(F.x0 - 60, gy, F.x1 - F.x0 + 120, 150); c.clip();
    c.strokeStyle = 'rgba(255,92,0,0.06)'; c.lineWidth = 2;
    c.beginPath();
    for (let hx = F.x0 - 120; hx < F.x1 + 140; hx += 26) { c.moveTo(hx, gy + 150); c.lineTo(hx + 70, gy); }
    c.stroke();
    c.restore();

    c.shadowColor = '#FF5C00'; c.shadowBlur = 18;
    c.fillStyle = '#FF5C00';
    c.fillRect(F.x0 - 60, gy - 3, F.x1 - F.x0 + 120, 3.5);
    c.shadowBlur = 0;

    c.strokeStyle = 'rgba(122,92,255,0.16)'; c.lineWidth = 1.5;
    c.beginPath();
    for (let rx = F.x0; rx < F.x1; rx += 220) { c.moveTo(rx, gy + 150); c.lineTo(rx, gy + 380 - 6); }
    c.stroke();

    c.fillStyle = 'rgba(255,92,0,0.5)';
    c.font = '600 11px "DM Mono", monospace';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('FLOOR ' + (f + 1) + ' — ' + F.name, F.x0 + 74, gy + 34);
    c.fillStyle = 'rgba(232,224,216,0.22)';
    c.font = '9px "DM Mono", monospace';
    c.fillText(F.sub.toUpperCase(), F.x0 + 74, gy + 50);
  }

  private drawLift(L: { x: number; a: number; b: number }) {
    const c = this.ctx;
    const ya = floorY(L.a); const yb = floorY(L.b);
    const top = Math.min(ya, yb); const bot = Math.max(ya, yb);
    const g = c.createLinearGradient(L.x, top - 190, L.x, bot);
    g.addColorStop(0, 'rgba(0,217,255,0)');
    g.addColorStop(0.35, 'rgba(0,217,255,0.16)');
    g.addColorStop(1, 'rgba(0,217,255,0.05)');
    c.fillStyle = g;
    c.fillRect(L.x - 42, top - 190, 84, bot - top + 190);

    c.strokeStyle = 'rgba(0,217,255,0.5)'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(L.x - 42, bot); c.lineTo(L.x - 42, top - 190);
    c.moveTo(L.x + 42, bot); c.lineTo(L.x + 42, top - 190);
    c.stroke();

    c.strokeStyle = '#00D9FF'; c.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const yy = bot - ((this.t * 70 + i * 80) % (bot - top + 150));
      c.globalAlpha = 0.16 + 0.3 * Math.sin(this.t * 3 + i);
      c.beginPath();
      c.moveTo(L.x - 16, yy); c.lineTo(L.x, yy - 13); c.lineTo(L.x + 16, yy);
      c.stroke();
    }
    c.globalAlpha = 1;

    for (const y of [ya, yb]) {
      c.fillStyle = 'rgba(0,217,255,0.16)';
      this.rr(L.x - 46, y - 9, 92, 9, 3); c.fill();
      c.fillStyle = '#00D9FF';
      c.shadowColor = '#00D9FF'; c.shadowBlur = 14;
      c.fillRect(L.x - 46, y - 9, 92, 2.5);
      c.shadowBlur = 0;
    }

    c.fillStyle = 'rgba(0,217,255,0.75)';
    c.font = '600 10px "DM Mono", monospace';
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('LIFT', L.x, top - 202);
  }

  private drawCave() {
    const c = this.ctx;
    const gy = floorY(CAVE.f); const cx = CAVE.x + CAVE.w / 2;
    const hg = c.createLinearGradient(0, gy - 250, 0, gy);
    hg.addColorStop(0, '#0A0715'); hg.addColorStop(1, '#160D24');
    c.fillStyle = hg;
    c.beginPath();
    c.moveTo(CAVE.x - 130, gy);
    c.quadraticCurveTo(CAVE.x + 20, gy - 246, cx + 10, gy - 252);
    c.quadraticCurveTo(CAVE.x + CAVE.w + 120, gy - 236, CAVE.x + CAVE.w + 180, gy);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,92,0,0.3)'; c.lineWidth = 2; c.stroke();

    const mg = c.createRadialGradient(cx, gy - 56, 4, cx, gy - 56, 135);
    mg.addColorStop(0, '#FF7A22'); mg.addColorStop(0.28, '#3A1200'); mg.addColorStop(1, '#050208');
    c.fillStyle = mg;
    c.beginPath();
    c.moveTo(cx - 78, gy); c.lineTo(cx - 78, gy - 92);
    c.quadraticCurveTo(cx, gy - 196, cx + 78, gy - 92);
    c.lineTo(cx + 78, gy);
    c.closePath(); c.fill();
    c.strokeStyle = '#FF5C00'; c.lineWidth = 2.5;
    c.shadowColor = '#FF5C00'; c.shadowBlur = 18 + Math.sin(this.t * 3) * 7;
    c.stroke(); c.shadowBlur = 0;

    c.textAlign = 'center';
    c.fillStyle = '#FF5C00'; c.font = '600 12px "DM Mono", monospace';
    c.fillText('THE CAVE', cx, gy - 228);
    c.fillStyle = 'rgba(232,224,216,0.5)'; c.font = '9px "DM Mono", monospace';
    c.fillText('the archivist keeps the CV', cx, gy - 212);

    ['e', '∫', '∞'].forEach((r, i) => {
      c.globalAlpha = 0.3 + 0.3 * Math.sin(this.t * 2 + i * 1.6);
      c.fillStyle = '#FFB067';
      c.font = 'italic 19px "Instrument Serif", Georgia, serif';
      c.fillText(r, cx - 84 + i * 84, gy - 176 - Math.sin(this.t + i) * 5);
      c.globalAlpha = 1;
    });
  }

  private drawCrate(cr: Crate) {
    const c = this.ctx;
    const y = floorY(cr.f) - cr.h;
    c.fillStyle = '#171326';
    this.rr(cr.x, y, cr.w, cr.h, 5); c.fill();
    c.strokeStyle = 'rgba(255,176,103,0.55)'; c.lineWidth = 1.6;
    this.rr(cr.x + 3, y + 3, cr.w - 6, cr.h - 6, 4); c.stroke();
    c.strokeStyle = 'rgba(255,176,103,0.22)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cr.x + 5, y + 5); c.lineTo(cr.x + cr.w - 5, y + cr.h - 5);
    c.moveTo(cr.x + cr.w - 5, y + 5); c.lineTo(cr.x + 5, y + cr.h - 5);
    c.stroke();
    c.fillStyle = '#FFB067';
    c.shadowColor = '#FFB067'; c.shadowBlur = 10;
    c.fillRect(cr.x, y, cr.w, 2.5);
    c.shadowBlur = 0;
  }

  private drawPad(b: BouncePad) {
    const c = this.ctx;
    const y = floorY(b.f); const k = b.flash ?? 0; const lift = k * 7;
    const g = c.createLinearGradient(0, y - 90, 0, y);
    g.addColorStop(0, 'rgba(122,92,255,0)');
    g.addColorStop(1, 'rgba(122,92,255,' + (0.13 + k * 0.3) + ')');
    c.fillStyle = g; c.fillRect(b.x, y - 90, b.w, 90);

    c.fillStyle = '#150F2A';
    this.rr(b.x, y - 13 - lift, b.w, 13 + lift, 5); c.fill();
    c.fillStyle = '#7A5CFF';
    c.shadowColor = '#7A5CFF'; c.shadowBlur = 16 + k * 22;
    c.fillRect(b.x, y - 13 - lift, b.w, 3);
    c.shadowBlur = 0;

    c.strokeStyle = 'rgba(122,92,255,' + (0.4 + 0.35 * Math.sin(this.t * 4)) + ')';
    c.lineWidth = 2.4;
    for (let i = 0; i < 2; i++) {
      const ay = y - 28 - i * 15 - lift;
      c.beginPath();
      c.moveTo(b.x + b.w / 2 - 13, ay);
      c.lineTo(b.x + b.w / 2, ay - 11);
      c.lineTo(b.x + b.w / 2 + 13, ay);
      c.stroke();
    }
  }

  private drawMover(m: Mover) {
    const c = this.ctx;
    const x = m.cx ?? this.moverX(m);
    const y = this.moverTop(m);
    c.strokeStyle = 'rgba(0,217,255,0.16)'; c.lineWidth = 1.5;
    c.setLineDash([7, 9]);
    c.beginPath();
    c.moveTo(m.x0, y + 8); c.lineTo(m.x1 + m.w, y + 8);
    c.stroke();
    c.setLineDash([]);

    c.fillStyle = '#131b28';
    this.rr(x, y, m.w, 17, 4); c.fill();
    c.fillStyle = '#00D9FF';
    c.shadowColor = '#00D9FF'; c.shadowBlur = 16;
    c.fillRect(x, y, m.w, 2.5);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(0,217,255,0.5)';
    c.font = '600 9px "DM Mono", monospace';
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('⇄', x + m.w / 2, y + 13);
  }

  private drawSigil(g: Sigil) {
    if (this.got[g.id]) return;
    const c = this.ctx;
    const y = floorY(g.f) - g.dy + Math.sin(this.t * 2.1 + g.x) * 5;
    const rg = c.createRadialGradient(g.x, y, 2, g.x, y, 40);
    rg.addColorStop(0, 'rgba(122,92,255,0.34)');
    rg.addColorStop(1, 'rgba(122,92,255,0)');
    c.fillStyle = rg;
    c.beginPath(); c.arc(g.x, y, 40, 0, Math.PI * 2); c.fill();

    c.save();
    c.translate(g.x, y);
    c.rotate(Math.sin(this.t * 1.3 + g.x) * 0.22);
    c.strokeStyle = 'rgba(122,92,255,0.75)'; c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * 17; const py = Math.sin(a) * 17;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath(); c.stroke();
    c.restore();

    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'italic 21px "Instrument Serif", Georgia, serif';
    c.shadowColor = '#7A5CFF'; c.shadowBlur = 14;
    c.fillStyle = '#C9BBFF';
    c.fillText(g.s, g.x, y + 1);
    c.shadowBlur = 0;
    c.textBaseline = 'alphabetic';
  }

  private drawNpc(n: Npc) {
    const c = this.ctx;
    const gy = floorY(n.f);
    const bob = Math.sin(this.t * 1.6 + n.x) * 3.5;
    const isNear = this.near !== null && 'id' in this.near && this.near.id === n.id;
    const seen = !!this.found[n.id];
    const col = seen ? '#00D9FF' : '#FF5C00';

    const pg = c.createRadialGradient(n.x, gy, 2, n.x, gy, 92);
    pg.addColorStop(0, seen ? 'rgba(0,217,255,0.18)' : 'rgba(255,92,0,0.2)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = pg;
    c.beginPath(); c.ellipse(n.x, gy, 92, 26, 0, 0, Math.PI * 2); c.fill();

    c.fillStyle = '#171426';
    c.strokeStyle = col; c.lineWidth = 1.8;
    c.globalAlpha = isNear ? 1 : 0.82;
    c.beginPath();
    c.moveTo(n.x - 19, gy);
    c.lineTo(n.x - 11, gy - 40 + bob);
    c.quadraticCurveTo(n.x, gy - 52 + bob, n.x + 11, gy - 40 + bob);
    c.lineTo(n.x + 19, gy);
    c.closePath();
    c.fill(); c.stroke();

    c.beginPath();
    c.arc(n.x, gy - 52 + bob, 11, 0, Math.PI * 2);
    c.fillStyle = '#0E0B18'; c.fill(); c.stroke();

    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'italic 15px "Instrument Serif", Georgia, serif';
    c.fillStyle = col;
    c.shadowColor = col; c.shadowBlur = 12;
    c.fillText(n.glyph, n.x, gy - 52 + bob + 1);
    c.shadowBlur = 0;
    c.globalAlpha = 1;

    c.font = '600 9px "DM Mono", monospace';
    c.fillStyle = isNear ? col : 'rgba(232,224,216,0.45)';
    c.textBaseline = 'alphabetic';
    c.fillText(n.name.toUpperCase(), n.x, gy - 78 + bob);
    if (seen) {
      c.fillStyle = 'rgba(0,217,255,0.7)';
      c.font = '8px "DM Mono", monospace';
      c.fillText('· found ·', n.x, gy - 66 + bob);
    }
  }

  private draw() {
    const c = this.ctx;
    c.save();
    c.scale(this.DPR * this.S, this.DPR * this.S);
    c.clearRect(0, 0, this.VW, this.VH);

    /* sky */
    const sg = c.createLinearGradient(0, 0, 0, this.VH);
    sg.addColorStop(0, '#0A0912'); sg.addColorStop(1, '#06070C');
    c.fillStyle = sg; c.fillRect(0, 0, this.VW, this.VH);

    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i];
      const sx = st.x - this.camX * 0.22;
      const sy = st.y - this.camY * 0.22;
      if (sx < -20 || sx > this.VW + 20 || sy < -20 || sy > this.VH + 20) continue;
      c.globalAlpha = st.a * (0.65 + 0.35 * Math.sin(this.t * 1.4 + i));
      c.fillStyle = '#CBD8FF';
      c.beginPath(); c.arc(sx, sy, st.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let m = 0; m < this.motes.length; m++) {
      const mo = this.motes[m];
      const mx = mo.x - this.camX * 0.4;
      const my = mo.y - this.camY * 0.4 + Math.sin(this.t * 0.8 + m) * 7;
      if (mx < -70 || mx > this.VW + 70 || my < -70 || my > this.VH + 70) continue;
      c.globalAlpha = mo.a;
      c.fillStyle = '#9BD6FF';
      c.font = 'italic ' + mo.sc + 'px "Instrument Serif", Georgia, serif';
      c.fillText(mo.s, mx, my);
    }
    c.globalAlpha = 1;

    c.save();
    c.translate(-this.camX, -this.camY);            /* ---- world space ---- */

    c.strokeStyle = 'rgba(122,92,255,0.075)'; c.lineWidth = 1;
    c.beginPath();
    const gx0 = Math.floor((this.camX - 120) / 110) * 110;
    for (let v = gx0; v < this.camX + this.VW + 110; v += 110) {
      c.moveTo(v, floorY(2) - 260); c.lineTo(v, floorY(0) + 150);
    }
    for (let f = 0; f < 3; f++) {
      for (let hy = floorY(f); hy > floorY(f) - 300; hy -= 110) {
        c.moveTo(this.camX - 40, hy); c.lineTo(this.camX + this.VW + 40, hy);
      }
    }
    c.stroke();

    for (let f2 = 2; f2 >= 0; f2--) this.drawFloorSlab(f2);
    LIFTS.forEach((L) => this.drawLift(L));
    this.drawCave();

    for (const pl of PLATS) {
      const ty = floorY(pl.f) - pl.dy;
      c.fillStyle = '#141626';
      this.rr(pl.x, ty, pl.w, 17, 4); c.fill();
      c.fillStyle = '#00D9FF';
      c.shadowColor = '#00D9FF'; c.shadowBlur = 14;
      c.fillRect(pl.x, ty, pl.w, 2.5);
      c.shadowBlur = 0;
    }

    for (const b of BPADS) this.drawPad(b);
    for (const cr of CRATES) this.drawCrate(cr);
    for (const m of MOVERS) this.drawMover(m);
    for (const g of SIGILS) this.drawSigil(g);

    for (const n of NPCS) this.drawNpc(n);

    for (const pt of this.parts) {
      c.globalAlpha = Math.max(0, 1 - pt.t / pt.life);
      c.fillStyle = pt.c;
      c.fillRect(pt.x, pt.y, pt.r, pt.r);
    }
    c.globalAlpha = 1;

    for (let ti = 0; ti < this.trail.length; ti++) {
      const tr = this.trail[ti];
      c.globalAlpha = (ti / this.trail.length) * 0.4 * Math.max(0, 1 - tr.t * 1.6);
      c.fillStyle = '#FF5C00';
      c.beginPath();
      c.arc(tr.x, tr.y, 3 + (ti / this.trail.length) * 6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    /* ---- the character: the constant itself ---- */
    c.save();
    c.translate(this.player.x + PW / 2, this.player.y + PH / 2);
    c.rotate(this.player.rot);
    c.scale(1 + this.player.squash * 0.24, 1 - this.player.squash * 0.26);
    const au = c.createRadialGradient(0, 0, 2, 0, 0, 58);
    au.addColorStop(0, 'rgba(255,92,0,0.40)');
    au.addColorStop(0.45, 'rgba(255,92,0,0.12)');
    au.addColorStop(1, 'rgba(255,92,0,0)');
    c.fillStyle = au;
    c.beginPath(); c.arc(0, 0, 58, 0, Math.PI * 2); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'italic 72px "Instrument Serif", Georgia, serif';
    c.shadowColor = '#FF5C00'; c.shadowBlur = 32; c.fillStyle = '#FF7A22'; c.fillText('e', 0, 2);
    c.shadowBlur = 17; c.fillStyle = '#FFC48A'; c.fillText('e', 0, 2);
    c.shadowBlur = 7; c.fillStyle = '#FFF3E6'; c.fillText('e', 0, 2);
    c.shadowBlur = 0;
    c.restore();

    c.restore();                                     /* ---- screen space ---- */

    const vg = c.createRadialGradient(
      this.VW / 2, this.VH / 2, this.VH * 0.34,
      this.VW / 2, this.VH / 2, this.VH * 0.95,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = vg;
    c.fillRect(0, 0, this.VW, this.VH);

    c.restore();
  }
}
