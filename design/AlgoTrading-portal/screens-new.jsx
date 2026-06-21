/* ── P_MultiPortfolio : Multi-demat upload + consolidated view ── */
function P_MultiPortfolio() {
  const {T,A}=useTheme(); const {navigate,goBack}=useNav(); const tk=useTk();
  const [view,setView]=React.useState('individual');

  const accounts=[
    {id:'kite',n:'Zerodha Kite',ab:'ZE',c:'#387ED1',val:'₹4,21,840',chg:'+₹8,240',pct:'+2.0%',cnt:12,pl:'+₹34,240',status:'synced',synced:'2m ago'},
    {id:'hdfc',n:'HDFC Securities',ab:'HD',c:'#004C8F',val:'₹2,84,160',chg:'+₹3,120',pct:'+1.1%',cnt:8,pl:'+₹18,600',status:'uploaded',synced:'Manually uploaded'},
    {id:'mstock',n:'MStock',ab:'MS',c:'#E63946',val:'₹1,36,316',chg:'+₹1,482',pct:'+1.1%',cnt:6,pl:'+₹12,840',status:'synced',synced:'5m ago'},
  ];

  const combined=[
    {sym:'RELIANCE',name:'Reliance Ind.',qty:50,avg:'₹2,840',curr:'₹2,912',pl:'+₹3,600',pct:'+2.5%',accts:['ZE','HD'],up:true},
    {sym:'HDFCBANK',name:'HDFC Bank',qty:45,avg:'₹1,580',curr:'₹1,634',pl:'+₹2,430',pct:'+3.4%',accts:['ZE','MS'],up:true},
    {sym:'INFY',name:'Infosys',qty:65,avg:'₹1,380',curr:'₹1,441',pl:'+₹3,965',pct:'+4.4%',accts:['HD','ZE'],up:true},
    {sym:'TCS',name:'TCS',qty:20,avg:'₹3,820',curr:'₹3,960',pl:'+₹2,800',pct:'+3.7%',accts:['MS'],up:true},
    {sym:'SBIN',name:'State Bank of India',qty:80,avg:'₹785',curr:'₹812',pl:'+₹2,160',pct:'+3.4%',accts:['ZE','HD','MS'],up:true},
    {sym:'ZOMATO',name:'Zomato Ltd',qty:200,avg:'₹220',curr:'₹198',pl:'-₹4,400',pct:'-10.0%',accts:['HD'],up:false},
    {sym:'WIPRO',name:'Wipro Ltd',qty:30,avg:'₹512',curr:'₹490',pl:'-₹660',pct:'-4.3%',accts:['MS'],up:false},
  ];

  return (
    <div style={{width:'100%',height:'100%',background:T.bg,display:'flex',flexDirection:'column',paddingBottom:52+SAFE_BOT}}>
      <NavBar title="My Portfolios"/>

      {/* Combined summary card */}
      <div style={{margin:'0 14px 10px',padding:'13px 15px',borderRadius:16,background:T.cg,border:`1px solid ${T.bdr}`,position:'relative',overflow:'hidden',flexShrink:0}}>
        <div style={{position:'absolute',top:-24,right:-24,width:90,height:90,borderRadius:'50%',background:`radial-gradient(circle,${tk.blu}30 0%,transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{fontSize:10,color:T.dim,fontWeight:700,letterSpacing:0.5}}>COMBINED VALUE · 3 ACCOUNTS · 26 STOCKS</div>
        <div style={{fontSize:26,fontWeight:900,color:T.txt,margin:'3px 0',letterSpacing:-1}}>₹8,42,316</div>
        <div style={{fontSize:12,color:tk.grn,fontWeight:700,marginBottom:8}}>▲ +₹12,842 (+1.55%) Today</div>
        <div style={{display:'flex',gap:14}}>
          {[['Invested','₹7,21,480'],['Total P&L','+₹65,680'],['XIRR','16.7%']].map(([k,v])=>(
            <div key={k}>
              <div style={{fontSize:9.5,color:T.dim}}>{k}</div>
              <div style={{fontSize:11.5,fontWeight:700,color:T.txt}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,marginTop:9}}>
          {accounts.map(a=>(
            <div key={a.id} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:7,height:7,borderRadius:2,background:a.c}}/>
              <span style={{fontSize:9.5,color:T.dim}}>{a.ab}</span>
              <span style={{fontSize:9.5,color:T.txt,fontWeight:600}}>{a.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div style={{padding:'0 14px 9px',flexShrink:0}}>
        <div style={{display:'flex',background:T.surf2,borderRadius:12,padding:3,gap:2}}>
          {['Individual','Combined'].map((v)=>(
            <div key={v} onClick={()=>setView(v.toLowerCase())}
              style={{flex:1,textAlign:'center',padding:'8px 0',borderRadius:9,
                background:view===v.toLowerCase()?tk.blu:'transparent',
                color:view===v.toLowerCase()?'#fff':T.dim,fontWeight:700,fontSize:13,cursor:'pointer'}}>{v}</div>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 14px 8px',display:'flex',flexDirection:'column',gap:9}}>
        {view==='individual' ? (
          <>
            {accounts.map(acc=>(
              <div key={acc.id} style={{padding:'13px 14px',borderRadius:15,background:T.surf,border:`1px solid ${T.bdr}`}}>
                <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:10}}>
                  <div style={{width:44,height:44,borderRadius:13,background:`${acc.c}20`,border:`1px solid ${acc.c}40`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:acc.c,flexShrink:0}}>{acc.ab}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.txt}}>{acc.n}</div>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
                      <div style={{width:6,height:6,borderRadius:3,background:acc.status==='synced'?tk.grn:A.ylw}}/>
                      <span style={{fontSize:10,color:T.dim}}>{acc.status==='synced'?'Live sync':'Manual upload'} · {acc.synced}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:15,fontWeight:800,color:T.txt}}>{acc.val}</div>
                    <div style={{fontSize:11,color:tk.grn,fontWeight:700}}>{acc.chg}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:7,marginBottom:9}}>
                  {[['Stocks',acc.cnt],['P&L',acc.pl],['Return',acc.pct]].map(([k,v])=>(
                    <div key={k} style={{flex:1,padding:'7px 8px',borderRadius:9,background:T.surf2,textAlign:'center'}}>
                      <div style={{fontSize:9.5,color:T.dim}}>{k}</div>
                      <div style={{fontSize:12,fontWeight:700,color:T.txt,marginTop:1}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:7}}>
                  <button style={{flex:1,height:34,borderRadius:9,background:`${tk.blu}14`,border:`1px solid ${tk.blu}44`,color:tk.blu,fontSize:12,fontWeight:700}}>View Holdings</button>
                  <button style={{flex:1,height:34,borderRadius:9,background:T.surf2,border:`1px solid ${T.bdr}`,color:T.dim,fontSize:12,fontWeight:700}}>{acc.status==='synced'?'Re-sync':'Upload'}</button>
                </div>
              </div>
            ))}
            <button onClick={()=>navigate('broker')} style={{width:'100%',height:46,borderRadius:13,background:`${tk.org}10`,border:`2px dashed ${tk.org}44`,color:tk.org,fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <span style={{fontSize:18,lineHeight:1}}>+</span> Add Another Account
            </button>
          </>
        ) : (
          <>
            <div style={{padding:'9px 12px',borderRadius:11,background:`${tk.grn}09`,border:`1px solid ${tk.grn}22`}}>
              <div style={{fontSize:11,color:T.dim,lineHeight:1.5}}>
                <span style={{color:T.txt,fontWeight:700}}>26 unique positions</span> across 3 accounts · Overlaps consolidated · Avg cost recalculated
              </div>
            </div>
            {/* Table header */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 1fr',padding:'0 4px',gap:4}}>
              {['Stock','Accounts','P&L'].map(h=><span key={h} style={{fontSize:10,color:T.dim,fontWeight:700}}>{h}</span>)}
            </div>
            {combined.map((s)=>(
              <div key={s.sym} style={{padding:'10px 13px',borderRadius:13,background:T.surf,border:`1px solid ${s.up?tk.grn+'20':A.red+'20'}`,display:'flex',gap:11,alignItems:'center'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:T.txt}}>{s.sym}</div>
                  <div style={{fontSize:10.5,color:T.dim,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name} · ×{s.qty}</div>
                  <div style={{display:'flex',gap:6,marginTop:3}}>
                    <span style={{fontSize:9.5,color:T.dim}}>Avg {s.avg}</span>
                    <span style={{fontSize:9.5,color:T.dim}}>CMP {s.curr}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:3,flexShrink:0}}>
                  {s.accts.map(a=>{
                    const ac=accounts.find(x=>x.ab===a);
                    return <span key={a} style={{fontSize:8.5,fontWeight:800,padding:'2px 5px',borderRadius:4,background:ac?`${ac.c}20`:'transparent',color:ac?ac.c:T.dim,border:`1px solid ${ac?ac.c+'40':T.bdr}`}}>{a}</span>;
                  })}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:s.up?tk.grn:A.red}}>{s.pl}</div>
                  <div style={{fontSize:10.5,color:s.up?tk.grn:A.red}}>{s.pct}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── P_TopInvestors : Ace Investor Public Portfolios ─────── */
function P_TopInvestors() {
  const {T,A}=useTheme(); const {navigate}=useNav(); const tk=useTk();

  const investors=[
    {id:'ashish',initials:'AK',color:A.pur,name:'Ashish Kacholia',tag:'Small-cap Hunter',
     desc:'Quality small & mid-cap growth investor, Mumbai',stocks:36,val:'~₹2,800Cr',cagr:'+34%',top:'Neuland Labs'},
    {id:'dolly',initials:'DK',color:'#E87722',name:'Dolly Khanna',tag:'Mid-cap Queen',
     desc:'Chennai-based, discovered multi-baggers early',stocks:30,val:'~₹1,200Cr',cagr:'+28%',top:'Fiem Industries'},
    {id:'vijay',initials:'VK',color:tk.grn,name:'Vijay Kedia',tag:'QGLP Investor',
     desc:'Quality, Growth, Longevity, Price framework',stocks:12,val:'~₹950Cr',cagr:'+31%',top:'Atul Auto'},
    {id:'porinju',initials:'PV',color:'#E63946',name:'Porinju Veliyath',tag:'Contrarian',
     desc:'Contrarian value investor, micro-cap specialist',stocks:22,val:'~₹480Cr',cagr:'+22%',top:'Genesys Intl'},
    {id:'radhakishan',initials:'RD',color:tk.blu,name:'Radhakishan Damani',tag:'Value Legend',
     desc:'Founder of DMart, long-term quality compounder',stocks:8,val:'~₹4,200Cr',cagr:'+41%',top:'VST Industries'},
  ];

  return (
    <div style={{width:'100%',height:'100%',background:T.bg,display:'flex',flexDirection:'column',paddingBottom:52+SAFE_BOT}}>
      <NavBar title="Ace Investors"/>

      <div style={{padding:'0 14px 8px',flexShrink:0}}>
        <div style={{padding:'8px 12px',borderRadius:11,background:`${A.ylw}09`,border:`1px solid ${A.ylw}28`}}>
          <div style={{fontSize:10.5,color:T.dim,lineHeight:1.55}}>
            📋 Based on <span style={{color:T.txt,fontWeight:600}}>BSE/NSE public shareholding disclosures</span> (≥1% stake only). Typically one quarter old. For reference only.
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 14px 8px',display:'flex',flexDirection:'column',gap:10}}>
        {investors.map(inv=>(
          <div key={inv.id} onClick={()=>navigate('investor-detail')}
            style={{padding:'13px 14px',borderRadius:16,background:T.surf,border:`1px solid ${T.bdr}`,cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
              <div style={{width:46,height:46,borderRadius:14,background:`${inv.color}20`,border:`1px solid ${inv.color}44`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:inv.color,flexShrink:0}}>
                {inv.initials}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',rowGap:3}}>
                  <span style={{fontSize:14,fontWeight:800,color:T.txt}}>{inv.name}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:5,background:`${inv.color}18`,color:inv.color}}>{inv.tag}</span>
                </div>
                <div style={{fontSize:11,color:T.dim,marginTop:2}}>{inv.desc}</div>
              </div>
              <span style={{fontSize:18,color:T.dim,flexShrink:0}}>›</span>
            </div>
            <div style={{display:'flex',gap:7,marginBottom:8}}>
              {[['Stocks',inv.stocks],['Portfolio',inv.val],['Est. CAGR',inv.cagr]].map(([k,v])=>(
                <div key={k} style={{flex:1,padding:'7px 8px',borderRadius:9,background:T.surf2,textAlign:'center'}}>
                  <div style={{fontSize:9.5,color:T.dim}}>{k}</div>
                  <div style={{fontSize:11.5,fontWeight:700,color:T.txt,marginTop:1}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10.5,color:T.dim}}>Top holding:</span>
              <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:5,background:`${inv.color}14`,color:inv.color}}>{inv.top}</span>
            </div>
          </div>
        ))}

        <div style={{padding:'9px 12px',borderRadius:11,background:T.surf,border:`1px solid ${T.bdr}`}}>
          <div style={{fontSize:10,color:T.dim,lineHeight:1.55,textAlign:'center'}}>
            ⚠️ <span style={{fontWeight:600,color:T.txt}}>Not investment advice.</span> SIGNAL is not SEBI registered. Study these portfolios for learning only. Always do your own research (DYOR).
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── P_InvestorDetail : Individual investor holdings ──────── */
function P_InvestorDetail() {
  const {T,A}=useTheme(); const {goBack}=useNav(); const tk=useTk();

  const holdings=[
    {sym:'NEULAND',name:'Neuland Laboratories',stake:'2.4%',val:'₹180Cr',sector:'Pharma',chg:'+42%',up:true},
    {sym:'EPIGRAL',name:'Epigral Ltd',stake:'3.1%',val:'₹142Cr',sector:'Chemicals',chg:'+28%',up:true},
    {sym:'HERANBA',name:'Heranba Industries',stake:'4.2%',val:'₹98Cr',sector:'Agrochem',chg:'+18%',up:true},
    {sym:'FINEORG',name:'Fine Organics',stake:'1.8%',val:'₹188Cr',sector:'Chemicals',chg:'+15%',up:true},
    {sym:'TATTECH',name:'Tata Technologies',stake:'1.2%',val:'₹210Cr',sector:'IT',chg:'-4%',up:false},
    {sym:'SKIPPER',name:'Skipper Ltd',stake:'5.3%',val:'₹84Cr',sector:'Infra',chg:'+61%',up:true},
    {sym:'PARAS',name:'Paras Defence',stake:'2.7%',val:'₹76Cr',sector:'Defence',chg:'+35%',up:true},
    {sym:'BOROLTD',name:'Borosil Ltd',stake:'1.5%',val:'₹62Cr',sector:'Consumer',chg:'+12%',up:true},
  ];

  return (
    <div style={{width:'100%',height:'100%',background:T.bg,display:'flex',flexDirection:'column',paddingBottom:52+SAFE_BOT}}>
      <NavBar title="Ashish Kacholia" back={true}/>

      <div style={{flex:1,overflowY:'auto',padding:'0 14px 10px',display:'flex',flexDirection:'column',gap:9}}>
        {/* Investor bio card */}
        <div style={{padding:'14px',borderRadius:15,background:T.cg,border:`1px solid ${T.bdr}`}}>
          <div style={{display:'flex',alignItems:'center',gap:13,marginBottom:12}}>
            <div style={{width:54,height:54,borderRadius:16,background:`${A.pur}20`,border:`1px solid ${A.pur}44`,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:A.pur,flexShrink:0}}>AK</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:T.txt}}>Ashish Kacholia</div>
              <div style={{fontSize:11,color:T.dim,marginTop:2}}>Small-cap specialist · Mumbai</div>
              <div style={{fontSize:10.5,color:A.pur,marginTop:3,fontWeight:600}}>36 known holdings · ~₹2,800Cr estimated</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7}}>
            {[['Focus','Small/Mid',''],['Est. CAGR','+34%',tk.grn],['Holdings','36',''],['Style','Growth',''],['Horizon','3–5 Years',''],['Last Filed','Mar 2025','']].map(([k,v,c])=>(
              <div key={k} style={{padding:'7px 8px',borderRadius:9,background:T.surf2,textAlign:'center'}}>
                <div style={{fontSize:9,color:T.dim}}>{k}</div>
                <div style={{fontSize:11.5,fontWeight:700,color:c||T.txt,marginTop:1}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Source note */}
        <div style={{padding:'8px 12px',borderRadius:10,background:`${A.ylw}09`,border:`1px solid ${A.ylw}28`}}>
          <div style={{fontSize:10,color:T.dim,lineHeight:1.55}}>
            📋 From BSE/NSE shareholding disclosures. Only stakes ≥1% are disclosed publicly.
            <span style={{color:A.ylw,fontWeight:600}}> Data as of: Mar 2025 (Q4 FY25)</span>
          </div>
        </div>

        <div style={{fontSize:11,color:T.dim,fontWeight:700,letterSpacing:0.5,paddingLeft:2}}>KNOWN HOLDINGS</div>

        {holdings.map((h)=>(
          <div key={h.sym} style={{padding:'10px 13px',borderRadius:13,background:T.surf,border:`1px solid ${T.bdr}`,display:'flex',gap:11,alignItems:'center'}}>
            <div style={{width:40,height:40,borderRadius:11,background:`${A.pur}18`,border:`1px solid ${A.pur}30`,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:A.pur,flexShrink:0}}>
              {h.sym.slice(0,5)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:T.txt}}>{h.sym}</div>
              <div style={{fontSize:10.5,color:T.dim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.name}</div>
              <div style={{display:'flex',gap:7,marginTop:2,alignItems:'center'}}>
                <span style={{fontSize:10,color:T.dim}}>Stake: <span style={{color:T.txt,fontWeight:600}}>{h.stake}</span></span>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:T.surf2,color:T.dim}}>{h.sector}</span>
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:700,color:T.txt}}>{h.val}</div>
              <div style={{fontSize:11,fontWeight:700,color:h.up?tk.grn:A.red}}>{h.chg}</div>
            </div>
          </div>
        ))}

        <div style={{padding:'9px 12px',borderRadius:11,background:T.surf,border:`1px solid ${T.bdr}`}}>
          <div style={{fontSize:10,color:T.dim,lineHeight:1.55,textAlign:'center'}}>
            ⚠️ <span style={{fontWeight:600,color:T.txt}}>Not investment advice.</span> SIGNAL is not SEBI registered. Study investor portfolios for learning only. Always do your own research (DYOR).
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { P_MultiPortfolio, P_TopInvestors, P_InvestorDetail });
