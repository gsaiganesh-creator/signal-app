'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
type Ctx = { theme: Theme; toggle: () => void };

const ThemeCtx = createContext<Ctx>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('signal-theme') ?? 'dark') as Theme;
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.add('theme-switching');
    setTimeout(() => document.documentElement.classList.remove('theme-switching'), 400);
    setTheme(next);
    localStorage.setItem('signal-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
