// SignalGenie brand — single source for the logo icon + wordmark.
// Icon: "G" monogram (Genie) with an orange spark in the opening.
import Link from 'next/link';

export function BrandIcon({ size = 24, bg = 0.18 }: { size?: number; bg?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" style={{ flexShrink: 0 }}>
      <rect width="26" height="26" rx="7" fill="#1740F5" opacity={bg} />
      <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="22" cy="4" r="3.6" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.7"/>
      <circle cx="22" cy="0.4" r="0.55" fill="#8B5CF6" opacity="0.8"/>
      <circle cx="25.1" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
      <circle cx="25.1" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
      <circle cx="22" cy="7.6" r="0.55" fill="#8B5CF6" opacity="0.8"/>
      <circle cx="18.9" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
      <circle cx="18.9" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
      <path d="M22 2.2 L22.45 3.55 L23.8 4 L22.45 4.45 L22 5.8 L21.55 4.45 L20.2 4 L21.55 3.55 Z" fill="#FF5C1A"/>
    </svg>
  );
}

// Icon + "SignalGenie" wordmark. Wrap in a link by default (public nav / footer).
export function BrandMark({
  size = 16,
  icon = 24,
  href = '/',
  color = 'var(--txt)',
}: { size?: number; icon?: number; href?: string | null; color?: string }) {
  const inner = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: size, fontWeight: 900, letterSpacing: -0.5, color, textDecoration: 'none' }}>
      <BrandIcon size={icon} />
      SignalGenie
    </span>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}
