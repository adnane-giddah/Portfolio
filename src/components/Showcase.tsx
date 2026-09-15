import { useReveal } from '../hooks/useReveal';
import { SectionHeader } from './SectionHeader';

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
          <img
            id="projectShot"
            className="shot-img"
            src="world-preview.jpg"
            alt="The three-floor game map — Floor 1, Ground"
          />
          <figcaption className="shot-cap">
            <b>Floor 1 — Ground</b>
            <span>a live screenshot of the map below</span>
          </figcaption>
        </figure>

        <div className="showcase-side">
          <h3>
            This portfolio is a
            <br />
            three&#8209;floor map.
          </h3>
          <p>
            Walk it as a small explorer. Every floor holds caves that lead into a short dungeon —
            find the jewel inside to open that part of the story, then keep walking to come out the
            other side. Along the way, collect the pieces of <em>Euler&apos;s identity</em>, e^iπ+1=0.
          </p>
          <div className="floor-list">
            <div className="floor-row">
              <i />
              <span>Floor 3</span> Observatory · projects, skills, contact
            </div>
            <div className="floor-row">
              <i />
              <span>Floor 2</span> Mezzanine · awards, coaching
            </div>
            <div className="floor-row">
              <i />
              <span>Floor 1</span> Ground · about, education, the archive
            </div>
          </div>

          <div className="world-cta">
            <button id="enterWorld" type="button" onClick={onPlay}>
              <span className="ew-e">e</span> Play / Explore
            </button>
            <button id="skipWorld" className="skip-btn" type="button" onClick={onSkip}>
              {allUnlocked ? (
                '✓ Everything is unlocked'
              ) : (
                <>
                  <span className="sb-x">⤼</span> Skip the game — show me everything
                </>
              )}
            </button>
          </div>

          <p className={'skip-note' + (allUnlocked ? ' skip-done' : '')}>
            {allUnlocked ? (
              <>
                <b>Everything is already unlocked.</b> Scroll on — every section is open. The game
                is still there if you want it.
              </>
            ) : (
              <>
                <b>The game is optional.</b> Every section of this portfolio can be read normally by
                scrolling. Press <b>Skip</b> and all four locked sections open at once — no walking,
                no jumping, nothing to find.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
