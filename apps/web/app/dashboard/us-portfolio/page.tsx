'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';
import * as XLSX from 'xlsx';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const card: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' };
const inp:  React.CSSProperties = { height:36, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, padding:'0 10px', fontFamily:'inherit', outline:'none' };
const cCard = (grad: string, bdr: string): React.CSSProperties => ({
  background:grad, border:`1px solid ${bdr}`, borderRadius:16, padding:'18px 20px',
  backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)',
});

interface MLSignal { label:'Strong Momentum'|'Sideways'|'Weak / Declining'|'N/A'; color:string; bg:string; bdr:string;
  rsi14:Num; ema20:Num; ema50:Num; ema200:Num; macd:Num; bb_pct:Num;
  vol_ratio:Num; upside_to_target:Num; short_pct_float:Num; signals:string[] }

function scoreSig(signals: string[]): MLSignal['label'] {
  const s = signals.join(' ').toLowerCase();
  const buyN = (s.match(/bullish|buy|momentum|oversold|above.*ema|positive.*macd|analyst.*target|upside/g)||[]).length;
  const selN = (s.match(/bearish|sell|overbought|below.*ema|negative.*macd|exit|short interest/g)||[]).length;
  if (buyN > selN + 1) return 'Strong Momentum';
  if (selN > buyN + 1) return 'Weak / Declining';
  if (buyN > 0 || selN > 0) return 'Sideways';
  return 'N/A';
}
function mlBadge(label: MLSignal['label']): Pick<MLSignal,'color'|'bg'|'bdr'> {
  if (label==='Strong Momentum')   return { color:'var(--grn)', bg:'rgba(0,212,160,0.12)',  bdr:'rgba(0,212,160,0.35)' };
  if (label==='Weak / Declining')  return { color:'var(--red)', bg:'rgba(255,59,92,0.10)',  bdr:'rgba(255,59,92,0.32)' };
  if (label==='Sideways')          return { color:'var(--ylw)', bg:'rgba(255,184,0,0.10)',  bdr:'rgba(255,184,0,0.32)' };
  return { color:'var(--dim)', bg:'rgba(122,139,170,0.08)', bdr:'rgba(122,139,170,0.2)' };
}

interface USHolding { id: string; symbol: string; exchange: string; qty: number; avg_price: number; portfolio_id: string; portfolio_name?: string; }
type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;
type Num = number | null;

interface StockDetail {
  symbol: string; name: string; price: Num; change_pct: Num; prev_close: Num;
  ema20: Num; ema50: Num; ema200: Num; rsi14: Num; macd: Num; atr14: Num;
  bb_upper: Num; bb_lower: Num; bb_mid: Num; bb_pct: Num;
  high_52w: Num; low_52w: Num; from_52h: Num;
  volume: Num; avg_volume: Num; vol_ratio: Num;
  stop_loss: Num; target1: Num; target2: Num;
  signals: string[];
  // Fundamentals (US only)
  trailing_pe: Num; forward_pe: Num; ev_ebitda: Num; price_to_sales: Num; beta: Num;
  revenue_growth: Num; earnings_growth: Num;
  gross_margin: Num; operating_margin: Num; net_margin: Num; roe: Num;
  debt_to_equity: Num; current_ratio: Num;
  dividend_yield: Num; payout_ratio: Num; ex_div_date: string | null;
  market_cap: Num;
  analyst_count: Num; analyst_consensus: string | null; analyst_target: Num;
  analyst_target_high: Num; analyst_target_low: Num; upside_to_target: Num;
  next_earnings_date: string | null; days_to_earnings: Num;
  short_pct_float: Num; short_ratio: Num;
}

const INDICES = [
  { name:'S&P 500', sym:'^GSPC' }, { name:'Nasdaq', sym:'^IXIC' },
  { name:'Dow Jones', sym:'^DJI' }, { name:'VIX', sym:'^VIX' },
];

// Curated momentum/swing picks by sector
const MOMENTUM_PICKS = {
  'AI & Tech':     [{ sym:'NVDA',desc:'AI chip leader' },{ sym:'MSFT',desc:'Azure + Copilot' },{ sym:'META',desc:'Ad revenue + AI' },{ sym:'GOOGL',desc:'Search + Gemini' },{ sym:'AMZN',desc:'Cloud + AI infra' }],
  'Financials':    [{ sym:'JPM',desc:'Banking giant' },{ sym:'V',desc:'Payments network' },{ sym:'GS',desc:'Investment bank' },{ sym:'BRK-B',desc:'Buffett holding co.' }],
  'Momentum ETFs': [{ sym:'QQQ',desc:'Nasdaq-100 ETF' },{ sym:'SPY',desc:'S&P 500 ETF' },{ sym:'SOXX',desc:'Semiconductor ETF' },{ sym:'ARKK',desc:'Innovation ETF' }],
  'High Growth':   [{ sym:'TSLA',desc:'EV + Energy + AI' },{ sym:'PLTR',desc:'AI data analytics' },{ sym:'COIN',desc:'Crypto exchange' },{ sym:'APP',desc:'Mobile advertising' }],
};

type USRow = Omit<USHolding, 'id' | 'portfolio_id' | 'portfolio_name'>;

function parseUSRows(rows: string[][]): { result: USRow[]; debug: string } {
  if (rows.length < 2) return { result: [], debug: 'empty' };

  // Words that identify a symbol column when found as any token in the header cell
  const SYM_WORDS  = new Set(['symbol','ticker','scrip','instrument','security','equity']);
  const QTY_NAMES  = ['qty','quantity','shares','units','net qty','net quantity','position','amount'];
  const PRICE_NAMES = [
    'average cost basis','avg cost basis','cost basis per share',
    'average cost','avg. cost','avg cost',
    'cost/share','cost per share','price per share',
    'average buy price','avg buy price','avg price','avg. buy rate','avg buy rate',
    'average price','purchase price','cost price','price','cost',
  ];

  // A cell is a symbol column if any space/punct-separated word matches SYM_WORDS
  const isSymCell = (h: string) =>
    SYM_WORDS.has(h) || h.split(/[\s/\-,()]+/).some(w => SYM_WORDS.has(w));

  let headerIdx = -1, headers: string[] = [];
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i].map(c => (c ?? '').toString().toLowerCase().replace(/\s+/g, ' ').trim());
    // Require >=2 non-empty cells to avoid matching metadata/description rows
    if (r.filter(c => c).length >= 2 && r.some(h => isSymCell(h))) {
      headerIdx = i; headers = r; break;
    }
  }
  if (headerIdx < 0) return { result: [], debug: 'no header row with Symbol/Ticker column found' };

  // Fuzzy column finder: exact -> word-boundary -> prefix
  const col = (names: string[]) => {
    const ns = new Set(names);
    const exact = headers.findIndex(h => ns.has(h));
    if (exact >= 0) return exact;
    return headers.findIndex(h => {
      const words = h.split(/[\s/\-,().]+/).filter(Boolean);
      return names.some(n => {
        const nw = n.split(/[\s/\-,().]+/).filter(Boolean);
        return words.some(w => nw.includes(w)) || h.startsWith(n) || n.startsWith(h);
      });
    });
  };

  const symIdx   = headers.findIndex(h => isSymCell(h));
  const qtyIdx   = col(QTY_NAMES);
  const priceIdx = col(PRICE_NAMES);
  const exchIdx  = col(['exchange','market','exch']);

  if (symIdx < 0 || qtyIdx < 0) return { result: [], debug: `headers: [${headers.slice(0,8).join('|')}] — missing Symbol or Qty column` };

  const VALID_US = new Set(['NYSE','NASDAQ','AMEX','ARCA','BATS']);
  const result = rows.slice(headerIdx + 1)
    .filter(r => r.length > Math.max(symIdx, qtyIdx) && (r[symIdx]??'').toString().trim())
    .map(r => {
      const sym = (r[symIdx]??'').toString().trim().toUpperCase().replace(/[^A-Z0-9.\-]/g,'');
      const qty = parseFloat(((r[qtyIdx]??'0').toString()).replace(/,/g,''));
      const avg = priceIdx >= 0 ? parseFloat(((r[priceIdx]??'0').toString()).replace(/[$,]/g,'')) : 0;
      const rawX = exchIdx >= 0 ? (r[exchIdx]??'').toString().toUpperCase().trim() : '';
      const exchange = VALID_US.has(rawX) ? rawX : 'NYSE';
      if (!sym || sym.length > 10 || isNaN(qty) || qty <= 0) return null;
      return { symbol:sym, exchange, qty, avg_price:(!isNaN(avg) && avg>0) ? avg : 0.001 } as USRow;
    })
    .filter(Boolean) as USRow[];

  return { result, debug: `sym=${symIdx} qty=${qtyIdx} price=${priceIdx}` };
}

async function parseUSFile(file: File): Promise<{ result: USRow[]; msg: string }> {
  try {
    const isExcel = /\.(xlsx?|xls)$/i.test(file.name);
    if (isExcel) {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array' });
      for (const sheetName of wb.SheetNames) {
        const ws   = wb.Sheets[sheetName];
        const all  = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false }) as string[][];
        const rows = all.filter(r => r.some(c => (c??'').toString().trim() !== ''));
        if (rows.length < 2) continue;
        const { result, debug } = parseUSRows(rows);
        if (result.length) return { result, msg: `✅ Imported ${result.length} holdings from "${sheetName}"` };
        if (sheetName === wb.SheetNames[wb.SheetNames.length - 1])
          return { result:[], msg: `❌ No holdings parsed (${debug}). Check that Symbol + Qty columns exist.` };
      }
      return { result:[], msg:'❌ No usable sheet found in Excel file.' };
    }
    // CSV
    const text = await file.text();
    const rows = text.split('\n')
      .map(l => l.split(',').map(c => c.replace(/^"|"$/g,'').trim()))
      .filter(r => r.some(c => c !== ''));
    const { result, debug } = parseUSRows(rows);
    if (result.length) return { result, msg: `✅ Imported ${result.length} holdings` };
    return { result:[], msg: `❌ Could not parse CSV (${debug}). Columns needed: Symbol, Qty/Shares, and optionally Cost/Price.` };
  } catch (e) {
    return { result:[], msg: `❌ Error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export default function USPortfolioPage() {
  const { portfolios, session, createPortfolio, renamePortfolio, deletePortfolio, refresh } = usePortfolio();
  const [allHoldings, setAllHoldings] = useState<USHolding[]>([]);
  const [prices, setPrices]           = useState<PriceMap>({});
  const [idxPrices, setIdxPrices]     = useState<PriceMap>({});
  const [momentumPrices, setMomentumPrices] = useState<PriceMap>({});
  const [usdInr, setUsdInr]           = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState('');
  const [activePortId, setActivePortId] = useState<string | null>(null);
  const [viewMode, setViewMode]       = useState<'merged' | 'by-portfolio'>('merged');
  const [addForm, setAddForm]         = useState({ symbol:'', qty:'', avg_price:'', portfolio_id:'' });
  const [addOpen, setAddOpen]         = useState(false);
  const [newPortName, setNewPortName] = useState('');
  const [creatingPort, setCreatingPort] = useState(false);
  const [selectedHolding, setSelected]   = useState<USHolding | null>(null);
  const [stockDetail,     setDetail]     = useState<StockDetail | null>(null);
  const [detailLoading,   setDetailLoad] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPortId, setUploadPortId] = useState<string | null>(null);
  const [manualUSPortIds, setManualUSPortIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { const s = localStorage.getItem('signal_us_port_ids'); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  });
  const [menuPortId, setMenuPortId] = useState<string|null>(null);
  const [menuPortPos, setMenuPortPos] = useState<{top:number;left:number}|null>(null);
  const [renamingPortId, setRenamingPortId] = useState<string|null>(null);
  const [renamePortVal, setRenamePortVal] = useState('');
  const [confirmDeletePortId, setConfirmDeletePortId] = useState<string|null>(null);
  const [deletingPort, setDeletingPort] = useState(false);
  const [showNewPortInput, setShowNewPortInput] = useState(false);
  const [mlSignals, setMlSignals] = useState<Record<string, MLSignal>>({});
  const [mlLoading, setMlLoading] = useState(false);
  const [mlExpanded, setMlExpanded] = useState(false);

  // Close port dropdown on outside click/scroll
  useEffect(() => {
    if (!menuPortId) return;
    const close = () => { setMenuPortId(null); setMenuPortPos(null); };
    document.addEventListener('click', close);
    window.addEventListener('scroll', close);
    return () => { document.removeEventListener('click', close); window.removeEventListener('scroll', close); };
  }, [menuPortId]);

  // US portfolios = those with US holdings OR explicitly created from this page (persisted in localStorage)
  const allPortIds = portfolios.map(p => p.id);
  const usPortfolioIds = new Set([
    ...allHoldings.map(h => h.portfolio_id),
    ...Array.from(manualUSPortIds),
  ]);
  const usPortfolios = portfolios.filter(p => usPortfolioIds.has(p.id));

  // Fetch all US holdings across all portfolios
  const fetchHoldings = useCallback(async () => {
    if (!session || !allPortIds.length) return;
    try {
      const ids = allPortIds.join(',');
      const res = await fetch(
        `${SUPA_URL}/rest/v1/holdings?select=id,symbol,exchange,qty,avg_price,portfolio_id&portfolio_id=in.(${ids})&exchange=in.(NYSE,NASDAQ,AMEX,ARCA,BATS)&order=symbol`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const rows: { id:string; symbol:string; exchange:string; qty:number; avg_price:number; portfolio_id:string }[] = await res.json();
      const portMap = Object.fromEntries(portfolios.map(p => [p.id, p.name]));
      setAllHoldings(rows.map(r => ({ ...r, portfolio_name: portMap[r.portfolio_id] ?? 'Unknown' })));
    } catch { /* offline */ }
  }, [session, allPortIds.join(','), portfolios]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  // Fetch prices for all US holdings + USD/INR
  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return;
    setLoading(true);
    try {
      const all = [...syms, 'USDINR=X'];
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(all.join(','))}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data: PriceMap = await res.json();
        setPrices(data);
        if (data['USDINR=X']?.price) setUsdInr(data['USDINR=X'].price);
      }
    } catch { /* timeout */ }
    setLoading(false);
  }, []);

  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(INDICES.map(i => i.sym).join(','))}`);
      if (res.ok) setIdxPrices(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchMomentum = useCallback(async () => {
    const all = Object.values(MOMENTUM_PICKS).flat().map(s => s.sym);
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(all.join(','))}`);
      if (res.ok) setMomentumPrices(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchIndices(); fetchMomentum(); }, [fetchIndices, fetchMomentum]);
  useEffect(() => {
    const syms = [...new Set(allHoldings.map(h => h.symbol))];
    if (syms.length) fetchPrices(syms);
    else { setPrices({}); setLoading(false); }
  }, [allHoldings, fetchPrices]);

  // Set default add-form portfolio to first US portfolio
  useEffect(() => {
    const first = usPortfolios[0];
    if (!addForm.portfolio_id && first) setAddForm(f => ({ ...f, portfolio_id: first.id }));
    if (!uploadPortId && first) setUploadPortId(first.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHoldings.length, portfolios.length, manualUSPortIds.size]);

  // Derived metrics — all holdings merged
  const merged = allHoldings;
  const totalInvestedUSD = merged.reduce((s, h) => s + (h.avg_price > 0.01 ? h.avg_price * h.qty : 0), 0);
  const totalCurrentUSD  = merged.reduce((s, h) => {
    const p = prices[h.symbol]?.price;
    return p != null ? s + p * h.qty : s;
  }, 0);
  const hasAllPrices = merged.every(h => prices[h.symbol]?.price != null);
  const totalPLUSD   = hasAllPrices ? totalCurrentUSD - totalInvestedUSD : null;
  const totalPLPct   = (totalPLUSD != null && totalInvestedUSD > 0) ? (totalPLUSD / totalInvestedUSD * 100) : null;
  const dayPL        = merged.reduce((s, h) => {
    const p = prices[h.symbol];
    if (!p?.price || !p?.change_pct) return s;
    const prevClose = p.price / (1 + p.change_pct / 100);
    return s + (p.price - prevClose) * h.qty;
  }, 0);
  const inrEquiv     = usdInr && totalCurrentUSD > 0 ? totalCurrentUSD * usdInr : null;

  async function handleAdd() {
    if (!session || !addForm.portfolio_id) return;
    const sym = addForm.symbol.trim().toUpperCase();
    const qty = parseFloat(addForm.qty);
    const avg = parseFloat(addForm.avg_price);
    if (!sym || isNaN(qty) || qty <= 0 || isNaN(avg) || avg <= 0) { setMsg('⚠ Fill all fields'); return; }
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/holdings`, {
        method:'POST',
        headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}`, 'Content-Type':'application/json', Prefer:'return=representation' },
        body: JSON.stringify({ symbol: sym, exchange:'NYSE', qty, avg_price: avg, portfolio_id: addForm.portfolio_id, user_id: session.user.id }),
      });
      if (!res.ok) { const t=await res.text(); setMsg(`❌ ${t}`); return; }
      setMsg(`✅ Added ${sym}`);
      setAddForm(f => ({ ...f, symbol:'', qty:'', avg_price:'' }));
      setAddOpen(false);
      await fetchHoldings();
    } catch (e) { setMsg(`❌ ${e}`); }
  }

  async function handleDelete(h: USHolding) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/holdings?id=eq.${h.id}`, {
      method:'DELETE',
      headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}` },
    });
    setAllHoldings(prev => prev.filter(x => x.id !== h.id));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !session) return;
    if (!uploadPortId) {
      setMsg('⚠️ Select or create a portfolio tab first, then import your file.');
      return;
    }
    setMsg(`⏳ Parsing "${file.name}"…`);
    const { result, msg: parseMsg } = await parseUSFile(file);
    if (!result.length) {
      setMsg(`${parseMsg}\n\nTip: Make sure the file has columns named Symbol/Ticker and Qty/Shares. Supported brokers: Schwab, Fidelity, Robinhood, Webull, IBKR.`);
      return;
    }
    setMsg(`⏳ Saving ${result.length} holdings…`);
    // Delete existing US holdings for this portfolio before re-importing
    await fetch(`${SUPA_URL}/rest/v1/holdings?portfolio_id=eq.${uploadPortId}&exchange=in.(NYSE,NASDAQ,AMEX,ARCA,BATS)`, {
      method:'DELETE',
      headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}` },
    });
    const body = result.map(r => ({ ...r, portfolio_id: uploadPortId, user_id: session.user.id }));
    const res = await fetch(`${SUPA_URL}/rest/v1/holdings`, {
      method:'POST',
      headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}`, 'Content-Type':'application/json', Prefer:'return=minimal' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      setMsg(`❌ Save failed: ${errText}`);
      return;
    }
    const portName = usPortfolios.find(p => p.id === uploadPortId)?.name ?? 'portfolio';
    setMsg(`✅ ${result.length} holdings saved to "${portName}"`);
    await fetchHoldings();
  }

  async function handleCreatePortfolio() {
    const name = newPortName.trim();
    if (!name) return;
    setCreatingPort(true);
    const result = await createPortfolio(name);
    setCreatingPort(false);
    if (result.error) { setMsg(`❌ ${result.error}`); return; }
    setNewPortName('');
    setShowNewPortInput(false);
    if (result.id) {
      setManualUSPortIds(prev => {
        const next = new Set([...prev, result.id!]);
        try { localStorage.setItem('signal_us_port_ids', JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
      setAddForm(f => ({ ...f, portfolio_id: result.id! }));
      setUploadPortId(result.id);
      // Auto-select the new portfolio tab
      setActivePortId(result.id);
      setViewMode('by-portfolio');
      setMsg(`✅ Portfolio "${name}" created — now import your holdings`);
    }
  }

  async function handleRenamePort() {
    if (!renamingPortId || !renamePortVal.trim()) { setRenamingPortId(null); return; }
    await renamePortfolio(renamingPortId, renamePortVal.trim());
    setRenamingPortId(null);
  }

  async function handleDeletePort(id: string) {
    setDeletingPort(true);
    await deletePortfolio(id);
    setConfirmDeletePortId(null);
    setDeletingPort(false);
    if (activePortId === id) setActivePortId(null);
    setManualUSPortIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    await fetchHoldings();
  }

  async function selectHolding(h: USHolding) {
    setSelected(h);
    setDetail(null);
    setDetailLoad(true);
    try {
      const res = await fetch(`/api/stock-detail?symbol=${h.symbol}&exchange=${h.exchange}`, { signal: AbortSignal.timeout(12000) });
      if (res.ok) setDetail(await res.json());
    } catch { /* ignore */ }
    setDetailLoad(false);
  }

  const fetchAllSignals = useCallback(async (holdings: USHolding[]) => {
    const syms = [...new Set(holdings.map(h => h.symbol))];
    if (!syms.length) return;
    setMlLoading(true);
    const results: Record<string, MLSignal> = {};
    await Promise.all(syms.map(async sym => {
      try {
        const res = await fetch(`/api/stock-detail?symbol=${sym}&exchange=NYSE`, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return;
        const d: StockDetail = await res.json();
        const label = scoreSig(d.signals ?? []);
        const badge = mlBadge(label);
        results[sym] = { label, ...badge,
          rsi14: d.rsi14, ema20: d.ema20, ema50: d.ema50, ema200: d.ema200,
          macd: d.macd, bb_pct: d.bb_pct, vol_ratio: d.vol_ratio,
          upside_to_target: d.upside_to_target, short_pct_float: d.short_pct_float,
          signals: d.signals ?? [] };
      } catch {}
    }));
    setMlSignals(results);
    setMlLoading(false);
  }, []);

  useEffect(() => { if (allHoldings.length) fetchAllSignals(allHoldings); }, [allHoldings, fetchAllSignals]);

  // Group by portfolio for by-portfolio view
  const byPortfolio = portfolios.map(p => ({
    portfolio: p,
    holdings: allHoldings.filter(h => h.portfolio_id === p.id),
  })).filter(g => g.holdings.length > 0);

  // Displayed holdings
  const displayHoldings = viewMode === 'merged' ? merged :
    (activePortId ? allHoldings.filter(h => h.portfolio_id === activePortId) : merged);

  // Summary totals across all US holdings
  const sumInvestedUSD = merged.reduce((s, h) => s + (h.avg_price > 0.01 ? h.avg_price * h.qty : 0), 0);
  const sumCurrentUSD  = merged.reduce((s, h) => { const p = prices[h.symbol]?.price; return s + (p != null ? p * h.qty : (h.avg_price > 0.01 ? h.avg_price * h.qty : 0)); }, 0);
  const sumPL          = sumCurrentUSD - sumInvestedUSD;
  const sumPLPct       = sumInvestedUSD > 0 ? (sumPL / sumInvestedUSD) * 100 : 0;
  const sumHasPrices   = merged.some(h => prices[h.symbol]?.price != null);

  const allMomentumSyms = Object.values(MOMENTUM_PICKS).flat().map(s => s.sym);

  return (
    <div style={{ maxWidth:1200 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>🇺🇸 US Portfolio</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>
            {merged.length} holdings across {byPortfolio.length || portfolios.length} portfolios
            {usdInr ? ` · USD/INR ₹${usdInr.toFixed(2)}` : ''}
            {loading && ' · ⏳ refreshing…'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={() => setAddOpen(true)}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Stock
          </button>
          <button onClick={() => fileRef.current?.click()}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            📂 Import File
          </button>
          <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={handleFile} />
        </div>
      </div>

      {/* Summary cards */}
      {merged.length > 0 && (
        <div className="g4" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`$${sumInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: usdInr ? `≈ ₹${(sumInvestedUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', color:'var(--txt)' },
            { label:'Current Value',  val: sumHasPrices ? `$${sumCurrentUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: (sumHasPrices&&usdInr) ? `≈ ₹${(sumCurrentUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', color:'var(--txt)' },
            { label:'Unrealised P&L', val: sumHasPrices ? `${sumPL>=0?'+':'-'}$${Math.abs(sumPL).toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: sumHasPrices ? `${sumPLPct>=0?'+':''}${sumPLPct.toFixed(2)}%` : '', color: sumHasPrices?(sumPL>=0?'var(--grn)':'var(--red)'):'var(--txt)' },
            { label:'Holdings',       val:`${merged.length} stocks`, sub: usdInr ? `USD/INR ₹${usdInr.toFixed(2)}` : '', color:'var(--txt)' },
          ].map(m => (
            <div key={m.label} style={{ ...card, padding:'14px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, color:m.color }}>{m.val}</div>
              {m.sub && <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, background: msg.startsWith('✅') ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border:`1px solid ${msg.startsWith('✅') ? 'rgba(0,212,160,0.25)' : 'rgba(255,59,92,0.25)'}`, fontSize:13 }}>
          {msg} <button onClick={() => setMsg('')} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', float:'right' }}>✕</button>
        </div>
      )}

      {/* Portfolio tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={() => { setActivePortId(null); setViewMode('merged'); setMenuPortId(null); }}
          style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:13, fontWeight: !activePortId ? 700 : 500, cursor:'pointer', fontFamily:'inherit',
            border: !activePortId ? '1px solid var(--grn)' : '1px solid var(--tab-inactive-bdr)',
            background: !activePortId ? 'rgba(0,212,160,0.10)' : 'var(--tab-inactive-bg)',
            color: !activePortId ? 'var(--grn)' : 'var(--tab-inactive-txt)', whiteSpace:'nowrap' }}>
          📊 All Portfolios
        </button>
        {usPortfolios.map(p => {
          const isActive = activePortId === p.id;
          const isRenaming = renamingPortId === p.id;
          return (
            <div key={p.id} style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:0 }}>
              {isRenaming ? (
                <>
                  <input autoFocus value={renamePortVal} onChange={e => setRenamePortVal(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') handleRenamePort(); if (e.key==='Escape') setRenamingPortId(null); }}
                    style={{ height:34, borderRadius:'8px 0 0 8px', background:'var(--surf2)', border:'1px solid var(--blu)', borderRight:'none', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:140 }}/>
                  <button onClick={handleRenamePort} style={{ height:34, padding:'0 10px', borderRadius:'0 8px 8px 0', background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>✓</button>
                  <button onClick={() => setRenamingPortId(null)} style={{ height:34, padding:'0 8px', marginLeft:4, borderRadius:8, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setActivePortId(p.id); setViewMode('by-portfolio'); setMenuPortId(null); setUploadPortId(p.id); }}
                    style={{ height:34, padding:'0 12px 0 16px', borderRadius: isActive ? '8px 0 0 8px' : '8px', fontSize:13, fontWeight: isActive ? 700 : 500, cursor:'pointer', fontFamily:'inherit',
                      border: isActive ? '1px solid var(--blu)' : '1px solid var(--tab-inactive-bdr)', borderRight: isActive ? 'none' : undefined,
                      background: isActive ? 'rgba(23,64,245,0.1)' : 'var(--tab-inactive-bg)',
                      color: isActive ? 'var(--bluL)' : 'var(--tab-inactive-txt)' }}>
                    📂 {p.name}
                  </button>
                  {isActive && (
                    <button onClick={e => { e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect(); setMenuPortPos({top:r.bottom+4,left:r.left}); setMenuPortId(m=>m===p.id?null:p.id); }}
                      style={{ height:34, padding:'0 8px', borderRadius:'0 8px 8px 0', border:'1px solid var(--blu)', borderLeft:'1px solid rgba(23,64,245,0.3)', background:'rgba(23,64,245,0.08)', color:'var(--bluL)', cursor:'pointer', fontFamily:'inherit', fontSize:16, lineHeight:1 }}>
                      ⋯
                    </button>
                  )}
                </>
              )}
              {menuPortId === p.id && menuPortPos && (
                <div onClick={e => e.stopPropagation()} style={{ position:'fixed', top:menuPortPos.top, left:menuPortPos.left, zIndex:9999, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.45)', minWidth:160, padding:'4px 0', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
                  <button onClick={() => { setRenamingPortId(p.id); setRenamePortVal(p.name); setMenuPortId(null); }}
                    style={{ width:'100%', height:36, padding:'0 14px', background:'none', border:'none', color:'var(--txt)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    ✏️ Rename
                  </button>
                  <div style={{ height:1, background:'var(--bdr)', margin:'2px 0' }}/>
                  <button onClick={() => { setConfirmDeletePortId(p.id); setMenuPortId(null); }}
                    style={{ width:'100%', height:36, padding:'0 14px', background:'none', border:'none', color:'var(--red)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    🗑️ Delete portfolio
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {showNewPortInput ? (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input autoFocus placeholder="Portfolio name…" value={newPortName} onChange={e => setNewPortName(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') handleCreatePortfolio(); if (e.key==='Escape') { setShowNewPortInput(false); setNewPortName(''); } }}
              style={{ height:34, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:160 }}/>
            <button onClick={handleCreatePortfolio} disabled={!newPortName.trim()||creatingPort}
              style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {creatingPort ? '…' : 'Create'}
            </button>
            <button onClick={() => { setShowNewPortInput(false); setNewPortName(''); }}
              style={{ height:34, padding:'0 10px', borderRadius:8, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => { setShowNewPortInput(true); setMenuPortId(null); }}
            style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'1px dashed var(--tab-inactive-bdr)', background:'var(--tab-inactive-bg)', color:'var(--tab-inactive-txt)' }}>
            + New Portfolio
          </button>
        )}
      </div>

      {/* Delete portfolio confirmation */}
      {confirmDeletePortId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => { if (e.target===e.currentTarget) setConfirmDeletePortId(null); }}>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'28px 32px', maxWidth:400, width:'90%', boxShadow:'0 16px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Delete portfolio?</div>
            <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6, marginBottom:24 }}>
              This will permanently delete <strong style={{ color:'var(--txt)' }}>{usPortfolios.find(p=>p.id===confirmDeletePortId)?.name}</strong> and all its US holdings. Cannot be undone.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDeletePortId(null)} disabled={deletingPort}
                style={{ flex:1, height:42, borderRadius:10, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={() => handleDeletePort(confirmDeletePortId)} disabled={deletingPort}
                style={{ flex:1, height:42, borderRadius:10, background:'var(--red)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor: deletingPort ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: deletingPort ? 0.7 : 1 }}>
                {deletingPort ? '⏳ Deleting…' : '🗑️ Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* US Indices bar */}
      <div style={{ ...card, padding:'12px 18px', marginBottom:16 }}>
        <div className="g4" style={{ display:'grid', gap:10 }}>
          {INDICES.map(idx => {
            const p = idxPrices[idx.sym];
            const isVIX = idx.sym === '^VIX';
            const chg = p?.change_pct ?? null;
            const col = chg == null ? 'var(--dim)' : isVIX ? (chg > 0 ? 'var(--red)' : 'var(--grn)') : (chg >= 0 ? 'var(--grn)' : 'var(--red)');
            return (
              <div key={idx.sym}>
                <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600, marginBottom:3 }}>{idx.name}</div>
                <div style={{ fontSize:15, fontWeight:800 }}>{p?.price != null ? p.price.toLocaleString('en-US',{maximumFractionDigits:2}) : '—'}</div>
                <div style={{ fontSize:11, fontWeight:700, color:col }}>{chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : ''}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* RSU / ESPP quick-access link */}
      <Link href="/dashboard/equity-comp" style={{ textDecoration:'none', display:'block', marginBottom:16 }}>
        <div style={{ ...card, background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.25)',
          display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'14px 18px' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>📊 ESPP &amp; RSU Tracker</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>Track RSU vesting &amp; ESPP grants · Live CMP · Gain/loss · LTCG eligibility · All brokerages</div>
          </div>
          <div style={{ fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:9, background:'rgba(139,92,246,0.15)',
            border:'1px solid rgba(139,92,246,0.35)', color:'var(--pur)', whiteSpace:'nowrap', flexShrink:0, marginLeft:16 }}>Open →</div>
        </div>
      </Link>

      {/* Key metrics */}
      {merged.length > 0 && (
        <div className="g4" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`$${totalInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: usdInr ? `₹${(totalInvestedUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})} equiv` : '', color:'var(--txt)' },
            { label:'Current Value',  val: totalCurrentUSD > 0 ? `$${totalCurrentUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: inrEquiv ? `₹${inrEquiv.toLocaleString('en-IN',{maximumFractionDigits:0})} equiv` : '', color:'var(--txt)' },
            { label:'Unrealised P&L', val: totalPLUSD != null ? `${totalPLUSD >= 0 ? '+' : '-'}$${Math.abs(totalPLUSD).toLocaleString('en-US',{maximumFractionDigits:0})}` : '—',
              sub: totalPLPct != null ? `${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(2)}%` : '', color: totalPLUSD != null ? (totalPLUSD >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' },
            { label:"Today's P&L",   val: `${dayPL >= 0 ? '+' : '-'}$${Math.abs(dayPL).toLocaleString('en-US',{maximumFractionDigits:0})}`, sub:'1-day change', color: dayPL >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map((m, i) => {
            const grads = [
              ['linear-gradient(135deg,rgba(79,111,250,0.12),rgba(23,64,245,0.04))','rgba(79,111,250,0.28)'],
              ['linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.02))','rgba(0,212,160,0.25)'],
              [m.color==='var(--grn)'?'linear-gradient(135deg,rgba(0,212,160,0.12),rgba(0,212,160,0.03))':'linear-gradient(135deg,rgba(255,59,92,0.10),rgba(255,59,92,0.02))', m.color==='var(--grn)'?'rgba(0,212,160,0.28)':'rgba(255,59,92,0.25)'],
              ['linear-gradient(135deg,rgba(255,92,26,0.09),rgba(255,184,0,0.04))','rgba(255,92,26,0.24)'],
            ];
            return (
              <div key={m.label} style={cCard(grads[i][0], grads[i][1])}>
                <div style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>{m.label}</div>
                <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:m.color }}>{m.val}</div>
                {m.sub && <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{m.sub}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ML What-it-analyzes panel */}
      {merged.length > 0 && (
        <div style={{ ...card, marginBottom:12, background:'linear-gradient(135deg,rgba(79,111,250,0.07),rgba(139,92,246,0.04))', borderColor:'rgba(79,111,250,0.22)' }}>
          <button onClick={() => setMlExpanded(v => !v)}
            style={{ width:'100%', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between', padding:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'rgba(79,111,250,0.16)', border:'1px solid rgba(79,111,250,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🤖</div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--txt)' }}>ML Technical Scan — US Stocks</div>
                <div style={{ fontSize:11, color:'var(--dim)' }}>
                  {mlLoading ? '⏳ Scanning your holdings…' : `Scanning ${Object.keys(mlSignals).length} stocks across 9 technical parameters · Click row for full breakdown`}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {!mlLoading && Object.keys(mlSignals).length > 0 && (
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.25)', color:'var(--grn)' }}>● LIVE</span>
              )}
              <span style={{ fontSize:11, color:'var(--dim)' }}>{mlExpanded ? '▲ Hide' : '▼ What does ML look at?'}</span>
            </div>
          </button>
          {mlExpanded && (
            <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:10 }}>
              {[
                { icon:'📊', param:'RSI (14)', desc:'Relative Strength Index — measures momentum. Below 35 = oversold (buy signal), above 70 = overbought (caution). Neutral 35–70.' },
                { icon:'📈', param:'EMA 20 / 50 / 200', desc:'Exponential Moving Averages. Price above EMA200 = long-term bull. EMA20 > EMA50 = uptrend. Price below all EMAs = downtrend warning.' },
                { icon:'⚡', param:'MACD', desc:'Momentum oscillator. Positive MACD = bullish momentum building. Negative = bearish. Used to confirm trend direction from EMAs.' },
                { icon:'🎯', param:'Bollinger Bands %', desc:'BB% shows where price sits within the bands. Near 0% = lower band (oversold), near 100% = upper band (overbought), ~50% = neutral.' },
                { icon:'📦', param:'Volume Ratio', desc:'Today\'s volume vs 20-day average. >1.5x average = institutional interest or news catalyst. Low volume moves are less reliable.' },
                { icon:'🏦', param:'Analyst Consensus', desc:'Wall Street price targets from 10–30+ analysts. Upside to target >15% weighted as bullish. Consensus "Buy/Strong Buy" adds signal.' },
                { icon:'🩳', param:'Short Interest %', desc:'% of float sold short. >10% float shorted = heavy bearish conviction. Can also signal short-squeeze opportunity in a catalyst.' },
                { icon:'📅', param:'Earnings Risk', desc:'Days to next earnings. Earnings within 7 days flagged as binary risk — stock can gap 10–20%. Signal reduces confidence near events.' },
                { icon:'💹', param:'Fundamentals', desc:'P/E, Forward P/E, EV/EBITDA, Revenue growth, Net Margin, ROE, Debt/Equity — contextual factors used with technicals for US stocks.' },
              ].map(m => (
                <div key={m.param} style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:11, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                    <span style={{ fontSize:16 }}>{m.icon}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:'var(--txt)' }}>{m.param}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.6 }}>{m.desc}</div>
                </div>
              ))}
              <div style={{ gridColumn:'1/-1', fontSize:11, color:'var(--dim2)', borderTop:'1px solid var(--card-bdr)', paddingTop:10 }}>
                ⚠️ NOT SEC REGISTERED · Signals are algorithmic estimates based on public market data. Not investment advice. DYOR. Click any stock row for full parameter breakdown.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Holdings table */}
      {merged.length > 0 ? (
        <div style={{ ...card, marginBottom:20, borderColor:'rgba(79,111,250,0.18)', background:'linear-gradient(160deg,rgba(79,111,250,0.04),var(--card-bg))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Holdings {mlLoading && <span style={{ fontSize:11, color:'var(--dim)', fontWeight:400 }}>· fetching ML signals…</span>}</div>
            <div style={{ display:'flex', gap:8 }}></div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','Portfolio','Shares','Avg Cost','CMP','P&L $','P&L %','Momentum Zone',''].map((h, i) => (
                    <th key={i} className={i === 1 ? 'mob-hide' : ''} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayHoldings.map(h => {
                  const p = prices[h.symbol];
                  const cmp = p?.price ?? null;
                  const chg = p?.change_pct ?? null;
                  const pl = (cmp != null && h.avg_price > 0.01) ? (cmp - h.avg_price) * h.qty : null;
                  const plPct = (pl != null && h.avg_price > 0.01) ? (cmp! - h.avg_price) / h.avg_price * 100 : null;
                  const plPos = pl == null || pl >= 0;
                  const ms = mlSignals[h.symbol];
                  return (
                    <tr key={h.id} onClick={() => selectHolding(h)} style={{ cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,111,250,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                        <div style={{ fontSize:10, color:'var(--dim)' }}>{h.exchange} · {h.qty} shares</div>
                      </td>
                      <td className="mob-hide" style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:11, color:'var(--dim)' }}>
                        {h.portfolio_name}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13 }}>{h.qty}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13, whiteSpace:'nowrap' }}>${h.avg_price.toFixed(2)}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap' }}>
                        {cmp != null ? (
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>${cmp.toFixed(2)}</div>
                            {chg != null && <div style={{ fontSize:10, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>}
                          </div>
                        ) : <span style={{ color:'var(--dim2)' }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                        {pl != null ? `${pl >= 0 ? '+' : '-'}$${Math.abs(pl).toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                        {plPct != null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap' }}>
                        {ms ? (
                          <div>
                            <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:800, background:ms.bg, color:ms.color, border:`1px solid ${ms.bdr}` }}>
                              {ms.label}
                            </span>
                            {ms.rsi14 != null && (
                              <div style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>
                                RSI {ms.rsi14.toFixed(0)} · {ms.ema20 && ms.ema50 ? (ms.ema20>ms.ema50?'↑ Up':'↓ Down') : '—'}
                              </div>
                            )}
                          </div>
                        ) : mlLoading ? (
                          <span style={{ fontSize:11, color:'var(--dim2)' }}>⏳</span>
                        ) : <span style={{ color:'var(--dim2)', fontSize:11 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                        <button onClick={e => { e.stopPropagation(); handleDelete(h); }}
                          style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && (
        <div style={{ ...card, textAlign:'center', padding:'40px 20px', marginBottom:20 }}>
          <div style={{ fontSize:28, marginBottom:10 }}>🇺🇸</div>
          {usPortfolios.length === 0 ? (
            <>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Create a portfolio first</div>
              <div style={{ fontSize:12, color:'var(--dim)', marginBottom:20 }}>Click <strong style={{ color:'var(--txt)' }}>+ New Portfolio</strong> above to create a US portfolio (e.g. "Schwab", "Robinhood"), then import your broker file.</div>
              <button onClick={() => setShowNewPortInput(true)}
                style={{ height:38, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                + Create US Portfolio
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No stocks in this portfolio</div>
              <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>
                {uploadPortId ? (
                  <>Importing to <strong style={{ color:'var(--txt)' }}>{usPortfolios.find(p => p.id === uploadPortId)?.name}</strong> — select a file below.</>
                ) : 'Select a portfolio tab above, then add stocks or import a file.'}
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => setAddOpen(true)} style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Stock</button>
                <button onClick={() => fileRef.current?.click()} style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>📂 Import CSV / XLSX</button>
              </div>
              <div style={{ marginTop:12, fontSize:11, color:'var(--dim2)' }}>Schwab · Fidelity · Robinhood · Webull · TD Ameritrade · Merrill Edge · IBKR</div>
            </>
          )}
        </div>
      )}

      {/* Momentum & Swing Picks */}
      <div style={{ ...card, marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Momentum & Sector Picks</div>
        <div style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>Popular US stocks to watch — not SEBI/SEC advice · DYOR</div>
        {Object.entries(MOMENTUM_PICKS).map(([sector, picks]) => (
          <div key={sector} style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{sector}</div>
            <div className="g4" style={{ display:'grid', gap:8 }}>
              {picks.map(pick => {
                const p = momentumPrices[pick.sym];
                const chg = p?.change_pct ?? null;
                const isPos = chg == null || chg >= 0;
                return (
                  <div key={pick.sym} style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${isPos ? 'var(--grn)' : 'var(--red)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontSize:13, fontWeight:800 }}>{pick.sym}</div>
                      {chg != null && <div style={{ fontSize:11, fontWeight:700, color: isPos ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>}
                    </div>
                    <div style={{ fontSize:14, fontWeight:900, marginTop:3 }}>{p?.price != null ? `$${p.price.toFixed(2)}` : '—'}</div>
                    <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{pick.desc}</div>
                    <button onClick={() => { setAddForm(f => ({ ...f, symbol: pick.sym })); setAddOpen(true); }}
                      style={{ marginTop:7, width:'100%', height:26, borderRadius:6, background:'rgba(79,111,250,0.12)', border:'1px solid rgba(79,111,250,0.3)', color:'var(--bluL)', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      + Add to Portfolio
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>



      {/* Add holding modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:18, padding:24, width:'min(400px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.45)' }}>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:18 }}>Add US Stock</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>PORTFOLIO</div>
                <select value={addForm.portfolio_id} onChange={e => setAddForm(f => ({ ...f, portfolio_id:e.target.value }))}
                  style={{ ...inp, width:'100%' }}>
                  {(usPortfolios.length ? usPortfolios : portfolios).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>SYMBOL (e.g. AAPL, NVDA)</div>
                <input autoFocus value={addForm.symbol} onChange={e => setAddForm(f => ({ ...f, symbol:e.target.value.toUpperCase() }))}
                  placeholder="AAPL" style={{ ...inp, width:'100%' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>SHARES</div>
                  <input type="number" value={addForm.qty} onChange={e => setAddForm(f => ({ ...f, qty:e.target.value }))}
                    placeholder="10" style={{ ...inp, width:'100%' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>AVG COST ($)</div>
                  <input type="number" value={addForm.avg_price} onChange={e => setAddForm(f => ({ ...f, avg_price:e.target.value }))}
                    placeholder="150.00" style={{ ...inp, width:'100%' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleAdd}
                  style={{ flex:1, height:38, borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Add Stock
                </button>
                <button onClick={() => setAddOpen(false)}
                  style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock detail modal */}
      {selectedHolding && (() => {
        const h   = selectedHolding;
        const d   = stockDetail;
        const p   = prices[h.symbol];
        const cmp = d?.price ?? p?.price ?? null;
        const chg = d?.change_pct ?? p?.change_pct ?? null;
        const pl    = (cmp != null && h.avg_price > 0.01) ? (cmp - h.avg_price) * h.qty : null;
        const plPct = (pl != null && h.avg_price > 0.01) ? (cmp! - h.avg_price) / h.avg_price * 100 : null;
        const plPos = pl == null || pl >= 0;

        // INR-adjusted return (stock % ± forex %)
        const usdInrReturn = usdInr && h.avg_price > 0 && cmp
          ? ((cmp / h.avg_price) - 1) * 100 : null;

        function Stat({ label, val, sub, color }: { label:string; val:string; sub?:string; color?:string }) {
          return (
            <div style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:9, padding:'9px 12px' }}>
              <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, letterSpacing:0.4, marginBottom:3 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize:13, fontWeight:800, color: color ?? 'var(--txt)' }}>{val}</div>
              {sub && <div style={{ fontSize:9.5, color:'var(--dim)', marginTop:1 }}>{sub}</div>}
            </div>
          );
        }

        function Section({ title }: { title:string }) {
          return <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:4 }}>{title}</div>;
        }

        const consensusColor = (c: string | null) =>
          c === 'buy' || c === 'strong_buy' ? 'var(--grn)'
          : c === 'sell' || c === 'strong_sell' ? 'var(--red)'
          : 'var(--ylw)';

        function fmt(n: Num, suffix = '', prefix = '') { return n != null ? `${prefix}${n}${suffix}` : '—'; }

        return (
          <div onClick={() => { setSelected(null); setDetail(null); }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:20, padding:24, width:'min(560px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.5)', maxHeight:'92vh', overflowY:'auto' }}>

              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:900 }}>{h.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
                    {d?.name ?? h.symbol} · {h.portfolio_name} · {h.qty} shares
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setDetail(null); }}
                  style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'var(--dim)', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>

              {/* Price row */}
              {cmp != null && (
                <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
                  <div style={{ fontSize:28, fontWeight:900 }}>${cmp.toFixed(2)}</div>
                  {chg != null && (
                    <div style={{ fontSize:13, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '+' : ''}{chg.toFixed(2)}% today
                    </div>
                  )}
                  {detailLoading && <div style={{ fontSize:11, color:'var(--dim)' }}>loading details…</div>}
                </div>
              )}

              {/* P&L banner */}
              {pl != null && (
                <div style={{ background: plPos ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border:`1px solid ${plPos ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)' }}>UNREALISED P&L</div>
                    <div style={{ fontSize:22, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{plPos ? '+' : '-'}${Math.abs(pl).toFixed(0)}</div>
                    {usdInr && <div style={{ fontSize:10, color:'var(--dim)' }}>≈ {plPos ? '+' : '-'}₹{(Math.abs(pl)*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)' }}>RETURN</div>
                    <div style={{ fontSize:22, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                      {plPct != null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—'}
                    </div>
                    {usdInr && usdInrReturn != null && (
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>
                        INR adj.: {usdInrReturn >= 0 ? '+' : ''}{usdInrReturn.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Position stats */}
              <Section title="Position" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                <Stat label="Avg Cost"      val={`$${h.avg_price.toFixed(2)}`} />
                <Stat label="Invested"      val={`$${(h.avg_price*h.qty).toFixed(0)}`} sub={usdInr ? `≈ ₹${(h.avg_price*h.qty*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : undefined} />
                <Stat label="Current Value" val={cmp ? `$${(cmp*h.qty).toFixed(0)}` : '—'} sub={(cmp && usdInr) ? `≈ ₹${(cmp*h.qty*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : undefined} />
              </div>

              {d && (
                <>
                  {/* Valuation */}
                  {(d.trailing_pe || d.forward_pe || d.ev_ebitda || d.price_to_sales || d.beta || d.market_cap) && (
                    <>
                      <Section title="Valuation" />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                        {d.trailing_pe    != null && <Stat label="P/E (TTM)"   val={fmt(d.trailing_pe)} />}
                        {d.forward_pe     != null && <Stat label="Forward P/E" val={fmt(d.forward_pe)} />}
                        {d.ev_ebitda      != null && <Stat label="EV/EBITDA"   val={fmt(d.ev_ebitda)} />}
                        {d.price_to_sales != null && <Stat label="P/S"         val={fmt(d.price_to_sales, 'x')} />}
                        {d.beta           != null && <Stat label="Beta"        val={fmt(d.beta)} sub="vs S&P 500" />}
                        {d.market_cap     != null && <Stat label="Market Cap"  val={d.market_cap >= 1e12 ? `$${(d.market_cap/1e12).toFixed(2)}T` : `$${(d.market_cap/1e9).toFixed(1)}B`} />}
                      </div>
                    </>
                  )}

                  {/* Growth & Profitability */}
                  {(d.revenue_growth || d.earnings_growth || d.gross_margin || d.operating_margin || d.net_margin || d.roe) && (
                    <>
                      <Section title="Growth & Profitability" />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                        {d.revenue_growth   != null && <Stat label="Revenue Growth"   val={fmt(d.revenue_growth, '%')}   color={d.revenue_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                        {d.earnings_growth  != null && <Stat label="Earnings Growth"  val={fmt(d.earnings_growth, '%')}  color={d.earnings_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                        {d.gross_margin     != null && <Stat label="Gross Margin"     val={fmt(d.gross_margin, '%')} />}
                        {d.operating_margin != null && <Stat label="Op. Margin"       val={fmt(d.operating_margin, '%')} />}
                        {d.net_margin       != null && <Stat label="Net Margin"       val={fmt(d.net_margin, '%')} />}
                        {d.roe              != null && <Stat label="ROE"              val={fmt(d.roe, '%')} />}
                      </div>
                    </>
                  )}

                  {/* Analyst & Earnings */}
                  {(d.analyst_target || d.next_earnings_date) && (
                    <>
                      <Section title="Analyst & Earnings" />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                        {d.analyst_consensus && <Stat label="Consensus" val={d.analyst_consensus.replace('_',' ').toUpperCase()} color={consensusColor(d.analyst_consensus)} />}
                        {d.analyst_target    != null && <Stat label="Avg Target" val={`$${d.analyst_target}`} sub={d.analyst_count ? `${d.analyst_count} analysts` : undefined} />}
                        {d.upside_to_target  != null && <Stat label="Upside" val={`${d.upside_to_target >= 0 ? '+' : ''}${d.upside_to_target}%`} color={d.upside_to_target >= 10 ? 'var(--grn)' : d.upside_to_target < -5 ? 'var(--red)' : 'var(--ylw)'} />}
                        {d.next_earnings_date && (
                          <Stat label="Next Earnings" val={d.next_earnings_date}
                            sub={d.days_to_earnings != null ? `${d.days_to_earnings}d away` : undefined}
                            color={d.days_to_earnings != null && d.days_to_earnings <= 14 ? 'var(--ylw)' : 'var(--txt)'} />
                        )}
                        {d.analyst_target_low != null && d.analyst_target_high != null && (
                          <Stat label="Target Range" val={`$${d.analyst_target_low}–$${d.analyst_target_high}`} />
                        )}
                      </div>
                    </>
                  )}

                  {/* Dividend & Short */}
                  {(d.dividend_yield || d.short_pct_float) && (
                    <>
                      <Section title="Dividend & Short Interest" />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                        {d.dividend_yield  != null && <Stat label="Div Yield" val={fmt(d.dividend_yield, '%')} color="var(--grn)" />}
                        {d.payout_ratio    != null && <Stat label="Payout Ratio" val={fmt(d.payout_ratio, '%')} />}
                        {d.ex_div_date               && <Stat label="Ex-Div Date" val={d.ex_div_date} />}
                        {d.short_pct_float != null && <Stat label="Short Float" val={fmt(d.short_pct_float, '%')} color={d.short_pct_float > 20 ? 'var(--ylw)' : 'var(--txt)'} />}
                        {d.short_ratio     != null && <Stat label="Short Ratio" val={fmt(d.short_ratio, 'd')} sub="days to cover" />}
                      </div>
                    </>
                  )}

                  {/* Technicals */}
                  <Section title="Technicals" />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                    {d.rsi14   != null && <Stat label="RSI 14"   val={d.rsi14.toString()} color={d.rsi14 > 70 ? 'var(--red)' : d.rsi14 < 35 ? 'var(--grn)' : 'var(--txt)'} />}
                    {d.macd    != null && <Stat label="MACD"     val={d.macd.toString()}  color={d.macd >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                    {d.atr14   != null && <Stat label="ATR 14"   val={`$${d.atr14}`} sub={cmp ? `${(d.atr14/cmp*100).toFixed(1)}% of price` : undefined} />}
                    {d.bb_pct  != null && <Stat label="BB %"     val={`${d.bb_pct}%`} sub="0=lower 100=upper" />}
                    {d.vol_ratio != null && <Stat label="Vol Ratio" val={`${d.vol_ratio}x`} sub="vs 10d avg" color={d.vol_ratio > 2 ? 'var(--ylw)' : 'var(--txt)'} />}
                    {d.from_52h != null && <Stat label="vs 52W High" val={`${d.from_52h}%`} color={d.from_52h > -5 ? 'var(--grn)' : 'var(--dim)'} />}
                    {d.ema20   != null && <Stat label="EMA 20"   val={`$${d.ema20}`} color={cmp && cmp > d.ema20 ? 'var(--grn)' : 'var(--red)'} />}
                    {d.ema50   != null && <Stat label="EMA 50"   val={`$${d.ema50}`} color={cmp && cmp > d.ema50 ? 'var(--grn)' : 'var(--red)'} />}
                    {d.ema200  != null && <Stat label="EMA 200"  val={`$${d.ema200}`} color={cmp && cmp > d.ema200 ? 'var(--grn)' : 'var(--red)'} />}
                  </div>

                  {/* ATR-based position sizing hint */}
                  {d.atr14 != null && h.avg_price > 0 && (
                    <div style={{ background:'rgba(23,64,245,0.06)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:9, padding:'10px 14px', marginBottom:14, fontSize:12 }}>
                      <span style={{ fontWeight:700, color:'var(--bluL)' }}>Position Sizing (1% portfolio risk):</span>
                      <span style={{ color:'var(--dim)', marginLeft:6 }}>
                        Stop 1 ATR below entry → risk ${d.atr14}/share.
                        For $10K portfolio: hold {Math.floor(100 / d.atr14)} shares max.
                      </span>
                    </div>
                  )}

                  {/* Signals */}
                  {d.signals.length > 0 && (
                    <>
                      <Section title="Signals" />
                      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                        {d.signals.map((s, i) => (
                          <div key={i} style={{ fontSize:12, padding:'7px 12px', background:'var(--surf2)', borderRadius:8, border:'1px solid var(--card-bdr)',
                            color: s.startsWith('⚠') ? 'var(--ylw)' : s.includes('bullish') || s.includes('ABOVE') || s.includes('upside') ? 'var(--grn)' : s.includes('bearish') || s.includes('BELOW') || s.includes('elevated') ? 'var(--red)' : 'var(--txt)' }}>
                            {s}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {detailLoading && !d && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                  {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:60, borderRadius:9 }} />)}
                </div>
              )}

              <button onClick={() => { handleDelete(h); setSelected(null); setDetail(null); }}
                style={{ width:'100%', height:38, borderRadius:9, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.25)', color:'var(--red)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                🗑️ Remove from Portfolio
              </button>
            </div>
          </div>
        );
      })()}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
        ⚠️ Prices from Yahoo Finance · Delayed 15-20 min · NOT SEC registered · Not investment advice · DYOR
      </div>
    </div>
  );
}
