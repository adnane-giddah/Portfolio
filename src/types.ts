

export type SectionId =
  | 'about'
  | 'education'
  | 'achievements'
  | 'coaching'
  | 'projects'
  | 'skills'
  | 'contact'
  | 'cv';

export type GatedId = 'achievements' | 'coaching' | 'projects' | 'skills';

export interface Floor {
  y: number;
  x0: number;
  x1: number;
  name: string;
  sub: string;
}

export interface Lift {
  x: number;
  a: number;
  b: number;
}

export interface Platform {
  f: number;
  x: number;
  w: number;
  dy: number;
}

export interface Crate {
  f: number;
  x: number;
  w: number;
  h: number;
}

export interface BouncePad {
  f: number;
  x: number;
  w: number;

  flash?: number;
}

export interface Mover {
  f: number;
  x0: number;
  x1: number;
  dy: number;
  w: number;

  sp: number;

  ph: number;

  cx?: number;

  dx?: number;
}

export interface Sigil {
  id: string;
  f: number;
  x: number;
  dy: number;
  s: string;
}

export type NpcClass =
  | 'conqueror' | 'scientist' | 'sorcerer' | 'public' | 'leader' | 'technician' | 'religious';

export interface Npc {
  id: SectionId;
  f: number;
  x: number;

  dy?: number;
  cls?: NpcClass;
  glyph: string;
  name: string;
  title: string;
  line: string;
}

export interface GateInfo {
  num: string;
  title: string;
  who: string;
  where: string;
  desc: string;
}

export interface HudState {
  floor: number;
  floorName: string;
  floorSub: string;
  found: number;
  totalAreas: number;
  sigils: number;
  totalSigils: number;
}

export interface PromptState {
  glyph: string;
  text: string;
  bold: string;
  key: string;
}

export interface Progress {
  found: Record<string, boolean>;
  got: Record<string, boolean>;
  muted: boolean;
}
