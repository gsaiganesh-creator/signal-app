/* ── S7: Portfolio Analysis ───────────────────────────────── */
function S7_Analysis() {
  const { T, ACC } = useTheme();
  const cats = [
    { id:'momentum', label:'Momentum',  emoji:'🚀', color:ACC.grn,  count:5,
      stocks:['RELIANCE','TATAMOTORS','SBIN','INDUSINDBK','ADANIENT'], desc:'Strong uptrend + volume surge' },
    { id:'swing',    label:'Swingable', emoji:'🔄', color:ACC.blu,  count:4,
      stocks:['HDFCBANK','WIPRO','BAJFINANCE','LTIM'],                 desc:'Range-bound, ideal for swing' },
    { id:'longterm', label:'Long Term', emoji:'🏛️', color:ACC.pur,  count:5,
      stocks:['TCS','INFY','HINDUNILVR','NESTLEIND','ASIANPAINT'],     desc:'Strong fundamentals, hold ≥1Y' },
    { id:'exit',     label:'Exit Now',  emoji:'⚠️', color:ACC.red,  count:2,
      stocks:['ZOMATO','PAYTM'],                                        desc:'Below key support, weak signal' },
    { id:'watch',    label:'Watch',     emoji:'👁️', color:ACC.ylw, count:2,
      stocks:['COALINDIA','NTPC'],                                      desc:'Consolidating — wait for entry' },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'14px 18px 10px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:T.txt }}>Portfolio Analysis</div>
          <div style={{ fontSize:12, color:T.dim, marginTop:3 }}>18 stocks · Updated just now</div>
        </div>
        <div style={{ padding:'4px 10px', borderRadius:20, background:`${ACC.grn}15`, border:`1px solid ${ACC.grn}44` }}>
          <span style={{ fontSize:11, fontWeight:700, color:ACC.grn }}>ML ✓ Live</span>
        </div>
      </div>

      {/* Donut summary */}
      <div style={{ margin:'0 14px 10px', padding:'11px 14px', borderRadius:14,
        background:T.surf, border:`1px solid ${T.bdr}`, display:'flex', alignItems:'center', gap:14 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          {[{pct:28,color:ACC.grn,off:0},{pct:22,color:ACC.blu,off:28},{pct:28,color:ACC.pur,off:50},
            {pct:11,color:ACC.red,off:78},{pct:11,color:ACC.ylw,off:89}].map((s,i)=>{
            const r=22, circ=2*Math.PI*r;
            return (<circle key={i} cx="28" cy="28" r={r} fill="none" stroke={s.color} strokeWidth="9"
              strokeDasharray={`${circ*s.pct/100} ${circ*(1-s.pct/100)}`}
              transform={`rotate(${s.off*3.6-90} 28 28)`} strokeLinecap="butt"/>);
          })}
          <text x="28" y="32" textAnchor="middle" fill={T.txt} fontSize="11" fontWeight="800" fontFamily="system-ui">18</text>
        </svg>
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 10px' }}>
          {cats.map(c=>
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:7, height:7, borderRadius:2, background:c.color, flexShrink:0 }}/>
              <span style={{ fontSize:11, color:T.dim }}>{c.label}</span>
              <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:T.txt }}>{c.count}</span>
            </div>)}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'0 14px 14px', display:'flex', flexDirection:'column', gap:8 }}>
        {cats.map(cat=>(
          <div key={cat.id} style={{ borderRadius:14, background:T.surf,
            border:`1px solid ${cat.color}30`, overflow:'hidden' }}>
            <div style={{ padding:'11px 14px', borderBottom:`1px solid ${T.bdr}`,
              display:'flex', alignItems:'center', gap:9 }}>
              <span style={{ fontSize:18 }}>{cat.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:T.txt }}>{cat.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:cat.color,
                    background:`${cat.color}18`, padding:'1px 7px', borderRadius:6 }}>{cat.count}</span>
                </div>
                <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{cat.desc}</div>
              </div>
              <span style={{ fontSize:14, color:T.dim }}>›</span>
            </div>
            <div style={{ padding:'9px 14px', display:'flex', gap:6, flexWrap:'wrap' }}>
              {cat.stocks.map(s=>
                <span key={s} style={{ fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:7,
                  background:`${cat.color}12`, color:cat.color, border:`1px solid ${cat.color}2A` }}>{s}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── S8: Dashboard ────────────────────────────────────────── */
function S8_Dashboard() {
  const { T, ACC, dark } = useTheme();
  const holdings = [
    { t:'RELIANCE', p:2912, chg:1.8,  sig:'BUY',  cat:'Momentum', data:[42,45,44,48,46,50,52,51,55,58], color:ACC.grn },
    { t:'HDFCBANK', p:1634, chg:-0.4, sig:'HOLD', cat:'Swing',    data:[50,48,52,49,51,50,48,47,45,46], color:ACC.ylw },
    { t:'INFY',     p:1441, chg:2.2,  sig:'BUY',  cat:'LongTrm',  data:[30,32,31,35,38,36,40,42,44,47], color:ACC.pur },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 18px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:12, color:T.dim }}>Namaste 👋</div>
          <div style={{ fontSize:20, fontWeight:800, color:T.txt }}>Arjun Sharma</div>
        </div>
        <div style={{ width:36, height:36, borderRadius:18,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.org})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:700, color:'#fff' }}>AS</div>
      </div>

      {/* Portfolio card */}
      <div style={{ margin:'0 13px 9px', padding:'13px 16px', borderRadius:16,
        background:T.cardGrad, border:`1px solid ${T.bdr}`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%',
          background:`radial-gradient(circle,rgba(23,64,245,0.22) 0%,transparent 70%)`, pointerEvents:'none' }}/>
        <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5 }}>PORTFOLIO VALUE</div>
        <div style={{ fontSize:28, fontWeight:900, color:T.txt, letterSpacing:-1, margin:'2px 0' }}>₹8,42,316.50</div>
        <div style={{ display:'flex', gap:9, alignItems:'center', marginBottom:7 }}>
          <span style={{ fontSize:13, color:ACC.grn, fontWeight:700 }}>▲ +₹12,842 (+1.55%)</span>
          <span style={{ fontSize:10.5, color:T.dim }}>Today</span>
        </div>
        <Spark data={[80,84,80,90,86,94,92,98,102,110,106,114]} color={ACC.blu} w={230} h={26}/>
        <div style={{ display:'flex', gap:14, marginTop:8 }}>
          {[['NIFTY 50','24,612',ACC.grn,'+0.92%'],['SENSEX','81,148',ACC.grn,'+0.88%']].map(([k,v,c,p])=>
            <div key={k} style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:10.5, color:T.dim }}>{k}</span>
              <span style={{ fontSize:11, fontWeight:700, color:T.txt }}>{v}</span>
              <span style={{ fontSize:10.5, color:c }}>{p}</span>
            </div>)}
        </div>
      </div>

      {/* ML Alert */}
      <div style={{ margin:'0 13px 8px', padding:'9px 13px', borderRadius:13,
        background:`${ACC.org}0F`, border:`1px solid ${ACC.org}44`,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:16 }}>🤖</span>
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:ACC.orgL, letterSpacing:0.4 }}>ML SIGNAL TODAY</div>
            <div style={{ fontSize:12.5, color:T.txt }}>5 buy signals · 2 exit alerts</div>
          </div>
        </div>
        <span style={{ fontSize:12, color:ACC.org, fontWeight:700 }}>View →</span>
      </div>

      {/* Holdings row */}
      <div style={{ padding:'0 13px', marginBottom:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.txt }}>Holdings</span>
          <span style={{ fontSize:12, color:ACC.bluL }}>View All →</span>
        </div>
        <div style={{ display:'flex', gap:9 }}>
          {holdings.map(h=>(
            <div key={h.t} style={{ flex:1, padding:'10px 10px', borderRadius:13,
              background:T.surf, border:`1px solid ${T.bdr}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:800, color:T.txt }}>{h.t}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:5,
                  background:h.sig==='BUY'?`${ACC.grn}22`:`${ACC.ylw}22`,
                  color:h.sig==='BUY'?ACC.grn:ACC.ylw }}>{h.sig}</span>
              </div>
              <Spark data={h.data} color={h.chg>=0?ACC.grn:ACC.red} w={74} h={22}/>
              <div style={{ fontSize:12, fontWeight:700, color:T.txt, marginTop:3 }}>₹{h.p.toLocaleString()}</div>
              <div style={{ fontSize:10, color:h.chg>=0?ACC.grn:ACC.red }}>{h.chg>=0?'▲':'▼'} {Math.abs(h.chg)}%</div>
              <div style={{ marginTop:3 }}><Tag label={h.cat} color={h.color}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* Twitter Sentiment */}
      <div style={{ padding:'0 13px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.txt, marginBottom:7 }}>𝕏 Market Pulse</div>
        {[{t:'RELIANCE',bull:78,posts:212},{t:'NIFTY 50',bull:62,posts:540}].map(s=>
          <div key={s.t} style={{ padding:'8px 12px', borderRadius:12, background:T.surf,
            border:`1px solid ${T.bdr}`, marginBottom:6, display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:T.surf2,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:800, color:T.txt }}>{s.t.substring(0,4)}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:T.dim }}>{s.posts} posts</span>
                <span style={{ fontSize:11, fontWeight:700, color:s.bull>65?ACC.grn:ACC.ylw }}>{s.bull}% Bullish</span>
              </div>
              <PBar val={s.bull} color={s.bull>65?ACC.grn:ACC.ylw} h={4}/>
            </div>
          </div>)}
      </div>
    </div>
  );
}

/* ── S9: Stock Detail ─────────────────────────────────────── */
function S9_StockDetail() {
  const { T, ACC } = useTheme();
  const chartData = [2640,2680,2660,2720,2700,2760,2740,2800,2780,2840,2820,2880,2860,2890,2912];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'10px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:42, height:42, borderRadius:12,
              background:`linear-gradient(135deg,#1B4FD8,#3B74F5)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:9, fontWeight:900, color:'#fff' }}>RIL</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:T.txt }}>RELIANCE</div>
              <div style={{ fontSize:10.5, color:T.dim }}>Reliance Industries · NSE</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:24, fontWeight:900, color:T.txt, letterSpacing:-0.8 }}>₹2,912</div>
            <div style={{ fontSize:12.5, color:ACC.grn, fontWeight:700 }}>▲ +51.60 (+1.80%)</div>
          </div>
        </div>
        <div style={{ marginTop:9 }}>
          <svg width="100%" height="52" viewBox="0 0 340 52" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rg9" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACC.grn} stopOpacity="0.2"/>
                <stop offset="100%" stopColor={ACC.grn} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {(()=>{
              const d=chartData, mn=Math.min(...d), mx=Math.max(...d), rng=mx-mn;
              const pts=d.map((v,i)=>`${(i/(d.length-1))*340},${50-((v-mn)/rng)*46}`);
              return (<>
                <path d={`M${pts.join('L')} L340,52 L0,52Z`} fill="url(#rg9)"/>
                <path d={`M${pts.join('L')}`} fill="none" stroke={ACC.grn} strokeWidth="2" strokeLinecap="round"/>
              </>);
            })()}
          </svg>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            {['1D','1W','1M','3M','6M','1Y'].map(p=>
              <span key={p} style={{ fontSize:11, padding:'2px 6px', borderRadius:6,
                background:p==='1M'?`${ACC.blu}22`:'transparent',
                color:p==='1M'?ACC.bluL:T.dim, fontWeight:p==='1M'?700:400 }}>{p}</span>)}
          </div>
        </div>
      </div>

      <div style={{ margin:'8px 14px 0', padding:'10px 13px', borderRadius:13,
        background:`${ACC.grn}09`, border:`1px solid ${ACC.grn}28` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <span>🚀</span><span style={{ fontSize:11, fontWeight:700, color:ACC.grn }}>MOMENTUM</span>
          </div>
          <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6,
            background:`${ACC.grn}22`, color:ACC.grn, border:`1px solid ${ACC.grn}44` }}>STRONG BUY</span>
        </div>
        <PBar val={4} max={5} color={ACC.grn} h={4}/>
        <div style={{ fontSize:10.5, color:T.dim, marginTop:4 }}>
          Confidence <span style={{ color:ACC.grn, fontWeight:700 }}>87%</span> · Updated 2 min ago
        </div>
      </div>

      <div style={{ margin:'7px 14px 0', padding:'10px 13px', borderRadius:13,
        background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:T.txt }}>𝕏 Twitter Sentiment</span>
          <span style={{ fontSize:10.5, color:T.dim }}>212 posts · 24h</span>
        </div>
        <div style={{ height:6, borderRadius:4, background:T.bdr, overflow:'hidden', marginBottom:5 }}>
          <div style={{ height:'100%', width:'76%', borderRadius:4,
            background:`linear-gradient(90deg,${ACC.grn},${ACC.bluL})` }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
          <span style={{ color:ACC.grn, fontWeight:700 }}>76% Bullish</span>
          <span style={{ color:ACC.red, fontWeight:700 }}>24% Bearish</span>
        </div>
      </div>

      <div style={{ margin:'7px 14px 0', padding:'10px 13px', borderRadius:13,
        background:T.surf, border:`1px solid ${T.bdr}` }}>
        <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:8 }}>KEY STATS</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px 0' }}>
          {[{l:'Mkt Cap',v:'₹19.7L Cr'},{l:'P/E Ratio',v:'28.4x'},{l:'Beta',v:'0.82'},
            {l:'52W High',v:'₹3,217',c:ACC.grn},{l:'52W Low',v:'₹2,220',c:ACC.red},{l:'Delivery%',v:'63.2%',c:ACC.grn}].map(s=>
            <div key={s.l}>
              <div style={{ fontSize:9.5, color:T.dim }}>{s.l}</div>
              <div style={{ fontSize:12.5, fontWeight:700, color:s.c||T.txt, marginTop:1 }}>{s.v}</div>
            </div>)}
        </div>
      </div>

      <div style={{ margin:'7px 14px 0', padding:'9px 12px', borderRadius:12,
        background:`${ACC.blu}0A`, border:`1px solid ${ACC.blu}22`,
        display:'flex', gap:8, alignItems:'flex-start' }}>
        <span style={{ fontSize:13, lineHeight:1, marginTop:1 }}>💡</span>
        <span style={{ fontSize:11.5, color:T.dim, lineHeight:1.5 }}>
          ML detected <span style={{ color:T.txt, fontWeight:600 }}>momentum breakout</span> above ₹2,880 resistance.
          Twitter sentiment shifted bullish (+18%) over last 4h. Delivery &gt;60% confirms conviction buying.
        </span>
      </div>

      <div style={{ margin:'9px 14px 0', display:'flex', gap:8 }}>
        <button style={{ flex:1, height:48, borderRadius:13,
          background:`linear-gradient(135deg,${ACC.grn},#00A87D)`,
          border:'none', color:'#001A12', fontSize:14, fontWeight:800 }}>BUY</button>
        <button style={{ flex:1, height:48, borderRadius:13,
          background:`${ACC.red}18`, border:`1px solid ${ACC.red}44`,
          color:ACC.red, fontSize:14, fontWeight:800 }}>SELL</button>
        <button style={{ width:48, height:48, borderRadius:13,
          background:T.surf, border:`1px solid ${T.bdr}`,
          color:T.dim, fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>☆</button>
      </div>
    </div>
  );
}

Object.assign(window, { S7_Analysis, S8_Dashboard, S9_StockDetail });
