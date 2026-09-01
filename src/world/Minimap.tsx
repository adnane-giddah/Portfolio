import { forwardRef } from 'react';
import { NPCS } from '../data/world';

interface Props {
  floor: number;
  found: Record<string, boolean>;
}

/**
 * Three stacked floor rows with a pip per character. Its `top` is set
 * imperatively by World.placeHud, which measures the bar above it.
 */
export const Minimap = forwardRef<HTMLDivElement, Props>(function Minimap({ floor, found }, ref) {
  return (
    <div className="minimap" ref={ref}>
      {[0, 1, 2].map((f) => (
        <div className={'mm-row' + (f === floor ? ' here' : '')} key={f}>
          <span className="mm-n">F{f + 1}</span>
          {NPCS.filter((n) => n.f === f).map((n) => (
            <span
              className={'mm-pip' + (found[n.id] ? ' done' : '')}
              title={n.title}
              key={n.id}
            />
          ))}
          <span className="mm-you">e</span>
        </div>
      ))}
    </div>
  );
});
