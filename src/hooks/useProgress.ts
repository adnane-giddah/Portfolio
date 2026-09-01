import { useCallback, useState } from 'react';
import { NPCS, SIGILS } from '../data/world';
import type { Progress } from '../types';

const KEY = 'aam_world';

function read(): Progress {
  const empty: Progress = { found: {}, got: {}, muted: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as { found?: string[]; got?: string[]; muted?: boolean };
    const found: Record<string, boolean> = {};
    const got: Record<string, boolean> = {};
    (parsed.found ?? []).forEach((id) => { found[id] = true; });
    (parsed.got ?? []).forEach((id) => { got[id] = true; });
    return { found, got, muted: !!parsed.muted };
  } catch {
    /* private mode, cleared storage, quota — a fresh start is fine */
    return empty;
  }
}

function write(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      found: Object.keys(p.found),
      got: Object.keys(p.got),
      muted: p.muted,
    }));
  } catch {
    /* nothing we can do, and nothing worth breaking the page over */
  }
}

/**
 * Which characters you have met and which sigils you have picked up,
 * persisted to localStorage. React owns this; the engine gets a copy each
 * time it changes and reports back through callbacks, so the 60fps loop
 * never has to go through setState.
 */
export function useProgress() {
  const [state, setState] = useState<Progress>(read);

  const markFound = useCallback((id: string) => {
    setState((prev) => {
      if (prev.found[id]) return prev;
      const next: Progress = { ...prev, found: { ...prev.found, [id]: true } };
      write(next);
      return next;
    });
  }, []);

  const markGot = useCallback((id: string) => {
    setState((prev) => {
      if (prev.got[id]) return prev;
      const next: Progress = { ...prev, got: { ...prev.got, [id]: true } };
      write(next);
      return next;
    });
  }, []);

  const revealAll = useCallback(() => {
    setState((prev) => {
      const found: Record<string, boolean> = { ...prev.found };
      NPCS.forEach((n) => { found[n.id] = true; });
      const next: Progress = { ...prev, found };
      write(next);
      return next;
    });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setState((prev) => {
      const next: Progress = { ...prev, muted };
      write(next);
      return next;
    });
  }, []);

  const foundCount = NPCS.filter((n) => state.found[n.id]).length;
  const gotCount = SIGILS.filter((g) => state.got[g.id]).length;
  const allFound = foundCount >= NPCS.length;

  return {
    progress: state,
    foundCount,
    gotCount,
    allFound,
    totalAreas: NPCS.length,
    totalSigils: SIGILS.length,
    markFound,
    markGot,
    revealAll,
    setMuted,
  };
}
