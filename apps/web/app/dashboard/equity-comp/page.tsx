'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';
import { ProGate } from '@/components/ProGate';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type EquityType = 'RSU' | 'ESPP';

interface DBGrant {
  id: string; user_id: string; type: EquityType;
  symbol: string; company: string; employer: string;
  shares: number; grant_price: number; vest_date: string | null;
  brokerage: string; notes: string; created_at: string;
}
interface Grant {
  id: string; type: EquityType;
  symbol: string; company: string; employer: string;
  shares: number; grantPrice: number; vestDate: string;
  brokerage: string; notes: string;
}
interface ParsedRow {
  type: EquityType; symbol: string; company: string; employer: string;
  shares: number; grantPrice: number; vestDate: string;
  brokerage: string; notes: string; selected: boolean; duplicate?: boolean;
}
interface LiveData {
  price: number; change_pct: number;
  rsi14?: number; ema20?: number; ema50?: number; signals?: string[];
}

const BROKERAGES = [
  'Schwab Equity Awards','Fidelity NetBenefits','E*TRADE (Morgan Stanley)',
  'UBS Financial','Computershare','Merrill Lynch','Charles Schwab','Vanguard','Other',
];
const EMPTY_FORM: Omit<Grant,'id'> = {
  type:'RSU', symbol:'', company:'', employer:'',
  shares:0, grantPrice:0, vestDate:'', brokerage:'Schwab Equity Awards', notes:'',
};

// ── File parser ───────────────────────────────────────────────────────────────
const SYM_P  = ['symbol','ticker','stock','security','equity symbol','stock symbol'];
const TYPE_P = ['type','grant type','award type','plan type','equity type','transaction type','plan'];
const SHR_P  = ['shares','quantity','qty','units','net shares','shares vested','vested shares','shares purchased','number of shares'];
const PRC_P  = ['price','fmv','fair market value','grant price','award price','vest price','purchase price','price per share','market price','ordinary income per share','cost per share','sale price','grant date fmv'];
const DAT_P  = ['vest date','vesting date','date','purchase date','transaction date','date vested','acquisition date','release date','delivery date'];
const CO_P   = ['company','company name','description','security description','issuer'];

function colIdx(headers: string[], patterns: string[]): number {
  const h = headers.map(s => s.toLowerCase().trim());
  for (const p of patterns) {
    const i = h.findIndex(s => s === p || s.includes(p) || p.includes(s));
    if (i >= 0) return i;
  }
  return -1;
}
function guessType(val: string): EquityType {
  const v = val.toLowerCase();
  if (v.includes('espp') || v.includes('employee stock purchase') || v.includes('purchase')) return 'ESPP';
  return 'RSU';
}
function guessBrokerage(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('schwab')) return 'Schwab Equity Awards';
  if (t.includes('fidelity') || t.includes('netbenefits')) return 'Fidelity NetBenefits';
  if (t.includes('etrade') || t.includes('e*trade') || t.includes('morgan stanley')) return 'E*TRADE (Morgan Stanley)';
  if (t.includes('ubs')) return 'UBS Financial';
  if (t.includes('computershare')) return 'Computershare';
  if (t.includes('merrill')) return 'Merrill Lynch';
  return 'Other';
}
function parseISODate(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  const m = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return '';
}
// ── E*Trade ByBenefitType parser ──────────────────────────────────────────────
// Hierarchical: Grant → Vest Schedule → Tax Withholding rows (63 col sparse format)
// FMV at vest = col41 (Taxable Gain) / col25 (Vested Qty) per vest period
function parseETradeRSU(raw: string[][]): ParsedRow[] {
  if (raw[0]?.[0] !== 'Record Type') return [];
  type VestData  = { vestedQty: number; releasedQty: number; vestDate: string; };
  type TaxData   = { taxableGain: number; withholding: number; };
  type GrantData = { symbol: string; vests: Map<number, VestData>; taxes: Map<number, TaxData> };
  const grants = new Map<string, GrantData>();

  const n = (v: string | undefined) => parseFloat((v ?? '').replace(/[,$%]/g, '')) || 0;

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const rec = r[0];
    if (rec === 'Grant') {
      const grantNum = r[11]; const sym = r[1];
      if (grantNum && sym) grants.set(grantNum, { symbol: sym.trim().toUpperCase(), vests: new Map(), taxes: new Map() });
    } else if (rec === 'Vest Schedule') {
      const g = grants.get(r[11]);
      if (!g) continue;
      const period = parseInt(r[18] || '0');
      const vestDate = parseISODate(r[19] || '');
      if (!vestDate) continue;
      g.vests.set(period, { vestedQty: n(r[25]), releasedQty: n(r[26]), vestDate });
    } else if (rec === 'Tax Withholding') {
      const g = grants.get(r[11]);
      if (!g) continue;
      const period = parseInt(r[18] || '0');
      g.taxes.set(period, { taxableGain: n(r[41]), withholding: n(r[43]) });
    }
  }

  const out: ParsedRow[] = [];
  for (const [grantNum, g] of grants) {
    for (const [period, v] of g.vests) {
      const tax = g.taxes.get(period);
      const fmv = (tax && v.vestedQty > 0) ? tax.taxableGain / v.vestedQty : 0;
      if (v.releasedQty > 0 && v.vestDate && fmv > 0) {
        out.push({
          type: 'RSU', symbol: g.symbol, company: g.symbol, employer: '',
          shares: v.releasedQty, grantPrice: Math.round(fmv * 100) / 100,
          vestDate: v.vestDate, brokerage: 'E*TRADE (Morgan Stanley)',
          notes: `Grant ${grantNum} · Vest ${period}${tax?.withholding ? ` · Tax $${tax.withholding.toFixed(2)}` : ''}`,
          selected: true,
        });
      }
    }
  }
  return out.sort((a, b) => a.vestDate.localeCompare(b.vestDate));
}

function parseRows2D(rows: string[][], brokerage: string): ParsedRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const symI = colIdx(headers, SYM_P);
  const typI = colIdx(headers, TYPE_P);
  const shrI = colIdx(headers, SHR_P);
  const prcI = colIdx(headers, PRC_P);
  const datI = colIdx(headers, DAT_P);
  const coI  = colIdx(headers, CO_P);
  if (symI < 0 || shrI < 0) return [];
  const out: ParsedRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sym = (r[symI] ?? '').toString().trim().toUpperCase()
      .replace(/\.NS$/,'').replace(/\.BO$/,'');
    if (!sym || sym.length > 10) continue;
    const rawShares = (r[shrI] ?? '').toString().replace(/[,\s$]/g,'');
    const shares = parseFloat(rawShares);
    if (!shares || shares <= 0 || isNaN(shares)) continue;
    const rawPrice = prcI >= 0 ? (r[prcI] ?? '').toString().replace(/[,\s$]/g,'') : '0';
    const grantPrice = parseFloat(rawPrice) || 0;
    const vestDate = datI >= 0 ? parseISODate((r[datI] ?? '').toString()) : '';
    const rawType = typI >= 0 ? (r[typI] ?? '').toString() : '';
    const type = rawType ? guessType(rawType) : 'RSU';
    const company = coI >= 0 ? (r[coI] ?? '').toString().trim() : '';
    out.push({ type, symbol:sym, company, employer:'', shares, grantPrice,
      vestDate, brokerage, notes:rawType, selected:true });
  }
  return out;
}

async function parseGrantFile(file: File): Promise<{ rows: ParsedRow[]; error?: string }> {
  const name = file.name.toLowerCase();
  const brokerage = guessBrokerage(name);
  try {
    if (name.endsWith('.pdf')) {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data:buf }).promise;
      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const pg = await pdf.getPage(p);
        const tc = await pg.getTextContent();
        const lineMap = new Map<number, string[]>();
        for (const item of tc.items as { str:string; transform:number[] }[]) {
          const y = Math.round(item.transform[5]);
          if (!lineMap.has(y)) lineMap.set(y, []);
          lineMap.get(y)!.push(item.str);
        }
        const sorted = [...lineMap.entries()].sort((a,b) => b[0]-a[0]);
        for (const [,parts] of sorted) fullText += parts.join('\t') + '\n';
      }
      const lines = fullText.split('\n').map(l => l.split(/\t|,/).map(s => s.trim()));
      return { rows: parseRows2D(lines, guessBrokerage(fullText) || brokerage) };
    }
    if (name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.trim().split('\n').map(l => {
        const row: string[] = []; let cur = ''; let inQ = false;
        for (const ch of l) {
          if (ch === '"') { inQ = !inQ; continue; }
          if (ch === ',' && !inQ) { row.push(cur.trim()); cur = ''; continue; }
          cur += ch;
        }
        row.push(cur.trim());
        return row;
      });
      return { rows: parseRows2D(lines, guessBrokerage(text) || brokerage) };
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array', cellDates:true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header:1, raw:false, dateNF:'yyyy-mm-dd' }) as string[][];
      // E*Trade ByBenefitType format (hierarchical, 63 cols)
      if (raw[0]?.[0] === 'Record Type') {
        const rows = parseETradeRSU(raw);
        if (rows.length > 0) return { rows };
        return { rows: [], error: 'E*Trade file detected but no vest lots parsed. Ensure "Restricted Stock" sheet has Vest Schedule + Tax Withholding rows.' };
      }
      const flatText = raw.flat().join(' ');
      return { rows: parseRows2D(raw, guessBrokerage(flatText) || brokerage) };
    }
    return { rows:[], error:'Unsupported file. Use CSV, XLSX or PDF.' };
  } catch(e) {
    return { rows:[], error:`Parse error: ${e}` };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dbToGrant(r: DBGrant): Grant {
  return { id:r.id, type:r.type, symbol:r.symbol, company:r.company,
    employer:r.employer, shares:r.shares, grantPrice:r.grant_price,
    vestDate:r.vest_date??'', brokerage:r.brokerage, notes:r.notes };
}
function daysSince(d: string) {
  if (!d) return 0;
  return Math.floor((Date.now()-new Date(d).getTime())/86_400_000);
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
}
function sigBadge(signals?: string[]) {
  if (!signals?.length) return { label:'N/A', color:'var(--dim)', bg:'rgba(122,139,170,0.1)', border:'rgba(122,139,170,0.2)' };
  const s = signals.join(' ').toLowerCase();
  if (s.includes('buy')||s.includes('momentum')||s.includes('bullish'))
    return { label:'BUY', color:'var(--grn)', bg:'rgba(0,212,160,0.12)', border:'rgba(0,212,160,0.3)' };
  if (s.includes('sell')||s.includes('bearish')||s.includes('exit'))
    return { label:'SELL', color:'var(--red)', bg:'rgba(255,59,92,0.1)', border:'rgba(255,59,92,0.3)' };
  return { label:'HOLD', color:'var(--ylw)', bg:'rgba(255,184,0,0.1)', border:'rgba(255,184,0,0.3)' };
}
function rsiLabel(rsi?: number) {
  if (!rsi) return { txt:'—', color:'var(--dim)' };
  if (rsi < 35) return { txt:'Oversold', color:'var(--grn)' };
  if (rsi > 70) return { txt:'Overbought', color:'var(--red)' };
  return { txt:'Neutral', color:'var(--ylw)' };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EquityCompPage() {
  const { session } = usePortfolio();
  const fileRef = useRef<HTMLInputElement>(null);

  const [grants,       setGrants]       = useState<Grant[]>([]);
  const [live,         setLive]         = useState<Record<string,LiveData>>({});
  const [usdInr,       setUsdInr]       = useState(84);
  const [addOpen,      setAddOpen]      = useState(false);
  const [editId,       setEditId]       = useState<string|null>(null);
  const [expanded,     setExpanded]     = useState<string|null>(null);
  const [form,         setForm]         = useState<Omit<Grant,'id'>>(EMPTY_FORM);
  const [liveLoad,     setLiveLoad]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState('');
  const [importRows,   setImportRows]   = useState<ParsedRow[]>([]);
  const [importModal,  setImportModal]  = useState(false);
  const [importMsg,    setImportMsg]    = useState('');
  const [importing,    setImporting]    = useState(false);
  const [parseLoading, setParseLoading] = useState(false);

  const fetchGrants = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/equity_grants?user_id=eq.${session.user.id}&order=created_at.desc`,
        { headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      setGrants((await res.json() as DBGrant[]).map(dbToGrant));
    } catch {}
  }, [session]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  useEffect(() => {
    fetch('/api/prices?symbols=USDINR=X').then(r=>r.json())
      .then(d => { if (d['USDINR=X']?.price) setUsdInr(d['USDINR=X'].price); }).catch(()=>{});
  }, []);

  const fetchLive = useCallback(async (list: Grant[]) => {
    const syms = [...new Set(list.map(g=>g.symbol).filter(Boolean))];
    if (!syms.length) return;
    setLiveLoad(true);
    const results: Record<string,LiveData> = {};
    await Promise.all(syms.map(async sym => {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch(`/api/prices?symbols=${sym}`),
          fetch(`/api/stock-detail?symbol=${sym}&exchange=NASDAQ`),
        ]);
        const pData = await pRes.json();
        const dData = await dRes.json();
        results[sym] = { price:pData[sym]?.price??0, change_pct:pData[sym]?.change_pct??0,
          rsi14:dData.rsi14, ema20:dData.ema20, ema50:dData.ema50, signals:dData.signals??[] };
      } catch {}
    }));
    setLive(results);
    setLiveLoad(false);
  }, []);

  useEffect(() => {
    fetchLive(grants);
    const iv = setInterval(()=>fetchLive(grants), 60_000);
    return ()=>clearInterval(iv);
  }, [grants, fetchLive]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setParseLoading(true); setImportMsg('');
    const allRows: ParsedRow[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const { rows, error } = await parseGrantFile(file);
      if (error) errors.push(`${file.name}: ${error}`);
      else if (!rows.length) errors.push(`${file.name}: no grants found`);
      else allRows.push(...rows);
    }
    setParseLoading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (errors.length) setImportMsg(`⚠ ${errors.join(' · ')}`);
    if (!allRows.length) return;
    // Mark rows that already exist in DB (same type+symbol+shares+grantPrice+vestDate)
    const existingKeys = new Set(grants.map(g =>
      `${g.type}|${g.symbol.toUpperCase()}|${g.shares}|${g.grantPrice}|${g.vestDate}`
    ));
    let dupeCount = 0;
    const tagged = allRows.map(r => {
      const key = `${r.type}|${r.symbol.toUpperCase()}|${r.shares}|${r.grantPrice}|${r.vestDate}`;
      const isDupe = existingKeys.has(key);
      if (isDupe) dupeCount++;
      return { ...r, selected: !isDupe, duplicate: isDupe };
    });
    if (dupeCount > 0) setImportMsg(`⚠ ${dupeCount} duplicate${dupeCount > 1 ? 's' : ''} found — already in your grants, auto-deselected.`);
    setImportRows(tagged); setImportModal(true);
  }

  async function handleImportConfirm() {
    if (!session) return;
    const selected = importRows.filter(r=>r.selected);
    if (!selected.length) return;
    setImporting(true);
    const body = selected.map(r => ({
      user_id:session.user.id, type:r.type, symbol:r.symbol, company:r.company,
      employer:r.employer, shares:r.shares, grant_price:r.grantPrice,
      vest_date:r.vestDate||null, brokerage:r.brokerage, notes:r.notes,
    }));
    const res = await fetch(`${SUPA_URL}/rest/v1/equity_grants`, {
      method:'POST',
      headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${session.access_token}`,
        'Content-Type':'application/json', Prefer:'return=minimal' },
      body:JSON.stringify(body),
    });
    setImporting(false);
    if (!res.ok) { setImportMsg(`❌ ${await res.text()}`); return; }
    setImportModal(false); setImportRows([]);
    await fetchGrants();
  }

  function openAdd()  { setForm(EMPTY_FORM); setEditId(null); setAddOpen(true); setMsg(''); }
  function openEdit(g: Grant) {
    setForm({ type:g.type, symbol:g.symbol, company:g.company, employer:g.employer,
      shares:g.shares, grantPrice:g.grantPrice, vestDate:g.vestDate, brokerage:g.brokerage, notes:g.notes });
    setEditId(g.id); setAddOpen(true); setMsg('');
  }
  async function saveGrant() {
    if (!session || !form.symbol || !form.shares || !form.grantPrice) return;
    setSaving(true);
    const body = { user_id:session.user.id, type:form.type, symbol:form.symbol.toUpperCase(),
      company:form.company, employer:form.employer, shares:form.shares,
      grant_price:form.grantPrice, vest_date:form.vestDate||null,
      brokerage:form.brokerage, notes:form.notes };
    try {
      const res = await fetch(
        editId ? `${SUPA_URL}/rest/v1/equity_grants?id=eq.${editId}` : `${SUPA_URL}/rest/v1/equity_grants`,
        { method:editId?'PATCH':'POST',
          headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${session.access_token}`,
            'Content-Type':'application/json', Prefer:'return=minimal' },
          body:JSON.stringify(body) }
      );
      if (!res.ok) { setMsg(`❌ ${await res.text()}`); return; }
      setAddOpen(false); setEditId(null); await fetchGrants();
    } catch(e) { setMsg(`❌ ${e}`); }
    finally { setSaving(false); }
  }
  async function deleteGrant(id: string) {
    if (!session || !confirm('Remove this grant?')) return;
    await fetch(`${SUPA_URL}/rest/v1/equity_grants?id=eq.${id}`, {
      method:'DELETE', headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${session.access_token}` },
    });
    await fetchGrants();
  }

  async function deleteAllGrants() {
    if (!session || !grants.length) return;
    if (!confirm(`Delete ALL ${grants.length} grant${grants.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    await fetch(`${SUPA_URL}/rest/v1/equity_grants?user_id=eq.${session.user.id}`, {
      method:'DELETE', headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${session.access_token}` },
    });
    await fetchGrants();
  }

  const totalValue   = grants.reduce((s,g)=>s+((live[g.symbol]?.price??g.grantPrice)*g.shares),0);
  const totalCost    = grants.reduce((s,g)=>s+(g.grantPrice*g.shares),0);
  const totalGain    = totalValue-totalCost;
  const totalGainPct = totalCost>0?(totalGain/totalCost)*100:0;
  const brokerSet    = [...new Set(grants.map(g=>g.brokerage))];

  const inp: React.CSSProperties = {
    width:'100%', height:40, borderRadius:10, border:'1px solid var(--bdr)',
    background:'var(--surf2)', color:'var(--txt)', padding:'0 12px',
    fontSize:13, fontFamily:'inherit', outline:'none',
  };
  const gc: React.CSSProperties = {
    background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16,
    backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', boxShadow:'var(--card-shadow)',
  };
  const modalStyle: React.CSSProperties = {
    position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
    zIndex:410, background:'var(--card-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
    border:'1px solid var(--card-bdr)', borderRadius:20, boxShadow:'var(--card-shadow)',
  };

  if (!session) return (
    <div style={{ maxWidth:600, margin:'80px auto', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Sign in required</div>
      <div style={{ fontSize:13, color:'var(--dim)' }}>Sign in to track RSU and ESPP grants synced across devices.</div>
    </div>
  );

  return (
    <ProGate feature="equity-comp">
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" multiple
        style={{ display:'none' }} onChange={handleFileChange} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>ESPP &amp; RSU Tracker</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>
            Corporate equity · live value &amp; unrealised gain · ML signals · synced to cloud
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {(liveLoad||parseLoading) && <span style={{ fontSize:11, color:'var(--dim)' }}>{parseLoading?'Parsing…':'Refreshing…'}</span>}
          {grants.length > 0 && (
            <button onClick={deleteAllGrants}
              style={{ height:38, padding:'0 14px', borderRadius:10, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.28)', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🗑️ Delete All
            </button>
          )}
          <button onClick={()=>fileRef.current?.click()}
            style={{ height:38, padding:'0 16px', borderRadius:10, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            📂 Import from Broker
          </button>
          <button onClick={openAdd}
            style={{ height:38, padding:'0 18px', borderRadius:10, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Grant
          </button>
        </div>
      </div>

      {/* Supported formats hint */}
      {importMsg && (
        <div style={{ marginBottom:14, padding:'10px 16px', background:'rgba(255,59,92,0.07)', border:'1px solid rgba(255,59,92,0.22)', borderRadius:11, fontSize:13, color:'var(--red)' }}>
          {importMsg}
        </div>
      )}
      <div style={{ marginBottom:16, padding:'10px 16px', background:'rgba(79,111,250,0.06)', border:'1px solid rgba(79,111,250,0.18)', borderRadius:12, fontSize:12, color:'var(--dim)', display:'flex', gap:8 }}>
        <span style={{ fontSize:15, flexShrink:0 }}>📋</span>
        <span><strong style={{ color:'var(--txt)' }}>Supported:</strong> Schwab Equity Awards · Fidelity NetBenefits · E*TRADE · UBS · Computershare · any CSV/XLSX/PDF with Symbol + Shares + Price + Date columns. Brokerage auto-detected.</span>
      </div>

      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Value (USD)',  val:fmtUSD(totalValue), sub:`≈ ₹${(totalValue*usdInr/100000).toFixed(2)}L`, c:'var(--txt)', grad:'linear-gradient(135deg,rgba(79,111,250,0.14),rgba(23,64,245,0.04))' },
          { label:'Unrealised Gain',   val:`${totalGain>=0?'+':''}${fmtUSD(totalGain)}`, sub:`${totalGainPct>=0?'+':''}${totalGainPct.toFixed(1)}%`, c:totalGain>=0?'var(--grn)':'var(--red)', grad:totalGain>=0?'linear-gradient(135deg,rgba(0,212,160,0.12),rgba(0,212,160,0.02))':'linear-gradient(135deg,rgba(255,59,92,0.12),rgba(255,59,92,0.02))' },
          { label:'Active Grants',     val:String(grants.length), sub:`${grants.filter(g=>g.type==='RSU').length} RSU · ${grants.filter(g=>g.type==='ESPP').length} ESPP`, c:'var(--txt)', grad:'linear-gradient(135deg,rgba(255,184,0,0.10),rgba(255,92,26,0.04))' },
          { label:'Brokerages',        val:String(brokerSet.length||'—'), sub:brokerSet.slice(0,2).join(', ')||'None added', c:'var(--pur)', grad:'linear-gradient(135deg,rgba(139,92,246,0.14),rgba(139,92,246,0.02))' },
        ].map(st => (
          <div key={st.label} style={{ ...gc, padding:'16px 18px', background:st.grad }}>
            <div style={{ fontSize:10, color:'var(--dim)', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{st.label}</div>
            <div style={{ fontSize:19, fontWeight:900, color:st.c, letterSpacing:-0.5 }}>{st.val}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{st.sub}</div>
          </div>
        ))}
      </div>

      {/* Grants list */}
      {grants.length === 0 ? (
        <div style={{ ...gc, textAlign:'center', padding:'56px 24px' }}>
          <div style={{ fontSize:44, marginBottom:14 }}>💼</div>
          <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>No grants added yet</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginBottom:22, maxWidth:440, margin:'0 auto 22px', lineHeight:1.65 }}>
            Import a broker file or add manually. Track live market value, tax lot status and ML signals for each grant.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={()=>fileRef.current?.click()}
              style={{ height:42, padding:'0 22px', borderRadius:10, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              📂 Import from Broker
            </button>
            <button onClick={openAdd}
              style={{ height:42, padding:'0 22px', borderRadius:10, background:'var(--blu)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              + Add Manually
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {grants.map(g => {
            const ld       = live[g.symbol];
            const price    = ld?.price??0;
            const gainUSD  = price?(price-g.grantPrice)*g.shares:0;
            const gainPct  = g.grantPrice>0?((price-g.grantPrice)/g.grantPrice)*100:0;
            const days     = daysSince(g.vestDate);
            const isLTCG   = days>=365;
            const sig      = sigBadge(ld?.signals);
            const isExp    = expanded===g.id;
            const emaUp    = ld?.ema20&&ld?.ema50&&ld.ema20>ld.ema50;
            const abvEma50 = price>0&&ld?.ema50&&price>ld.ema50;
            return (
              <div key={g.id} style={{ ...gc, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', padding:'15px 18px', gap:14, flexWrap:'wrap' }}>
                  <div style={{ width:52, height:52, borderRadius:13, flexShrink:0,
                    background:g.type==='RSU'?'rgba(79,111,250,0.1)':'rgba(0,212,160,0.1)',
                    border:`1px solid ${g.type==='RSU'?'rgba(79,111,250,0.3)':'rgba(0,212,160,0.3)'}`,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ fontSize:11, fontWeight:800, color:g.type==='RSU'?'var(--bluL)':'var(--grn)' }}>{g.type}</div>
                    <div style={{ fontSize:9.5, color:'var(--dim)', marginTop:1 }}>{g.shares}sh</div>
                  </div>
                  <div style={{ minWidth:130 }}>
                    <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3 }}>{g.symbol}</div>
                    <div style={{ fontSize:11, color:'var(--dim)' }}>{g.company||g.employer||'—'}</div>
                    <div style={{ fontSize:10, color:'var(--dim2)', marginTop:1 }}>{g.brokerage}</div>
                  </div>
                  <div style={{ minWidth:110 }}>
                    <div style={{ fontSize:15, fontWeight:800 }}>{price?fmtUSD(price):'—'}</div>
                    <div style={{ fontSize:11, color:(ld?.change_pct??0)>=0?'var(--grn)':'var(--red)' }}>
                      {ld?`${ld.change_pct>=0?'+':''}${ld.change_pct.toFixed(2)}%`:'fetching…'}
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim2)' }}>grant {fmtUSD(g.grantPrice)}</div>
                  </div>
                  <div style={{ minWidth:110 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:gainUSD>=0?'var(--grn)':'var(--red)' }}>
                      {price?`${gainUSD>=0?'+':''}${fmtUSD(gainUSD)}`:'—'}
                    </div>
                    <div style={{ fontSize:11, color:gainPct>=0?'var(--grn)':'var(--red)' }}>
                      {price?`${gainPct>=0?'+':''}${gainPct.toFixed(1)}%`:''}
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim2)' }}>since vest</div>
                  </div>
                  <div style={{ minWidth:86 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
                      background:sig.bg, border:`1px solid ${sig.border}`, fontSize:11, fontWeight:800, color:sig.color }}>
                      {sig.label}
                    </span>
                    <div style={{ fontSize:10, marginTop:4, color:emaUp?'var(--grn)':'var(--red)', fontWeight:600 }}>
                      {ld?.ema20&&ld?.ema50?(emaUp?'↑ Uptrend':'↓ Downtrend'):'—'}
                    </div>
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right', minWidth:130 }}>
                    <div style={{ fontSize:10, padding:'3px 8px', borderRadius:6, display:'inline-block', marginBottom:3,
                      background:isLTCG?'rgba(0,212,160,0.1)':'rgba(255,184,0,0.1)',
                      color:isLTCG?'var(--grn)':'var(--ylw)', fontWeight:700 }}>
                      {isLTCG?'✓ LTCG eligible':`⏳ ${Math.max(0,365-days)}d to LTCG`}
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim2)' }}>
                      {days}d held · {g.vestDate?new Date(g.vestDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'}):'—'}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={()=>setExpanded(isExp?null:g.id)}
                      style={{ height:30, padding:'0 10px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      {isExp?'▲':'▼ Details'}
                    </button>
                    <button onClick={()=>openEdit(g)}
                      style={{ height:30, width:30, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✏️</button>
                    <button onClick={()=>deleteGrant(g.id)}
                      style={{ height:30, width:30, borderRadius:8, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', color:'var(--red)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                  </div>
                </div>
                {isExp && (
                  <div style={{ borderTop:'1px solid var(--card-bdr)', background:'var(--surf2)', padding:'16px 18px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:ld?.signals?.length?14:0 }}>
                      {[
                        { label:'RSI (14)',   val:ld?.rsi14?.toFixed(1)??'—', sub:rsiLabel(ld?.rsi14).txt, subC:rsiLabel(ld?.rsi14).color },
                        { label:'EMA 20',     val:ld?.ema20?.toFixed(2)??'—', sub:ld?.ema20?(price>ld.ema20?'Above':'Below')+' EMA20':'—', subC:ld?.ema20?(price>ld.ema20?'var(--grn)':'var(--red)'):'var(--dim)' },
                        { label:'EMA 50',     val:ld?.ema50?.toFixed(2)??'—', sub:ld?.ema50?(abvEma50?'Above':'Below')+' EMA50':'—', subC:abvEma50?'var(--grn)':'var(--red)' },
                        { label:'Total Value',val:price?fmtUSD(price*g.shares):'—', sub:price?`≈ ₹${((price*g.shares*usdInr)/100000).toFixed(2)}L`:'', subC:'var(--dim)' },
                        { label:'Gain/Share', val:price?`${gainUSD>=0?'+':''}${fmtUSD(price-g.grantPrice)}`:'—', sub:`vs grant ${fmtUSD(g.grantPrice)}`, subC:'var(--dim)' },
                      ].map(m => (
                        <div key={m.label} style={{ ...gc, padding:'12px 14px' }}>
                          <div style={{ fontSize:10, color:'var(--dim)', marginBottom:4, fontWeight:600 }}>{m.label}</div>
                          <div style={{ fontSize:20, fontWeight:900 }}>{m.val}</div>
                          <div style={{ fontSize:10, color:m.subC, fontWeight:600, marginTop:2 }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>
                    {ld?.signals && ld.signals.length>0 && (
                      <div>
                        <div style={{ fontSize:10, color:'var(--dim)', marginBottom:6, fontWeight:700, letterSpacing:0.5 }}>ML SIGNALS</div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {ld.signals.map((s,i) => (
                            <span key={i} style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.06)', border:'1px solid var(--card-bdr)' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {g.notes && (
                      <div style={{ marginTop:12, fontSize:12, color:'var(--dim)', borderTop:'1px solid var(--card-bdr)', paddingTop:10 }}>
                        <strong style={{ color:'var(--txt)' }}>Notes: </strong>{g.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop:20, padding:'12px 16px', background:'rgba(255,184,0,0.04)', border:'1px solid rgba(255,184,0,0.14)', borderRadius:12 }}>
        <p style={{ fontSize:11, color:'rgba(255,184,0,0.7)', lineHeight:1.65 }}>
          <strong style={{ color:'var(--ylw)' }}>⚠️ NOT SEBI/SEC REGISTERED.</strong> Prices via Yahoo Finance (may be delayed 15 min). LTCG thresholds shown for reference — consult a tax advisor. Not investment advice. DYOR.
        </p>
      </div>

      {/* ── Import Preview Modal ── */}
      {importModal && (
        <>
          <div onClick={()=>setImportModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:400 }}/>
          <div style={{ ...modalStyle, width:'96%', maxWidth:780, maxHeight:'88vh', overflowY:'auto', padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:800 }}>Review Imported Grants</div>
                <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>{importRows.filter(r=>r.selected).length} of {importRows.length} selected · deselect any you don&apos;t want</div>
              </div>
              <button onClick={()=>setImportModal(false)}
                style={{ width:30, height:30, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>✕</button>
            </div>
            {importMsg && (
              <div style={{ marginBottom:12, padding:'9px 13px', borderRadius:9, fontSize:13, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.25)' }}>
                {importMsg}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
              <div style={{ display:'grid', gridTemplateColumns:'28px 56px 1fr 76px 76px 100px 1fr', gap:10, padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.4 }}>
                <div/><div>Type</div><div>Symbol</div><div>Shares</div><div>Price</div><div>Vest Date</div><div>Brokerage</div>
              </div>
              {importRows.map((r,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'28px 56px 1fr 76px 76px 100px 1fr', gap:10, alignItems:'center',
                  padding:'10px', borderRadius:10, opacity:r.selected?1:0.45,
                  background: r.duplicate ? 'rgba(255,59,92,0.05)' : r.selected ? 'var(--surf2)' : 'var(--surf)',
                  border:`1px solid ${r.duplicate ? 'rgba(255,59,92,0.25)' : r.selected ? 'var(--card-bdr)' : 'transparent'}` }}>
                  <input type="checkbox" checked={r.selected} style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--blu)' }}
                    onChange={()=>setImportRows(rows=>rows.map((x,j)=>j===i?{...x,selected:!x.selected}:x))}/>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:6, textAlign:'center',
                    background:r.type==='RSU'?'rgba(79,111,250,0.15)':'rgba(0,212,160,0.12)',
                    color:r.type==='RSU'?'var(--bluL)':'var(--grn)', border:'1px solid currentColor' }}>
                    {r.type}
                  </span>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{r.symbol}</div>
                      {r.duplicate && <span style={{ fontSize:9, fontWeight:800, padding:'1px 5px', borderRadius:4, background:'rgba(255,59,92,0.15)', color:'var(--red)', border:'1px solid rgba(255,59,92,0.3)', letterSpacing:0.5 }}>DUPLICATE</span>}
                    </div>
                    {r.company&&<div style={{ fontSize:11, color:'var(--dim)' }}>{r.company}</div>}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.shares.toLocaleString()}</div>
                  <div style={{ fontSize:13 }}>{r.grantPrice?`$${r.grantPrice.toFixed(2)}`:'—'}</div>
                  <div style={{ fontSize:12, color:'var(--dim)' }}>{r.vestDate||'—'}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.brokerage}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setImportRows(rows=>rows.map(r=>({...r,selected:true})))}
                style={{ height:36, padding:'0 14px', borderRadius:9, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                Select All
              </button>
              <button onClick={()=>setImportModal(false)}
                style={{ height:36, padding:'0 14px', borderRadius:9, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={handleImportConfirm} disabled={importing||!importRows.some(r=>r.selected)}
                style={{ height:36, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
                {importing?'⏳ Saving…':`✓ Import ${importRows.filter(r=>r.selected).length} Grants`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      {addOpen && (
        <>
          <div onClick={()=>setAddOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300 }}/>
          <div style={{ ...modalStyle, width:'92%', maxWidth:540, maxHeight:'90vh', overflowY:'auto', padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <div style={{ fontSize:18, fontWeight:800 }}>{editId?'Edit':'Add'} Equity Grant</div>
              <button onClick={()=>setAddOpen(false)}
                style={{ width:30, height:30, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>✕</button>
            </div>
            {msg&&<div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, fontSize:13,
              background:msg.startsWith('✅')?'rgba(0,212,160,0.08)':'rgba(255,59,92,0.08)',
              border:`1px solid ${msg.startsWith('✅')?'rgba(0,212,160,0.25)':'rgba(255,59,92,0.25)'}` }}>{msg}</div>}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:8, fontWeight:600 }}>Grant Type</div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                {(['RSU','ESPP'] as EquityType[]).map(t=>(
                  <button key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                    style={{ flex:1, height:42, borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit',
                      border:`1px solid ${form.type===t?(t==='RSU'?'rgba(79,111,250,0.6)':'rgba(0,212,160,0.6)'):'var(--bdr)'}`,
                      background:form.type===t?(t==='RSU'?'rgba(79,111,250,0.12)':'rgba(0,212,160,0.12)'):'transparent',
                      color:form.type===t?(t==='RSU'?'var(--bluL)':'var(--grn)'):'var(--dim)' }}>
                    {t==='RSU'?'🔒 RSU — Restricted Stock':'💰 ESPP — Employee Purchase'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:'var(--dim)', background:'var(--surf2)', padding:'9px 12px', borderRadius:9, lineHeight:1.55 }}>
                {form.type==='RSU'?'Enter FMV at vest date as "Grant Price" — the price reported as income by employer.':'Enter your actual purchase price (typically 85% of market at offering period start/end).'}
              </div>
            </div>
            {([
              { label:'Stock Symbol *', key:'symbol', ph:'AAPL, MSFT, GOOG…', t:'text' },
              { label:'Company Name',   key:'company', ph:'Apple Inc, Microsoft Corp…', t:'text' },
              { label:'Your Employer',  key:'employer', ph:'If different from company', t:'text' },
            ] as { label:string; key:keyof Omit<Grant,'id'>; ph:string; t:string }[]).map(f=>(
              <div key={f.key} style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>{f.label}</div>
                <input type={f.t} value={form[f.key] as string}
                  onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))}
                  placeholder={f.ph} style={inp}/>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>Shares *</div>
                <input type="number" min="0" value={form.shares||''} placeholder="e.g. 150" style={inp}
                  onChange={e=>setForm(f=>({...f,shares:parseFloat(e.target.value)||0}))}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>{form.type==='RSU'?'FMV at Vest (USD) *':'Purchase Price (USD) *'}</div>
                <input type="number" min="0" step="0.01" value={form.grantPrice||''} placeholder="e.g. 185.50" style={inp}
                  onChange={e=>setForm(f=>({...f,grantPrice:parseFloat(e.target.value)||0}))}/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>{form.type==='RSU'?'Vest Date':'Purchase Date'}</div>
                <input type="date" value={form.vestDate} style={{ ...inp, colorScheme:'dark' }}
                  onChange={e=>setForm(f=>({...f,vestDate:e.target.value}))}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>Brokerage</div>
                <select value={form.brokerage} style={inp} onChange={e=>setForm(f=>({...f,brokerage:e.target.value}))}>
                  {BROKERAGES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>Notes (optional)</div>
              <textarea value={form.notes} rows={2} placeholder="Grant ID, vesting cliff, 4-year schedule…"
                style={{ ...inp, height:'auto', padding:'10px 12px', resize:'vertical' }}
                onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setAddOpen(false)}
                style={{ flex:1, height:44, borderRadius:12, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={saveGrant} disabled={saving||!form.symbol||!form.shares||!form.grantPrice}
                style={{ flex:2, height:44, borderRadius:12, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  background:(form.symbol&&form.shares&&form.grantPrice)&&!saving?'var(--blu)':'rgba(23,64,245,0.35)' }}>
                {saving?'⏳ Saving…':editId?'Save Changes':'Add Grant'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </ProGate>
  );
}
