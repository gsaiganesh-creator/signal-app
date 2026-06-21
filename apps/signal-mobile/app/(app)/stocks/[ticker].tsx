import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { PBar } from '@/components/ui/PBar';

const { width } = Dimensions.get('window');

// ── Per-stock data ───────────────────────────────────────────
const STOCK_DB: Record<string, any> = {
  HINDCOPPER: {
    name: 'Hindustan Copper Ltd', exchange: 'NSE · BSE: 513599', sector: 'Metals',
    tags: ["INDIA'S ONLY COPPER MINER", 'PSU · GOI 66.1%', 'ICRA AA+ STABLE', '-26% FROM ATH'],
    cmp: 560, prev: 541.95, high52: 762.80, low52: 348,
    chart: [540,548,535,552,558,545,562,551,566,558,545,552,560],
    signal: { badge: 'STRONG BUY', btype: 'sbuy', conf: 84, updated: '09:15 IST' },
    sentiment: { bull: 71, posts: 186 },
    insight: 'RF model flags volume breakout on 200 MA (₹446.75). PSU re-rating cycle underway. EV + 500GW RE demand tailwind structural through FY30.',
    fundamentals: {
      mktCap: '₹53,235 Cr', pe: '80x (FY29e)', margin: '24.6%', roce: '21.2%',
      roe: '19.1%', debt: 'ZERO', promoter: '66.1%', credit: 'AA+ Stable',
      dividend: '₹1/share (Feb 2026)',
      quarterly: [
        { q:'Q3 FY26', rev:'₹667 Cr', pat:'₹156.23 Cr', patGrowth:'+149.4% YoY', pbT:'₹212.52 Cr', pbtGrowth:'+101.7% YoY' },
      ],
      thesis: [
        'Only vertically integrated copper producer in India — mines → smelting → refining. Literal monopoly on domestic copper mining.',
        'EV + 500 GW RE tailwind is structural — EVs use 4× more copper than ICE. India\'s RE target = massive domestic copper demand surge by 2030.',
        'MDO model de-risks expansion — Mine Developer Operator takes construction risk. HCL retains ownership. Kendadih mine added 0.225 MTPA.',
        '148.5% PAT growth in Q3 shows operating leverage kicking in — fixed cost base means incremental revenue flows disproportionately to profit.',
      ],
      risks: [
        { icon:'🌍', title:'Global copper price', desc:'HCL earns in INR but copper priced in USD. Global slowdown → direct revenue hit per tonne.' },
        { icon:'⚠️', title:'Execution risk', desc:'₹7,188 Cr capex over 5 years is ambitious. MDO delays or clearance bottlenecks can push commissioning right.' },
        { icon:'📉', title:'Still at 80× PE', desc:'Earnings need to 4–5× by FY29 to justify current valuations. Patience required.' },
      ],
    },
    technicals: {
      emas: [
        { label: '5-Day EMA',       val: '~₹543',     role: 'Resistance',   color: 'red' },
        { label: '20-Day EMA',      val: '~₹518–528', role: 'Support Zone', color: 'grn' },
        { label: '20-Day EMA',      val: '~₹505–515', role: 'Support Zone', color: 'grn' },
        { label: '50-Day/5MA',      val: '₹544–558',  role: 'Resistance',   color: 'red' },
        { label: '200-Day EMA ★',   val: '₹446.75',   role: 'Strong Base',  color: 'grn' },
        { label: 'Bollinger Upper', val: '~₹528–648', role: 'Target Zone',  color: 'ylw' },
        { label: 'Bollinger Lower', val: '~₹469–488', role: 'Buy Floor',    color: 'grn' },
        { label: 'Key Support',     val: '₹348',      role: 'Deep Floor',   color: 'dim' },
      ],
      zones: [
        { label: 'ACCUMULATION', range: '₹460–490', note: 'Max safety. Add 40–50% of position. Near 200 MA ₹446.', type: 'acc' },
        { label: 'BREAKOUT ENTRY', range: '₹540–580', note: 'Weekly close above ₹560 on volume. Add 30%. 500 MA ₹544 confluence.', type: 'brk' },
        { label: 'TARGET 1', range: '₹620–640', note: 'Bollinger Upper. Break 25–30%. ATR retest attempt begins here.', type: 't1' },
        { label: 'TARGET 2', range: '₹650–680', note: 'Analyst consensus. Break 25%. FIST 9.21 MTM capacity → re-rating.', type: 't2' },
        { label: 'STOP LOSS', range: 'Below ₹460', note: 'Close below 2000 EMA zone. Trend breakdown. Exit 50–60%.', type: 'sl' },
      ],
      posNotes: [
        'Fresh buyer: 30% now (₹540–560), 40% at ₹460–490 dip, 30% on ₹600 breakout.',
        'In loss (bought ₹600–765): Don\'t average yet. Wait for ₹460–490. Averaging down smartly.',
        'Never lump sum at ₹560–765. On current earnings, SIP approach: ₹10,000–10,000/month.',
      ],
    },
  },
  RELIANCE: {
    name: 'Reliance Industries Ltd', exchange: 'NSE · BSE: 500325', sector: 'Energy / Conglomerate',
    tags: ['LARGE CAP', 'NIFTY 50', 'FII FAVOURITE', 'JIOPLATFORMS + RETAIL'],
    cmp: 2912, prev: 2860.4, high52: 3217.9, low52: 2220.2,
    chart: [2780,2810,2795,2840,2860,2830,2875,2850,2890,2875,2860,2890,2912],
    signal: { badge: 'STRONG BUY', btype: 'sbuy', conf: 87, updated: '09:32 IST' },
    sentiment: { bull: 76, posts: 412 },
    insight: 'RF flags RSI=34.2 recovery + EMA20>EMA50 golden cross. Delivery 66% = conviction buying. Jio + Retail two-engine growth intact through FY27.',
    fundamentals: {
      mktCap: '₹19.7 L Cr', pe: '25.4x', margin: '8.9%', roce: '11.2%',
      roe: '9.8%', debt: '₹3.1L Cr net', promoter: '50.3%', credit: 'AAA Stable',
      dividend: '₹10/share (FY26)',
      quarterly: [
        { q:'Q4 FY26', rev:'₹2.6L Cr', pat:'₹19,407 Cr', patGrowth:'+6.4% YoY', pbT:'₹24,100 Cr', pbtGrowth:'+5.1% YoY' },
      ],
      thesis: [
        'Three-engine conglomerate: O2C (cash cow), Retail (₹3.5L Cr revenue), Jio Platforms (1Cr+ subs). Each segment alone would be Nifty-worthy.',
        'Jio AirFiber + 5G monetisation just beginning. ARPU expansion ₹175 → ₹220+ target FY28 = direct EBITDA expansion.',
        'New Energy: ₹75,000 Cr capex Dhirubhai Ambani Green Energy Giga Complex. First mover in India green hydrogen.',
        'FII holds 23.9%. Every global EM fund owns RIL. Structural foreign demand floor.',
      ],
      risks: [
        { icon:'🛢️', title:'O2C margin squeeze', desc:'Refining margins volatile. Brent crude + chemical spread compression hits O2C EBITDA.' },
        { icon:'📡', title:'Jio competition', desc:'BSNL 4G revival + Airtel pricing can cap ARPU expansion pace.' },
        { icon:'💰', title:'High capex overhang', desc:'New Energy giga-factories = continued high debt. FCF generation expected only FY28+.' },
      ],
    },
    technicals: {
      emas: [
        { label: '20-Day EMA', val: '₹2,820', role: 'Near-term support. Hold = bullish.',   color: 'grn' },
        { label: '50-Day EMA', val: '₹2,764', role: 'Swing support zone.',                   color: 'grn' },
        { label: '200-Day EMA',val: '₹2,650', role: 'Long-term base. Strong floor.',         color: 'grn' },
        { label: 'Resistance', val: '₹2,980', role: 'Previous ATH test zone.',               color: 'red' },
        { label: 'Delivery %', val: '66%',    role: 'Above 50% = conviction accumulation.',  color: 'blu' },
      ],
      zones: [
        { label: 'ENTRY ZONE', range: '₹2,820–2,860', note: 'Near EMA20. RSI at 34 = near oversold. Strong accumulation zone.', type: 'acc' },
        { label: 'TARGET 1',   range: '₹3,080',        note: 'Break 6%. Near previous resistance. Book 30–40% here.', type: 't1' },
        { label: 'TARGET 2',   range: '₹3,200–3,218',  note: 'ATH retest. Full cycle target.', type: 't2' },
        { label: 'STOP LOSS',  range: 'Below ₹2,750',  note: 'Close below 50D EMA = trend change. Exit.', type: 'sl' },
      ],
      posNotes: [
        'Conservative: 40% at ₹2,820–2,860, 60% on ₹2,950 breakout. SL: ₹2,750.',
        'Aggressive: Full position now at CMP. T1: ₹3,080 → T2: ₹3,218.',
      ],
    },
  },
  TATAMOTORS: {
    name: 'Tata Motors Ltd', exchange: 'NSE · BSE: 500570', sector: 'Auto',
    tags: ['JLR TURNAROUND', 'EV PLAY', 'NIFTY 50', 'FII BUYING'],
    cmp: 960, prev: 945.7, high52: 1179.05, low52: 732.85,
    chart: [870,885,878,900,912,905,925,918,938,945,955,948,960],
    signal: { badge: 'STRONG BUY', btype: 'sbuy', conf: 81, updated: '09:31 IST' },
    sentiment: { bull: 72, posts: 287 },
    insight: 'RF score 0.81 — highest in auto sector. Volume 2.4× avg on breakout. JLR record order book + India EV market share 13.4%. Sector momentum ▲.',
    fundamentals: {
      mktCap: '₹3.52L Cr', pe: '8.1x', margin: '7.2%', roce: '18.4%',
      roe: '32.1%', debt: 'Net cash (JLR)', promoter: '46.4%', credit: 'A Stable',
      dividend: '₹3/share',
      quarterly: [
        { q:'Q4 FY26', rev:'₹1.1L Cr', pat:'₹9,407 Cr', patGrowth:'+26% YoY', pbT:'₹11,200 Cr', pbtGrowth:'+19% YoY' },
      ],
      thesis: [
        'JLR achieved net cash for first time in a decade. Range Rover waitlist 6–9 months. Pricing power intact in premium SUV segment.',
        'India EV #1 market share 13.4%. Nexon EV + Punch EV dominate sub-₹20L. EV profitability inflection FY27.',
        'Cheapest in Nifty for the growth rate: 8× PE, ROE 32%. Full JLR re-rating = 14–16× PE = ₹1,400–1,600 stock.',
        'New JLR platforms (EMA, JEA) launch FY26–28 = product upcycle for the next 4 years.',
      ],
      risks: [
        { icon:'🌍', title:'Global slowdown → JLR', desc:'JLR is ~65% of revenue. UK/EU recession hits premium auto demand directly.' },
        { icon:'🔋', title:'China EV competition', desc:'BYD accelerating in Range Rover mid-tier. JLR EV pivot needs speed.' },
        { icon:'💱', title:'GBP currency', desc:'JLR reports in GBP. INR hedge partial. Strong GBP = headwind on INR reporting.' },
      ],
    },
    technicals: {
      emas: [
        { label: '20-Day EMA', val: '₹930',  role: 'Immediate support. Held on 3 tests.', color: 'grn' },
        { label: '50-Day EMA', val: '₹905',  role: 'Primary swing support.',               color: 'grn' },
        { label: '200-Day EMA',val: '₹875',  role: 'Long-term base. Major buy zone.',      color: 'grn' },
        { label: 'Resistance', val: '₹980',  role: 'July high. Volume needed to break.',   color: 'red' },
        { label: 'ATH Retest', val: '₹1,179',role: 'Full cycle target if JLR re-rates.',   color: 'ylw' },
      ],
      zones: [
        { label: 'ENTRY ZONE', range: '₹930–960',    note: 'EMA20 support + CMP. RF signals accumulation here.', type: 'acc' },
        { label: 'TARGET 1',   range: '₹1,040',       note: 'Break 8%. Short-term target. Book 30% here.', type: 't1' },
        { label: 'TARGET 2',   range: '₹1,100–1,140', note: 'Positional target. Full JLR re-rating scenario.', type: 't2' },
        { label: 'STOP LOSS',  range: 'Below ₹905',   note: 'Below 50D EMA = breakdown. Cut and re-evaluate.', type: 'sl' },
      ],
      posNotes: [
        'Buy 50% now at ₹930–960. Add 50% on ₹980 breakout volume close.',
        'SL: ₹905. T1: ₹1,040 → T2: ₹1,140.',
      ],
    },
  },
  TCS: {
    name: 'Tata Consultancy Services', exchange: 'NSE · BSE: 532540', sector: 'IT Services',
    tags: ['IT BELLWETHER', 'DIVIDEND KING', 'LARGE CAP', 'AI SERVICES'],
    cmp: 3880, prev: 3795.8, high52: 4585.9, low52: 3311.05,
    chart: [3620,3650,3690,3720,3700,3740,3780,3760,3820,3800,3840,3860,3880],
    signal: { badge: 'BUY', btype: 'buy', conf: 73, updated: '09:35 IST' },
    sentiment: { bull: 67, posts: 195 },
    insight: 'MACD crossover + IT sector +4.1% momentum. Delivery 58%. Deal wins TCV $9.4B in Q4. AI services ramp = new revenue stream FY27.',
    fundamentals: {
      mktCap: '₹14.1L Cr', pe: '29.4x', margin: '24.5%', roce: '62.4%',
      roe: '52.1%', debt: 'Zero', promoter: '72.3%', credit: 'AAA',
      dividend: '₹116/share (FY26)',
      quarterly: [
        { q:'Q4 FY26', rev:'₹63,972 Cr', pat:'₹12,224 Cr', patGrowth:'+6.5% YoY', pbT:'₹15,100 Cr', pbtGrowth:'+5.8% YoY' },
      ],
      thesis: [
        'AI services pivot: TCS signed $1.2B AI deals in Q4. Gen-AI upskilling 500K employees. Enterprise AI = next decade of IT outsourcing.',
        'Deal TCV $9.4B (highest in 6 quarters). BFSI + Manufacturing recovering globally. Revenue growth acceleration ahead.',
        'Dividend machine: ₹116/share FY26 + buybacks. Yield ~3% at CMP. Zero debt, ₹61,000 Cr cash.',
        'Structural IT outsourcing beneficiary. Every global slowdown = more outsourcing from large enterprises.',
      ],
      risks: [
        { icon:'🇺🇸', title:'US slowdown = IT freeze', desc:'60% revenue from Americas. Discretionary IT cut first in recession. TCV can dry up fast.' },
        { icon:'🤖', title:'AI disruption', desc:'Agentic AI replacing junior developers. Could compress headcount-based billing long-term.' },
        { icon:'💵', title:'Rupee appreciation', desc:'Revenue USD, costs INR. INR strengthening → margin compression.' },
      ],
    },
    technicals: {
      emas: [
        { label: '20-Day EMA', val: '₹3,780', role: 'Support. Holding above = bullish.', color: 'grn' },
        { label: '50-Day EMA', val: '₹3,680', role: 'Primary support zone.',              color: 'grn' },
        { label: '200-Day EMA',val: '₹3,900', role: 'Currently above CMP = resistance.',  color: 'red' },
        { label: 'Resistance', val: '₹4,100', role: 'Key level. Break = new upleg.',      color: 'red' },
      ],
      zones: [
        { label: 'ENTRY ZONE', range: '₹3,780–3,880', note: 'EMA20 support. Accumulate dips here.', type: 'acc' },
        { label: 'TARGET 1',   range: '₹4,100',        note: 'Break 5.7%. 200D EMA + resistance.', type: 't1' },
        { label: 'TARGET 2',   range: '₹4,400–4,586',  note: 'ATH retest. Deal TCV recovery = re-rate.', type: 't2' },
        { label: 'STOP LOSS',  range: 'Below ₹3,680',  note: '50D EMA breach. Sector weakness signal.', type: 'sl' },
      ],
      posNotes: [
        '50% at ₹3,780–3,880 (current). 50% on ₹4,100 breakout.',
        'SL: ₹3,680. T1: ₹4,100 → T2: ₹4,586.',
      ],
    },
  },
  SBIN: {
    name: 'State Bank of India', exchange: 'NSE · BSE: 500112', sector: 'Banking (PSU)',
    tags: ['LARGEST PSU BANK', 'DII FAVOURITE', 'NIFTY 50', 'NET NPA <0.7%'],
    cmp: 824, prev: 807.6, high52: 912.05, low52: 680.55,
    chart: [745,758,762,775,780,772,790,785,800,808,815,818,824],
    signal: { badge: 'BUY', btype: 'buy', conf: 76, updated: '09:40 IST' },
    sentiment: { bull: 71, posts: 234 },
    insight: 'RSI=38 bounce + volume surge 2.8×. Bollinger lower band bounce. DII net buying ₹1,200 Cr week. Net NPA <0.7% = asset quality superior to private peers.',
    fundamentals: {
      mktCap: '₹7.35L Cr', pe: '9.1x', margin: '22.1%', roce: '—',
      roe: '17.8%', debt: 'Bank (N/A)', promoter: '57.5% (GoI)', credit: 'AAA Stable',
      dividend: '₹13.70/share (FY26)',
      quarterly: [
        { q:'Q4 FY26', rev:'NII ₹41,600 Cr', pat:'₹20,698 Cr', patGrowth:'+9.7% YoY', pbT:'—', pbtGrowth:'Net NPA: 0.67%' },
      ],
      thesis: [
        'Largest balance sheet in India: ₹65L Cr. Scale = moat. No private bank can replicate SBI 22,500+ branches geographic reach.',
        'Asset quality best-ever: Net NPA 0.67%, PCR 91.7%. Better credit quality than most private peers.',
        'Loan growth 14% YoY. Credit card + retail personal loans = high-margin diversification.',
        'Government capex boom = SBI\'s biggest opportunity. Infrastructure project lending 3× FY21 levels.',
      ],
      risks: [
        { icon:'📊', title:'NIM compression', desc:'RBI rate cuts = net interest margin squeezed. SBI more rate-sensitive than private banks.' },
        { icon:'🏛️', title:'Govt directed lending', desc:'Priority sector / PSL requirements can dilute ROE over time.' },
        { icon:'💳', title:'Unsecured lending stress', desc:'CC book ₹45,000 Cr. Industry-wide NPA rising in unsecured segment.' },
      ],
    },
    technicals: {
      emas: [
        { label: '20-Day EMA', val: '₹798', role: 'RSI oversold bounce from here.',      color: 'grn' },
        { label: '50-Day EMA', val: '₹782', role: 'Primary support. DII accumulation.',  color: 'grn' },
        { label: '200-Day EMA',val: '₹810', role: 'Slight resistance. Cross = breakout.', color: 'red' },
        { label: 'Resistance', val: '₹872', role: 'Key level. ML target.',                color: 'red' },
      ],
      zones: [
        { label: 'ENTRY ZONE', range: '₹798–824', note: 'Bollinger lower + EMA bounce. RSI=38 near-oversold.', type: 'acc' },
        { label: 'TARGET 1',   range: '₹872',      note: 'Break 5.8%. Book 40% here.', type: 't1' },
        { label: 'TARGET 2',   range: '₹912–930',  note: 'ATH retest. Govt capex = banking tailwind.', type: 't2' },
        { label: 'STOP LOSS',  range: 'Below ₹782',note: 'Below 50D EMA = sector weakness. Cut.', type: 'sl' },
      ],
      posNotes: [
        '60% at ₹798–824 now. 40% on ₹840 volume breakout.',
        'SL: ₹782. T1: ₹872 → T2: ₹912.',
      ],
    },
  },
  INFY: {
    name: 'Infosys Ltd', exchange: 'NSE · BSE: 500209', sector: 'IT Services',
    tags: ['IT LARGE CAP', 'AI SERVICES', 'FY27 GUIDANCE BEAT', 'ADR LISTED'],
    cmp: 1492, prev: 1463.2, high52: 1888.95, low52: 1358.05,
    chart: [1400,1415,1408,1430,1445,1438,1458,1452,1468,1460,1475,1480,1492],
    signal: { badge: 'BUY', btype: 'buy', conf: 69, updated: '09:44 IST' },
    sentiment: { bull: 63, posts: 156 },
    insight: 'EMA20>EMA50 recovery. ADX=26 trend building. FY27 guidance 4.5–6.5% — upper-end = re-rate. IT sector momentum tailwind.',
    fundamentals: {
      mktCap: '₹6.2L Cr', pe: '26.8x', margin: '21.3%', roce: '42.1%',
      roe: '32.4%', debt: 'Zero', promoter: '14.9%', credit: 'AAA',
      dividend: '₹84/share (FY26)',
      quarterly: [
        { q:'Q4 FY26', rev:'₹40,925 Cr', pat:'₹7,906 Cr', patGrowth:'+12.4% YoY', pbT:'₹9,800 Cr', pbtGrowth:'+10.8% YoY' },
      ],
      thesis: [
        'Infosys Topaz (AI unit) signed $3B+ AI contracts FY26. First IT co to cross ₹10K Cr AI deal TCV.',
        'US BFSI recovery: 38% revenue from BFSI. Rate cuts → bank IT spending revival → direct tailwind.',
        'Attrition down to 12.1% (from 24% peak). Cost normalised. Operating margins 21–22% sustainable.',
        'FY27 guidance top-end 6.5% → ₹1.65L Cr revenue. 27× PE at CMP is reasonable.',
      ],
      risks: [
        { icon:'🇺🇸', title:'H-1B visa risk', desc:'US immigration changes spike onshore costs. INFY 65% US revenue + 38K US employees.' },
        { icon:'🤖', title:'AI self-disruption', desc:'INFY deploys AI to reduce headcount. Headcount model under structural pressure.' },
        { icon:'📉', title:'21% below 52W high', desc:'Significant technical overhead resistance at ₹1,700–₹1,880.' },
      ],
    },
    technicals: {
      emas: [
        { label: '20-Day EMA', val: '₹1,450', role: 'Golden cross above 50D. Support.', color: 'grn' },
        { label: '50-Day EMA', val: '₹1,430', role: 'Primary support confirmed.',        color: 'grn' },
        { label: '200-Day EMA',val: '₹1,620', role: 'Key recovery resistance.',          color: 'red' },
        { label: 'Resistance', val: '₹1,580', role: 'Near-term hurdle. Break = upleg.',  color: 'red' },
      ],
      zones: [
        { label: 'ENTRY ZONE', range: '₹1,450–1,492', note: 'EMA20>EMA50 momentum build. ADX=26 confirming trend.', type: 'acc' },
        { label: 'TARGET 1',   range: '₹1,580',        note: 'Near-term resistance. Book 35%.', type: 't1' },
        { label: 'TARGET 2',   range: '₹1,700–1,750',  note: '200D EMA retest. FY27 beat = re-rate.', type: 't2' },
        { label: 'STOP LOSS',  range: 'Below ₹1,430',  note: 'Below 50D EMA = trend failure. Exit.', type: 'sl' },
      ],
      posNotes: [
        '60% at CMP ₹1,450–1,492. 40% on ₹1,580 breakout.',
        'SL: ₹1,430. T1: ₹1,580 → T2: ₹1,750.',
      ],
    },
  },
  ZOMATO: {
    name: 'Zomato Ltd', exchange: 'NSE · BSE: 543320', sector: 'Consumer Tech',
    tags: ['SELL SIGNAL', 'RSI=71 OVERBOUGHT', 'BELOW EMA50', 'FII NET SELL'],
    cmp: 198, prev: 204.3, high52: 267.6, low52: 143.8,
    chart: [215,218,212,220,225,222,215,208,202,205,200,196,198],
    signal: { badge: 'SELL', btype: 'sell', conf: 74, updated: '09:30 IST' },
    sentiment: { bull: 38, posts: 321 },
    insight: 'RSI=71 from 90-day high, now breaking below EMA50. FII net sell ₹890 Cr past 5 sessions. Distribution pattern active. RF confidence 74% SHORT.',
    fundamentals: {
      mktCap: '₹1.74L Cr', pe: '182x', margin: '2.1%', roce: '6.2%',
      roe: '4.8%', debt: 'Zero', promoter: '0%', credit: 'Not rated',
      dividend: '—',
      quarterly: [
        { q:'Q4 FY26', rev:'₹5,833 Cr', pat:'₹239 Cr', patGrowth:'+120% YoY (low base)', pbT:'₹305 Cr', pbtGrowth:'Blinkit GOV ₹1,200 Cr' },
      ],
      thesis: [
        'Food delivery market share 57%. Blinkit now profitable. Q-commerce growth story long-term intact.',
        'SELL is tactical (overvaluation), not structural. Good company, wrong price right now.',
        'Wait for ₹160–180 correction before long-term re-entry. PE needs to contract first.',
        'At 182× PE for 2.1% margin — any quarterly miss = 20%+ correction risk.',
      ],
      risks: [
        { icon:'💸', title:'Extreme valuation', desc:'182× PE for sub-3% margin. Single miss = material de-rating.' },
        { icon:'🏪', title:'Q-commerce competition', desc:'Swiggy Instamart + BB Now + Zepto burning cash to grab Blinkit share.' },
        { icon:'⚖️', title:'Gig worker regulation', desc:'Labour Ministry exploring gig protections. Could raise delivery costs structurally.' },
      ],
    },
    technicals: {
      emas: [
        { label: '20-Day EMA', val: '₹204', role: 'Broken below — now resistance.',   color: 'red' },
        { label: '50-Day EMA', val: '₹210', role: 'Key breakdown. Bear signal active.', color: 'red' },
        { label: '200-Day EMA',val: '₹193', role: 'Support. Potential bounce zone.',   color: 'grn' },
        { label: 'RSI',        val: '71→58', role: 'Fading from overbought. Bearish.', color: 'red' },
      ],
      zones: [
        { label: 'SHORT ENTRY', range: '₹198–204',  note: 'Below EMA50+EMA20. RSI fading. Enter short / reduce longs.', type: 'sl' },
        { label: 'TARGET 1',    range: '₹176–180',  note: 'Book 50% short. Near 200D EMA support.', type: 't1' },
        { label: 'TARGET 2',    range: '₹160',       note: 'Full breakdown target if 200D EMA fails.', type: 't2' },
        { label: 'RE-BUY ZONE', range: '₹160–180',  note: 'Long-term accumulation zone after correction.', type: 'acc' },
        { label: 'SHORT COVER', range: 'Above ₹212', note: 'EMA50 reclaim = squeeze. Cover shorts immediately.', type: 'base' },
      ],
      posNotes: [
        'Short at ₹198–204. SL: ₹212 (EMA50 reclaim). T1: ₹176 → T2: ₹160.',
        'Long-term holders: Book 50% here. Re-enter at ₹160–170.',
      ],
    },
  },
  TARIL: {
    name: 'Transformers & Rectifiers India Ltd', exchange: 'NSE · Power Equipment', sector: 'Capital Goods',
    tags: ['VALUE STOCK', 'STRONG MARGINS', 'GROWTH STABLE'],
    cmp: 292, prev: 281.5, high52: 420, low52: 185,
    chart: [220,235,228,242,255,248,262,258,270,265,278,285,292],
    signal: { badge: 'BUY', btype: 'buy', conf: 76, updated: '09:31 IST' },
    sentiment: { bull: 68, posts: 94 },
    insight: 'RF detects accumulation at current levels. 70% market share in power transformers + order book ₹1,250 Cr. Green energy + railway infra = decade-long demand.',
    fundamentals: {
      mktCap: '₹19,645 Cr', pe: '34.1x', margin: '10.5%', roce: '28%',
      roe: '34%', debt: 'Low', promoter: '52%', credit: 'A+ Stable',
      dividend: '—',
      quarterly: [
        { q:'Q1 FY27e', rev:'₹420–460 Cr', pat:'Target range', patGrowth:'+31.7% YoY base', pbT:'—', pbtGrowth:'Order book ₹1,250+ Cr' },
      ],
      thesis: [
        '70% market share in power transformers — hard for competitors to scale 140K MVA capacity.',
        'Global Reach: Exports to 25+ countries. Utilities worldwide depend on TARIL. High switching costs.',
        'Operational Excellence: 10% margins improving efficiency. Better than all peers combined.',
        'Tailwinds: Green energy transition + Railway infrastructure + Decade-long demand boost.',
      ],
      risks: [
        { icon:'📦', title:'Order book risk', desc:'Delay in order execution can impact quarterly revenue recognition.' },
        { icon:'🔩', title:'Raw material costs', desc:'CRGO steel prices volatile. Margin compression risk in upcycles.' },
        { icon:'🏛️', title:'Govt capex dependency', desc:'80%+ revenue from PSUs/state utilities. Budget cuts can slow ordering.' },
      ],
    },
    technicals: {
      emas: [
        { label: 'Accumulation Zone', val: '₹260–280', role: 'Order book ₹1350+ Cr provides downside protection', color: 'grn' },
        { label: 'Fair Entry Zone',   val: '₹290–310', role: 'Fair entry at current levels. Add on strength.', color: 'ylw' },
        { label: 'Breakout Level',    val: '₹330–350', role: 'Confirmed breakout. Finish remaining 20% position.', color: 'blu' },
      ],
      zones: [
        { label: 'ACCUMULATION',  range: '₹260–280', note: 'Order book ₹1350+ Cr provides downside protection. If it dips here, load up (40% position).', type: 'acc' },
        { label: 'FAIR ENTRY',    range: '₹290–310', note: 'Fair entry at current levels. Add on strength, top up if breaks ₹310.', type: 'brk' },
        { label: 'BREAKOUT',      range: '₹330–350', note: 'Confirmed breakout. Finish remaining 20% position. Stop Loss: ₹270.', type: 't1' },
        { label: 'BULL TARGET',   range: '₹420–460', note: 'Bull Case (70%): Green energy boom + railway orders. Book ₹1350+ Cr. Re-rate higher multiples.', type: 't2' },
        { label: 'BASE TARGET',   range: '₹360–380', note: 'Base Case (25%): Steady growth at ₹360–380. Economic slowdown impacts capex orders slightly.', type: 'base' },
        { label: 'STOP LOSS',     range: '₹220',     note: 'Bear Case (5%): Economic collapse, order book dries up. Floor ₹220 (near 52W low).', type: 'sl' },
      ],
      posNotes: [
        'Start 40% position at ₹260–280 (accumulation zone).',
        'Add 40% at ₹290–310 (current fair entry).',
        'Final 20% on breakout above ₹330–350. Stop Loss: ₹270.',
      ],
    },
  },
};

const DEFAULT_STOCK = (ticker: string) => ({
  name: ticker, exchange: 'NSE', sector: 'Equity',
  tags: ['NSE LISTED'],
  cmp: 0, prev: 0, high52: 0, low52: 0,
  chart: [40,42,41,45,44,48,47,50,52,51,54,56,58],
  signal: { badge: 'BUY', btype: 'buy', conf: 72, updated: 'Updated' },
  sentiment: { bull: 64, posts: 120 },
  insight: 'ML model signals positive momentum. Monitor for volume confirmation above key resistance.',
  fundamentals: {
    mktCap: '—', pe: '—', margin: '—', roce: '—',
    roe: '—', debt: '—', promoter: '—', credit: '—', dividend: '—',
    quarterly: [],
    thesis: ['Data loading...'],
    risks: [],
  },
  technicals: {
    emas: [],
    zones: [],
    posNotes: [],
  },
});

const PERIODS = ['1D','1W','1M','3M','6M','1Y'];
const TABS = ['Overview','Technicals','Fundamentals'];

function badgeColors(btype: string, ACC: any) {
  switch (btype) {
    case 'sbuy': return { bg: `${ACC.grn}22`, bc: `${ACC.grn}44`, tc: ACC.grn };
    case 'buy':  return { bg: `${ACC.grn}12`, bc: `${ACC.grn}28`, tc: ACC.grn };
    case 'sell': return { bg: `${ACC.red}18`, bc: `${ACC.red}35`, tc: ACC.red };
    default:     return { bg: `${ACC.ylw}15`, bc: `${ACC.ylw}35`, tc: ACC.ylw };
  }
}

function zoneColor(type: string, ACC: any) {
  switch (type) {
    case 'acc':  return ACC.grn;
    case 'brk':  return ACC.blu;
    case 't1':   return ACC.ylw;
    case 't2':   return ACC.org;
    case 'base': return ACC.pur;
    case 'sl':   return ACC.red;
    default:     return ACC.dim;
  }
}

export default function StockDetail() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState('1M');
  const [tab, setTab] = useState('Overview');

  const sym = ticker ?? 'RELIANCE';
  const S = STOCK_DB[sym] ?? DEFAULT_STOCK(sym);
  const chg = S.prev > 0 ? ((S.cmp - S.prev) / S.prev * 100) : 1.8;
  const up = chg >= 0;

  const chartW = width - 28;
  const chartH = 54;
  const mn = Math.min(...S.chart), mx = Math.max(...S.chart), rng = mx - mn || 1;
  const pts = S.chart.map((v: number, i: number) =>
    `${(i / (S.chart.length - 1)) * chartW},${chartH - 2 - ((v - mn) / rng) * (chartH - 6)}`
  ).join(' L ');

  const bc = badgeColors(S.signal.btype, ACC);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
        <View style={[s.logo, { backgroundColor: `${ACC.blu}22`, borderColor: `${ACC.blu}44` }]}>
          <Text style={[s.logoTxt, { color: ACC.bluL }]}>{sym.slice(0, 3)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.tickerName, { color: T.txt }]}>{sym}</Text>
          <Text style={[s.exchange, { color: T.dim }]}>{S.exchange}</Text>
        </View>
        <View style={s.priceCol}>
          <Text style={[s.price, { color: T.txt }]}>₹{S.cmp.toLocaleString()}</Text>
          <Text style={[s.priceChg, { color: up ? ACC.grn : ACC.red }]}>
            {up ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Tags */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tags}>
        {S.tags.map((tag: string) => (
          <View key={tag} style={[s.tagChip, { backgroundColor: T.surf2, borderColor: T.bdr }]}>
            <Text style={[s.tagTxt, { color: T.dim }]}>{tag}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Chart */}
      <View style={s.chartWrap}>
        <Svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
          <Defs>
            <SvgGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={up ? ACC.grn : ACC.red} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={up ? ACC.grn : ACC.red} stopOpacity={0} />
            </SvgGradient>
          </Defs>
          <Path d={`M${pts} L${chartW},${chartH} L0,${chartH}Z`} fill="url(#cg)" />
          <Path d={`M${pts}`} fill="none" stroke={up ? ACC.grn : ACC.red} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <View style={s.periods}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)}
              style={[s.period, p === period && { backgroundColor: `${ACC.blu}22` }]}>
              <Text style={[s.periodTxt, { color: p === period ? ACC.bluL : T.dim, fontWeight: p === period ? '700' : '400' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab bar */}
      <View style={[s.tabBar, { backgroundColor: T.surf2, borderColor: T.bdr }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && { backgroundColor: T.bg, borderColor: T.bdr }]}>
            <Text style={[s.tabTxt, { color: tab === t ? ACC.bluL : T.dim, fontWeight: tab === t ? '700' : '500' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.tabContent}>
        {/* ── OVERVIEW TAB ── */}
        {tab === 'Overview' && <>
          {/* ML Signal */}
          <View style={[s.card, { backgroundColor: `${bc.bg}`, borderColor: bc.bc }]}>
            <View style={s.signalTop}>
              <Text style={{ fontSize: 14 }}>🤖</Text>
              <Text style={[s.signalLabel, { color: bc.tc }]}>ML SIGNAL</Text>
              <View style={[s.badge, { backgroundColor: bc.bg, borderColor: bc.bc }]}>
                <Text style={[s.badgeTxt, { color: bc.tc }]}>{S.signal.badge}</Text>
              </View>
              <Text style={[s.signalTime, { color: T.dim }]}>{S.signal.updated}</Text>
            </View>
            <PBar val={S.signal.conf} color={bc.tc} h={4} />
            <Text style={[s.confNote, { color: T.dim }]}>Confidence <Text style={{ color: bc.tc, fontWeight: '700' }}>{S.signal.conf}%</Text></Text>
          </View>

          {/* Sentiment */}
          <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <View style={s.cardHead}>
              <Text style={[s.cardTitle, { color: T.txt }]}>𝕏 Market Sentiment</Text>
              <Text style={[s.cardSub, { color: T.dim }]}>{S.sentiment.posts} posts · 24h</Text>
            </View>
            <View style={[s.sentBar, { backgroundColor: T.bdr }]}>
              <View style={[s.sentFill, { backgroundColor: ACC.grn, width: `${S.sentiment.bull}%` as any }]} />
            </View>
            <View style={s.sentLabels}>
              <Text style={[s.bullLbl, { color: ACC.grn }]}>{S.sentiment.bull}% Bullish</Text>
              <Text style={[s.bearLbl, { color: ACC.red }]}>{100 - S.sentiment.bull}% Bearish</Text>
            </View>
          </View>

          {/* Quick stats */}
          <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <Text style={[s.sectionLabel, { color: T.dim }]}>KEY STATS</Text>
            <View style={s.statsGrid}>
              {[
                ['Mkt Cap', S.fundamentals.mktCap], ['P/E', S.fundamentals.pe],
                ['Net Margin', S.fundamentals.margin], ['ROCE', S.fundamentals.roce],
                ['Promoter%', S.fundamentals.promoter], ['52W High', `₹${S.high52}`],
              ].map(([k,v]) => (
                <View key={k} style={s.statItem}>
                  <Text style={[s.statKey, { color: T.dim }]}>{k}</Text>
                  <Text style={[s.statVal, { color: T.txt }]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ML Insight */}
          <View style={[s.insight, { backgroundColor: `${ACC.blu}0A`, borderColor: `${ACC.blu}22` }]}>
            <Text style={{ fontSize: 13, marginTop: 1 }}>💡</Text>
            <Text style={[s.insightTxt, { color: T.dim }]}>{S.insight}</Text>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={[s.buyBtn, { backgroundColor: ACC.grn }]}>
              <Text style={[s.buyTxt, { color: '#001A12' }]}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sellBtn, { backgroundColor: `${ACC.red}18`, borderColor: `${ACC.red}44` }]}>
              <Text style={[s.sellTxt, { color: ACC.red }]}>SELL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.watchBtn, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.watchTxt, { color: T.dim }]}>☆</Text>
            </TouchableOpacity>
          </View>
        </>}

        {/* ── TECHNICALS TAB ── */}
        {tab === 'Technicals' && <>
          {/* EMA / SMA map */}
          {S.technicals.emas.length > 0 && (
            <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.sectionLabel, { color: T.dim }]}>EMA / SMA PRICE MAP</Text>
              {S.technicals.emas.map((e: any, i: number) => (
                <View key={i} style={[s.emaRow, { borderBottomColor: T.bdr }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.emaLabel, { color: T.txt }]}>{e.label}</Text>
                    <Text style={[s.emaRole, { color: T.dim }]}>{e.role}</Text>
                  </View>
                  <View style={[s.emaValBadge, { backgroundColor: `${(ACC as Record<string,string>)[e.color] ?? T.dim}18` }]}>
                    <Text style={[s.emaVal, { color: (ACC as Record<string,string>)[e.color] ?? T.dim }]}>{e.val}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Entry / Target / SL zones */}
          <Text style={[s.sectionLabel, { color: T.dim, paddingHorizontal: 2 }]}>ENTRY · TARGET · STOP LOSS</Text>
          {S.technicals.zones.map((z: any, i: number) => {
            const zc = zoneColor(z.type, ACC);
            return (
              <View key={i} style={[s.zoneCard, { backgroundColor: `${zc}09`, borderColor: `${zc}28` }]}>
                <View style={s.zoneHead}>
                  <View style={[s.zoneLabelBadge, { backgroundColor: `${zc}20` }]}>
                    <Text style={[s.zoneLabelTxt, { color: zc }]}>{z.label}</Text>
                  </View>
                  <Text style={[s.zoneRange, { color: zc }]}>{z.range}</Text>
                </View>
                <Text style={[s.zoneNote, { color: T.dim }]}>{z.note}</Text>
              </View>
            );
          })}

          {/* Position sizing */}
          {S.technicals.posNotes.length > 0 && (
            <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.sectionLabel, { color: T.dim }]}>POSITION SIZING GUIDE</Text>
              {S.technicals.posNotes.map((note: string, i: number) => (
                <View key={i} style={s.posRow}>
                  <Text style={[s.posBullet, { color: ACC.bluL }]}>›</Text>
                  <Text style={[s.posNote, { color: T.dim }]}>{note}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[s.sebi, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <Text style={[s.sebiTxt, { color: T.dim }]}>
              ⚠️ <Text style={{ color: T.txt, fontWeight: '600' }}>Not SEBI advice.</Text> Levels are technical reference only. DYOR. Trade at your own risk.
            </Text>
          </View>
        </>}

        {/* ── FUNDAMENTALS TAB ── */}
        {tab === 'Fundamentals' && <>
          {/* Full stats grid */}
          <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <Text style={[s.sectionLabel, { color: T.dim }]}>KEY METRICS</Text>
            <View style={s.statsGrid}>
              {[
                ['Mkt Cap', S.fundamentals.mktCap], ['P/E Ratio', S.fundamentals.pe],
                ['Net Margin', S.fundamentals.margin], ['ROCE', S.fundamentals.roce],
                ['ROE (TTM)', S.fundamentals.roe], ['Long-term Debt', S.fundamentals.debt],
                ['Promoter %', S.fundamentals.promoter], ['Credit Rating', S.fundamentals.credit],
                ['52W High', `₹${S.high52}`], ['52W Low', `₹${S.low52}`],
                ['Dividend', S.fundamentals.dividend], ['Sector', S.sector],
              ].map(([k,v]) => (
                <View key={k} style={s.statItem}>
                  <Text style={[s.statKey, { color: T.dim }]}>{k}</Text>
                  <Text style={[s.statVal, { color: T.txt }]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quarterly results */}
          {S.fundamentals.quarterly.length > 0 && (
            <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.sectionLabel, { color: T.dim }]}>QUARTERLY RESULTS</Text>
              {S.fundamentals.quarterly.map((q: any, i: number) => (
                <View key={i} style={[s.qRow, { borderColor: T.bdr }]}>
                  <Text style={[s.qLabel, { color: ACC.bluL }]}>{q.q}</Text>
                  <View style={s.qGrid}>
                    <View style={s.qItem}><Text style={[s.qKey, { color: T.dim }]}>Revenue</Text><Text style={[s.qVal, { color: T.txt }]}>{q.rev}</Text></View>
                    <View style={s.qItem}><Text style={[s.qKey, { color: T.dim }]}>PAT</Text><Text style={[s.qVal, { color: ACC.grn }]}>{q.pat}</Text></View>
                    <View style={s.qItem}><Text style={[s.qKey, { color: T.dim }]}>PAT Growth</Text><Text style={[s.qVal, { color: ACC.grn }]}>{q.patGrowth}</Text></View>
                    <View style={s.qItem}><Text style={[s.qKey, { color: T.dim }]}>PBT</Text><Text style={[s.qVal, { color: T.txt }]}>{q.pbT}</Text></View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Investment thesis */}
          <View style={[s.card, { backgroundColor: `${ACC.grn}06`, borderColor: `${ACC.grn}22` }]}>
            <Text style={[s.sectionLabel, { color: ACC.grn }]}>WHY SIGNAL LIKES IT</Text>
            {S.fundamentals.thesis.map((pt: string, i: number) => (
              <View key={i} style={s.thesisRow}>
                <Text style={[s.thesisBullet, { color: ACC.grn }]}>✓</Text>
                <Text style={[s.thesisTxt, { color: T.dim }]}>{pt}</Text>
              </View>
            ))}
          </View>

          {/* Risk factors */}
          {S.fundamentals.risks.length > 0 && (
            <View style={[s.card, { backgroundColor: `${ACC.red}06`, borderColor: `${ACC.red}22` }]}>
              <Text style={[s.sectionLabel, { color: ACC.red }]}>KEY RISKS TO MONITOR</Text>
              {S.fundamentals.risks.map((r: any, i: number) => (
                <View key={i} style={s.riskRow}>
                  <Text style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.riskTitle, { color: T.txt }]}>{r.title}</Text>
                    <Text style={[s.riskDesc, { color: T.dim }]}>{r.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={[s.sebi, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <Text style={[s.sebiTxt, { color: T.dim }]}>
              ⚠️ <Text style={{ color: T.txt, fontWeight: '600' }}>Not SEBI advice.</Text> Research via SIGNAL AI. Not SEBI registered. Verify all data independently. DYOR.
            </Text>
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  topBar:        { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  backBtn:       { padding: 4 },
  backTxt:       { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  logo:          { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoTxt:       { fontSize: 9, fontWeight: '900' },
  tickerName:    { fontSize: 16, fontWeight: '800' },
  exchange:      { fontSize: 10.5 },
  priceCol:      { alignItems: 'flex-end' },
  price:         { fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  priceChg:      { fontSize: 12, fontWeight: '700' },
  tags:          { paddingHorizontal: 13, paddingBottom: 6, gap: 6 },
  tagChip:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagTxt:        { fontSize: 9.5, fontWeight: '700' },
  chartWrap:     { paddingHorizontal: 14, marginBottom: 6 },
  periods:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  period:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  periodTxt:     { fontSize: 11 },
  tabBar:        { flexDirection: 'row', marginHorizontal: 13, borderRadius: 10, borderWidth: 1, padding: 3, gap: 3, marginBottom: 8 },
  tabBtn:        { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 7, borderWidth: 1, borderColor: 'transparent' },
  tabTxt:        { fontSize: 12 },
  tabContent:    { paddingHorizontal: 13, paddingBottom: 28, gap: 8 },
  card:          { padding: 12, borderRadius: 13, borderWidth: 1 },
  signalTop:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  signalLabel:   { fontSize: 11, fontWeight: '700', flex: 1 },
  badge:         { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeTxt:      { fontSize: 10, fontWeight: '800' },
  signalTime:    { fontSize: 10 },
  confNote:      { fontSize: 10.5, marginTop: 5 },
  cardHead:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  cardTitle:     { fontSize: 12, fontWeight: '700' },
  cardSub:       { fontSize: 10.5 },
  sentBar:       { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  sentFill:      { height: '100%', borderRadius: 4 },
  sentLabels:    { flexDirection: 'row', justifyContent: 'space-between' },
  bullLbl:       { fontSize: 11, fontWeight: '700' },
  bearLbl:       { fontSize: 11, fontWeight: '700' },
  sectionLabel:  { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 9 },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  statItem:      { width: '33.33%', marginBottom: 9 },
  statKey:       { fontSize: 9.5 },
  statVal:       { fontSize: 12, fontWeight: '700', marginTop: 1 },
  insight:       { padding: 9, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8 },
  insightTxt:    { fontSize: 11.5, lineHeight: 17, flex: 1 },
  actions:       { flexDirection: 'row', gap: 8, marginTop: 4 },
  buyBtn:        { flex: 1, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  buyTxt:        { fontSize: 14, fontWeight: '800' },
  sellBtn:       { flex: 1, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sellTxt:       { fontSize: 14, fontWeight: '800' },
  watchBtn:      { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  watchTxt:      { fontSize: 18 },
  emaRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  emaLabel:      { fontSize: 12, fontWeight: '600' },
  emaRole:       { fontSize: 10.5, marginTop: 1 },
  emaValBadge:   { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  emaVal:        { fontSize: 11.5, fontWeight: '700' },
  zoneCard:      { padding: 11, borderRadius: 12, borderWidth: 1, gap: 5 },
  zoneHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  zoneLabelBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  zoneLabelTxt:  { fontSize: 10, fontWeight: '800' },
  zoneRange:     { fontSize: 14, fontWeight: '900' },
  zoneNote:      { fontSize: 11, lineHeight: 16 },
  posRow:        { flexDirection: 'row', gap: 7, marginBottom: 7 },
  posBullet:     { fontSize: 14, fontWeight: '700', flexShrink: 0 },
  posNote:       { fontSize: 11.5, lineHeight: 17, flex: 1 },
  qRow:          { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 7 },
  qLabel:        { fontSize: 11, fontWeight: '700', marginBottom: 7 },
  qGrid:         { flexDirection: 'row', flexWrap: 'wrap' },
  qItem:         { width: '50%', marginBottom: 5 },
  qKey:          { fontSize: 9.5 },
  qVal:          { fontSize: 12, fontWeight: '700', marginTop: 1 },
  thesisRow:     { flexDirection: 'row', gap: 7, marginBottom: 8 },
  thesisBullet:  { fontSize: 13, fontWeight: '800', flexShrink: 0, marginTop: 1 },
  thesisTxt:     { fontSize: 11.5, lineHeight: 17, flex: 1 },
  riskRow:       { flexDirection: 'row', gap: 9, marginBottom: 9, alignItems: 'flex-start' },
  riskTitle:     { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  riskDesc:      { fontSize: 11, lineHeight: 16 },
  sebi:          { padding: 9, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  sebiTxt:       { fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
