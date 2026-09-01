import { useCallback, useState } from 'react';
import './styles/page.css';
import './styles/world.css';

import { PROFILE } from './data/profile';
import type { GatedId, SectionId } from './types';

import { useProgress } from './hooks/useProgress';
import { useTheme } from './hooks/useTheme';
import { useToasts } from './hooks/useToasts';

import { Cursor } from './components/Cursor';
import { Footer } from './components/Footer';
import { GatedSection } from './components/GatedSection';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { SectionHeader } from './components/SectionHeader';
import { Showcase } from './components/Showcase';
import { Toasts } from './components/Toasts';
import {
  AboutBody, AchievementsBody, CoachingBody, ContactBody,
  EducationBody, ProjectsBody, SkillsBody,
} from './components/Sections';
import { World } from './world/World';

export default function App() {
  const { toggle } = useTheme();
  const { toasts, toast } = useToasts();
  const {
    progress, allFound, markFound, markGot, revealAll, setMuted,
  } = useProgress();

  const [worldOpen, setWorldOpen] = useState(false);
  const [seekId, setSeekId] = useState<SectionId | undefined>(undefined);
  const [navCloseSignal, setNavCloseSignal] = useState(0);

  const openWorld = useCallback((seek?: SectionId) => {
    setSeekId(seek);
    setWorldOpen(true);
    setNavCloseSignal((n) => n + 1);   /* the phone menu must not hang over the world */
  }, []);

  const exitWorld = useCallback(() => setWorldOpen(false), []);

  /**
   * The escape hatch. Unlocks every gated section and, if we are inside
   * the world, drops the player back onto the ordinary page.
   */
  const skipEverything = useCallback((scrollTo?: string) => {
    revealAll();
    setWorldOpen(false);
    toast('Everything unlocked — scroll freely');
    if (scrollTo) {
      window.setTimeout(() => {
        document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [revealAll, toast]);

  const onFind = useCallback((id: GatedId) => openWorld(id), [openWorld]);
  const onSkip = useCallback((id: GatedId) => skipEverything(id), [skipEverything]);

  return (
    <>
      <Cursor />
      <Toasts toasts={toasts} />

      <World
        open={worldOpen}
        seekId={seekId}
        found={progress.found}
        got={progress.got}
        muted={progress.muted}
        onFound={markFound}
        onGot={markGot}
        onMuted={setMuted}
        onExit={exitWorld}
        onSkipAll={() => skipEverything('achievements')}
        onToast={toast}
      />

      <Nav onToggleTheme={toggle} forceClose={navCloseSignal} />

      <Hero
        onPlay={() => openWorld()}
        onSkip={() => skipEverything('about')}
        allUnlocked={allFound}
      />

      <Showcase
        onPlay={() => openWorld()}
        onSkip={() => skipEverything('achievements')}
        allUnlocked={allFound}
      />

      <section id="about">
        <SectionHeader num="01" title="About" />
        <AboutBody />
      </section>

      <section id="education">
        <SectionHeader num="02" title="Education" />
        <EducationBody />
      </section>

      <GatedSection
        id="achievements"
        unlocked={!!progress.found.achievements}
        onFind={onFind}
        onSkip={onSkip}
      >
        <AchievementsBody />
      </GatedSection>

      <GatedSection
        id="coaching"
        unlocked={!!progress.found.coaching}
        onFind={onFind}
        onSkip={onSkip}
      >
        <CoachingBody />
      </GatedSection>

      <GatedSection
        id="projects"
        unlocked={!!progress.found.projects}
        onFind={onFind}
        onSkip={onSkip}
      >
        <ProjectsBody />
      </GatedSection>

      <GatedSection
        id="skills"
        unlocked={!!progress.found.skills}
        onFind={onFind}
        onSkip={onSkip}
      >
        <SkillsBody />
      </GatedSection>

      <section id="contact">
        <SectionHeader num="07" title="Contact" />
        <ContactBody />
      </section>

      <Footer />

      {/* kept out of the flow; the CV lives in the cave */}
      <a href={PROFILE.cvHref} hidden download>
        CV
      </a>
    </>
  );
}
