import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

type User = { theme?: string } | null;

function isTheme(value: string | undefined | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function useTheme(user: User) {
  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    if (isTheme(user?.theme)) return user.theme;
    const stored = localStorage.getItem('theme');
    if (isTheme(stored)) return stored;
    return 'system';
  });
  const theme = isTheme(user?.theme) ? user.theme : localTheme;

  useEffect(() => {
    const applyTheme = (nextTheme: Theme) => {
      const root = window.document.documentElement;
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      const effective = nextTheme === 'system' ? (prefersDark ? 'dark' : 'light') : nextTheme;
      if (effective === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };
    applyTheme(theme);
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => { if (theme === 'system') applyTheme('system'); };
    mql.addEventListener('change', listener);
    localStorage.setItem('theme', theme);
    return () => mql.removeEventListener('change', listener);
  }, [theme]);

  return [theme, setLocalTheme] as const;
}
