'use client';
import Link from 'next/link';
import { DxyExplainer } from '@/components/DxyExplainer';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt)', marginBottom: 10, letterSpacing: -0.2 }}>{title}</h2>
    <div style={{ fontSize: 13.5, color: 'var(--dim)', lineHeight: 1.8 }}>{children}</div>
  </section>
);

export default function DxyExplainedPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--dim)', textDecoration: 'none', marginBottom: 20 }}>
        ← Back to Dashboard
      </Link>

      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>💵 Understanding the DXY</div>
      <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 24 }}>
        The US Dollar Index — and why a rising dollar is a headwind for Indian stocks.
      </div>

      <div style={{ marginBottom: 32 }}>
        <DxyExplainer showLearnMore={false} />
      </div>

      <Section title="What is DXY?">
        The US Dollar Index (ticker <code>DX-Y.NYB</code>) measures the US dollar&apos;s strength against a
        basket of six major currencies (Euro, Yen, Pound, Canadian Dollar, Swedish Krona, Swiss Franc). It
        doesn&apos;t directly include the Indian Rupee, but dollar strength broadly still pressures INR and
        other emerging-market currencies through the same global capital flows.
      </Section>

      <Section title="Why it matters for Indian stocks">
        Foreign Institutional Investors (FIIs) move capital between markets partly based on relative currency
        strength. When the dollar is rising fast, capital tends to flow back toward dollar assets and away
        from emerging markets like India — a real, observable headwind for FII inflows into Nifty stocks,
        independent of how any individual stock&apos;s own chart looks.
      </Section>

      <Section title="How the trend is classified">
        Unlike VIX (which uses fixed level thresholds), DXY strength here is judged by <strong>trend</strong>,
        not absolute level — a 5-day moving average now compared against the 5-day moving average from 3
        trading days ago:
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          {[
            { label: 'Rising', color: 'var(--red)', body: 'Current 5-day MA is more than 0.5% above where it was 3 days ago — the dollar is strengthening quickly. Every Indian stock scan score gets a −1 penalty to reflect the FII headwind, regardless of the stock\'s own technicals.' },
            { label: 'Flat', color: 'var(--dim)', body: 'Less than a 0.5% move either way — no meaningful trend, no penalty applied.' },
            { label: 'Falling', color: 'var(--grn)', body: 'Current 5-day MA is more than 0.5% below 3 days ago — dollar weakening, a tailwind for emerging-market equities. No penalty.' },
          ].map(t => (
            <div key={t.label} style={{ background: 'var(--surf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${t.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.color, marginBottom: 5 }}>{t.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.7 }}>{t.body}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Where this shows up on SignalGenie">
        This pill shows the live DXY level and current trend classification. It uses the exact same logic as
        the mstock-automation trading scanner&apos;s market-pulse check — the same −1 score penalty that gets
        applied to every stock scan when the dollar is rising fast.
      </Section>

      <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 8 }}>
        ⚠️ Not SEBI registered · Not investment advice · Educational content only · DYOR
      </div>
    </div>
  );
}
