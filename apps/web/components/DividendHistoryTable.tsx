'use client';
import { useEffect, useState } from 'react';

interface Payout { date: string; amount: number }

export function DividendHistoryTable({ symbol, exchange, currency }: { symbol: string; exchange: string; currency: 'INR' | 'USD' }) {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    fetch(`/api/dividend-history?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { payouts: Payout[] }) => { if (!cancelled) setPayouts(d.payouts); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, exchange]);

  const fmt = (n: number) => currency === 'INR' ? `₹${n.toFixed(2)}` : `$${n.toFixed(2)}`;

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[1,2,3].map(i => <div key={i} style={{ height:32, background:'var(--surf2)', borderRadius:8 }}/>)}
      </div>
    );
  }

  if (error) {
    return <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center', padding:'16px 0' }}>Could not load dividend history.</div>;
  }

  if (!payouts || payouts.length === 0) {
    return <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center', padding:'16px 0' }}>No dividend history found for this stock.</div>;
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      {payouts.map((p, i) => (
        <div key={`${p.date}-${i}`} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'8px 10px', background: i % 2 === 0 ? 'var(--surf2)' : 'transparent', borderRadius:6 }}>
          <span style={{ fontSize:11, color:'var(--dim)' }}>
            {new Date(p.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--grn)' }}>{fmt(p.amount)}</span>
        </div>
      ))}
    </div>
  );
}
