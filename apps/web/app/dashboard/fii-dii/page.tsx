const HISTORY = [
  { date:'Jun 22', fii:'-₹1,240 Cr', fiiPos:false, fiiW:40, dii:'+₹2,180 Cr', diiW:65 },
  { date:'Jun 21', fii:'-₹980 Cr',   fiiPos:false, fiiW:35, dii:'+₹1,840 Cr', diiW:55 },
  { date:'Jun 20', fii:'-₹1,420 Cr', fiiPos:false, fiiW:50, dii:'+₹2,340 Cr', diiW:70 },
  { date:'Jun 19', fii:'+₹2,120 Cr', fiiPos:true,  fiiW:60, dii:'+₹1,540 Cr', diiW:45 },
  { date:'Jun 18', fii:'+₹2,480 Cr', fiiPos:true,  fiiW:70, dii:'+₹1,380 Cr', diiW:40 },
];

export default function FIIDIIPage() {
  return (
    <>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>FII / DII Flow</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>Institutional money movement — India's biggest market driver · Source: NSE/SEBI</div>
      </div>

      <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Today · Jun 22, 2026</div>

      {/* FII / DII big cards */}
      <div className="g2" style={{ display:'grid', gap:16, marginBottom:20 }}>
        <div style={{ background:'rgba(255,59,92,0.03)', border:'1px solid rgba(255,59,92,0.2)', borderRadius:16, padding:24 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:'var(--dim)', marginBottom:6 }}>FII — Foreign Institutional</div>
          <div style={{ fontSize:36, fontWeight:900, letterSpacing:-1.5, marginBottom:4, color:'var(--red)' }}>-₹1,240 Cr</div>
          <div style={{ fontSize:12, color:'var(--dim)' }}>Equity net selling · Cash segment</div>
          <div style={{ height:8, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden', margin:'12px 0' }}>
            <div style={{ height:'100%', borderRadius:4, width:'35%', background:'var(--red)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:4 }}>
            <span style={{ color:'var(--dim)' }}>Buy: ₹14,820 Cr</span>
            <span style={{ color:'var(--dim)' }}>Sell: ₹16,060 Cr</span>
          </div>
          <div style={{ marginTop:12, fontSize:12, color:'var(--dim)' }}>5-day net: <span style={{ color:'var(--red)', fontWeight:700 }}>-₹4,820 Cr</span> · Consistent selling</div>
        </div>
        <div style={{ background:'rgba(0,212,160,0.03)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:16, padding:24 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:'var(--dim)', marginBottom:6 }}>DII — Domestic Institutional</div>
          <div style={{ fontSize:36, fontWeight:900, letterSpacing:-1.5, marginBottom:4, color:'var(--grn)' }}>+₹2,180 Cr</div>
          <div style={{ fontSize:12, color:'var(--dim)' }}>Equity net buying · Cash segment</div>
          <div style={{ height:8, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden', margin:'12px 0' }}>
            <div style={{ height:'100%', borderRadius:4, width:'65%', background:'var(--grn)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:4 }}>
            <span style={{ color:'var(--dim)' }}>Buy: ₹18,240 Cr</span>
            <span style={{ color:'var(--dim)' }}>Sell: ₹16,060 Cr</span>
          </div>
          <div style={{ marginTop:12, fontSize:12, color:'var(--dim)' }}>5-day net: <span style={{ color:'var(--grn)', fontWeight:700 }}>+₹9,640 Cr</span> · Absorbing FII selling</div>
        </div>
      </div>

      {/* ML impact box */}
      <div style={{ background:'rgba(23,64,245,0.06)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>📊 SIGNAL ML impact on today's signals</div>
        <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>
          FII selling (-₹1,240 Cr) is a <strong style={{ color:'var(--ylw)' }}>moderate headwind</strong> — SIGNAL has applied a -8% confidence penalty on all BUY signals for large-cap banking stocks. DII buying (+₹2,180 Cr) is supportive for IT and consumer stocks — SIGNAL has applied a +5% confidence boost for those sectors.
        </div>
      </div>

      {/* History table */}
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Last 10 Trading Days</div>
        <div style={{ display:'flex', gap:12, marginBottom:10, fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5 }}>
          <span style={{ width:70 }}>Date</span>
          <span style={{ flex:1 }}>FII Flow</span>
          <span style={{ flex:1 }}>DII Flow</span>
        </div>
        {HISTORY.map(row => (
          <div key={row.date} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--bdr)' }}>
            <span style={{ fontSize:12, color:'var(--dim)', width:70, flexShrink:0 }}>{row.date}</span>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ height:14, borderRadius:4, width:`${row.fiiW}%`, background: row.fiiPos ? 'rgba(0,212,160,0.4)' : 'rgba(255,59,92,0.4)' }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:700, width:110, color: row.fiiPos ? 'var(--grn)' : 'var(--red)' }}>{row.fii}</span>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ height:14, borderRadius:4, width:`${row.diiW}%`, background:'rgba(0,212,160,0.4)' }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:700, width:110, color:'var(--grn)' }}>{row.dii}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Data sourced from NSE/SEBI public disclosures · For informational purposes only · DYOR
      </div>
    </>
  );
}
