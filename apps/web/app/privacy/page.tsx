'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  const updated = 'June 29, 2026';
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--txt)', fontFamily: 'inherit' }}>
      {/* Top nav */}
      <div style={{ borderBottom: '1px solid var(--bdr)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: 'var(--dim)', textDecoration: 'none', fontSize: 13 }}>← Back to app</Link>
        <span style={{ color: 'var(--bdr)' }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Privacy Policy</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--dim)', fontSize: 13, marginBottom: 40 }}>Last updated: {updated}</p>

        <Section title="1. Who We Are">
          <p>SignalGenie (signalgenie.ai) is a portfolio tracking and technical analysis tool built for Indian retail investors. It is operated by Sai Ganesh and Sai Kumar Bethala (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). Contact us at <a href="mailto:support@signalgenie.ai" style={{ color: 'var(--bluL)' }}>support@signalgenie.ai</a>.</p>
        </Section>

        <Section title="2. What Data We Collect">
          <ul>
            <li><strong>Account data</strong> — email address, name (via Supabase Auth / Google OAuth).</li>
            <li><strong>Portfolio data</strong> — stock symbols, quantity, average buy price you enter manually or import via CSV. Stored in Supabase.</li>
            <li><strong>Position data</strong> — forex and commodity positions you track (currently stored in browser localStorage; migration to Supabase planned).</li>
            <li><strong>Usage data</strong> — pages visited, features used (anonymised, not linked to identity). Used to improve the product.</li>
            <li><strong>Scan log data</strong> — technical scan results (symbol, RSI, price at scan time) stored to power the Track Record accuracy feature.</li>
          </ul>
        </Section>

        <Section title="3. What We Do Not Collect">
          <ul>
            <li>We do <strong>not</strong> collect broker credentials, Demat account numbers, or PAN numbers.</li>
            <li>We do <strong>not</strong> store payment card details. Payments (when enabled) are processed by Razorpay under their own privacy policy.</li>
            <li>We do <strong>not</strong> sell your data to any third party.</li>
            <li>We do <strong>not</strong> run targeted advertising.</li>
          </ul>
        </Section>

        <Section title="4. How We Use Your Data">
          <ul>
            <li>Authenticate you and maintain your session.</li>
            <li>Display your portfolio holdings, P&amp;L, and live prices.</li>
            <li>Run technical scans and show ML-based scan results.</li>
            <li>Compute Track Record accuracy (anonymised scan-log comparison).</li>
            <li>Send product update emails (only if you opt in — no unsolicited marketing).</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Services">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bdr)' }}>
                <Th>Service</Th><Th>Purpose</Th><Th>Data shared</Th>
              </tr>
            </thead>
            <tbody>
              <TR><TD>Supabase</TD><TD>Auth + database hosting</TD><TD>Email, portfolio data</TD></TR>
              <TR><TD>Yahoo Finance API</TD><TD>Live stock/forex prices</TD><TD>Stock tickers only (no personal data)</TD></TR>
              <TR><TD>Razorpay</TD><TD>Payment processing (when enabled)</TD><TD>Name, email, amount</TD></TR>
              <TR><TD>Vercel</TD><TD>Hosting / CDN</TD><TD>IP address, request logs (standard hosting)</TD></TR>
            </tbody>
          </table>
          <p style={{ marginTop: 12 }}>Each service has its own privacy policy. We do not share your holdings or personal data with Yahoo Finance or Vercel.</p>
        </Section>

        <Section title="6. Data Storage &amp; Security">
          <ul>
            <li>All database data is stored on Supabase (AWS us-east-1 region), encrypted at rest.</li>
            <li>Row-Level Security (RLS) ensures users can only access their own data.</li>
            <li>Connections are encrypted in transit via TLS.</li>
            <li>We do not store passwords — authentication is handled by Supabase Auth (email magic link / Google OAuth).</li>
          </ul>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li>Your account and portfolio data is retained for as long as your account is active.</li>
            <li>Scan log data is retained for up to 90 days for Track Record computation.</li>
            <li>On account deletion, all personal data is purged within 30 days.</li>
          </ul>
        </Section>

        <Section title="8. Your Rights (DPDP Act 2023 — India)">
          <p>Under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of personal data we hold about you.</li>
            <li><strong>Correction</strong> — request correction of inaccurate data.</li>
            <li><strong>Erasure</strong> — request deletion of your account and associated data.</li>
            <li><strong>Grievance redressal</strong> — raise a complaint about how your data is handled.</li>
          </ul>
          <p>To exercise any right, email us at <a href="mailto:support@signalgenie.ai" style={{ color: 'var(--bluL)' }}>support@signalgenie.ai</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="9. Cookies &amp; Local Storage">
          <ul>
            <li>We use browser <strong>localStorage</strong> to store forex/commodity position data locally on your device.</li>
            <li>Supabase Auth stores a session token in a browser cookie for authentication.</li>
            <li>We do not use advertising cookies or cross-site tracking cookies.</li>
          </ul>
        </Section>

        <Section title="10. Children">
          <p>SignalGenie is not directed at anyone under 18. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us for immediate deletion.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this policy. Material changes will be notified via email (if you have provided one) or via an in-app notice. Continued use after the effective date constitutes acceptance.</p>
        </Section>

        <Section title="12. Contact">
          <p>For any privacy-related queries or requests:<br />
          Email: <a href="mailto:support@signalgenie.ai" style={{ color: 'var(--bluL)' }}>support@signalgenie.ai</a><br />
          Address: India</p>
        </Section>

        <div style={{ marginTop: 48, padding: '16px 20px', background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 12, fontSize: 12, color: 'var(--dim)', lineHeight: 1.6 }}>
          ⚠️ <strong style={{ color: 'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · SignalGenie is an informational tool only. Nothing on this platform constitutes investment advice, a recommendation to buy or sell securities, or financial planning guidance. Past scan accuracy does not guarantee future results. Invest at your own risk. DYOR.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--txt)' }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--dim)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: 'var(--txt)', fontSize: 12 }}>{children}</th>;
}
function TR({ children }: { children: React.ReactNode }) {
  return <tr style={{ borderBottom: '1px solid var(--bdr)' }}>{children}</tr>;
}
function TD({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', color: 'var(--dim)', verticalAlign: 'top' }}>{children}</td>;
}
