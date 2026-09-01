/* ---------------------------------------------------------------
   The page's sections.

   Each one is a plain component so it can be rendered twice: once on
   the landing page, and once inside the world's content panel when you
   open it from a character. The original moved DOM nodes around by
   hand to achieve that — this is the same idea without the surgery.
   --------------------------------------------------------------- */

import {
  ABOUT_INTERESTS, COACHING, CONTACT_LINKS, EDUCATION, LANGUAGES,
  MEDALS, PROJECTS, SKILL_GROUPS,
} from '../data/profile';
import { useReveal } from '../hooks/useReveal';

export function AboutBody() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="about-grid reveal" ref={ref}>
      <div>
        <p className="about-text">
          I am an undergraduate specializing in <em>artificial intelligence</em> with a strong
          foundation in mathematics. My focus lies at the intersection of{' '}
          <em>optimization theory</em> and machine learning — building and analyzing the algorithms
          that shape the future of intelligence.
          <br />
          <br />
          Beyond the classroom, I coach national and international olympiad teams, deliver lectures
          across Africa, and build academic communities that have produced top-scoring baccalaureate
          students in Algeria.
        </p>
      </div>
      <div className="about-interests">
        <div className="section-num" style={{ marginBottom: 14 }}>
          Research Interests
        </div>
        <div>
          {ABOUT_INTERESTS.map((t) => (
            <span className="interest-tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EducationBody() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="reveal" ref={ref}>
      {EDUCATION.map((e) => (
        <div className="edu-item" key={e.school}>
          <div>
            <div className="edu-year">{e.years}</div>
            <div className="edu-year" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {e.place}
            </div>
          </div>
          <div>
            <div className="edu-school">{e.school}</div>
            <div className="edu-degree">{e.degree}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AchievementsBody() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="medals-grid reveal" ref={ref}>
      {MEDALS.map((m, i) => {
        const card = (
          <div className="medal-card">
            <div className={'medal-badge badge-' + m.kind}>{m.badge}</div>
            <div className="medal-comp">{m.competition}</div>
            <div className="medal-details">{m.details}</div>
          </div>
        );
        return m.href ? (
          <a
            key={i}
            href={m.href}
            target="_blank"
            rel="noreferrer noopener"
            style={{ textDecoration: 'none' }}
          >
            {card}
          </a>
        ) : (
          <div key={i}>{card}</div>
        );
      })}
    </div>
  );
}

export function CoachingBody() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="reveal" ref={ref}>
      {COACHING.map((c) => (
        <div className="coaching-item" key={c.org}>
          <div className="coaching-meta">
            <div className="coaching-org">{c.org}</div>
            <div className="coaching-role">{c.role}</div>
            <div className="coaching-period">{c.period}</div>
          </div>
          <ul className="coaching-points">
            {c.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ProjectsBody() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="projects-grid reveal" ref={ref}>
      {PROJECTS.map((p) => (
        <a key={p.title} href={p.href} className="project-card" style={{ textDecoration: 'none' }}>
          <div className="project-years">{p.years}</div>
          <div className="project-title">{p.title}</div>
          <p className="project-desc">{p.desc}</p>
        </a>
      ))}
    </div>
  );
}

export function SkillsBody() {
  const ref = useReveal<HTMLDivElement>();
  const ref2 = useReveal<HTMLDivElement>();
  return (
    <>
      <div className="skills-wrapper reveal" ref={ref}>
        {SKILL_GROUPS.map((g) => (
          <div key={g.title}>
            <div className="skill-group-title">{g.title}</div>
            {g.skills.map((s) => (
              <span className={'skill-pill level-' + s.level} key={s.name}>
                {s.name}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 60 }} className="reveal" ref={ref2}>
        <div className="section-num" style={{ marginBottom: 20 }}>
          Languages
        </div>
        <div className="lang-grid">
          {LANGUAGES.map((l) => (
            <div className="lang-card" key={l.name}>
              <div className="lang-name">{l.name}</div>
              <div className="lang-level">{l.level}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function ContactBody() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="contact-inner reveal" ref={ref}>
      <div>
        <h3 className="contact-headline">
          Let&apos;s
          <br />
          <span>Work</span>
          <br />
          Together.
        </h3>
        <p className="contact-sub">
          Whether it&apos;s research collaboration, coaching opportunities, or academic partnerships
          — I&apos;m always open to meaningful conversations. Based in Blida, Algeria.
        </p>
      </div>
      <div className="contact-links">
        {CONTACT_LINKS.map((c) => (
          <a
            key={c.label}
            href={c.href}
            className="contact-link"
            {...(c.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            <span className="contact-link-icon">{c.icon}</span>
            <div>
              <div className="contact-link-label">{c.label}</div>
              <div className="contact-link-value">{c.value}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/** The Archivist's vault, shown inside the world panel. */
export function CvVaultBody({ href }: { href: string }) {
  return (
    <div id="cvVault" className="in-panel">
      <div className="vault-inner">
        <div className="vault-e">e</div>
        <div className="vault-kicker">The Archive · deepest room of the cave</div>
        <h2 className="vault-h">The Curriculum Vitae</h2>
        <p className="vault-p">
          Everything on this site, folded into two pages: the degrees, the medals, the coaching
          record and the work. Take a copy with you.
        </p>
        <a className="vault-cta" href={href} download>
          ◈ Download the CV
        </a>
        <div className="vault-note">PDF · placeholder file for now</div>
      </div>
    </div>
  );
}
