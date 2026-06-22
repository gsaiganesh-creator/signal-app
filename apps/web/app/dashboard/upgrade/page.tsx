const PLANS = [
  { name:'Free',    price:'₹0',    period:'/mo', color:'var(--dim)',  border:'var(--bdr)',              features:['5 signals/day','1 portfolio','Basic charts','Community access'], current:false, cta:'Current Plan',   ctaBg:'var(--surf2)',  ctaColor:'var(--dim)' },
  { name:'Starter', price:'₹299',  period:'/mo', color:'var(--bluL)', border:'rgba(23,64,245,0.4)',     features:['25 signals/day','3 portfolios','ML classification','Algo Builder (5 strategies)','Paper trading'], current:false, cta:'Upgrade',      ctaBg:'var(--blu)',   ctaColor:'#fff'       },
  { name:'Pro',     price:'₹799',  period:'/mo', color:'var(--org)',  border:'rgba(255,92,26,0.5)',     features:['Unlimited signals','10 portfolios','Priority signals','Backtest engine','1 broker connect','Earnings ML predictions','Sector heatmap'], current:true,  cta:'Current Plan',   ctaBg:'rgba(255,92,26,0.12)', ctaColor:'var(--org)' },
  { name:'Elite',   price:'₹1,999',period:'/mo', color:'var(--ylw)', border:'rgba(255,184,0,0.5)',     features:['Everything in Pro','Unlimited broker connects','API access','Dedicated support','White-glove onboarding','Early feature access'], current:false, cta:'Upgrade',      ctaBg:'var(--ylw)',   ctaColor:'#000'       },
];

export default function UpgradePage() {
  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(255,92,26,0.07),rgba(255,184,0,0.04))', border:'1px solid rgba(255,92,26,0.2)', borderRadius:20, padding:'32px 40px', marginBottom:32, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div style={{ maxWidth:520 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--org)', textTransform:'uppercase', marginBottom:10 }}>Upgrade Plan</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1.2, marginBottom:12 }}>
            More signals.<br/><span style={{ color:'var(--org)' }}>Sharper edge.</span>
          </div>
          <div style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7 }}>
            Upgrade to unlock unlimited signals, the backtest engine, broker integration and ML-powered earnings predictions. Cancel anytime.
          </div>
        </div>
        <div style={{ fontSize:80, opacity:0.12, flexShrink:0 }}>⚡</div>
      </div>

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
        {PLANS.map(p => (
          <div key={p.name} style={{ background:'var(--surf)', border:`2px solid ${p.current ? p.border : 'var(--bdr)'}`, borderRadius:18, padding:'22px 20px', position:'relative', display:'flex', flexDirection:'column' }}>
            {p.current && (
              <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:'0 0 8px 8px', background:p.ctaBg, color:p.ctaColor, border:`1px solid ${p.border}`, borderTop:'none', whiteSpace:'nowrap' }}>✓ YOUR PLAN</div>
            )}
            <div style={{ fontSize:13, fontWeight:800, color:p.color, marginBottom:4, marginTop: p.current ? 10 : 0 }}>{p.name}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:2, marginBottom:16 }}>
              <span style={{ fontSize:26, fontWeight:900 }}>{p.price}</span>
              <span style={{ fontSize:12, color:'var(--dim)' }}>{p.period}</span>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
              {p.features.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'var(--dim)' }}>
                  <span style={{ color:'var(--grn)', flexShrink:0, marginTop:1 }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button style={{ width:'100%', height:38, borderRadius:10, background:p.ctaBg, border:`1px solid ${p.border}`, color:p.ctaColor, fontSize:13, fontWeight:700, cursor: p.current ? 'default' : 'pointer', fontFamily:'inherit' }}>
              {p.cta}
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize:12, color:'var(--dim2)', textAlign:'center' }}>
        Annual plans save 20% · Referral discounts stack · All prices incl. GST
      </div>
    </>
  );
}
