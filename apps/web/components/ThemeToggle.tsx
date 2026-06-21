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
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--surf2)', border: '1px solid var(--bdr)',
        borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
        color: 'var(--dim)', fontSize: 12, fontWeight: 600,
        fontFamily: 'inherit', transition: 'all 0.2s',
        ...style,
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{isDark ? '☀️' : '🌙'}</span>
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
