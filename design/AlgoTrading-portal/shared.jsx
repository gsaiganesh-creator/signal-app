const { createContext, useContext, useState } = React;

/* ── Palette ──────────────────────────────────────────────── */
const ThemeContext = createContext({ dark: true, toggle: () => {} });

const DARK_T = {
  bg: '#070D1A', surf: '#0E1628', surf2: '#162038', bdr: '#1C2E4A',
  txt: '#FFFFFF', dim: '#7A8BAA', cardGrad: 'linear-gradient(145deg,#0D1E45,#0E1628)',
};
const LIGHT_T = {
  bg: '#F2F6FF', surf: '#FFFFFF', surf2: '#E8EEFF', bdr: '#CDD5F0',
  txt: '#0A1628', dim: '#5A6A8A', cardGrad: 'linear-gradient(145deg,#E8EEFF,#FFFFFF)',
};
const ACC = {
  blu: '#1740F5', bluL: '#4F6FFA', org: '#FF5C1A', orgL: '#FF7D46',
  grn: '#00D4A0', red: '#FF3B5C', ylw: '#FFB800', pur: '#8B5CF6',
};

function useTheme() {
  const { dark } = useContext(ThemeContext);
  return { T: dark ? DARK_T : LIGHT_T, dark, ACC };
}

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('signal_theme') !== 'light'; } catch { return true; }
  });
  const toggle = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem('signal_theme', next ? 'dark' : 'light'); } catch {}
    return next;
  });
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

/* Portal ensures the toggle is unaffected by canvas transforms */
function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  return ReactDOM.createPortal(
    <button onClick={toggle} style={{
      position: 'fixed', top: 14, right: 18, zIndex: 99999,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 15px 7px 11px', borderRadius: 22,
      background: dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,20,60,0.08)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,20,60,0.16)'}`,
      color: dark ? '#fff' : '#0A1628', fontSize: 13, fontWeight: 600,
      cursor: 'pointer', backdropFilter: 'blur(12px)',
      boxShadow: '0 2px 18px rgba(0,0,0,0.3)', fontFamily: 'system-ui',
      transition: 'background 0.25s, color 0.25s',
    }}>
      <span style={{ fontSize: 15 }}>{dark ? '☀️' : '🌙'}</span>
      {dark ? 'Light Mode' : 'Dark Mode'}
    </button>,
    document.body
  );
}

function ThemedIOSDevice({ children }) {
  const { dark } = useTheme();
  return <IOSDevice dark={dark}>{children}</IOSDevice>;
}

/* ── Micro components ─────────────────────────────────────── */
function Spark({ data = [], color = ACC.blu, w = 80, h = 28 }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / rng) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tag({ label, color = ACC.grn }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      letterSpacing: 0.3, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {label}
    </span>
  );
}

function PBar({ val, max = 100, color = ACC.grn, h = 5 }) {
  const { T } = useTheme();
  return (
    <div style={{ height: h, borderRadius: h, background: T.bdr, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(val / max) * 100}%`, borderRadius: h, background: color }} />
    </div>
  );
}

Object.assign(window, {
  ThemeContext, DARK_T, LIGHT_T, ACC, useTheme,
  ThemeProvider, ThemeToggle, ThemedIOSDevice,
  Spark, Tag, PBar,
});
