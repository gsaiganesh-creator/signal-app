'use client';

// Static sector mapping — top 200 NSE stocks
const SECTOR: Record<string, string> = {
  // Banking & Finance
  HDFCBANK:'Banking', ICICIBANK:'Banking', SBIN:'Banking', KOTAKBANK:'Banking', AXISBANK:'Banking',
  BANKBARODA:'Banking', CANBK:'Banking', PNB:'Banking', INDUSINDBK:'Banking', FEDERALBNK:'Banking',
  BAJFINANCE:'NBFC', BAJAJFINSV:'NBFC', CHOLAFIN:'NBFC', MUTHOOTFIN:'NBFC', MANAPPURAM:'NBFC',
  HDFCLIFE:'Insurance', SBILIFE:'Insurance', ICICIGI:'Insurance', LICI:'Insurance',
  // IT
  TCS:'IT', INFY:'IT', WIPRO:'IT', HCLTECH:'IT', TECHM:'IT', LTIM:'IT', PERSISTENT:'IT',
  MPHASIS:'IT', COFORGE:'IT', OFSS:'IT', KPITTECH:'IT',
  // Oil & Gas
  RELIANCE:'Oil & Gas', ONGC:'Oil & Gas', BPCL:'Oil & Gas', IOC:'Oil & Gas', GAIL:'Oil & Gas',
  OIL:'Oil & Gas', MGL:'Oil & Gas', IGL:'Oil & Gas', PETRONET:'Oil & Gas',
  // Pharma
  SUNPHARMA:'Pharma', DRREDDY:'Pharma', DIVISLAB:'Pharma', CIPLA:'Pharma', APOLLOHOSP:'Pharma',
  LUPIN:'Pharma', BIOCON:'Pharma', AUROPHARMA:'Pharma', ALKEM:'Pharma', TORNTPHARM:'Pharma',
  // Auto
  MARUTI:'Auto', TATAMOTORS:'Auto', BAJAJ_AUTO:'Auto', EICHERMOT:'Auto', HEROMOTOCO:'Auto',
  TVSMOTORS:'Auto', ASHOKLEY:'Auto', MOTHERSON:'Auto', BALKRISIND:'Auto', MRF:'Auto',
  // FMCG
  HINDUNILVR:'FMCG', ITC:'FMCG', NESTLEIND:'FMCG', BRITANNIA:'FMCG', DABUR:'FMCG',
  MARICO:'FMCG', GODREJCP:'FMCG', COLPAL:'FMCG', EMAMILTD:'FMCG', PGHH:'FMCG',
  // Metal & Mining
  TATASTEEL:'Metal', JSWSTEEL:'Metal', HINDALCO:'Metal', COALINDIA:'Metal', VEDL:'Metal',
  NMDC:'Metal', SAIL:'Metal', NATIONALUM:'Metal', APLAPOLLO:'Metal',
  // Infra / Construction
  LT:'Infra', ADANIENT:'Infra', ADANIPORTS:'Infra', ADANITRANS:'Infra', IRCTC:'Infra',
  IRFC:'Infra', RECLTD:'Infra', PFC:'Infra', HUDCO:'Infra',
  // Power
  NTPC:'Power', POWERGRID:'Power', TATAPOWER:'Power', CESC:'Power', NHPC:'Power', SJVN:'Power',
  // Telecom
  BHARTIARTL:'Telecom', IDEA:'Telecom',
  // Consumer
  TITAN:'Consumer', ASIANPAINT:'Consumer', BERGERPAINTS:'Consumer', PIDILITIND:'Consumer',
  HAVELLS:'Consumer', VOLTAS:'Consumer', WHIRLPOOL:'Consumer', DMART:'Consumer',
  // Cement
  ULTRACEMCO:'Cement', GRASIM:'Cement', AMBUJACEM:'Cement', ACC:'Cement', JKCEMENT:'Cement',
  RAMCOCEM:'Cement',
  // Realty
  DLF:'Realty', GODREJPROP:'Realty', PRESTIGE:'Realty', OBEROIRLTY:'Realty', LODHA:'Realty',
};

function getSector(sym: string): string {
  return SECTOR[sym.toUpperCase()] ?? 'Other';
}

interface H {
  symbol: string;
  qty: number;
  avg_price: number;
  current_price?: number | null;
  pl_pct?: number | null;
  pl?: number | null;
}

interface Props {
  holdings: H[];
  totalCurrent: number;
}

function score(holdings: H[], totalCurrent: number): { val: number; label: string; color: string } {
  if (!holdings.length || !totalCurrent) return { val: 0, label: 'N/A', color: 'var(--dim)' };
  const sorted  = [...holdings].sort((a, b) => (b.current_price ?? b.avg_price) * b.qty - (a.current_price ?? a.avg_price) * a.qty);
  const top1Pct = ((sorted[0]?.current_price ?? sorted[0]?.avg_price ?? 0) * (sorted[0]?.qty ?? 0)) / totalCurrent * 100;
  const top3Pct = sorted.slice(0, 3).reduce((s, h) => s + (h.current_price ?? h.avg_price) * h.qty / totalCurrent * 100, 0);
  const n       = holdings.length;
  const sectors = new Set(holdings.map(h => getSector(h.symbol))).size;
  let pts = 0;
  if (n >= 15)        pts += 2; else if (n >= 8) pts += 1;
  if (sectors >= 5)   pts += 2; else if (sectors >= 3) pts += 1;
  if (top1Pct < 20)   pts += 2; else if (top1Pct < 35) pts += 1;
  if (top3Pct < 45)   pts += 2; else if (top3Pct < 60) pts += 1;
  const pct = Math.round(pts / 8 * 100);
  if (pct >= 75) return { val: pct, label: 'Well Diversified',   color: 'var(--grn)' };
  if (pct >= 50) return { val: pct, label: 'Moderate Risk',      color: 'var(--ylw)' };
  return              { val: pct, label: 'Concentrated Portfolio', color: 'var(--red)' };
}

export function PortfolioRiskCard({ holdings, totalCurrent }: Props) {
  if (!holdings.length || !totalCurrent) return null;

  const valid   = holdings.filter(h => h.avg_price >= 1);
  const sorted  = [...valid].sort((a, b) => (b.current_price ?? b.avg_price) * b.qty - (a.current_price ?? a.avg_price) * a.qty);

  const top1    = sorted[0];
  const top1Pct = top1 ? ((top1.current_price ?? top1.avg_price) * top1.qty) / totalCurrent * 100 : 0;
  const top3Pct = sorted.slice(0, 3).reduce((s, h) => s + (h.current_price ?? h.avg_price) * h.qty / totalCurrent * 100, 0);
  const top5Pct = sorted.slice(0, 5).reduce((s, h) => s + (h.current_price ?? h.avg_price) * h.qty / totalCurrent * 100, 0);

  // Sector breakdown
  const sectorMap: Record<string, number> = {};
  for (const h of valid) {
    const s = getSector(h.symbol);
    sectorMap[s] = (sectorMap[s] ?? 0) + (h.current_price ?? h.avg_price) * h.qty;
  }
  const sectors     = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
  const sectorCount = sectors.length;

  // Winners / losers by pl_pct
  const withPL    = valid.filter(h => h.pl_pct != null);
  const topWinner = [...withPL].sort((a, b) => (b.pl_pct ?? 0) - (a.pl_pct ?? 0))[0];
  const topLoser  = [...withPL].sort((a, b) => (a.pl_pct ?? 0) - (b.pl_pct ?? 0))[0];

  // At-risk: unrealised loss > 10%
  const atRisk    = valid.filter(h => (h.pl_pct ?? 0) < -10);

  const div = score(valid, totalCurrent);

  // Bar chart data — top 5 sectors
  const topSectors = sectors.slice(0, 5);

  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:'18px 20px', marginBottom:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:800, letterSpacing:-0.2 }}>Portfolio Risk Metrics</div>
        <div style={{ padding:'4px 12px', borderRadius:20, background: div.color === 'var(--grn)' ? 'rgba(0,212,160,0.1)' : div.color === 'var(--ylw)' ? 'rgba(255,184,0,0.1)' : 'rgba(255,59,92,0.1)', border:`1px solid ${div.color}40` }}>
          <span style={{ fontSize:11, fontWeight:800, color:div.color }}>{div.label}</span>
          <span style={{ fontSize:11, color:'var(--dim)', marginLeft:6 }}>{div.val}% diversification</span>
        </div>
      </div>

      {/* Concentration stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:16 }}>
        {[
          { label:'Stocks',         value:`${valid.length}`,              sub:'holdings',          color: valid.length >= 10 ? 'var(--grn)' : 'var(--ylw)' },
          { label:'Sectors',        value:`${sectorCount}`,               sub:'covered',           color: sectorCount >= 5  ? 'var(--grn)' : 'var(--ylw)' },
          { label:'Top Holding',    value:`${top1Pct.toFixed(0)}%`,       sub:top1?.symbol ?? '',  color: top1Pct < 20 ? 'var(--grn)' : top1Pct < 35 ? 'var(--ylw)' : 'var(--red)' },
          { label:'Top 3 Weight',   value:`${top3Pct.toFixed(0)}%`,       sub:'of portfolio',      color: top3Pct < 45 ? 'var(--grn)' : top3Pct < 60 ? 'var(--ylw)' : 'var(--red)' },
          { label:'Top 5 Weight',   value:`${top5Pct.toFixed(0)}%`,       sub:'of portfolio',      color: top5Pct < 65 ? 'var(--grn)' : 'var(--ylw)' },
          { label:'At-Risk (>10% loss)', value:`${atRisk.length}`,        sub:atRisk.length === 0 ? 'clean' : atRisk.map(h => h.symbol).join(', ').slice(0,18), color: atRisk.length === 0 ? 'var(--grn)' : 'var(--red)' },
        ].map(m => (
          <div key={m.label} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:17, fontWeight:900, color:m.color, letterSpacing:-0.3 }}>{m.value}</div>
            <div style={{ fontSize:10, color:'var(--dim)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Sector breakdown bar chart */}
      {topSectors.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Sector Allocation</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {topSectors.map(([sec, val]) => {
              const pct = val / totalCurrent * 100;
              const colors = ['var(--blu)','var(--grn)','var(--pur)','var(--ylw)','var(--org)'];
              const ci    = topSectors.findIndex(([s]) => s === sec);
              return (
                <div key={sec} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:80, fontSize:11, color:'var(--dim)', flexShrink:0, textAlign:'right' }}>{sec}</div>
                  <div style={{ flex:1, height:8, background:'var(--surf2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(pct, 100)}%`, background:colors[ci % colors.length], borderRadius:4, transition:'width 0.4s' }} />
                  </div>
                  <div style={{ width:38, fontSize:11, fontWeight:700, color:'var(--txt)', textAlign:'right' }}>{pct.toFixed(0)}%</div>
                </div>
              );
            })}
            {sectors.length > 5 && (
              <div style={{ fontSize:10, color:'var(--dim2)', paddingLeft:88 }}>+{sectors.length - 5} more sectors</div>
            )}
          </div>
        </div>
      )}

      {/* Best / Worst */}
      {(topWinner ?? topLoser) && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {topWinner && (
            <div style={{ flex:1, minWidth:120, background:'rgba(0,212,160,0.07)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:10, padding:'8px 12px' }}>
              <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>Best Performer</div>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--txt)' }}>{topWinner.symbol}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)' }}>+{(topWinner.pl_pct ?? 0).toFixed(1)}%</div>
            </div>
          )}
          {topLoser && topLoser !== topWinner && (
            <div style={{ flex:1, minWidth:120, background:'rgba(255,59,92,0.07)', border:'1px solid rgba(255,59,92,0.2)', borderRadius:10, padding:'8px 12px' }}>
              <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>Worst Performer</div>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--txt)' }}>{topLoser.symbol}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--red)' }}>{(topLoser.pl_pct ?? 0).toFixed(1)}%</div>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize:10, color:'var(--dim2)', marginTop:12 }}>Statistical observations only · Not SEBI advice · DYOR</div>
    </div>
  );
}
