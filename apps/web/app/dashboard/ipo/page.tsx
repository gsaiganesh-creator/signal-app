'use client';

import { useEffect, useState } from 'react';
import { StockDetailSheet } from '@/components/StockDetailSheet';

interface IPO {
  company: string;
  symbol?: string;
  open: string;
  close: string;
  allotment?: string;
  listing?: string;
  price_band: string;
  lot_size: number;
  issue_size: string;
  gmp?: string;
  status: 'upcoming' | 'open' | 'allotment' | 'listed' | 'closed';
  type?: 'mainboard' | 'sme';
  sector?: string;
}

// Static seed — update weekly. Reflects June–July 2026 pipeline.
const STATIC_IPOS: IPO[] = [
  { company:'HDB Financial Services', symbol:'HDBFSL', open:'2026-06-30', close:'2026-07-02', allotment:'2026-07-05', listing:'2026-07-08', price_band:'₹500–₹527', lot_size:28, issue_size:'₹12,500 Cr', gmp:'+₹42', status:'upcoming', type:'mainboard', sector:'NBFC' },
  { company:'Ola Electric (FPO)', symbol:'OLAELEC', open:'2026-06-25', close:'2026-06-27', allotment:'2026-06-30', price_band:'₹68–₹72', lot_size:208, issue_size:'₹2,800 Cr', status:'open', type:'mainboard', sector:'EV / Auto' },
  { company:'Indira IVF Hospital', open:'2026-07-07', close:'2026-07-09', price_band:'₹385–₹405', lot_size:37, issue_size:'₹1,200 Cr', gmp:'+₹18', status:'upcoming', type:'mainboard', sector:'Healthcare' },
  { company:'SBI General Insurance', open:'2026-07-14', close:'2026-07-16', price_band:'TBA', lot_size:0, issue_size:'₹5,000 Cr', status:'upcoming', type:'mainboard', sector:'Insurance' },
  { company:'Tata Capital', open:'2026-07-21', close:'2026-07-23', price_band:'TBA', lot_size:0, issue_size:'₹15,000 Cr', status:'upcoming', type:'mainboard', sector:'NBFC' },
];

const STATUS_CONFIG: Record<IPO['status'], { label: string; color: string; bg: string }> = {
  upcoming:   { label:'Upcoming',   color:'var(--bluL)',  bg:'rgba(79,111,250,0.1)' },
  open:       { label:'Open Now',   color:'var(--grn)',   bg:'rgba(0,212,160,0.1)'  },
  allotment:  { label:'Allotment',  color:'var(--ylw)',   bg:'rgba(255,184,0,0.1)'  },
  listed:     { label:'Listed',     color:'var(--dim)',   bg:'var(--surf2)'          },
  closed:     { label:'Closed',     color:'var(--dim2)',  bg:'var(--surf2)'          },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

function daysTo(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

export default function IPOPage() {
  const [ipos, setIpos]       = useState<IPO[]>(STATIC_IPOS);
  const [filter, setFilter]   = useState<'all'|'mainboard'|'sme'>('all');
  const [detailSym, setDetailSym] = useState<{ symbol: string; exchange: string } | null>(null);

  // Try live fetch (falls back silently to static)
  useEffect(() => {
    fetch('/api/ipo').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.ipos?.length) setIpos(data.ipos);
    }).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? ipos : ipos.filter(i => i.type === filter);
  const open     = filtered.filter(i => i.status === 'open');
  const upcoming = filtered.filter(i => i.status === 'upcoming');
  const others   = filtered.filter(i => !['open','upcoming'].includes(i.status));

  function IPOCard({ ipo }: { ipo: IPO }) {
    const sc  = STATUS_CONFIG[ipo.status];
    const days = ipo.status === 'upcoming' ? daysTo(ipo.open) : null;
    return (
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, gap:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'var(--txt)', marginBottom:3 }}>{ipo.company}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {ipo.type && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', fontWeight:600 }}>{ipo.type.toUpperCase()}</span>}
              {ipo.sector && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', fontWeight:600 }}>{ipo.sector}</span>}
            </div>
          </div>
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700, color: sc.color, background: sc.bg, whiteSpace:'nowrap' }}>
            {sc.label}{days != null && days > 0 ? ` · ${days}d` : ''}
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          {[
            { label:'Price Band', value: ipo.price_band },
            { label:'Lot Size',   value: ipo.lot_size > 0 ? `${ipo.lot_size} shares` : 'TBA' },
            { label:'Issue Size', value: ipo.issue_size },
            { label:'GMP',        value: ipo.gmp ?? '—', color: ipo.gmp?.startsWith('+') ? 'var(--grn)' : ipo.gmp?.startsWith('-') ? 'var(--red)' : undefined },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.4, marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color: f.color ?? 'var(--txt)' }}>{f.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--dim)', flexWrap:'wrap' }}>
          <span>Open: <strong style={{ color:'var(--txt)' }}>{fmtDate(ipo.open)}</strong></span>
          <span>Close: <strong style={{ color:'var(--txt)' }}>{fmtDate(ipo.close)}</strong></span>
          {ipo.allotment && <span>Allotment: <strong style={{ color:'var(--txt)' }}>{fmtDate(ipo.allotment)}</strong></span>}
          {ipo.listing && <span>Listing: <strong style={{ color:'var(--grn)' }}>{fmtDate(ipo.listing)}</strong></span>}
        </div>

        {ipo.symbol && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--bdr)22' }}>
            <button
              onClick={() => setDetailSym({ symbol: ipo.symbol!, exchange: 'NSE' })}
              style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:11, fontWeight:700, color:'var(--bluL)', fontFamily:'inherit' }}>
              View technical analysis →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding:'24px 20px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, margin:0, letterSpacing:-0.4 }}>IPO Calendar</h1>
          <p style={{ fontSize:13, color:'var(--dim)', margin:'4px 0 0' }}>Upcoming &amp; open IPOs · GMP is Grey Market Premium (unofficial)</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {(['all','mainboard','sme'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 14px', borderRadius:8, fontSize:11, fontWeight:700, background: filter===f ? 'var(--blu)' : 'var(--surf)', border:`1px solid ${filter===f ? 'var(--blu)' : 'var(--bdr)'}`, color: filter===f ? '#fff' : 'var(--dim)', cursor:'pointer', textTransform:'capitalize' }}>
              {f === 'all' ? 'All' : f === 'mainboard' ? 'Mainboard' : 'SME'}
            </button>
          ))}
        </div>
      </div>

      {open.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--grn)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Open Now</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14, marginBottom:28 }}>
            {open.map(i => <IPOCard key={i.company} ipo={i} />)}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--bluL)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Upcoming</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14, marginBottom:28 }}>
            {upcoming.map(i => <IPOCard key={i.company} ipo={i} />)}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Recent</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14, marginBottom:28 }}>
            {others.map(i => <IPOCard key={i.company} ipo={i} />)}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:40, color:'var(--dim)', fontSize:13 }}>No IPOs in this category right now.</div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', lineHeight:1.7, marginTop:8 }}>
        GMP = Grey Market Premium — unofficial, unlicensed. Not a buy/sell recommendation.
        Subscription data from NSE/BSE. IPO details subject to change. Not SEBI registered · DYOR.
      </div>

      {detailSym && (
        <StockDetailSheet
          symbol={detailSym.symbol}
          exchange={detailSym.exchange}
          onClose={() => setDetailSym(null)}
        />
      )}
    </div>
  );
}
