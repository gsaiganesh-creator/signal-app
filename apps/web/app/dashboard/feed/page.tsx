export default function TwitterFeedPage() {
  return (
    <>
      {/* Hero card */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.04),rgba(23,64,245,0.04))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:20, padding:'32px 40px', marginBottom:28, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div style={{ maxWidth:520 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--dim)', textTransform:'uppercase', marginBottom:10 }}>𝕏 Finance Feed</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1.2, marginBottom:12 }}>
            Market pulse from<br/><span style={{ color:'var(--bluL)' }}>top finance voices.</span>
          </div>
          <div style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, marginBottom:20 }}>
            Curated real-time feed of SEBI-registered analysts, institutional desks, and high-signal finance accounts — filtered for your portfolio and sectors. No noise.
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:8, background:'rgba(23,64,245,0.08)', border:'1px solid rgba(23,64,245,0.2)', fontSize:13, fontWeight:600, color:'var(--bluL)' }}>
            𝕏 &nbsp;X (Twitter) API integration · Coming Q3 2026
          </div>
        </div>
        <div style={{ fontSize:80, opacity:0.12, flexShrink:0 }}>𝕏</div>
      </div>

      {/* What to expect */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
        {[
          { icon:'🎯', t:'Portfolio-filtered', d:'Only see posts mentioning your stocks and sectors' },
          { icon:'🔔', t:'Sentiment alerts', d:'Notified when a held stock trends on 𝕏' },
          { icon:'🤖', t:'AI-summarised', d:'Grok condenses 100 tweets into 3 actionable bullets' },
          { icon:'🚫', t:'Noise blocked', d:'Spam, pumps, and low-credibility accounts auto-filtered' },
        ].map(f => (
          <div key={f.t} style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:'18px 20px' }}>
            <div style={{ fontSize:24, marginBottom:10 }}>{f.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{f.t}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>
    </>
  );
}
