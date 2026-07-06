import Link from 'next/link';
import { SupportContent } from '@/components/SupportContent';

export default function SupportPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--txt)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid var(--bdr)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: 'var(--dim)', textDecoration: 'none', fontSize: 13 }}>← Back to app</Link>
        <span style={{ color: 'var(--bdr)' }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Support</span>
      </div>

      <div style={{ padding: '48px 24px 100px' }}>
        <SupportContent />
      </div>
    </div>
  );
}
