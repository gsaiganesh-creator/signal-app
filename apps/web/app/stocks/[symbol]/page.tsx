import type { Metadata } from 'next';
import Link from 'next/link';
import { StockChartWrapper as StockChart } from '@/components/StockChartWrapper';
import { fetchStockDetail } from '@/lib/fetchStockDetail';

export const revalidate = 300; // ISR — refresh every 5 min

// Pre-generate top NSE stocks at build time
export function generateStaticParams() {
  const TOP_NSE = [
    'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','BHARTIARTL',
    'ITC','SBIN','BAJFINANCE','KOTAKBANK','WIPRO','LT','HCLTECH','ASIANPAINT',
    'MARUTI','TATAMOTORS','AXISBANK','SUNPHARMA','TITAN','ONGC','NTPC',
    'POWERGRID','BAJAJFINSV','TECHM','ADANIENT','JSWSTEEL','TATASTEEL',
    'NESTLEIND','DRREDDY','DIVISLAB','CIPLA','EICHERMOT','COALINDIA',
    'BPCL','HINDALCO','GRASIM','ULTRACEMCO','APOLLOHOSP','HDFCLIFE',
  ];
  return TOP_NSE.map(symbol => ({ symbol }));
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const sym  = symbol.toUpperCase();
  const d    = await fetchStockDetail(sym, 'NSE');
  const price = d.price ? `₹${d.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '';
  const rsi   = d.rsi14 ? `RSI 14: ${d.rsi14.toFixed(1)}.` : '';
  const ema   = d.ema20  ? `EMA 20: ₹${d.ema20.toFixed(0)}.` : '';
  const chg   = d.change_pct != null ? ` ${d.change_pct >= 0 ? '+' : ''}${d.change_pct.toFixed(2)}% today.` : '';
  const title       = `${sym} Share Price${price ? ` ${price}` : ''} — NSE Technical Analysis | SIGNAL`;
  const description = `${d.name} (NSE: ${sym}) live price${price ? ` ${price}` : ''}${chg} ${rsi} ${ema} Free ML-powered technical scan. 15-min delayed. Not SEBI advice.`.trim();
  return {
    title,
    description,
    keywords: [`${sym} share price`, `${sym} NSE`, `${sym} RSI`, `${sym} technical analysis`, `${sym} EMA`, `${d.name} stock`],
    openGraph: { title, description, type: 'website', siteName: 'SIGNAL' },
    twitter:   { card: 'summary', title, description },
    alternates: { canonical: `/stocks/${sym}` },
  };
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:700, color, background:bg }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:12, padding:'12px 16px' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:900, color: color ?? 'var(--txt)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const d   = await fetchStockDetail(sym, 'NSE');

  const up     = (d.change_pct ?? 0) >= 0;
  const fmtP   = (n: number | null) => n != null ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
  const fmtPct = (n: number | null) => n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—';

  const bullSignals = d.signals.filter(s => /ABOVE|OVERSOLD/i.test(s)).length;
  const bearSignals = d.signals.filter(s => /BELOW|OVERBOUGHT/i.test(s)).length;
  const scanLabel   = bullSignals > bearSignals ? 'BULLISH' : bearSignals > bullSignals ? 'BEARISH' : 'NEUTRAL';
  const scanColor   = scanLabel === 'BULLISH' ? 'var(--grn)' : scanLabel === 'BEARISH' ? 'var(--red)' : 'var(--ylw)';

  const rsiLabel = d.rsi14 != null
    ? d.rsi14 < 30 ? 'Oversold' : d.rsi14 > 70 ? 'Overbought' : 'Neutral'
    : null;

  return (
    <>
      {/* ── Public top nav ── */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--bdr)', background:'var(--bg)', position:'sticky', top:0, zIndex:50 }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'var(--blu)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff' }}>S</div>
          <span style={{ fontSize:15, fontWeight:900, color:'var(--txt)', letterSpacing:-0.3 }}>SIGNAL</span>
        </Link>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/sign-in" style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center' }}>Sign in</Link>
          <Link href="/sign-in" style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center' }}>Get started free</Link>
        </div>
      </nav>

      <main style={{ maxWidth:800, margin:'0 auto', padding:'28px 16px 60px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:20, display:'flex', gap:6, alignItems:'center' }}>
          <Link href="/" style={{ color:'var(--dim)', textDecoration:'none' }}>Home</Link>
          <span>/</span>
          <Link href="/stocks" style={{ color:'var(--dim)', textDecoration:'none' }}>Stocks</Link>
          <span>/</span>
          <span style={{ color:'var(--txt)' }}>{sym}</span>
        </div>

        {/* ── Hero ── */}
        <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:'24px 24px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'var(--surf2)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'var(--bluL)' }}>{sym.slice(0,3)}</div>
                <div>
                  <h1 style={{ margin:0, fontSize:20, fontWeight:900, letterSpacing:-0.4 }}>{sym}</h1>
                  <div style={{ fontSize:12, color:'var(--dim)', marginTop:1 }}>{d.name !== sym ? d.name : ''} · NSE</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:36, fontWeight:900, letterSpacing:-1, lineHeight:1 }}>
                {d.price != null ? `₹${d.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
              </div>
              {d.change_pct != null && (
                <div style={{ fontSize:15, fontWeight:700, color: up ? 'var(--grn)' : 'var(--red)', marginTop:4 }}>
                  {up ? '▲' : '▼'} {Math.abs(d.change_pct).toFixed(2)}% today
                </div>
              )}
            </div>
          </div>

          {/* Scan badge */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div style={{ padding:'6px 14px', borderRadius:8, background: scanLabel === 'BULLISH' ? 'rgba(0,212,160,0.1)' : scanLabel === 'BEARISH' ? 'rgba(255,59,92,0.1)' : 'rgba(255,184,0,0.1)', border:`1px solid ${scanColor}40` }}>
              <span style={{ fontSize:12, fontWeight:800, color:scanColor }}>ML SCAN: {scanLabel}</span>
              <span style={{ fontSize:11, color:'var(--dim)', marginLeft:8 }}>{bullSignals} bullish · {bearSignals} bearish signals</span>
            </div>
            {d.rsi14 != null && (
              <Chip label={`RSI ${d.rsi14.toFixed(1)} — ${rsiLabel}`}
                color={d.rsi14 < 30 ? 'var(--grn)' : d.rsi14 > 70 ? 'var(--red)' : 'var(--dim)'}
                bg={d.rsi14 < 30 ? 'rgba(0,212,160,0.1)' : d.rsi14 > 70 ? 'rgba(255,59,92,0.1)' : 'var(--surf2)'} />
            )}
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
          <StatBox label="Prev Close" value={fmtP(d.prev_close)} />
          <StatBox label="EMA 20" value={fmtP(d.ema20)} sub={d.price && d.ema20 ? (d.price > d.ema20 ? '▲ above' : '▼ below') : undefined} color={d.price && d.ema20 ? (d.price > d.ema20 ? 'var(--grn)' : 'var(--red)') : undefined} />
          <StatBox label="EMA 50" value={fmtP(d.ema50)} sub={d.price && d.ema50 ? (d.price > d.ema50 ? '▲ above' : '▼ below') : undefined} color={d.price && d.ema50 ? (d.price > d.ema50 ? 'var(--grn)' : 'var(--red)') : undefined} />
          <StatBox label="EMA 200" value={fmtP(d.ema200)} sub={d.price && d.ema200 ? (d.price > d.ema200 ? '▲ above' : '▼ below') : undefined} color={d.price && d.ema200 ? (d.price > d.ema200 ? 'var(--grn)' : 'var(--red)') : undefined} />
          <StatBox label="52W High" value={fmtP(d.high_52w)} sub={d.from_52h != null ? `${fmtPct(d.from_52h)} from high` : undefined} color={d.from_52h != null && d.from_52h > -5 ? 'var(--ylw)' : undefined} />
          <StatBox label="52W Low"  value={fmtP(d.low_52w)} />
        </div>

        {/* ── Signals list ── */}
        {d.signals.length > 0 && (
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Technical Signals</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {d.signals.map((s, i) => {
                const bull = /ABOVE|OVERSOLD/i.test(s);
                const bear = /BELOW|OVERBOUGHT/i.test(s);
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color: bull ? 'var(--grn)' : bear ? 'var(--red)' : 'var(--dim)' }}>
                    <span style={{ width:16, textAlign:'center', flexShrink:0 }}>{bull ? '▲' : bear ? '▼' : '●'}</span>
                    {s}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Candlestick chart ── */}
        <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'14px 16px', marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Price Chart</div>
          <StockChart symbol={sym} exchange="NSE" ema20={d.ema20} ema50={d.ema50} />
        </div>

        {/* ── CTA ── */}
        <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.10),rgba(139,92,246,0.06))', border:'1px solid rgba(23,64,245,0.25)', borderRadius:16, padding:'24px', textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:900, marginBottom:8, letterSpacing:-0.3 }}>Get the full SIGNAL analysis for {sym}</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginBottom:20, lineHeight:1.7 }}>
            Unlock price alerts, portfolio tracking, ML scan across 500+ stocks,<br/>SIP calculator, earnings impact, and more — free to start.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/sign-in" style={{ height:44, padding:'0 28px', borderRadius:10, background:'var(--blu)', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
              Get started free
            </Link>
            <Link href="/sign-in" style={{ height:44, padding:'0 20px', borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:14, fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* Related stocks */}
        <div style={{ marginTop:24 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Explore Other Stocks</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN','WIPRO','LT','BAJFINANCE','KOTAKBANK']
              .filter(s => s !== sym)
              .slice(0, 8)
              .map(s => (
                <Link key={s} href={`/stocks/${s}`}
                  style={{ padding:'6px 12px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', fontSize:12, fontWeight:700, color:'var(--txt)', textDecoration:'none' }}>
                  {s}
                </Link>
              ))}
          </div>
        </div>

        <div style={{ fontSize:11, color:'var(--dim2)', textAlign:'center', marginTop:24 }}>
          Prices 15-min delayed · Yahoo Finance · Not SEBI registered · Not investment advice · DYOR
        </div>
      </main>
    </>
  );
}
