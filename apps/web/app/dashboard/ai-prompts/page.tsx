'use client';
import { useState } from 'react';

interface Prompt {
  id: string;
  category: string;
  icon: string;
  title: string;
  prompt: string;
  tags: string[];
}

const PROMPTS: Prompt[] = [
  // Momentum
  { id:'m1', category:'Momentum', icon:'🚀', title:'RSI Breakout Picks',
    prompt:'Find NSE stocks where RSI crossed above 60 from below in the last 3 days, price is above 50-day EMA, and volume is 1.5x the 20-day average. Show top 10 by volume surge.',
    tags:['RSI','EMA','Volume'] },
  { id:'m2', category:'Momentum', icon:'📈', title:'52-Week High Breakouts',
    prompt:'List NSE/BSE stocks that made new 52-week highs today with volume above 2x average. Exclude stocks up more than 150% in the last 6 months. Show sector and market cap.',
    tags:['52W High','Breakout','Volume'] },
  { id:'m3', category:'Momentum', icon:'⚡', title:'Momentum Score Leaders',
    prompt:'Rank Nifty 500 stocks by combined momentum score (40% 3-month return + 30% 1-month return + 30% RSI). Show top 20 with current price vs 200-day EMA.',
    tags:['Multi-timeframe','Ranking','Nifty 500'] },

  // Value
  { id:'v1', category:'Value', icon:'💎', title:'Low P/E with Growth',
    prompt:'Find BSE 500 stocks trading below 15 P/E with EPS growth >15% YoY, debt-to-equity < 0.5, and promoter holding > 50%. Exclude PSUs. Sort by P/E ascending.',
    tags:['P/E','EPS Growth','Debt-free'] },
  { id:'v2', category:'Value', icon:'🏦', title:'Book Value Discounts',
    prompt:'Screen for stocks trading below 1.2x book value with ROE > 12% and consistent dividend payment for 5+ years. Focus on large and mid-cap. Show P/B, ROE, dividend yield.',
    tags:['P/B','ROE','Dividend'] },
  { id:'v3', category:'Value', icon:'🎯', title:'PEG Under 1',
    prompt:'Find stocks with PEG ratio below 1 (P/E ÷ EPS growth rate). Minimum market cap ₹500 Cr. Revenue growth > 10% last 3 years. Show P/E, growth rate, PEG.',
    tags:['PEG','Growth at Value','Mid-cap'] },

  // Dividends
  { id:'d1', category:'Dividends', icon:'💰', title:'High-Yield Dividend Stocks',
    prompt:'Screen for NSE stocks with dividend yield > 3%, payout ratio 30–70%, dividend growth for 3 consecutive years, and positive free cash flow. Show 5-year dividend history.',
    tags:['Dividend Yield','FCF','Payout'] },
  { id:'d2', category:'Dividends', icon:'📅', title:'Upcoming Dividend Dates',
    prompt:'List stocks with ex-dividend dates in the next 30 days, yield > 2%, and record dates. Sort by yield. Include dividend per share and record date.',
    tags:['Ex-date','Yield','Calendar'] },

  // Technical Setups
  { id:'t1', category:'Technical', icon:'📊', title:'Golden Cross Stocks',
    prompt:'Find stocks where 50-day EMA just crossed above 200-day EMA (golden cross) in the last 5 days. Price must be above both EMAs. Show RSI and recent volume trend.',
    tags:['Golden Cross','EMA','Trend'] },
  { id:'t2', category:'Technical', icon:'🔺', title:'Bullish Flag Patterns',
    prompt:'Identify stocks forming bullish flag/pennant consolidation after a strong 10%+ move in 5 days. Look for tight price range over last 3–7 days with contracting volume.',
    tags:['Flag Pattern','Consolidation','Breakout Setup'] },
  { id:'t3', category:'Technical', icon:'📉', title:'Oversold Reversal Candidates',
    prompt:'Find quality stocks (market cap > ₹1000 Cr, profitable) where RSI is below 35 after a 15%+ correction from recent highs. Sector leaders only. Show support levels.',
    tags:['RSI Oversold','Mean Reversion','Support'] },
  { id:'t4', category:'Technical', icon:'🌊', title:'Supertrend Buy Signals',
    prompt:'Screen for stocks where Supertrend indicator just flipped to BUY signal (10,3 settings) on daily timeframe. Filter: price > ₹100, avg volume > 500K shares/day.',
    tags:['Supertrend','Signal','Trend Following'] },

  // Sector Rotation
  { id:'s1', category:'Sector', icon:'🔄', title:'Sector Rotation Leaders',
    prompt:'Which NSE sectors showed the strongest relative strength vs Nifty 50 in the last 30 days? Show top 3 sectors, their 30-day return, and top 3 stocks per sector.',
    tags:['Sector RS','Rotation','Relative Strength'] },
  { id:'s2', category:'Sector', icon:'🏭', title:'Capex Cycle Beneficiaries',
    prompt:'List stocks benefiting from India infrastructure and capex cycle: order books growing >20%, EBITDA margins expanding, and government project exposure. Infra, defence, EPC.',
    tags:['Capex','Infrastructure','Defence'] },
  { id:'s3', category:'Sector', icon:'💻', title:'IT Sector Dip Buys',
    prompt:'Find IT/software stocks that have corrected 20%+ from 52W highs but have strong revenue guidance, US exposure > 60%, and revenue growth > 15%. Value play in IT.',
    tags:['IT Sector','Dip Buy','US Exposure'] },

  // Earnings
  { id:'e1', category:'Earnings', icon:'📋', title:'Earnings Beat Momentum',
    prompt:'Find stocks that beat EPS estimates by >10% last quarter AND are showing upward analyst estimate revisions. Price should be near pre-earnings level (not fully priced in).',
    tags:['Earnings Beat','Estimates','Revision'] },
  { id:'e2', category:'Earnings', icon:'🎪', title:'Upcoming Earnings Plays',
    prompt:'List stocks with earnings results in next 14 days where implied volatility (options) is unusually high. Show sector, expected EPS, YoY growth estimate, IV rank.',
    tags:['Earnings Calendar','IV','Options'] },

  // Thematic
  { id:'th1', category:'Thematic', icon:'🌱', title:'ESG Leaders India',
    prompt:'Find BSE 500 companies with strong ESG ratings, positive operating cash flow, and consistent profitability. Exclude fossil fuel, tobacco, alcohol. Show ESG score if available.',
    tags:['ESG','Sustainability','Screener'] },
  { id:'th2', category:'Thematic', icon:'🤖', title:'AI & Data Economy',
    prompt:'List Indian companies with direct AI/data center/cloud exposure — revenue from AI services, data center infra, semiconductor supply chain, or IT services with AI contracts.',
    tags:['AI','Data Center','Tech Thematic'] },
  { id:'th3', category:'Thematic', icon:'🏠', title:'Housing & Real Estate',
    prompt:'Find housing-linked stocks set to benefit from rate cuts: affordable housing developers, building material companies, home loan NBFCs. Show debt levels and order books.',
    tags:['Real Estate','Rate Sensitivity','Housing'] },
];

const CATEGORIES = ['All', ...Array.from(new Set(PROMPTS.map(p => p.category)))];

const card: React.CSSProperties = { background:'linear-gradient(145deg,rgba(13,25,42,0.96),rgba(6,11,24,0.92))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'18px 20px', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', boxShadow:'0 4px 32px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.06)' };

export default function AIPromptsPage() {
  const [cat,    setCat   ] = useState('All');
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch ] = useState('');

  const filtered = PROMPTS.filter(p =>
    (cat === 'All' || p.category === cat) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  function copy(p: Prompt) {
    navigator.clipboard.writeText(p.prompt).then(() => {
      setCopied(p.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>AI Prompts Library</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>
          Ready-made prompts for AI chatbots (ChatGPT, Grok, Gemini, Claude) to discover stocks across strategies.
          Copy any prompt → paste into your AI of choice → get screened picks instantly.
        </div>
      </div>

      {/* Coming soon note */}
      <div style={{ background:'rgba(23,64,245,0.06)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🔮</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>In-app AI chat — Coming to Pro</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>
            These prompts will run directly inside SIGNAL with real-time NSE/BSE data — no copy-pasting needed. For now, copy and use with any AI.
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input
          placeholder="Search prompts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ height:38, borderRadius:10, background:'var(--surf2)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--txt)', padding:'0 14px', fontSize:13, fontFamily:'inherit', outline:'none', minWidth:180, flex:1 }}
        />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
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
      </div>

      {/* Prompt cards */}
      <div className="g2" style={{ display:'grid', gap:14 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ ...card, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:18 }}>{p.icon}</span>
                  <span style={{ fontSize:14, fontWeight:800 }}>{p.title}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--dim)', background:'var(--surf2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'2px 7px' }}>
                    {p.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => copy(p)}
                style={{ flexShrink:0, height:34, padding:'0 14px', borderRadius:9,
                  background: copied === p.id ? 'rgba(0,212,160,0.15)' : 'rgba(23,64,245,0.12)',
                  border:`1px solid ${copied === p.id ? 'rgba(0,212,160,0.3)' : 'rgba(23,64,245,0.25)'}`,
                  color: copied === p.id ? 'var(--grn)' : 'var(--bluL)',
                  fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                {copied === p.id ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>

            {/* Prompt text */}
            <div style={{ background:'var(--surf2)', borderRadius:10, padding:'12px 14px', fontSize:12.5, lineHeight:1.7, color:'var(--txt)', fontFamily:'inherit', border:'1px solid rgba(255,255,255,0.08)' }}>
              {p.prompt}
            </div>

            {/* Tags */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {p.tags.map(t => (
                <span key={t} style={{ fontSize:10.5, fontWeight:600, color:'var(--dim)', background:'var(--surf2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'2px 9px' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--dim)', fontSize:13 }}>
          No prompts match &ldquo;{search}&rdquo; — try a different keyword.
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:20 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · AI-generated results are educational only · Always verify before investing · DYOR
      </div>
    </>
  );
}
