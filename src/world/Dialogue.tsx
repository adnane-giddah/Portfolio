import { useEffect, useState } from 'react';
import type { Npc } from '../types';

interface Props {
  npc: Npc | null;
  onOpen: () => void;
  onLater: () => void;
}

/** The character's line, typed out one character at a time. */
export function Dialogue({ npc, onOpen, onLater }: Props) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (!npc) { setShown(''); return; }
    let i = 0;
    setShown('');
    const id = window.setInterval(() => {
      i += 1;
      setShown(npc.line.slice(0, i));
      if (i >= npc.line.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [npc]);

  return (
    <div className={'arc-dlg' + (npc ? ' on' : '')}>
      <div className="dlg-av">{npc?.glyph ?? '∫'}</div>
      <div className="dlg-main">
        <div className="dlg-name">
          {npc ? `${npc.name} · ${npc.title}` : ''}
        </div>
        <p className="dlg-line">{shown}</p>
        <div className="dlg-acts">
          <button className="dlg-btn" type="button" onClick={onOpen}>
            Open ▸
          </button>
          <button className="dlg-btn ghost" type="button" onClick={onLater}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
