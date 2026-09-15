import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FLOORS, NPCS, SIGILS } from '../data/world';
import type { Npc, PromptState, SectionId } from '../types';
import { WorldEngine } from './engine';
import { Minimap } from './Minimap';
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
  const [insideCave, setInsideCave] = useState<Npc | null>(null);
  const [panelFor, setPanelFor] = useState<Npc | null>(null);
  const [hintGone, setHintGone] = useState(false);

  const foundCount = NPCS.filter((n) => found[n.id]).length;
  const gotCount = SIGILS.filter((g) => got[g.id]).length;

  const cbs = useRef({ onFound, onGot, onToast });
  cbs.current = { onFound, onGot, onToast };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new WorldEngine(canvas, {
      onHud: () => setHudFloor(engine.player.floor),
      onPrompt: (p) => setPrompt(p),
      onEnterCave: (npc) => setInsideCave(npc),
      onExitCave: () => setInsideCave(null),
      onOpenContent: (npc) => {
        if (!engine.found[npc.id]) {
          cbs.current.onFound(npc.id);
          cbs.current.onToast(npc.title + ' unlocked');
        }
        setPanelFor(npc);
      },
      onSigil: (sigil, collected, total) => {
        cbs.current.onGot(sigil.id);
        cbs.current.onToast(
          collected >= total
            ? 'e^iπ+1=0 — the identity is complete'
            : `"${sigil.s}" found — ${collected}/${total}`,
        );
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

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

  const placeHud = useCallback(() => {
    const top = topRef.current;
    const map = mapRef.current;
    if (!top || !map) return;
    const h = top.offsetHeight;
    if (!h) return;
    const mapTop = Math.round(h - 4);
    map.style.top = mapTop + 'px';

    const p = promptRef.current;
    if (!p) return;
    if (window.matchMedia && window.matchMedia('(max-width:900px)').matches) {
      p.style.top = mapTop + (map.offsetHeight || 20) + 12 + 'px';
      p.style.bottom = 'auto';
    } else {
      p.style.top = '';
      p.style.bottom = '';
    }
  }, []);

  useLayoutEffect(() => {
    if (open) placeHud();
  }, [open, hudFloor, foundCount, gotCount, prompt, placeHud]);

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
    setInsideCave(null);
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

    const raf = requestAnimationFrame(placeHud);

    return () => {
      window.clearTimeout(hintTimer);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      engine.stop();
      document.body.classList.remove('arc-open');
    };
  }, [open, seekId, placeHud]);

  useEffect(() => {
    if (!open) return;
    const engine = engineRef.current;
    if (!engine) return;

    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'Escape') {
        if (panelFor) { closePanel(); return; }
        onExit();
        return;
      }
      if (engine.view === 'panel') return;
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

  }, [open, panelFor, onExit]);

  const closePanel = useCallback(() => {
    const engine = engineRef.current;
    setPanelFor(null);
    if (engine) engine.closePanel();
  }, []);

  const F = FLOORS[hudFloor];

  return (
    <div
      id="arcade"
      ref={hostRef}
      className={(open ? 'on playing' : '')}
      role="dialog"
      aria-modal="true"
      aria-label="The world — a three-floor map"
      aria-hidden={!open}
    >
      <canvas id="gcv" ref={canvasRef} />

      <div className="arc-top" ref={topRef}>
        <button className="arc-exit" type="button" onClick={onExit}>
          ← Back to the site
        </button>
        <div className="arc-where">
          <div className="arc-floor">
            {insideCave ? (
              <>
                <span className="arc-glyph">{insideCave.glyph}</span> <b>{insideCave.name}</b>
              </>
            ) : (
              <>
                FLOOR <b>{hudFloor + 1}</b> / 3 · <span>{F.name}</span>
              </>
            )}
          </div>
          <div className="arc-sub">
            {insideCave ? 'find the jewel to open this section' : (
              <>{F.sub} · <span>{foundCount}</span>/{NPCS.length} areas</>
            )}
          </div>
          <div className="hud-eq" title={`${gotCount}/${SIGILS.length} symbols found`}>
            {SIGILS.map((g) => (
              <span key={g.id} className={'eq-ch' + (got[g.id] ? ' got' : '')}>
                {g.s}
              </span>
            ))}
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
        <kbd>→</kbd> walk · <kbd>Space</kbd> jump · <kbd>E</kbd> ride the lifts &amp; open jewels
        <br />
        walk into a cave (or jump it) — find the jewel inside, then keep going to come out the other side
      </div>

      <TouchPad engine={engineRef} promptReady={!!prompt} />

      <Panel npc={panelFor} onBack={closePanel} onExit={onExit} />
    </div>
  );
}
