'use client';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };

function MarketOverview() {
  return (
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Market Overview</div>
        <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
          <span className="live-dot"/>Live
        </span>
      </div>
      <div className="g2" style={{ display:'grid', gap:8 }}>
        {[
          { name:'NIFTY 50',   val:'24,812', chg:'+112 (+0.45%)', up:true  },
          { name:'SENSEX',     val:'81,540', chg:'+384 (+0.47%)', up:true  },
          { name:'BANK NIFTY', val:'53,240', chg:'-88 (-0.17%)',  up:false },
          { name:'NIFTY IT',   val:'38,120', chg:'+420 (+1.12%)', up:true  },
        ].map(m => (
          <div key={m.name} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'10px 13px' }}>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:2 }}>{m.name}</div>
            <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.5 }}>{m.val}</div>
            <div style={{ fontSize:11, fontWeight:700, marginTop:2, color: m.up ? 'var(--grn)' : 'var(--red)' }}>
              {m.up ? '▲' : '▼'} {m.chg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeEmpty({ name, email }: { name: string; email?: string }) {
  return (
    <>
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,160,0.08)', border:'1px solid rgba(0,212,160,0.25)', borderRadius:30, padding:'6px 14px', marginBottom:20 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--grn)' }}/>
        <span style={{ fontSize:12, color:'var(--grn)', fontWeight:600 }}>Signed in{email ? ` as ${email}` : ''}</span>
      </div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>Welcome to SIGNAL. Upload your portfolio to unlock ML signals and P&L tracking.</div>
      </div>
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:16, padding:'28px 32px', marginBottom:20 }}>
        <div style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>📂 Upload your portfolio to get started</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Add your holdings once — SIGNAL tracks P&L, signals and risk automatically.</div>
        <div className="g3" style={{ display:'grid', gap:16, marginBottom:28 }}>
          {[
            { n:'1', t:'Name your portfolio', d:'e.g. "Zerodha Long Term" or "Swing Trades"' },
            { n:'2', t:'Upload your holdings file', d:'Zerodha, Upstox, Groww, HDFC Sec, Angel One — auto-detected' },
            { n:'3', t:'Get ML signals instantly', d:'Every holding classified: Momentum · Swing · Exit Now' },
          ].map(s => (
            <div key={s.n} style={{ display:'flex', gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--blu)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{s.t}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:2, lineHeight:1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/portfolio"
          style={{ height:42, padding:'0 28px', borderRadius:10, background:'var(--blu)', color:'#fff', fontSize:14, fontWeight:700, display:'inline-flex', alignItems:'center', gap:8 }}>
          📤 Upload Portfolio →
        </Link>
      </div>
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {[
          { icon:'🤖', t:'ML Signals', d:'BUY/SELL/HOLD on every holding. RSI + EMA + ML-classified.' },
          { icon:'📊', t:'Live P&L', d:'Unrealised gains, Momentum/Swing/Exit buckets — updated daily.' },
          { icon:'⚠️', t:'Risk Alerts', d:'Earnings flags, FII/DII impact, sector concentration.' },
        ].map(f => (
          <div key={f.t} style={card}>
            <div style={{ fontSize:22, marginBottom:8 }}>{f.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{f.t}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <MarketOverview />
    </>
  );
}

const BUCKET_COLORS: Record<string, { color: string; bg: string }> = {
  Momentum:   { color:'var(--grn)',  bg:'rgba(0,212,160,0.1)'    },
  Swing:      { color:'var(--blu)',  bg:'rgba(23,64,245,0.1)'    },
  Accumulate: { color:'var(--pur)',  bg:'rgba(139,92,246,0.1)'   },
  Hold:       { color:'var(--txt)', bg:'rgba(255,255,255,0.06)'  },
  Exit:       { color:'var(--red)',  bg:'rgba(255,59,92,0.1)'    },
  Dead:       { color:'var(--dim)',  bg:'rgba(100,100,100,0.08)' },
  Watch:      { color:'var(--ylw)', bg:'rgba(255,184,0,0.08)'   },
};

export default function DashboardPage() {
  const { user, portfolios, holdings, activePortfolio, loading } = usePortfolio();

  const name = (
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Trader'
  );

  // Show skeleton while auth resolves — prevents "Session expired" flicker
  if (loading || !user) {
    return (
      <div style={{ padding:'0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ width:200, height:22, background:'var(--surf2)', borderRadius:6, marginBottom:8 }}/>
            <div style={{ width:140, height:14, background:'var(--surf2)', borderRadius:6 }}/>
          </div>
        </div>
        <div className="g3" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
              <div style={{ width:80, height:11, background:'var(--surf2)', borderRadius:4, marginBottom:12 }}/>
              <div style={{ width:120, height:28, background:'var(--surf2)', borderRadius:6 }}/>
            </div>
          ))}
        </div>
        <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
          <div style={{ width:160, height:14, background:'var(--surf2)', borderRadius:6, marginBottom:20 }}/>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ display:'flex', gap:12, marginBottom:16 }}>
              <div style={{ width:100, height:13, background:'var(--surf2)', borderRadius:4 }}/>
              <div style={{ width:80, height:13, background:'var(--surf2)', borderRadius:4 }}/>
              <div style={{ width:60, height:13, background:'var(--surf2)', borderRadius:4 }}/>
            </div>
          ))}
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>⏳ Loading your portfolio data…</div>
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) return <WelcomeEmpty name={name} email={user.email} />;

  const invested    = holdings.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const fmtL = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(2)}L` : `₹${n.toLocaleString('en-IN', { maximumFractionDigits:0 })}`;

  // ML bucket counts from holdings
  const buckets: Record<string, number> = {};
  holdings.forEach(h => {
    const b = (h as { ml_class?: string }).ml_class ?? 'Watch';
    buckets[b] = (buckets[b] ?? 0) + 1;
  });

  // Top 5 holdings by invested value, descending
  const topHoldings = [...holdings]
    .sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty)
    .slice(0, 5);

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
        <Link href="/dashboard/portfolio"
          style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          📊 View Full P&L →
        </Link>
      </div>

      {/* Key metrics */}
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:20 }}>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>Holdings</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{holdings.length}</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:5 }}>{activePortfolio?.name}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>Total Invested</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{fmtL(invested)}</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:5 }}>cost basis</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>Signal Accuracy (90d)</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1, color:'var(--grn)' }}>71.4%</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:5 }}>50/70 signals hit target</div>
        </div>
      </div>

      {/* Portfolio snapshot */}
      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>{activePortfolio?.name}</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>{holdings.length} holdings · {fmtL(invested)} invested</div>
          </div>
          <Link href="/dashboard/portfolio" style={{ fontSize:12, color:'var(--bluL)', fontWeight:600 }}>
            Full P&L & signals →
          </Link>
        </div>

        {/* ML bucket pills */}
        {Object.keys(buckets).length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
            {Object.entries(buckets)
              .sort((a, b) => b[1] - a[1])
              .map(([b, cnt]) => {
                const bc = BUCKET_COLORS[b] ?? BUCKET_COLORS.Watch;
                return (
                  <span key={b} style={{ padding:'3px 10px', borderRadius:20, background:bc.bg, color:bc.color, fontSize:11, fontWeight:700 }}>
                    {b} · {cnt}
                  </span>
                );
              })}
          </div>
        )}

        {holdings.length === 0 ? (
          <div style={{ color:'var(--dim)', fontSize:13 }}>
            No holdings yet. <Link href="/dashboard/portfolio" style={{ color:'var(--bluL)', fontWeight:600 }}>Upload portfolio →</Link>
          </div>
        ) : (
          <>
            {/* Top 5 table — clean, no chip flood */}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','Invested','ML Class'].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 8px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topHoldings.map(h => {
                  const b = (h as { ml_class?: string }).ml_class ?? 'Watch';
                  const bc = BUCKET_COLORS[b] ?? BUCKET_COLORS.Watch;
                  return (
                    <tr key={h.id}>
                      <td style={{ padding:'9px 8px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>{h.qty} units</div>
                      </td>
                      <td style={{ padding:'9px 8px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13, fontWeight:600 }}>
                        {fmtL(h.avg_price * h.qty)}
                      </td>
                      <td style={{ padding:'9px 8px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                        <span style={{ padding:'2px 8px', borderRadius:5, background:bc.bg, color:bc.color, fontSize:11, fontWeight:700 }}>{b}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {holdings.length > 5 && (
              <div style={{ textAlign:'center', marginTop:12 }}>
                <Link href="/dashboard/portfolio" style={{ fontSize:12, color:'var(--bluL)', fontWeight:600 }}>
                  View all {holdings.length} holdings with live P&L →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <div className="g-side" style={{ display:'grid', gap:16 }}>
        <div>
          <MarketOverview />

          {/* FII/DII */}
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>FII / DII Flow</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>Today · sample</span>
            </div>
            {[
              { label:'FII (Foreign Inst.)', val:'-₹1,240 Cr', valC:'var(--red)', pct:35, barC:'var(--red)' },
              { label:'DII (Domestic Inst.)', val:'+₹2,180 Cr', valC:'var(--grn)', pct:68, barC:'var(--grn)' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ fontWeight:600 }}>{f.label}</span>
                  <span style={{ fontWeight:800, color:f.valC }}>{f.val}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${f.pct}%`, background:f.barC, borderRadius:3 }}/>
                </div>
              </div>
            ))}
            <Link href="/dashboard/fii-dii" style={{ display:'block', marginTop:10, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full FII/DII data →</Link>
          </div>
        </div>

        {/* Right rail */}
        <div>
          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Quick Links</div>
            {[
              { href:'/dashboard/signals',      label:'📈 Live Signals',       sub:'BUY/SELL on 4000+ stocks' },
              { href:'/dashboard/portfolio',    label:'💼 My Portfolio',       sub:'P&L, ML signals, upload' },
              { href:'/dashboard/paper-trading',label:'🧪 Paper Trading',      sub:'Test strategies risk-free' },
              { href:'/dashboard/sectors',      label:'🔥 Sector Heatmap',     sub:'Which sectors are hot' },
              { href:'/dashboard/fii-dii',      label:'🌍 FII / DII Flow',     sub:'Institutional activity' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                style={{ display:'flex', flexDirection:'column', padding:'10px 0', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--txt)' }}>{l.label}</span>
                <span style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>{l.sub}</span>
              </Link>
            ))}
          </div>

          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Sector Performance</div>
            {[
              { name:'IT',      val:'+4.1%', c:'var(--grn)' },
              { name:'Auto',    val:'+2.8%', c:'var(--grn)' },
              { name:'Banking', val:'-0.8%', c:'var(--red)' },
              { name:'Metal',   val:'-2.1%', c:'var(--red)' },
            ].map(s => (
              <div key={s.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(28,46,74,0.3)' }}>
                <span style={{ color:'var(--dim)' }}>{s.name}</span>
                <span style={{ fontWeight:700, color:s.c }}>{s.val}</span>
              </div>
            ))}
            <Link href="/dashboard/sectors" style={{ display:'block', marginTop:10, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full heatmap →</Link>
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Signals for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
