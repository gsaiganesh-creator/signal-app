import Link from 'next/link';

const PORTFOLIO = [
  { ab:'RL', c:'var(--grn)', bg:'rgba(0,212,160,0.12)', sym:'RELIANCE',    name:'Reliance Industries', cls:'🚀 Momentum', cC:'var(--grn)', cBg:'rgba(0,212,160,0.1)', cmp:'₹2,912', chg:'+1.8%', chgC:'var(--grn)', pl:'+₹18,400', plPct:'+14.2%', plC:'var(--grn)', sig:'STRONG BUY', sigC:'var(--grn)', sigBg:'rgba(0,212,160,0.12)', sigBc:'rgba(0,212,160,0.25)' },
  { ab:'HD', c:'var(--bluL)', bg:'rgba(23,64,245,0.12)', sym:'HDFCBANK',   name:'HDFC Bank',            cls:'🔄 Swingable', cC:'var(--bluL)', cBg:'rgba(23,64,245,0.1)', cmp:'₹1,624', chg:'-0.3%', chgC:'var(--red)', pl:'+₹9,840', plPct:'+7.8%', plC:'var(--grn)', sig:'HOLD', sigC:'var(--ylw)', sigBg:'rgba(255,184,0,0.1)', sigBc:'rgba(255,184,0,0.25)' },
  { ab:'TC', c:'var(--pur)', bg:'rgba(139,92,246,0.12)', sym:'TCS',        name:'Tata Consultancy',     cls:'🏛️ Long Term', cC:'var(--pur)', cBg:'rgba(139,92,246,0.1)', cmp:'₹3,880', chg:'+2.1%', chgC:'var(--grn)', pl:'+₹31,200', plPct:'+22.1%', plC:'var(--grn)', sig:'BUY', sigC:'var(--grn)', sigBg:'rgba(0,212,160,0.12)', sigBc:'rgba(0,212,160,0.25)' },
  { ab:'SB', c:'var(--grn)', bg:'rgba(0,212,160,0.12)', sym:'SBIN',       name:'State Bank of India',  cls:'🚀 Momentum', cC:'var(--grn)', cBg:'rgba(0,212,160,0.1)', cmp:'₹824', chg:'+1.2%', chgC:'var(--grn)', pl:'+₹12,000', plPct:'+9.8%', plC:'var(--grn)', sig:'STRONG BUY', sigC:'var(--grn)', sigBg:'rgba(0,212,160,0.12)', sigBc:'rgba(0,212,160,0.25)' },
  { ab:'ZM', c:'var(--red)', bg:'rgba(255,59,92,0.12)', sym:'ZOMATO',     name:'Zomato Ltd',           cls:'⚠️ Exit Now', cC:'var(--red)', cBg:'rgba(255,59,92,0.1)', cmp:'₹198', chg:'-1.4%', chgC:'var(--red)', pl:'-₹4,200', plPct:'-8.3%', plC:'var(--red)', sig:'SELL', sigC:'var(--red)', sigBg:'rgba(255,59,92,0.12)', sigBc:'rgba(255,59,92,0.25)' },
];

const SECTORS = [
  { name:'IT', val:'+4.1%', c:'var(--grn)', bg:'rgba(0,212,160,0.1)' },
  { name:'Auto', val:'+2.8%', c:'var(--grn)', bg:'rgba(0,212,160,0.07)' },
  { name:'Pharma', val:'+1.4%', c:'var(--grn)', bg:'rgba(0,212,160,0.05)' },
  { name:'FMCG', val:'+0.3%', c:'var(--ylw)', bg:'rgba(255,184,0,0.07)' },
  { name:'Banking', val:'-0.8%', c:'var(--red)', bg:'rgba(255,59,92,0.07)' },
  { name:'Metal', val:'-2.1%', c:'var(--red)', bg:'rgba(255,59,92,0.1)' },
];

const TWEETS = [
  { time:'2h ago', text:'🎯 RF PICK: $TATAMOTORS — STRONG BUY · Conf. 81% · Entry ₹960 · Target ₹1,040 · SL ₹930 · RSI=34, EMA golden cross ✓ #NSE #AlgoTrading' },
  { time:'Yesterday', text:'📊 Week 23 Scorecard: 14 signals · ✅ 10 targets hit (71.4%) · ⛔ 2 SL · ⏳ 2 open. Transparency is everything. #SIGNAL' },
  { time:'2d ago', text:'🧪 Paper Trade Update — Day 6: RSI+EMA strategy virtual P&L: +₹8,420 on ₹1L capital (+8.4%) · 7 signals fired · 5 wins. Going live next week!' },
];

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };

export default function DashboardPage() {
  return (
    <>
      {/* Welcome */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Good morning, Vaasudev 👋</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
            Thursday, 19 Jun 2026 · Market opens in <span style={{ color:'var(--ylw)', fontWeight:600 }}>23 min</span> · NIFTY futures <span style={{ color:'var(--grn)', fontWeight:600 }}>+0.4%</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>🔗 Connect mStock</button>
          <button style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ New Strategy</button>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="g4" style={{ display:'grid', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Portfolio Value', val:'₹18,70,420', sub:'▲ +₹1,24,320', sub2:'+7.1% all-time', subC:'var(--grn)' },
          { label:"Today's P&L",          val:'+₹8,240', valC:'var(--grn)', sub:'▲ +0.44%', sub2:'unrealised', subC:'var(--grn)' },
          { label:'Active Signals Today', val:'3', valC:'var(--bluL)', badges:true },
          { label:'Signal Accuracy (90d)',val:'71.4%', valC:'var(--grn)', sub2:'50/70 signals hit target' },
        ].map((h, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>{h.label}</div>
            <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1, color:h.valC ?? 'var(--txt)' }}>{h.val}</div>
            {h.badges ? (
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5 }}>
                <span style={{ padding:'2px 7px', borderRadius:4, background:'rgba(0,212,160,0.12)', color:'var(--grn)', fontSize:11, fontWeight:700 }}>2 BUY</span>
                <span style={{ padding:'2px 7px', borderRadius:4, background:'rgba(255,59,92,0.12)', color:'var(--red)', fontSize:11, fontWeight:700 }}>1 SELL</span>
              </div>
            ) : (
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                {h.sub && <span style={{ fontSize:13, fontWeight:700, color:h.subC }}>{h.sub}</span>}
                {h.sub2 && <span style={{ color:'var(--dim2)' }}>{h.sub2}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="g-side" style={{ display:'grid', gap:16 }}>
        <div>

          {/* Market Overview */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Market Overview</div>
              <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--grn)', display:'inline-block' }}/>
                Pre-market
              </span>
            </div>
            <div className="g2" style={{ display:'grid', gap:10 }}>
              {[
                { name:'NIFTY 50',   val:'24,812', chg:'▲ +112 (+0.45%)', up:true,  pts:'0,22 15,18 30,20 45,14 60,10 75,8 85,6 100,4' },
                { name:'SENSEX',     val:'81,540', chg:'▲ +384 (+0.47%)', up:true,  pts:'0,24 20,20 40,22 55,16 70,11 85,7 100,5' },
                { name:'BANK NIFTY', val:'53,240', chg:'▼ -88 (-0.17%)',  up:false, pts:'0,8 20,10 40,8 55,12 70,16 85,18 100,20' },
                { name:'NIFTY IT',   val:'38,120', chg:'▲ +420 (+1.12%)', up:true,  pts:'0,26 15,22 30,18 45,15 60,10 75,7 90,5 100,3' },
              ].map(m => (
                <div key={m.name} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:11, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:'var(--dim)', marginBottom:4 }}>{m.name}</div>
                  <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.5 }}>{m.val}</div>
                  <div style={{ fontSize:12, fontWeight:700, marginTop:3, color: m.up ? 'var(--grn)' : 'var(--red)' }}>{m.chg}</div>
                  <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none">
                    <polyline points={m.pts} fill="none" stroke={m.up ? '#00D4A0' : '#FF3B5C'} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Table */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>My Portfolio · ML Classified</div>
              <span style={{ fontSize:12, color:'var(--bluL)', cursor:'pointer', fontWeight:600 }}>View all →</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','Category','CMP','P&L','Signal'].map(h => (
                    <th key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO.map(s => (
                  <tr key={s.sym}>
                    <td style={{ padding:'10px 10px', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:13 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:s.bg, color:s.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, flexShrink:0 }}>{s.ab}</div>
                        <div><div style={{ fontSize:13, fontWeight:700 }}>{s.sym}</div><div style={{ fontSize:11, color:'var(--dim)' }}>{s.name}</div></div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:s.cBg, color:s.cC, whiteSpace:'nowrap' }}>{s.cls}</span>
                    </td>
                    <td style={{ padding:'10px 10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{s.cmp}</div>
                      <div style={{ fontSize:11, color:s.chgC }}>{s.chg}</div>
                    </td>
                    <td style={{ padding:'10px 10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <div style={{ fontWeight:700, color:s.plC, fontSize:13 }}>{s.pl}</div>
                      <div style={{ fontSize:11, color:'var(--dim)' }}>{s.plPct}</div>
                    </td>
                    <td style={{ padding:'10px 10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:6, background:s.sigBg, color:s.sigC, border:`1px solid ${s.sigBc}`, whiteSpace:'nowrap' }}>{s.sig}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sector Heatmap */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Sector Heatmap</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>5-day performance</span>
            </div>
            <div className="g3" style={{ display:'grid', gap:8 }}>
              {SECTORS.map(s => (
                <div key={s.name} style={{ padding:'10px 12px', borderRadius:10, background:s.bg, textAlign:'center' }}>
                  <div style={{ fontSize:10, fontWeight:700, opacity:0.7, marginBottom:3, color:s.c }}>{s.name}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:s.c }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Twitter feed */}
          <div style={{ ...card }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>𝕏 Track Record Feed</div>
              <span style={{ fontSize:12, color:'var(--bluL)', fontWeight:600, cursor:'pointer' }}>View all on Twitter →</span>
            </div>
            {TWEETS.map((tw, i) => (
              <div key={i} style={{ padding:'11px 0', borderBottom: i < TWEETS.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--blu),var(--org))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>VA</div>
                  <div style={{ fontSize:12, fontWeight:700 }}>Vaasudev Amitav</div>
                  <div style={{ fontSize:10, color:'var(--dim2)', marginLeft:'auto' }}>{tw.time}</div>
                </div>
                <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.55 }}>{tw.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div>

          {/* RF Pick */}
          <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.05))', border:'1px solid rgba(23,64,245,0.25)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--bluL)', letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>🤖 RF Pick of the Day</div>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>TATAMOTORS</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:6 }}>Tata Motors · NSE · Auto</div>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1, margin:'6px 0' }}>₹960</div>
            <div style={{ display:'flex', gap:16, fontSize:12, marginBottom:10 }}>
              <div><div style={{ color:'var(--dim)', fontSize:10 }}>Target</div><div style={{ fontWeight:700, color:'var(--grn)' }}>₹1,040</div></div>
              <div><div style={{ color:'var(--dim)', fontSize:10 }}>Stop Loss</div><div style={{ fontWeight:700, color:'var(--red)' }}>₹930</div></div>
              <div><div style={{ color:'var(--dim)', fontSize:10 }}>R:R</div><div style={{ fontWeight:700 }}>2.7:1</div></div>
            </div>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5 }}>Model confidence</div>
            <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
              <div style={{ height:'100%', width:'81%', background:'linear-gradient(90deg,var(--grn),#00A87D)', borderRadius:3 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'var(--grn)', fontWeight:700 }}>81% confident</span>
              <span style={{ color:'var(--dim)' }}>RSI=34 · EMA ✓ · Del.%=68</span>
            </div>
          </div>

          {/* Paper Trade */}
          <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--pur)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--pur)', display:'inline-block' }}/>
              Paper Trade · RSI+EMA · Day 6/7
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div><div style={{ fontSize:11, color:'var(--dim)' }}>Virtual P&L</div><div style={{ fontSize:20, fontWeight:900, color:'var(--grn)' }}>+₹8,420</div></div>
              <div style={{ textAlign:'right' }}><div style={{ fontSize:11, color:'var(--dim)' }}>Win rate</div><div style={{ fontSize:20, fontWeight:900, color:'var(--grn)' }}>71%</div></div>
            </div>
            <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
              <div style={{ height:'100%', width:'71%', background:'linear-gradient(90deg,var(--pur),#6D3EC1)', borderRadius:3 }}/>
            </div>
            <Link href="/paper-trading" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:36, borderRadius:9, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', color:'var(--pur)', fontSize:13, fontWeight:700 }}>View Full Log →</Link>
          </div>

          {/* Signals */}
          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Today's Signals</div>
              <Link href="/signals" style={{ fontSize:12, color:'var(--bluL)', fontWeight:600 }}>View all</Link>
            </div>
            {[
              { sig:'BUY',  sym:'RELIANCE',   time:'09:32', note:'RSI=34.2 · EMA20>EMA50 · Del.%=66 · Conf. 87%', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
              { sig:'BUY',  sym:'TATAMOTORS', time:'09:31', note:'RF score 0.81 · Vol 2.4× avg · Sector momentum ▲', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
              { sig:'SELL', sym:'ZOMATO',     time:'09:30', note:'RSI=71 · Below EMA50 · FII net sell · Conf. 74%', sc:'var(--red)', sbg:'rgba(255,59,92,0.12)' },
            ].map(s => (
              <div key={s.sym} style={{ padding:'12px 0', borderBottom:'1px solid var(--bdr)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, background:s.sbg, color:s.sc }}>{s.sig}</span>
                  <span style={{ fontSize:14, fontWeight:800 }}>{s.sym}</span>
                  <span style={{ fontSize:11, color:'var(--dim2)', marginLeft:'auto' }}>{s.time}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* FII/DII */}
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>FII / DII Flow</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>Today</span>
            </div>
            {[
              { label:'FII (Foreign Inst.)', val:'-₹1,240 Cr', valC:'var(--red)', pct:35, barC:'var(--red)' },
              { label:'DII (Domestic Inst.)', val:'+₹2,180 Cr', valC:'var(--grn)', pct:68, barC:'var(--grn)' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ fontWeight:600 }}>{f.label}</span>
                  <span style={{ fontWeight:800, color:f.valC }}>{f.val}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${f.pct}%`, background:f.barC, borderRadius:3 }}/>
                </div>
              </div>
            ))}
            <div style={{ fontSize:11, color:'var(--dim)', padding:'8px 10px', background:'var(--surf2)', borderRadius:8, lineHeight:1.6 }}>
              📊 Net institutional: <span style={{ color:'var(--grn)', fontWeight:700 }}>+₹940 Cr</span> — DIIs absorbing FII selling. Outlook: <span style={{ color:'var(--ylw)', fontWeight:700 }}>Cautiously Bullish</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
