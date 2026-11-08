import { useReveal } from '../hooks/useReveal';
import { SectionHeader } from './SectionHeader';
import { WorldMap } from './WorldMap';

interface Props {
  onPlay: () => void;
  onSkip: () => void;
  allUnlocked: boolean;
}

export function Showcase({ onPlay, onSkip, allUnlocked }: Props) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section id="showcase">
      <SectionHeader num="00" title="The World" />
      <div className="showcase-wrap reveal" ref={ref}>
        <figure className="shot-frame">
          <WorldMap onPlay={onPlay} />
          <figcaption className="shot-cap">
            The actual floor plan, drawn from the level data. Click it to walk in.
          </figcaption>
        </figure>

        <div className="showcase-side">
          <h3>
            The site is also a
            <br />
            three&#8209;floor game.
          </h3>
          <p>
            Walk it as a small explorer. Every floor holds caves that lead into a short dungeon:
            find the jewel inside to open that part of the story, then keep walking to come out the
            other side. Along the way, collect the pieces of <em>Euler&apos;s identity</em>, e^iπ+1=0.
          </p>
          <div className="world-cta">
            <button id="enterWorld" type="button" onClick={onPlay}>
              Walk the map
            </button>
            <button id="skipWorld" className="skip-btn" type="button" onClick={onSkip}>
              {allUnlocked ? 'Everything is unlocked' : 'Skip the game'}
            </button>
          </div>

          <p className={'skip-note' + (allUnlocked ? ' skip-done' : '')}>
            {allUnlocked ? (
              <>
                <b>Everything is already unlocked.</b> Scroll on, every section is open. The game
                is still there if you want it.
              </>
            ) : (
              <>
                <b>The game is optional.</b> Every section of this portfolio can be read normally by
                scrolling. Press <b>Skip</b> and all four locked sections open at once. No walking,
                no jumping, nothing to find.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
