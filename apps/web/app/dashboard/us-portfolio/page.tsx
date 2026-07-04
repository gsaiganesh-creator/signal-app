'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';
import { StockDetailSheet } from '@/components/StockDetailSheet';
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
  const { portfolios, session, createPortfolio, renamePortfolio, deletePortfolio } = usePortfolio();
  const [allHoldings, setAllHoldings] = useState<USHolding[]>([]);
  const [prices, setPrices]           = useState<PriceMap>({});
  const [idxPrices, setIdxPrices]     = useState<PriceMap>({});
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPortId, setUploadPortId] = useState<string | null>(null);
  const [manualUSPortIds, setManualUSPortIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { const s = localStorage.getItem('signal_us_port_ids'); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  });
  const [menuPortId, setMenuPortId] = useState<string|null>(null);
  const [renamingPortId, setRenamingPortId] = useState<string|null>(null);
  const [renamePortVal, setRenamePortVal] = useState('');
  const [confirmDeletePortId, setConfirmDeletePortId] = useState<string|null>(null);
  const [deletingPort, setDeletingPort] = useState(false);
  const [showNewPortInput, setShowNewPortInput] = useState(false);
  const [mlSignals, setMlSignals] = useState<Record<string, MLSignal>>({});
  const [mlLoading, setMlLoading] = useState(false);
  const [contentTab, setContentTab] = useState<'holdings' | 'espp'>('holdings');
  const [selectedGrant, setSelectedGrant] = useState<GrantRow | null>(null);

  // Close port dropdown on outside click/scroll
  useEffect(() => {
    if (!menuPortId) return;
    const close = () => { setMenuPortId(null); };
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

  useEffect(() => { fetchIndices(); }, [fetchIndices]);
  useEffect(() => {
    const syms = [...new Set(allHoldings.map(h => h.symbol))];
    if (syms.length) fetchPrices(syms);
    else { setPrices({}); setLoading(false); }
  }, [allHoldings, fetchPrices]);

  // ── RSU / ESPP grants ────────────────────────────────────────────────────────
  interface GrantRow { symbol: string; shares: number; grant_price: number; type: string; }
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [grantPrices, setGrantPrices] = useState<PriceMap>({});

  const fetchGrants = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/equity_grants?user_id=eq.${session.user.id}&select=symbol,shares,grant_price,type`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const rows: GrantRow[] = await res.json();
      setGrants(rows);
      // Only fetch prices for valid tickers (not garbage CSV data)
      const TICKER = /^[A-Z]{1,6}$/;
      const syms = [...new Set(rows.map(r => (r.symbol||'').trim().toUpperCase()).filter(s => TICKER.test(s)))];
      if (syms.length) {
        const pr = await fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`);
        if (pr.ok) setGrantPrices(await pr.json());
      }
    } catch { /* ignore */ }
  }, [session]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

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

  // RSU/ESPP totals
  // Only count grants with valid ticker symbols (1-6 uppercase letters, e.g. QCOM, MSFT)
  const TICKER_RE = /^[A-Z]{1,6}$/;
  const validGrants = grants.filter(g => TICKER_RE.test((g.symbol || '').trim().toUpperCase()));
  const rsuInvestedUSD = validGrants.reduce((s, g) => s + (g.shares * (g.grant_price || 0)), 0);
  const rsuCurrentUSD  = validGrants.reduce((s, g) => {
    const p = grantPrices[g.symbol?.toUpperCase()]?.price;
    return s + (p != null ? g.shares * p : g.shares * (g.grant_price || 0));
  }, 0);
  const rsuPL        = rsuCurrentUSD - rsuInvestedUSD;
  const rsuHasPrices = validGrants.some(g => grantPrices[g.symbol?.toUpperCase()]?.price != null);
  const rsuCount     = grants.length;
  const validCount   = validGrants.length;
  const rsuSymbols   = [...new Set(validGrants.map(g => g.symbol.trim().toUpperCase()))].slice(0, 6);

  // Combined totals (stocks + RSU)
  const combinedInvested = sumInvestedUSD + rsuInvestedUSD;
  const combinedCurrent  = sumCurrentUSD  + rsuCurrentUSD;
  const combinedPL       = combinedCurrent - combinedInvested;

  return (
    <div style={{ maxWidth:1200 }}>
      {/* India / US toggle */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[
          { label:'🇮🇳 India', href:'/dashboard/portfolio', active:false },
          { label:'🇺🇸 US',    href:'/dashboard/us-portfolio', active:true },
        ].map(t => (
          <a key={t.href} href={t.href} style={{
            height:34, padding:'0 18px', borderRadius:9, fontSize:13, fontWeight:700,
            display:'flex', alignItems:'center', textDecoration:'none', cursor:'pointer',
            background: t.active ? 'var(--blu)' : 'var(--surf2)',
            border: `1px solid ${t.active ? 'var(--blu)' : 'var(--bdr)'}`,
            color: t.active ? '#fff' : 'var(--dim)',
          }}>{t.label}</a>
        ))}
      </div>

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


      {msg && (
        <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, background: msg.startsWith('✅') ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border:`1px solid ${msg.startsWith('✅') ? 'rgba(0,212,160,0.25)' : 'rgba(255,59,92,0.25)'}`, fontSize:13 }}>
          {msg} <button onClick={() => setMsg('')} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', float:'right' }}>✕</button>
        </div>
      )}

      {/* Portfolio widgets */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:10, marginBottom:18 }}>

        {/* All portfolios aggregate card */}
        {(() => {
          const isAll = !activePortId;
          const hasPx = merged.some(h => prices[h.symbol]?.price != null) || rsuHasPrices;
          const plPct = combinedInvested > 0 ? (combinedPL / combinedInvested) * 100 : 0;
          return (
            <button key="all" onClick={() => { setActivePortId(null); setViewMode('merged'); setMenuPortId(null); }}
              style={{ border: isAll ? '1.5px solid var(--grn)' : '1px solid var(--bdr)',
                background: isAll ? 'linear-gradient(135deg,rgba(0,212,160,0.10),var(--surf))' : 'var(--surf)',
                borderRadius:14, padding:'14px 16px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                boxShadow: isAll ? '0 0 0 3px rgba(0,212,160,0.12)' : 'none', transition:'box-shadow 0.2s' }}>
              <div style={{ fontSize:11, fontWeight:700, color: isAll ? 'var(--grn)' : 'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
                📊 All Portfolios
              </div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)' }}>
                ${combinedCurrent.toLocaleString('en-US',{maximumFractionDigits:0})}
              </div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>
                ${combinedInvested.toLocaleString('en-US',{maximumFractionDigits:0})} invested
              </div>
              {hasPx && combinedInvested > 0 && (
                <div style={{ fontSize:13, fontWeight:800, marginTop:6, color: combinedPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {combinedPL >= 0 ? '+' : ''}{plPct.toFixed(1)}% · {combinedPL >= 0 ? '+' : '-'}${Math.abs(combinedPL).toLocaleString('en-US',{maximumFractionDigits:0})}
                </div>
              )}
              <div style={{ fontSize:10, color:'var(--dim2)', marginTop:5 }}>
                {merged.length} stocks · {usPortfolios.length} accounts{validCount > 0 ? ` · ${validCount} RSU/ESPP` : ''}
              </div>
            </button>
          );
        })()}

        {/* Per-portfolio cards */}
        {usPortfolios.map(p => {
          const isActive = activePortId === p.id;
          const isRenaming = renamingPortId === p.id;
          const portH  = allHoldings.filter(h => h.portfolio_id === p.id);
          const portInv = portH.reduce((s, h) => s + (h.avg_price > 0.01 ? h.avg_price * h.qty : 0), 0);
          const portCur = portH.reduce((s, h) => { const pr = prices[h.symbol]?.price; return s + (pr != null ? pr * h.qty : (h.avg_price > 0.01 ? h.avg_price * h.qty : 0)); }, 0);
          const portPL = portCur - portInv;
          const portPLPct = portInv > 0 ? (portPL / portInv) * 100 : 0;
          const hasPx = portH.some(h => prices[h.symbol]?.price != null);
          return (
            <div key={p.id} style={{ position:'relative',
              border: isActive ? '1.5px solid var(--blu)' : '1px solid var(--bdr)',
              background: isActive ? 'linear-gradient(135deg,rgba(23,64,245,0.09),var(--surf))' : 'var(--surf)',
              borderRadius:14, padding:'14px 16px',
              boxShadow: isActive ? '0 0 0 3px rgba(23,64,245,0.12)' : 'none', transition:'box-shadow 0.2s' }}>

              {/* Header row: name + action buttons */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6, gap:4 }}>
                {isRenaming ? (
                  <div style={{ display:'flex', gap:4, flex:1 }}>
                    <input autoFocus value={renamePortVal} onChange={e => setRenamePortVal(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') handleRenamePort(); if (e.key==='Escape') setRenamingPortId(null); }}
                      style={{ flex:1, height:26, borderRadius:6, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', outline:'none', minWidth:0 }}/>
                    <button onClick={handleRenamePort} style={{ height:26, padding:'0 8px', borderRadius:6, background:'var(--blu)', border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>✓</button>
                    <button onClick={() => setRenamingPortId(null)} style={{ height:26, padding:'0 6px', borderRadius:6, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:11, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>✕</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setActivePortId(p.id); setViewMode('by-portfolio'); setMenuPortId(null); setUploadPortId(p.id); }}
                      style={{ flex:1, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', fontFamily:'inherit', minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color: isActive ? 'var(--bluL)' : 'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        📂 {p.name}
                      </div>
                    </button>
                    <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                      <button onClick={e => { e.stopPropagation(); setRenamingPortId(p.id); setRenamePortVal(p.name); setMenuPortId(null); }}
                        title="Rename"
                        style={{ width:22, height:22, borderRadius:5, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:10, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ✏️
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDeletePortId(p.id); }}
                        title="Delete"
                        style={{ width:22, height:22, borderRadius:5, background:'transparent', border:'1px solid rgba(255,59,92,0.2)', color:'var(--red)', fontSize:10, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Amounts — click anywhere to select */}
              <div onClick={() => { setActivePortId(p.id); setViewMode('by-portfolio'); setMenuPortId(null); setUploadPortId(p.id); }}
                style={{ cursor:'pointer' }}>
                <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)' }}>
                  ${portCur.toLocaleString('en-US',{maximumFractionDigits:0})}
                </div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>
                  ${portInv.toLocaleString('en-US',{maximumFractionDigits:0})} invested
                </div>
                {hasPx && portInv > 0 && (
                  <div style={{ fontSize:13, fontWeight:800, marginTop:6, color: portPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                    {portPL >= 0 ? '+' : ''}{portPLPct.toFixed(1)}% · {portPL >= 0 ? '+' : '-'}${Math.abs(portPL).toLocaleString('en-US',{maximumFractionDigits:0})}
                  </div>
                )}
                <div style={{ fontSize:10, color:'var(--dim2)', marginTop:5 }}>{portH.length} holdings</div>
              </div>
            </div>
          );
        })}

        {/* Add new portfolio card */}
        {showNewPortInput ? (
          <div style={{ border:'1px dashed var(--blu)', borderRadius:14, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5 }}>New Portfolio</div>
            <input autoFocus placeholder="Portfolio name…" value={newPortName} onChange={e => setNewPortName(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') handleCreatePortfolio(); if (e.key==='Escape') { setShowNewPortInput(false); setNewPortName(''); } }}
              style={{ height:32, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:13, padding:'0 10px', fontFamily:'inherit', outline:'none' }}/>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={handleCreatePortfolio} disabled={!newPortName.trim()||creatingPort}
                style={{ flex:1, height:30, borderRadius:7, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {creatingPort ? '…' : 'Create'}
              </button>
              <button onClick={() => { setShowNewPortInput(false); setNewPortName(''); }}
                style={{ height:30, padding:'0 10px', borderRadius:7, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowNewPortInput(true); setMenuPortId(null); }}
            style={{ border:'1px dashed var(--bdr)', borderRadius:14, padding:'14px 16px', cursor:'pointer', fontFamily:'inherit',
              background:'transparent', color:'var(--dim)', fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, minHeight:120 }}>
            <span style={{ fontSize:22 }}>+</span>
            <span style={{ fontSize:11, fontWeight:600 }}>New Portfolio</span>
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

      {/* Content-type tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, borderBottom:'1px solid var(--bdr)', paddingBottom:0 }}>
        {([
          { key:'holdings', label:'📋 Holdings'  },
          { key:'espp',     label:'📊 ESPP & RSU' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setContentTab(t.key)}
            style={{ height:36, padding:'0 16px', borderRadius:0, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
              fontSize:13, fontWeight: contentTab === t.key ? 700 : 500,
              color: contentTab === t.key ? 'var(--bluL)' : 'var(--dim)',
              borderBottom: contentTab === t.key ? '2px solid var(--bluL)' : '2px solid transparent',
              marginBottom:-1, transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

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
      {/* RSU / ESPP summary card */}
      {contentTab === 'espp' && <div style={{ ...card, background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.25)', marginBottom:16, padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: rsuCount > 0 ? 14 : 0 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>📊 ESPP &amp; RSU Grants</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
              {validCount > 0
                ? `${validCount} grant${validCount !== 1 ? 's' : ''} · ${rsuSymbols.join(', ')}${rsuSymbols.length < validGrants.filter((g,i,a)=>a.findIndex(x=>x.symbol===g.symbol)===i).length ? ' …' : ''}`
                : rsuCount > 0 ? `${rsuCount} entries — check symbols in ESPP & RSU Tracker` : 'No grants added yet · Import broker file to see live value'}
            </div>
          </div>
          <Link href="/dashboard/equity-comp" style={{ textDecoration:'none', fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:9, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.35)', color:'var(--pur)', whiteSpace:'nowrap', flexShrink:0, marginLeft:16 }}>
            {rsuCount > 0 ? 'Manage →' : 'Add Grants →'}
          </Link>
        </div>
        {rsuCount > 0 && (
          <div className="us-rsu-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'RSU Invested', val:`$${rsuInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: usdInr ? `≈ ₹${(rsuInvestedUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', color:'var(--pur)' },
              { label:'RSU Current', val: rsuHasPrices ? `$${rsuCurrentUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: (rsuHasPrices&&usdInr) ? `≈ ₹${(rsuCurrentUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', color:'var(--txt)' },
              { label:'RSU P&L', val: rsuHasPrices ? `${rsuPL>=0?'+':'-'}$${Math.abs(rsuPL).toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: rsuHasPrices&&rsuInvestedUSD>0 ? `${((rsuPL/rsuInvestedUSD)*100).toFixed(2)}%` : '', color: rsuHasPrices?(rsuPL>=0?'var(--grn)':'var(--red)'):'var(--txt)' },
              { label:'Combined Total', val: `$${combinedCurrent.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: `P&L ${combinedPL>=0?'+':'-'}$${Math.abs(combinedPL).toLocaleString('en-US',{maximumFractionDigits:0})} · Stocks + RSU`, color:'var(--txt)' },
            ].map(m => (
              <div key={m.label} style={{ background:'rgba(139,92,246,0.08)', borderRadius:10, padding:'10px 12px', border:'1px solid rgba(139,92,246,0.18)' }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:4 }}>{m.label}</div>
                <div style={{ fontSize:16, fontWeight:900, color:m.color }}>{m.val}</div>
                {m.sub && <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{m.sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* ESPP & RSU grants table */}
      {contentTab === 'espp' && grants.length > 0 && (
        <div style={{ ...card, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Your Grants</div>
            <Link href="/dashboard/equity-comp" style={{ fontSize:11, color:'var(--pur)', fontWeight:600, textDecoration:'none' }}>Full tracker →</Link>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Symbol','Type','Shares','Grant Price','CMP','Unrealised P&L'].map((h,i) => (
                  <th key={i} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 10px', textAlign:'left', borderBottom:'1px solid rgba(139,92,246,0.2)', textTransform:'uppercase' as const, letterSpacing:0.4, whiteSpace:'nowrap' as const }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {grants.map((g, i) => {
                  const sym  = (g.symbol||'').trim().toUpperCase();
                  const cmp  = grantPrices[sym]?.price ?? null;
                  const pl   = cmp != null && g.grant_price > 0 ? (cmp - g.grant_price) * g.shares : null;
                  const plPct = (pl != null && g.grant_price > 0) ? (cmp! - g.grant_price) / g.grant_price * 100 : null;
                  return (
                    <tr key={i} onClick={() => { const sym = (g.symbol||'').trim().toUpperCase(); if (/^[A-Z]{1,6}$/.test(sym)) setSelectedGrant(g); }} style={{ cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(139,92,246,0.05)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(139,92,246,0.1)', fontWeight:700, fontSize:13 }}>{sym}</td>
                      <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(139,92,246,0.1)', fontSize:11 }}>
                        <span style={{ padding:'2px 8px', borderRadius:20, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.3)', color:'var(--pur)', fontSize:10, fontWeight:700 }}>{g.type}</span>
                      </td>
                      <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(139,92,246,0.1)', fontSize:12 }}>{g.shares.toLocaleString()}</td>
                      <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(139,92,246,0.1)', fontSize:12 }}>${g.grant_price.toFixed(2)}</td>
                      <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(139,92,246,0.1)', fontSize:12, fontWeight:700 }}>{cmp != null ? `$${cmp.toFixed(2)}` : '—'}</td>
                      <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(139,92,246,0.1)', fontSize:12, fontWeight:700, color: pl == null ? 'var(--dim)' : pl >= 0 ? 'var(--grn)' : 'var(--red)', whiteSpace:'nowrap' as const }}>
                        {pl != null ? `${pl >= 0 ? '+' : '-'}$${Math.abs(pl).toFixed(0)}` : '—'}
                        {plPct != null && <div style={{ fontSize:10, fontWeight:700 }}>{plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contentTab === 'espp' && grants.length === 0 && (
        <div style={{ ...card, textAlign:'center', padding:'40px 20px', marginBottom:20 }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📊</div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>No grants added yet</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Import your broker file or add RSU/ESPP grants manually.</div>
          <Link href="/dashboard/equity-comp" style={{ height:38, padding:'0 20px', borderRadius:9, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.35)', color:'var(--pur)', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
            Go to ESPP & RSU Tracker →
          </Link>
        </div>
      )}

      {/* Key metrics */}
      {contentTab === 'holdings' && merged.length > 0 && (
        <div className="us-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`$${totalInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: usdInr ? `₹${(totalInvestedUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})} equiv` : '', color:'var(--txt)' },
            { label:'Current Value',  val: totalCurrentUSD > 0 ? `$${totalCurrentUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: inrEquiv ? `₹${inrEquiv.toLocaleString('en-IN',{maximumFractionDigits:0})} equiv` : '', color:'var(--txt)' },
            { label:'Unrealised P&L', val: totalPLUSD != null ? `${totalPLUSD >= 0 ? '+' : '-'}$${Math.abs(totalPLUSD).toLocaleString('en-US',{maximumFractionDigits:0})}` : '—',
              sub: totalPLPct != null ? `${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(2)}%` : '', color: totalPLUSD != null ? (totalPLUSD >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' },
            { label:"Today's P&L",   val: `${dayPL >= 0 ? '+' : '-'}$${Math.abs(dayPL).toLocaleString('en-US',{maximumFractionDigits:0})}`, sub:'1-day change', color: dayPL >= 0 ? 'var(--grn)' : 'var(--red)' },
            { label:'Holdings',       val:`${merged.length} stocks`, sub: usdInr ? `USD/INR ₹${usdInr.toFixed(2)}` : '', color:'var(--txt)' },
          ].map((m, i) => {
            const grads = [
              ['linear-gradient(135deg,rgba(79,111,250,0.12),rgba(23,64,245,0.04))','rgba(79,111,250,0.28)'],
              ['linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.02))','rgba(0,212,160,0.25)'],
              [m.color==='var(--grn)'?'linear-gradient(135deg,rgba(0,212,160,0.12),rgba(0,212,160,0.03))':'linear-gradient(135deg,rgba(255,59,92,0.10),rgba(255,59,92,0.02))', m.color==='var(--grn)'?'rgba(0,212,160,0.28)':'rgba(255,59,92,0.25)'],
              ['linear-gradient(135deg,rgba(255,92,26,0.09),rgba(255,184,0,0.04))','rgba(255,92,26,0.24)'],
              ['linear-gradient(135deg,rgba(139,92,246,0.09),rgba(79,111,250,0.03))','rgba(139,92,246,0.22)'],
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

      {/* Holdings table */}
      {contentTab === 'holdings' && (merged.length > 0 ? (
        <div style={{ ...card, marginBottom:20, borderColor:'rgba(79,111,250,0.18)', background:'linear-gradient(160deg,rgba(79,111,250,0.04),var(--card-bg))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Holdings {mlLoading && <span style={{ fontSize:11, color:'var(--dim)', fontWeight:400 }}>· fetching ML signals…</span>}</div>
            <div style={{ display:'flex', gap:8 }}></div>
          </div>
          {/* Empty state for a specific portfolio with no stocks (other portfolios have stocks) */}
          {displayHoldings.length === 0 && viewMode === 'by-portfolio' && activePortId && (
            <div style={{ textAlign:'center', padding:'30px 20px', borderTop:'1px solid var(--bdr)' }}>
              <div style={{ fontSize:22, marginBottom:8 }}>📂</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>
                No stocks in {usPortfolios.find(p => p.id === activePortId)?.name ?? 'this portfolio'}
              </div>
              <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Add stocks manually or import a broker file.</div>
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => setAddOpen(true)} style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Stock</button>
                <button onClick={() => fileRef.current?.click()} style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>📂 Import CSV / XLSX</button>
                <Link href="/dashboard/brokers" style={{ height:36, padding:'0 16px', borderRadius:9, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.3)', color:'var(--bluL)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>🔗 Connect Broker (Plaid)</Link>
              </div>
            </div>
          )}
          <div style={{ overflowX:'auto', display: displayHoldings.length === 0 ? 'none' : 'block' }}>
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
                    <tr key={h.id} onClick={() => setSelected(h)} style={{ cursor:'pointer', transition:'background 0.1s' }}
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
                <Link href="/dashboard/brokers" style={{ height:38, padding:'0 16px', borderRadius:9, background:'linear-gradient(135deg,rgba(23,64,245,0.15),rgba(79,111,250,0.1))', border:'1px solid rgba(23,64,245,0.35)', color:'var(--bluL)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>🔗 Connect Broker (Plaid)</Link>
              </div>
              <div style={{ marginTop:12, fontSize:11, color:'var(--dim2)' }}>Schwab · Fidelity · Robinhood · Webull · TD Ameritrade · Merrill Edge · IBKR · E*TRADE</div>
            </>
          )}
        </div>
      ))}




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

      {/* Stock detail sheet — holdings */}
      {selectedHolding && (
        <StockDetailSheet
          symbol={selectedHolding.symbol}
          exchange={selectedHolding.exchange}
          onClose={() => setSelected(null)}
          holding={{
            qty: selectedHolding.qty,
            avgPrice: selectedHolding.avg_price,
            currency: 'USD',
            usdInr: usdInr,
            portfolioName: selectedHolding.portfolio_name,
            onDelete: () => { handleDelete(selectedHolding); setSelected(null); },
          }}
        />
      )}

      {/* Stock detail sheet — RSU/ESPP grants */}
      {selectedGrant && (
        <StockDetailSheet
          symbol={selectedGrant.symbol.trim().toUpperCase()}
          exchange="NYSE"
          onClose={() => setSelectedGrant(null)}
          holding={{
            qty: selectedGrant.shares,
            avgPrice: selectedGrant.grant_price,
            currency: 'USD',
            usdInr: usdInr,
            portfolioName: `${selectedGrant.type} Grant`,
          }}
        />
      )}


      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
        ⚠️ Prices from Yahoo Finance · Delayed 15-20 min · NOT SEC registered · Not investment advice · DYOR
      </div>
    </div>
  );
}
