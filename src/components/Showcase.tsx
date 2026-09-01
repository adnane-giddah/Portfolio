import { useReveal } from '../hooks/useReveal';
import { SectionHeader } from './SectionHeader';
import shot from '../assets/shot';

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
          {/* REPLACE ME: swap this src for your own project picture */}
          <img
            id="projectShot"
            className="shot-img"
            src={shot}
            alt="Project preview — placeholder image"
          />
          <figcaption className="shot-cap">
            <b>Placeholder</b>
            <span>swap the src of #projectShot for your image</span>
          </figcaption>
        </figure>

        <div className="showcase-side">
          <h3>
            This portfolio is a
            <br />
            three&#8209;floor map.
          </h3>
          <p>
            Walk it as <em>e</em>, the natural constant. Every floor holds people who keep one part
            of the story — talk to them and their section opens right there. The cave on the ground
            floor holds the CV.
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
              <span>Floor 1</span> Ground · about, education, the cave
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
