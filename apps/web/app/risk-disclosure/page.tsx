import type { Metadata } from 'next';
import { PublicNav } from '@/components/PublicNav';
import { RiskDisclosureContent } from '@/components/RiskDisclosureContent';

export const metadata: Metadata = {
  title: 'Risk Disclosure | SignalGenie',
  description: 'Important risk disclosures for SignalGenie — algorithmic scan results, not SEBI-registered investment advice. Read before using the platform.',
  alternates: { canonical: '/risk-disclosure' },
};

export default function RiskDisclosurePage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--txt)', fontFamily: 'Inter,system-ui,sans-serif', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        <RiskDisclosureContent />
      </main>
    </div>
  );
}
