import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

type User = { theme?: string } | null;

export function useTheme(user: User) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    if (user?.theme === 'light' || user?.theme === 'dark' || user?.theme === 'system') return user.theme as Theme;
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });

  useEffect(() => {
    if (!user?.theme) return;
    if (user.theme === 'light' || user.theme === 'dark' || user.theme === 'system') setTheme(user.theme as Theme);
  }, [user?.theme]);

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

  return [theme, setTheme] as const;
}
