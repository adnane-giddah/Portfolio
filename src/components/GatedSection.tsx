import type { ReactNode } from 'react';
import { GATED } from '../data/world';
import type { GatedId } from '../types';
import { SectionHeader } from './SectionHeader';

interface Props {
  id: GatedId;
  unlocked: boolean;
  children: ReactNode;
  onFind: (id: GatedId) => void;
  onSkip: (id: GatedId) => void;
}

/**
 * A section that stays blurred until you have met its character. The lock
 * card always offers a way past it — the game is never the only route.
 */
export function GatedSection({ id, unlocked, children, onFind, onSkip }: Props) {
  const g = GATED[id];

  return (
    <section id={id} className={'gate-wrap' + (unlocked ? '' : ' locked')}>
      <SectionHeader num={g.num} title={g.title} />
      <div className="gate-zone">
        <div className="gate-body">{children}</div>

        {!unlocked && (
          <div className="gate-card">
            <div className="gc-glyph">e</div>
            <div className="gc-lock">Locked · {g.where}</div>
            <div className="gc-title">{g.title}</div>
            <p className="gc-desc">{g.desc}</p>
            <button className="gc-btn" type="button" onClick={() => onFind(id)}>
              ▶ Find {g.who}
            </button>
            <span className="gc-or">or, if you would rather not play</span>
            <button className="gc-skip" type="button" onClick={() => onSkip(id)}>
              ⤼ Skip — unlock every section now
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
