import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk Disclosure | SignalGenie',
  description: 'Important risk disclosures for users of the SignalGenie trading screener and portfolio tracker platform.',
};

const S: React.CSSProperties = { marginBottom:32 };
const H2: React.CSSProperties = { fontSize:18, fontWeight:800, marginBottom:12, color:'#fff', letterSpacing:-0.3 };
const H3: React.CSSProperties = { fontSize:14, fontWeight:700, marginBottom:8, color:'#e2e8f0' };
const P: React.CSSProperties  = { fontSize:13.5, lineHeight:1.8, color:'#94a3b8', marginBottom:10 };
const UL: React.CSSProperties = { listStyle:'disc', paddingLeft:20, fontSize:13.5, lineHeight:1.8, color:'#94a3b8' };
const LI: React.CSSProperties = { marginBottom:6 };
const BOX: React.CSSProperties = { background:'rgba(255,59,92,0.07)', border:'1px solid rgba(255,59,92,0.25)', borderRadius:12, padding:'16px 20px', marginBottom:24 };
const WARN: React.CSSProperties = { background:'rgba(255,184,0,0.07)', border:'1px solid rgba(255,184,0,0.22)', borderRadius:12, padding:'16px 20px', marginBottom:24 };

export default function RiskDisclosurePage() {
  return (
    <div style={{ minHeight:'100vh', background:'#070D1A', color:'#fff', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:780, margin:'0 auto', padding:'48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom:36 }}>
          <Link href="/" style={{ fontSize:13, color:'#4F6FFA', textDecoration:'none', fontWeight:600 }}>← SignalGenie</Link>
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.5, marginBottom:8 }}>Risk Disclosure</div>
            <div style={{ fontSize:13, color:'#64748b' }}>Effective: 1 June 2026 · Version 1.0</div>
          </div>
        </div>

        {/* Critical warning box */}
        <div style={BOX}>
          <div style={{ fontSize:14, fontWeight:800, color:'#FF3B5C', marginBottom:8 }}>⚠️ IMPORTANT — READ BEFORE USING THIS PLATFORM</div>
          <p style={{ ...P, marginBottom:0 }}>
            SignalGenie (<strong style={{ color:'#e2e8f0' }}>signalgenie.ai</strong>) is <strong style={{ color:'#e2e8f0' }}>NOT REGISTERED with SEBI as a Research Analyst, Investment Adviser, or Broker</strong>.
            This platform provides algorithmic screening tools and technical indicator outputs for informational and educational purposes only.
            Nothing on this platform constitutes investment advice, a recommendation to buy or sell securities, or financial planning guidance.
          </p>
        </div>

        {/* 1. Nature of the platform */}
        <div style={S}>
          <div style={H2}>1. Nature of the Platform</div>
          <p style={P}>SignalGenie is a <strong style={{ color:'#e2e8f0' }}>technical screening and portfolio tracking tool</strong>. The platform computes and displays:</p>
          <ul style={UL}>
            <li style={LI}>Technical indicators: RSI, EMA (20/50/200), MACD, Bollinger Bands, ATR, Supertrend</li>
            <li style={LI}>Algorithmic scan scores based on combinations of technical indicators</li>
            <li style={LI}>Live and delayed market prices from Yahoo Finance (publicly available data)</li>
            <li style={LI}>Portfolio P&L computed from user-entered cost prices against live prices</li>
            <li style={LI}>Peer comparisons, fundamental data (P/E, P/B, ROE, margins) from public filings</li>
            <li style={LI}>FII/DII flow data and macro indicators from public sources</li>
          </ul>
          <p style={P}>These outputs are <strong style={{ color:'#e2e8f0' }}>algorithmic results, not recommendations</strong>. A stock appearing in a scan result does not mean it is suitable for any particular investor.</p>
        </div>

        {/* 2. Investment risk */}
        <div style={S}>
          <div style={H2}>2. Investment Risk</div>
          <div style={WARN}>
            <p style={{ ...P, color:'#FFB800', fontWeight:700, marginBottom:4 }}>Equity investments carry significant risk of capital loss.</p>
            <p style={{ ...P, marginBottom:0 }}>Past performance of any indicator, scan result, or stock is not indicative of future performance. Markets can fall sharply and stay depressed for extended periods.</p>
          </div>
          <ul style={UL}>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Market risk:</strong> Prices can move against your position due to macroeconomic events, geopolitical developments, regulatory changes, or sentiment shifts.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Concentration risk:</strong> Holding few stocks or stocks in the same sector amplifies losses.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Liquidity risk:</strong> Small-cap and SME stocks may not have sufficient market depth to exit at desired prices.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Leverage risk:</strong> This platform does not facilitate leveraged trading, but users who trade on margin via brokers face amplified losses.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Currency risk:</strong> US stock portfolio values fluctuate with USD/INR exchange rates regardless of stock performance.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>F&O risk:</strong> Futures and options are not tracked by this platform but carry unlimited theoretical loss potential.</li>
          </ul>
        </div>

        {/* 3. ML / Algorithm risk */}
        <div style={S}>
          <div style={H2}>3. Algorithmic Scan Risk</div>
          <p style={P}>The ML scan results and technical indicator labels (e.g., "Strong Momentum", "Sideways", "Weak / Declining") are produced by rule-based algorithmic models trained on historical data. These models have important limitations:</p>
          <ul style={UL}>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Historical bias:</strong> Models built on past data may not generalise to future market regimes.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>False positives:</strong> A stock classified as "Strong Momentum" can decline sharply.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>No fundamental analysis:</strong> Technical scans do not account for management quality, business moats, earnings surprises, or fraud risk.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Lag:</strong> Technical indicators are inherently lagging — they describe past price action, not future direction.</li>
            <li style={LI}><strong style={{ color:'#e2e8f0' }}>Data latency:</strong> Prices are fetched from Yahoo Finance and may be delayed by 15–20 minutes. Do not use for intraday timing.</li>
          </ul>
          <p style={P}>Scan results are provided as <strong style={{ color:'#e2e8f0' }}>algorithmic screening output</strong>. They serve as a starting point for further research — not as a final decision.</p>
        </div>

        {/* 4. Data accuracy */}
        <div style={S}>
          <div style={H2}>4. Data Accuracy</div>
          <p style={P}>SignalGenie sources data from third-party providers including Yahoo Finance, NSE public feeds, and other publicly available APIs. We cannot guarantee the accuracy, completeness, or timeliness of this data. Known limitations:</p>
          <ul style={UL}>
            <li style={LI}>Commodity prices displayed are COMEX/NYMEX proxy conversions to INR — <strong style={{ color:'#e2e8f0' }}>NOT official MCX prices</strong>.</li>
            <li style={LI}>FII/DII data is sourced from NSE public releases and may be T+1.</li>
            <li style={LI}>Fundamental data (P/E, ROE, margins) is sourced from Yahoo Finance's `quoteSummary` which aggregates company filings. Discrepancies with official BSE/NSE filings may exist.</li>
            <li style={LI}>IPO GMP (grey market premium) data is indicative only — no official source exists for GMP.</li>
            <li style={LI}>Analyst target prices reflect consensus from third-party aggregators and may lag actual analyst updates.</li>
          </ul>
          <p style={P}>Always cross-check with official BSE/NSE filings, RBI releases, and company disclosures before making any financial decision.</p>
        </div>

        {/* 5. Regulatory */}
        <div style={S}>
          <div style={H2}>5. Regulatory Status</div>
          <div style={BOX}>
            <ul style={{ ...UL, color:'#e2e8f0' }}>
              <li style={LI}>SignalGenie is <strong>NOT registered</strong> with SEBI as a Research Analyst (RA), Investment Adviser (IA), Portfolio Manager (PMS), or Broker.</li>
              <li style={LI}>The platform does <strong>NOT provide personalised investment advice</strong>.</li>
              <li style={LI}>Paying for access to this platform is payment for <strong>software and data tools</strong>, not for investment research or recommendations.</li>
              <li style={LI}>US stocks content: SignalGenie is <strong>NOT registered</strong> with the SEC as an investment adviser or broker-dealer in the United States.</li>
            </ul>
          </div>
          <p style={P}>Users are solely responsible for their investment decisions. We recommend consulting a SEBI-registered Research Analyst or SEBI-registered Investment Adviser before making financial decisions.</p>
        </div>

        {/* 6. Paper trading */}
        <div style={S}>
          <div style={H2}>6. Paper Trading</div>
          <p style={P}>The Paper Trading feature simulates trades using virtual money. Paper trading results do not represent real market execution. Actual trades may experience slippage, partial fills, brokerage costs, and STT/GST charges that significantly affect returns. Paper trading performance is not indicative of actual trading results.</p>
        </div>

        {/* 7. No fiduciary duty */}
        <div style={S}>
          <div style={H2}>7. No Fiduciary Relationship</div>
          <p style={P}>Use of SignalGenie does not create a fiduciary, advisory, brokerage, or any other financial relationship between the user and SignalGenie, its founders, employees, or affiliates. We owe no duty of care with respect to investment outcomes.</p>
        </div>

        {/* 8. Limitation of liability */}
        <div style={S}>
          <div style={H2}>8. Limitation of Liability</div>
          <p style={P}>To the maximum extent permitted by applicable law, SignalGenie and its operators shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages including but not limited to:</p>
          <ul style={UL}>
            <li style={LI}>Investment losses or missed gains based on scan results or platform data</li>
            <li style={LI}>Loss of data, portfolio information, or access to the platform</li>
            <li style={LI}>Decisions made based on inaccurate, delayed, or incomplete data</li>
            <li style={LI}>Platform downtime or API failures affecting time-sensitive decisions</li>
          </ul>
        </div>

        {/* 9. User responsibility */}
        <div style={S}>
          <div style={H2}>9. User Responsibility</div>
          <p style={P}>By using SignalGenie, you acknowledge and agree that:</p>
          <ul style={UL}>
            <li style={LI}>You have read and understood this risk disclosure</li>
            <li style={LI}>You will conduct your own due diligence (DYOR) before investing</li>
            <li style={LI}>You will not rely solely on platform outputs for investment decisions</li>
            <li style={LI}>You are financially capable of bearing the risk of loss on your investments</li>
            <li style={LI}>You are using this platform as a research and screening tool, not as investment advice</li>
            <li style={LI}>You are aware of and comply with the tax obligations applicable to your trades in your jurisdiction</li>
          </ul>
        </div>

        {/* 10. DPDP / Privacy */}
        <div style={S}>
          <div style={H2}>10. Data & Privacy</div>
          <p style={P}>Portfolio holdings, transaction data, and other financial information you enter on this platform is stored on Supabase (a third-party cloud service) and subject to our <Link href="/privacy" style={{ color:'#4F6FFA', textDecoration:'none' }}>Privacy Policy</Link>. We do not sell your personal financial data to third parties. See our privacy policy for full details on data handling under the DPDP Act, 2023.</p>
        </div>

        {/* Contact */}
        <div style={S}>
          <div style={H2}>11. Contact</div>
          <p style={P}>Questions about this disclosure: <a href="mailto:gsaiganesh@gmail.com" style={{ color:'#4F6FFA', textDecoration:'none' }}>gsaiganesh@gmail.com</a></p>
          <p style={P}>Grievance Officer: Sai Ganesh · SignalGenie · Bengaluru, India</p>
        </div>

        {/* Footer */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:24, display:'flex', gap:16, flexWrap:'wrap', fontSize:12, color:'#475569' }}>
          <Link href="/privacy" style={{ color:'#4F6FFA', textDecoration:'none' }}>Privacy Policy</Link>
          <Link href="/dashboard" style={{ color:'#4F6FFA', textDecoration:'none' }}>Dashboard</Link>
          <span style={{ marginLeft:'auto' }}>© 2026 SignalGenie · Last updated 1 Jun 2026</span>
        </div>

      </div>
    </div>
  );
}
