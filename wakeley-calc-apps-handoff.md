# 2176 Studios — Calc Apps Build Handoff

This document is the complete brief for a new Claude Code session to build all 9 remaining calculator apps. Read this fully before writing any code.

---

## Project overview

**Repo:** `rcamz/2176studios-apps` (GitHub), deployed to `2176studios.com` via Cloudflare Pages, auto-deploys on push to `main`.

**Working directory:** `/home/user/2176 studios/web/`

**Stack:** React 18 + Vite 5 + React Router v6 + Recharts. No TypeScript. No test suite.

**Permissions:** `.claude/settings.json` has `"defaultMode": "bypassPermissions"` — no approval prompts needed.

**Current git state:** branch `main`, HEAD commit `4ae04cc`. Tag `stable-pre-bigwork` is a safe restore point.

---

## What exists already (do not touch)

| File | Purpose |
|---|---|
| `src/main.jsx` | Entry point, imports `base.css` + `App.jsx` |
| `src/App.jsx` | Router — currently only has `/` and `/mortgagecalc` |
| `src/base.css` | Design tokens + shared components (topbar, btn-icon, modal) |
| `src/Home.jsx` | Home page listing all 10 apps |
| `src/Home.css` | App card styles |
| `src/MortgageCalc.jsx` | Page wrapper for calc #1 |
| `src/MortgageCalc.css` | Layout + calc-specific styles |
| `src/CalcInstance.jsx` | Full calc #1 component with multi-scenario comparison |
| `src/AdUnit.jsx` | Ad unit component (placeholder + real AdSense) |
| `src/lib/amortize.js` | Amortization engine for calc #1 |
| `index.html` | Single HTML entry, has AdSense script tag |

---

## Design system (from `base.css`)

```
Light (default):
  --bg: #F2F1EA        --surface: #FAFAF6       --surface-2: #EEECEA
  --border: rgba(0,0,0,0.08)  --border-strong: rgba(0,0,0,0.16)
  --text: #0D0D10      --text-muted: rgba(13,13,16,0.42)
  --accent: #4B7B00    --accent-dim: rgba(75,123,0,0.08)   --accent-on: #F2F1EA
  --red: #E05252       --radius: 4px

Dark ([data-theme="dark"]):
  --bg: #0D0D10        --surface: #131316        --surface-2: #1D1D22
  --border: rgba(255,255,255,0.07)
  --text: #F0EFE9      --text-muted: rgba(240,239,233,0.38)
  --accent: #C9F23A    --accent-dim: rgba(201,242,58,0.10)  --accent-on: #0D0D10

Fonts: Plus Jakarta Sans (--sans), JetBrains Mono (--mono)
```

Theme toggled by setting `data-theme` attribute on `document.documentElement`.

---

## Structural template: how calc #1 is built

Each calculator consists of:
1. **A page wrapper** (`SomethingCalc.jsx`) — owns theme state, instances state, modal, topbar, ad sidebar, ad bar
2. **A calc instance** (`SomethingInstance.jsx`) — owns inputs state, calculation logic, renders inputs + results
3. **A CSS file** (`SomethingCalc.css`) — page layout + calc-specific styles (import `base.css` handles shared tokens)
4. **A lib file** (`src/lib/something.js`) — pure calculation functions, no React

The calc #1 page wrapper pattern (copy this structure for all new calcs):

```jsx
// SomethingCalc.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SomethingInstance from './SomethingInstance.jsx';
import AdUnit from './AdUnit.jsx';
import './SomethingCalc.css';

const AD_SLOT_BANNER  = 'XXXXXXXXXX';
const AD_SLOT_SIDEBAR = 'XXXXXXXXXX';

// Paste shared icon SVGs from MortgageCalc.jsx: IconBubble, IconSun, IconDisk, IconShare

const LABELS = { '': 'Scenario A', b: 'Scenario B', c: 'Scenario C' };
let _nextId = 1;

export default function SomethingCalc() {
  const [theme, setTheme] = useState('light');
  const [instances, setInstances] = useState(() => [{ id: _nextId++, key: '' }]);
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const instancesRef = useRef(null);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const copyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: 'CALC TITLE — 2176 Studios', url: window.location.href });
    } else { setModal('share'); }
  }, []);

  const isMulti = instances.length > 1;

  const addInstance = () => {
    if (instances.length >= 3) return;
    const usedKeys = new Set(instances.map(i => i.key));
    const nextKey = ['b', 'c'].find(k => !usedKeys.has(k));
    if (!nextKey) return;
    setInstances(prev => [...prev, { id: _nextId++, key: nextKey }]);
    setTimeout(() => { if (instancesRef.current) instancesRef.current.scrollTo({ left: instancesRef.current.scrollWidth, behavior: 'smooth' }); }, 50);
  };

  const removeInstance = (key) => setInstances(prev => prev.filter(i => i.key !== key));

  return (
    <div className="calc-page">
      <div className="calc-topbar">
        <Link to="/" className="calc-brand">2176 Studios<span className="brand-dot" /></Link>
        <div className="topbar-actions">
          <a className="btn-icon" title="Feedback / Support" href="mailto:support@2176studios.com"><IconBubble /></a>
          <button className="btn-icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><IconSun /></button>
          <button className="btn-icon" title="Save calculation" onClick={() => { setCopied(false); setModal('save'); }}><IconDisk /></button>
          <button className="btn-icon" title="Share calculation" onClick={handleShare}><IconShare /></button>
        </div>
      </div>

      <div className="calc-instances" data-count={instances.length} ref={instancesRef}>
        {instances.map((inst) => (
          <SomethingInstance
            key={inst.id}
            instanceKey={inst.key}
            label={LABELS[inst.key]}
            onRemove={inst.key !== '' ? () => removeInstance(inst.key) : null}
            theme={theme}
            isComparison={isMulti}
          />
        ))}
        {instances.length < 3 && (
          <button className="compare-card" onClick={addInstance}>
            <span className="compare-card-plus">+</span>
            <span className="compare-card-title">Compare</span>
            <span className="compare-card-sub">Add a new scenario for side by side comparison</span>
          </button>
        )}
      </div>

      {!isMulti && (
        <div className="ad-sidebar">
          <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
          <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
          <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
        </div>
      )}

      <div className={`ad-bar-float${!isMulti ? ' ad-bar-desktop-hide' : ''}`}>
        <AdUnit slotId={AD_SLOT_BANNER} format="horizontal" />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            {modal === 'share' && <div className="modal-icon">⤴</div>}
            <h2 className="modal-title">{modal === 'save' ? 'Save your calculation' : 'Share your calculation'}</h2>
            <p className="modal-desc">{modal === 'save' ? 'Copy this link. Open it any time to return to exactly these inputs and results.' : 'Copy this link and send it. Anyone who opens it will see the same inputs and results instantly.'}</p>
            <div className="modal-url-wrap">
              <input className="modal-url" readOnly value={window.location.href} onFocus={(e) => e.target.select()} />
            </div>
            <button className="modal-copy" onClick={copyUrl}>{copied ? '✓ Copied!' : 'Copy link'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

CSS file structure (copy `MortgageCalc.css` wholesale — all layout rules are shared, just change the heading content and any calc-specific overrides).

Instance component pattern (copy `CalcInstance.jsx` structure):
- `useState` for inputs, `useMemo` for computed results
- URL encode/decode (primary instance only syncs to `?` params — use `window.history.replaceState`)
- Renders: heading block → input panel → results panel (savings card, stat row, chart, schedule)
- `isComparison` prop controls heading/header display

---

## Files to create for each new calc

For calc N named e.g. "PayTax":
- `src/PayTaxCalc.jsx` (page wrapper)
- `src/PayTaxCalc.css` (layout CSS — copy MortgageCalc.css, adapt)
- `src/PayTaxInstance.jsx` (calc instance)
- `src/lib/paytax.js` (calculation engine)

Then add to `src/App.jsx`:
```jsx
import PayTaxCalc from './PayTaxCalc.jsx';
// ...
<Route path="/paytaxcalc" element={<PayTaxCalc />} />
```

And update `src/Home.jsx` — set `live: true` and add `href: '/paytaxcalc'` on that app's entry in the `APPS` array.

---

## The 9 remaining calculators

### #2 — Pay / Tax Calculator
**Route:** `/paytaxcalc`
**Heading line 1:** Pay / Tax Calculator
**Heading line 2:** Income Tax + Medicare + Super
**Description:** Gross to net take-home pay, Medicare levy, HECS/HELP, super guarantee.
**App card color:** `#639922` (light), `#7DBB2A` (dark), bg: `#EAF3DE`

**Inputs:**
- Annual gross income ($)
- Income type: Employee / Self-employed / Sole trader
- Income frequency for display: Annual / Monthly / Fortnightly / Weekly
- Residency: Australian resident / Foreign resident / Working Holiday
- Medicare levy surcharge: Yes / No (private hospital cover)
- HECS/HELP debt: None / Amount ($)
- Employer super guarantee rate (default 11.5%)
- Salary sacrifice to super ($)
- Tax offsets: Low Income Tax Offset (auto), Low and Middle Income Tax Offset where applicable

**2025–26 Australian tax brackets (residents):**
- $0–$18,200: 0%
- $18,201–$45,000: 19c per $1 over $18,200
- $45,001–$120,000: $5,092 + 32.5c per $1 over $45,000
- $120,001–$180,000: $29,467 + 37c per $1 over $120,000
- $180,001+: $51,667 + 45c per $1 over $180,000

Medicare levy: 2% of taxable income (phased in below $26,000 for singles).
Medicare Levy Surcharge (if no private cover): 1%/1.25%/1.5% depending on income tier.

LITO: Max $700 offset; reduces at 5c per $1 above $37,500, then at 1.5c per $1 above $45,000. Zero above $66,667.
LMITO: No longer applies from 2022–23 onwards (do not include).

HECS/HELP repayment thresholds 2024–25:
- Below $54,435: 0%
- $54,435–$62,850: 1%
- $62,851–$66,620: 2%
- $66,621–$70,618: 2.5%
- $70,619–$74,855: 3%
- $74,856–$79,346: 3.5%
- $79,347–$84,107: 4%
- $84,108–$89,154: 4.5%
- $89,155–$94,503: 5%
- $94,504–$100,174: 5.5%
- $100,175–$106,185: 6%
- $106,186–$112,556: 6.5%
- $112,557–$119,309: 7%
- $119,310–$126,468: 7.5%
- $126,469–$134,057: 8%
- $134,058–$142,100: 8.5%
- $142,101–$150,626: 9%
- $150,627–$159,664: 9.5%
- $159,665+: 10%

Super guarantee: employer pays `grossIncome * superRate` on top of salary (not from salary unless salary sacrifice).

**Outputs:**
- Big number: annual take-home (net pay)
- Frequency toggle to show monthly/fortnightly/weekly take-home
- Breakdown bar or stat cards: Gross income | Income tax | Medicare | HECS repayment | Net super | Take-home
- Effective tax rate %
- Marginal tax rate %
- Pie or bar chart: breakdown of where income goes

---

### #3 — Novated Lease Calculator
**Route:** `/novatedleasecalc`
**Heading line 1:** Novated Lease Calculator
**Heading line 2:** EV & ICE Tax Savings vs. Buying Outright
**Description:** EV and car novated lease tax savings vs. buying outright and claiming KMs.
**App card color:** `#BA7517` (light), `#D9931E` (dark), bg: `#FAEEDA`

**Inputs:**
- Vehicle price ($)
- Is EV/PHEV eligible for FBT exemption: Yes / No
- Lease term: 1–5 years
- Annual KMs driven
- Gross annual salary ($)
- Employer super rate (default 11.5%)
- Balloon / residual (auto-calculated per ATO guidelines, or manual override)
- Running costs included in lease: fuel/charging, registration, insurance, servicing (per year)
- Finance rate for lease (% p.a.)

**Key calculations:**
- **FBT-exempt EV route:** Under the Treasury Laws Amendment (Electric Car Discount) Act, EVs and PHEVs under the luxury car tax threshold (~$89,332 for 2024–25) are FBT-exempt when novated. The entire lease payment + running costs come from pre-tax salary. Tax saving = (lease cost + running costs) × marginal tax rate.
- **Non-EV novated:** Subject to FBT. FBT base value = vehicle list price × 20% (statutory method). FBT = base × 2.0802 × 47%. Employee contribution can reduce FBT.
- **Buy outright comparison:** Cents-per-KM method (88c/km up to 5000km) or logbook method. Show post-tax cost of ownership vs. novated pre-tax cost.
- ATO residual value guidelines (% of drive-away price): 1yr=65.63%, 2yr=56.25%, 3yr=46.88%, 4yr=37.5%, 5yr=28.13%

**Outputs:**
- Annual tax saving ($)
- Total saving over lease term ($)
- Out-of-pocket per fortnight (post-tax salary reduction net of tax saving)
- Comparison table: Novated vs. Buy outright vs. Chattel mortgage

---

### #4 — Borrowing Power Calculator
**Route:** `/borrowingpowercalc`
**Heading line 1:** Borrowing Power Calculator
**Heading line 2:** Income, Debts & HECS Impact
**Description:** Income, expenses, existing debts and HECS impact on your max loan estimate.
**App card color:** `#D85A30` (light), `#E8754F` (dark), bg: `#FAECE7`

**Inputs:**
- Applicant type: Single / Joint
- Gross annual income — applicant 1 ($); if joint, applicant 2 ($)
- Employment type: PAYG / Self-employed / Casual
- Other income: rental, dividends, etc. ($)
- Monthly expenses (living expenses estimate — use HEM as floor)
- Existing debts: credit card limits ($) [lenders use 3% of limit monthly], personal loans (monthly), car loans (monthly), HECS/HELP debt (monthly — auto-calc from income)
- Number of dependants
- Interest rate for assessment (default: apply a 3% serviceability buffer above input rate per APRA)
- Loan term (default 30 years)
- Repayment type: Principal & Interest / Interest Only

**Key calculations:**
- Net income after tax (use tax calc logic from #2)
- APRA serviceability buffer: add 3% to the actual rate (floor at 3% above rate)
- Household Expenditure Measure (HEM): use simplified HEM lookup — single ~$2000/mo, couple ~$2,800/mo, add ~$500/dependant. Take the higher of user-entered expenses or HEM.
- Monthly surplus = net income − HEM/expenses − existing debt repayments
- Max borrowing = surplus / monthly repayment factor at buffered rate
- Show sensitivity: ±0.5% rate change impact on borrowing power

**Outputs:**
- Big number: estimated borrowing power
- Breakdown: what's eating into your capacity (expenses, debts, HECS)
- Sensitivity table: borrowing power at ±1%, ±0.5%, ±0.25% of entered rate

---

### #5 — First Home Super Saver (FHSSS) Calculator
**Route:** `/fhssscalc`
**Heading line 1:** First Home Super Saver
**Heading line 2:** FHSSS Scheme Calculator
**Description:** Extra withdrawable super amount for a first home deposit via voluntary contributions.
**App card color:** `#378ADD` (light), `#5BA4E8` (dark), bg: `#E6F1FB`

**Inputs:**
- Annual gross income ($)
- Planned annual voluntary contributions — concessional (pre-tax, salary sacrifice) ($)
- Planned annual voluntary contributions — non-concessional (after-tax) ($)
- Number of years contributing
- Current super balance (to check if near caps)
- Whether first home buyer: always yes for FHSSS

**Key rules (2024–25):**
- Concessional contributions (including employer SG) cap: $30,000/year
- FHSSS max releasable: $15,000 per year, $50,000 lifetime
- Concessional contributions taxed at 15% inside super (vs. marginal rate outside)
- Notional earnings rate: ATO shortfall interest charge rate (approx 7.14% p.a. — use as constant or let user override)
- On withdrawal: taxed at marginal rate less a 30% offset (i.e. tax = (marginalRate − 30%) × amount)
- Non-concessional contributions come out tax-free

**Outputs:**
- Total FHSSS releasable amount (over contribution period)
- Tax saving vs. saving outside super (marginal rate saving net of withdrawal tax)
- Net deposit amount after withdrawal tax
- Year-by-year accumulation table
- Warning if contributions exceed annual or lifetime caps

---

### #6 — Retirement / Super Projection Calculator
**Route:** `/retirementcalc`
**Heading line 1:** Retirement Calculator
**Heading line 2:** Super Balance Projection to 65
**Description:** Current balance, contributions, employer match and compound growth to 65.
**App card color:** `#7F77DD` (light), `#9E98E8` (dark), bg: `#EEEDFE`

**Inputs:**
- Current age
- Retirement age (default 65)
- Current super balance ($)
- Annual gross salary ($)
- Employer SG rate (default 11.5%)
- Additional personal contributions ($, pre-tax or post-tax — toggle)
- Expected annual investment return (default 7%)
- Inflation rate (default 2.5%) — for real vs nominal toggle
- Account fees (% of balance per year, default 0.5%)
- Age Pension eligibility: auto-calculate based on projected balance vs. assets test

**Key calculations:**
- Monthly compounding: balance = balance × (1 + monthlyReturn) + monthlyContributions × (1 − 0.15)
- Concessional contributions taxed at 15%; non-concessional untaxed on the way in
- SG rate: schedule to 12% by 1 Jul 2025 (already 11.5% for 2024–25)
- Age Pension assets test (homeowner singles, 2024–25): full pension below $301,750; tapers; nil above $674,000 approx
- Show both nominal and inflation-adjusted (real) projections

**Outputs:**
- Big number: projected balance at retirement age
- Annual drawdown sustainable (4% rule or user-defined %)
- Comparison: with vs. without additional contributions
- Chart: balance growth year by year, two lines (with/without extra)
- Milestone ages (50, 55, 60, 65) on chart

---

### #7 — Rent vs. Buy Calculator
**Route:** `/rentvbuycalc`
**Heading line 1:** Rent vs. Buy Calculator
**Heading line 2:** True Cost Comparison
**Description:** Stamp duty, opportunity cost of deposit, rent vs. property growth assumptions.
**App card color:** `#1D9E75` (light), `#27C491` (dark), bg: `#E1F5EE`

**Inputs:**
- Property purchase price ($)
- State (for stamp duty): NSW / VIC / QLD / SA / WA / TAS / ACT / NT
- First home buyer (stamp duty concessions)
- Deposit amount ($)
- Mortgage interest rate (%)
- Loan term (years)
- Annual property growth rate (default 4%)
- Annual rent ($)
- Annual rent increase (default 3%)
- Investment return on deposit if renting instead (default 7%)
- Ongoing ownership costs: council rates, strata/body corp, insurance, maintenance (per year)
- Selling costs (agent commission default 2%)
- Years of comparison (1–30)

**Stamp duty rates (simplified — use published 2024–25 rates for each state):**

NSW (general): $0–$16k: 1.25%; $16k–$35k: $200+1.5%; $35k–$93k: $485+1.75%; $93k–$351k: $1,500+3.5%; $351k–$1.168M: $10,530+4.5%; $1.168M+: $47,295+5.5% (foreign surcharge extra)

VIC (general): $0–$25k: 1.4%; $25k–$130k: $350+2.4%; $130k–$960k: $2,870+6%; $960k+: flat $55,000+6.5% — but for PPR under $550k, concession rates apply; use 2024–25 schedule.

QLD: $0–$5k: 0; $5k–$75k: 1.5c/$1; $75k–$540k: $1,050+3.5%; $540k–$1M: $17,325+4.5%; $1M+: $38,025+5.75%

Other states: Use standard published rates. Keep a reasonable approximation — this is an estimator, not a legal tool.

First home buyer: Most states offer a grant or duty concession below certain price thresholds. NSW: duty-free below $800k; VIC: duty-free below $600k, 50% concession $600k–$750k; QLD: rebate up to $8,750 for new homes under $750k; others simplified.

**Key calculations:**
- Buying total cost of ownership over N years: mortgage interest + principal + stamp duty + ongoing costs − property appreciation
- Renting total cost: rent paid + opportunity cost of foregone deposit returns − any savings from lower outgoings
- Net wealth gap: property equity vs. renter's invested deposit+savings at end of period
- Break-even year: when buying starts to win

**Outputs:**
- Big number: net wealth difference at selected year
- Slider for comparison year
- Chart: renter wealth vs. buyer equity over time
- Key summary: break-even year, total interest paid, total rent paid, projected property value

---

### #8 — Capital Gains Tax Calculator
**Route:** `/cgtcalc`
**Heading line 1:** Capital Gains Tax Calculator
**Heading line 2:** CGT Discount + Marginal Rate
**Description:** Purchase price, holding period, 50% CGT discount and marginal tax rate.
**App card color:** `#D4537E` (light), `#E87099` (dark), bg: `#FBEAF0`

**Inputs:**
- Asset type: Property / Shares / Crypto / Other
- Purchase price ($)
- Purchase date (month/year — to determine holding period)
- Sale price ($)
- Sale date (month/year)
- Purchasing costs (stamp duty, brokerage, legal — $)
- Sale costs (agent fees, brokerage — $)
- Capital improvements / additional cost base items ($)
- Gross annual income ($) — to determine marginal rate
- Any carry-forward capital losses ($)
- Residency: Australian resident / Foreign resident (no CGT discount)

**Key calculations:**
- Net capital gain = sale price − purchase price − costs + improvements
- If held > 12 months and Australian resident: 50% CGT discount applies
- Assessable gain = net gain × (1 − 0.5 if eligible)
- Taxable income = regular income + assessable gain
- Tax on total income (using 2025–26 brackets)
- CGT payable = tax on total income − tax on regular income alone
- Effective CGT rate = CGT payable / net capital gain

**Outputs:**
- Net capital gain before discount
- Assessable gain (after discount)
- CGT payable ($)
- Effective CGT rate (%)
- After-tax proceeds from sale
- Breakdown: what marginal bracket the gain pushes into

---

### #9 — Redundancy / Termination Pay Calculator
**Route:** `/redundancycalc`
**Heading line 1:** Redundancy Pay Calculator
**Heading line 2:** Termination + Tax-Free Threshold
**Description:** Base pay, years of service, notice period, leave payout and tax-free threshold.
**App card color:** `#E24B4A` (light), `#E86665` (dark), bg: `#FCEBEB`

**Inputs:**
- Weekly gross pay ($)
- Years of continuous service (years + months)
- Employment type: Award / Enterprise agreement / Contractual — select
- Reason for termination: Genuine redundancy / Resignation / Dismissal / Redundancy (not genuine)
- Unused annual leave (days)
- Unused long service leave (days, if applicable)
- Notice period paid in lieu: weeks
- Age at termination
- Gross annual income year of termination ($)

**Key calculations:**
NES minimum redundancy pay (Fair Work Act, genuine redundancy):
- 1–2 years: 4 weeks
- 2–3 years: 6 weeks
- 3–4 years: 7 weeks
- 4–5 years: 8 weeks
- 5–6 years: 10 weeks
- 6–7 years: 11 weeks
- 7–8 years: 13 weeks
- 8–9 years: 14 weeks
- 9–10 years: 16 weeks
- 10+ years: 12 weeks (drops to 12 — NES cap)

Tax treatment:
- Genuine redundancy: tax-free component = $12,524 + ($6,264 × completed years of service) [2024–25 ATO amounts]
- Amount above tax-free component taxed at 32% (concessional rate) up to $235,000 or marginal rate
- Annual leave payout: taxed at marginal rate as regular income
- Long service leave (for accrual before 18 Aug 1978): concessional; after: marginal
- Notice in lieu: taxed at marginal rate

**Outputs:**
- Total termination payment breakdown
- Tax-free component
- Tax payable on each component
- Net take-home from redundancy
- Stat cards: redundancy pay, leave payout, notice pay, total gross, total tax, net

---

### #10 — Salary Sacrifice Calculator
**Route:** `/salarysacrificecalc`
**Heading line 1:** Salary Sacrifice Calculator
**Heading line 2:** Super + Pre-Tax Savings
**Description:** Tax saved vs. take-home hit, modelled against the $30k concessional cap.
**App card color:** `#888780` (light), `#AAAAAA` (dark), bg: `#F1EFE8`

**Inputs:**
- Gross annual salary ($)
- Current employer SG contribution ($, auto-calculated but editable)
- Proposed salary sacrifice amount ($ per year — pre-tax to super)
- Any other salary sacrifice (novated lease, etc.) ($ per year)
- Age (to check catch-up concessional contribution rules)
- Super balance (to check carry-forward rules if under $500k)

**Key calculations:**
- Concessional contributions = SG + salary sacrifice + any other salary sacrifice
- Cap: $30,000/year (2024–25). Warn if exceeded.
- Tax saving = sacrifice amount × (marginal rate − 0.15) [15% super tax vs. marginal rate]
- Net take-home reduction = sacrifice − tax saving (the "real" cost)
- Carry-forward: if super balance under $500k and concessional contributions unused in prior years, can use carry-forward (calculate up to 5-year lookback at $27,500 cap for prior years)
- Show effective hourly/fortnightly cost of the sacrifice

**Outputs:**
- Annual tax saving
- Net reduction in take-home pay
- Effective cost per pay period
- Chart: cumulative super balance growth with vs. without sacrifice (10/20/30 year horizon)
- Warning card if hitting the $30k cap

---

## Shared component patterns to reuse

### URL state sync (use in every primary instance)
```js
useEffect(() => {
  if (instanceKey !== '') return;
  const qs = encodeInputs(inputs);
  window.history.replaceState(null, '', `${window.location.pathname}?${qs}`);
}, [inputs, instanceKey]);
```

### Heading block (single vs comparison mode)
```jsx
{!isComparison ? (
  <div className="calc-heading">
    <h1>CALC NAME<br /><span className="calc-heading-sub">SUBTITLE</span></h1>
    <p>SHORT DESCRIPTION</p>
    <a className="desktop-cta" href={...} target="_blank" rel="noreferrer">Open desktop site to compare →</a>
  </div>
) : (
  <div className="calc-heading calc-heading--compact">
    <h2>CALC SHORT NAME</h2>
  </div>
)}
```

### Scenario header (comparison mode)
```jsx
{isComparison && (
  <div className="instance-header">
    <span className="instance-label">{label}</span>
    <button className="instance-remove" onClick={onRemove || undefined} title="Remove scenario"
      style={!onRemove ? { visibility: 'hidden', pointerEvents: 'none' } : {}}>×</button>
  </div>
)}
```

### Big result number
Use `.savings-card` / `.savings-amount` class from `MortgageCalc.css` — these are already defined. The accent-coloured big number with label and subtitle.

### Stat row
Use `.stat-row` + `.stat-card` for 2–4 key numbers across a row.

### Chart
Recharts `LineChart` / `BarChart` is already a dep. Use the same theme-aware color vars as in CalcInstance.jsx:
```js
const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
```

---

## What NOT to do

- Do not modify `base.css`, `main.jsx`, `AdUnit.jsx`, `App.jsx` (only add routes to App.jsx), or any existing calc files.
- Do not add TypeScript.
- Do not add a test suite.
- Do not add extra npm packages. Recharts is already available for charts. No charting lib needed.
- Do not add comments explaining what code does — only add a comment when the WHY is non-obvious.
- All calc figures are Australian — use ATO/Treasury 2024–25 figures throughout.
- Keep the disclaimer on every calc: "Estimates only — not financial advice. For personal financial decisions, consult a licensed adviser."

---

## Commit and deploy

After each calculator is working:
```bash
cd "/home/user/2176 studios"
git add web/src/
git commit -m "Add [calc name] calculator (#N)"
git push
```

Cloudflare Pages auto-deploys from `main`. Check `2176studios.com` after each push.

All `AD_SLOT_*` constants should stay as `'XXXXXXXXXX'` — real slot IDs will be added later once AdSense is approved.

---

## Build order recommendation

Build in this order — simpler calcs first, calcs that share logic later:
1. #2 Pay / Tax (standalone, clean inputs → outputs, good warm-up)
2. #8 CGT (uses tax calc logic from #2 — build after)
3. #9 Redundancy (uses tax logic, but mostly lookup tables)
4. #10 Salary Sacrifice (uses tax logic from #2)
5. #5 FHSSS (uses tax logic, clear rules)
6. #6 Retirement / Super (compound growth, straightforward)
7. #4 Borrowing Power (uses tax logic, HEM lookup)
8. #3 Novated Lease (most complex — FBT rules)
9. #7 Rent vs. Buy (state-by-state stamp duty table)

---

## Final checklist before calling a calc done

- [ ] Route added to `App.jsx`
- [ ] Home.jsx `APPS` entry has `live: true` and correct `href`
- [ ] URL state sync works (paste URL in new tab restores inputs)
- [ ] Theme toggle works (light/dark)
- [ ] Compare mode works (up to 3 instances side by side)
- [ ] Mobile layout renders without horizontal scroll
- [ ] Disclaimer present on every calc
- [ ] AdUnit placeholders in place (inline, chart, sidebar, bar)
- [ ] No console errors
