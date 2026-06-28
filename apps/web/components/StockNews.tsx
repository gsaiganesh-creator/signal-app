'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  url: string;
  publisher: string;
  published_at: string | null;
}

function relTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function StockNews({ symbol, exchange = 'NSE' }: { symbol: string; exchange?: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty]    = useState(false);

  useEffect(() => {
    fetch(`/api/stock-news?symbol=${symbol}&exchange=${exchange}`)
      .then(r => r.ok ? r.json() : { news: [] })
      .then(({ news }: { news: NewsItem[] }) => {
        setItems(news ?? []);
        setEmpty(!news?.length);
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false));
  }, [symbol, exchange]);

  if (loading) return (
    <div style={{ padding:'16px 0', fontSize:13, color:'var(--dim)' }}>Loading news…</div>
  );
  if (empty) return (
    <div style={{ padding:'16px 0', fontSize:13, color:'var(--dim)' }}>No recent news found for {symbol}.</div>
  );

  return (
    <div>
      {items.map((n, i) => (
        <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
          style={{ display:'block', textDecoration:'none', color:'inherit',
            padding:'12px 0', borderBottom: i < items.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
          <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4, color:'var(--txt)', marginBottom:5 }}>
            {n.title}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11, color:'var(--dim)' }}>
            <span style={{ fontWeight:700 }}>{n.publisher}</span>
            {n.published_at && <><span>·</span><span>{relTime(n.published_at)}</span></>}
            <span style={{ marginLeft:'auto', color:'var(--bluL)', fontWeight:600 }}>↗</span>
          </div>
        </a>
      ))}
      <div style={{ marginTop:10, fontSize:10, color:'var(--dim2)' }}>
        Via Yahoo Finance · Not investment advice
      </div>
    </div>
  );
}
