/* ---------------------------------------------------------------
   Shared types. The world is described by plain data so the engine
   stays a pure module and the React layer only renders it.
   --------------------------------------------------------------- */

export type SectionId =
  | 'about'
  | 'education'
  | 'achievements'
  | 'coaching'
  | 'projects'
  | 'skills'
  | 'contact'
  | 'cv';

/** A gated section is one the game hides until you meet its character. */
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

/** A static ledge you can hop onto. One-way: you pass up through it. */
export interface Platform {
  f: number;
  x: number;
  w: number;
  dy: number;
}

/** A solid box. Blocks you sideways, holds you up from above. */
export interface Crate {
  f: number;
  x: number;
  w: number;
  h: number;
}

/** A pad on the floor that launches you far higher than a jump. */
export interface BouncePad {
  f: number;
  x: number;
  w: number;
  /** 0..1 flash left over from the last launch, for the draw pass. */
  flash?: number;
}

/** A ledge that slides between x0 and x1 and carries you with it. */
export interface Mover {
  f: number;
  x0: number;
  x1: number;
  dy: number;
  w: number;
  /** speed */
  sp: number;
  /** phase offset, so they do not all move together */
  ph: number;
  /** current x, filled in by the engine each frame */
  cx?: number;
  /** how far it moved since the last frame */
  dx?: number;
}

/** A collectible glyph. */
export interface Sigil {
  id: string;
  f: number;
  x: number;
  dy: number;
  s: string;
}

export interface Npc {
  id: SectionId;
  f: number;
  x: number;
  glyph: string;
  name: string;
  title: string;
  line: string;
  cave?: boolean;
}

export interface GateInfo {
  num: string;
  title: string;
  who: string;
  where: string;
  desc: string;
}

/** What the engine hands back to React for the HUD. */
export interface HudState {
  floor: number;
  floorName: string;
  floorSub: string;
  found: number;
  totalAreas: number;
  sigils: number;
  totalSigils: number;
}

/** The little "press E" bubble. */
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
