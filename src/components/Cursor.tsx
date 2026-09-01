import { useEffect, useRef } from 'react';
import { useFinePointer } from '../hooks/useMediaQuery';

/**
 * An orange ring that trails the pointer. It is decoration only — the real
 * system cursor is never hidden, so you can always see where you are
 * clicking. On touch devices this renders nothing at all.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const fine = useFinePointer();

  useEffect(() => {
    if (!fine) return;
    const el = ref.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      el.style.left = e.clientX + 'px';
      el.style.top = e.clientY + 'px';
    };
    const over = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('a, button, .medal-card, .stat-card, .project-card, .skill-pill, .interest-tag, .lang-card')) {
        el.classList.add('big');
      }
    };
    const out = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('a, button, .medal-card, .stat-card, .project-card, .skill-pill, .interest-tag, .lang-card')) {
        el.classList.remove('big');
      }
    };

    document.addEventListener('mousemove', move);
    /* delegated, so it keeps working for anything React renders later */
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, [fine]);

  if (!fine) return null;
  return <div id="cursor" ref={ref} aria-hidden="true" />;
}
