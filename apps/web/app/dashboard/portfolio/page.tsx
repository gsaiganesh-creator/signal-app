'use client';
import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { fetchQuote } from '@/lib/api';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';
import type { MlClass } from '@/lib/supabase/types';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function restInsertHoldings(
  portfolioId: string,
  userId: string,
  token: string,
  rows: Array<{ symbol: string; exchange: string; qty: number; avg_price: number }>
): Promise<string | null> {
  // Delete existing holdings first to prevent stale/duplicate rows on re-upload
  const del = await fetch(`${SUPA_URL}/rest/v1/holdings?portfolio_id=eq.${portfolioId}`, {
    method: 'DELETE',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
  });
  if (!del.ok) return await del.text() || `Delete failed: HTTP ${del.status}`;

  const body = rows.map(r => ({
    portfolio_id: portfolioId, user_id: userId,
    symbol: r.symbol, exchange: r.exchange, qty: r.qty, avg_price: r.avg_price,
  }));
  const res = await fetch(`${SUPA_URL}/rest/v1/holdings`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return await res.text() || `HTTP ${res.status}`;
  return null;
}

type Exchange = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';

interface Holding extends RawHolding {
  current_price?: number | null;
  change_pct?: number | null;
  signal?: string;
  rsi?: number | null;
  pl?: number;
  pl_pct?: number;
  exchange: Exchange;
  ml_class?: MlClass;
}

type MLBucket = { label: string; key: MlClass; color: string; bg: string; border: string; desc: string };

const BUCKET_META: Record<MlClass, MLBucket> = {
  Momentum:   { key:'Momentum',   label:'🚀 Momentum',  color:'var(--grn)',  bg:'rgba(0,212,160,0.10)', border:'rgba(0,212,160,0.25)',  desc:'Strong trend — ride or add more' },
  Swing:      { key:'Swing',      label:'🔄 Swing',     color:'var(--bluL)', bg:'rgba(23,64,245,0.10)', border:'rgba(23,64,245,0.25)',  desc:'Short-term opportunity — good entry' },
  Accumulate: { key:'Accumulate', label:'📦 Accumulate',color:'var(--pur)',  bg:'rgba(139,92,246,0.10)',border:'rgba(139,92,246,0.25)', desc:'Oversold + quality — good to add SIPs' },
  Hold:       { key:'Hold',       label:'🏛️ Hold',      color:'var(--txt)',  bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.1)', desc:'Long-term winner — hold, no action' },
  Exit:       { key:'Exit',       label:'⚠️ Exit',      color:'var(--red)',  bg:'rgba(255,59,92,0.10)', border:'rgba(255,59,92,0.25)',  desc:'Sell signal — exit or trail SL' },
  Dead:       { key:'Dead',       label:'💀 Dead',       color:'var(--dim)',  bg:'rgba(100,100,100,0.08)',border:'rgba(100,100,100,0.2)', desc:'Stuck in loss, no signal — review' },
  Watch:      { key:'Watch',      label:'⏳ Watch',      color:'var(--ylw)',  bg:'rgba(255,184,0,0.08)', border:'rgba(255,184,0,0.2)',   desc:'Neutral zone — monitor before acting' },
};

function classify(signal: string, rsi: number | null, plPct: number): MlClass {
  const r = rsi ?? 50;
  if (signal === 'STRONG_BUY') return 'Momentum';
  if (signal === 'BUY' && r < 44) return 'Accumulate';
  if (signal === 'BUY' && r <= 62) return 'Swing';
  if (signal === 'BUY') return 'Momentum';
  if (signal === 'STRONG_SELL' || signal === 'SELL') return 'Exit';
  if (r > 70 && plPct < 0) return 'Exit';
  if (plPct > 15 && signal === 'HOLD') return 'Hold';
  if (plPct < -15 && signal === 'HOLD') return 'Dead';
  return 'Watch';
}

type ParsedRow = { symbol: string; qty: number; avg_price: number; exchange: Exchange };

function cleanSymbol(raw: string): string {
  return raw.trim().toUpperCase()
    .replace(/-EQ$/i, '')     // Upstox suffix
    .replace(/\.NS$/i, '')    // already has suffix
    .replace(/\.BO$/i, '');
}

function parseRows(rows: string[][]): { result: ParsedRow[]; debug: string } {
  if (!rows.length) return { result: [], debug: 'File is empty' };

  const VALID_EXCH = ['NSE','BSE','NYSE','NASDAQ'];

  // Broker coverage: Zerodha Kite/Console, Upstox, Groww, HDFC Securities,
  // Angel One, 5paisa, ICICI Direct, Kotak, Motilal Oswal
  const SYM_NAMES   = ['instrument','tradingsymbol','trading symbol','stock symbol','scrip name','scrip code','script name','script','scrip','symbol','ticker','security name','security','stock name','isin name'];
  const QTY_NAMES   = ['net qty','net quantity','holdingqty','total qty','total quantity','free qty','qty','quantity','shares','units'];
  const PRICE_NAMES = [
    'avg. buy rate','avg buy rate',          // HDFC Securities
    'avg cost price','average cost price',   // Angel One
    'avg. cost','avg cost',                  // Zerodha Kite / Upstox
    'average price','average cost',          // Zerodha Console / Groww
    'avg price','avg rate','average rate',   // 5paisa / generic
    'vwap','average buy price','ltp at buy',
    'buy price','purchase price','cost price','cost',
  ];
  const EXCH_NAMES  = ['exchange','market','exch','nse/bse'];

  // Scan ALL rows — Mstocks/Mirae Asset has 30+ rows of registration text before headers
  let headerIdx = -1;
  let headers: string[] = [];
  let tradeHistoryDetected = false;
  const TRADE_SIGNALS = ['buy/sell', 'b/s', 'transaction type', 'trade type', 'order side', 'buy / sell'];
  for (let i = 0; i < rows.length; i++) {
    // Normalize all whitespace variants (\xa0 non-breaking, tabs, multiple spaces)
    const r = rows[i].map(c => (c ?? '').toString().toLowerCase().replace(/[\s\u00a0]+/g, ' ').trim());
    if (r.some(h => TRADE_SIGNALS.includes(h))) tradeHistoryDetected = true;
    if (r.some(h => SYM_NAMES.includes(h))) { headerIdx = i; headers = r; break; }
  }
  if (tradeHistoryDetected && headerIdx < 0) {
    return { result: [], debug: 'TRADE_HISTORY: This is a Trade History file, not Holdings. Download the Holdings/Portfolio export from Mstocks/Mirae Asset app instead.' };
  }

  // Column finder: exact match then partial contains
  const col = (names: string[]) => {
    const exact = names.map(n => headers.indexOf(n)).find(i => i >= 0);
    if (exact !== undefined) return exact;
    return headers.findIndex(h => names.some(n => h === n || h.startsWith(n) || n.startsWith(h)));
  };

  if (headerIdx >= 0 && headers.length) {
    const symIdx   = col(SYM_NAMES);
    const qtyIdx   = col(QTY_NAMES);
    const priceIdx = col(PRICE_NAMES);
    const exchIdx  = col(EXCH_NAMES);

    if (symIdx >= 0 && qtyIdx >= 0 && priceIdx >= 0) {
      const parsed = rows
        .slice(headerIdx + 1)
        .filter(r => r.length > Math.max(symIdx, qtyIdx, priceIdx))
        .map(r => {
          const sym = cleanSymbol(String(r[symIdx] ?? ''));
          const qty = parseInt(String(r[qtyIdx] ?? '0').replace(/,/g, ''), 10);
          const avg = parseFloat(String(r[priceIdx] ?? '0').replace(/,/g, ''));
          const rawX = exchIdx >= 0 ? String(r[exchIdx] ?? '').toUpperCase() : '';
          const exchange: Exchange = (VALID_EXCH.includes(rawX) ? rawX : 'NSE') as Exchange;
          if (!sym || sym.length < 2 || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0) return null;
          return { symbol: sym, qty, avg_price: avg, exchange };
        })
        .filter(Boolean) as ParsedRow[];
      const hdr = `hdr@${headerIdx}:[${headers.slice(0,8).join('|')}] sym=${symIdx} qty=${qtyIdx} price=${priceIdx}`;
      if (parsed.length) return { result: parsed, debug: hdr };
      return { result: [], debug: `${hdr} — 0 valid data rows` };
    }
    const hdr = `hdr@${headerIdx}:[${headers.slice(0,8).join('|')}] sym=${symIdx} qty=${qtyIdx} price=${priceIdx}`;
    return { result: [], debug: `${hdr} — missing column` };
  }

  // No header row detected — try fixed column positions
  const skip = (v: string) => ['instrument','tradingsymbol','trading symbol','stock symbol','scrip','symbol','ticker','isin','name','ltp','p&l'].includes(v.toLowerCase().trim());
  const scanned = rows.slice(0,4).map((r,i) => `row${i}:[${r.slice(0,5).join('|')}]`).join(' ');

  for (const [si, qi, pi] of [[0,1,2],[0,3,5],[0,3,4]] as [number,number,number][]) {
    const parsed = rows
      .filter(r => r.length > Math.max(si, qi, pi) && !skip(String(r[si])))
      .map(r => {
        const sym = cleanSymbol(String(r[si]));
        const qty = parseInt(String(r[qi] ?? '').replace(/,/g, ''), 10);
        const avg = parseFloat(String(r[pi] ?? '').replace(/,/g, ''));
        if (!sym || sym.length < 2 || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0) return null;
        return { symbol: sym, qty, avg_price: avg, exchange: 'NSE' as Exchange };
      })
      .filter(Boolean) as ParsedRow[];
    if (parsed.length >= 1) return { result: parsed, debug: `fallback[${si},${qi},${pi}]: ${parsed.length} rows` };
  }

  return { result: [], debug: `no header found. ${scanned}` };
}

async function parseFile(file: File): Promise<{ result: ParsedRow[]; debug: string }> {
  try {
    const isExcel = file.name.match(/\.xlsx?$/i);
    if (isExcel) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array' });
      // Try all sheets, not just the first — Zerodha sometimes has a cover sheet
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        // raw:false converts numbers/dates to strings automatically
        const all = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false }) as string[][];
        // Drop completely empty rows (merged-cell title areas at top of Zerodha XLSX)
        const rows = all.filter(r => r.some(c => (c ?? '').toString().trim() !== ''));
        if (rows.length < 2) continue;
        const res = parseRows(rows);
        if (res.result.length) return { result: res.result, debug: `sheet="${sheetName}" ${res.debug}` };
        // keep last debug for context if no sheet succeeds
        const lastDebug = `sheet="${sheetName}" rows=${rows.length} ${res.debug}`;
        if (sheetName === wb.SheetNames[wb.SheetNames.length - 1]) return { result: [], debug: lastDebug };
      }
      return { result: [], debug: 'no usable sheet found' };
    }
    // CSV — also strip empty lines
    const text = await file.text();
    const rows = text.split('\n')
      .map(l => l.split(',').map(c => c.replace(/^"|"$/g,'').trim()))
      .filter(r => r.some(c => c !== ''));
    return parseRows(rows);
  } catch (e) {
    return { result: [], debug: `parse error: ${e instanceof Error ? e.message : e}` };
  }
}

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };
const inp: React.CSSProperties = { height:40, borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:'100%' };

export default function PortfolioPage() {
  const { portfolios, activeId, activePortfolio, holdings: rawHoldings, setActiveId, createPortfolio, refresh: refreshContext, session } = usePortfolio();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ symbol:'', qty:'', avg_price:'', exchange:'NSE' as Exchange });
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [portfolioJustCreated, setPortfolioJustCreated] = useState(false);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [sortCol, setSortCol] = useState<'symbol'|'avg_price'|'current_price'|'pl'|'pl_pct'>('symbol');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  async function enrichHoldings(raw: RawHolding[]) {
    if (!raw.length) { setHoldings([]); setLoading(false); return; }
    setLoading(true);
    const enriched = await Promise.all(raw.map(async h => {
      const suffix = (h.exchange === 'NSE' || h.exchange === 'BSE') ? '.NS' : '';
      const q = await fetchQuote(h.symbol + suffix);
      const cur = q?.current_price ?? null;
      const pl = cur != null ? (cur - h.avg_price) * h.qty : undefined;
      const pl_pct = cur != null ? ((cur - h.avg_price) / h.avg_price) * 100 : 0;
      const signal = q?.signal ?? 'HOLD';
      const ml_class = classify(signal, q?.rsi ?? null, pl_pct);
      return { ...h, current_price: cur, change_pct: q?.change_pct ?? null, signal, rsi: q?.rsi ?? null, pl, pl_pct, exchange: h.exchange as Exchange, ml_class } as Holding;
    }));
    setHoldings(enriched);
    setLoading(false);
  }

  useEffect(() => { enrichHoldings(rawHoldings); }, [rawHoldings]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeId || !session) return;
    setSyncing(true); setUploadMsg('Parsing file…');
    const { result, debug } = await parseFile(file);
    if (!result.length) {
      setUploadMsg(`❌ Could not parse file.\nDebug: ${debug}`);
      setSyncing(false); return;
    }
    const insertErr = await restInsertHoldings(activeId, session.user.id, session.access_token, result);
    if (insertErr) { setUploadMsg(`❌ ${insertErr}`); setSyncing(false); return; }
    setUploadMsg(`✅ ${result.length} holdings imported — running ML analysis…`);
    await refreshContext();
    setSyncing(false);
    e.target.value = '';
  }

  async function handleAdd() {
    const sym = form.symbol.trim().toUpperCase();
    const qty = parseInt(form.qty, 10);
    const avg = parseFloat(form.avg_price);
    if (!sym || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0 || !activeId || !session) return;
    await restInsertHoldings(activeId, session.user.id, session.access_token, [{ symbol: sym, exchange: form.exchange, qty, avg_price: avg }]);
    setForm({ symbol:'', qty:'', avg_price:'', exchange:'NSE' }); setAddOpen(false);
    await refreshContext();
  }

  async function handleDelete(id: string) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/holdings?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    await refreshContext();
  }

  async function handleCreatePortfolio() {
    const name = newPortfolioName.trim();
    if (!name) { setUploadMsg('❌ Enter a portfolio name first.'); return; }
    setCreatingPortfolio(true); setUploadMsg(''); setPortfolioJustCreated(false);
    const { id, error } = await createPortfolio(name);
    setCreatingPortfolio(false);
    if (!id) { setUploadMsg(`❌ ${error ?? 'Could not create portfolio'}`); return; }
    setPortfolioJustCreated(true);
    setUploadMsg('✅ Portfolio created! Now upload your holdings file.');
  }

  const firstUploadRef = useRef<HTMLInputElement>(null);

  const sortedHoldings = [...holdings].sort((a, b) => {
    let av: number | string, bv: number | string;
    if (sortCol === 'symbol')        { av = a.symbol;            bv = b.symbol; }
    else if (sortCol === 'avg_price'){ av = a.avg_price;         bv = b.avg_price; }
    else if (sortCol === 'current_price') { av = a.current_price ?? -Infinity; bv = b.current_price ?? -Infinity; }
    else if (sortCol === 'pl')       { av = a.pl ?? -Infinity;   bv = b.pl ?? -Infinity; }
    else                             { av = a.pl_pct ?? -Infinity; bv = b.pl_pct ?? -Infinity; }
    if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (h.current_price ?? h.avg_price) * h.qty, 0);
  const totalPL       = totalCurrent - totalInvested;
  const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const fmt    = (n: number) => n >= 0 ? `+₹${n.toLocaleString('en-IN', { maximumFractionDigits:0 })}` : `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits:0 })}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  if (portfolios.length === 0) {
    const nameOk = newPortfolioName.trim().length > 0;
    const portfolioCreated = portfolioJustCreated;
    return (
      <>
        <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.10),rgba(0,212,160,0.05))', border:'1px solid rgba(23,64,245,0.22)', borderRadius:20, padding:'28px 36px', marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:8 }}>My Portfolio</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.6, lineHeight:1.2, marginBottom:8 }}>
            Upload once.<br/><span style={{ color:'var(--grn)' }}>Track everything.</span>
          </div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:480 }}>
            SIGNAL runs ML signals on every stock you hold — Momentum, Swing, Accumulate, Exit — personalised to your portfolio.
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:680, marginBottom:24 }}>
          {/* Step 1 — Create Portfolio */}
          <div style={{ background:'var(--surf)', border:`1px solid ${portfolioCreated ? 'rgba(0,212,160,0.4)' : 'var(--bdr)'}`, borderRadius:16, padding:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background: portfolioCreated ? 'var(--grn)' : 'var(--blu)', color:'#fff', fontSize:12, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {portfolioCreated ? '✓' : '1'}
              </div>
              <div style={{ fontSize:13, fontWeight:700 }}>Name your portfolio</div>
            </div>
            <input
              style={{ ...inp, marginBottom:12 }}
              placeholder="e.g. Zerodha · Long Term · Swing Trades"
              value={newPortfolioName}
              onChange={e => { setNewPortfolioName(e.target.value); setUploadMsg(''); }}
              onKeyDown={e => e.key === 'Enter' && !portfolioCreated && nameOk && handleCreatePortfolio()}
              onFocus={e => e.target.style.borderColor='var(--blu)'}
              onBlur={e => e.target.style.borderColor='var(--bdr)'}
            />
            <button
              onClick={handleCreatePortfolio}
              disabled={creatingPortfolio || portfolioCreated}
              style={{ width:'100%', height:42, borderRadius:10, background: portfolioCreated ? 'rgba(0,212,160,0.15)' : !nameOk ? 'var(--surf2)' : 'linear-gradient(135deg,var(--blu),#4F6FFA)', border: portfolioCreated ? '1px solid rgba(0,212,160,0.3)' : !nameOk ? '1px solid var(--bdr)' : 'none', color: portfolioCreated ? 'var(--grn)' : !nameOk ? 'var(--dim2)' : '#fff', fontSize:14, fontWeight:700, cursor: creatingPortfolio || portfolioCreated || !nameOk ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {creatingPortfolio ? '⏳ Creating…' : portfolioCreated ? '✅ Portfolio created' : '📂 Create Portfolio'}
            </button>
            {!nameOk && !uploadMsg && (
              <div style={{ fontSize:11, color:'var(--dim2)', marginTop:8, textAlign:'center' }}>Enter a name to continue</div>
            )}
          </div>

          {/* Step 2 — Upload */}
          <div style={{ background:'var(--surf)', border:`1px solid ${!portfolioCreated ? 'rgba(255,255,255,0.04)' : 'var(--bdr)'}`, borderRadius:16, padding:'24px', opacity: portfolioCreated ? 1 : 0.45 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--blu)', color:'#fff', fontSize:12, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>2</div>
              <div style={{ fontSize:13, fontWeight:700 }}>Upload your holdings</div>
            </div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6, marginBottom:14 }}>
              Zerodha · Upstox · Groww · MStock<br/>
              CSV or Excel — auto-detected
            </div>
            <button
              onClick={() => portfolioCreated && firstUploadRef.current?.click()}
              disabled={!portfolioCreated || syncing}
              style={{ width:'100%', height:42, borderRadius:10, background: portfolioCreated ? 'linear-gradient(135deg,var(--grn),#00b87a)' : 'var(--surf2)', border: portfolioCreated ? 'none' : '1px solid var(--bdr)', color: portfolioCreated ? '#000' : 'var(--dim2)', fontSize:14, fontWeight:700, cursor: !portfolioCreated || syncing ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {syncing ? '⏳ Uploading…' : '📤 Upload Holdings File'}
            </button>
            <input ref={firstUploadRef} type="file" accept=".csv,.xlsx,.xls,.txt" style={{ display:'none' }} onChange={handleFile}/>
          </div>
        </div>

        {uploadMsg && (
          <div style={{ fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:16, maxWidth:680,
            background: uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)',
            border: `1px solid ${uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`,
            color: uploadMsg.startsWith('✅') ? 'var(--grn)' : 'var(--red)' }}>
            {uploadMsg}
          </div>
        )}

        {/* Broker format guide */}
        <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 18px', maxWidth:680, fontSize:12 }}>
          <div style={{ fontWeight:700, color:'var(--dim)', marginBottom:8 }}>Supported broker exports (auto-detected)</div>
          {[
            ['Zerodha Kite', 'Holdings → ⋮ → Download CSV'],
            ['Zerodha Console', 'Reports → P&L → Holdings → Download'],
            ['Upstox', 'Portfolio → Holdings → Download CSV'],
            ['Groww', 'Portfolio → Download statement'],
            ['Manual CSV', 'SYMBOL, QTY, AVG_PRICE, EXCHANGE (one row per stock)'],
          ].map(([b, h]) => (
            <div key={b} style={{ display:'flex', gap:10, marginBottom:5 }}>
              <span style={{ color:'var(--bluL)', fontWeight:700, minWidth:120 }}>{b}</span>
              <span style={{ color:'var(--dim)' }}>{h}</span>
            </div>
          ))}
        </div>

      </>
    );
  }

  return (
    <>
      {/* Hero — referral card style */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.07),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.18)', borderRadius:20, padding:'28px 36px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:8 }}>My Portfolio</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.6, lineHeight:1.2, marginBottom:8 }}>
            Upload once.<br/><span style={{ color:'var(--grn)' }}>Track everything.</span>
          </div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:440 }}>
            SIGNAL tracks live P&L, runs ML classification on every holding (Momentum / Swing / Long-Term / Exit Now) and fires BUY/SELL signals for stocks you already own.
          </div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:48, fontWeight:900, color: totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)', lineHeight:1 }}>{totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(1)}%</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>portfolio return</div>
          <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>{holdings.length} holdings · {fmt(totalPL)}</div>
        </div>
      </div>

      {/* Multiple portfolio benefits card */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📂', color:'var(--bluL)', bg:'rgba(23,64,245,0.08)', border:'rgba(23,64,245,0.2)',
            title:'Multiple Portfolios',
            desc:'Separate "Swing Trades", "Long Term", "ELSS" — each tracked independently with its own P&L and signals.' },
          { icon:'🤖', color:'var(--grn)', bg:'rgba(0,212,160,0.07)', border:'rgba(0,212,160,0.2)',
            title:'ML Classification',
            desc:'Every holding auto-bucketed: Momentum · Swing · Long-Term · Exit Now. Updated daily from RSI + EMA signals.' },
          { icon:'📊', color:'var(--pur)', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)',
            title:'Live P&L Tracking',
            desc:'Real-time unrealised gains, invested value, and sector concentration — all from a single CSV upload.' },
          { icon:'🔔', color:'var(--ylw)', bg:'rgba(255,184,0,0.07)', border:'rgba(255,184,0,0.2)',
            title:'Signals on Your Stocks',
            desc:'Live Signals page filters to only your holdings. Earnings alerts, FII/DII impact — personalised to your portfolio.' },
        ].map(c => (
          <div key={c.title} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:'16px 18px' }}>
            <div style={{ fontSize:22, marginBottom:10 }}>{c.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:c.color, marginBottom:5 }}>{c.title}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Upload tip */}
      <div style={{ background:'rgba(0,212,160,0.05)', border:'1px solid rgba(0,212,160,0.15)', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>💡</span>
        <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>
          <strong style={{ color:'var(--grn)' }}>Tip:</strong> Create separate portfolios for different strategies — e.g. <em>Swing Picks</em>, <em>Core Holdings</em>, <em>F&O Hedges</em>. Switch between them from the top nav. CSV format: <code style={{ background:'var(--surf2)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>SYMBOL, QUANTITY, AVG_PRICE, EXCHANGE</code>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700 }}>Holdings</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:2 }}>ML-classified · Live prices via SIGNAL API</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} disabled={syncing || !activeId}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: syncing ? 0.6 : 1 }}>
            {syncing ? '⏳ Importing…' : '📤 Upload (CSV / Excel)'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" style={{ display:'none' }} onChange={handleFile}/>
          <button onClick={() => setAddOpen(o => !o)} disabled={!activeId}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Stock
          </button>
          <button onClick={() => enrichHoldings(rawHoldings)} disabled={loading}
            style={{ height:36, padding:'0 12px', borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🔄</button>
        </div>
      </div>

      {/* Portfolio tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {portfolios.map(p => (
          <button key={p.id} onClick={() => setActiveId(p.id)}
            style={{ height:34, padding:'0 16px', borderRadius:8, fontSize:13, fontWeight: p.id === activeId ? 700 : 500, cursor:'pointer', fontFamily:'inherit', border: p.id === activeId ? '1px solid var(--blu)' : '1px solid var(--bdr)', background: p.id === activeId ? 'rgba(23,64,245,0.1)' : 'transparent', color: p.id === activeId ? 'var(--bluL)' : 'var(--dim)' }}>
            📂 {p.name}
          </button>
        ))}
        {showNewPortfolio ? (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input autoFocus placeholder="Portfolio name…" value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreatePortfolio(); if (e.key === 'Escape') { setShowNewPortfolio(false); setNewPortfolioName(''); } }}
              style={{ height:34, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:160 }}/>
            <button onClick={handleCreatePortfolio} disabled={!newPortfolioName.trim() || creatingPortfolio}
              style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {creatingPortfolio ? '…' : 'Create'}
            </button>
            <button onClick={() => { setShowNewPortfolio(false); setNewPortfolioName(''); }}
              style={{ height:34, padding:'0 10px', borderRadius:8, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowNewPortfolio(true)}
            style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'1px dashed var(--bdr)', background:'transparent', color:'var(--dim)' }}>
            + New Portfolio
          </button>
        )}
      </div>

      {uploadMsg && (
        <div style={{ marginBottom:14, fontSize:13, color: uploadMsg.startsWith('✅') ? 'var(--grn)' : 'var(--red)', background: uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border:`1px solid ${uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:10, padding:'10px 14px' }}>
          {uploadMsg}
          {uploadMsg.startsWith('❌') && <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>Expected: <code>SYMBOL,QUANTITY,AVG_PRICE,EXCHANGE</code> — e.g. <code>RELIANCE,50,2800,NSE</code></div>}
        </div>
      )}

      {addOpen && (
        <div style={{ ...card, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[
            { k:'symbol', label:'Symbol', ph:'RELIANCE', flex:2, min:100 },
            { k:'qty', label:'Qty', ph:'50', flex:1, min:80, type:'number' },
            { k:'avg_price', label:'Avg Price (₹)', ph:'2800', flex:1, min:100, type:'number' },
          ].map(f => (
            <div key={f.k} style={{ flex:f.flex, minWidth:f.min }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>{f.label}</div>
              <input style={inp} type={f.type ?? 'text'} placeholder={f.ph}
                value={(form as Record<string, string>)[f.k]}
                onChange={e => setForm(p => ({ ...p, [f.k]: f.k === 'symbol' ? e.target.value.toUpperCase() : e.target.value }))}
                onFocus={e => e.target.style.borderColor='var(--blu)'}
                onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
            </div>
          ))}
          <div style={{ flex:1, minWidth:90 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Exchange</div>
            <select style={{ ...inp, appearance:'none' }} value={form.exchange} onChange={e => setForm(f => ({ ...f, exchange: e.target.value as Exchange }))}>
              {(['NSE','BSE','NYSE','NASDAQ'] as Exchange[]).map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <button onClick={handleAdd}
            style={{ height:40, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Add →</button>
        </div>
      )}

      {holdings.length > 0 && (
        <>
          <div className="g3" style={{ display:'grid', gap:12, marginBottom:16 }}>
            {[
              { label:'Total Invested', val:`₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits:0 })}` },
              { label:'Current Value',  val:`₹${totalCurrent.toLocaleString('en-IN', { maximumFractionDigits:0 })}` },
              { label:'Total P&L', val:fmt(totalPL), sub:fmtPct(totalPLPct), valC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)', subC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' },
            ].map(m => (
              <div key={m.label} style={card}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>{m.label}</div>
                <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:(m as { valC?: string }).valC ?? 'var(--txt)' }}>{m.val}</div>
                {(m as { sub?: string }).sub && <div style={{ fontSize:13, fontWeight:700, color:(m as { subC?: string }).subC, marginTop:3 }}>{(m as { sub?: string }).sub}</div>}
              </div>
            ))}
          </div>

          {/* ML Bucket breakdown */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>ML Classification Breakdown</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {(Object.keys(BUCKET_META) as MlClass[]).map(key => {
                const count = holdings.filter(h => (h.ml_class ?? classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0)) === key).length;
                if (count === 0) return null;
                const meta = BUCKET_META[key];
                return (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:30, background:meta.bg, border:`1px solid ${meta.border}` }}>
                    <span style={{ fontSize:13, fontWeight:800, color:meta.color }}>{meta.label}</span>
                    <span style={{ fontSize:15, fontWeight:900, color:meta.color }}>{count}</span>
                    <span style={{ fontSize:10, color:'var(--dim)', maxWidth:120 }}>{meta.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>{activePortfolio?.name} · Holdings · ML Classified</div>
          {holdings.length > 0 && <span style={{ fontSize:12, color:'var(--dim)' }}>{holdings.length} stocks</span>}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--dim)', fontSize:14 }}>⏳ Running ML analysis on your holdings…</div>
        ) : holdings.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📂</div>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:6 }}>No holdings in {activePortfolio?.name}</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Upload your broker export — Zerodha, Upstox, Groww, or any CSV/Excel.</div>

            {/* Big upload button inside the empty state */}
            <button onClick={() => fileRef.current?.click()} disabled={syncing}
              style={{ height:48, padding:'0 32px', borderRadius:12, background:'var(--blu)', border:'none', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:16, display:'inline-flex', alignItems:'center', gap:10 }}>
              {syncing ? '⏳ Importing…' : '📤 Upload Holdings (CSV / Excel)'}
            </button>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>or use <strong style={{ color:'var(--txt)' }}>+ Add Stock</strong> above to add manually</div>

            <div style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:12, padding:'16px 20px', display:'inline-block', textAlign:'left', maxWidth:420 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', marginBottom:10 }}>Supported formats</div>
              {[
                ['Zerodha Kite', 'Download Holdings → Export CSV'],
                ['Zerodha Console', 'Reports → Holdings → Download'],
                ['Upstox', 'Portfolio → Holdings → Download CSV'],
                ['Groww', 'Portfolio → Download statement'],
                ['SIGNAL CSV', 'SYMBOL, QTY, AVG_PRICE, EXCHANGE'],
              ].map(([broker, hint]) => (
                <div key={broker} style={{ display:'flex', gap:8, marginBottom:7, fontSize:12 }}>
                  <span style={{ color:'var(--grn)', fontWeight:700, minWidth:90 }}>{broker}</span>
                  <span style={{ color:'var(--dim)' }}>{hint}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {([
                    { label:'Stock',     col:'symbol'        },
                    { label:'ML Class',  col:null            },
                    { label:'Avg Price', col:'avg_price'     },
                    { label:'CMP',       col:'current_price' },
                    { label:'P&L ₹',     col:'pl'            },
                    { label:'P&L %',     col:'pl_pct'        },
                    { label:'Signal',    col:null            },
                    { label:'',          col:null            },
                  ] as { label:string; col:typeof sortCol|null }[]).map(({ label, col }) => {
                    const active = col && col === sortCol;
                    const arrow  = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : col ? ' ⇅' : '';
                    return (
                      <th key={label} onClick={col ? () => toggleSort(col) : undefined}
                        style={{ fontSize:10.5, fontWeight:700, color: active ? 'var(--txt)' : 'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap', cursor: col ? 'pointer' : 'default', userSelect:'none' }}>
                        {label}{arrow}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map(h => {
                  const clsKey = classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0);
                  const cls = BUCKET_META[clsKey];
                  const plPos = (h.pl ?? 0) >= 0;
                  return (
                    <tr key={h.id}>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>{h.exchange} · {h.qty}u</div>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:cls.bg, color:cls.color, whiteSpace:'nowrap' }}>{cls.label}</span>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>₹{h.avg_price.toLocaleString('en-IN')}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {h.current_price != null ? (
                          <>
                            <div style={{ fontSize:13, fontWeight:700 }}>₹{h.current_price.toLocaleString('en-IN', { maximumFractionDigits:0 })}</div>
                            {h.change_pct != null && <div style={{ fontSize:11, color: h.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>{h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%</div>}
                          </>
                        ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>API offline</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {h.pl != null ? (
                          <>
                            <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmt(h.pl)}</div>
                            <div style={{ fontSize:11, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmtPct(h.pl_pct ?? 0)}</div>
                          </>
                        ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 8px', borderRadius:5, whiteSpace:'nowrap',
                          background: h.signal?.includes('BUY') ? 'rgba(0,212,160,0.12)' : h.signal?.includes('SELL') ? 'rgba(255,59,92,0.12)' : 'rgba(255,184,0,0.12)',
                          color: h.signal?.includes('BUY') ? 'var(--grn)' : h.signal?.includes('SELL') ? 'var(--red)' : 'var(--ylw)' }}>
                          {h.signal ?? 'HOLD'}
                        </span>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <button onClick={() => handleDelete(h.id)} style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14, padding:'2px 4px' }} title="Remove">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14, lineHeight:1.6 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · ML classifications for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
