import { useCallback, useState } from 'react';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => (typeof document === 'undefined' ? 'dark' : readTheme()));

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('sl-theme', next);
    } catch {
      /* depolama kapalıysa tema sadece bu oturumda geçerli */
    }
    setThemeState(next);
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
