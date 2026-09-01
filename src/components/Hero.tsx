import { PROFILE, STATS } from '../data/profile';
import { HeroPhoto } from './HeroPhoto';

interface Props {
  onPlay: () => void;
  onSkip: () => void;
  allUnlocked: boolean;
}

export function Hero({ onPlay, onSkip, allUnlocked }: Props) {
  return (
    <section id="hero">
      <div className="hero-left">
        <div className="hero-tag">{PROFILE.tag}</div>
        <h1 className="hero-name">
          {PROFILE.name.first}
          <br />
          <span>{PROFILE.name.middle}</span>
          <br />
          {PROFILE.name.last}
        </h1>
        <p className="hero-subtitle">{PROFILE.subtitle}</p>
        <p className="hero-bio">{PROFILE.bio}</p>
        <div className="hero-cta">
          <a href="#contact" className="btn-primary">
            Get in touch
          </a>
          <a href="#achievements" className="btn-secondary">
            View Awards
          </a>
          <button
            type="button"
            className="btn-secondary"
            id="heroPlay"
            onClick={onPlay}
          >
            ▶ Play the level
          </button>
          <button
            type="button"
            className="btn-secondary"
            id="heroSkip"
            onClick={onSkip}
          >
            {allUnlocked ? '✓ Everything is unlocked' : '⤼ Skip it — show everything'}
          </button>
        </div>
      </div>

      <div className="hero-right">
        <HeroPhoto />
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-num">
              <a href={s.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                {s.value}
              </a>
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
