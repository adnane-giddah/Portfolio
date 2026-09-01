import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/** Mirrors the theme onto <html data-theme>, which is what the CSS reads. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('aam_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* storage unavailable */ }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('aam_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
