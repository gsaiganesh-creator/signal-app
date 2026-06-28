import type { Metadata } from 'next';
import Link from 'next/link';
import { SECTORS } from '@/lib/sectors';

export const metadata: Metadata = {
  title: 'NSE Sector Analysis — Banking, IT, Pharma, Auto & More | SIGNAL',
  description: 'Browse NSE stocks by sector. Live prices, RSI, EMA20/50 technical scan for Banking, IT, Pharma, Auto, FMCG, Metal, Infra and 7 more sectors. Free. 15-min delayed.',
  alternates: { canonical: '/sectors' },
};

const ICONS: Record<string, string> = {
  banking:'🏦', it:'💻', pharma:'💊', auto:'🚗', fmcg:'🛒',
  'oil-gas':'⛽', metal:'⚙️', infra:'🏗️', power:'⚡', nbfc:'💳',
  consumer:'🛍️', cement:'🏢', realty:'🏠', telecom:'📡',
};

export default function SectorsIndexPage() {
  return (
    <>
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

      <main style={{ maxWidth:960, margin:'0 auto', padding:'28px 16px 60px' }}>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16, display:'flex', gap:6 }}>
          <Link href="/" style={{ color:'var(--dim)', textDecoration:'none' }}>Home</Link>
          <span>/</span>
          <span style={{ color:'var(--txt)' }}>Sectors</span>
        </div>

        <h1 style={{ fontSize:24, fontWeight:900, margin:'0 0 6px', letterSpacing:-0.5 }}>NSE Sector Analysis</h1>
        <p style={{ fontSize:13, color:'var(--dim)', margin:'0 0 24px', lineHeight:1.6 }}>
          Browse stocks by sector — live prices, RSI, EMA scan. 14 sectors, 150+ NSE stocks.
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          {SECTORS.map(s => (
            <Link key={s.slug} href={`/sectors/${s.slug}`} style={{ textDecoration:'none' }}>
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px', transition:'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(23,64,245,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bdr)')}>
                <div style={{ fontSize:24, marginBottom:8 }}>{ICONS[s.slug] ?? '📊'}</div>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--txt)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:8 }}>{s.stocks.length} stocks</div>
                <div style={{ fontSize:10, color:'var(--dim2)', lineHeight:1.5 }}>{s.stocks.slice(0,4).join(' · ')}{s.stocks.length > 4 ? ` +${s.stocks.length-4}` : ''}</div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ fontSize:11, color:'var(--dim2)', textAlign:'center', marginTop:32 }}>
          Prices 15-min delayed · Yahoo Finance · Not SEBI registered · Not investment advice · DYOR
        </div>
      </main>
    </>
  );
}
