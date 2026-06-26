'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Algorithm {
  id: string;
  name: string;
  icon: string;
  category: string;
  timeframe: string;
  returns: string;
  winRate: string;
  maxDD: string;
  description: string;
  logic: string;
  params: { label: string; value: string }[];
  tags: string[];
  pro: boolean;
}

const ALGOS: Algorithm[] = [
  {
    id: 'rsi-ema-cross',
    name: 'RSI + EMA Crossover',
    icon: '📈',
    category: 'Momentum',
    timeframe: 'Daily · Swing (3–10 days)',
    returns: '+28.4% CAGR',
    winRate: '58%',
    maxDD: '-12.3%',
    description: 'Enters when RSI crosses 50 from below AND price crosses above 21-day EMA with volume confirmation. Exits at RSI > 75 or 5% stop-loss.',
    logic: `# RSI + EMA Crossover
# Entry conditions
entry = (
    RSI(14) crosses_above 50
    AND close > EMA(21)
    AND volume > SMA(volume, 20) * 1.3
    AND close > close[-5]          # price momentum
)

# Exit conditions
exit = (
    RSI(14) > 75
    OR close < EMA(21) * 0.98      # 2% below EMA
    OR pnl_pct < -5.0              # stop loss
)

# Position sizing
position_size = 0.05  # 5% of portfolio per trade
max_positions = 10`,
    params: [
      { label: 'RSI Period', value: '14' },
      { label: 'RSI Entry Level', value: '50' },
      { label: 'RSI Exit Level', value: '75' },
      { label: 'EMA Period', value: '21' },
      { label: 'Volume Multiplier', value: '1.3x' },
      { label: 'Stop Loss', value: '5%' },
    ],
    tags: ['RSI', 'EMA', 'Momentum', 'Swing'],
    pro: false,
  },
  {
    id: 'dual-ema',
    name: 'Dual EMA Trend Follower',
    icon: '🌊',
    category: 'Trend Following',
    timeframe: 'Daily · Positional (2–6 weeks)',
    returns: '+34.1% CAGR',
    winRate: '52%',
    maxDD: '-18.7%',
    description: 'Golden cross strategy: 20/50 EMA crossover with ADX > 25 confirming trend strength. Trailing stop locks profits as trend extends.',
    logic: `# Dual EMA Trend Follower
# Entry: Golden cross with trend confirmation
entry = (
    EMA(20) crosses_above EMA(50)
    AND ADX(14) > 25               # strong trend
    AND close > EMA(200)           # above long-term trend
    AND RSI(14) between 45 and 70  # not overbought entry
)

# Trailing stop exit
trailing_stop = highest_close[-10:] * 0.93   # 7% trail
exit = (
    close < trailing_stop
    OR EMA(20) < EMA(50)           # death cross
)

# Weekly rebalance check
rebalance = 'friday_close'`,
    params: [
      { label: 'Fast EMA', value: '20' },
      { label: 'Slow EMA', value: '50' },
      { label: 'Long-term EMA', value: '200' },
      { label: 'ADX Period', value: '14' },
      { label: 'ADX Threshold', value: '25' },
      { label: 'Trailing Stop', value: '7%' },
    ],
    tags: ['EMA', 'ADX', 'Trend', 'Positional'],
    pro: false,
  },
  {
    id: 'mean-reversion-bb',
    name: 'Bollinger Band Mean Reversion',
    icon: '↩️',
    category: 'Mean Reversion',
    timeframe: 'Daily · Short-term (2–5 days)',
    returns: '+21.8% CAGR',
    winRate: '64%',
    maxDD: '-9.2%',
    description: 'Buys quality stocks when price touches lower BB (2σ) with RSI < 35 and no fundamental deterioration. Quick mean-reversion to middle band.',
    logic: `# Bollinger Band Mean Reversion
BB_upper, BB_mid, BB_lower = BBANDS(close, 20, 2)

# Entry: oversold at lower band
entry = (
    close <= BB_lower              # touch lower band
    AND RSI(14) < 35               # oversold RSI
    AND close > SMA(close, 200)    # in long-term uptrend
    AND volume < SMA(volume, 10)   # low-volume pullback (not distribution)
)

# Target: middle band
target = BB_mid

# Stop: 3% below entry
stop = entry_price * 0.97`,
    params: [
      { label: 'BB Period', value: '20' },
      { label: 'BB StdDev', value: '2.0' },
      { label: 'RSI Period', value: '14' },
      { label: 'RSI Oversold', value: '35' },
      { label: 'Target', value: 'BB Midline' },
      { label: 'Stop Loss', value: '3%' },
    ],
    tags: ['Bollinger', 'RSI', 'Oversold', 'Mean Reversion'],
    pro: false,
  },
  {
    id: 'opening-range-breakout',
    name: 'Opening Range Breakout (ORB)',
    icon: '🔺',
    category: 'Intraday',
    timeframe: '15-min · Intraday',
    returns: '+41.2% CAGR',
    winRate: '49%',
    maxDD: '-8.5%',
    description: 'Captures the first 15-min range (09:15–09:30) then trades the breakout direction with volume surge confirmation. Risk:reward minimum 1:2.',
    logic: `# Opening Range Breakout
# Define opening range (first 15 min)
orb_high = max(high[09:15:00 to 09:30:00])
orb_low  = min(low [09:15:00 to 09:30:00])
orb_size = orb_high - orb_low

# Long entry
long_entry = (
    close > orb_high               # breakout above range
    AND volume > prev_volume * 2   # volume surge
    AND time < 13:00               # only morning session
    AND orb_size < atr(14) * 0.5   # tight range (quality ORB)
)

# Target and stop
long_target = orb_high + orb_size * 2   # 2x range extension
long_stop   = orb_high - orb_size * 0.5 # tight stop below breakout`,
    params: [
      { label: 'Range Period', value: '15 min' },
      { label: 'Volume Surge', value: '2x' },
      { label: 'Max Entry Time', value: '13:00 IST' },
      { label: 'Target', value: '2x ORB Size' },
      { label: 'Stop', value: '0.5x below breakout' },
      { label: 'Risk:Reward', value: 'Min 1:2' },
    ],
    tags: ['Intraday', 'Breakout', 'Opening Range', '15-min'],
    pro: true,
  },
  {
    id: 'sector-rotation',
    name: 'Nifty Sector Rotation',
    icon: '🔄',
    category: 'Macro / Rotation',
    timeframe: 'Weekly · Medium-term (4–12 weeks)',
    returns: '+38.7% CAGR',
    winRate: '61%',
    maxDD: '-14.1%',
    description: 'Ranks 13 Nifty sectors by 12-1 momentum (12-week return minus last week). Holds top 3 sectors via index ETFs. Rebalances every Monday.',
    logic: `# Nifty Sector Rotation
SECTORS = [
    'NIFTYFMCG', 'NIFTYIT', 'NIFTYBANK',
    'NIFTYPHARMA', 'NIFTYAUTO', 'NIFTYREALTY',
    'NIFTYMETAL', 'NIFTYENERGY', 'NIFTYINFRA',
    'NIFTYMEDIA', 'NIFTYPSUBANK', 'NIFTYFINSERV'
]

# Score each sector (12-1 momentum)
def momentum_score(ticker):
    r12w = returns(ticker, 12_weeks)
    r1w  = returns(ticker, 1_week)
    return r12w - r1w    # exclude last week (reversal noise)

# Weekly Monday rebalance
ranked = sorted(SECTORS, key=momentum_score, reverse=True)
top3   = ranked[:3]

# Equal weight in top 3 sector ETFs
allocation = { s: 1/3 for s in top3 }`,
    params: [
      { label: 'Sectors', value: '12 Nifty Sectors' },
      { label: 'Momentum', value: '12-1 weeks' },
      { label: 'Holdings', value: 'Top 3 sectors' },
      { label: 'Weighting', value: 'Equal weight' },
      { label: 'Rebalance', value: 'Every Monday' },
      { label: 'Instruments', value: 'Sector ETFs' },
    ],
    tags: ['Sector', 'Rotation', 'ETF', 'Macro', 'Weekly'],
    pro: true,
  },
  {
    id: 'volatility-breakout',
    name: 'Volatility Contraction Breakout',
    icon: '💥',
    category: 'Breakout',
    timeframe: 'Daily · Swing (5–15 days)',
    returns: '+44.9% CAGR',
    winRate: '47%',
    maxDD: '-21.3%',
    description: 'Detects stocks in low-volatility compression (BB width < 5-year low percentile). Trades the explosive breakout when price exits the squeeze zone.',
    logic: `# Volatility Contraction Breakout (VCB)
bb_width = (BB_upper - BB_lower) / BB_mid
bb_width_pct = percentile_rank(bb_width, 252)   # 1-year lookback

# Compression phase: volatility at multi-year low
in_squeeze = bb_width_pct < 20    # bottom 20% of annual range

# Breakout trigger
breakout_up = (
    in_squeeze
    AND close > BB_upper           # exit squeeze upward
    AND volume > SMA(vol, 20) * 1.5
    AND MACD_signal > 0            # bullish bias
)

# Target: 2x the BB width projected up
width_pips = BB_upper - BB_lower
target = BB_upper + width_pips * 2
stop   = BB_mid                   # back inside squeeze = failed`,
    params: [
      { label: 'BB Period', value: '20' },
      { label: 'Width Percentile', value: '< 20th' },
      { label: 'Volume Confirm', value: '1.5x' },
      { label: 'Target', value: '2x BB Width' },
      { label: 'Stop', value: 'BB Midline' },
      { label: 'Max Hold', value: '15 days' },
    ],
    tags: ['Volatility', 'Breakout', 'Squeeze', 'MACD'],
    pro: true,
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(ALGOS.map(a => a.category)))];

const card: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'20px' };

export default function AlgorithmsPage() {
  const [tab,      setTab    ] = useState<'library'|'deploy'>('library');
  const [cat,      setCat    ] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied,   setCopied ] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState<string | null>(null);

  const isPro = false;

  const filtered = ALGOS.filter(a => cat === 'All' || a.category === cat);

  function copyLogic(a: Algorithm) {
    if (!isPro && a.pro) return;
    navigator.clipboard.writeText(a.logic).then(() => {
      setCopied(a.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, gap:16, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Algorithm Library</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>
            Battle-tested trading algorithms. View logic, parameters, and backtested stats. Pro users can copy and run these in Algo Builder.
          </div>
        </div>
        {!isPro && (
          <Link href="/dashboard/upgrade"
            style={{ height:40, padding:'0 18px', borderRadius:10, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            ⚡ Upgrade to Pro
          </Link>
        )}
      </div>

      {/* Main tab switcher: Library | Deploy */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--surf2)', borderRadius:10, padding:4, width:'fit-content', border:'1px solid var(--card-bdr)' }}>
        {(['library','deploy'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ height:34, padding:'0 18px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, transition:'all 0.15s',
              background: tab === t ? 'var(--surf)' : 'transparent',
              color: tab === t ? 'var(--txt)' : 'var(--dim)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}>
            {t === 'library' ? '📚 Library' : '🚀 Deploy'}
          </button>
        ))}
      </div>

      {/* Pro banner — library tab only */}
      {tab === 'library' && !isPro && (
        <div style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.08),rgba(255,92,26,0.05))', border:'1px solid rgba(255,184,0,0.25)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24 }}>🔒</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>All algorithms locked (Pro only)</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>
              Upgrade to view logic, parameters, and copy into Algo Builder. Deploy tab also requires Pro.
            </div>
          </div>
        </div>
      )}

      {tab === 'library' && <>
      {/* Stats bar */}
      <div className="g4" style={{ display:'grid', gap:10, marginBottom:20 }}>
        {[
          { label:'Algorithms', value: ALGOS.length.toString(), icon:'⚙️' },
          { label:'Avg Win Rate', value:'55%', icon:'🎯' },
          { label:'Avg CAGR', value:'+34.9%', icon:'📈' },
          { label:'Avg Max DD', value:'-14%', icon:'🛡️' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:12, color:'var(--dim)' }}>
        ⚠️ Backtested returns are not indicative of future performance. Past results shown on NSE data 2018–2025. Slippage and taxes not included.
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ height:36, padding:'0 14px', borderRadius:9, border:`1px solid ${cat === c ? 'var(--blu)' : 'var(--bdr)'}`,
              background: cat === c ? 'rgba(23,64,245,0.15)' : 'var(--surf2)',
              color: cat === c ? 'var(--bluL)' : 'var(--dim)',
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Algorithm cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {filtered.map(a => {
          const locked  = !isPro;
          const isOpen  = expanded === a.id;
          return (
            <div key={a.id} style={{ ...card, border: a.pro ? '1px solid rgba(255,184,0,0.2)' : '1px solid var(--bdr)' }}>

              {/* Title row — always visible */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: locked ? 0 : 14 }}>
                <div style={{ fontSize:26, lineHeight:1, flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:15, fontWeight:800 }}>{a.name}</span>
                  {a.pro && <span style={{ fontSize:10, fontWeight:800, color:'#FFB800', background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.25)', borderRadius:20, padding:'2px 8px' }}>PRO</span>}
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--dim)', background:'var(--surf2)', borderRadius:20, padding:'2px 8px' }}>{a.category}</span>
                  <span style={{ fontSize:10, color:'var(--dim)' }}>{a.timeframe}</span>
                </div>
                {locked && (
                  <Link href="/dashboard/upgrade"
                    style={{ flexShrink:0, height:32, padding:'0 14px', borderRadius:9, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                    ⚡ Unlock
                  </Link>
                )}
              </div>

              {/* Body — frosted glass for non-pro */}
              {locked ? (
                <div style={{ position:'relative', marginTop:10, borderRadius:10, overflow:'hidden' }}>
                  {/* Ghost content rendered behind glass */}
                  <div style={{ filter:'blur(3px)', pointerEvents:'none', userSelect:'none', opacity:0.45 }}>
                    <div style={{ fontSize:12.5, color:'var(--dim)', lineHeight:1.5, marginBottom:14 }}>{a.description}</div>
                    <div style={{ display:'flex', gap:20, paddingTop:12, borderTop:'1px solid var(--bdr)', flexWrap:'wrap' }}>
                      {[
                        { label:'Backtested Return', value:a.returns, color:'var(--grn)' },
                        { label:'Win Rate', value:a.winRate, color:'var(--bluL)' },
                        { label:'Max Drawdown', value:a.maxDD, color:'var(--red)' },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ fontSize:10, color:'var(--dim)', marginBottom:2, fontWeight:600, textTransform:'uppercase', letterSpacing:0.3 }}>{s.label}</div>
                          <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
                        </div>
                      ))}
                      <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                        {a.tags.map(t => (
                          <span key={t} style={{ fontSize:10, color:'var(--dim)', background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:20, padding:'2px 8px', fontWeight:600 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Frosted glass overlay */}
                  <div style={{
                    position:'absolute', inset:0,
                    backdropFilter:'blur(10px)',
                    WebkitBackdropFilter:'blur(10px)',
                    background:'rgba(7,13,26,0.55)',
                    borderRadius:10,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8,
                    border:'1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize:28 }}>🔒</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>Pro Feature</div>
                    <div style={{ fontSize:11.5, color:'var(--dim)', textAlign:'center', maxWidth:260, lineHeight:1.5 }}>
                      Upgrade to view stats, logic, parameters and copy into Algo Builder.
                    </div>
                    <Link href="/dashboard/upgrade"
                      style={{ marginTop:4, height:36, padding:'0 18px', borderRadius:9, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', gap:5 }}>
                      ⚡ Upgrade to Pro
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Description + buttons */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ flex:1, minWidth:0, fontSize:12.5, color:'var(--dim)', lineHeight:1.5 }}>{a.description}</div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : a.id)}
                        style={{ height:34, padding:'0 12px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        {isOpen ? 'Hide' : 'View Logic'}
                      </button>
                      <button
                        onClick={() => copyLogic(a)}
                        style={{ height:34, padding:'0 12px', borderRadius:9, cursor:'pointer',
                          background: copied === a.id ? 'rgba(0,212,160,0.12)' : 'rgba(23,64,245,0.12)',
                          border: `1px solid ${copied === a.id ? 'rgba(0,212,160,0.3)' : 'rgba(23,64,245,0.25)'}`,
                          color: copied === a.id ? 'var(--grn)' : 'var(--bluL)',
                          fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
                        {copied === a.id ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display:'flex', gap:20, marginTop:14, paddingTop:12, borderTop:'1px solid var(--bdr)', flexWrap:'wrap' }}>
                    {[
                      { label:'Backtested Return', value:a.returns, color:'var(--grn)' },
                      { label:'Win Rate', value:a.winRate, color:'var(--bluL)' },
                      { label:'Max Drawdown', value:a.maxDD, color:'var(--red)' },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize:10, color:'var(--dim)', marginBottom:2, fontWeight:600, textTransform:'uppercase', letterSpacing:0.3 }}>{s.label}</div>
                        <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                    <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                      {a.tags.map(t => (
                        <span key={t} style={{ fontSize:10, color:'var(--dim)', background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:20, padding:'2px 8px', fontWeight:600 }}>{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Expandable: logic + params */}
                  {isOpen && (
                    <div style={{ marginTop:16 }}>
                      <div className="g2" style={{ display:'grid', gap:14 }}>
                        {/* Logic */}
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Algorithm Logic</div>
                          <div style={{ background:'#080f1e', borderRadius:10, padding:14, fontSize:11.5, fontFamily:'JetBrains Mono, monospace', lineHeight:1.7, color:'#a8d8a8', whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:320, overflowY:'auto', border:'1px solid var(--card-bdr)' }}>
                            {a.logic}
                          </div>
                        </div>

                        {/* Parameters */}
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Parameters</div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {a.params.map(p => (
                              <div key={p.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--surf2)', borderRadius:8, border:'1px solid var(--card-bdr)' }}>
                                <span style={{ fontSize:12, color:'var(--dim)', fontWeight:500 }}>{p.label}</span>
                                <span style={{ fontSize:13, fontWeight:800 }}>{p.value}</span>
                              </div>
                            ))}
                          </div>

                          <Link href="/dashboard/algo-builder"
                            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:12, height:40, borderRadius:10, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', fontSize:13, fontWeight:700 }}>
                            ⚙️ Open in Algo Builder →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:20 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Algorithms are for educational purposes · Backtests do not guarantee future results · DYOR
      </div>
      </>}

      {/* ── Deploy tab ── */}
      {tab === 'deploy' && (
        <div style={{ position:'relative' }}>
          {!isPro && (
            <div style={{ position:'absolute', inset:0, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', background:'rgba(7,13,26,0.65)', borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, zIndex:10, border:'1px solid rgba(255,255,255,0.06)', minHeight:400 }}>
              <div style={{ fontSize:32 }}>🔒</div>
              <div style={{ fontSize:15, fontWeight:800, color:'rgba(255,255,255,0.95)' }}>Pro Feature</div>
              <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', maxWidth:280, lineHeight:1.6 }}>Download deployable Python packages for each algorithm. Run them locally with your broker API key. Pro only.</div>
              <Link href="/dashboard/upgrade" style={{ marginTop:6, height:38, padding:'0 20px', borderRadius:9, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>⚡ Upgrade to Pro</Link>
            </div>
          )}

          {/* Ghost content behind blur */}
          <div style={{ opacity: isPro ? 1 : 0.3, filter: isPro ? 'none' : 'blur(2px)', pointerEvents: isPro ? 'auto' : 'none' }}>
            {/* How-to banner */}
            <div style={{ ...card, marginBottom:20, background:'linear-gradient(135deg,rgba(0,212,160,0.06),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)' }}>
              <div style={{ fontSize:14, fontWeight:800, marginBottom:10 }}>🚀 Deploy on Your Machine</div>
              <div className="g3" style={{ display:'grid', gap:12 }}>
                {[
                  { n:'1', t:'Install dependencies', d:'pip install pandas numpy yfinance ta-lib' },
                  { n:'2', t:'Add your broker key', d:'Set BROKER_API_KEY in .env — Zerodha/Upstox/Angel One' },
                  { n:'3', t:'Run the algo', d:'python algo_name.py  —  signals print to console + log file' },
                ].map(s => (
                  <div key={s.n} style={{ display:'flex', gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--grn)', color:'#000', fontSize:11, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{s.t}</div>
                      <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Algo deploy cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {ALGOS.map(a => {
                const pkg = `# ${a.name} — ${a.timeframe}
# pip install pandas numpy yfinance

${a.logic}

if __name__ == "__main__":
    # Set your universe and broker key in .env
    print("Running ${a.name}...")
    run_backtest(universe="NIFTY200", from_date="2020-01-01")`;
                return (
                  <div key={a.id} style={{ ...card }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                      <span style={{ fontSize:22 }}>{a.icon}</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800 }}>{a.name}</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>{a.category} · {a.timeframe}</div>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(pkg); setCodeCopied(a.id); setTimeout(() => setCodeCopied(null), 2000); }}
                        style={{ marginLeft:'auto', height:32, padding:'0 14px', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700, background: codeCopied === a.id ? 'rgba(0,212,160,0.12)' : 'rgba(23,64,245,0.12)', border:`1px solid ${codeCopied === a.id ? 'rgba(0,212,160,0.3)' : 'rgba(23,64,245,0.25)'}`, color: codeCopied === a.id ? 'var(--grn)' : 'var(--bluL)' }}>
                        {codeCopied === a.id ? '✓ Copied' : '📋 Copy Package'}
                      </button>
                    </div>
                    <pre style={{ background:'#080f1e', borderRadius:10, padding:14, fontSize:11, fontFamily:'JetBrains Mono, monospace', lineHeight:1.7, color:'#a8d8a8', whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:200, overflowY:'auto', border:'1px solid var(--card-bdr)', margin:0 }}>
                      {pkg}
                    </pre>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                      {a.tags.map(t => <span key={t} style={{ fontSize:10, color:'var(--dim)', background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:20, padding:'2px 8px', fontWeight:600 }}>{t}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize:11, color:'var(--dim2)', marginTop:20 }}>
              ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · For educational use only · DYOR · Past performance ≠ future results
            </div>
          </div>
        </div>
      )}
    </>
  );
}
