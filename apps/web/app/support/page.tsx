'use client';

import { useState } from 'react';
import Link from 'next/link';

const SUPPORT_EMAIL = 'support@signalgenie.ai';

/* ── Accordion item ────────────────────────────────────────────────────── */
function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--bdr)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 0', background: 'transparent', border: 'none', color: 'var(--txt)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', gap: 12,
          fontFamily: 'inherit',
        }}
      >
        <span>{q}</span>
        <span style={{ fontSize: 18, color: 'var(--dim)', flexShrink: 0, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 13, color: 'var(--dim)', lineHeight: 1.75 }}>{a}</div>
      )}
    </div>
  );
}

/* ── Section heading ───────────────────────────────────────────────────── */
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{title}</h2>
      </div>
      {sub && <p style={{ fontSize: 13, color: 'var(--dim)', marginLeft: 30 }}>{sub}</p>}
    </div>
  );
}

/* ── Status indicator ──────────────────────────────────────────────────── */
function StatusRow({ label, ok = true }: { label: string; ok?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--bdr)' }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ok ? 'rgba(0,212,160,0.12)' : 'rgba(255,59,92,0.12)', color: ok ? 'var(--grn)' : 'var(--red)', border: `1px solid ${ok ? 'rgba(0,212,160,0.3)' : 'rgba(255,59,92,0.3)'}` }}>
        {ok ? '● Operational' : '● Degraded'}
      </span>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--txt)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid var(--bdr)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: 'var(--dim)', textDecoration: 'none', fontSize: 13 }}>← Back to app</Link>
        <span style={{ color: 'var(--bdr)' }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Support</span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 100px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛟</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5, marginBottom: 10 }}>How can we help?</h1>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 20px' }}>
            Browse guides below or email us directly — we usually reply within 24 hours on business days.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: 'rgba(79,111,250,0.12)', border: '1px solid rgba(79,111,250,0.35)',
              borderRadius: 10, color: 'var(--bluL)', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
          >
            ✉️ {SUPPORT_EMAIL}
          </a>
        </div>

        {/* ── Getting Started ─────────────────────────────────────────── */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: '28px 28px 8px', marginBottom: 28 }}>
          <SectionHead icon="🚀" title="Getting Started" sub="New to SignalGenie? Follow these steps." />

          {[
            { n: '1', title: 'Create an account', body: 'Go to signalgenie.ai and click Sign Up. Use your Google account or email/password. Email verification is sent automatically.' },
            { n: '2', title: 'Add your India portfolio', body: 'Dashboard → Portfolio. Click "+ Add Holdings". Enter stock symbol (e.g. RELIANCE, TCS), exchange (NSE/BSE), quantity, and average buy price. Your P&L and signals update in real time.' },
            { n: '3', title: 'Add US stocks (optional)', body: 'Dashboard → US Portfolio. Same flow — enter NYSE/NASDAQ symbols (e.g. AAPL, MSFT). You can create multiple portfolios per broker account.' },
            { n: '4', title: 'Read ML Technical Scan results', body: 'Dashboard → Signals. The scan shows RSI, EMA, and volume patterns. "Strong Momentum" = bullish technical setup. "Weak/Declining" = bearish technical setup. These are SCAN RESULTS, not buy/sell advice.' },
            { n: '5', title: 'Set up watchlist & price alerts', body: 'Dashboard → Watchlist. Add stocks, then enable push notifications via the bell icon. You\'ll receive an alert when price crosses your set level.' },
            { n: '6', title: 'Explore Forex, Commodities & Sectors', body: 'All available in the More drawer (bottom nav on mobile, left sidebar on desktop). Forex tracks 9 INR pairs. Commodities shows MCX proxy prices for Gold, Silver, Crude, and more.' },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(79,111,250,0.15)', border: '1px solid rgba(79,111,250,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'var(--bluL)', flexShrink: 0, marginTop: 1 }}>
                {step.n}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.65 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── General FAQ ─────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: '28px 28px 8px', marginBottom: 28 }}>
          <SectionHead icon="❓" title="Frequently Asked Questions" />

          <Faq q="Is SignalGenie SEBI registered?"
            a={<>SignalGenie is <strong>not a SEBI Registered Research Analyst</strong>. All scan results are algorithmic technical indicator outputs — RSI, EMA, volume patterns — not investment recommendations. This platform is an educational and analytical tool only. Always consult a SEBI-registered advisor before investing.</>} />

          <Faq q="Where does the price data come from?"
            a="Stock prices are sourced from Yahoo Finance (free, no API key). NSE and BSE data has a ~15-minute delay. US stock data from NYSE/NASDAQ is similarly delayed. Forex and commodity prices are from Yahoo Finance futures tickers." />

          <Faq q="How accurate are the ML scan signals?"
            a="The Track Record page shows historical accuracy of scan results vs actual 30-day and 60-day returns. Accuracy varies by market conditions. Past scan accuracy does not predict future results." />

          <Faq q="What does 'Strong Momentum' vs 'Building' mean?"
            a={<><strong>Strong Momentum</strong>: RSI above 60, price above key EMAs, high volume — strong bullish technical setup. <strong>Building</strong>: RSI 40–60 range, near EMA support — consolidating, could break either way. <strong>Sideways</strong>: low RSI movement, flat price action. <strong>Weak/Declining</strong>: RSI below 40, price below key EMAs — bearish technical reading.</>} />

          <Faq q="Why are prices sometimes showing as 0 or not loading?"
            a="Yahoo Finance occasionally rate-limits requests, especially during high-traffic periods (market open/close). Refresh the page after 30–60 seconds. If the issue persists, email us." />

          <Faq q="How do I reset my password?"
            a="On the login page, click 'Forgot password'. Enter your email — Supabase Auth will send a reset link. Check your spam folder if you don't see it within 2 minutes." />

          <Faq q="How do I delete my account?"
            a={<>Email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--bluL)' }}>{SUPPORT_EMAIL}</a> with subject "Account deletion request" and your registered email. We'll delete your account and all associated data within 7 business days per our Privacy Policy.</>} />
        </div>

        {/* ── Billing FAQ ─────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: '28px 28px 8px', marginBottom: 28 }}>
          <SectionHead icon="💳" title="Plans & Billing" sub="Payments processed securely via Razorpay." />

          <Faq q="How do I upgrade my plan?"
            a={<>Go to Dashboard → Upgrade Plan (in the More drawer or the upgrade prompt). Choose your plan and complete payment via Razorpay. Your plan upgrades instantly after payment verification. Supported methods: UPI, Net Banking, Credit/Debit cards, Wallets.</>} />

          <Faq q="What payment methods are accepted?"
            a="All major Indian payment methods: UPI (Google Pay, PhonePe, Paytm), Net Banking (50+ banks), Credit/Debit cards (Visa, Mastercard, RuPay), and popular wallets. International cards accepted but may require 3D Secure." />

          <Faq q="How do I get a GST invoice?"
            a={<>Email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--bluL)' }}>{SUPPORT_EMAIL}</a> with your registered email and GSTIN. We'll send the invoice within 2 business days.</>} />

          <Faq q="Can I cancel my subscription?"
            a="Yes. Plans are billed monthly or annually. Cancellation takes effect at the end of the current billing period — you keep access until then. Email us to cancel or we'll add a self-serve cancel flow soon." />

          <Faq q="Do you offer refunds?"
            a="If you cancel within 24 hours of upgrading and haven't used any paid features, email us for a full refund. After 24 hours, refunds are considered case-by-case." />

          <Faq q="My payment succeeded but plan didn't upgrade — what do I do?"
            a={<>This is rare but can happen if the webhook is delayed. Wait 5 minutes and refresh. If your plan still shows Free, email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--bluL)' }}>{SUPPORT_EMAIL}</a> with your Razorpay payment ID (from your bank SMS/email) and we'll fix it manually within 2 hours.</>} />
        </div>

        {/* ── System Status ────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '22px 28px 16px' }}>
            <SectionHead icon="📡" title="System Status" sub={`Last checked: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`} />
          </div>
          <StatusRow label="Web App (signalgenie.ai)" ok />
          <StatusRow label="Price Data API (Yahoo Finance)" ok />
          <StatusRow label="Portfolio & Holdings (Supabase)" ok />
          <StatusRow label="ML Technical Scan" ok />
          <StatusRow label="Push Notifications" ok />
          <StatusRow label="Razorpay Payments" ok />
          <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--dim)' }}>
            For real-time outages, email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--bluL)' }}>{SUPPORT_EMAIL}</a>.
          </div>
        </div>

        {/* ── Contact CTA ─────────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,rgba(23,64,245,0.12),rgba(139,92,246,0.08))', border: '1px solid rgba(79,111,250,0.25)', borderRadius: 16, padding: '28px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✉️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Still need help?</h3>
          <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 20, lineHeight: 1.6 }}>
            Can&apos;t find your answer above? Email our team — we reply within 24 hours on business days (Mon–Fri, IST).
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Support request — SignalGenie`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px',
              background: 'var(--bluL)', borderRadius: 10, color: '#fff',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            Email {SUPPORT_EMAIL}
          </a>
          <div style={{ marginTop: 20, fontSize: 12, color: 'var(--dim)' }}>
            <Link href="/privacy" style={{ color: 'var(--dim)', marginRight: 16 }}>Privacy Policy</Link>
            <Link href="/risk-disclosure" style={{ color: 'var(--dim)' }}>Risk Disclosure</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
