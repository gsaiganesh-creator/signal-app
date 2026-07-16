// SignalGenie brand — single source for the logo icon + wordmark.
// Icon renders the actual exported app icon (public/icons/icon-192.png) —
// not a hand-drawn approximation — so the in-app header always matches
// the real home-screen/App Store icon pixel-for-pixel. Previously this
// was a rough inline SVG guess (faint tinted bg, blue not white stroke,
// extra sparkle dots not present in the real icon) that visibly drifted
// from the shipped icon; dashboard/layout.tsx even had its own separate
// copy of that same wrong SVG, duplicated instead of importing this file.
import Link from 'next/link';

export function BrandIcon({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/icon-192.png" width={size} height={size} alt="SignalGenie"
      style={{ flexShrink: 0, borderRadius: size * 0.22, display: 'block' }} />
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
