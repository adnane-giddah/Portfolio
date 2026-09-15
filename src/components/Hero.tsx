import { PROFILE, STATS } from '../data/profile';
import { HeroPhoto } from './HeroPhoto';

interface Props {
  onPlay: () => void;
  onSkip: () => void;
  allUnlocked: boolean;
}

const STAT_META: Record<string, { tag: string; sub: string }> = {
  'Students coached': { tag: 'Coaching', sub: 'AMO · AOI · AOA' },
  'International medals': { tag: 'Awards', sub: 'IMC · PAMO · OFM' },
  'African countries reached': { tag: 'Global', sub: 'Rising Stars Program' },
  'Community members': { tag: 'Community', sub: 'BAC World' },
};

export function Hero({ onPlay, onSkip, allUnlocked }: Props) {
  return (
    <section id="hero">
      <div className="hero-left">
        <div className="hero-tag hud-frame">{PROFILE.tag}</div>
        <span className="hero-coords">
          36.4703° N, 2.8277° E
        </span>
        <h1 className="hero-name">
          {PROFILE.name.first}
          <br />
          <span>{PROFILE.name.middle}</span>
          <br />
          {PROFILE.name.last}
        </h1>
        <p className="hero-subtitle">λ: {PROFILE.subtitle}</p>
        <p className="hero-bio">
          Undergraduate at <em>ENSIA</em>, Algeria&apos;s national school of Artificial
          Intelligence. <em>IMC Bronze </em>medalist, <em>PAMO gold</em> laureate, and coach to{' '}
          <em>500+ students</em> across Africa. Driven by the mathematical foundations of
          learning algorithms.
        </p>
        <span className="hero-spec">
          Specialization: <b>Convex Optimization</b> · <b>Theoretical ML</b> ·{' '}
          <b>Deep Learning Theory</b>
        </span>
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
            ▶ Play and Explore
          </button>
          <button
            type="button"
            className="btn-secondary"
            id="heroSkip"
            onClick={onSkip}
          >
            {allUnlocked ? '✓ Unlocked' : '⤼ Skip the game — show everything'}
          </button>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-photo-wrap">
          <span className="hero-orbit" aria-hidden="true" />
          <span className="hero-orbit orbit-outer" aria-hidden="true" />
          <HeroPhoto />
        </div>
        {STATS.map((s) => {
          const meta = STAT_META[s.label];
          return (
            <div className="stat-card" key={s.label}>
              {meta && <span className="stat-tag">{meta.tag}</span>}
              <div className="stat-num">
                <a href={s.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {s.value}
                </a>
              </div>
              <div className="stat-label">{s.label}</div>
              {meta && <div className="stat-sub">{meta.sub}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
