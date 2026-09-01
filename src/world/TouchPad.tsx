import type { RefObject } from 'react';
import type { WorldEngine } from './engine';

interface Props {
  engine: RefObject<WorldEngine | null>;
  promptReady: boolean;
}

/**
 * On-screen controls for phones. Pointer events rather than click, so
 * holding a direction actually holds it.
 */
export function TouchPad({ engine, promptReady }: Props) {
  const hold = (dir: 'left' | 'right', on: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    const en = engine.current;
    if (en) en.input[dir] = on;
  };

  return (
    <div className="arc-pad">
      <div className="pad-move">
        <button
          className="pad-b"
          id="padL"
          type="button"
          aria-label="Go left"
          onPointerDown={hold('left', true)}
          onPointerUp={hold('left', false)}
          onPointerLeave={hold('left', false)}
          onPointerCancel={hold('left', false)}
        >
          <span className="pb-ar">←</span> Left
        </button>
        <button
          className="pad-b"
          id="padR"
          type="button"
          aria-label="Go right"
          onPointerDown={hold('right', true)}
          onPointerUp={hold('right', false)}
          onPointerLeave={hold('right', false)}
          onPointerCancel={hold('right', false)}
        >
          Right <span className="pb-ar">→</span>
        </button>
      </div>
      <div className="pad-act">
        <button
          className="pad-b pad-jump"
          id="padJ"
          type="button"
          aria-label="Jump"
          onPointerDown={(e) => { e.preventDefault(); engine.current?.jump(); }}
          onPointerUp={(e) => { e.preventDefault(); engine.current?.releaseJump(); }}
        >
          <span className="pb-ar">▲</span> Jump
        </button>
        <button
          className={'pad-b pad-talk' + (promptReady ? ' ready' : '')}
          id="padE"
          type="button"
          aria-label="Talk or ride"
          onPointerDown={(e) => { e.preventDefault(); engine.current?.act(); }}
        >
          <span className="pb-ar">◉</span> Talk
        </button>
      </div>
    </div>
  );
}
