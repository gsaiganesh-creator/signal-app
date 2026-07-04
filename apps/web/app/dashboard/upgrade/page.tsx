'use client';
import { useState, useEffect } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';
import { usePlan } from '@/lib/use-plan';

// Razorpay window type
declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open(): void };
  }
}
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string; description: string;
  order_id: string; prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler(resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): void;
}

const PLANS = [
  {
    id: 'free', name: 'Free', monthly: 0, annual: 0, color: 'var(--dim)', border: 'var(--bdr)',
    features: ['5 signals / day','1 portfolio','Basic charts','Community access','ETF & MF guide'],
    cta: 'Current Plan', isFree: true,
  },
  {
    id: 'starter', name: 'Starter', monthly: 299, annual: 239, color: 'var(--bluL)', border: 'rgba(23,64,245,0.4)',
    features: ['25 signals / day','3 portfolios','ML signal classification','Algo Builder (5 strategies)','Paper trading'],
    cta: 'Upgrade to Starter', isFree: false,
  },
  {
    id: 'pro', name: 'Pro', monthly: 799, annual: 639, color: 'var(--org)', border: 'rgba(255,92,26,0.5)',
    badge: 'MOST POPULAR',
    features: ['Unlimited signals','10 portfolios','Priority signals','Backtest engine','1 broker connect','Earnings ML predictions','Sector heatmap + FII/DII'],
    cta: 'Upgrade to Pro', isFree: false,
  },
  {
    id: 'elite', name: 'Elite', monthly: 1999, annual: 1599, color: 'var(--ylw)', border: 'rgba(255,184,0,0.5)',
    features: ['Everything in Pro','Unlimited broker connects','API access (500 req/day)','Dedicated support','White-glove onboarding','Early feature access'],
    cta: 'Upgrade to Elite', isFree: false,
  },
];

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const COMPARISON: { category: string; rows: { label: string; free: string; starter: string; pro: string; elite: string }[] }[] = [
  {
    category: 'Signals & Scan',
    rows: [
      { label: 'Daily ML scan results',   free: '5',            starter: '25',          pro: 'Unlimited',     elite: 'Unlimited'     },
      { label: 'ML signal classification', free: '—',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Watchlist',               free: '5 stocks',     starter: '20 stocks',   pro: 'Unlimited',     elite: 'Unlimited'     },
      { label: 'Price alerts',            free: '3 alerts',     starter: '10 alerts',   pro: 'Unlimited',     elite: 'Unlimited'     },
    ],
  },
  {
    category: 'Portfolio',
    rows: [
      { label: 'India portfolios',        free: '1',            starter: '2',           pro: '10',            elite: 'Unlimited'     },
      { label: 'US multi-portfolio',      free: '—',            starter: '1',           pro: '✓ Multi',       elite: '✓ Multi'       },
      { label: 'MF tracker',              free: '3 funds',      starter: '10 funds',    pro: 'Unlimited',     elite: 'Unlimited'     },
      { label: 'ETF tracker',             free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Portfolio performance chart', free: '✓',        starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'ESPP & RSU tracker',      free: '—',            starter: '—',           pro: '✓',             elite: '✓'             },
    ],
  },
  {
    category: 'Markets & Analytics',
    rows: [
      { label: 'Candlestick charts',      free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Sector heatmap',          free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'FII / DII flows',         free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Forex tracker',           free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Commodities tracker',     free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Track record (accuracy)', free: '—',            starter: '✓',           pro: '✓',             elite: '✓'             },
    ],
  },
  {
    category: 'Tools',
    rows: [
      { label: 'SIP Calculator',          free: '✓',            starter: '✓',           pro: '✓',             elite: '✓'             },
      { label: 'Paper trading',           free: 'Limited',      starter: '✓ Full',      pro: '✓ Full',        elite: '✓ Full'        },
      { label: 'Algo builder',            free: '—',            starter: '—',           pro: '✓',             elite: '✓'             },
      { label: 'Backtest engine',         free: '—',            starter: '—',           pro: '✓',             elite: '✓'             },
    ],
  },
  {
    category: 'Account',
    rows: [
      { label: 'Broker connect',          free: '—',            starter: '—',           pro: '1 broker',      elite: 'Unlimited'     },
      { label: 'API access',              free: '—',            starter: '—',           pro: '—',             elite: '500 req/day'   },
      { label: 'Priority support',        free: '—',            starter: 'Email',       pro: 'Email + Chat',  elite: 'Dedicated'     },
    ],
  },
];

const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from Account settings — no questions asked. You keep access till the billing period ends.' },
  { q: 'Is this SEBI registered?', a: 'No. SignalGenie is a technical analysis and screener tool, not a SEBI Research Analyst. All outputs are "scan results", not investment advice. We are working toward RA registration — until then, use your own judgment.' },
  { q: 'What payment methods are accepted?', a: 'UPI, Net Banking, Credit/Debit cards, Wallets via Razorpay. All INR payments.' },
  { q: 'Do you offer a free trial?', a: 'The Free tier is unlimited in time — no credit card required. Upgrade when you need more signals or tools.' },
  { q: 'What is the Referral discount?', a: 'Refer a friend and you both get 15% off your first paid month. Referral link is in Account → Refer & Earn.' },
  { q: 'Are prices inclusive of GST?', a: 'No. 18% GST is added at checkout. GST invoice available on request.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, overflow:'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', color:'var(--txt)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        {q}
        <span style={{ fontSize:16, color:'var(--dim)', flexShrink:0, marginLeft:12, transition:'transform 0.2s', display:'inline-block', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && <div style={{ padding:'0 18px 14px', fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>{a}</div>}
    </div>
  );
}

export default function UpgradePage() {
  const { user, session } = usePortfolio();
  const { plan: currentPlan, isFounder } = usePlan();
  const [billing,      setBilling]      = useState<'monthly'|'annual'>('monthly');
  const [loading,      setLoading]      = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [error,        setError]        = useState('');
  const [welcomeDisc,  setWelcomeDisc]  = useState(0);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch('/api/referral', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.ok ? r.json() as Promise<{ welcome_discount: number }> : null)
      .then(d => { if (d?.welcome_discount) setWelcomeDisc(d.welcome_discount); })
      .catch(() => {});
  }, [session?.access_token]);

  async function handleUpgrade(plan: typeof PLANS[number]) {
    if (plan.isFree || !user) return;
    setLoading(plan.id); setError('');

    try {
      // 1. Create Razorpay order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, billing, user_token: session?.access_token }),
      });
      const order = await orderRes.json() as {
        order_id: string; amount: number; currency: string; key_id: string;
        welcome_disc_pct?: number; original_amount?: number; error?: string;
      };

      if (order.error || !order.order_id) {
        setError(order.error ?? 'Failed to create order. Check Razorpay config.');
        setLoading(null); return;
      }

      // 2. Load Razorpay script
      const ok = await loadRazorpay();
      if (!ok) { setError('Could not load payment gateway. Check internet.'); setLoading(null); return; }

      // 3. Open Razorpay checkout
      const rz = new window.Razorpay({
        key:         order.key_id,
        amount:      order.amount,
        currency:    order.currency,
        name:        'SignalGenie',
        description: `${plan.name} — ${billing === 'annual' ? 'Annual' : 'Monthly'} subscription`,
        order_id:    order.order_id,
        prefill:     { email: user.email ?? '' },
        theme:       { color: '#1740F5' },
        handler: async (resp) => {
          // 4. Verify payment server-side
          const verRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id:   resp.razorpay_order_id,
              payment_id: resp.razorpay_payment_id,
              signature:  resp.razorpay_signature,
              plan:       plan.id,
              billing,
              user_token: session?.access_token,
            }),
          });
          const verify = await verRes.json() as { verified: boolean; plan?: string; expires?: string };
          if (verify.verified) {
            setSuccess(`🎉 ${plan.name} activated! Your subscription is live.`);
          } else {
            setError('Payment received but verification failed. Contact support.');
          }
          setLoading(null);
        },
      });
      rz.open();
      setLoading(null);

    } catch (e) {
      setError(String(e));
      setLoading(null);
    }
  }

  const annualSavingPct = 20;

  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(255,92,26,0.07),rgba(255,184,0,0.04))', border:'1px solid rgba(255,92,26,0.2)', borderRadius:20, padding:'clamp(20px,4vw,36px) clamp(16px,4vw,40px)', marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--org)', textTransform:'uppercase', marginBottom:10 }}>Upgrade Plan</div>
        <div style={{ fontSize:'clamp(22px,3vw,32px)', fontWeight:900, letterSpacing:-0.8, lineHeight:1.2, marginBottom:10 }}>
          More signals.<br/><span style={{ color:'var(--org)' }}>Sharper edge.</span>
        </div>
        <p style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, maxWidth:480, margin:0 }}>
          Unlock unlimited ML signals, backtest engine, broker connect, and earnings predictions. Cancel anytime.
        </p>
      </div>

      {/* Billing toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:28 }}>
        <span style={{ fontSize:13, fontWeight:600, color: billing==='monthly' ? 'var(--txt)' : 'var(--dim)' }}>Monthly</span>
        <button onClick={() => setBilling(b => b==='monthly' ? 'annual' : 'monthly')}
          style={{ width:52, height:28, borderRadius:14, border:'none', cursor:'pointer', position:'relative', background: billing==='annual' ? 'var(--grn)' : 'var(--bdr)', transition:'background 0.2s', padding:0 }}>
          <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:4, transition:'left 0.2s', left: billing==='annual' ? 28 : 4 }}/>
        </button>
        <span style={{ fontSize:13, fontWeight:600, color: billing==='annual' ? 'var(--txt)' : 'var(--dim)' }}>
          Annual <span style={{ fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:6, background:'rgba(0,212,160,0.15)', color:'var(--grn)', marginLeft:4 }}>Save {annualSavingPct}%</span>
        </span>
      </div>

      {success && (
        <div style={{ background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.3)', borderRadius:12, padding:'14px 20px', marginBottom:20, fontSize:14, fontWeight:700, color:'var(--grn)' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.3)', borderRadius:12, padding:'14px 20px', marginBottom:20, fontSize:13, color:'var(--red)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Welcome discount banner — shown to referred users */}
      {welcomeDisc > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.1),rgba(23,64,245,0.07))', border:'1px solid rgba(0,212,160,0.35)', borderRadius:14, padding:'16px 22px', marginBottom:22, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:28, flexShrink:0 }}>🎁</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:3 }}>You have a <span style={{ color:'var(--grn)' }}>{welcomeDisc}% welcome discount!</span></div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>
              A friend invited you to SignalGenie — your first subscription is {welcomeDisc}% off. Applied automatically at checkout. One-time use.
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:28 }}>
        {PLANS.map(p => {
          const price = billing === 'annual' ? p.annual : p.monthly;
          const isLoading = loading === p.id;
          return (
            <div key={p.id} style={{ background:'var(--card-bg)', border:`2px solid ${p.id === currentPlan ? p.border : 'badge' in p && p.badge ? p.border : 'var(--bdr)'}`, borderRadius:18, padding:'22px 20px', position:'relative', display:'flex', flexDirection:'column', boxShadow: p.id === currentPlan ? `0 0 0 3px ${p.border}` : 'none' }}>
              {p.id === currentPlan && (
                <div style={{ position:'absolute', top:-1, right:12, fontSize:9, fontWeight:800, padding:'3px 10px', borderRadius:'0 0 8px 8px', background:p.color, color: p.id === 'elite' ? '#000' : '#fff', whiteSpace:'nowrap', letterSpacing:0.5 }}>YOUR PLAN</div>
              )}
              {'badge' in p && p.badge && p.id !== currentPlan && (
                <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:'0 0 8px 8px', background:p.color, color:'#000', whiteSpace:'nowrap' }}>{p.badge}</div>
              )}
              <div style={{ fontSize:12, fontWeight:800, color:p.color, marginBottom:4, marginTop: ('badge' in p && p.badge) || p.id === currentPlan ? 12 : 0, textTransform:'uppercase', letterSpacing:0.5 }}>{p.name}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:4 }}>
                <span style={{ fontSize:28, fontWeight:900 }}>{price === 0 ? '₹0' : `₹${price.toLocaleString('en-IN')}`}</span>
                {price > 0 && <span style={{ fontSize:12, color:'var(--dim)' }}>/mo</span>}
              </div>
              {billing === 'annual' && price > 0 && (
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:12 }}>
                  ₹{(price * 12).toLocaleString('en-IN')}/year · <span style={{ color:'var(--grn)' }}>save ₹{((p.monthly - p.annual) * 12).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(billing === 'monthly' || price === 0) && <div style={{ marginBottom:12 }}/>}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7, marginBottom:20 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>
                    <span style={{ color: p.isFree ? 'var(--dim)' : 'var(--grn)', flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleUpgrade(p)}
                disabled={p.isFree || isLoading}
                style={{
                  width:'100%', height:42, borderRadius:10,
                  background: p.isFree ? 'var(--surf2)' : p.color,
                  border: p.isFree ? '1px solid var(--bdr)' : 'none',
                  color: p.isFree ? 'var(--dim)' : (p.id === 'elite' ? '#000' : '#fff'),
                  fontSize:13, fontWeight:700, cursor: p.isFree ? 'default' : 'pointer',
                  fontFamily:'inherit', opacity: isLoading ? 0.7 : 1,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                {isLoading ? (
                  <><span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid currentColor', borderTopColor:'transparent', display:'inline-block', animation:'spin 0.8s linear infinite' }}/> Processing…</>
                ) : p.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Razorpay setup notice — founders only */}
      {isFounder && (
        <div style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--ylw)', marginBottom:6 }}>🔧 Razorpay setup required</div>
          <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.7 }}>
            To enable payments, add these to Vercel environment variables:<br/>
            <code style={{ color:'var(--grn)', background:'rgba(0,0,0,0.2)', padding:'2px 6px', borderRadius:4, fontSize:11 }}>RAZORPAY_KEY_ID</code> and{' '}
            <code style={{ color:'var(--grn)', background:'rgba(0,0,0,0.2)', padding:'2px 6px', borderRadius:4, fontSize:11 }}>RAZORPAY_KEY_SECRET</code>
            {' '}from <strong>razorpay.com → Settings → API Keys</strong>. Use test keys (rzp_test_…) for sandbox.
          </div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>
            Also run in Supabase SQL editor:{' '}
            <code style={{ color:'var(--grn)', background:'rgba(0,0,0,0.2)', padding:'2px 6px', borderRadius:4, fontSize:11 }}>
              ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT &apos;free&apos;, ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS plan_billing TEXT, ADD COLUMN IF NOT EXISTS plan_payment_id TEXT;
            </code>
          </div>
        </div>
      )}

      {/* Trust row */}
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center', marginBottom:16 }}>
        {['🔒 Secure payments via Razorpay','📄 GST invoice on request','↩️ Cancel anytime','🎁 Referral discounts stack','📞 Support: support@signalgenie.ai'].map(t => (
          <span key={t} style={{ fontSize:12, color:'var(--dim)' }}>{t}</span>
        ))}
      </div>

      {/* Feature comparison table */}
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, overflow:'hidden', marginBottom:28 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bdr)', fontSize:15, fontWeight:800 }}>Full Feature Comparison</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:520 }}>
            <thead>
              <tr style={{ background:'var(--surf2)' }}>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--dim)', width:'35%' }}>Feature</th>
                {(['Free','Starter','Pro','Elite'] as const).map((name, i) => {
                  const colors = ['var(--dim)','var(--bluL)','var(--org)','var(--ylw)'];
                  const isCurrent = (['free','starter','pro','elite'] as const)[i] === currentPlan;
                  return (
                    <th key={name} style={{ padding:'10px 8px', textAlign:'center', fontSize:11, fontWeight:800, color:colors[i], background: isCurrent ? 'rgba(23,64,245,0.06)' : 'transparent' }}>
                      {name}{isCurrent && <span style={{ display:'block', fontSize:8, color:'var(--grn)', letterSpacing:0.5 }}>YOUR PLAN</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(section => (
                <>
                  <tr key={section.category}>
                    <td colSpan={5} style={{ padding:'10px 16px 6px', fontSize:10, fontWeight:800, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, background:'rgba(255,255,255,0.02)', borderTop:'1px solid var(--bdr)' }}>
                      {section.category}
                    </td>
                  </tr>
                  {section.rows.map((row, ri) => (
                    <tr key={row.label} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding:'9px 16px', fontSize:12, color:'var(--dim)', borderBottom:'1px solid rgba(28,46,74,0.3)' }}>{row.label}</td>
                      {([row.free, row.starter, row.pro, row.elite] as const).map((val, ci) => {
                        const isCurrent = ci === ['free','starter','pro','elite'].indexOf(currentPlan ?? 'free');
                        const isCheck = val === '✓';
                        const isDash  = val === '—';
                        return (
                          <td key={ci} style={{ padding:'9px 8px', textAlign:'center', fontSize:11, fontWeight: isCheck || isDash ? 700 : 600, color: isDash ? 'var(--dim2)' : isCheck ? 'var(--grn)' : 'var(--txt)', borderBottom:'1px solid rgba(28,46,74,0.3)', background: isCurrent ? 'rgba(23,64,245,0.04)' : 'transparent' }}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:15, fontWeight:800, marginBottom:16 }}>Frequently Asked Questions</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {FAQS.map(faq => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', textAlign:'center' }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Subscriptions are for platform access only · Not investment advice · DYOR
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
