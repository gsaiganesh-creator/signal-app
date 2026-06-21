'use client';
import { useState } from 'react';

const SIGS = [
  { sym:'RELIANCE',    sub:'Reliance Industries · NSE · Large Cap',  type:'buy',  cat:'momentum', badge:'STRONG BUY', btype:'sbuy', conf:87, cmp:'₹2,912', tgt:'₹3,080', sl:'₹2,820', rr:'1.8:1', tags:['RSI=34 ↑','EMA cross ✓','Del.%=66','Vol 2.1×','ADX=28'], time:'Today 09:32 IST', sector:'Energy',   sC:'var(--org)', sBg:'rgba(255,92,26,0.1)' },
  { sym:'TATAMOTORS',  sub:'Tata Motors · NSE · Auto',               type:'buy',  cat:'momentum', badge:'STRONG BUY', btype:'sbuy', conf:81, cmp:'₹960',   tgt:'₹1,040', sl:'₹930',   rr:'2.7:1', tags:['RF score=0.81','Vol 2.4×','Sector ▲','OBV rising'], time:'Today 09:31 IST', sector:'Auto',    sC:'var(--bluL)', sBg:'rgba(23,64,245,0.1)' },
  { sym:'TCS',         sub:'Tata Consultancy · NSE · IT',            type:'buy',  cat:'swing',    badge:'BUY',       btype:'buy',  conf:73, cmp:'₹3,880', tgt:'₹4,100', sl:'₹3,780', rr:'2.2:1', tags:['MACD cross ✓','IT sector +4.1%','Del.%=58'], time:'Today 09:35 IST', sector:'IT',     sC:'var(--pur)', sBg:'rgba(139,92,246,0.1)' },
  { sym:'SBIN',        sub:'State Bank of India · NSE · Banking',    type:'buy',  cat:'momentum', badge:'BUY',       btype:'buy',  conf:76, cmp:'₹824',   tgt:'₹872',   sl:'₹798',   rr:'1.8:1', tags:['RSI=38','Vol surge 2.8×','BB lower band','DII buying'], time:'Today 09:40 IST', sector:'Banking', sC:'var(--ylw)', sBg:'rgba(255,184,0,0.1)' },
  { sym:'INFY',        sub:'Infosys · NSE · IT',                     type:'buy',  cat:'swing',    badge:'BUY',       btype:'buy',  conf:69, cmp:'₹1,742', tgt:'₹1,840', sl:'₹1,698', rr:'2.3:1', tags:['Earnings beat','IT sector ▲','Del.%=54'], time:'Today 09:42 IST', sector:'IT',     sC:'var(--pur)', sBg:'rgba(139,92,246,0.1)' },
  { sym:'BAJFINANCE',  sub:'Bajaj Finance · NSE · NBFC',             type:'buy',  cat:'swing',    badge:'BUY',       btype:'buy',  conf:67, cmp:'₹8,240', tgt:'₹8,700', sl:'₹8,020', rr:'2.1:1', tags:['RSI=41','EMA support','NBFC rally'], time:'Today 09:55 IST', sector:'Finance', sC:'var(--grn)', sBg:'rgba(0,212,160,0.1)' },
  { sym:'HDFCBANK',    sub:'HDFC Bank · NSE · Banking',              type:'hold', cat:'swing',    badge:'HOLD',      btype:'hold', conf:58, cmp:'₹1,624', tgt:'₹1,680', sl:'₹1,580', rr:'1.4:1', tags:['RSI=52','EMA flat','Awaiting volume'], time:'Today 10:12 IST', sector:'Banking', sC:'var(--ylw)', sBg:'rgba(255,184,0,0.1)' },
  { sym:'WIPRO',       sub:'Wipro Ltd · NSE · IT',                   type:'buy',  cat:'swing',    badge:'BUY',       btype:'buy',  conf:66, cmp:'₹512',   tgt:'₹545',   sl:'₹496',   rr:'2.1:1', tags:['RSI=40','MACD hist ▲','IT peer rally'], time:'Today 10:22 IST', sector:'IT',     sC:'var(--pur)', sBg:'rgba(139,92,246,0.1)' },
  { sym:'ZOMATO',      sub:'Zomato Ltd · NSE · Consumer',            type:'sell', cat:'momentum', badge:'SELL',      btype:'sell', conf:74, cmp:'₹198',   tgt:'₹175',   sl:'₹210',   rr:'1.9:1', tags:['RSI=71','Below EMA50','FII net sell'], time:'Today 09:30 IST', sector:'Consumer', sC:'var(--red)', sBg:'rgba(255,59,92,0.1)' },
  { sym:'PAYTM',       sub:'One97 Comms · NSE · Fintech',            type:'sell', cat:'momentum', badge:'SELL',      btype:'sell', conf:71, cmp:'₹562',   tgt:'₹510',   sl:'₹590',   rr:'1.9:1', tags:['RSI=68','Distribution pattern','Volume ▼'], time:'Today 10:05 IST', sector:'Fintech', sC:'var(--red)', sBg:'rgba(255,59,92,0.1)' },
];

const BADGE: Record<string,{c:string;bg:string;bc:string}> = {
  sbuy: { c:'var(--grn)',  bg:'rgba(0,212,160,0.14)',  bc:'rgba(0,212,160,0.3)' },
  buy:  { c:'var(--grn)',  bg:'rgba(0,212,160,0.09)',  bc:'rgba(0,212,160,0.2)' },
  hold: { c:'var(--ylw)',  bg:'rgba(255,184,0,0.12)',  bc:'rgba(255,184,0,0.25)' },
  sell: { c:'var(--red)',  bg:'rgba(255,59,92,0.12)',  bc:'rgba(255,59,92,0.25)' },
};

const CONF_CLR: Record<string,string> = { sbuy:'linear-gradient(90deg,var(--grn),#00A87D)', buy:'linear-gradient(90deg,var(--grn),#00A87D)', hold:'linear-gradient(90deg,var(--ylw),#CC9200)', sell:'linear-gradient(90deg,var(--red),#CC1F3A)' };

export default function SignalsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort,   setSort  ] = useState<'conf'|'time'>('conf');

  const shown = SIGS
    .filter(s => {
      if (filter === 'buy')  return s.type === 'buy';
      if (filter === 'sell') return s.type === 'sell';
      if (filter === 'hold') return s.type === 'hold';
      if (filter === 'momentum') return s.cat === 'momentum';
      if (filter === 'swing')    return s.cat === 'swing';
      return true;
    })
    .filter(s => s.sym.toLowerCase().includes(search.toLowerCase()) || s.sub.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'conf' ? b.conf - a.conf : 0);

  const buyCnt = SIGS.filter(s=>s.type==='buy').length;
  const sellCnt = SIGS.filter(s=>s.type==='sell').length;
  const holdCnt = SIGS.filter(s=>s.type==='hold').length;

  const FILTERS = [
    { key:'all',      label:`All (${SIGS.length})`,  aC:'#1740F5', bg:'rgba(23,64,245,0.15)' },
    { key:'buy',      label:`🟢 BUY (${buyCnt})`,    aC:'var(--grn)', bg:'rgba(0,212,160,0.8)' },
    { key:'sell',     label:`🔴 SELL (${sellCnt})`,  aC:'var(--red)', bg:'rgba(255,59,92,0.8)' },
    { key:'hold',     label:`🟡 HOLD (${holdCnt})`,  aC:'var(--ylw)', bg:'rgba(255,184,0,0.8)' },
    { key:'momentum', label:'🚀 Momentum',            aC:'var(--org)', bg:'rgba(255,92,26,0.8)' },
    { key:'swing',    label:'🔄 Swing',              aC:'var(--pur)', bg:'rgba(139,92,246,0.8)' },
  ];

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Live Signals</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--grn)', display:'inline-block', marginRight:5, animation:'blink 2s infinite' }}/>
            Market open · {SIGS.length} signals fired today · Accuracy 90d: <span style={{ color:'var(--grn)', fontWeight:700 }}>71.4%</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>⚙️ Alert Settings</button>
          <button style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>📥 Export CSV</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background: filter===f.key ? f.bg : 'transparent', border:`1px solid ${filter===f.key ? 'transparent' : 'var(--bdr)'}`, color: filter===f.key ? (f.key==='buy'||f.key==='hold' ? '#001A12' : '#fff') : 'var(--dim)', transition:'all 0.18s' }}>
            {f.label}
          </button>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            style={{ height:34, padding:'0 10px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none' }}>
            <option value="conf">Sort: Confidence</option>
            <option value="time">Sort: Time</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search stocks…"
            style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontFamily:'inherit', outline:'none', minWidth:200 }}/>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {shown.map(s => {
            const bd = BADGE[s.btype];
            return (
              <div key={s.sym} style={{ background:'var(--surf)', border:`1px solid var(--bdr)`, borderRadius:14, padding:18, cursor:'pointer', transition:'border-color 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = s.type==='sell' ? 'rgba(255,59,92,0.4)' : s.type==='buy' ? 'rgba(0,212,160,0.4)' : 'var(--dim2)')}
                onMouseOut={e  => (e.currentTarget.style.borderColor = 'var(--bdr)')}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.3 }}>{s.sym}</div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{s.sub}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:7, whiteSpace:'nowrap', background:bd.bg, color:bd.c, border:`1px solid ${bd.bc}` }}>{s.badge}</span>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--dim)', marginBottom:5 }}>
                    <span>Model confidence</span><span style={{ color:bd.c, fontWeight:700 }}>{s.conf}%</span>
                  </div>
                  <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${s.conf}%`, borderRadius:3, background:CONF_CLR[s.btype] }}/>
                  </div>
                </div>
                <div style={{ display:'flex', gap:0, border:'1px solid var(--bdr)', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
                  {[['CMP', s.cmp, 'var(--txt)'],['Target', s.tgt, 'var(--grn)'],['Stop Loss', s.sl, 'var(--red)'],['R:R', s.rr, 'var(--txt)']].map(([l,v,c]) => (
                    <div key={l as string} style={{ flex:1, padding:'8px 10px', borderRight:'1px solid var(--bdr)', textAlign:'center' }}>
                      <div style={{ fontSize:10, color:'var(--dim)', marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:c as string }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ flex:1, padding:'8px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', marginBottom:3 }}>R:R</div>
                    <div style={{ fontSize:13, fontWeight:800 }}>{s.rr}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {s.tags.map(t => (
                    <span key={t} style={{ fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:5, background:'rgba(23,64,245,0.1)', color:'var(--bluL)', border:'1px solid rgba(23,64,245,0.2)' }}>{t}</span>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, paddingTop:10, borderTop:'1px solid var(--bdr)' }}>
                  <span style={{ fontSize:11, color:'var(--dim2)' }}>{s.time}</span>
                  <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:5, background:s.sBg, color:s.sC }}>{s.sector}</span>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && (
            <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'var(--dim)' }}>No signals match your filter.</div>
          )}
        </div>

        {/* Right rail */}
        <div>
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>90-Day Accuracy</div>
            {[
              { label:'Overall accuracy', val:'71.4%', pct:71, c:'var(--grn)' },
              { label:'Strong BUY calls', val:'78.2%', pct:78, c:'var(--grn)' },
              { label:'BUY calls',        val:'68.9%', pct:69, c:'var(--grn)' },
              { label:'SELL calls',       val:'72.1%', pct:72, c:'var(--grn)' },
            ].map(acc => (
              <div key={acc.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'var(--dim)', fontSize:11 }}>{acc.label}</span>
                  <span style={{ fontWeight:800, color:acc.c }}>{acc.val}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${acc.pct}%`, background:'linear-gradient(90deg,var(--grn),#00A87D)', borderRadius:3 }}/>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Signal Summary</div>
            {[
              { label:'Total fired today', val:SIGS.length.toString(), c:'var(--txt)' },
              { label:'BUY signals',   val:buyCnt.toString(),   c:'var(--grn)' },
              { label:'SELL signals',  val:sellCnt.toString(),  c:'var(--red)' },
              { label:'HOLD signals',  val:holdCnt.toString(),  c:'var(--ylw)' },
              { label:'Avg confidence',val:'74.3%',             c:'var(--bluL)' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:13 }}>
                <span style={{ color:'var(--dim)', fontSize:12 }}>{row.label}</span>
                <span style={{ fontWeight:800, color:row.c }}>{row.val}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.05))', border:'1px solid rgba(23,64,245,0.22)', borderRadius:14, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--bluL)', marginBottom:8 }}>🤖 Top Pick Right Now</div>
            <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.3 }}>TATAMOTORS</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:8 }}>Highest confidence BUY today</div>
            {[['Entry','₹960'],['Target','₹1,040'],['SL','₹930'],['R:R','2.7:1']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                <span style={{ color:'var(--dim)' }}>{l}</span>
                <span style={{ fontWeight:700 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:4 }}>Confidence</div>
              <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:'81%', background:'linear-gradient(90deg,var(--grn),#00A87D)', borderRadius:3 }}/>
              </div>
              <div style={{ fontSize:11, color:'var(--grn)', fontWeight:700, marginTop:3 }}>81% · STRONG BUY</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
