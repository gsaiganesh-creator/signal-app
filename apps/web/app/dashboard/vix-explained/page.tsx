'use client';
import Link from 'next/link';
import { VixExplainer } from '@/components/VixExplainer';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt)', marginBottom: 10, letterSpacing: -0.2 }}>{title}</h2>
    <div style={{ fontSize: 13.5, color: 'var(--dim)', lineHeight: 1.8 }}>{children}</div>
  </section>
);

export default function VixExplainedPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--dim)', textDecoration: 'none', marginBottom: 20 }}>
        ← Back to Dashboard
      </Link>

      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>😨 Understanding India VIX</div>
      <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 24 }}>
        The market&apos;s &ldquo;fear gauge&rdquo; — and how it actually drives trading decisions.
      </div>

      <div style={{ marginBottom: 32 }}>
        <VixExplainer showLearnMore={false} />
      </div>

      <Section title="What is VIX?">
        India VIX measures the market&apos;s expectation of Nifty volatility over the next 30 days, calculated
        from Nifty options prices (how much traders are willing to pay for protection against big moves).
        It doesn&apos;t predict direction — a high VIX means the market expects <em>big moves</em>, not
        necessarily a crash. But in practice, VIX spikes almost always coincide with fear and selling,
        because uncertainty and panic go together.
      </Section>

      <Section title="Why it matters for position sizing">
        A trade that makes sense when the market is calm can be far riskier when volatility spikes — the
        same stop-loss distance that felt comfortable at VIX 14 can get hit by ordinary noise at VIX 26.
        That&apos;s why serious trading systems size positions (or pause entirely) based on the current VIX
        level, not just the individual stock&apos;s own chart.
      </Section>

      <Section title="The 4 zones — and what they actually do">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Too Calm', range: 'VIX < 12', color: 'var(--dim)', body: 'Volatility is unusually low — the market is pricing in almost no risk. Counterintuitively, this can precede sharp moves once complacency breaks. New buy signals are held back since expected moves are too small to trade profitably after costs.' },
            { label: 'Normal', range: 'VIX 12–20', color: 'var(--grn)', body: 'Typical market conditions. Full position sizing applies — this is the baseline the whole strategy is calibrated around.' },
            { label: 'Elevated', range: 'VIX 20–25', color: 'var(--ylw)', body: 'Fear is rising — bigger daily swings, wider stop-losses needed. Position size is cut in half to keep risk-per-trade roughly constant even though the market is moving more.' },
            { label: 'Panic', range: 'VIX > 25', color: 'var(--red)', body: 'Historically associated with sharp selloffs, crisis periods, or major macro shocks. New buy signals are paused entirely — trying to catch a falling knife in this regime has a poor track record, better to wait for volatility to cool.' },
          ].map(z => (
            <div key={z.label} style={{ background: 'var(--surf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${z.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: z.color }}>{z.label}</span>
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>{z.range}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.7 }}>{z.body}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Where this shows up on SignalGenie">
        The India VIX pill on your dashboard shows the live level and current zone at a glance. These are
        the same thresholds used internally by the momentum-scanning logic to decide position sizing — this
        page exists so you can see the actual reasoning, not just the number.
      </Section>

      <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 8 }}>
        ⚠️ Not SEBI registered · Not investment advice · Educational content only · DYOR
      </div>
    </div>
  );
}
