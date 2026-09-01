import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FLOORS, NPCS, SIGILS } from '../data/world';
import type { Npc, PromptState, SectionId } from '../types';
import { WorldEngine } from './engine';
import { Minimap } from './Minimap';
import { Dialogue } from './Dialogue';
import { Panel } from './Panel';
import { TouchPad } from './TouchPad';

interface Props {
  open: boolean;
  seekId?: SectionId;
  found: Record<string, boolean>;
  got: Record<string, boolean>;
  muted: boolean;
  onFound: (id: string) => void;
  onGot: (id: string) => void;
  onMuted: (m: boolean) => void;
  onExit: () => void;
  onSkipAll: () => void;
  onToast: (msg: string) => void;
}

export function World({
  open, seekId, found, got, muted,
  onFound, onGot, onMuted, onExit, onSkipAll, onToast,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const promptRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WorldEngine | null>(null);

  const [hudFloor, setHudFloor] = useState(0);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [talking, setTalking] = useState<Npc | null>(null);
  const [panelFor, setPanelFor] = useState<Npc | null>(null);
  const [hintGone, setHintGone] = useState(false);

  const foundCount = NPCS.filter((n) => found[n.id]).length;
  const gotCount = SIGILS.filter((g) => got[g.id]).length;

  /* keep the latest callbacks reachable from the engine without re-creating it */
  const cbs = useRef({ onFound, onGot, onToast });
  cbs.current = { onFound, onGot, onToast };

  /* ---------------------------------------------------------------
     Build the engine once. It is deliberately not re-created when
     props change — it reads mutable records we keep in sync below.
     --------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new WorldEngine(canvas, {
      onHud: () => setHudFloor(engine.player.floor),
      onPrompt: (p) => setPrompt(p),
      onTalk: (npc) => {
        engine.view = 'dlg';
        engine.input.left = false;
        engine.input.right = false;
        engine.blip(660, 0.1, 'triangle', 0.05);
        setTalking(npc);
      },
      onSigil: (sigil, collected, total) => {
        cbs.current.onGot(sigil.id);
        cbs.current.onToast(
          collected >= total
            ? 'All twelve sigils found'
            : `Sigil ${sigil.s} — ${collected}/${total}`,
        );
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /* mirror progress into the engine's mutable records */
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.found = { ...found };
    e.got = { ...got };
  }, [found, got]);

  useEffect(() => {
    const e = engineRef.current;
    if (e) e.muted = muted;
  }, [muted]);

  /* ---------------------------------------------------------------
     The top bar wraps differently on every screen, and the floor line
     changes length as you collect things. Rather than guess an offset,
     measure the bar and place the map — then the prompt — beneath it.
     --------------------------------------------------------------- */
  const placeHud = useCallback(() => {
    const top = topRef.current;
    const map = mapRef.current;
    if (!top || !map) return;
    const h = top.offsetHeight;
    if (!h) return;                       /* overlay hidden — nothing to measure */
    const mapTop = Math.round(h - 4);
    map.style.top = mapTop + 'px';

    const p = promptRef.current;
    if (!p) return;
    if (window.matchMedia && window.matchMedia('(max-width:900px)').matches) {
      p.style.top = mapTop + (map.offsetHeight || 20) + 12 + 'px';
      p.style.bottom = 'auto';
    } else {
      p.style.top = '';                   /* hand it back to the stylesheet */
      p.style.bottom = '';
    }
  }, []);

  useLayoutEffect(() => {
    if (open) placeHud();
  }, [open, hudFloor, foundCount, gotCount, prompt, placeHud]);

  /* ---------------------------------------------------------------
     Open / close
     --------------------------------------------------------------- */
  useEffect(() => {
    const engine = engineRef.current;
    const host = hostRef.current;
    if (!engine || !host) return;

    if (!open) {
      engine.stop();
      document.body.classList.remove('arc-open');
      return;
    }

    document.body.classList.add('arc-open');
    engine.view = 'world';
    setTalking(null);
    setPanelFor(null);
    engine.spawn(seekId);
    engine.resize(host);
    setHudFloor(engine.player.floor);
    engine.start();
    engine.unlockAudio();

    setHintGone(false);
    const hintTimer = window.setTimeout(() => setHintGone(true), 7000);

    const onResize = () => {
      engine.resize(host);
      placeHud();
    };
    window.addEventListener('resize', onResize);
    /* one more pass after layout settles, so the first frame is placed right */
    const raf = requestAnimationFrame(placeHud);

    return () => {
      window.clearTimeout(hintTimer);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      engine.stop();
      document.body.classList.remove('arc-open');
    };
  }, [open, seekId, placeHud]);

  /* ---------------------------------------------------------------
     Keyboard
     --------------------------------------------------------------- */
  useEffect(() => {
    if (!open) return;
    const engine = engineRef.current;
    if (!engine) return;

    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'Escape') {
        if (panelFor) { closePanel(); return; }
        if (talking) { endDialogue(); return; }
        onExit();
        return;
      }
      if (engine.view !== 'world') {
        if ((k === 'e' || k === 'E' || k === 'Enter') && talking) openPanel(talking);
        return;
      }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { engine.input.left = true; e.preventDefault(); }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { engine.input.right = true; e.preventDefault(); }
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { engine.jump(); e.preventDefault(); }
      if (k === 'e' || k === 'E' || k === 'Enter') { engine.act(); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') engine.input.left = false;
      if (k === 'ArrowRight' || k === 'd' || k === 'D') engine.input.right = false;
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') engine.releaseJump();
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, talking, panelFor, onExit]);

  /* ---------------------------------------------------------------
     Dialogue / panel
     --------------------------------------------------------------- */
  const endDialogue = useCallback(() => {
    const engine = engineRef.current;
    setTalking(null);
    if (engine && !panelFor) engine.view = 'world';
  }, [panelFor]);

  const openPanel = useCallback((npc: Npc) => {
    const engine = engineRef.current;
    if (!found[npc.id]) {
      cbs.current.onFound(npc.id);
      cbs.current.onToast(npc.title + ' unlocked');
    }
    setTalking(null);
    setPanelFor(npc);
    if (engine) {
      engine.view = 'panel';
      engine.sweep(520, 900, 0.22, 'sine');
    }
  }, [found]);

  const closePanel = useCallback(() => {
    const engine = engineRef.current;
    setPanelFor(null);
    if (engine) {
      engine.view = 'world';
      engine.blip(420, 0.1, 'sine', 0.04);
    }
  }, []);

  const F = FLOORS[hudFloor];

  return (
    <div
      id="arcade"
      ref={hostRef}
      className={(open ? 'on' : '') + (open && !panelFor ? ' playing' : '')}
      role="dialog"
      aria-modal="true"
      aria-label="The world — a three-floor map"
      aria-hidden={!open}
    >
      <canvas id="gcv" ref={canvasRef} />

      {/* top bar: where you are + the way back to the first interface */}
      <div className="arc-top" ref={topRef}>
        <button className="arc-exit" type="button" onClick={onExit}>
          ← Back to the site
        </button>
        <div className="arc-where">
          <div className="arc-floor">
            FLOOR <b>{hudFloor + 1}</b> / 3 · <span>{F.name}</span>
          </div>
          <div className="arc-sub">
            {F.sub} · <span>{foundCount}</span>/{NPCS.length} areas ·{' '}
            <span className="hud-sig">
              {gotCount}/{SIGILS.length} sigils
            </span>
          </div>
        </div>
        <div className="arc-right">
          <button
            className="arc-skip"
            type="button"
            title="Unlock every section and leave the game"
            onClick={onSkipAll}
          >
            ⤼ Skip<span className="as-long"> · show everything</span>
          </button>
          <button
            className="arc-ib"
            type="button"
            title="Sound"
            onClick={() => onMuted(!muted)}
          >
            {muted ? '⨯' : '♪'}
          </button>
        </div>
      </div>

      <Minimap ref={mapRef} floor={hudFloor} found={found} />

      <div className={'arc-prompt' + (prompt ? ' on' : '')} ref={promptRef}>
        <span className="ap-glyph">{prompt?.glyph ?? '∫'}</span>
        <span className="ap-txt">
          {prompt?.text}
          <b>{prompt?.bold}</b>
        </span>
        <span className="ap-key">Press {prompt?.key ?? 'E'}</span>
      </div>

      <div className={'arc-hint' + (hintGone ? ' gone' : '')}>
        <kbd>←</kbd>
        <kbd>→</kbd> walk · <kbd>Space</kbd> jump · <kbd>E</kbd> talk &amp; ride the lifts
        <br />
        hop the crates, use the purple pads, ride the sliding ledges — and pick up the 12 sigils
      </div>

      <TouchPad engine={engineRef} promptReady={!!prompt} />

      <Dialogue
        npc={talking}
        onOpen={() => talking && openPanel(talking)}
        onLater={endDialogue}
      />

      <Panel npc={panelFor} onBack={closePanel} onExit={onExit} />
    </div>
  );
}
