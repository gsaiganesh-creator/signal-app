import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SECTORS, SLUG_MAP } from '@/lib/sectors';
import { SectorStocksClient } from './SectorStocksClient';

export const revalidate = 300;

export function generateStaticParams() {
  return SECTORS.map(s => ({ sector: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ sector: string }> }): Promise<Metadata> {
  const { sector } = await params;
  const def = SLUG_MAP[sector];
  if (!def) return { title: 'Sector | SIGNAL' };
  const title = `${def.label} Stocks NSE — Live Prices & Technical Analysis | SIGNAL`;
  return {
    title,
    description: `${def.description} Free ML-powered RSI, EMA scan. ${def.stocks.slice(0,5).join(', ')} and more. 15-min delayed. Not SEBI advice.`,
    keywords: [`${def.label} stocks NSE`, `${def.label} sector India`, ...def.stocks.slice(0,6).map(s => `${s} share price`)],
    openGraph: { title, description: def.description, type: 'website', siteName: 'SIGNAL' },
    alternates: { canonical: `/sectors/${sector}` },
  };
}

export default async function SectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const { sector } = await params;
  const def = SLUG_MAP[sector];
  if (!def) notFound();

  return (
    <>
      {/* Public nav */}
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
        {/* Breadcrumb */}
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16, display:'flex', gap:6 }}>
          <Link href="/" style={{ color:'var(--dim)', textDecoration:'none' }}>Home</Link>
          <span>/</span>
          <Link href="/sectors" style={{ color:'var(--dim)', textDecoration:'none' }}>Sectors</Link>
          <span>/</span>
          <span style={{ color:'var(--txt)' }}>{def.label}</span>
        </div>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:24, fontWeight:900, margin:'0 0 6px', letterSpacing:-0.5 }}>{def.label} Stocks — NSE</h1>
          <p style={{ fontSize:13, color:'var(--dim)', margin:0, lineHeight:1.6 }}>{def.description}</p>
        </div>

        {/* Live stocks table — client component */}
        <SectorStocksClient stocks={def.stocks} sectorLabel={def.label} />

        {/* Other sectors */}
        <div style={{ marginTop:32 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Other Sectors</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {SECTORS.filter(s => s.slug !== sector).map(s => (
              <Link key={s.slug} href={`/sectors/${s.slug}`}
                style={{ padding:'5px 12px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', fontSize:12, fontWeight:700, color:'var(--txt)', textDecoration:'none' }}>
                {s.label}
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
