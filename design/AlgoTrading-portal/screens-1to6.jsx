/* ── S1: Welcome ──────────────────────────────────────────── */
function S1_Welcome() {
  const { T, ACC, dark } = useTheme();
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'space-between', padding:'52px 24px 38px',
      overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', top:-80, left:-80, width:250, height:250, borderRadius:'50%',
        background:`radial-gradient(circle,rgba(23,64,245,${dark?.28:.12}) 0%,transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:60, right:-50, width:220, height:220, borderRadius:'50%',
        background:`radial-gradient(circle,rgba(255,92,26,${dark?.2:.1}) 0%,transparent 70%)`, pointerEvents:'none' }} />

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, zIndex:1 }}>
        <div style={{ width:78, height:78, borderRadius:22,
          background:`linear-gradient(145deg,${ACC.blu},${ACC.bluL})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 10px 40px rgba(23,64,245,0.55)` }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            <polyline points="2,34 10,20 17,27 25,12 33,18 40,8"
              stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="33" cy="18" r="4" fill={ACC.org}/>
            <circle cx="33" cy="18" r="8" fill={ACC.org} opacity="0.22"/>
          </svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:36, fontWeight:900, color:T.txt, letterSpacing:-1.5 }}>SIGNAL</div>
          <div style={{ fontSize:10.5, color:T.dim, letterSpacing:2.5, marginTop:4 }}>NSE · BSE · ML-POWERED</div>
        </div>
      </div>

      <div style={{ zIndex:1, width:'100%' }}>
        <svg width="100%" height="90" viewBox="0 0 320 90" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACC.blu} stopOpacity={dark?.30:.16}/>
              <stop offset="100%" stopColor={ACC.blu} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {[28,56,80].map(y=><line key={y} x1="0" y1={y} x2="320" y2={y} stroke={T.bdr} strokeWidth="0.7"/>)}
          <path d="M0,78 C30,70 55,62 80,52 S130,36 160,30 S220,18 250,14 L300,8 L320,6 L320,90 L0,90Z" fill="url(#wg1)"/>
          <path d="M0,78 C30,70 55,62 80,52 S130,36 160,30 S220,18 250,14 L300,8 L320,6"
            stroke={ACC.blu} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <circle cx="250" cy="14" r="5" fill={ACC.org}/>
          <circle cx="250" cy="14" r="10" fill={ACC.org} opacity="0.2"/>
          <line x1="250" y1="0" x2="250" y2="90" stroke={ACC.org} strokeDasharray="4 3" strokeWidth="0.8" opacity="0.5"/>
          <rect x="216" y="2" width="68" height="13" rx="3" fill="rgba(255,92,26,0.14)" stroke={ACC.org} strokeWidth="0.7"/>
          <text x="250" y="11.5" textAnchor="middle" fill={ACC.org} fontSize="7" fontWeight="800" fontFamily="system-ui">BUY SIGNAL</text>
          <rect x="4" y="42" width="52" height="12" rx="3" fill="rgba(0,212,160,0.1)" stroke="rgba(0,212,160,0.35)" strokeWidth="0.7"/>
          <text x="30" y="51" textAnchor="middle" fill={ACC.grn} fontSize="6.5" fontWeight="700" fontFamily="system-ui">↑2.4% NIFTY</text>
        </svg>
      </div>

      <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:9, zIndex:1 }}>
        <div style={{ display:'flex', gap:7, justifyContent:'center', marginBottom:2 }}>
          {['📈 NSE/BSE','🤖 ML Signals','𝕏 Sentiment'].map(t=>
            <span key={t} style={{ fontSize:10, color:T.dim, padding:'3px 8px', borderRadius:10,
              background:T.surf, border:`1px solid ${T.bdr}` }}>{t}</span>)}
        </div>
        <button style={{ width:'100%', height:50, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.bluL})`,
          border:'none', color:'#fff', fontSize:15, fontWeight:700,
          boxShadow:`0 6px 22px rgba(23,64,245,0.42)` }}>
          Portfolio Tracker →
        </button>
        <button style={{ width:'100%', height:50, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.org},${ACC.orgL})`,
          border:'none', color:'#fff', fontSize:15, fontWeight:700,
          boxShadow:`0 6px 22px rgba(255,92,26,0.38)` }}>
          ⚙️ Algo Builder →
        </button>
        <button style={{ width:'100%', height:43, borderRadius:14,
          background:dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)',
          border:`1px solid ${T.bdr}`, color:T.txt, fontSize:14, fontWeight:600 }}>
          Sign In
        </button>
      </div>
    </div>
  );
}

/* ── S2: Sign Up ──────────────────────────────────────────── */
function S2_SignUp() {
  const { T, ACC } = useTheme();
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, padding:'22px 20px 26px',
      display:'flex', flexDirection:'column', gap:12 }}>
      <div>
        <div style={{ fontSize:26, fontWeight:800, color:T.txt }}>Create Account</div>
        <div style={{ fontSize:13, color:T.dim, marginTop:4 }}>Join India's smartest algo traders</div>
      </div>
      <div style={{ display:'flex', gap:9 }}>
        {[{i:'𝕏',l:'Twitter'},{i:'G',l:'Google'}].map(s=>
          <button key={s.l} style={{ flex:1, height:44, borderRadius:12,
            background:T.surf, border:`1px solid ${T.bdr}`,
            color:T.txt, fontSize:13, fontWeight:600,
            display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <span style={{ fontWeight:800 }}>{s.i}</span> {s.l}
          </button>)}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:1, background:T.bdr }}/>
        <span style={{ fontSize:11, color:T.dim }}>or email</span>
        <div style={{ flex:1, height:1, background:T.bdr }}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {[{l:'Full Name',v:'Vaasudev Amitav'},{l:'Email / Mobile',v:'vaasudev@signal.in'},{l:'Password',v:'••••••••••'}].map(f=>
          <div key={f.l}>
            <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:5 }}>
              {f.l.toUpperCase()}
            </div>
            <div style={{ height:46, borderRadius:12, background:T.surf,
              border:`1px solid ${f.l==='Email / Mobile'?ACC.blu:T.bdr}`,
              display:'flex', alignItems:'center', padding:'0 13px', fontSize:14, color:T.txt }}>{f.v}</div>
          </div>)}
      </div>
      <div>
        <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:7 }}>TRADING EXPERIENCE</div>
        <div style={{ display:'flex', gap:7 }}>
          {['Beginner','Intermediate','Pro'].map((r,i)=>
            <div key={r} style={{ flex:1, height:36, borderRadius:10,
              background:i===1?`${ACC.blu}20`:T.surf2,
              border:`1px solid ${i===1?ACC.blu:T.bdr}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:i===1?ACC.bluL:T.dim, fontSize:11, fontWeight:600 }}>{r}</div>)}
        </div>
      </div>
      <div style={{ marginTop:'auto' }}>
        <button style={{ width:'100%', height:52, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.org})`,
          border:'none', color:'#fff', fontSize:16, fontWeight:700,
          boxShadow:`0 6px 22px rgba(23,64,245,0.35)` }}>Create Account →</button>
        <p style={{ textAlign:'center', fontSize:13, color:T.dim, marginTop:12 }}>
          Already a member? <span style={{ color:ACC.bluL, fontWeight:600 }}>Sign In</span>
        </p>
      </div>
    </div>
  );
}

/* ── S3: Verify OTP ───────────────────────────────────────── */
function S3_Verify() {
  const { T, ACC } = useTheme();
  const digits = ['4','7','2','','',''];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg,
      padding:'44px 24px 40px', display:'flex', flexDirection:'column', alignItems:'center', gap:22 }}>
      <div style={{ width:74, height:74, borderRadius:22, background:`${ACC.blu}10`,
        border:`1px solid ${T.bdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="3" y="8" width="30" height="20" rx="5" stroke={ACC.bluL} strokeWidth="2"/>
          <path d="M3 13 L18 22 L33 13" stroke={ACC.bluL} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="27" cy="27" r="7.5" fill={T.bg} stroke={ACC.org} strokeWidth="2"/>
          <path d="M24.5 27 L27 29.5 L30.5 25" stroke={ACC.org} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:23, fontWeight:800, color:T.txt }}>Verify your email</div>
        <div style={{ fontSize:13.5, color:T.dim, marginTop:8, lineHeight:1.55 }}>
          OTP sent to<br/><span style={{ color:T.txt, fontWeight:600 }}>vaasudev@signal.in</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:9 }}>
        {digits.map((v,i)=>
          <div key={i} style={{ width:46, height:56, borderRadius:13,
            background:v?`${ACC.blu}12`:T.surf,
            border:`2px solid ${v?ACC.blu:i===3?ACC.org:T.bdr}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, fontWeight:700, color:v?T.txt:ACC.org }}>
            {v||(i===3?'|':'')}
          </div>)}
      </div>
      <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
        <button style={{ width:'100%', height:52, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.bluL})`,
          border:'none', color:'#fff', fontSize:16, fontWeight:700, opacity:0.5 }}>Verify &amp; Continue</button>
        <div style={{ textAlign:'center', fontSize:13, color:T.dim }}>
          Resend OTP in <span style={{ color:T.txt, fontWeight:600 }}>0:52</span>
        </div>
      </div>
      <div style={{ width:'100%', padding:'11px 13px', borderRadius:13,
        background:`${ACC.grn}0C`, border:`1px solid ${ACC.grn}30`,
        display:'flex', gap:9, alignItems:'flex-start' }}>
        <span style={{ fontSize:15, flexShrink:0 }}>🔒</span>
        <span style={{ fontSize:11.5, color:ACC.grn, lineHeight:1.45 }}>
          2FA secured. SEBI-compliant data handling. Never share your OTP.
        </span>
      </div>
    </div>
  );
}

/* ── S4: Broker Connect ───────────────────────────────────── */
function S4_BrokerConnect() {
  const { T, ACC } = useTheme();
  const brokers = [
    { n:'Zerodha Kite',    ab:'ZE', color:'#387ED1', tag:'Popular' },
    { n:'mStock',          ab:'MS', color:'#E63946', tag:'Your Broker' },
    { n:'HDFC Securities', ab:'HD', color:'#004C8F', tag:null },
    { n:'Groww',           ab:'GR', color:'#00D09C', tag:null },
    { n:'Upstox',          ab:'UP', color:'#7B2FBE', tag:null },
    { n:'Angel One',       ab:'AO', color:'#E87722', tag:null },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, padding:'20px 18px 24px',
      display:'flex', flexDirection:'column', gap:12 }}>
      <div>
        <div style={{ fontSize:24, fontWeight:800, color:T.txt }}>Connect Broker</div>
        <div style={{ fontSize:13, color:T.dim, marginTop:4 }}>Link your demat for live portfolio sync.</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {brokers.map((b,i)=>(
          <div key={b.n} style={{ padding:'10px 13px', borderRadius:14,
            background:i===1?`${ACC.blu}0C`:T.surf,
            border:`1px solid ${i===1?ACC.blu:T.bdr}`,
            display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
              background:`${b.color}20`, border:`1px solid ${b.color}40`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:900, color:b.color }}>{b.ab}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                <span style={{ fontSize:14, fontWeight:700, color:T.txt }}>{b.n}</span>
                {b.tag && <Tag label={b.tag} color={b.tag==='Your Broker'?ACC.org:ACC.grn}/>}
              </div>
              <div style={{ fontSize:11, color:T.dim, marginTop:1 }}>API connect · Instant sync</div>
            </div>
            <span style={{ fontSize:18, color:T.dim }}>›</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, height:1, background:T.bdr }}/>
        <span style={{ fontSize:11, color:T.dim }}>or import manually</span>
        <div style={{ flex:1, height:1, background:T.bdr }}/>
      </div>
      <button style={{ width:'100%', height:50, borderRadius:14,
        background:`${ACC.org}14`, border:`1px solid ${ACC.org}44`,
        color:ACC.orgL, fontSize:15, fontWeight:700,
        display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}>
        <span style={{ fontSize:18 }}>📊</span> Upload Excel Portfolio
      </button>
    </div>
  );
}

/* ── S5: Excel Upload ─────────────────────────────────────── */
function S5_ExcelUpload() {
  const { T, ACC } = useTheme();
  const cols = ['Stock Name','Symbol','Qty','Avg Cost ₹','Exchange'];
  const rows = [
    ['Reliance Industries','RELIANCE','50','2,840','NSE'],
    ['HDFC Bank','HDFCBANK','30','1,610','NSE'],
    ['Infosys Ltd','INFY','45','1,420','NSE'],
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg, padding:'20px 18px 24px',
      display:'flex', flexDirection:'column', gap:13 }}>
      <div>
        <div style={{ fontSize:24, fontWeight:800, color:T.txt }}>Upload Portfolio</div>
        <div style={{ fontSize:13, color:T.dim, marginTop:4 }}>Upload your holdings as .xlsx or .csv</div>
      </div>
      <div style={{ padding:'20px 16px', borderRadius:16,
        background:`${ACC.blu}08`, border:`2px dashed ${ACC.blu}55`,
        display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:`${ACC.blu}14`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M13 3 L13 17 M7 9 L13 3 L19 9" stroke={ACC.bluL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 19 L4 22 Q4 23 5 23 L21 23 Q22 23 22 22 L22 19" stroke={ACC.bluL} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.txt }}>Tap to upload .xlsx / .csv</div>
          <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>NSE / BSE symbol format supported</div>
        </div>
        <button style={{ padding:'8px 22px', borderRadius:10,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.bluL})`,
          border:'none', color:'#fff', fontSize:13, fontWeight:700 }}>Choose File</button>
      </div>
      <div style={{ padding:'10px 13px', borderRadius:13, background:T.surf,
        border:`1px solid ${T.bdr}`, display:'flex', alignItems:'center', gap:11 }}>
        <span style={{ fontSize:22 }}>📋</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.txt }}>Download Template</div>
          <div style={{ fontSize:11, color:T.dim }}>Pre-formatted Excel with examples</div>
        </div>
        <div style={{ padding:'6px 11px', borderRadius:8, background:`${ACC.org}18`,
          border:`1px solid ${ACC.org}44`, fontSize:11.5, fontWeight:700, color:ACC.orgL }}>↓ .xlsx</div>
      </div>
      <div>
        <div style={{ fontSize:10.5, color:T.dim, fontWeight:700, letterSpacing:0.5, marginBottom:7 }}>TEMPLATE PREVIEW</div>
        <div style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${T.bdr}` }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 0.6fr 1fr 0.8fr',
            background:T.surf2, padding:'7px 11px', gap:4 }}>
            {cols.map(c=><span key={c} style={{ fontSize:9.5, fontWeight:700, color:T.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c}</span>)}
          </div>
          {rows.map((r,ri)=>(
            <div key={ri} style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 0.6fr 1fr 0.8fr',
              padding:'7px 11px', gap:4, background:ri%2===0?T.surf:T.bg, borderTop:`1px solid ${T.bdr}` }}>
              {r.map((cell,ci)=>
                <span key={ci} style={{ fontSize:10.5, color:ci===0?T.txt:T.dim,
                  fontWeight:ci===1?700:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {cell}
                </span>)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop:'auto' }}>
        <button style={{ width:'100%', height:52, borderRadius:14,
          background:`linear-gradient(135deg,${ACC.blu},${ACC.org})`,
          border:'none', color:'#fff', fontSize:16, fontWeight:700,
          boxShadow:`0 6px 22px rgba(23,64,245,0.3)` }}>Analyse Portfolio →</button>
      </div>
    </div>
  );
}

/* ── S6: ML Analyzing ─────────────────────────────────────── */
function S6_Analyzing() {
  const { T, ACC, dark } = useTheme();
  const steps = [
    { label:'Parsing portfolio data',          done:true },
    { label:'Fetching NSE/BSE price history',  done:true },
    { label:'Running momentum model',          done:true },
    { label:'Analysing 𝕏 Twitter sentiment',  active:true },
    { label:'Generating swing trade signals',  pending:true },
    { label:'Computing risk scores',           pending:true },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:T.bg,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'space-between', padding:'44px 24px 40px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)',
        width:260, height:260, borderRadius:'50%',
        background:`radial-gradient(circle,rgba(23,64,245,${dark?.14:.07}) 0%,transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, zIndex:1 }}>
        <div style={{ position:'relative', width:86, height:86 }}>
          <svg width="86" height="86" viewBox="0 0 86 86" style={{ position:'absolute', top:0, left:0 }}>
            <circle cx="43" cy="43" r="37" stroke={T.surf2} strokeWidth="5" fill="none"/>
            <circle cx="43" cy="43" r="37" stroke={ACC.blu} strokeWidth="5" fill="none"
              strokeDasharray="175 58" strokeLinecap="round" transform="rotate(-90 43 43)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🤖</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:T.txt }}>ML Engine Running</div>
          <div style={{ fontSize:13, color:T.dim, marginTop:4 }}>Analysing 18 stocks…</div>
        </div>
      </div>
      <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8, zIndex:1 }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'9px 12px', borderRadius:12,
            background:s.active?`${ACC.blu}0E`:'transparent',
            border:`1px solid ${s.active?ACC.blu:'transparent'}` }}>
            <div style={{ width:20, height:20, borderRadius:10, flexShrink:0,
              background:s.done?`${ACC.grn}20`:s.active?`${ACC.org}20`:T.surf2,
              border:`1.5px solid ${s.done?ACC.grn:s.active?ACC.org:T.bdr}`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {s.done
                ? <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5L4.5 7.5L8 3" stroke={ACC.grn} strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>
                : s.active ? <div style={{ width:6, height:6, borderRadius:3, background:ACC.org }}/> : null}
            </div>
            <span style={{ fontSize:13, color:s.done?T.dim:s.active?T.txt:T.dim, fontWeight:s.active?700:400 }}>{s.label}</span>
            {s.active && <span style={{ marginLeft:'auto', fontSize:11, color:ACC.org, fontWeight:700 }}>…</span>}
          </div>
        ))}
      </div>
      <div style={{ width:'100%', zIndex:1 }}>
        <div style={{ fontSize:11, color:T.dim, textAlign:'center', marginBottom:7 }}>68% complete</div>
        <PBar val={68} color={`linear-gradient(90deg,${ACC.blu},${ACC.org})`} h={7}/>
      </div>
    </div>
  );
}

Object.assign(window, { S1_Welcome, S2_SignUp, S3_Verify, S4_BrokerConnect, S5_ExcelUpload, S6_Analyzing });
