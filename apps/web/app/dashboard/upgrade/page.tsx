'use client';
import { useState } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

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

export default function UpgradePage() {
  const { user, session } = usePortfolio();
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError]     = useState('');

  async function handleUpgrade(plan: typeof PLANS[number]) {
    if (plan.isFree || !user) return;
    setLoading(plan.id); setError('');

    try {
      // 1. Create Razorpay order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, billing }),
      });
      const order = await orderRes.json() as {
        order_id: string; amount: number; currency: string; key_id: string; error?: string;
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
        name:        'SIGNAL',
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

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:28 }}>
        {PLANS.map(p => {
          const price = billing === 'annual' ? p.annual : p.monthly;
          const isLoading = loading === p.id;
          return (
            <div key={p.id} style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:`2px solid ${'badge' in p && p.badge ? p.border : 'var(--bdr)'}`, borderRadius:18, padding:'22px 20px', position:'relative', display:'flex', flexDirection:'column' }}>
              {'badge' in p && p.badge && (
                <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:'0 0 8px 8px', background:p.color, color:'#000', whiteSpace:'nowrap' }}>{p.badge}</div>
              )}
              <div style={{ fontSize:12, fontWeight:800, color:p.color, marginBottom:4, marginTop: 'badge' in p && p.badge ? 12 : 0, textTransform:'uppercase', letterSpacing:0.5 }}>{p.name}</div>
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

      {/* Razorpay not configured notice */}
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

      {/* Trust row */}
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center', marginBottom:16 }}>
        {['🔒 Secure payments via Razorpay','📄 GST invoice on request','↩️ Cancel anytime','🎁 Referral discounts stack','📞 Support: signal@gsaiganesh.in'].map(t => (
          <span key={t} style={{ fontSize:12, color:'var(--dim)' }}>{t}</span>
        ))}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', textAlign:'center' }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Subscriptions are for platform access only · Not investment advice · DYOR
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
