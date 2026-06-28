// Canonical sector → stocks mapping for public sector pages + risk card

export interface SectorDef {
  label: string;
  slug: string;
  description: string;
  stocks: string[];
}

export const SECTORS: SectorDef[] = [
  {
    slug: 'banking', label: 'Banking',
    description: 'NSE-listed banking stocks — live prices, RSI, EMA20/50, technical signals.',
    stocks: ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','BANKBARODA','CANBK','PNB','INDUSINDBK','FEDERALBNK','IDFCFIRSTB','BANDHANBNK'],
  },
  {
    slug: 'it', label: 'IT & Technology',
    description: 'India\'s top IT and software companies — Infosys, TCS, Wipro and more.',
    stocks: ['TCS','INFY','WIPRO','HCLTECH','TECHM','LTIM','PERSISTENT','MPHASIS','COFORGE','OFSS','KPITTECH'],
  },
  {
    slug: 'pharma', label: 'Pharma & Healthcare',
    description: 'NSE pharma and healthcare stocks — Sun Pharma, Dr Reddy, Cipla and peers.',
    stocks: ['SUNPHARMA','DRREDDY','DIVISLAB','CIPLA','APOLLOHOSP','LUPIN','BIOCON','AUROPHARMA','ALKEM','TORNTPHARM','GLENMARK'],
  },
  {
    slug: 'auto', label: 'Auto & Auto Components',
    description: 'India automobile and auto ancillary stocks — Maruti, Tata Motors, Bajaj Auto.',
    stocks: ['MARUTI','TATAMOTORS','EICHERMOT','HEROMOTOCO','TVSMOTORS','ASHOKLEY','MOTHERSON','MRF','BALKRISIND','TVSMOTOR','BAJAJ-AUTO'],
  },
  {
    slug: 'fmcg', label: 'FMCG',
    description: 'Fast-moving consumer goods stocks — HUL, ITC, Nestle, Britannia and peers.',
    stocks: ['HINDUNILVR','ITC','NESTLEIND','BRITANNIA','DABUR','MARICO','GODREJCP','COLPAL','EMAMILTD','PGHH'],
  },
  {
    slug: 'oil-gas', label: 'Oil & Gas',
    description: 'Energy and oil & gas sector — Reliance, ONGC, BPCL, GAIL, IOC.',
    stocks: ['RELIANCE','ONGC','BPCL','IOC','GAIL','OIL','MGL','IGL','PETRONET'],
  },
  {
    slug: 'metal', label: 'Metal & Mining',
    description: 'NSE metal stocks — Tata Steel, JSW Steel, Hindalco, Coal India.',
    stocks: ['TATASTEEL','JSWSTEEL','HINDALCO','COALINDIA','VEDL','NMDC','SAIL','NATIONALUM','APLAPOLLO'],
  },
  {
    slug: 'infra', label: 'Infrastructure',
    description: 'Infrastructure and capital goods stocks — L&T, Adani, IRCTC, PFC.',
    stocks: ['LT','ADANIENT','ADANIPORTS','IRCTC','IRFC','RECLTD','PFC','HUDCO','ABB','SIEMENS'],
  },
  {
    slug: 'power', label: 'Power & Utilities',
    description: 'Power generation and distribution stocks — NTPC, Power Grid, Tata Power.',
    stocks: ['NTPC','POWERGRID','TATAPOWER','NHPC','SJVN','CESC','TORNTPOWER','ADANIGREEN'],
  },
  {
    slug: 'nbfc', label: 'NBFC & Finance',
    description: 'Non-banking financial companies — Bajaj Finance, Chola, Muthoot.',
    stocks: ['BAJFINANCE','BAJAJFINSV','CHOLAFIN','MUTHOOTFIN','MANAPPURAM','LICHSGFIN','M&MFIN'],
  },
  {
    slug: 'consumer', label: 'Consumer & Retail',
    description: 'Consumer brands and retail stocks — Titan, Asian Paints, DMart.',
    stocks: ['TITAN','ASIANPAINT','BERGERPAINTS','PIDILITIND','HAVELLS','VOLTAS','DMART','TRENT','VMART'],
  },
  {
    slug: 'cement', label: 'Cement',
    description: 'NSE cement sector stocks — UltraTech, Grasim, Ambuja, ACC.',
    stocks: ['ULTRACEMCO','GRASIM','AMBUJACEM','ACC','JKCEMENT','RAMCOCEM','HEIDELBERG'],
  },
  {
    slug: 'realty', label: 'Real Estate',
    description: 'Real estate and property development stocks — DLF, Godrej Properties.',
    stocks: ['DLF','GODREJPROP','PRESTIGE','OBEROIRLTY','LODHA','BRIGADE','SOBHA'],
  },
  {
    slug: 'telecom', label: 'Telecom',
    description: 'Indian telecom sector — Bharti Airtel.',
    stocks: ['BHARTIARTL','IDEA','INDIAMART','ROUTE'],
  },
];

export const SLUG_MAP: Record<string, SectorDef> = Object.fromEntries(SECTORS.map(s => [s.slug, s]));
