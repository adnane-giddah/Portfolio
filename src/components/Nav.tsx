import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV_LINKS, PROFILE } from '../data/profile';

const MOBILE_BREAKPOINT = 860;

interface Props {
  onToggleTheme: () => void;
  /** closed from the outside — e.g. when the world overlay opens */
  forceClose?: number;
}

/**
 * Below 860px the links collapse into a real menu instead of shrinking to
 * unreadable 8px text. Closes on link tap, outside tap, Escape, and when
 * the viewport grows back to desktop.
 */
export function Nav({ onToggleTheme, forceClose }: Props) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (forceClose !== undefined) setOpen(false);
  }, [forceClose]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const bar = barRef.current;
      if (bar && !bar.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setOpen(false);
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((o) => !o);
  }, []);

  return (
    <nav ref={barRef} className={open ? 'nav-open' : undefined}>
      <div className="nav-logo">AAM</div>

      <button
        className="nav-burger"
        type="button"
        aria-label={open ? 'Close the menu' : 'Open the menu'}
        aria-expanded={open}
        aria-controls="navLinks"
        onClick={toggle}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="nav-links" id="navLinks">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href={PROFILE.cvHref} className="nav-cv" download onClick={() => setOpen(false)}>
          CV ◈
        </a>
        <button className="theme-toggle" type="button" onClick={onToggleTheme}>
          ☀ / ☾
        </button>
      </div>
    </nav>
  );
}
