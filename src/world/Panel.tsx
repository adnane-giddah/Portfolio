import { useEffect, useRef } from 'react';
import { PROFILE } from '../data/profile';
import type { Npc } from '../types';
import {
  AboutBody, AchievementsBody, CoachingBody, ContactBody,
  CvVaultBody, EducationBody, ProjectsBody, SkillsBody,
} from '../components/Sections';

interface Props {
  npc: Npc | null;
  onBack: () => void;
  onExit: () => void;
}

/**
 * A section rendered inside the world. The original physically moved the
 * page's DOM nodes in and out of this panel; rendering the same component
 * in both places is the same result without the surgery.
 */
function bodyFor(npc: Npc) {
  switch (npc.id) {
    case 'about': return <AboutBody />;
    case 'education': return <EducationBody />;
    case 'achievements': return <AchievementsBody />;
    case 'coaching': return <CoachingBody />;
    case 'projects': return <ProjectsBody />;
    case 'skills': return <SkillsBody />;
    case 'contact': return <ContactBody />;
    case 'cv': return <CvVaultBody href={PROFILE.cvHref} />;
    default: return null;
  }
}

export function Panel({ npc, onBack, onExit }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (npc && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [npc]);

  return (
    <div className={'arc-panel' + (npc ? ' on' : '')}>
      <div className="pan-top">
        <button className="pan-back" type="button" onClick={onBack}>
          ← Back to the map
        </button>
        <div className="pan-who">
          <span className="pan-glyph">{npc?.glyph ?? '∫'}</span>
          <div className="pan-meta">
            <div className="pan-name">{npc?.name ?? ''}</div>
            <div className="pan-title">{npc?.title ?? ''}</div>
          </div>
        </div>
        <button className="pan-exit" type="button" onClick={onExit}>
          Exit to site
        </button>
      </div>
      <div className="pan-scroll" ref={scrollRef}>
        <div>{npc ? bodyFor(npc) : null}</div>
        <div className="pan-foot">
          <button className="pan-back" type="button" onClick={onBack}>
            ← Back to the map
          </button>
        </div>
      </div>
    </div>
  );
}
