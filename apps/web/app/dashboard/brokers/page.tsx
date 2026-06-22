'use client';
import { useState } from 'react';

const BROKERS = [
  { id:'mstock',  name:'MStock',    sub:'Mirae Asset · Zero brokerage',       logo:'🟦', color:'#0055A5', soon:false },
  { id:'zerodha', name:'Zerodha',   sub:'Kite · India\'s largest broker',     logo:'🟩', color:'#387ED1', soon:true  },
  { id:'upstox',  name:'Upstox',    sub:'Pro · Ratan Tata backed',            logo:'🟪', color:'#6600CC', soon:true  },
  { id:'angel',   name:'Angel One', sub:'SmartAPI · Full suite',              logo:'🟧', color:'#E8552A', soon:true  },
];

export default function BrokersPage() {
  const [sel, setSel] = useState<string|null>(null);

  return (
    <>
      {/* Hero card */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.07),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.15)', borderRadius:20, padding:'32px 40px', marginBottom:28, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div style={{ maxWidth:560 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:10 }}>Broker Connect</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1.2, marginBottom:12 }}>
            One click from signal<br/>
            <span style={{ color:'var(--grn)' }}>to live trade.</span>
          </div>
          <div style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, marginBottom:20 }}>
            Connect your broker account and SIGNAL will auto-sync your holdings, show live P&L, and let you act on signals directly — without switching tabs. Tokens are AES-256 encrypted and never stored in plaintext.
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <div style={{ padding:'6px 14px', borderRadius:8, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.25)', fontSize:12, fontWeight:700, color:'var(--grn)' }}>🔒 AES-256 Encrypted</div>
            <div style={{ padding:'6px 14px', borderRadius:8, background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.25)', fontSize:12, fontWeight:700, color:'var(--ylw)' }}>⚠️ Read-only by default</div>
          </div>
        </div>
        <div style={{ fontSize:80, opacity:0.12, flexShrink:0 }}>🔗</div>
      </div>

      {/* Broker cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:28 }}>
        {BROKERS.map(b => (
          <div key={b.id} onClick={() => !b.soon && setSel(b.id)}
            style={{ background: sel===b.id ? 'rgba(23,64,245,0.06)' : 'var(--surf)', border:`1px solid ${sel===b.id ? 'var(--bluL)' : 'var(--bdr)'}`, borderRadius:16, padding:'20px 22px', cursor: b.soon ? 'default' : 'pointer', opacity: b.soon ? 0.6 : 1, position:'relative', transition:'border-color 0.15s' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{b.logo}</div>
            <div style={{ fontSize:15, fontWeight:800 }}>{b.name}</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>{b.sub}</div>
            {b.soon && (
              <div style={{ position:'absolute', top:14, right:14, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:'rgba(255,184,0,0.12)', border:'1px solid rgba(255,184,0,0.3)', color:'var(--ylw)' }}>Soon</div>
            )}
            {!b.soon && (
              <button style={{ marginTop:14, width:'100%', height:34, borderRadius:8, background: sel===b.id ? 'var(--blu)' : 'rgba(23,64,245,0.1)', border:`1px solid ${sel===b.id ? 'transparent' : 'rgba(23,64,245,0.2)'}`, color: sel===b.id ? '#fff' : 'var(--bluL)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {sel===b.id ? '✓ Selected' : 'Connect'}
              </button>
            )}
          </div>
        ))}
      </div>

      {sel && (
        <div style={{ background:'rgba(23,64,245,0.05)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:14, padding:'20px 24px' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>⚠️ Integration coming soon</div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
            MStock API integration is in progress. You&apos;ll receive an in-app notification when it goes live. Your broker credentials are never required — OAuth tokens only.
          </div>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:20 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Broker integration is for portfolio sync and execution convenience only · Not financial advice · DYOR
      </div>
    </>
  );
}
