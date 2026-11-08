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
        <p className="hero-role">
          {PROFILE.tag.split(' · ').map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
        <h1 className="hero-name">
          {PROFILE.name.first}
          <br />
          <span>{PROFILE.name.middle}</span>
          <br />
          {PROFILE.name.last}
        </h1>
        <p className="hero-subtitle">{PROFILE.subtitle}</p>
        <p className="hero-bio">
          Undergraduate at <em>ENSIA</em>, Algeria&apos;s national school of Artificial
          Intelligence. <em>IMC Bronze </em>medalist, <em>PAMO gold</em> laureate, and coach to{' '}
          <em>500+ students</em> across Africa. Driven by the mathematical foundations of
          learning algorithms.
        </p>
        <div className="hero-cta">
          <a href="#contact" className="btn-primary">
            Get in touch
          </a>
          <button
            type="button"
            className="btn-secondary"
            id="heroPlay"
            onClick={onPlay}
          >
            Walk the map
          </button>
          <button
            type="button"
            className="btn-secondary"
            id="heroSkip"
            onClick={onSkip}
          >
            {allUnlocked ? '✓ Unlocked' : 'Skip the game'}
          </button>
        </div>
      </div>

      <div className="hero-right">
        <div className="honeycomb">
          <HeroPhoto />
          {STATS.map((s, i) => (
            <a className={'stat-card cell-' + i} href={s.href} key={s.label}>
              <span className="stat-num">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
