const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, marginBottom:16 };
const cardHead: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--bdr)' };

function FundRow({ icon, iconBg, iconColor, name, meta, pct, pctColor, nav, barWidth, barColor, pill, pillBg, pillColor }: {
  icon:string; iconBg:string; iconColor:string; name:string; meta:string; pct:string; pctColor:string;
  nav:string; barWidth:string; barColor:string; pill:string; pillBg:string; pillColor:string;
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:'1px solid var(--bdr)' }}>
      <div style={{ width:40, height:40, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0, background:iconBg, color:iconColor }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{name}</div>
        <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{meta}</div>
        <div style={{ height:4, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginTop:6 }}>
          <div style={{ height:'100%', borderRadius:3, width:barWidth, background:barColor }}/>
        </div>
      </div>
      <div style={{ textAlign:'right', minWidth:120 }}>
        <div style={{ fontSize:18, fontWeight:900, color:pctColor }}>{pct}</div>
        <div style={{ fontSize:11, color:'var(--dim)' }}>{nav}</div>
      </div>
      <div><span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap', background:pillBg, color:pillColor, border:`1px solid ${pillColor}40` }}>{pill}</span></div>
    </div>
  );
}

export default function ETFMFPage() {
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>ETF &amp; Mutual Funds</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>ML-powered NAV analysis · SIP optimizer · ETF premium tracker</div>
        </div>
        <button style={{ height:36, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Fund</button>
      </div>

      {/* Summary cards */}
      <div className="g4" style={{ display:'grid', gap:12, marginBottom:20 }}>
        {[
          { lbl:'Total Invested', val:'₹1,23,000', sub:'Across 6 funds', sc:'var(--dim)' },
          { lbl:'Current Value',  val:'₹1,53,140', sub:'+₹30,140 · +24.5%', vc:'var(--grn)', sc:'var(--grn)' },
          { lbl:'SIP Amount',     val:'₹8,000',    sub:'Per month · 3 active SIPs', sc:'var(--dim)' },
          { lbl:'ML Coverage',    val:'6/6',        sub:'All funds analysed', vc:'var(--ylw)', sc:'var(--dim)' },
        ].map(m => (
          <div key={m.lbl} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>{m.lbl}</div>
            <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1, color:(m as {vc?:string}).vc ?? 'var(--txt)' }}>{m.val}</div>
            <div style={{ fontSize:12, color:m.sc, marginTop:5 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Mutual Funds */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ fontSize:14, fontWeight:700 }}>Mutual Funds</div>
          <span style={{ fontSize:12, color:'var(--dim)' }}>ML signal: Continue / Pause / Switch / Redeem</span>
        </div>
        <FundRow icon="MI" iconBg="rgba(0,122,255,0.12)" iconColor="#007AFF"
          name="Mirae Asset Large Cap Fund" meta="Direct Growth · SIP ₹3,000/mo · CRISIL 5★"
          pct="+16.3%" pctColor="var(--grn)" nav="NAV ₹124.80"
          barWidth="72%" barColor="var(--grn)"
          pill="✓ Continue SIP" pillBg="rgba(0,212,160,0.12)" pillColor="var(--grn)"/>
        <FundRow icon="SB" iconBg="rgba(139,92,246,0.12)" iconColor="var(--pur)"
          name="SBI Small Cap Fund" meta="Direct Growth · SIP ₹2,000/mo · CRISIL 4★"
          pct="+40.0%" pctColor="var(--grn)" nav="NAV ₹210.40"
          barWidth="88%" barColor="var(--grn)"
          pill="🚀 Top Performer" pillBg="rgba(255,92,26,0.12)" pillColor="var(--org)"/>
        <div style={{ borderBottom:'none' }}>
          <FundRow icon="HD" iconBg="rgba(255,184,0,0.12)" iconColor="var(--ylw)"
            name="HDFC Mid-Cap Opportunities" meta="Direct Growth · SIP ₹3,000/mo · CRISIL 4★"
            pct="+8.2%" pctColor="var(--ylw)" nav="NAV ₹98.60"
            barWidth="45%" barColor="var(--ylw)"
            pill="⚠️ Pause SIP" pillBg="rgba(255,184,0,0.1)" pillColor="var(--ylw)"/>
        </div>
      </div>

      {/* ETFs */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ fontSize:14, fontWeight:700 }}>ETFs — Premium / Discount to NAV</div>
          <span style={{ fontSize:12, color:'var(--dim)' }}>Buy when at discount, trim when at premium</span>
        </div>
        {[
          { icon:'NB', iconBg:'rgba(255,184,0,0.12)', iconColor:'var(--ylw)', name:'NIFTYBEES', meta:'NIFTY 50 Index ETF · 180 units · NSE', premLbl:'Premium', prem:'+0.08%', premColor:'var(--ylw)', premNote:'Fair value', pct:'+12.0%', pctColor:'var(--grn)', ltpTxt:'₹240.50 LTP', pill:'Hold · Fair value', pillBg:'rgba(255,184,0,0.1)', pillColor:'var(--ylw)' },
          { icon:'GB', iconBg:'rgba(255,184,0,0.15)', iconColor:'#B8860B', name:'GOLDBEES', meta:'Gold ETF · 50 units · NSE', premLbl:'Discount', prem:'-0.12%', premColor:'var(--grn)', premNote:'Good entry', pct:'+6.4%', pctColor:'var(--grn)', ltpTxt:'₹58.20 LTP', pill:'✓ Add on dips', pillBg:'rgba(0,212,160,0.12)', pillColor:'var(--grn)' },
          { icon:'BB', iconBg:'rgba(23,64,245,0.12)', iconColor:'var(--bluL)', name:'BANKBEES', meta:'Bank NIFTY ETF · 100 units · NSE', premLbl:'Premium', prem:'+0.31%', premColor:'var(--red)', premNote:'Slightly high', pct:'+9.1%', pctColor:'var(--grn)', ltpTxt:'₹485.00 LTP', pill:'Wait for dip', pillBg:'rgba(255,184,0,0.1)', pillColor:'var(--ylw)' },
        ].map((etf, i) => (
          <div key={etf.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < 2 ? '1px solid var(--bdr)' : 'none' }}>
            <div style={{ width:40, height:40, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0, background:etf.iconBg, color:etf.iconColor }}>{etf.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{etf.name}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{etf.meta}</div>
            </div>
            <div style={{ textAlign:'center', minWidth:100 }}>
              <div style={{ fontSize:11, color:'var(--dim)' }}>{etf.premLbl}</div>
              <div style={{ fontSize:16, fontWeight:900, color:etf.premColor }}>{etf.prem}</div>
              <div style={{ fontSize:10, color:'var(--dim)' }}>{etf.premNote}</div>
            </div>
            <div style={{ textAlign:'right', minWidth:100 }}>
              <div style={{ fontSize:18, fontWeight:900, color:etf.pctColor }}>{etf.pct}</div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>{etf.ltpTxt}</div>
            </div>
            <div><span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:etf.pillBg, color:etf.pillColor, border:`1px solid ${etf.pillColor}40` }}>{etf.pill}</span></div>
          </div>
        ))}
      </div>

      {/* SIP Optimizer */}
      <div style={{ background:'rgba(0,212,160,0.05)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:14, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>🎯 SIP Optimizer — ML Recommendation</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:14 }}>Based on current NIFTY P/E (22.4×), market cycle (mid-bull), and your fund performance</div>
        <div className="g3" style={{ display:'grid', gap:10 }}>
          {[
            { fund:'Mirae Large Cap', action:'↑ Increase SIP', color:'var(--grn)', bg:'rgba(0,212,160,0.07)', bdr:'rgba(0,212,160,0.2)', note:'+₹1,000/mo recommended' },
            { fund:'HDFC Mid Cap', action:'⏸ Pause SIP', color:'var(--ylw)', bg:'rgba(255,184,0,0.06)', bdr:'rgba(255,184,0,0.2)', note:'Underperforming benchmark' },
            { fund:'SBI Small Cap', action:'✓ Continue', color:'var(--grn)', bg:'rgba(0,212,160,0.07)', bdr:'rgba(0,212,160,0.2)', note:'Top quartile alpha' },
          ].map(s => (
            <div key={s.fund} style={{ background:s.bg, border:`1px solid ${s.bdr}`, borderRadius:10, padding:14, textAlign:'center' }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5 }}>{s.fund}</div>
              <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.action}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · ML analysis is for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
