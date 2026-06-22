import { PublicNav } from '@/components/PublicNav';

export default function AboutPage() {
  return (
    <div style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>

      <PublicNav />

      {/* Hero */}
      <section style={{ padding:'80px 40px 64px', position:'relative', overflow:'hidden', textAlign:'center' }}>
        <div style={{ position:'absolute', top:-200, left:'50%', transform:'translateX(-50%)', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(23,64,245,0.12) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'var(--bluL)', marginBottom:12 }}>Our Story</div>
          <h1 style={{ fontSize:'clamp(36px,6vw,72px)', fontWeight:900, letterSpacing:-2.5, lineHeight:1.0, marginBottom:20 }}>
            Built by a trader,<br/><span style={{ color:'var(--blu)' }}>for traders</span><br/>who are <span style={{ color:'var(--org)' }}>done overpaying.</span>
          </h1>
          <p style={{ fontSize:17, color:'var(--dim)', lineHeight:1.7, maxWidth:620, margin:'0 auto' }}>SIGNAL started as a frustration — paying ₹5,000/month to a Telegram channel with zero accountability, zero accuracy data, and zero personalisation. So we built the alternative.</p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding:'72px 40px', borderTop:'1px solid var(--bdr)' }}>
        <div className="g-mission" style={{ maxWidth:1100, margin:'0 auto', display:'grid', gap:60, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'var(--org)', marginBottom:12 }}>Our Mission</div>
            <div style={{ fontSize:'clamp(22px,3vw,34px)', fontWeight:800, letterSpacing:-0.8, lineHeight:1.25, marginBottom:20 }}>
              &ldquo;Give every Indian trader access to <span style={{ color:'var(--blu)' }}>institutional-grade</span> ML signals — transparently, affordably, and accountably.&rdquo;
            </div>
            <p style={{ color:'var(--dim)', fontSize:14, lineHeight:1.75, marginBottom:16 }}>The Indian stock market has 10 crore+ retail investors. Most of them pay for Telegram calls with no track record, or rely on tips from friends. SIGNAL changes that — with ML-powered signals, public accuracy stats, and prices starting at ₹199/month.</p>
            <p style={{ color:'var(--dim)', fontSize:14, lineHeight:1.75 }}>Every signal SIGNAL fires is posted publicly on Twitter. Every week&apos;s accuracy is published. Nothing is hidden, nothing is deleted. That&apos;s the standard we hold ourselves to — and the one we believe every signal service should meet.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { val:'71.4%', valColor:'var(--grn)', lbl:'Signal accuracy over the last 90 days — publicly verified on Twitter' },
              { val:'142',   valColor:'var(--txt)', lbl:'Total signals fired in 90 days — every one posted publicly before outcome' },
              { val:'15',    valColor:'var(--blu)', lbl:'ML parameters — RSI, MACD, EMA, Delivery %, FII/DII flow, and more' },
              { val:'10×',   valColor:'var(--org)', lbl:'Cheaper than premium Telegram channels — at a fraction of the price' },
            ].map(m => (
              <div key={m.val} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:13 }}>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:-0.5, minWidth:80, color:m.valColor }}>{m.val}</div>
                <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.5 }}>{m.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders */}
      <section style={{ padding:'72px 40px', borderTop:'1px solid var(--bdr)' }} id="founders">
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'var(--pur)', marginBottom:12 }}>The Team</div>
          <div style={{ fontSize:'clamp(30px,4.5vw,52px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:16 }}>Who&apos;s building SIGNAL</div>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.7, maxWidth:600, marginBottom:36 }}>A small, focused team building the algo trading platform we always wished existed.</p>
          <div className="g-founder" style={{ display:'grid', gap:24 }}>

            {/* Sai Ganesh Gella */}
            <div style={{ background:'linear-gradient(145deg,rgba(23,64,245,0.06),var(--surf))', border:'1px solid rgba(23,64,245,0.3)', borderRadius:20, padding:32, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(23,64,245,0.15) 0%,transparent 65%)' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
                  <div style={{ width:80, height:80, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color:'#fff', background:'linear-gradient(135deg,var(--blu),var(--org))', flexShrink:0 }}>SG</div>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>Sai Ganesh Gella</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--bluL)' }}>Co-Founder &amp; CEO</div>
                  </div>
                </div>
                <p style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, marginBottom:20 }}>More details coming soon — watch this space.</p>
                <div style={{ display:'flex', flexWrap:'wrap' as const, gap:8, marginBottom:20 }}>
                  {[['Product & Strategy','rgba(23,64,245,0.1)','var(--bluL)','rgba(23,64,245,0.25)'],['NSE/BSE Trading','rgba(0,212,160,0.1)','var(--grn)','rgba(0,212,160,0.25)'],['ML Signals','rgba(255,92,26,0.1)','var(--org)','rgba(255,92,26,0.25)']].map(([tag,bg,color,bdr]) => (
                    <span key={tag} style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:5, background:bg, color, border:`1px solid ${bdr}` }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const }}>
                  <a href="#" style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', background:'#000', border:'1px solid #333', color:'#fff' }}>𝕏 @signal_in</a>
                  <a href="mailto:saiganesh@getsignal.in" style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)' }}>✉ saiganesh@getsignal.in</a>
                </div>
              </div>
            </div>

            {/* Sai Kumar Bethala */}
            <div style={{ background:'linear-gradient(145deg,rgba(0,212,160,0.05),var(--surf))', border:'1px solid rgba(0,212,160,0.25)', borderRadius:20, padding:32, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,160,0.12) 0%,transparent 65%)' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
                  <div style={{ width:80, height:80, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color:'#fff', background:'linear-gradient(135deg,var(--grn),#00875A)', flexShrink:0 }}>SK</div>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>Sai Kumar Bethala</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--grn)' }}>Co-Founder &amp; CTO</div>
                  </div>
                </div>
                <p style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, marginBottom:20 }}>More details coming soon — watch this space.</p>
                <div style={{ display:'flex', flexWrap:'wrap' as const, gap:8, marginBottom:20 }}>
                  {[['Engineering','rgba(0,212,160,0.1)','var(--grn)','rgba(0,212,160,0.25)'],['Backend & API','rgba(139,92,246,0.1)','var(--pur)','rgba(139,92,246,0.25)'],['Infrastructure','rgba(23,64,245,0.1)','var(--bluL)','rgba(23,64,245,0.25)']].map(([tag,bg,color,bdr]) => (
                    <span key={tag} style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:5, background:bg, color, border:`1px solid ${bdr}` }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const }}>
                  <a href="#" style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', background:'#000', border:'1px solid #333', color:'#fff' }}>𝕏 Twitter</a>
                  <a href="mailto:saikumar@getsignal.in" style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)' }}>✉ saikumar@getsignal.in</a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Origin Story Timeline */}
      <section style={{ padding:'72px 40px', borderTop:'1px solid var(--bdr)' }} id="story">
        <div className="g-story" style={{ maxWidth:1100, margin:'0 auto', display:'grid', gap:60, alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'var(--grn)', marginBottom:12 }}>Origin Story</div>
            <div style={{ fontSize:'clamp(24px,3.5vw,40px)', fontWeight:900, letterSpacing:-1.5, marginBottom:16 }}>Why we built this</div>
            <p style={{ marginBottom:16, fontSize:15, lineHeight:1.75, color:'var(--dim)' }}>In 2023, Vaasudev was paying ₹4,500/month to a popular Telegram stock advisory channel. After 6 months, he tallied the actual results: 52% accuracy on their calls — barely better than a coin flip, at an annual cost of ₹54,000.</p>
            <p style={{ marginBottom:16, fontSize:15, lineHeight:1.75, color:'var(--dim)' }}>The frustrating part wasn&apos;t the accuracy. It was that they never published their accuracy. They only shared the wins on social media. The losses were quietly forgotten.</p>
            <p style={{ fontSize:15, lineHeight:1.75, color:'var(--dim)' }}>SIGNAL was built to answer one question: <strong style={{ color:'var(--txt)' }}>What if a trading signal service published every single call — wins and losses — and let the data speak for itself?</strong></p>
          </div>
          <div>
            {[
              { dot:'var(--dim)',  date:'2023 — The frustration',    title:'₹54,000 spent on Telegram calls',          desc:'6 months · 52% accuracy · zero published track record. Started building own ML model on weekends.' },
              { dot:'var(--org)',  date:'Jan 2024 — First model',    title:'Random Forest v1 — 61% accuracy',          desc:'Trained on 3Y NSE data · 8 indicators · First signal posted publicly on Twitter. Small following started.' },
              { dot:'var(--blu)',  date:'Jul 2024 — v2 model',       title:'Added Delivery % · FII/DII flow',           desc:'Accuracy improved to 68%. Twitter community growing. First DMs asking "how do I get your signals?"' },
              { dot:'var(--grn)', date:'Mar 2025 — v3 model',       title:'71.4% accuracy · 15 parameters',           desc:'Added Twitter sentiment, sector momentum. Backtested 5 years. Decided to build a proper product.' },
              { dot:'var(--pur)', date:'Jun 2026 — SIGNAL launches', title:'Website + App · Free to start',            desc:'Full platform live — signals, algo builder, paper trading, broker sync. ₹199/month. Fully public track record.' },
            ].map((item, i, arr) => (
              <div key={item.date} style={{ display:'flex', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:44, flexShrink:0 }}>
                  <div style={{ width:12, height:12, borderRadius:'50%', flexShrink:0, marginTop:4, background:item.dot }}/>
                  {i < arr.length - 1 && <div style={{ width:2, flex:1, minHeight:28, background:'var(--bdr)', margin:'6px 0' }}/>}
                </div>
                <div style={{ flex:1, paddingBottom:28 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', marginBottom:4, letterSpacing:0.5, textTransform:'uppercase' as const }}>{item.date}</div>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:5 }}>{item.title}</div>
                  <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding:'72px 40px', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'var(--bluL)', marginBottom:12 }}>Our Principles</div>
          <div style={{ fontSize:'clamp(30px,4.5vw,52px)', fontWeight:900, letterSpacing:-1.5, marginBottom:32 }}>What we stand for</div>
          <div className="g-values" style={{ display:'grid', gap:14 }}>
            {[
              { icon:'📊', title:'Radical transparency', desc:"Every signal is posted publicly before the outcome. Every week's accuracy — including bad weeks — is published. No cherry-picking, no hiding losses." },
              { icon:'🤖', title:'Data over opinion', desc:'No human analyst calls. No "gut feel". Every signal comes from a quantitative model — the same model every time, with no emotion, no bias.' },
              { icon:'💰', title:'Accessible pricing', desc:"₹199/month for serious trading signals. Not ₹5,000. Not ₹20,000. We believe great tools shouldn't be reserved for traders with deep pockets." },
              { icon:'🛡️', title:'User-first data', desc:"Your portfolio data belongs to you. We use RBI's Account Aggregator framework — consent-based, revokable anytime. We never see your broker passwords." },
              { icon:'⚠️', title:'Honest about limits', desc:'We are NOT SEBI registered. We clearly say that — everywhere, always. No ML model is perfect. Trade responsibly, size your positions carefully.' },
              { icon:'🇮🇳', title:'Built for India first', desc:'Delivery %, FII/DII flow, NSE circuit limits — SIGNAL uses India-specific data that global algo platforms ignore. Built for NSE/BSE from the ground up.' },
            ].map(v => (
              <div key={v.title} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:22 }}>
                <div style={{ fontSize:24, marginBottom:12 }}>{v.icon}</div>
                <div style={{ fontSize:15, fontWeight:800, marginBottom:7 }}>{v.title}</div>
                <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ padding:'72px 40px', borderTop:'1px solid var(--bdr)' }} id="contact">
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase' as const, color:'var(--org)', marginBottom:12 }}>Get in Touch</div>
          <div style={{ fontSize:'clamp(30px,4.5vw,52px)', fontWeight:900, letterSpacing:-1.5, marginBottom:8 }}>We&apos;d love to hear from you</div>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.7, maxWidth:600, marginBottom:32 }}>Questions about the platform, partnership inquiries, or just want to talk trading — reach out.</p>
          <div className="g-contact" style={{ display:'grid', gap:14, marginBottom:24 }}>
            {[
              { icon:'✉️', label:'General enquiries',    val:'hello@getsignal.in',        sub:'Response within 24 hours', href:'mailto:hello@getsignal.in' },
              { icon:'🛟', label:'Customer support',     val:'support@getsignal.in',      sub:'Pro users: WhatsApp support', href:'mailto:support@getsignal.in' },
              { icon:'🤝', label:'Partnerships & press', val:'partnerships@getsignal.in', sub:'Broker integrations, media', href:'mailto:partnerships@getsignal.in' },
            ].map(c => (
              <div key={c.label} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:20, textAlign:'center' as const }}>
                <div style={{ fontSize:22, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:5 }}>{c.label}</div>
                <a href={c.href} style={{ fontSize:14, fontWeight:700, color:'var(--bluL)', textDecoration:'none' }}>{c.val}</a>
                <div style={{ fontSize:12, color:'var(--dim2)', marginTop:4 }}>{c.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' as const }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Follow for live signals on Twitter / X</div>
              <div style={{ fontSize:13, color:'var(--dim)' }}>Every signal posted the moment it fires. Weekly scorecards. Full transparency.</div>
            </div>
            <a href="#" style={{ display:'inline-flex', alignItems:'center', gap:8, height:42, padding:'0 20px', borderRadius:10, background:'#000', border:'1px solid #333', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>𝕏 @signal_in</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'72px 40px', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.09),rgba(0,212,160,0.05))', border:'1px solid rgba(23,64,245,0.22)', borderRadius:20, padding:48, textAlign:'center' as const }}>
            <h2 style={{ fontSize:'clamp(24px,3.5vw,40px)', fontWeight:900, letterSpacing:-1, marginBottom:12 }}>Ready to trade smarter?</h2>
            <p style={{ fontSize:15, color:'var(--dim)', marginBottom:28, maxWidth:480, marginLeft:'auto', marginRight:'auto' }}>Join traders who use data and accountability over expensive, unverified Telegram calls.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' as const }}>
              <a href="/auth" style={{ display:'inline-flex', alignItems:'center', height:52, padding:'0 32px', borderRadius:13, background:'linear-gradient(135deg,var(--blu),var(--bluL))', color:'#fff', fontSize:16, fontWeight:700, textDecoration:'none', boxShadow:'0 8px 24px rgba(23,64,245,0.35)' }}>Start Free — No Card Needed →</a>
              <a href="/track-record" style={{ display:'inline-flex', alignItems:'center', height:52, padding:'0 28px', borderRadius:13, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:15, fontWeight:600, textDecoration:'none' }}>View Track Record</a>
            </div>
            <div style={{ marginTop:20, fontSize:12, color:'var(--dim2)' }}>Built by Sai Ganesh Gella &amp; Sai Kumar Bethala &nbsp;·&nbsp; ⚠️ NOT SEBI registered · Not financial advice · Trade at your own risk</div>
          </div>
        </div>
      </section>

    </div>
  );
}
