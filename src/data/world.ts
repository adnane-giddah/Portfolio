import type {
  BouncePad, Crate, Floor, GateInfo, GatedId, Lift, Mover, Npc, Platform, Sigil,
} from '../types';



export const FLOOR_H = 380;

export const FLOORS: Floor[] = [
  { y: 0, x0: -260, x1: 3060, name: 'GROUND', sub: 'Foundations' },
  { y: -380, x0: -260, x1: 3060, name: 'MEZZANINE', sub: 'The Arena' },
  { y: -760, x0: -260, x1: 3060, name: 'OBSERVATORY', sub: 'The Workshop' },
];


export const LIFTS: Lift[] = [
  { x: 2820, a: 0, b: 1 },
  { x: 140, a: 1, b: 2 },
];


export const PLATS: Platform[] = [
  { f: 0, x: 760, w: 170, dy: 118 }, { f: 0, x: 1480, w: 190, dy: 118 },
  { f: 0, x: 1760, w: 150, dy: 212 },
  { f: 1, x: 700, w: 180, dy: 118 }, { f: 1, x: 1600, w: 180, dy: 118 },
  { f: 1, x: 2400, w: 160, dy: 200 },
  { f: 2, x: 1080, w: 180, dy: 118 }, { f: 2, x: 1900, w: 190, dy: 118 },
  { f: 2, x: 2620, w: 160, dy: 206 },
];


export const CRATES: Crate[] = [
  { f: 0, x: 560, w: 56, h: 56 }, { f: 0, x: 616, w: 56, h: 56 },
  { f: 0, x: 1020, w: 56, h: 56 },
  { f: 0, x: 2020, w: 56, h: 56 }, { f: 0, x: 2076, w: 56, h: 112 },
  { f: 1, x: 520, w: 56, h: 56 }, { f: 1, x: 576, w: 56, h: 112 },
  { f: 1, x: 1420, w: 56, h: 56 },
  { f: 1, x: 1980, w: 56, h: 56 }, { f: 1, x: 2036, w: 56, h: 56 },
  { f: 2, x: 460, w: 56, h: 56 },
  { f: 2, x: 1360, w: 56, h: 56 }, { f: 2, x: 1416, w: 56, h: 112 },
  { f: 2, x: 2240, w: 56, h: 56 }, { f: 2, x: 2296, w: 56, h: 112 },
];


export const BPADS: BouncePad[] = [
  { f: 0, x: 1290, w: 84 }, { f: 0, x: 1930, w: 84 },
  { f: 1, x: 860, w: 84 }, { f: 1, x: 2140, w: 84 },
  { f: 2, x: 980, w: 84 }, { f: 2, x: 2380, w: 84 },
];


export const MOVERS: Mover[] = [
  { f: 0, x0: 1560, x1: 1830, dy: 170, w: 130, sp: 0.55, ph: 0 },
  { f: 1, x0: 1120, x1: 1400, dy: 176, w: 130, sp: 0.5, ph: 1.7 },
  { f: 2, x0: 1990, x1: 2330, dy: 150, w: 130, sp: 0.58, ph: 0.9 },
];


export const SIGILS: Sigil[] = [
  { id: 'eq-e', f: 0, x: 845, dy: 172, s: 'e' },
  { id: 'eq-i', f: 0, x: 1835, dy: 266, s: 'i' },
  { id: 'eq-pi', f: 1, x: 790, dy: 172, s: 'π' },
  { id: 'eq-plus', f: 1, x: 1260, dy: 242, s: '+' },
  { id: 'eq-1', f: 2, x: 1920, dy: 172, s: '1' },
  { id: 'eq-eq', f: 2, x: 1995, dy: 172, s: '=' },
  { id: 'eq-0', f: 2, x: 2700, dy: 260, s: '0' },
];


export const NPCS: Npc[] = [
  {
    id: 'about', f: 0, x: 380, cls: 'conqueror', glyph: 'λ', name: 'The Cartographer', title: 'About',
    line: 'Every map needs an origin. Mine starts at ENSIA — optimization, learning algorithms, and the mathematics underneath. Want the long version?',
  },
  {

    id: 'education', f: 0, x: 1575, dy: 118, cls: 'scientist', glyph: '∂', name: 'The Tutor', title: 'Education',
    line: 'Two entries, one direction. A mathematics baccalaureate, then the national school of Artificial Intelligence. Shall I open the record?',
  },
  {
    id: 'cv', f: 0, x: 2470, cls: 'sorcerer', glyph: '∞', name: 'The Archivist', title: 'The CV',
    line: 'I keep one document down here — everything above, folded into two pages. It is yours to take.',
  },
  {

    id: 'achievements', f: 1, x: 2480, dy: 200, cls: 'public', glyph: 'Σ', name: 'The Medalist', title: 'Olympiad Awards',
    line: 'Eleven of them. IMO, IMC, PAMO, the Francophone. Bronze, silver, gold — and two that missed by a hair. Care to look?',
  },
  {
    id: 'coaching', f: 1, x: 980, cls: 'leader', glyph: '∇', name: 'The Coach', title: 'Coaching & Leadership',
    line: 'Five hundred students, three organisations, delegations across Africa. Teaching is the other half of the work. I can show you the ledger.',
  },
  {
    id: 'projects', f: 2, x: 760, glyph: '∫', name: 'The Builder', title: 'Projects',
    line: 'Communities, mostly. A thousand students preparing for the baccalaureate, and the people who kept it running. Want to see what got built?',
  },
  {

    id: 'skills', f: 2, x: 1170, dy: 118, cls: 'technician', glyph: 'π', name: 'The Smith', title: 'Technical Skills',
    line: 'Languages, frameworks, the things I reach for. C++ first, LaTeX always. Have a look at the workbench.',
  },
  {
    id: 'contact', f: 2, x: 2540, cls: 'religious', glyph: 'φ', name: 'The Messenger', title: 'Contact',
    line: 'The way out is also a way in. Mail, phone, GitHub, LinkedIn — every line here reaches a real person. Shall I open the channels?',
  },
];


export const GATED: Record<GatedId, GateInfo> = {
  achievements: {
    num: '03', title: 'Olympiad Awards', who: 'the Medalist', where: 'the Mezzanine',
    desc: 'Eleven medals from IMO, IMC, PAMO and beyond — kept by the Medalist, one floor up.',
  },
  coaching: {
    num: '04', title: 'Coaching & Leadership', who: 'the Coach', where: 'the Mezzanine',
    desc: 'Coaching, delegations and olympiad leadership — the Coach keeps this ledger.',
  },
  projects: {
    num: '05', title: 'Projects', who: 'the Builder', where: 'the Observatory',
    desc: 'Communities of 1,000+ students and the work behind them — ask the Builder on the top floor.',
  },
  skills: {
    num: '06', title: 'Technical Skills', who: 'the Smith', where: 'the Observatory',
    desc: 'The stack and the languages — laid out on the Smith’s workbench.',
  },
};

export const GATED_IDS = Object.keys(GATED) as GatedId[];
