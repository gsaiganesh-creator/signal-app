'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';
import type { MlClass } from '@/lib/supabase/types';
import dynamic from 'next/dynamic';

const PortfolioChart      = dynamic(() => import('@/components/PortfolioChart').then(m => ({ default: m.PortfolioChart })), { ssr: false });
const PortfolioShareCard  = dynamic(() => import('@/components/PortfolioShareCard').then(m => ({ default: m.PortfolioShareCard })), { ssr: false });
import { PortfolioRiskCard } from '@/components/PortfolioRiskCard';
import { DividendTracker } from '@/components/DividendTracker';
import { StockDetailSheet } from '@/components/StockDetailSheet';

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
  is_etf?: boolean;
  isin?: string;
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

type ParsedRow = { symbol: string; qty: number; avg_price: number; exchange: Exchange; is_etf?: boolean; isin?: string };

// ISIN → NSE ticker for common Indian ETFs/MFs in demat form
const ISIN_NSE: Record<string, string> = {
  // Nippon India
  'INF204KC1089': 'PHARMABEES',    // Nippon India Nifty Pharma ETF
  'INF204KC1402': 'SILVERBEES',    // Nippon India Silver ETF
  'INF204K01EY4': 'GOLDBEES',      // Nippon India Gold ETF
  'INF204KB13I2': 'LIQUIDBEES',    // Nippon India Liquid BeES
  'INF457M01133': 'CPSEETF',       // Nippon India CPSE ETF
  'INF457M01174': 'PSUBNKBEES',    // Nippon India PSU Bank BeES
  'INF204K01FH2': 'JUNIORBEES',    // Nippon India Junior BeES (Nifty Next 50)
  'INF204K01158': 'NIFTYBEES',     // Nippon India Nifty BeES
  'INF204K01735': 'BANKBEES',      // Nippon India Bank BeES
  // ICICI Prudential
  'INF109KC1Q72': 'ICICIHEALTHETF', // ICICI Prudential Nifty Healthcare ETF
  'INF109K01VN7': 'ICICIB22',
  'INF109KC1FQ4': 'ICICIMIDCAP',
  'INF109KA1Z96': 'ICICISENSX',    // ICICI Prudential S&P BSE Sensex ETF
  // Mirae Asset
  'INF769K01LY7': 'METALETF',      // Mirae Asset Nifty Metal ETF
  'INF769K01DI4': 'MAFANG',        // Mirae Asset NYSE FANG+ ETF
  'INF769K01EW0': 'MAHANOI',
  // SBI
  'INF200KA1787': 'SETFNIF50',     // SBI Nifty 50 ETF
  'INF200K01VS2': 'SETFNIFBK',     // SBI Nifty Bank ETF
  // HDFC
  'INF179K01WW6': 'HDFCNIFTY',     // HDFC Nifty 50 ETF
  'INF179KA1SG0': 'HDFCSILVER',    // HDFC Silver ETF
  // Kotak
  'INF174KA1AL1': 'KOTAKNIFTY',
  'INF174K01LS2': 'KOTAK SENSEX',
  // DSP
  'INF740K01PS3': 'DSPNIFTY',
  // Motilal Oswal
  'INF247L01FE5': 'MOM50',         // Motilal Oswal Nifty 50 ETF
  'INF247L01FB1': 'MOM100',        // Motilal Oswal Nifty 100 ETF
  'INF247L01EZ1': 'MOGSEC',        // Motilal Oswal G-Sec ETF
  // Aditya Birla
  'INF209KA12Y2': 'ABSLNIFTY',
  // Quantum
  'INF082J01096': 'QGOLDHALF',     // Quantum Gold Fund
  // BHARAT
  'INF204KB1ZJ5': 'NV20BEES',      // Nippon Nifty50 Value 20 ETF
  // UTI
  'INF789FK1JQ0': 'UTINIFTETF',
  'INF789FC1GD8': 'UTISENSETF',
};

function deriveEtfSymbol(securityName: string): string {
  const n = securityName.toUpperCase();
  if (n.includes('SILVER'))                                   return 'SILVERBEES';
  if (n.includes('GOLD'))                                     return 'GOLDBEES';
  if (n.includes('CPSE'))                                     return 'CPSEETF';
  if (n.includes('METAL'))                                    return 'METALETF';
  if (n.includes('PHARMA') || n.includes('PHARMABEES'))      return 'PHARMABEES';
  if (n.includes('HEALTHCARE'))                               return 'ICICIHEALTHETF';
  if (n.includes('PSU BANK') || n.includes('PSUBANK'))       return 'PSUBNKBEES';
  if (n.includes('LIQUID'))                                   return 'LIQUIDBEES';
  if (n.includes('NEXT 50') || n.includes('NEXT50'))         return 'JUNIORBEES';
  if (n.includes('SENSEX') || n.includes('BSE 30'))          return 'SETFSENSX';
  if (n.includes('BANK NIFTY') || n.includes('BANKNIFTY'))   return 'BANKBEES';
  if (n.includes('NIFTY 50') || n.includes('NIFTY50'))       return 'NIFTYBEES';
  if (n.includes('NASDAQ') || n.includes('FANG'))            return 'MAFANG';
  // Generic: strip fund house prefix, clean to alphanumeric
  const afterHash = n.includes('#') ? n.split('#')[1].trim() : n;
  const cleaned = afterHash
    .replace(/MIRAE ASSET ?/g,'MA').replace(/NIPPON INDIA ?/g,'NI').replace(/ICICI PRUDENTIAL ?/g,'')
    .replace(/SBI ?/g,'').replace(/HDFC ?/g,'').replace(/KOTAK ?/g,'')
    .replace(/NIFTY ?/g,'').replace(/ ETF.*/g,'ETF').replace(/[^A-Z0-9]/g,'');
  return cleaned.slice(0, 15) || 'ETF';
}

async function parsePdf(file: File): Promise<{ result: ParsedRow[]; debug: string }> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      fullText += content.items
        .map((it: unknown) => (it && typeof it === 'object' && 'str' in it ? (it as { str: string }).str : ''))
        .join(' ') + '\n';
    }

    // Find all ISINs first — both equity (INE) and ETF/MF (INF)
    const isinRe = /\b(IN[A-Z0-9]{10})\b/g;
    const allIsins = [...fullText.matchAll(isinRe)];

    // Accept as DP statement if: known broker keyword found OR at least 1 ISIN present
    const isDp = /MIRAE ASSET|CDSL|NSDL|TOTAL HOLDING|DEPOSITORY PARTICIPANT|DP STATEMENT|ICICI DIRECT|ICICI SECURITIES|ANGEL ONE|ANGEL BROKING|ZERODHA|UPSTOX|GROWW|5PAISA|MOTILAL OSWAL|KOTAK SECURITIES|AXIS SECURITIES|SHAREKHAN|IIFL|HDFC SECURITIES/i.test(fullText)
              || allIsins.length >= 1;
    if (!isDp) {
      return { result: [], debug: `PDF: no broker keywords or ISINs found. Got ${allIsins.length} ISIN(s). Try uploading a Holdings/Portfolio PDF from your broker, or use CSV/Excel export instead.` };
    }

    const results: ParsedRow[] = [];

    for (let i = 0; i < allIsins.length; i++) {
      const isin  = allIsins[i][1];
      const start = (allIsins[i].index ?? 0) + 12;
      const end   = i + 1 < allIsins.length ? (allIsins[i + 1].index ?? fullText.length) : fullText.length;
      const chunk = fullText.slice(start, end);

      const nums = [...chunk.matchAll(/(\d[\d,]*\.?\d*)/g)]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => !isNaN(n));

      if (!nums.length) continue;

      // DP format cols: FREE_BAL PLEDGE LOCKEDIN PENDING TOTAL_HOLDING RATE VALUE
      // TOTAL_HOLDING = index 4. Fallback: first positive integer in chunk.
      const qty = nums.length >= 5
        ? nums[4]
        : (nums.find(n => n > 0 && Number.isInteger(n)) ?? nums.find(n => n > 0) ?? 0);
      if (qty <= 0 || qty > 1e8) continue;

      const nameMatch = chunk.match(/^([^0-9\n]+?)(?=\s*\d)/);
      const rawName   = (nameMatch?.[1] ?? '').trim();
      const shortName = rawName.includes('#') ? rawName.split('#')[1].trim() : rawName;

      // INF prefix = ETF/MF, INE prefix = equity stock
      const isEtf = isin.startsWith('INF');
      const symbol = ISIN_NSE[isin]
        ?? (isEtf ? deriveEtfSymbol(shortName) : (ISIN_NSE_EQUITY[isin] ?? deriveEtfSymbol(shortName)));

      results.push({ symbol, qty: Math.round(qty), avg_price: 0.001, exchange: 'NSE', is_etf: isEtf, isin });
    }

    if (!results.length) {
      // ── ICICI Direct name-based fallback ──────────────────────────────────
      // ICICI Direct portfolio PDF: columns = Stock Name | LTP | %Change | Market Value | Allocated Qty
      // Company names are ALL CAPS, no ISIN column. Use LTP as avg_price placeholder.
      // NOTE: +/- on %change may be CSS-injected (not in PDF text), so treat it as optional.
      if (/ICICI/i.test(fullText) || /Allocated\s*Qty/i.test(fullText) || /allocated\s*qty/i.test(fullText)) {
        const SKIP = /^(STOCK|TOTAL|VALUE|LTP|CHANGE|MARKET|PLEDGE|FREEZE|BLOCK|MANDATE|ACTION|ALLOCATED|BUY|SELL|GTT|NAME|QTY|FOR|SAM|FREEZE|DELIVERY)/;
        // Pattern: ALLCAPS_NAME  LTP  optional_%change  market_value  qty_integer
        // {2,50}? is lazy syntax (? AFTER closing brace). + sign may be CSS-only, so [+-]? optional.
        const iciRe = /([A-Z][A-Z &.'/-]{2,50}?)\s+([\d,]+\.\d{1,2})\s+[+-]?[\d.]+%?\s+[\d,]+(?:\.\d{1,2})?\s+(\d{1,8})/g;
        for (const m of [...fullText.matchAll(iciRe)]) {
          const rawName = m[1].trim().replace(/\s+/g, ' ');
          if (SKIP.test(rawName)) continue;
          if (rawName.length < 3 || rawName.length > 60) continue;
          const ltp = parseFloat(m[2].replace(/,/g, ''));
          const qty = parseInt(m[3], 10);
          if (ltp <= 0 || qty <= 0 || qty > 1e7) continue;
          const sym = companyNameToTicker(rawName);
          if (!sym || sym.length < 2) continue;
          results.push({ symbol: sym, qty, avg_price: ltp, exchange: 'NSE', is_etf: false });
        }
        if (results.length) {
          return {
            result: results,
            debug: `ICICI_DIRECT: ${results.length} holdings parsed. avg_price pre-filled with LTP — edit each holding for accurate P&L.`,
          };
        }
        // Zero matches — expose first 400 chars of extracted text for debugging
        const snippet = fullText.replace(/\s+/g, ' ').slice(0, 400);
        return { result: [], debug: `ICICI detected but regex matched 0 rows. PDF text sample: "${snippet}"` };
      }
      const hint = allIsins.length === 0
        ? `PDF: 0 ISINs and no parseable rows. Try: broker app → Export CSV/Excel instead of printing to PDF.`
        : `PDF DP: ${allIsins.length} ISINs found but no valid qty rows. PDF layout may be non-standard.`;
      return { result: [], debug: hint };
    }
    const etfCount = results.filter(r => r.is_etf).length;
    const eqCount  = results.length - etfCount;
    return {
      result: results,
      debug: `PDF MStock DP: ${results.length} holdings (${eqCount} equity + ${etfCount} ETF/MF). Enter avg cost in each row.`,
    };
  } catch (e) {
    return { result: [], debug: `PDF error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ISIN → NSE ticker lookup used by the HDFC Securities CSV parser
// (HDFC format has no ticker column — Company_Name is full legal name, not NSE symbol)
const ISIN_NSE_EQUITY: Record<string, string> = {
  // ── Confirmed from user HDFC sample ─────────────────────────────────────────
  'INE117A01022':'ABB',        'INE793A01012':'ACCELYA',    'INE837H01020':'ADVENZYMES',
  'INE715B01021':'ANDHRSUGAR', 'INE208A01029':'ASHOKLEY',   'INE296A01032':'BAJFINANCE',
  'INE258A01024':'BEML',       'INE171Z01026':'BDL',        'INE263A01024':'BEL',
  'INE029A01011':'BPCL',
  // ── Nifty 50 ────────────────────────────────────────────────────────────────
  'INE002A01018':'RELIANCE',   'INE009A01021':'INFY',       'INE467B01029':'TCS',
  'INE040A01034':'HDFCBANK',   'INE090A01021':'ICICIBANK',  'INE062A01020':'SBIN',
  'INE238A01034':'AXISBANK',   'INE585B01010':'SUNPHARMA',  'INE018A01030':'ITC',
  'INE154A01025':'HINDUNILVR', 'INE883A01011':'WIPRO',      'INE113A01013':'HINDALCO',
  'INE476A01014':'HCLTECH',    'INE860A01027':'KOTAKBANK',  'INE397D01024':'BAJAJFINSV',
  'INE361B01024':'BAJAJ-AUTO', 'INE695A01022':'MARUTI',     'INE158A01026':'TATAMOTORS',
  'INE155A01022':'TATASTEEL',  'INE216A01030':'ONGC',       'INE101A01026':'COALINDIA',
  'INE245A01021':'DIVISLAB',   'INE214T01019':'APOLLOHOSP', 'INE752E01010':'NTPC',
  'INE066A01021':'POWERGRID',  'INE160A01022':'ULTRACEMCO', 'INE070A01015':'BHARTIARTL',
  'INE129A01019':'GAIL',       'INE092T01019':'DMART',      'INE647O01011':'ZOMATO',
  'INE669C01036':'TECHM',      'INE200A01026':'LT',         'INE484J01027':'JSWSTEEL',
  'INE274J01014':'ADANIGREEN', 'INE424L01027':'ADANIPORTS', 'INE999J01020':'ADANIENT',
  // ── Banks ───────────────────────────────────────────────────────────────────
  'INE084A01016':'INDUSINDBK', 'INE562A01011':'PNB',        'INE667A01018':'CANBK',
  'INE565A01014':'BANKINDIA',  'INE476L01027':'UNIONBANK',  'INE077A01010':'BANKBARODA',
  'INE019A01038':'FEDERALBNK', 'INE761H01022':'BANDHANBNK', 'INE414G01012':'IDFCFIRSTB',
  'INE092A01019':'YESBANK',    'INE491A01021':'RBLBANK',
  // ── IT ──────────────────────────────────────────────────────────────────────
  'INE124A01023':'MPHASIS',    'INE849A01020':'LTTS',       'INE591G01017':'COFORGE',
  'INE121J01017':'PERSISTENT', 'INE001A01036':'LTIM',       'INE266F01018':'KPITTECH',
  // ── Pharma ──────────────────────────────────────────────────────────────────
  'INE406A01037':'CIPLA',      'INE317A01021':'DRREDDY',    'INE471A01022':'LUPIN',
  'INE960A01022':'ALKEM',      'INE149A01033':'GLENMARK',   'INE372A01015':'TORNTPHARM',
  'INE044A01036':'AUROPHARMA', 'INE058F01010':'IPCALAB',
  // ── Auto ────────────────────────────────────────────────────────────────────
  'INE917I01010':'M&M',        'INE153A01047':'HEROMOTOCO', 'INE031A01017':'EICHERMOT',
  'INE213A01029':'MRF',        'INE854D01024':'HAVELLS',
  // ── FMCG ────────────────────────────────────────────────────────────────────
  'INE058A01010':'NESTLEIND',  'INE051A01026':'DABUR',      'INE192A01025':'GODREJCP',
  'INE749A01029':'BRITANNIA',  'INE684F01012':'PIDILITIND', 'INE768C01010':'ASIANPAINT',
  'INE303A01023':'BERGEPAINT', 'INE345A01011':'MARICO',     'INE274A01040':'COLPAL',
  'INE003A01024':'TATACONSUM',
  // ── Energy / Oil ────────────────────────────────────────────────────────────
  'INE050A01025':'IOC',        'INE154B01012':'HINDPETRO',  'INE242A01010':'TATAPOWER',
  'INE364U01010':'TORNTPOWER', 'INE522F01014':'ADANIPOWER',
  // ── Metals ──────────────────────────────────────────────────────────────────
  'INE361A01010':'SAIL',       'INE081A01020':'NATIONALUM', 'INE049A01027':'HINDZINC',
  'INE038A01020':'VEDL',       'INE376G01013':'NMDC',
  // ── Cement ──────────────────────────────────────────────────────────────────
  'INE256A01028':'AMBUJACEM',  'INE012A01025':'ACC',        'INE366A01041':'SHREECEM',
  // ── Capital Goods ───────────────────────────────────────────────────────────
  'INE522A01014':'SIEMENS',    'INE101D01020':'BHEL',       'INE385A01022':'HAL',
  'INE603J01030':'POLYCAB',    'INE543H01014':'CUMMINSIND',
  // ── Finance / NBFC ──────────────────────────────────────────────────────────
  'INE410P01011':'HDFCLIFE',   'INE269A01021':'SBILIFE',    'INE721I01026':'MUTHOOTFIN',
  'INE918I01026':'CHOLAFIN',   'INE340A01012':'LICHSGFIN',  'INE388A01029':'MANAPPURAM',
  'INE880J01024':'PFC',        'INE975G01012':'RECLTD',     'INE053A01029':'BAJAJHLDNG',
  'INE155P01022':'IRFC',       'INE481G01011':'ICICIGI',
  // ── Real Estate ─────────────────────────────────────────────────────────────
  'INE191H01014':'DLF',        'INE741K01010':'GODREJPROP',
  // ── Consumer / Others ───────────────────────────────────────────────────────
  'INE758T01015':'IRCTC',      'INE152A01029':'TITAN',      'INE301A01014':'VOLTAS',
  'INE070E01018':'APOLLOTYRE', 'INE133A01011':'PAGEIND',    'INE188A01016':'EXIDEIND',
  'INE463A01038':'AMARAJABAT', 'INE174A01027':'MCDOWELL-N', 'INE260B01010':'UBL',
  // ── Additional equities (Upstox / ICICI user portfolios) ─────────────────
  'INE442H01029':'ASHOKA',     'INE021A01026':'ASIANPAINT', 'INE284H01025':'DCAL',
  'INE127D01025':'HDFCAMC',    'INE030A01027':'HINDUNILVR', 'INE022Q01020':'IEX',
  'INE149O01028':'IREDA',      'INE093I01010':'CDSL',       'INE335Y01020':'NSDL',
  'INE202B01012':'BSE',
};

// Stocks where full company name doesn't derive to NSE symbol naturally
const COMPANY_NAME_NSE: Record<string, string> = {
  'INDIAN OVERSEAS BANK':          'IOB',
  'STATE BANK OF INDIA':           'SBIN',
  'PUNJAB NATIONAL BANK':          'PNB',
  'CANARA BANK':                   'CANBK',
  'BANK OF BARODA':                'BANKBARODA',
  'BANK OF INDIA':                 'BANKINDIA',
  'UNION BANK OF INDIA':           'UNIONBANK',
  'CENTRAL BANK OF INDIA':         'CENTRALBK',
  'UCO BANK':                      'UCOBANK',
  'INDIAN BANK':                   'INDIANB',
  'MAHARASHTRA BANK':              'MAHABANK',
  'KARNATAKA BANK':                'KTKBANK',
  'SOUTH INDIAN BANK':             'SOUTHBANK',
  'FEDERAL BANK':                  'FEDERALBNK',
  'IDFC FIRST BANK':               'IDFCFIRSTB',
  'BANDHAN BANK':                  'BANDHANBNK',
  'RBL BANK':                      'RBLBANK',
  'YES BANK':                      'YESBANK',
  'HDFC BANK':                     'HDFCBANK',
  'ICICI BANK':                    'ICICIBANK',
  'KOTAK MAHINDRA BANK':           'KOTAKBANK',
  'AXIS BANK':                     'AXISBANK',
  'INDUSIND BANK':                 'INDUSINDBK',
  'LIC OF INDIA':                  'LICI',
  'LIFE INSURANCE CORPORATION':    'LICI',
  'TATA CONSULTANCY SERVICES':     'TCS',
  'INFOSYS':                       'INFY',
  'RELIANCE INDUSTRIES':           'RELIANCE',
  'OIL AND NATURAL GAS':           'ONGC',
  'BHARAT PETROLEUM':              'BPCL',
  'HINDUSTAN PETROLEUM':           'HINDPETRO',
  'INDIAN OIL':                    'IOC',
  'POWER GRID':                    'POWERGRID',
  'NATIONAL THERMAL POWER':        'NTPC',
  'STEEL AUTHORITY':               'SAIL',
  'BHARAT HEAVY ELECTRICALS':      'BHEL',
  'HINDUSTAN AERONAUTICS':         'HAL',
  'DEFENCE RESEARCH':              'DRDO',
  'MAHANAGAR GAS':                 'MGL',
  'INDRAPRASTHA GAS':              'IGL',
  'GUJARAT GAS':                   'GUJGASLTD',
  'TATA MOTORS':                   'TATAMOTORS',
  'MARUTI SUZUKI':                 'MARUTI',
  'HERO MOTOCORP':                 'HEROMOTOCO',
  'BAJAJ AUTO':                    'BAJAJ-AUTO',
  'EICHER MOTORS':                 'EICHERMOT',
  'MAHINDRA':                      'M&M',
  'TATA STEEL':                    'TATASTEEL',
  'HINDALCO':                      'HINDALCO',
  'VEDANTA':                       'VEDL',
  'NATIONAL ALUMINIUM':            'NATIONALUM',
  'JSW STEEL':                     'JSWSTEEL',
  'LARSEN':                        'LT',
  'ULTRATECH CEMENT':              'ULTRACEMCO',
  'SHREE CEMENT':                  'SHREECEM',
  'AMBUJA CEMENTS':                'AMBUJACEM',
  'ACC':                           'ACC',
  'ASIAN PAINTS':                  'ASIANPAINT',
  'BERGER PAINTS':                 'BERGEPAINT',
  'PIDILITE':                      'PIDILITIND',
  'NESTLE':                        'NESTLEIND',
  'HINDUSTAN UNILEVER':            'HINDUNILVR',
  'ITC':                           'ITC',
  'DABUR':                         'DABUR',
  'MARICO':                        'MARICO',
  'COLGATE':                       'COLPAL',
  'BRITANNIA':                     'BRITANNIA',
  'GODREJ CONSUMER':               'GODREJCP',
  'TATA CONSUMER':                 'TATACONSUM',
  'GODREJ PROPERTIES':             'GODREJPROP',
  'DLF':                           'DLF',
  'TITAN':                         'TITAN',
  'TRENT':                         'TRENT',
  'AVENUE SUPERMARTS':             'DMART',
  'ZOMATO':                        'ZOMATO',
  'PAYTM':                         'PAYTM',
  'NYKAA':                         'FSN',
  'POLICYBAZAAR':                  'POLICYBZR',
  'ADANI ENTERPRISES':             'ADANIENT',
  'ADANI PORTS':                   'ADANIPORTS',
  'ADANI GREEN':                   'ADANIGREEN',
  'ADANI POWER':                   'ADANIPOWER',
  'ADANI TOTAL GAS':               'ATGL',
  'WIPRO':                         'WIPRO',
  'HCL TECHNOLOGIES':              'HCLTECH',
  'TECH MAHINDRA':                 'TECHM',
  'MPHASIS':                       'MPHASIS',
  'COFORGE':                       'COFORGE',
  'PERSISTENT SYSTEMS':            'PERSISTENT',
  'KPIT TECHNOLOGIES':             'KPITTECH',
  'LT TECHNOLOGY SERVICES':        'LTTS',
  'SUN PHARMACEUTICAL':            'SUNPHARMA',
  'DR REDDYS':                     'DRREDDY',
  'CIPLA':                         'CIPLA',
  'LUPIN':                         'LUPIN',
  'AUROBINDO PHARMA':              'AUROPHARMA',
  'LAURUS LABS':                   'LAURUSLABS',
  'DIVIS LABORATORIES':            'DIVISLAB',
  'ALKEM LABORATORIES':            'ALKEM',
  'TORRENT PHARMACEUTICALS':       'TORNTPHARM',
  'APOLLO HOSPITALS':              'APOLLOHOSP',
  'MAX HEALTHCARE':                'MAXHEALTH',
  'FORTIS HEALTHCARE':             'FORTIS',
  'BAJAJ FINANCE':                 'BAJFINANCE',
  'BAJAJ FINSERV':                 'BAJAJFINSV',
  'HDFC LIFE':                     'HDFCLIFE',
  'SBI LIFE':                      'SBILIFE',
  'ICICI PRUDENTIAL LIFE':         'ICICIPRULI',
  'ICICI LOMBARD':                 'ICICIGI',
  'MUTHOOT FINANCE':               'MUTHOOTFIN',
  'CHOLAMANDALAM':                 'CHOLAFIN',
  'PFC':                           'PFC',
  'REC':                           'RECLTD',
  'IRFC':                          'IRFC',
  'POWER FINANCE':                 'PFC',
  'VOLTAS':                        'VOLTAS',
  'HAVELLS':                       'HAVELLS',
  'POLYCAB':                       'POLYCAB',
  'SIEMENS':                       'SIEMENS',
  'ABB':                           'ABB',
  'CUMMINS':                       'CUMMINSIND',
  'IRCTC':                         'IRCTC',
  'COAL INDIA':                    'COALINDIA',
  'NMDC':                          'NMDC',
  'VEDL':                          'VEDL',
  'HINDZINC':                      'HINDZINC',
  'GAIL':                          'GAIL',
  'BHARTI AIRTEL':                 'BHARTIARTL',
  'INDUS TOWERS':                  'INDUSTOWER',
  'VODAFONE IDEA':                 'IDEA',
};

// Best-effort NSE ticker from full company name (fallback when ISIN not in table)
function companyNameToTicker(name: string): string {
  const upper = name.trim().toUpperCase().replace(/\s+/g, ' ');
  // Direct lookup first (handles banks and stocks that don't derive naturally)
  for (const [key, ticker] of Object.entries(COMPANY_NAME_NSE)) {
    if (upper === key || upper.startsWith(key)) return ticker;
  }
  let s = upper;
  const drop = (p: RegExp) => { s = s.replace(p, '').replace(/\s+/g, ' ').trim(); };
  drop(/\bLIMITED\b|\bLTD\.?\b|\bCORPORATION\b|\bCORP\.?\b|\s+\bLT\b$/g);
  drop(/\bPRIVATE\b|\bPVT\.?\b|\bINC\.?\b/g);
  drop(/\bINDIAN\b|\bINDIA\b|\bIND\.?\b/g);
  drop(/\bINDUSTRIES\b|\bINDUSTRY\b|\bENTERPRISES?\b|\bSOLUTIONS?\b/g);
  drop(/\bSERVICES?\b|\bHOLDINGS?\b|\bGROUP\b|\bCOMPANY\b|\bCO\.?\b/g);
  return s.replace(/\s+/g, '').slice(0, 12) || name.replace(/\s+/g, '').toUpperCase().slice(0, 10);
}

function cleanSymbol(raw: string): string {
  return raw.trim().toUpperCase()
    .replace(/-EQ$/i, '')     // Upstox suffix
    .replace(/\.NS$/i, '')    // already has suffix
    .replace(/\.BO$/i, '');
}

// Returns false for G-Secs (IN0...) and debt/NCD instruments (alphabetic series code in ISIN positions 9-10)
function isEquityIsin(isin: string): boolean {
  if (!isin || isin.length !== 12) return false;
  if (!isin.startsWith('INE')) return false;
  return !/[A-Z]/.test(isin.slice(9, 11)); // alpha series = debenture/NCD
}

function parseRows(rows: string[][]): { result: ParsedRow[]; debug: string } {
  if (!rows.length) return { result: [], debug: 'File is empty' };

  const VALID_EXCH = ['NSE','BSE','NYSE','NASDAQ'];

  // Broker coverage: Zerodha Kite/Console, Upstox, Groww, HDFC Securities,
  // Angel One, 5paisa, ICICI Direct, Kotak, Motilal Oswal
  const SYM_NAMES   = ['instrument','tradingsymbol','trading symbol','stock symbol','scrip name','scrip code','script name','script','scrip','symbol','ticker','security name','security','stock name','isin name'];
  const QTY_NAMES   = ['net qty','net quantity','holdingqty','total qty','total quantity','free qty','qty','quantity','shares','units'];
  const PRICE_NAMES = [
    'avg. buy rate','avg buy rate',                         // HDFC Securities
    'avg. cost price','avg cost price','average cost price',// Angel One (with/without period)
    'avg. cost','avg cost',                                 // Zerodha Kite / Upstox
    'average price','average cost',                         // Zerodha Console / Groww
    'avg price','avg rate','average rate',                  // 5paisa / generic
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
    // HDFC Securities CSV: column names use underscores (avg_cost_price, company_name)
    // so they never match SYM_NAMES — detect via HDFC-specific signal words
    if (r.some(h => h === 'avg_cost_price' || h === 'investment_value' || h === 'portfolio_value' || h === 'company_name')) {
      headerIdx = i; headers = r; break;
    }
  }
  if (tradeHistoryDetected && headerIdx < 0) {
    return { result: [], debug: 'TRADE_HISTORY: This is a Trade History file, not Holdings. Download the Holdings/Portfolio export from Mstocks/Mirae Asset app instead.' };
  }

  // Column finder: exact match then partial contains
  const col = (names: string[]) => {
    const exact = names.map(n => headers.indexOf(n)).find(i => i >= 0);
    if (exact !== undefined) return exact;
    // strip periods for fuzzy match — handles "avg. cost price" vs "avg cost price"
    return headers.findIndex(h => {
      const hn = h.replace(/\./g,'').replace(/\s+/g,' ').trim();
      return names.some(n => {
        const nn = n.replace(/\./g,'').replace(/\s+/g,' ').trim();
        return h === n || hn === nn || h.startsWith(n) || n.startsWith(h) || hn.startsWith(nn) || nn.startsWith(hn);
      });
    });
  };

  if (headerIdx >= 0 && headers.length) {
    // ── HDFC Securities CSV: column names use underscores, won't match col() patterns ──
    // Format: Asset,Isin,Company_Name,Qty,Avg_Cost_Price,Investment_Value,Closing_Price,Portfolio_Value
    // Columns after lowercasing: asset|isin|company_name|qty|avg_cost_price|investment_value|...
    // BUG we fix: fallback parser was picking Investment_Value (col 5, total position value)
    // as avg_price instead of Avg_Cost_Price (col 4, per-unit cost) → total invested ~500x inflated
    if (headers.includes('avg_cost_price') && headers.includes('isin') && headers.includes('qty')) {
      const isinI  = headers.indexOf('isin');
      const nameI  = headers.indexOf('company_name');
      const qtyI   = headers.indexOf('qty');
      const priceI = headers.indexOf('avg_cost_price');  // per-unit cost ← must use this, NOT investment_value
      const parsed = rows.slice(headerIdx + 1)
        .filter(r => r.length > Math.max(isinI, qtyI, priceI))
        .map(r => {
          const isin = String(r[isinI] ?? '').trim().toUpperCase();
          const name = nameI >= 0 ? String(r[nameI] ?? '').trim() : '';
          const qty  = parseInt(String(r[qtyI]   ?? '0').replace(/,/g, ''), 10);
          const avg  = parseFloat(String(r[priceI] ?? '0').replace(/,/g, ''));
          if (!isin || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0) return null;
          const sym = ISIN_NSE_EQUITY[isin] ?? companyNameToTicker(name);
          return { symbol: sym, qty, avg_price: avg, exchange: 'NSE' as Exchange, isin };
        })
        .filter(Boolean) as ParsedRow[];
      if (!parsed.length) return { result: [], debug: 'HDFC_FORMAT: detected but 0 valid data rows' };
      const matched = parsed.filter(r => r.isin && ISIN_NSE_EQUITY[r.isin]).length;
      const unmatched = parsed.length - matched;
      const note = unmatched > 0 ? `. ${unmatched} used company-name ticker (CMP may not load — fix symbol manually)` : '';
      return { result: parsed, debug: `HDFC_OK: ${parsed.length} rows, ${matched} ISIN-matched${note}` };
    }

    // ── Upstox DP Holding Statement ─────────────────────────────────────────
    // Headers: ISIN | Scrip Name | Free Qty | Current Qty | ... | Rate | Valuation
    // "Rate" = current market price (NOT avg buy cost) — no cost column in this report.
    // avg_price=0 triggers the review modal where user enters buy prices manually.
    if (
      headers.includes('isin') &&
      headers.includes('scrip name') &&
      (headers.includes('rate') || headers.includes('valuation')) &&
      !headers.some(h => h.includes('avg') || h.includes('cost') || h.includes('purchase') || h.includes('buy'))
    ) {
      const isinI = headers.indexOf('isin');
      const nameI  = headers.indexOf('scrip name');
      const fqI    = headers.indexOf('free qty');
      const cqI    = headers.indexOf('current qty');
      const qtyI   = fqI >= 0 ? fqI : cqI;
      const rateI  = headers.indexOf('rate');        // closing CMP — used as avg_price placeholder
      if (qtyI < 0) return { result: [], debug: 'UPSTOX_DP: could not find qty column' };

      const parsed = rows.slice(headerIdx + 1)
        .filter(r => r.length > Math.max(isinI, qtyI))
        .map(r => {
          const isin    = String(r[isinI] ?? '').trim().toUpperCase();
          const rawName = nameI >= 0 ? String(r[nameI] ?? '').trim() : '';
          const qty     = parseInt(String(r[qtyI] ?? '0').replace(/,/g, ''), 10);
          const rate    = rateI >= 0 ? parseFloat(String(r[rateI] ?? '0').replace(/,/g, '')) : 0;
          if (!isin || isNaN(qty) || qty <= 0) return null;
          if (!isEquityIsin(isin)) return null; // skip G-Secs, debentures, NCDs
          let sym = ISIN_NSE_EQUITY[isin] ?? ISIN_NSE[isin];
          if (!sym) {
            // Strip Upstox scrip suffix: "ASHOKA BUILD EQ 5/" → "ASHOKA BUILD"
            const cleaned = rawName.replace(/[\s-]+EQS?\b.*/i, '').trim();
            sym = cleaned ? companyNameToTicker(cleaned) : '';
          }
          if (!sym || sym.length < 2) return null;
          // Use Rate (closing CMP) as avg_price placeholder — imports directly without review modal.
          // P&L shows 0 until user edits individual buy prices.
          const avg_price = (rate > 0) ? rate : 0.001;
          return { symbol: sym, qty, avg_price, exchange: 'NSE' as Exchange, isin };
        })
        .filter(Boolean) as ParsedRow[];

      if (!parsed.length) return { result: [], debug: 'UPSTOX_DP: 0 valid equity rows (bonds/G-Secs skipped)' };
      const isinMatched = parsed.filter(r => ISIN_NSE_EQUITY[r.isin ?? ''] || ISIN_NSE[r.isin ?? '']).length;
      return {
        result: parsed,
        debug: `UPSTOX_DP: ${parsed.length} equity rows, ${isinMatched} ISIN-matched. avg_price pre-filled with 30-Jun CMP — edit for accurate P&L.`,
      };
    }

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
      if (parsed.length) {
        // Detect mis-parsed HDFC/CDSL formats where scrip code column contains series codes
        const SERIES_CODES = new Set(['EQ','MF','BE','BL','N','SM','IL','BT','ST','SN']);
        const seriesCount = parsed.filter(r => SERIES_CODES.has(r.symbol)).length;
        if (seriesCount > parsed.length * 0.5) {
          return { result: [], debug: `HDFC_FORMAT: Detected "${parsed[0]?.symbol}" in symbol column — this is a Series/Type code, not the stock ticker. For HDFC Securities: use the "Portfolio" export from HDFC SKY app (has Symbol column), or Zerodha/Upstox export. The Demat Holding Statement PDF does not contain NSE tickers.` };
        }
        return { result: parsed, debug: hdr };
      }
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
    if (file.name.match(/\.pdf$/i)) return parsePdf(file);
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

const card: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' };
const inp: React.CSSProperties = { height:40, borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:'100%' };
const PORT_STAT_GRADS = [
  ['linear-gradient(135deg,rgba(79,111,250,0.12),rgba(23,64,245,0.03))','rgba(79,111,250,0.28)'],
  ['linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.02))','rgba(0,212,160,0.25)'],
  ['linear-gradient(135deg,rgba(255,92,26,0.10),rgba(255,184,0,0.03))','rgba(255,92,26,0.25)'],
] as const;

export default function PortfolioPage() {
  const { portfolios, activeId, activePortfolio, holdings: rawHoldings, setActiveId, createPortfolio, renamePortfolio, deletePortfolio, refresh: refreshContext, session } = usePortfolio();
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
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{top:number;left:number}|null>(null);

  // Close portfolio dropdown on outside click or scroll (bubble phase — capture fires before inner onClick)
  useEffect(() => {
    if (!menuId) return;
    const close = () => { setMenuId(null); setMenuPos(null); };
    document.addEventListener('click', close);
    window.addEventListener('scroll', close);
    return () => { document.removeEventListener('click', close); window.removeEventListener('scroll', close); };
  }, [menuId]);
  // Cache totals per portfolio-id as user switches, for cross-portfolio summary
  const [portfolioTotals, setPortfolioTotals] = useState<Record<string, { holdings: number; invested: number }>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingPortfolio, setDeletingPortfolio] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editCostVal, setEditCostVal] = useState('');
  const [pdfReviewRows, setPdfReviewRows] = useState<(ParsedRow & { inputPrice: string })[]>([]);
  const [pdfReviewOpen, setPdfReviewOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MlClass | null>(null);
  const [selectedStock, setSelectedStock] = useState<Holding | null>(null);
  // 'all' = merged view across all portfolios; any portfolio id = individual view
  const [viewMode, setViewMode] = useState<'all' | string>('all');
  const [allViewHoldings, setAllViewHoldings] = useState<Holding[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  // portfolio IDs that have holdings but ALL are US-only — hidden from India portfolio tabs
  const [usOnlyPortfolioIds, setUsOnlyPortfolioIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  async function enrichHoldings(raw: RawHolding[]) {
    if (!raw.length) { setHoldings([]); setLoading(false); return; }
    setLoading(true);

    // Step 1: batch-fetch prices from Yahoo Finance (fast, always available)
    const yahooSyms = raw.map(h =>
      h.symbol + (h.exchange === 'NSE' ? '.NS' : h.exchange === 'BSE' ? '.BO' : '')
    );
    let priceMap: Record<string, { price: number | null; change_pct: number | null }> = {};
    try {
      const res = await fetch(`/api/prices?symbols=${yahooSyms.join(',')}`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) priceMap = await res.json();
    } catch { /* ignore — will show — for prices */ }

    // Show prices immediately so user sees data right away
    const withPrices: Holding[] = raw.map((h, i) => {
      const ySym = yahooSyms[i];
      const p = priceMap[ySym];
      // Sanity check: if CMP is 50× avg_price or 1/50th, likely wrong ISIN→ticker mapping
      // (e.g. ISIN maps to MRF ₹1.4L when actual stock is ₹300 — ratio 467×).
      // Legitimate 50× gains (e.g. Bajaj Finance from 2008) are possible but the wrong
      // signal (price appears valid, just inflated by wrong ticker) is worse than showing —.
      const rawPrice = p?.price ?? null;
      const cur = (rawPrice != null && h.avg_price >= 1)
        ? (rawPrice / h.avg_price > 50 || h.avg_price / rawPrice > 50 ? null : rawPrice)
        : rawPrice;
      const pl = (cur != null && h.avg_price >= 1) ? (cur - h.avg_price) * h.qty : undefined;
      const pl_pct = (cur != null && h.avg_price >= 1) ? ((cur - h.avg_price) / h.avg_price) * 100 : 0;
      return { ...h, current_price: cur, change_pct: p?.change_pct ?? null,
        signal: 'HOLD', rsi: null, pl, pl_pct, exchange: h.exchange as Exchange,
        ml_class: 'Watch', is_etf: detectEtf(h.symbol) } as Holding;
    });
    setHoldings(withPrices);
    setLoading(false);

    // Step 2: try ML signals in background (3s timeout per stock, batched 10 at a time)
    const BATCH = 10;
    const enriched = [...withPrices];
    for (let i = 0; i < raw.length; i += BATCH) {
      const batch = raw.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (h, bi) => {
        const idx = i + bi;
        try {
          const suffix = h.exchange === 'NSE' ? '.NS' : h.exchange === 'BSE' ? '.BO' : '';
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`/api/ml/signals/${h.symbol}${suffix}`, {
            signal: controller.signal,
            next: { revalidate: 300 },
          } as RequestInit);
          clearTimeout(timer);
          if (!res.ok) return;
          const q = await res.json() as { signal?: string; rsi?: number | null; current_price?: number | null; change_pct?: number | null };
          const rawMlPrice = q.current_price ?? enriched[idx].current_price;
          const cur = (rawMlPrice != null && h.avg_price >= 1)
            ? (rawMlPrice / h.avg_price > 50 || h.avg_price / rawMlPrice > 50 ? null : rawMlPrice)
            : rawMlPrice;
          const pl = (cur != null && h.avg_price >= 1) ? (cur - h.avg_price) * h.qty : enriched[idx].pl;
          const pl_pct = (cur != null && h.avg_price >= 1) ? ((cur - h.avg_price) / h.avg_price) * 100 : enriched[idx].pl_pct ?? 0;
          const signal = q.signal ?? 'HOLD';
          enriched[idx] = { ...enriched[idx], current_price: cur, change_pct: q.change_pct ?? enriched[idx].change_pct, signal, rsi: q.rsi ?? null, pl, pl_pct, ml_class: classify(signal, q.rsi ?? null, pl_pct) };
        } catch { /* timeout or offline — keep Yahoo price, keep HOLD */ }
      }));
      // Update UI after each batch
      setHoldings([...enriched]);
    }
  }

  useEffect(() => { enrichHoldings(rawHoldings); setActiveFilter(null); }, [rawHoldings]);

  // Cache summary for active portfolio once prices load (for the cross-portfolio summary row)
  useEffect(() => {
    if (!activeId || holdings.length === 0) return;
    const invested = holdings.reduce((s, h) => s + (h.avg_price >= 1 ? h.avg_price * h.qty : 0), 0);
    setPortfolioTotals(prev => ({ ...prev, [activeId]: { holdings: holdings.length, invested } }));
  }, [holdings, activeId]);

  // Pre-fetch lightweight totals for ALL portfolios so summary shows immediately on load
  useEffect(() => {
    if (!session || portfolios.length === 0) return;
    const unloaded = portfolios.filter(p => !(p.id in portfolioTotals));
    if (!unloaded.length) return;
    const ids = unloaded.map(p => p.id).join(',');
    fetch(
      `${SUPA_URL}/rest/v1/holdings?select=portfolio_id,avg_price,qty&portfolio_id=in.(${ids})`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
    )
      .then(r => r.json())
      .then((data: Array<{ portfolio_id: string; avg_price: number; qty: number }>) => {
        const tots: Record<string, { holdings: number; invested: number }> = {};
        // Seed with 0 so empty portfolios show 0 instead of "—"
        for (const p of unloaded) tots[p.id] = { holdings: 0, invested: 0 };
        for (const h of data) {
          tots[h.portfolio_id].holdings++;
          if (h.avg_price >= 1) tots[h.portfolio_id].invested += h.avg_price * h.qty;
        }
        setPortfolioTotals(prev => ({ ...prev, ...tots }));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios, session]);

  // ── All-portfolios merged view ──────────────────────────────────────────────
  function mergeBySymbol(raw: RawHolding[]): RawHolding[] {
    const map = new Map<string, RawHolding>();
    for (const h of raw) {
      const key = `${h.symbol}::${h.exchange}`;
      const ex  = map.get(key);
      if (ex) {
        const totalQty = ex.qty + h.qty;
        map.set(key, { ...ex, qty: totalQty, avg_price: (ex.avg_price * ex.qty + h.avg_price * h.qty) / totalQty });
      } else {
        map.set(key, { ...h });
      }
    }
    return Array.from(map.values());
  }

  async function fetchAndEnrichAll() {
    if (!session || portfolios.length === 0) return;
    setAllLoading(true);
    try {
      const ids = portfolios.map(p => p.id).join(',');
      const res = await fetch(
        `${SUPA_URL}/rest/v1/holdings?select=*&portfolio_id=in.(${ids})`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) { setAllLoading(false); return; }
      const allRaw = await res.json() as (RawHolding & { portfolio_id: string })[];
      const raw = allRaw.filter(h => h.exchange === 'NSE' || h.exchange === 'BSE');
      const indiaIds = new Set(raw.map(h => h.portfolio_id));
      // portfolios with holdings but NONE are India → US-only, hide from India tabs
      const allHoldingIds = new Set(allRaw.map(h => h.portfolio_id));
      const usOnlyIds = new Set([...allHoldingIds].filter(id => !indiaIds.has(id)));
      setUsOnlyPortfolioIds(usOnlyIds);
      const merged = mergeBySymbol(raw);
      if (!merged.length) { setAllViewHoldings([]); setAllLoading(false); return; }

      const yahooSyms = merged.map(h => h.symbol + (h.exchange === 'NSE' ? '.NS' : '.BO'));
      let priceMap: Record<string, { price: number | null; change_pct: number | null }> = {};
      try {
        const pr = await fetch(`/api/prices?symbols=${yahooSyms.join(',')}`, { signal: AbortSignal.timeout(10000) });
        if (pr.ok) priceMap = await pr.json();
      } catch { /* ignore */ }

      const enriched: Holding[] = merged.map((h, i) => {
        const p = priceMap[yahooSyms[i]];
        const rawPrice = p?.price ?? null;
        const cur = (rawPrice != null && h.avg_price >= 1)
          ? (rawPrice / h.avg_price > 50 || h.avg_price / rawPrice > 50 ? null : rawPrice)
          : rawPrice;
        const pl     = (cur != null && h.avg_price >= 1) ? (cur - h.avg_price) * h.qty : undefined;
        const pl_pct = (cur != null && h.avg_price >= 1) ? ((cur - h.avg_price) / h.avg_price) * 100 : 0;
        return { ...h, current_price: cur, change_pct: p?.change_pct ?? null,
          signal: 'HOLD', rsi: null, pl, pl_pct, exchange: h.exchange as Exchange,
          ml_class: 'Watch' as MlClass, is_etf: detectEtf(h.symbol) } as Holding;
      });
      setAllViewHoldings(enriched);
      setAllLoading(false);

      // Background ML pass
      const BATCH = 10;
      const ec = [...enriched];
      for (let i = 0; i < merged.length; i += BATCH) {
        await Promise.allSettled(merged.slice(i, i + BATCH).map(async (h, bi) => {
          const idx = i + bi;
          try {
            const suffix = h.exchange === 'NSE' ? '.NS' : '.BO';
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 3000);
            const r = await fetch(`/api/ml/signals/${h.symbol}${suffix}`, { signal: ctrl.signal } as RequestInit);
            clearTimeout(t);
            if (!r.ok) return;
            const q = await r.json() as { signal?: string; rsi?: number | null; current_price?: number | null; change_pct?: number | null };
            const rawMlP = q.current_price ?? ec[idx].current_price;
            const cur = (rawMlP != null && h.avg_price >= 1)
              ? (rawMlP / h.avg_price > 50 || h.avg_price / rawMlP > 50 ? null : rawMlP) : rawMlP;
            const pl     = (cur != null && h.avg_price >= 1) ? (cur - h.avg_price) * h.qty : ec[idx].pl;
            const pl_pct = (cur != null && h.avg_price >= 1) ? ((cur - h.avg_price) / h.avg_price) * 100 : (ec[idx].pl_pct ?? 0);
            const signal = q.signal ?? 'HOLD';
            ec[idx] = { ...ec[idx], current_price: cur, change_pct: q.change_pct ?? ec[idx].change_pct, signal, rsi: q.rsi ?? null, pl, pl_pct, ml_class: classify(signal, q.rsi ?? null, pl_pct) };
          } catch { /* timeout — keep Yahoo price */ }
        }));
        setAllViewHoldings([...ec]);
      }
    } catch { setAllLoading(false); }
  }

  useEffect(() => {
    if (viewMode === 'all') fetchAndEnrichAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, portfolios.length, session?.access_token]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeId) { setUploadMsg('❌ No portfolio selected. Create a portfolio first.'); return; }
    if (!session)  { setUploadMsg('❌ Session expired — refresh the page and sign in again.'); return; }
    setSyncing(true); setUploadMsg('Parsing file…');
    const { result, debug } = await parseFile(file);
    if (!result.length) {
      setUploadMsg(`❌ Could not parse file.\nDebug: ${debug}`);
      setSyncing(false); return;
    }
    // PDF DP imports have avg_price < 1 (placeholder) — show review modal so user enters costs first
    const hasMissingPrice = result.some(r => r.avg_price < 1);
    if (hasMissingPrice) {
      setPdfReviewRows(result.map(r => ({ ...r, inputPrice: '' })));
      setPdfReviewOpen(true);
      setUploadMsg('');
      setSyncing(false);
      e.target.value = '';
      return;
    }
    const insertErr = await restInsertHoldings(activeId, session.user.id, session.access_token, result);
    if (insertErr) { setUploadMsg(`❌ ${insertErr}`); setSyncing(false); return; }
    const isUpstoxDp = debug.includes('UPSTOX_DP');
    setUploadMsg(isUpstoxDp
      ? `✅ ${result.length} holdings imported. ⚠️ Avg price pre-filled with last CMP — click each holding to enter your actual buy price for accurate P&L.`
      : `✅ ${result.length} holdings imported — running ML analysis…`);
    await refreshContext();
    setSyncing(false);
    e.target.value = '';
  }

  async function handlePdfReviewSave() {
    if (!activeId || !session) return;
    const allPriced = pdfReviewRows.every(r => parseFloat(r.inputPrice) > 0);
    if (!allPriced) { setUploadMsg('❌ Enter avg cost for every holding before saving.'); return; }
    setSyncing(true);
    const rows = pdfReviewRows.map(r => ({ ...r, avg_price: parseFloat(r.inputPrice) }));
    const insertErr = await restInsertHoldings(activeId, session.user.id, session.access_token, rows);
    if (insertErr) { setUploadMsg(`❌ ${insertErr}`); setSyncing(false); return; }
    setPdfReviewOpen(false); setPdfReviewRows([]);
    setUploadMsg(`✅ ${rows.length} holdings imported — running ML analysis…`);
    await refreshContext();
    setSyncing(false);
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

  async function handleUpdateCost(id: string) {
    const cost = parseFloat(editCostVal);
    if (!session || isNaN(cost) || cost <= 0) { setEditingCostId(null); return; }
    await fetch(`${SUPA_URL}/rest/v1/holdings?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ avg_price: cost }),
    });
    setEditingCostId(null);
    await refreshContext();
  }

  function detectEtf(symbol: string): boolean {
    const s = symbol.toUpperCase();
    return s.endsWith('ETF') || s.endsWith('BEES') || s.includes('GOLDBEES') ||
      ['SILVERBEES','GOLDBEES','LIQUIDBEES','PHARMABEES','BANKBEES','JUNIORBEES',
       'NIFTYBEES','PSUBNKBEES','CPSEETF','METALETF','ICICIHEALTHETF','MAFANG',
       'SETFNIF50','HDFCNIFTY','MOM50','MOM100','NV20BEES','UTINIFTETF'].includes(s);
  }

  async function handleCreatePortfolio() {
    const name = newPortfolioName.trim();
    if (!name) { setUploadMsg('❌ Enter a portfolio name first.'); return; }
    if (portfolios.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setUploadMsg('❌ A portfolio with that name already exists.'); return;
    }
    setCreatingPortfolio(true); setUploadMsg(''); setPortfolioJustCreated(false);
    const { id, error } = await createPortfolio(name);
    setCreatingPortfolio(false);
    if (!id) { setUploadMsg(`❌ ${error ?? 'Could not create portfolio'}`); return; }
    setPortfolioJustCreated(true);
    setNewPortfolioName('');
    setShowNewPortfolio(false);
    setViewMode('all');
    setUploadMsg('✅ Portfolio created! Now upload your holdings file.');
  }

  async function handleRename() {
    if (!renamingId || !renameVal.trim()) return;
    const { error } = await renamePortfolio(renamingId, renameVal.trim());
    if (error) setUploadMsg(`❌ Rename failed: ${error}`);
    setRenamingId(null);
  }

  async function handleDeletePortfolio(id: string) {
    setDeletingPortfolio(true);
    const { error } = await deletePortfolio(id);
    if (error) { setUploadMsg(`❌ Delete failed: ${error}`); }
    else {
      if (viewMode === id) setViewMode('all');
      setUsOnlyPortfolioIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
    setConfirmDeleteId(null);
    setDeletingPortfolio(false);
  }

  const firstUploadRef = useRef<HTMLInputElement>(null);

  const displayedHoldings = viewMode === 'all' ? allViewHoldings : holdings;
  const displayedLoading   = viewMode === 'all' ? allLoading : loading;

  const sortedHoldings = [...displayedHoldings].sort((a, b) => {
    let av: number | string, bv: number | string;
    if (sortCol === 'symbol')        { av = a.symbol;            bv = b.symbol; }
    else if (sortCol === 'avg_price'){ av = a.avg_price;         bv = b.avg_price; }
    else if (sortCol === 'current_price') { av = a.current_price ?? -Infinity; bv = b.current_price ?? -Infinity; }
    else if (sortCol === 'pl')       { av = a.pl ?? -Infinity;   bv = b.pl ?? -Infinity; }
    else                             { av = a.pl_pct ?? -Infinity; bv = b.pl_pct ?? -Infinity; }
    if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const totalInvested = displayedHoldings.reduce((s, h) => s + (h.avg_price >= 1 ? h.avg_price * h.qty : 0), 0);
  const totalCurrent  = displayedHoldings.reduce((s, h) => s + (h.avg_price >= 1 ? (h.current_price ?? h.avg_price) * h.qty : 0), 0);
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
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:8 }}>Indian Portfolio</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.6, lineHeight:1.2, marginBottom:8 }}>
            Upload once.<br/><span style={{ color:'var(--grn)' }}>Track everything.</span>
          </div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:480 }}>
            SignalGenie runs ML signals on every stock you hold — Momentum, Swing, Accumulate, Exit — personalised to your portfolio.
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:680, marginBottom:24 }}>
          {/* Step 1 — Create Portfolio */}
          <div style={{ background:'var(--card-bg)', border:`1px solid ${portfolioCreated ? 'rgba(0,212,160,0.4)' : 'var(--bdr)'}`, borderRadius:16, padding:'24px' }}>
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
          <div style={{ background:'var(--card-bg)', border:`1px solid ${!portfolioCreated ? 'rgba(255,255,255,0.04)' : 'var(--bdr)'}`, borderRadius:16, padding:'24px', opacity: portfolioCreated ? 1 : 0.45 }}>
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
              {syncing ? '⏳ Uploading…' : '📤 Upload Holdings (CSV / Excel / PDF)'}
            </button>
            <input ref={firstUploadRef} type="file" accept=".csv,.xlsx,.xls,.txt,.pdf" style={{ display:'none' }} onChange={handleFile}/>
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
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:12, padding:'14px 18px', maxWidth:680, fontSize:12 }}>
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
      {/* India / US toggle */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[
          { label:'🇮🇳 India', href:'/dashboard/portfolio', active:true },
          { label:'🇺🇸 US',    href:'/dashboard/us-portfolio', active:false },
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

      {/* Portfolio header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.4 }}>Indian Portfolio</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>
            {viewMode === 'all' ? `${portfolios.length} portfolios merged` : activePortfolio?.name} · {displayedHoldings.length} holdings · click any row for details
          </div>
        </div>
        {displayedHoldings.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <PortfolioShareCard
              totalInvested={totalInvested}
              totalCurrent={totalCurrent}
              totalPL={totalPL}
              totalPLPct={totalPLPct}
              portfolioName={viewMode === 'all' ? 'All Portfolios' : activePortfolio?.name}
              topHoldings={[...displayedHoldings]
                .filter(h => h.avg_price >= 1)
                .sort((a, b) => ((b.current_price ?? b.avg_price) * b.qty) - ((a.current_price ?? a.avg_price) * a.qty))
                .slice(0, 5)
                .map(h => ({ symbol: h.symbol, qty: h.qty, pl_pct: h.pl_pct ?? null, current_price: h.current_price ?? null, avg_price: h.avg_price }))}
            />
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:32, fontWeight:900, color: totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)', lineHeight:1, letterSpacing:-1 }}>{totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(1)}%</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>return · {fmt(totalPL)}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700 }}>Holdings</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:2 }}>ML-classified · prices via Yahoo Finance · click row for detail</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} disabled={syncing || !activeId}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: syncing ? 0.6 : 1 }}>
            {syncing ? '⏳ Importing…' : '📤 Upload (CSV / Excel)'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt,.pdf" style={{ display:'none' }} onChange={handleFile}/>
          <button onClick={() => setAddOpen(o => !o)} disabled={!activeId}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Stock
          </button>
          <button onClick={() => enrichHoldings(rawHoldings)} disabled={loading}
            style={{ height:36, padding:'0 12px', borderRadius:9, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🔄</button>
        </div>
      </div>

      {/* Portfolio tabs + management */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {/* All Portfolios tab — default */}
        <button
          onClick={() => { setViewMode('all'); setMenuId(null); }}
          style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:13, fontWeight: viewMode === 'all' ? 700 : 500, cursor:'pointer', fontFamily:'inherit', border: viewMode === 'all' ? '1px solid var(--grn)' : '1px solid var(--tab-inactive-bdr)', background: viewMode === 'all' ? 'rgba(0,212,160,0.10)' : 'var(--tab-inactive-bg)', color: viewMode === 'all' ? 'var(--grn)' : 'var(--tab-inactive-txt)', whiteSpace:'nowrap' }}>
          📊 All Portfolios
        </button>
        {portfolios.filter(p => !usOnlyPortfolioIds.has(p.id)).map(p => {
          const isActive = viewMode === p.id;
          const isRenaming = renamingId === p.id;
          return (
            <div key={p.id} style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:0 }}>
              {isRenaming ? (
                <>
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    style={{ height:34, borderRadius:'8px 0 0 8px', background:'var(--surf2)', border:'1px solid var(--blu)', borderRight:'none', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:140 }}/>
                  <button onClick={handleRename}
                    style={{ height:34, padding:'0 10px', borderRadius:'0 8px 8px 0', background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>✓</button>
                  <button onClick={() => setRenamingId(null)}
                    style={{ height:34, padding:'0 8px', marginLeft:4, borderRadius:8, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setViewMode(p.id); setActiveId(p.id); setMenuId(null); }}
                    style={{ height:34, padding:'0 12px 0 16px', borderRadius:'8px 0 0 8px', fontSize:13, fontWeight: isActive ? 700 : 500, cursor:'pointer', fontFamily:'inherit', border: isActive ? '1px solid var(--blu)' : '1px solid var(--tab-inactive-bdr)', borderRight:'none', background: isActive ? 'rgba(23,64,245,0.1)' : 'var(--tab-inactive-bg)', color: isActive ? 'var(--bluL)' : 'var(--tab-inactive-txt)' }}>
                    📂 {p.name}
                  </button>
                  <button onClick={e => { e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect(); setMenuPos({top:r.bottom+4,left:r.left}); setMenuId(m=>m===p.id?null:p.id); }}
                    style={{ height:34, padding:'0 8px', borderRadius:'0 8px 8px 0', border: isActive ? '1px solid var(--blu)' : '1px solid var(--tab-inactive-bdr)', borderLeft:'1px solid rgba(79,111,250,0.15)', background: isActive ? 'rgba(23,64,245,0.08)' : 'var(--tab-inactive-bg)', color: isActive ? 'var(--bluL)' : 'var(--dim)', cursor:'pointer', fontFamily:'inherit', fontSize:16, lineHeight:1 }}>
                    ⋯
                  </button>
                </>
              )}
              {/* Dropdown menu — portal to body to escape parent overflow/transform clipping */}
              {menuId === p.id && menuPos && typeof document !== 'undefined' && createPortal(
                <div onClick={e => e.stopPropagation()} style={{ position:'fixed', top:menuPos.top, left:menuPos.left, zIndex:99999, background:'#0E1628', border:'1px solid #1740F5', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(23,64,245,0.4)', minWidth:160, padding:'4px 0' }}>
                  <button onClick={() => { setRenamingId(p.id); setRenameVal(p.name); setMenuId(null); }}
                    style={{ width:'100%', height:36, padding:'0 14px', background:'none', border:'none', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    ✏️ Rename
                  </button>
                  <div style={{ height:1, background:'#1C2E4A', margin:'2px 0' }}/>
                  <button onClick={() => { setConfirmDeleteId(p.id); setMenuId(null); }}
                    style={{ width:'100%', height:36, padding:'0 14px', background:'none', border:'none', color:'#FF3B5C', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    🗑️ Delete portfolio
                  </button>
                </div>,
                document.body
              )}
            </div>
          );
        })}
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
              style={{ height:34, padding:'0 10px', borderRadius:8, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => { setShowNewPortfolio(true); setMenuId(null); }}
            style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'1px dashed var(--tab-inactive-bdr)', background:'var(--tab-inactive-bg)', color:'var(--tab-inactive-txt)' }}>
            + New Portfolio
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'28px 32px', maxWidth:400, width:'90%', boxShadow:'0 16px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Delete portfolio?</div>
            <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6, marginBottom:24 }}>
              This will permanently delete <strong style={{ color:'var(--txt)' }}>
                {portfolios.find(p => p.id === confirmDeleteId)?.name}
              </strong> and all its holdings. This cannot be undone.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDeleteId(null)} disabled={deletingPortfolio}
                style={{ flex:1, height:42, borderRadius:10, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={() => handleDeletePortfolio(confirmDeleteId)} disabled={deletingPortfolio}
                style={{ flex:1, height:42, borderRadius:10, background:'var(--red)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor: deletingPortfolio ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: deletingPortfolio ? 0.7 : 1 }}>
                {deletingPortfolio ? '⏳ Deleting…' : '🗑️ Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadMsg && (
        <div style={{ marginBottom:14, fontSize:13, color: uploadMsg.startsWith('✅') ? 'var(--grn)' : 'var(--red)', background: uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border:`1px solid ${uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:10, padding:'10px 14px' }}>
          {uploadMsg}
          {uploadMsg.startsWith('❌') && !uploadMsg.includes('HDFC_FORMAT') && !uploadMsg.includes('TRADE_HISTORY') && (
            <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>Expected: <code>SYMBOL,QUANTITY,AVG_PRICE,EXCHANGE</code> — e.g. <code>RELIANCE,50,2800,NSE</code></div>
          )}
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
              {(['NSE','BSE'] as Exchange[]).map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <button onClick={handleAdd}
            style={{ height:40, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Add →</button>
        </div>
      )}

      {/* PDF review modal — shown when MStock DP PDF parsed (avg_price missing) */}
      {pdfReviewOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => { setPdfReviewOpen(false); setPdfReviewRows([]); }}>
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:24, width:'100%', maxWidth:560, maxHeight:'80vh', display:'flex', flexDirection:'column', gap:16 }}
            onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Enter Avg Cost — DP Holding Import</div>
              <div style={{ fontSize:12, color:'var(--dim)' }}>This DP statement doesn&apos;t include avg buy cost. Enter your actual buy price per unit for each holding.</div>
            </div>
            <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              {pdfReviewRows.map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surf2)', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{r.symbol}</div>
                    <div style={{ fontSize:11, color:'var(--dim)' }}>Qty: {r.qty} · {r.exchange}{r.is_etf ? ' · ETF/MF' : ''}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--dim)' }}>₹</span>
                    <input
                      type="number"
                      placeholder="Avg cost"
                      value={r.inputPrice}
                      onChange={e => setPdfReviewRows(rows => rows.map((row, j) => j === i ? { ...row, inputPrice: e.target.value } : row))}
                      style={{ width:100, height:32, borderRadius:6, background:'var(--bg)', border:`1px solid ${parseFloat(r.inputPrice) > 0 ? 'var(--grn)' : 'var(--bdr)'}`, color:'var(--txt)', fontSize:13, padding:'0 8px', fontFamily:'inherit', outline:'none' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => { setPdfReviewOpen(false); setPdfReviewRows([]); }}
                style={{ padding:'8px 18px', borderRadius:8, background:'none', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handlePdfReviewSave} disabled={syncing || !pdfReviewRows.every(r => parseFloat(r.inputPrice) > 0)}
                style={{ padding:'8px 20px', borderRadius:8, background: pdfReviewRows.every(r => parseFloat(r.inputPrice) > 0) ? 'var(--blu)' : 'var(--surf2)', border:'none', color: pdfReviewRows.every(r => parseFloat(r.inputPrice) > 0) ? '#fff' : 'var(--dim)', fontSize:13, fontWeight:700, cursor: pdfReviewRows.every(r => parseFloat(r.inputPrice) > 0) ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
                {syncing ? 'Saving…' : `Import ${pdfReviewRows.length} holdings →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-portfolio summary — only in 'all' mode, as a breakdown */}
      {viewMode === 'all' && portfolios.length > 1 && (
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>All Portfolios Summary</div>
          <table className="port-table" style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Portfolio','Holdings','Invested',''].map(h => (
                  <th key={h} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolios.map(p => {
                const tot = portfolioTotals[p.id];
                const isActive = p.id === activeId;
                // > ₹10Cr invested = almost certainly corrupt data (Investment_Value used as avg_price)
                const isCorrupt = tot && tot.invested > 1e9;
                return (
                  <tr key={p.id} onClick={() => setActiveId(p.id)} style={{ cursor:'pointer', opacity: isActive ? 1 : 0.7 }}>
                    <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        {isActive && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--blu)', display:'inline-block', flexShrink:0 }}/>}
                        <span style={{ fontSize:13, fontWeight: isActive ? 700 : 500 }}>{p.name}</span>
                        {isCorrupt && <span style={{ fontSize:10, fontWeight:700, color:'var(--red)', background:'rgba(255,59,92,0.1)', border:'1px solid rgba(255,59,92,0.3)', borderRadius:4, padding:'1px 6px' }}>⚠️ corrupt — delete &amp; re-upload</span>}
                      </div>
                    </td>
                    <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13, color: tot ? 'var(--txt)' : 'var(--dim)' }}>
                      {tot ? tot.holdings : '—'}
                    </td>
                    <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13, fontWeight:600, color: isCorrupt ? 'var(--red)' : tot ? 'var(--txt)' : 'var(--dim)' }}>
                      {tot && tot.invested >= 1 ? (tot.invested >= 1e7 ? `₹${(tot.invested/1e7).toFixed(2)}Cr` : tot.invested >= 1e5 ? `₹${(tot.invested/1e5).toFixed(2)}L` : `₹${tot.invested.toLocaleString('en-IN',{maximumFractionDigits:0})}`) : '—'}
                    </td>
                    <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(28,46,74,0.4)', textAlign:'right' }}
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setConfirmDeleteId(p.id); setMenuId(null); }}
                        style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:13, padding:'2px 6px', borderRadius:6 }}
                        title="Delete portfolio">🗑️</button>
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const allTots = Object.values(portfolioTotals);
                if (allTots.length < 2) return null;
                const totalH = allTots.reduce((s,t)=>s+t.holdings,0);
                const totalI = allTots.reduce((s,t)=>s+t.invested,0);
                return (
                  <tr style={{ background:'rgba(23,64,245,0.04)' }}>
                    <td style={{ padding:'9px 10px', fontSize:12, fontWeight:700, color:'var(--dim)' }}>Total across {allTots.length} portfolios</td>
                    <td style={{ padding:'9px 10px', fontSize:13, fontWeight:700 }}>{totalH}</td>
                    <td style={{ padding:'9px 10px', fontSize:13, fontWeight:800, color:'var(--blu)' }}>
                      {totalI >= 1e7 ? `₹${(totalI/1e7).toFixed(2)}Cr` : totalI >= 1e5 ? `₹${(totalI/1e5).toFixed(2)}L` : `₹${totalI.toLocaleString('en-IN',{maximumFractionDigits:0})}`}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:10 }}>Click a row to switch portfolio</div>
        </div>
      )}

      {displayedHoldings.length > 0 && (
        <>
          <div className="g3" style={{ display:'grid', gap:12, marginBottom:16 }}>
            {[
              { label:'Total Invested', val:`₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits:0 })}` },
              { label:'Current Value',  val:`₹${totalCurrent.toLocaleString('en-IN', { maximumFractionDigits:0 })}` },
              { label:'Total P&L', val:fmt(totalPL), sub:fmtPct(totalPLPct), valC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)', subC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' },
            ].map((m, i) => (
              <div key={m.label} style={{ background:PORT_STAT_GRADS[i][0], border:`1px solid ${PORT_STAT_GRADS[i][1]}`, borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>{m.label}</div>
                <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:(m as { valC?: string }).valC ?? 'var(--txt)' }}>{m.val}</div>
                {(m as { sub?: string }).sub && <div style={{ fontSize:13, fontWeight:700, color:(m as { subC?: string }).subC, marginTop:3 }}>{(m as { sub?: string }).sub}</div>}
              </div>
            ))}
          </div>

          {/* Portfolio performance chart */}
          <PortfolioChart holdings={displayedHoldings.filter(h => h.avg_price >= 1).map(h => ({ symbol: h.symbol, exchange: h.exchange, qty: h.qty, avg_price: h.avg_price }))} />

          {/* Risk metrics */}
          <PortfolioRiskCard holdings={displayedHoldings} totalCurrent={totalCurrent} />

          {/* Dividend tracker */}
          <DividendTracker holdings={displayedHoldings} />

          {/* ML Bucket breakdown — clickable filters */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1 }}>ML Classification</div>
              {activeFilter && (
                <button onClick={() => setActiveFilter(null)}
                  style={{ fontSize:11, fontWeight:700, color:'var(--blu)', background:'rgba(23,64,245,0.08)', border:'1px solid rgba(23,64,245,0.25)', borderRadius:20, padding:'2px 10px', cursor:'pointer', fontFamily:'inherit' }}>
                  ✕ Clear filter
                </button>
              )}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {(Object.keys(BUCKET_META) as MlClass[]).map(key => {
                const count = displayedHoldings.filter(h => (h.ml_class ?? classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0)) === key).length;
                if (count === 0) return null;
                const meta = BUCKET_META[key];
                const isActive = activeFilter === key;
                return (
                  <div key={key} onClick={() => setActiveFilter(isActive ? null : key)}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:30,
                      background: isActive ? meta.bg : 'transparent',
                      border:`1px solid ${isActive ? meta.color : meta.border}`,
                      cursor:'pointer', userSelect:'none',
                      boxShadow: isActive ? `0 0 0 2px ${meta.border}` : 'none',
                      transition:'all 0.12s' }}>
                    <span style={{ fontSize:13, fontWeight:800, color:meta.color }}>{meta.label}</span>
                    <span style={{ fontSize:15, fontWeight:900, color:meta.color }}>{count}</span>
                    <span style={{ fontSize:10, color: isActive ? 'var(--txt)' : 'var(--dim)', maxWidth:120 }}>{meta.desc}</span>
                  </div>
                );
              })}
            </div>
            {activeFilter && (
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>
                Showing <strong style={{ color: BUCKET_META[activeFilter].color }}>{activeFilter}</strong> stocks only · click again or ✕ to show all
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ ...card, borderColor:'rgba(79,111,250,0.18)', background:'linear-gradient(160deg,rgba(79,111,250,0.04),var(--card-bg))' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>{viewMode === 'all' ? 'All Portfolios' : activePortfolio?.name} · Holdings · ML Classified</div>
          {displayedHoldings.length > 0 && <span style={{ fontSize:12, color:'var(--dim)' }}>{displayedHoldings.length} stocks</span>}
        </div>

        {displayedLoading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--dim)', fontSize:14 }}>⏳ Fetching prices…</div>
        ) : displayedHoldings.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📂</div>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:6 }}>No holdings in {viewMode === 'all' ? 'any portfolio' : (activePortfolio?.name ?? '')}</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Upload your broker export — CSV, Excel, or DP PDF.</div>
            <button onClick={() => fileRef.current?.click()} disabled={syncing}
              style={{ height:48, padding:'0 32px', borderRadius:12, background:'var(--blu)', border:'none', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:16, display:'inline-flex', alignItems:'center', gap:10 }}>
              {syncing ? '⏳ Importing…' : '📤 Upload Holdings (CSV / Excel / PDF)'}
            </button>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>or use <strong style={{ color:'var(--txt)' }}>+ Add Stock</strong> above to add manually</div>
            <div style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:12, padding:'16px 20px', display:'inline-block', textAlign:'left', maxWidth:480 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', marginBottom:10 }}>Supported formats</div>
              {[
                ['MStock / Mirae', 'Holdings → DP Holding Statement (PDF)'],
                ['Upstox', 'Portfolio → Holding Statement (Excel) ✓ auto-import'],
                ['Zerodha Kite', 'Holdings → Export CSV'],
                ['Zerodha Console', 'Reports → Holdings → Download'],
                ['ICICI Direct', 'Portfolio → Export CSV (PDF not supported)'],
                ['HDFC Securities', 'Portfolio → Download CSV (HDFC SKY app)'],
                ['Groww', 'Portfolio → Download statement'],
                ['SignalGenie CSV', 'SYMBOL, QTY, AVG_PRICE, EXCHANGE'],
              ].map(([broker, hint]) => (
                <div key={broker} style={{ display:'flex', gap:8, marginBottom:7, fontSize:12 }}>
                  <span style={{ color:'var(--grn)', fontWeight:700, minWidth:120 }}>{broker}</span>
                  <span style={{ color:'var(--dim)' }}>{hint}</span>
                </div>
              ))}
              <div style={{ fontSize:11, color:'var(--ylw)', marginTop:10, borderTop:'1px solid var(--bdr)', paddingTop:10 }}>
                ℹ️ Upstox Holding Statement: imports directly — avg price pre-filled with last CMP, edit for accurate P&amp;L. MStock DP PDF: enter avg cost manually after import.
              </div>
            </div>
          </div>
        ) : (() => {
          const filtered = activeFilter
            ? sortedHoldings.filter(h => (h.ml_class ?? classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0)) === activeFilter)
            : sortedHoldings;
          const equities = filtered.filter(h => !h.is_etf);
          const etfs     = filtered.filter(h =>  h.is_etf);

          const TH = ({ label, col, className }: { label: string; col: typeof sortCol | null; className?: string }) => {
            const active = col && col === sortCol;
            const arrow  = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : col ? ' ⇅' : '';
            return (
              <th className={className} onClick={col ? () => toggleSort(col) : undefined}
                style={{ fontSize:10.5, fontWeight:700, color: active ? 'var(--txt)' : 'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap', cursor: col ? 'pointer' : 'default', userSelect:'none' }}>
                {label}{arrow}
              </th>
            );
          };

          const HoldingRow = ({ h }: { h: Holding }) => {
            const clsKey = h.ml_class ?? classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0);
            const cls    = BUCKET_META[clsKey];
            const plPos  = (h.pl ?? 0) >= 0;
            const isEditingCost = editingCostId === h.id;
            return (
              <tr key={h.id} onClick={() => !isEditingCost && setSelectedStock(h)}
                style={{ cursor:'pointer', transition:'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--dim)' }}>{h.exchange} · {h.qty}u</div>
                </td>
                <td className="mob-hide" style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                  {!h.is_etf && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:cls.bg, color:cls.color, whiteSpace:'nowrap' }}>{cls.label}</span>}
                </td>
                <td className="mob-hide" style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                  {isEditingCost ? (
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <input autoFocus type="number" value={editCostVal} onChange={e => setEditCostVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateCost(h.id); if (e.key === 'Escape') setEditingCostId(null); }}
                        style={{ width:80, height:28, borderRadius:6, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:12, padding:'0 6px', fontFamily:'inherit', outline:'none' }}/>
                      <button onClick={() => handleUpdateCost(h.id)} style={{ background:'none', border:'none', color:'var(--grn)', cursor:'pointer', fontSize:13 }}>✓</button>
                      <button onClick={() => setEditingCostId(null)} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:13 }}>✕</button>
                    </div>
                  ) : h.avg_price < 1 ? (
                    <button onClick={() => { setEditingCostId(h.id); setEditCostVal(''); }}
                      style={{ fontSize:11, fontWeight:600, color:'var(--ylw)', background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.3)', borderRadius:5, padding:'2px 8px', cursor:'pointer', fontFamily:'inherit' }}>
                      Enter cost
                    </button>
                  ) : (
                    <span style={{ fontSize:13, fontWeight:600, cursor:'pointer' }} title="Click to edit"
                      onClick={() => { setEditingCostId(h.id); setEditCostVal(String(h.avg_price)); }}>
                      ₹{h.avg_price.toLocaleString('en-IN')}
                    </span>
                  )}
                </td>
                <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                  {h.current_price != null ? (
                    <>
                      <div style={{ fontSize:13, fontWeight:700 }}>₹{h.current_price.toLocaleString('en-IN', { maximumFractionDigits:0 })}</div>
                      {h.change_pct != null && <div style={{ fontSize:11, color: h.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>{h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%</div>}
                    </>
                  ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                </td>
                <td className="mob-hide" style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                  {h.pl != null && h.avg_price >= 1 ? (
                    <>
                      <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmt(h.pl)}</div>
                      <div style={{ fontSize:11, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmtPct(h.pl_pct ?? 0)}</div>
                    </>
                  ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                </td>
                <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                  {!h.is_etf && (
                    <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 8px', borderRadius:5, whiteSpace:'nowrap',
                      background: h.signal?.includes('BUY') ? 'rgba(0,212,160,0.12)' : h.signal?.includes('SELL') ? 'rgba(255,59,92,0.12)' : 'rgba(255,184,0,0.12)',
                      color: h.signal?.includes('BUY') ? 'var(--grn)' : h.signal?.includes('SELL') ? 'var(--red)' : 'var(--ylw)' }}>
                      {h.signal ?? 'HOLD'}
                    </span>
                  )}
                </td>
                <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                  <button onClick={e => { e.stopPropagation(); handleDelete(h.id); }} style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14, padding:'2px 4px' }} title="Remove">✕</button>
                </td>
              </tr>
            );
          };

          const colHeaders = (
            <tr>
              <TH label="Stock"     col="symbol"                  />
              <TH label="ML Class"  col={null}    className="mob-hide" />
              <TH label="Avg Price" col="avg_price" className="mob-hide" />
              <TH label="CMP"       col="current_price" />
              <TH label="P&L ₹"     col="pl"            />
              <TH label="P&L %"     col="pl_pct"        />
              <TH label="Signal"    col={null}          />
              <TH label=""          col={null}          />
            </tr>
          );

          return (
            <div style={{ overflowX:'auto' }}>
              {equities.length > 0 && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, padding:'4px 10px 8px' }}>
                    Equity Holdings · {equities.length}
                  </div>
                  <table className="port-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>{colHeaders}</thead>
                    <tbody>{equities.map(h => <HoldingRow key={h.id} h={h} />)}</tbody>
                  </table>
                </>
              )}
              {etfs.length > 0 && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, padding:'16px 10px 8px', marginTop: equities.length > 0 ? 8 : 4, borderTop: equities.length > 0 ? '1px solid var(--bdr)' : 'none' }}>
                    ETF / MF Holdings · {etfs.length}
                  </div>
                  <table className="port-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>{colHeaders}</thead>
                    <tbody>{etfs.map(h => <HoldingRow key={h.id} h={h} />)}</tbody>
                  </table>
                </>
              )}
            </div>
          );
        })()}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14, lineHeight:1.6 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · ML classifications for informational purposes only · Not financial advice · DYOR
      </div>

      {selectedStock && (() => {
        const h = selectedStock;
        const clsKey = h.ml_class ?? classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0);
        return (
          <StockDetailSheet
            symbol={h.symbol}
            exchange={h.exchange === 'BSE' ? 'BSE' : 'NSE'}
            onClose={() => setSelectedStock(null)}
            holding={{
              qty: h.qty,
              avgPrice: h.avg_price,
              currency: 'INR',
              portfolioName: h.exchange,
              mlBadge: !h.is_etf ? BUCKET_META[clsKey] : undefined,
              mlSignal: h.signal,
              isEtf: h.is_etf,
              onDelete: () => { handleDelete(h.id); setSelectedStock(null); },
            }}
          />
        );
      })()}

    </>
  );
}
