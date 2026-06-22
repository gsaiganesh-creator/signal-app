'use client';
import { useState, useRef, useEffect } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

export function PortfolioSwitcher() {
  const { portfolios, activePortfolio, setActiveId, createPortfolio } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  if (portfolios.length === 0) return null;

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    await createPortfolio(name);
    setNewName('');
    setCreating(false);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ height:32, padding:'0 12px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
        📂 {activePortfolio?.name ?? 'Portfolio'}
        <span style={{ fontSize:8, opacity:0.5 }}>▼</span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:200, background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.25)', zIndex:300, overflow:'hidden' }}>
          {portfolios.map(p => (
            <button key={p.id} onClick={() => { setActiveId(p.id); setOpen(false); }}
              style={{ width:'100%', padding:'10px 14px', background: p.id === activePortfolio?.id ? 'rgba(23,64,245,0.08)' : 'transparent', border:'none', borderBottom:'1px solid var(--bdr)', color: p.id === activePortfolio?.id ? 'var(--bluL)' : 'var(--txt)', fontSize:12, fontWeight: p.id === activePortfolio?.id ? 700 : 500, cursor:'pointer', textAlign:'left', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
              {p.id === activePortfolio?.id && <span style={{ color:'var(--grn)', fontSize:10 }}>✓</span>}
              {p.name}
            </button>
          ))}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--bdr)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>New Portfolio</div>
            <input placeholder="Portfolio name…" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ width:'100%', height:30, borderRadius:6, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', outline:'none', marginBottom:6 }}/>
            <button onClick={handleCreate} disabled={!newName.trim() || creating}
              style={{ width:'100%', height:28, borderRadius:6, background:'var(--blu)', border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: (!newName.trim() || creating) ? 0.5 : 1 }}>
              {creating ? 'Creating…' : '+ Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
