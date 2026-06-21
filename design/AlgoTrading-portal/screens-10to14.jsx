const { useState: useLocalState } = React;

/* ── S10: Algo Hub ────────────────────────────────────────── */
function S10_AlgoHub() {
  const { T, ACC, dark } = useTheme();
  const strategies = [
    { emoji:'📈', name:'Trend Following', desc:'Ride sustained moves using EMAs & ADX', diff:'Easy',   diffC:ACC.grn },
    { emoji:'🚀', name:'Momentum',        desc:'Buy strength, RSI + volume surge entry', diff:'Medium', diffC:ACC.ylw },
    { emoji:'🔄', name:'Mean Reversion',  desc:'Buy the dip, Bollinger Bands bounce',    diff:'Medium', diffC:ACC.ylw },
    { emoji:'⚡', name:'Breakout',         desc:'Catch range breakouts with ATR stops',   diff:'Hard',   diffC:ACC.red },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, overflow:'hidden',
      display:'flex', flexDirection:'column' }}>
      <div style={{ position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%',
          background:`radial-gradient(circle,rgba(255,92,26,${dark?.22:.1}) 0%,transparent 70%)`, pointerEvents:'none' }}/>
        <div style={{ padding:'18px 20px 14px', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${ACC.org}20`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚙️</div>
            <span style={{ fontSize:13, fontWeight:600, color:ACC.orgL }}>ALGO BUILDER</span>
          </div>
          <div style={{ fontSize:28, fontWeight:900, color:T.txt, lineHeight:1.1, letterSpacing:-0.8 }}>
            Build Your<br/><span style={{ color:ACC.org }}>Trading Algorithm</span>
          </div>
          <div style={{ fontSize:13, color:T.dim, marginTop:8, lineHeight:1.5 }}>
            Powered by ML · Generates Python code · Deploy in minutes
          </div>
          {/* Stats */}
          <div style={{ display:'flex', gap:18, marginTop:12 }}>
            {[['1,240+','Algos Built'],['21.3%','Avg Return'],['3.2K','Traders']].map(([v,l])=>
              <div key={l}>
                <div style={{ fontSize:16, fontWeight:800, color:T.txt }}>{v}</div>
                <div style={{ fontSize:10, color:T.dim }}>{l}</div>
              </div>)}
          </div>
        </div>
      </div>

      {/* Strategy grid */}
      <div style={{ padding:'0 16px', marginBottom:12 }}>
        <div style={{ fontSize:11, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:9 }}>CHOOSE STRATEGY TYPE</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
          {strategies.map((s,i)=>(
            <div key={s.name} style={{ padding:'13px 13px', borderRadius:14,
              background:i===1?`${ACC.org}10`:T.surf,
              border:`1px solid ${i===1?ACC.org:T.bdr}`,
              display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <span style={{ fontSize:22 }}>{s.emoji}</span>
                <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:5,
                  background:`${s.diffC}18`, color:s.diffC }}>{s.diff}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:T.txt }}>{s.name}</div>
              <div style={{ fontSize:11, color:T.dim, lineHeight:1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px', marginTop:'auto', display:'flex', flexDirection:'column', gap:9 }}>
        <button style={{ width:'100%', height:50, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.bluL})`,
          border:'none', color:'#fff', fontSize:15, fontWeight:700,
          boxShadow:`0 6px 22px rgba(23,64,245,0.4)` }}>Start from Scratch →</button>
        <button style={{ width:'100%', height:44, borderRadius:14,
          background:dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)',
          border:`1px solid ${T.bdr}`, color:T.txt, fontSize:14, fontWeight:600 }}>
          Use a Template
        </button>
      </div>
    </div>
  );
}

/* ── S11: Parameter Explorer ──────────────────────────────── */
function S11_ParamExplorer() {
  const { T, ACC } = useTheme();
  const params = [
    { id:'rsi',    name:'RSI (14)',           sub:'Overbought / Oversold momentum',    diff:'Easy',   diffC:ACC.grn, added:true },
    { id:'macd',   name:'MACD (12,26,9)',     sub:'Trend + momentum crossover signal', diff:'Medium', diffC:ACC.ylw, added:false },
    { id:'ema',    name:'EMA / SMA',          sub:'Smooths price, identifies trend',   diff:'Easy',   diffC:ACC.grn, added:true },
    { id:'bb',     name:'Bollinger Bands',    sub:'Volatility bands for range trading',diff:'Medium', diffC:ACC.ylw, added:false },
    { id:'vol',    name:'Volume Analysis',    sub:'Confirms moves with delivery %',    diff:'Easy',   diffC:ACC.grn, added:false },
    { id:'adx',    name:'ADX',                sub:'Measures strength of the trend',    diff:'Hard',   diffC:ACC.red, added:false },
    { id:'stoch',  name:'Stochastic',         sub:'Overbought/sold in ranging markets',diff:'Medium', diffC:ACC.ylw, added:false },
    { id:'atr',    name:'ATR',                sub:'Volatility-based stop loss sizing', diff:'Medium', diffC:ACC.ylw, added:false },
  ];
  const sparkSets = {
    rsi:  [50,42,35,40,55,68,72,65,58,50],
    macd: [2,-1,0,3,5,4,2,-2,-4,-1],
    ema:  [40,42,44,46,45,47,49,50,52,54],
    bb:   [48,55,62,58,50,44,46,54,60,56],
    vol:  [20,35,28,40,60,45,30,50,70,55],
    adx:  [15,18,22,28,32,35,38,40,36,34],
    stoch:[80,75,62,45,38,35,42,55,65,72],
    atr:  [12,14,18,16,20,22,19,17,15,16],
  };
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 18px 10px' }}>
        <div style={{ fontSize:22, fontWeight:800, color:T.txt }}>Select Indicators</div>
        <div style={{ fontSize:13, color:T.dim, marginTop:4 }}>Choose 2+ to build your algorithm</div>
        <div style={{ display:'flex', gap:7, marginTop:10, flexWrap:'wrap' }}>
          {params.filter(p=>p.added).map(p=>
            <div key={p.id} style={{ padding:'4px 11px 4px 10px', borderRadius:20,
              background:`${ACC.blu}18`, border:`1px solid ${ACC.blu}55`,
              display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:ACC.bluL }}>{p.name.split(' ')[0]}</span>
              <span style={{ fontSize:11, color:ACC.blu, opacity:0.7 }}>✕</span>
            </div>)}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'0 14px 14px', display:'flex', flexDirection:'column', gap:8 }}>
        {params.map(p=>(
          <div key={p.id} style={{ padding:'11px 13px', borderRadius:13,
            background:p.added?`${ACC.blu}08`:T.surf,
            border:`1px solid ${p.added?ACC.blu:T.bdr}`,
            display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:13, fontWeight:700, color:T.txt }}>{p.name}</span>
                <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:5,
                  background:`${p.diffC}18`, color:p.diffC }}>{p.diff}</span>
              </div>
              <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{p.sub}</div>
            </div>
            <Spark data={sparkSets[p.id]||[]} color={p.added?ACC.blu:T.dim} w={52} h={22}/>
            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
              background:p.added?ACC.blu:`${ACC.blu}14`,
              border:`1px solid ${p.added?ACC.blu:T.bdr}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, color:p.added?'#fff':ACC.bluL, fontWeight:700 }}>
              {p.added ? '✓' : '+'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'0 14px 16px' }}>
        <button style={{ width:'100%', height:50, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.org})`,
          border:'none', color:'#fff', fontSize:15, fontWeight:700,
          boxShadow:`0 6px 20px rgba(23,64,245,0.35)` }}>
          Build Algo (2 selected) →
        </button>
      </div>
    </div>
  );
}

/* ── S12: Algo Builder ────────────────────────────────────── */
function S12_AlgoBuilder() {
  const { T, ACC } = useTheme();
  const entryConds = [
    { label:'RSI', op:'<', value:'35', note:'oversold' },
    { label:'EMA20', op:'>', value:'EMA50', note:'golden cross' },
  ];
  const exitConds = [
    { label:'RSI', op:'>', value:'70', note:'overbought' },
    { label:'Stop Loss', op:'=', value:'2.5%', note:'trail' },
    { label:'Target', op:'=', value:'6.0%', note:'exit' },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, overflow:'hidden',
      display:'flex', flexDirection:'column', padding:'16px 18px 18px', gap:12 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:800, color:T.txt }}>Build Algorithm</div>
        <div style={{ display:'flex', gap:7, marginTop:8, flexWrap:'wrap' }}>
          {['RSI (14)', 'EMA 20/50'].map(p=>
            <div key={p} style={{ padding:'4px 11px', borderRadius:20, background:`${ACC.blu}18`,
              border:`1px solid ${ACC.blu}55`, display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:700, color:ACC.bluL }}>{p}</span>
              <span style={{ fontSize:11, color:ACC.blu, opacity:0.7 }}>✕</span>
            </div>)}
        </div>
      </div>

      {/* Entry */}
      <div style={{ padding:'12px 13px', borderRadius:13, background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
          <div style={{ width:8, height:8, borderRadius:4, background:ACC.grn }}/>
          <span style={{ fontSize:11.5, fontWeight:700, color:ACC.grn }}>BUY WHEN (entry)</span>
        </div>
        {entryConds.map((c,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8,
            padding:'7px 10px', borderRadius:9, background:`${ACC.grn}08`, border:`1px solid ${ACC.grn}22` }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.txt, minWidth:40 }}>{c.label}</span>
            <span style={{ fontSize:12, color:ACC.grn, fontWeight:700 }}>{c.op}</span>
            <span style={{ fontSize:12, fontWeight:700, color:T.txt,
              background:`${ACC.grn}18`, padding:'2px 8px', borderRadius:6 }}>{c.value}</span>
            <span style={{ fontSize:11, color:T.dim }}>({c.note})</span>
          </div>
        ))}
        <div style={{ fontSize:12, color:ACC.bluL, fontWeight:600 }}>+ Add condition</div>
      </div>

      {/* Exit */}
      <div style={{ padding:'12px 13px', borderRadius:13, background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
          <div style={{ width:8, height:8, borderRadius:4, background:ACC.red }}/>
          <span style={{ fontSize:11.5, fontWeight:700, color:ACC.red }}>SELL / EXIT WHEN</span>
        </div>
        {exitConds.map((c,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7,
            padding:'7px 10px', borderRadius:9, background:`${ACC.red}08`, border:`1px solid ${ACC.red}22` }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.txt, minWidth:52 }}>{c.label}</span>
            <span style={{ fontSize:12, color:ACC.red, fontWeight:700 }}>{c.op}</span>
            <span style={{ fontSize:12, fontWeight:700, color:T.txt,
              background:`${ACC.red}18`, padding:'2px 8px', borderRadius:6 }}>{c.value}</span>
            <span style={{ fontSize:11, color:T.dim }}>({c.note})</span>
          </div>
        ))}
      </div>

      {/* Stocks + config */}
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        <div>
          <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:7 }}>APPLY TO</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {['RELIANCE','HDFCBANK','+5 more'].map(s=>
              <span key={s} style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:8,
                background:s==='+5 more'?T.surf2:`${ACC.blu}14`,
                border:`1px solid ${s==='+5 more'?T.bdr:ACC.blu}44`,
                color:s==='+5 more'?T.dim:ACC.bluL }}>{s}</span>)}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:7 }}>BACKTEST</div>
            <div style={{ display:'flex', gap:6 }}>
              {['1Y','2Y','5Y'].map((p,i)=>
                <span key={p} style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:8,
                  background:i===0?`${ACC.blu}20`:T.surf2, border:`1px solid ${i===0?ACC.blu:T.bdr}`,
                  color:i===0?ACC.bluL:T.dim }}>{p}</span>)}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:7 }}>LANGUAGE</div>
            <div style={{ display:'flex', gap:6 }}>
              {['Python','Pine'].map((p,i)=>
                <span key={p} style={{ fontSize:12, fontWeight:700, padding:'5px 10px', borderRadius:8,
                  background:i===0?`${ACC.blu}20`:T.surf2, border:`1px solid ${i===0?ACC.blu:T.bdr}`,
                  color:i===0?ACC.bluL:T.dim }}>{p}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop:'auto' }}>
        <button style={{ width:'100%', height:50, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.org},${ACC.orgL})`,
          border:'none', color:'#fff', fontSize:15, fontWeight:700,
          boxShadow:`0 6px 20px rgba(255,92,26,0.4)` }}>Generate Code →</button>
      </div>
    </div>
  );
}

/* ── S13: Generated Code ──────────────────────────────────── */
function S13_CodeGen() {
  const { T, ACC } = useLocalState ? useTheme() : { T: DARK_T, ACC };
  const [copied, setCopied] = useLocalState(false);
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const lines = [
    { text:'# ─────────────────────────────────────────', c:'#4A5568' },
    { text:'# SIGNAL Strategy  ·  RSI + EMA Crossover', c:'#68D391' },
    { text:'# Generated by SIGNAL App  ·  Jun 2026',    c:'#68D391' },
    { text:'# Exchange: NSE  ·  Stocks: RELIANCE, HDFC',c:'#68D391' },
    { text:'# ─────────────────────────────────────────', c:'#4A5568' },
    { text:'',                                          c:'#ccc' },
    { text:'import pandas as pd',                       c:'#79C0FF' },
    { text:'import numpy as np',                        c:'#79C0FF' },
    { text:'',                                          c:'#ccc' },
    { text:'RSI_LOW, RSI_HIGH = 35, 70',               c:'#F6C90E' },
    { text:'EMA_FAST, EMA_SLOW = 20, 50',              c:'#F6C90E' },
    { text:'STOP_LOSS, TARGET = 2.5, 6.0',             c:'#F6C90E' },
    { text:'',                                          c:'#ccc' },
    { text:'def rsi(close, n=14):',                     c:'#FF7D46' },
    { text:"    d = close.diff()",                       c:'#E2E8F0' },
    { text:'    g = d.clip(lower=0).rolling(n).mean()', c:'#E2E8F0' },
    { text:'    l = (-d.clip(upper=0)).rolling(n).mean()',c:'#E2E8F0' },
    { text:'    return 100 - (100 / (1 + g / l))',      c:'#E2E8F0' },
    { text:'',                                          c:'#ccc' },
    { text:'def signal(df):',                           c:'#FF7D46' },
    { text:'    r    = rsi(df["close"])',               c:'#E2E8F0' },
    { text:'    fast = df["close"].ewm(span=EMA_FAST).mean()', c:'#E2E8F0' },
    { text:'    slow = df["close"].ewm(span=EMA_SLOW).mean()', c:'#E2E8F0' },
    { text:'    cross = fast.iloc[-1] > slow.iloc[-1] \\',c:'#E2E8F0' },
    { text:'        and fast.iloc[-2] <= slow.iloc[-2]',c:'#E2E8F0' },
    { text:'    if r.iloc[-1] < RSI_LOW and cross:',    c:'#E2E8F0' },
    { text:'        return "BUY"',                      c:'#68D391' },
    { text:'    if r.iloc[-1] > RSI_HIGH:',             c:'#E2E8F0' },
    { text:'        return "SELL"',                     c:'#FC8181' },
    { text:'    return "HOLD"',                         c:'#E2E8F0' },
  ];
  const metrics = [
    { l:'Returns', v:'+24.3%', c:ACC.grn },
    { l:'Sharpe',  v:'1.84',   c:ACC.bluL },
    { l:'Win Rate',v:'64%',    c:ACC.grn },
    { l:'Max DD',  v:'-8.2%',  c:ACC.red },
  ];

  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'14px 18px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:T.txt }}>Generated Code</div>
          <div style={{ fontSize:12, color:T.dim, marginTop:3 }}>RSI + EMA Crossover · Python</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['Python','Pine'].map((l,i)=>
            <span key={l} style={{ fontSize:11.5, fontWeight:700, padding:'5px 11px', borderRadius:8,
              background:i===0?`${ACC.blu}20`:T.surf2, border:`1px solid ${i===0?ACC.blu:T.bdr}`,
              color:i===0?ACC.bluL:T.dim }}>{l}</span>)}
        </div>
      </div>

      {/* Code block — always dark */}
      <div style={{ margin:'0 14px', borderRadius:13, overflow:'hidden',
        background:'#0D1117', border:'1px solid #21262D', position:'relative', flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'8px 12px', background:'#161B22', borderBottom:'1px solid #21262D' }}>
          <span style={{ fontSize:11, color:'#8B949E', fontFamily:'monospace' }}>signal_rsi_ema.py</span>
          <button onClick={handleCopy} style={{ padding:'4px 12px', borderRadius:7,
            background:copied?`${ACC.grn}22`:`${ACC.blu}22`,
            border:`1px solid ${copied?ACC.grn:ACC.blu}44`,
            color:copied?ACC.grn:ACC.bluL, fontSize:11.5, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:5 }}>
            {copied ? '✓ Copied!' : '⎘ Copy'}
          </button>
        </div>
        <div style={{ padding:'10px 14px', overflow:'auto', maxHeight:260 }}>
          {lines.map((l,i)=>(
            <div key={i} style={{ fontFamily:'monospace', fontSize:10.5, lineHeight:'17px',
              color:l.c, whiteSpace:'pre' }}>{l.text}</div>
          ))}
        </div>
      </div>

      {/* Backtest metrics */}
      <div style={{ padding:'10px 14px 0' }}>
        <div style={{ fontSize:11, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:8 }}>
          1Y BACKTEST RESULTS
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {metrics.map(m=>(
            <div key={m.l} style={{ padding:'9px 10px', borderRadius:12, background:T.surf,
              border:`1px solid ${T.bdr}`, textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:900, color:m.c }}>{m.v}</div>
              <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'10px 14px 16px' }}>
        <button style={{ width:'100%', height:50, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.org},${ACC.orgL})`,
          border:'none', color:'#fff', fontSize:15, fontWeight:700,
          boxShadow:`0 6px 20px rgba(255,92,26,0.38)` }}>Deploy Script →</button>
      </div>
    </div>
  );
}

/* ── S14: Deploy Guide ────────────────────────────────────── */
function S14_Deploy() {
  const { T, ACC, dark } = useTheme();
  const brokers = [
    { n:'Zerodha Kite', c:'#387ED1', cost:'₹2,000/mo' },
    { n:'mStock',       c:'#E63946', cost:'₹500/mo' },
    { n:'Upstox',       c:'#7B2FBE', cost:'₹999/mo' },
    { n:'HDFC Sec',     c:'#004C8F', cost:'₹1,500/mo' },
  ];
  const infra = [
    { p:'Raspberry Pi 4', one:'₹4,500*', mo:'₹0',     note:'24/7 home server' },
    { p:'AWS t2.micro',   one:'Free',    mo:'₹850',    note:'12mo free tier' },
    { p:'DigitalOcean',   one:'Free',    mo:'₹600',    note:'Easy managed VPS' },
    { p:'Heroku',         one:'Free',    mo:'₹1,200',  note:'Beginner-friendly' },
  ];
  const cmdLines = [
    { t:'# 1. Install dependencies', c:'#68D391' },
    { t:'pip install kiteconnect pandas numpy schedule', c:'#E2E8F0' },
    { t:'', c:'#ccc' },
    { t:'# 2. Set API credentials', c:'#68D391' },
    { t:'export KITE_API_KEY="your_api_key"', c:'#F6C90E' },
    { t:'export KITE_SECRET="your_api_secret"', c:'#F6C90E' },
    { t:'', c:'#ccc' },
    { t:'# 3. Run strategy', c:'#68D391' },
    { t:'python signal_rsi_ema.py --live', c:'#79C0FF' },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, overflow:'auto',
      display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'14px 18px 10px' }}>
        <div style={{ fontSize:22, fontWeight:800, color:T.txt }}>Deploy Your Algo</div>
        <div style={{ fontSize:13, color:T.dim, marginTop:4 }}>3 steps to go live on NSE/BSE</div>
      </div>

      {/* Step 1 */}
      <div style={{ margin:'0 14px 10px', padding:'12px 14px', borderRadius:14,
        background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
          <div style={{ width:26, height:26, borderRadius:13, background:`${ACC.blu}22`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:ACC.bluL }}>1</div>
          <span style={{ fontSize:14, fontWeight:700, color:T.txt }}>Get Broker API Access</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
          {brokers.map(b=>(
            <div key={b.n} style={{ padding:'8px 10px', borderRadius:10,
              background:`${b.c}12`, border:`1px solid ${b.c}30`,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11.5, fontWeight:700, color:b.c }}>{b.n}</span>
              <span style={{ fontSize:10, color:T.dim }}>{b.cost}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:T.dim, marginTop:9, padding:'7px 10px', borderRadius:9,
          background:`${ACC.ylw}0E`, border:`1px solid ${ACC.ylw}30` }}>
          ⏱ API approval takes 1–3 business days
        </div>
      </div>

      {/* Step 2 */}
      <div style={{ margin:'0 14px 10px', padding:'12px 14px', borderRadius:14,
        background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
          <div style={{ width:26, height:26, borderRadius:13, background:`${ACC.org}22`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:ACC.orgL }}>2</div>
          <span style={{ fontSize:14, fontWeight:700, color:T.txt }}>Choose Infrastructure</span>
        </div>
        <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${T.bdr}` }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 0.8fr 0.8fr 1.4fr',
            background:T.surf2, padding:'6px 10px', gap:4 }}>
            {['Platform','One-time','Monthly','Best for'].map(h=>
              <span key={h} style={{ fontSize:9.5, fontWeight:700, color:T.dim }}>{h}</span>)}
          </div>
          {infra.map((r,i)=>(
            <div key={r.p} style={{ display:'grid', gridTemplateColumns:'1.4fr 0.8fr 0.8fr 1.4fr',
              padding:'7px 10px', gap:4,
              background:i===0?`${ACC.grn}08`:i%2===0?T.surf:T.bg,
              borderTop:`1px solid ${T.bdr}` }}>
              <span style={{ fontSize:11, fontWeight:700, color:i===0?ACC.grn:T.txt }}>{r.p}</span>
              <span style={{ fontSize:11, color:T.dim }}>{r.one}</span>
              <span style={{ fontSize:11, fontWeight:700, color:i===0?ACC.grn:T.txt }}>{r.mo}</span>
              <span style={{ fontSize:10, color:T.dim }}>{r.note}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize:10.5, color:T.dim, marginTop:7 }}>*Raspberry Pi one-time hardware cost</div>
      </div>

      {/* Step 3 */}
      <div style={{ margin:'0 14px 10px', padding:'12px 14px', borderRadius:14,
        background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
          <div style={{ width:26, height:26, borderRadius:13, background:`${ACC.grn}22`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:ACC.grn }}>3</div>
          <span style={{ fontSize:14, fontWeight:700, color:T.txt }}>Run Your Script</span>
        </div>
        <div style={{ borderRadius:10, background:'#0D1117', border:'1px solid #21262D',
          padding:'10px 12px' }}>
          {cmdLines.map((l,i)=>
            <div key={i} style={{ fontFamily:'monospace', fontSize:10.5, lineHeight:'17px',
              color:l.c, whiteSpace:'pre' }}>{l.t}</div>)}
        </div>
      </div>

      {/* Cost summary */}
      <div style={{ margin:'0 14px 10px', padding:'11px 14px', borderRadius:13,
        background:`${ACC.blu}0A`, border:`1px solid ${ACC.blu}25` }}>
        <div style={{ fontSize:11.5, fontWeight:700, color:T.txt, marginBottom:4 }}>
          💰 Estimated Monthly Cost
        </div>
        <div style={{ fontSize:20, fontWeight:900, color:ACC.bluL }}>₹600 – ₹3,200</div>
        <div style={{ fontSize:11, color:T.dim, marginTop:3 }}>Infrastructure + Broker API fees</div>
      </div>

      <div style={{ padding:'0 14px 18px', display:'flex', gap:9 }}>
        <button style={{ flex:1, height:48, borderRadius:13,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.bluL})`,
          border:'none', color:'#fff', fontSize:13, fontWeight:700 }}>
          📄 Download Guide
        </button>
        <button style={{ flex:1, height:48, borderRadius:13,
          background:`${ACC.grn}14`, border:`1px solid ${ACC.grn}40`,
          color:ACC.grn, fontSize:13, fontWeight:700 }}>
          👥 Join Community
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { S10_AlgoHub, S11_ParamExplorer, S12_AlgoBuilder, S13_CodeGen, S14_Deploy });
