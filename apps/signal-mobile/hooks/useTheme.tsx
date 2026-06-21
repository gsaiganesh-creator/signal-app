import React, { createContext, useContext, useState } from 'react';
import { ACC, DARK_T, LIGHT_T, Theme } from '@/constants/theme';

type ThemeCtxType = {
  dark: boolean;
  T: Theme;
  ACC: typeof ACC;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtxType>({
  dark: true,
  T: DARK_T,
  ACC,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true);
  const toggle = () => setDark(d => !d);
  return (
    <ThemeContext.Provider value={{ dark, T: dark ? DARK_T : LIGHT_T, ACC, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
