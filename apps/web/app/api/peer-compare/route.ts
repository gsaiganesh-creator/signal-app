export const runtime = 'edge';
import { fetchYahooQuoteSummary } from '@/lib/yahoo-auth';

// Sector → peer list (top NSE stocks by market cap / liquidity)
const SECTOR_PEERS: Record<string, string[]> = {
  IT:       ['TCS','INFY','WIPRO','HCLTECH','TECHM','LTIM','MPHASIS','COFORGE','PERSISTENT'],
  BANKING:  ['HDFCBANK','ICICIBANK','KOTAKBANK','AXISBANK','SBIN','INDUSINDBK','FEDERALBNK','BANDHANBNK','IDFCFIRSTB'],
  FINANCE:  ['BAJFINANCE','BAJAJFINSV','CHOLAFIN','MUTHOOTFIN','LICHSGFIN','MANAPPURAM','CANFINHOME'],
  AUTO:     ['MARUTI','TATAMOTORS','M&M','BAJAJ-AUTO','HEROMOTOCO','EICHERMOT','TVSMOTOR','ASHOKLEY'],
  PHARMA:   ['SUNPHARMA','CIPLA','DRREDDY','DIVISLAB','LUPIN','AUROPHARMA','TORNTPHARM','ALKEM','IPCALAB'],
  FMCG:     ['HINDUNILVR','ITC','NESTLEIND','BRITANNIA','DABUR','MARICO','GODREJCP','EMAMILTD','COLPAL'],
  METALS:   ['TATASTEEL','JSWSTEEL','HINDALCO','VEDL','SAIL','NMDC','JINDALSTEL','NATIONALUM'],
  ENERGY:   ['RELIANCE','ONGC','NTPC','POWERGRID','COALINDIA','BPCL','IOC','ADANIGREEN','TORNTPOWER'],
  REALTY:   ['DLF','GODREJPROP','OBEROIREALTY','PRESTIGE','PHOENIXLTD','BRIGADE','SOBHA','LODHA'],
  TELECOM:  ['BHARTIARTL','IDEA','TATACOMM','INDUSTOWER'],
  CONSUMER: ['TITAN','ASIANPAINT','PIDILITIND','HAVELLS','VOLTAS','BLUESTARCO','VGUARD'],
  CEMENT:   ['ULTRACEMCO','SHREECEM','ACC','AMBUJACEM','DALMIACEMEN','JKCEMENT','HEIDELBERG'],
  INFRA:    ['LT','ADANIPORTS','IRB','KNR','PNC','GPPL','GMRAIRPORT'],
  HOSPITAL: ['APOLLOHOSP','FORTIS','MAXHEALTH','NARAYANA','METROPOLIS','DRLALPATH'],
};

// Symbol → sector (NSE base symbols only, no .NS suffix)
const SYMBOL_SECTOR: Record<string, string> = {
  // IT
  TCS:'IT', INFY:'IT', WIPRO:'IT', HCLTECH:'IT', TECHM:'IT', LTIM:'IT', MPHASIS:'IT', COFORGE:'IT', PERSISTENT:'IT',
  // Banking
  HDFCBANK:'BANKING', ICICIBANK:'BANKING', KOTAKBANK:'BANKING', AXISBANK:'BANKING', SBIN:'BANKING',
  INDUSINDBK:'BANKING', FEDERALBNK:'BANKING', BANDHANBNK:'BANKING', IDFCFIRSTB:'BANKING',
  // Finance / NBFC
  BAJFINANCE:'FINANCE', BAJAJFINSV:'FINANCE', CHOLAFIN:'FINANCE', MUTHOOTFIN:'FINANCE',
  LICHSGFIN:'FINANCE', MANAPPURAM:'FINANCE', CANFINHOME:'FINANCE',
  // Auto
  MARUTI:'AUTO', TATAMOTORS:'AUTO', 'M&M':'AUTO', 'BAJAJ-AUTO':'AUTO',
  HEROMOTOCO:'AUTO', EICHERMOT:'AUTO', TVSMOTOR:'AUTO', ASHOKLEY:'AUTO',
  // Pharma
  SUNPHARMA:'PHARMA', CIPLA:'PHARMA', DRREDDY:'PHARMA', DIVISLAB:'PHARMA',
  LUPIN:'PHARMA', AUROPHARMA:'PHARMA', TORNTPHARM:'PHARMA', ALKEM:'PHARMA', IPCALAB:'PHARMA',
  // FMCG
  HINDUNILVR:'FMCG', ITC:'FMCG', NESTLEIND:'FMCG', BRITANNIA:'FMCG',
  DABUR:'FMCG', MARICO:'FMCG', GODREJCP:'FMCG', EMAMILTD:'FMCG', COLPAL:'FMCG',
  // Metals
  TATASTEEL:'METALS', JSWSTEEL:'METALS', HINDALCO:'METALS', VEDL:'METALS',
  SAIL:'METALS', NMDC:'METALS', JINDALSTEL:'METALS', NATIONALUM:'METALS',
  // Energy / Power
  RELIANCE:'ENERGY', ONGC:'ENERGY', NTPC:'ENERGY', POWERGRID:'ENERGY',
  COALINDIA:'ENERGY', BPCL:'ENERGY', IOC:'ENERGY', ADANIGREEN:'ENERGY', TORNTPOWER:'ENERGY',
  // Realty
  DLF:'REALTY', GODREJPROP:'REALTY', OBEROIREALTY:'REALTY', PRESTIGE:'REALTY',
  PHOENIXLTD:'REALTY', BRIGADE:'REALTY', SOBHA:'REALTY', LODHA:'REALTY',
  // Telecom
  BHARTIARTL:'TELECOM', IDEA:'TELECOM', TATACOMM:'TELECOM', INDUSTOWER:'TELECOM',
  // Consumer Discretionary
  TITAN:'CONSUMER', ASIANPAINT:'CONSUMER', PIDILITIND:'CONSUMER', HAVELLS:'CONSUMER',
  VOLTAS:'CONSUMER', BLUESTARCO:'CONSUMER', VGUARD:'CONSUMER',
  // Cement
  ULTRACEMCO:'CEMENT', SHREECEM:'CEMENT', ACC:'CEMENT', AMBUJACEM:'CEMENT',
  DALMIACEMEN:'CEMENT', JKCEMENT:'CEMENT', HEIDELBERG:'CEMENT',
  // Infrastructure
  LT:'INFRA', ADANIPORTS:'INFRA', IRB:'INFRA', KNR:'INFRA',
  // Hospital / Diagnostics
  APOLLOHOSP:'HOSPITAL', FORTIS:'HOSPITAL', MAXHEALTH:'HOSPITAL',
  NARAYANA:'HOSPITAL', METROPOLIS:'HOSPITAL', DRLALPATH:'HOSPITAL',
};

type Peer = {
  symbol: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  trailing_pe: number | null;
  roe: number | null;
  market_cap: number | null;
};

async function fetchPeer(sym: string, exchange: string): Promise<Peer> {
  const suffix = exchange === 'BSE' ? '.BO' : '.NS';
  const ySym   = `${sym}${suffix}`;
  const hdrs   = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

  const [chartRes, qsRes] = await Promise.all([
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
      { headers: hdrs, signal: AbortSignal.timeout(6000) }),
    fetchYahooQuoteSummary(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=summaryDetail,financialData`),
  ]);

  let price: number | null = null, change_pct: number | null = null, name = sym;
  if (chartRes.ok) {
    const d = await chartRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; longName?: string; shortName?: string } }> } };
    const meta = d?.chart?.result?.[0]?.meta;
    price      = meta?.regularMarketPrice ?? null;
    change_pct = meta?.regularMarketChangePercent ?? null;
    name       = meta?.longName ?? meta?.shortName ?? sym;
  }

  let trailing_pe: number | null = null, roe: number | null = null, market_cap: number | null = null;
  if (qsRes.ok) {
    const d = await qsRes.json() as {
      quoteSummary?: { result?: Array<{
        summaryDetail?: { trailingPE?: { raw?: number }; marketCap?: { raw?: number } };
        financialData?: { returnOnEquity?: { raw?: number } };
      }> }
    };
    const qs   = d?.quoteSummary?.result?.[0];
    trailing_pe = qs?.summaryDetail?.trailingPE?.raw  ? +qs.summaryDetail.trailingPE.raw.toFixed(1) : null;
    roe         = qs?.financialData?.returnOnEquity?.raw ? +(qs.financialData.returnOnEquity.raw * 100).toFixed(1) : null;
    market_cap  = qs?.summaryDetail?.marketCap?.raw ?? null;
  }

  return { symbol: sym, name, price, change_pct, trailing_pe, roe, market_cap };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw      = (searchParams.get('symbol') ?? '').trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();

  const sector = SYMBOL_SECTOR[raw];
  if (!sector) return Response.json({ peers: [], sector: null });

  const peers = (SECTOR_PEERS[sector] ?? []).filter(s => s !== raw).slice(0, 5);
  if (!peers.length) return Response.json({ peers: [], sector });

  const settled = await Promise.allSettled(peers.map(p => fetchPeer(p, exchange)));
  const data    = settled.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as Peer[];

  return Response.json({ peers: data, sector }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  });
}
