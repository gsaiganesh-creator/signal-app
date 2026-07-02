import { PublicNav } from '@/components/PublicNav';

const STATS = [
  { val: '71.4%', color: 'var(--grn)',  label: 'Signal accuracy', sub: '90-day public track record' },
  { val: '142',   color: 'var(--txt)',  label: 'Signals fired',   sub: 'All posted publicly before outcome' },
  { val: '15',    color: 'var(--blu)',  label: 'ML parameters',   sub: 'RSI · MACD · EMA · FII/DII · more' },
  { val: '₹199',  color: 'var(--org)', label: 'Starting price',  sub: 'Per month — 10× cheaper than Telegram' },
];

const VALUES = [
  { icon: '📊', title: 'Radical transparency',  color: 'var(--blu)',  desc: "Every signal posted before outcome. Every week's accuracy published — wins and losses." },
  { icon: '🤖', title: 'Data over opinion',     color: 'var(--pur)',  desc: 'No human calls. No gut feel. Every signal from the same quantitative model, every time.' },
  { icon: '💰', title: 'Accessible pricing',    color: 'var(--grn)',  desc: "₹199/month. Not ₹5,000. Great tools shouldn't be reserved for deep-pocket traders." },
  { icon: '🛡️', title: 'User-first data',       color: 'var(--bluL)', desc: 'Your portfolio belongs to you. Consent-based, revokable anytime. We never see broker passwords.' },
  { icon: '⚠️', title: 'Honest about limits',   color: 'var(--ylw)',  desc: 'We are NOT SEBI registered — and we say it everywhere. No ML model is perfect. Trade carefully.' },
  { icon: '🇮🇳', title: 'Built for India first', color: 'var(--org)',  desc: 'Delivery %, FII/DII, NSE circuit limits — India-specific data global algo platforms ignore.' },
];

const TIMELINE = [
  { dot: 'var(--dim)',  date: '2023 — The frustration',          title: '₹54,000/yr on Telegram calls',       desc: '6 months · 52% accuracy · zero published track record. Started building own ML model on weekends.' },
  { dot: 'var(--org)',  date: 'Jan 2024 — First model',          title: 'Random Forest v1 — 61% accuracy',    desc: 'Trained on 3Y NSE data · 8 indicators · First signal posted publicly on Twitter.' },
  { dot: 'var(--blu)',  date: 'Jul 2024 — v2 model',             title: 'Added Delivery % · FII/DII flow',    desc: 'Accuracy improved to 68%. First DMs asking "how do I get your signals?"' },
  { dot: 'var(--grn)',  date: 'Mar 2025 — v3 model',             title: '71.4% accuracy · 15 parameters',    desc: 'Added sentiment, sector momentum. Backtested 5 years. Decided to build a proper product.' },
  { dot: 'var(--pur)',  date: 'Jun 2026 — SignalGenie launches', title: 'Full platform live — free to start', desc: 'Signals, algo builder, paper trading, MF tracking. ₹199/month. Fully public track record.' },
];

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--txt)', fontFamily: 'Inter,system-ui,sans-serif', minHeight: '100vh' }}>

      <PublicNav />

      {/* HERO */}
      <section style={{ padding: '88px 40px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -180, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(23,64,245,0.10) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 99, border: '1px solid rgba(23,64,245,0.3)', background: 'rgba(23,64,245,0.08)', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--bluL)', marginBottom: 20 }}>Our Story</div>
          <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, letterSpacing: -2.5, lineHeight: 1.0, marginBottom: 22 }}>
            Built by a trader,<br /><span style={{ color: 'var(--blu)' }}>for traders</span> who are <span style={{ color: 'var(--org)' }}>done overpaying.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--dim)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>SignalGenie started as a frustration — paying ₹5,000/month to a Telegram channel with zero accountability, zero accuracy data, and zero personalisation. So we built the alternative.</p>
        </div>
      </section>

      {/* BENTO GRID */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px' }}>

        {/* ROW A — Mission (2/3) + vs-Telegram card (1/3) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: 'span 2', background: 'linear-gradient(145deg,rgba(23,64,245,0.08),rgba(139,92,246,0.04))', border: '1px solid rgba(23,64,245,0.22)', borderRadius: 20, padding: 36, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(23,64,245,0.12) 0%,transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: 'var(--org)', marginBottom: 14 }}>Our Mission</div>
              <div style={{ fontSize: 'clamp(17px,2vw,24px)', fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.35, marginBottom: 18 }}>
                &ldquo;Give every Indian trader access to <span style={{ color: 'var(--blu)' }}>institutional-grade</span> ML signals — transparently, affordably, and accountably.&rdquo;
              </div>
              <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.75, marginBottom: 14 }}>The Indian stock market has 10 crore+ retail investors. Most pay for Telegram calls with no track record. SignalGenie changes that — ML-powered signals, public accuracy stats, prices starting at ₹199/month.</p>
              <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.75 }}>Every signal SignalGenie fires is posted publicly on Twitter. Every week&apos;s accuracy is published. Nothing hidden, nothing deleted. That&apos;s the standard we hold ourselves to.</p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(145deg,rgba(255,92,26,0.08),rgba(255,184,0,0.04))', border: '1px solid rgba(255,92,26,0.22)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: 'var(--org)', marginBottom: 14 }}>vs Telegram</div>
              <div style={{ fontSize: 'clamp(52px,6vw,72px)', fontWeight: 900, letterSpacing: -3, color: 'var(--org)', lineHeight: 1, marginBottom: 8 }}>10×</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>Cheaper</div>
              <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.65 }}>Premium Telegram channels charge ₹2,000–₹8,000/month. SignalGenie starts at ₹199 — with a published track record they&apos;ll never show you.</div>
            </div>
            <a href="/dashboard/upgrade" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, background: 'rgba(255,92,26,0.12)', border: '1px solid rgba(255,92,26,0.3)', color: 'var(--org)', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 20 }}>See Pricing →</a>
          </div>
        </div>

        {/* ROW B — 4 stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
          {STATS.map(s => (
            <div key={s.val} style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: '22px 20px' }}>
              <div style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, letterSpacing: -1.5, color: s.color, lineHeight: 1, marginBottom: 8 }}>{s.val}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--dim2)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ROW C — Founders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ background: 'linear-gradient(145deg,rgba(23,64,245,0.07),var(--surf))', border: '1px solid rgba(23,64,245,0.28)', borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(23,64,245,0.14) 0%,transparent 65%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--dim)', marginBottom: 16 }}>Co-Founder</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg,var(--blu),var(--org))', flexShrink: 0 }}>SG</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.4, marginBottom: 3 }}>Sai Ganesh Gella</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bluL)' }}>CEO &amp; Product</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7, marginBottom: 18 }}>
                {[['Product & Strategy','rgba(23,64,245,0.1)','var(--bluL)','rgba(23,64,245,0.25)'],['NSE/BSE Trading','rgba(0,212,160,0.1)','var(--grn)','rgba(0,212,160,0.25)'],['ML Signals','rgba(255,92,26,0.1)','var(--org)','rgba(255,92,26,0.25)']].map(([tag,bg,color,bdr]) => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: bg, color, border: `1px solid ${bdr}` }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <a href="https://twitter.com/signal_in" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', background: '#000', border: '1px solid #333', color: '#fff' }}>𝕏 @signal_in</a>
                <a href="mailto:saiganesh@getsignal.in" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', background: 'rgba(23,64,245,0.1)', border: '1px solid rgba(23,64,245,0.25)', color: 'var(--bluL)' }}>✉ Email</a>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(145deg,rgba(0,212,160,0.06),var(--surf))', border: '1px solid rgba(0,212,160,0.24)', borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,212,160,0.12) 0%,transparent 65%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--dim)', marginBottom: 16 }}>Co-Founder</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg,var(--grn),#00875A)', flexShrink: 0 }}>SK</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.4, marginBottom: 3 }}>Sai Kumar Bethala</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grn)' }}>CTO &amp; Engineering</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7, marginBottom: 18 }}>
                {[['Engineering','rgba(0,212,160,0.1)','var(--grn)','rgba(0,212,160,0.25)'],['Backend & API','rgba(139,92,246,0.1)','var(--pur)','rgba(139,92,246,0.25)'],['Infrastructure','rgba(23,64,245,0.1)','var(--bluL)','rgba(23,64,245,0.25)']].map(([tag,bg,color,bdr]) => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: bg, color, border: `1px solid ${bdr}` }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <a href="https://twitter.com/signal_in" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', background: '#000', border: '1px solid #333', color: '#fff' }}>𝕏 Twitter</a>
                <a href="mailto:saikumar@getsignal.in" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.25)', color: 'var(--grn)' }}>✉ Email</a>
              </div>
            </div>
          </div>
        </div>

        {/* ROW D — Timeline (1/3) + Values 3×2 grid (2/3) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 20, padding: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--grn)', marginBottom: 6 }}>Origin Story</div>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.5, marginBottom: 22 }}>Why we built this</div>
            {TIMELINE.map((item, i) => (
              <div key={item.date} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: item.dot }} />
                  {i < TIMELINE.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: 'var(--bdr)', margin: '5px 0' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', marginBottom: 3, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{item.date}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--bluL)', marginBottom: 6 }}>Our Principles</div>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.5, marginBottom: 14 }}>What we stand for</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {VALUES.map(v => (
                <div key={v.title} style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{v.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, color: v.color }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.65 }}>{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW E — Contact */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { icon: '✉️', label: 'General enquiries',    val: 'hello@getsignal.in',        sub: 'Response within 24 hours',    href: 'mailto:hello@getsignal.in',        color: 'var(--blu)', accent: 'rgba(23,64,245,0.08)',   bdr: 'rgba(23,64,245,0.2)' },
            { icon: '🛟', label: 'Customer support',     val: 'support@getsignal.in',      sub: 'Pro users: WhatsApp support', href: 'mailto:support@getsignal.in',      color: 'var(--grn)', accent: 'rgba(0,212,160,0.07)',   bdr: 'rgba(0,212,160,0.2)' },
            { icon: '🤝', label: 'Partnerships & press', val: 'partnerships@getsignal.in', sub: 'Broker integrations, media',  href: 'mailto:partnerships@getsignal.in', color: 'var(--pur)', accent: 'rgba(139,92,246,0.07)', bdr: 'rgba(139,92,246,0.2)' },
          ].map(c => (
            <div key={c.label} style={{ background: c.accent, border: `1px solid ${c.bdr}`, borderRadius: 16, padding: '24px 20px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
              <a href={c.href} style={{ fontSize: 13, fontWeight: 700, color: c.color, textDecoration: 'none' }}>{c.val}</a>
              <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 5 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ROW F — CTA */}
        <div style={{ background: 'linear-gradient(135deg,rgba(23,64,245,0.10),rgba(0,212,160,0.05))', border: '1px solid rgba(23,64,245,0.22)', borderRadius: 20, padding: '44px 48px', textAlign: 'center' as const, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(23,64,245,0.08) 0%,transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: -1, marginBottom: 10 }}>Ready to trade smarter?</h2>
            <p style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 28, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>Join traders who use data and accountability over expensive, unverified Telegram calls.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 20 }}>
              <a href="/auth" style={{ display: 'inline-flex', alignItems: 'center', height: 50, padding: '0 30px', borderRadius: 13, background: 'linear-gradient(135deg,var(--blu),var(--bluL))', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(23,64,245,0.35)' }}>Start Free — No Card Needed →</a>
              <a href="/track-record" style={{ display: 'inline-flex', alignItems: 'center', height: 50, padding: '0 26px', borderRadius: 13, background: 'transparent', border: '1px solid var(--bdr)', color: 'var(--txt)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>View Track Record</a>
              <a href="https://twitter.com/signal_in" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 50, padding: '0 22px', borderRadius: 13, background: '#000', border: '1px solid #333', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>𝕏 @signal_in</a>
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim2)' }}>Built by Sai Ganesh Gella &amp; Sai Kumar Bethala &nbsp;·&nbsp; ⚠️ NOT SEBI registered · Not financial advice · Trade at your own risk</div>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .ab-row-a  > *:first-child { grid-column: span 1 !important; }
          .ab-row-a, .ab-row-c, .ab-row-d, .ab-row-e { grid-template-columns: 1fr !important; }
          .ab-row-b  { grid-template-columns: repeat(2,1fr) !important; }
          .ab-vals   { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .ab-row-b  { grid-template-columns: 1fr 1fr !important; }
          .ab-vals   { grid-template-columns: 1fr !important; }
        }
      `}</style>

    </div>
  );
}
