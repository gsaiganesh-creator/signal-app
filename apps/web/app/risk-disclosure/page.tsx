import type { Metadata } from 'next';
import { PublicNav } from '@/components/PublicNav';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Risk Disclosure | SignalGenie',
  description: 'Important risk disclosures for SignalGenie — algorithmic scan results, not SEBI-registered investment advice. Read before using the platform.',
  alternates: { canonical: '/risk-disclosure' },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt)', marginBottom: 12, letterSpacing: -0.3 }}>{title}</h2>
    <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.8 }}>{children}</div>
  </section>
);

export default function RiskDisclosurePage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--txt)', fontFamily: 'Inter,system-ui,sans-serif', minHeight: '100vh' }}>
      <PublicNav />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,59,92,0.12)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: 'var(--red)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            Important Notice
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, marginBottom: 16 }}>Risk Disclosure</h1>
          <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.7 }}>
            Please read this disclosure carefully before using SignalGenie. By accessing or using this platform, you acknowledge that you have read, understood, and agreed to the terms described below.
          </p>
          <p style={{ fontSize: 12, color: 'var(--dim2)', marginTop: 10 }}>Last updated: June 2026</p>
        </div>

        <div style={{ background: 'rgba(255,59,92,0.07)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: 14, padding: '18px 22px', marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>SEBI Registration Status</div>
          <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.7 }}>
            SignalGenie is <strong style={{ color: 'var(--txt)' }}>NOT registered</strong> with the Securities and Exchange Board of India (SEBI) as a Research Analyst, Investment Adviser, or any other regulated intermediary. Nothing on this platform constitutes investment advice, stock recommendations, or financial planning services under SEBI regulations.
          </div>
        </div>

        <Section title="1. Nature of Content">
          <p style={{ marginBottom: 10 }}>
            All content on SignalGenie — including scan results, technical indicator outputs, momentum scores, and algorithmic screener results — is <strong style={{ color: 'var(--txt)' }}>educational and informational only</strong>. It is not a solicitation, recommendation, endorsement, or offer to buy or sell any security.
          </p>
          <p>
            Our algorithmic scans compute technical indicators (RSI, EMA, MACD, Supertrend, Bollinger Bands, etc.) from publicly available market data. The output represents mathematical calculations — not investment advice. The platform labels these as "scan results" and "technical screener outputs," not "buy/sell recommendations."
          </p>
        </Section>

        <Section title="2. No Guarantee of Returns">
          <p style={{ marginBottom: 10 }}>
            Past scan accuracy statistics displayed on SignalGenie (Track Record page) do <strong style={{ color: 'var(--txt)' }}>not guarantee future returns</strong>. Stock markets are inherently unpredictable. Historical scan performance under specific market conditions may not repeat.
          </p>
          <p>
            You may lose part or all of the capital you invest in any stock. Never invest money you cannot afford to lose. SignalGenie is a study and screening tool — not a portfolio manager or asset management service.
          </p>
        </Section>

        <Section title="3. Do Your Own Research (DYOR)">
          <p style={{ marginBottom: 10 }}>
            Any stock identified by SignalGenie&apos;s technical screener requires <strong style={{ color: 'var(--txt)' }}>independent verification</strong> before you act on it. Consider:
          </p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Company fundamentals, earnings, and balance sheet</li>
            <li>Sector and macro-economic conditions</li>
            <li>Your own risk tolerance, investment horizon, and financial situation</li>
            <li>Consulting a SEBI-registered Research Analyst or Investment Adviser</li>
          </ul>
        </Section>

        <Section title="4. Paper Trading">
          <p>
            The Paper Trading feature on SignalGenie simulates trades using virtual capital. <strong style={{ color: 'var(--txt)' }}>No real orders are placed</strong> on any exchange or broker. Paper trading results do not reflect real market execution, slippage, brokerage fees, or liquidity constraints. Paper trading performance is not indicative of live trading performance.
          </p>
        </Section>

        <Section title="5. US Securities Disclosure">
          <p>
            SignalGenie is <strong style={{ color: 'var(--txt)' }}>not registered</strong> with the U.S. Securities and Exchange Commission (SEC) or FINRA. Content related to US-listed stocks is provided for informational and educational purposes only and does not constitute advice regulated under US securities law.
          </p>
        </Section>

        <Section title="6. Forex & Commodity Data">
          <p>
            Forex and commodity prices shown on SignalGenie are sourced from publicly available data (Yahoo Finance futures) and are <strong style={{ color: 'var(--txt)' }}>not official MCX, NSE, or exchange-certified prices</strong>. MCX commodity prices are proxied from COMEX/NYMEX futures with currency conversion — not official MCX settlement prices. Use these for reference only. Do not use them as the basis for derivative or commodity trades.
          </p>
        </Section>

        <Section title="7. Data Accuracy & Delays">
          <p style={{ marginBottom: 10 }}>
            Market data displayed on SignalGenie may be delayed by up to 15 minutes. SignalGenie makes no representation as to the accuracy, completeness, or timeliness of any data. Data is sourced from third-party providers (Yahoo Finance, NSE, Supabase) and may occasionally be incorrect, stale, or unavailable.
          </p>
          <p>
            SignalGenie is not liable for trading losses, missed opportunities, or any other damages arising from reliance on data displayed on the platform.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, SignalGenie, its founders, employees, and affiliates shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of this platform or reliance on any content, scan result, or data displayed herein. Your use of SignalGenie is entirely at your own risk.
          </p>
        </Section>

        <Section title="9. Regulatory Compliance (User Obligation)">
          <p>
            You are responsible for ensuring that your use of SignalGenie complies with all applicable laws and regulations in your jurisdiction, including SEBI regulations, RBI guidelines for forex, and any local tax obligations on securities transactions (STCG/LTCG).
          </p>
        </Section>

        <Section title="10. Changes to This Disclosure">
          <p>
            SignalGenie reserves the right to update this disclosure at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.
          </p>
        </Section>

        {/* Contact */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '22px 24px', marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>Questions?</div>
          <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.7 }}>
            For questions about this risk disclosure or the platform, contact us at{' '}
            <a href="mailto:support@signalgenie.ai" style={{ color: 'var(--bluL)', textDecoration: 'none' }}>support@signalgenie.ai</a>.
          </div>
        </div>

        {/* Back link */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--dim)', textDecoration: 'none' }}>← Back to Dashboard</Link>
          <span style={{ color: 'var(--dim2)', margin: '0 12px' }}>·</span>
          <Link href="/about" style={{ fontSize: 13, color: 'var(--dim)', textDecoration: 'none' }}>About SignalGenie</Link>
        </div>
      </main>
    </div>
  );
}
