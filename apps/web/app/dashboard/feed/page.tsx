'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Label = 'bullish' | 'bearish' | 'neutral';

interface SentimentRow {
  symbol: string;
  exchange: string;
  label: Label;
  blurb: string;
  scanned_at: string;
}

interface WatchRow { symbol: string; exchange: string; }
interface AccuracyStats { closed: number; accuracy: number | null; }

const BADGE: Record<Label, { icon: string; text: string; color: string; bg: string; border: string }> = {
  bullish: { icon: '🟢', text: 'Bullish', color: 'var(--grn)', bg: 'rgba(0,212,160,0.1)',  border: 'rgba(0,212,160,0.3)' },
  bearish: { icon: '🔴', text: 'Bearish', color: 'var(--red)', bg: 'rgba(255,59,92,0.1)',  border: 'rgba(255,59,92,0.3)' },
  neutral: { icon: '🟡', text: 'Neutral', color: 'var(--ylw)', bg: 'rgba(255,184,0,0.1)',  border: 'rgba(255,184,0,0.3)' },
};

export default function SentimentFeedPage() {
  const { session, holdings } = usePortfolio();
  const [watchlist, setWatchlist] = useState<WatchRow[]>([]);
  const [sentiment, setSentiment] = useState<Record<string, SentimentRow>>({});
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWatchlist = useCallback(async () => {
    if (!session) return [] as WatchRow[];
    const res = await fetch(
      `${SUPA_URL}/rest/v1/watchlist?user_id=eq.${session.user.id}&select=symbol,exchange`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } },
    );
    return res.ok ? await res.json() as WatchRow[] : [];
  }, [session]);

  useEffect(() => {
    fetch('/api/sentiment-log')
      .then(r => r.ok ? r.json() as Promise<AccuracyStats> : null)
      .then(d => setAccuracy(d))
      .catch(() => setAccuracy(null));
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError('');
    fetchWatchlist().then(async (wl) => {
      setWatchlist(wl);
      const symbols = [...new Set([...holdings.map(h => h.symbol), ...wl.map(w => w.symbol)])];
      if (!symbols.length) { setLoading(false); return; }
      const list = symbols.map(s => `"${s}"`).join(',');
      const res = await fetch(
        `${SUPA_URL}/rest/v1/sentiment_scores?symbol=in.(${list})&select=*`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) { setError('Failed to load sentiment data.'); setLoading(false); return; }
      const rows: SentimentRow[] = await res.json();
      setSentiment(Object.fromEntries(rows.map(r => [r.symbol, r])));
      setLoading(false);
    });
  }, [session, holdings, fetchWatchlist]);

  const symbolMap = new Map<string, WatchRow>();
  for (const h of holdings) symbolMap.set(h.symbol, { symbol: h.symbol, exchange: h.exchange });
  for (const w of watchlist) symbolMap.set(w.symbol, w);
  const allSymbols = [...symbolMap.values()];

  const card: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 14, padding: 16, marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,rgba(0,0,0,0.04),rgba(23,64,245,0.04))', border: '1px solid var(--card-bdr)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 8 }}>AI Sentiment Scan</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, marginBottom: 8 }}>
            Grok&apos;s daily read on <span style={{ color: 'var(--bluL)' }}>your stocks.</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
            One AI-generated sentiment take per stock you hold or watch, refreshed each morning before market open. Not a live tweet feed — Grok&apos;s general read on current mood, not real-time X search.
          </div>
        </div>
        {accuracy && accuracy.closed > 0 && accuracy.accuracy != null && (
          <div style={{ flexShrink: 0, background: accuracy.accuracy >= 50 ? 'rgba(0,212,160,0.1)' : 'rgba(255,59,92,0.1)', border: `1px solid ${accuracy.accuracy >= 50 ? 'rgba(0,212,160,0.3)' : 'rgba(255,59,92,0.3)'}`, borderRadius: 16, padding: '14px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: accuracy.accuracy >= 50 ? 'var(--grn)' : 'var(--red)', letterSpacing: -1, lineHeight: 1 }}>{accuracy.accuracy}%</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>7d accuracy · {accuracy.closed} calls</div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
      ) : !allSymbols.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 32 }}>
          No stocks yet. Add holdings or a watchlist symbol to see sentiment here.
        </div>
      ) : (
        allSymbols.map(({ symbol, exchange }) => {
          const row = sentiment[symbol];
          const badge = row ? BADGE[row.label] : null;
          return (
            <div key={symbol} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{symbol}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{exchange}</div>
              </div>
              {row && badge ? (
                <div style={{ flex: 1, minWidth: 200, textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                    {badge.icon} {badge.text}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>{row.blurb}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim2)', marginTop: 2 }}>
                    Updated {new Date(row.scanned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--dim2)' }}>Not scanned yet</span>
              )}
            </div>
          );
        })
      )}

      <div style={{ fontSize: 11, color: 'var(--dim2)', textAlign: 'center', marginTop: 16 }}>
        Not SEBI registered · AI-generated take, not real-time tweets · DYOR
      </div>
    </div>
  );
}
