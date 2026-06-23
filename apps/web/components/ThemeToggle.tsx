'use client';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surf2)', border: '1px solid var(--bdr)',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 16,
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
