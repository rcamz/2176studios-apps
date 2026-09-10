# 2176 Studios — Calculator Suite Audit

**Date:** 9 September 2026
**Scope:** All 12 calculators, shared infrastructure, build config, `core/` workspace
**Method:** Full read of 11 calculation libs, 12 instance components, 12 wrappers, CSS, build config
**Nature:** Analysis only — no code changed

---

## Confidence legend

Tax figures in this suite were written by a model with an **August 2025 knowledge cutoff**, which is why every rate file is commented "2026-27 estimated." This audit is written with a **May 2026 cutoff**, so several of those estimates can now be checked against what was actually legislated. Every rate finding is tagged:

| Tag | Meaning |
|---|---|
| **[LEGISLATED]** | Passed into law. The code is definitively wrong if it disagrees. |
| **[INDEXED]** | Annual indexation. I know the 2025-26 figure; 2026-27 is a projection. |
| **[UNKNOWN]** | Genuinely not determinable. Flagged so it isn't presented as fact. |

---

## Executive summary

The suite is **structurally excellent and numerically unreliable.** The component architecture, URL-state pattern, theming and visual language are consistent and well-built — genuinely good work that scales. The problem is underneath: the tax engine encodes rates that were superseded before this code was written, and ten of the twelve calculators were produced in a single pass with no review, leaving dead inputs, unreachable code and at least three arithmetic errors that produce confidently-wrong numbers.

**The ten things that matter most:**

| # | Finding | Where | Severity |
|---|---|---|---|
| 1 | Income tax brackets use 16% for the bottom rate; **15% is legislated for 2026-27** | `paytax.js` → 6 calcs | 🔴 Critical |
| 2 | HECS uses the **abolished** pre-2025-26 system — up to **3× too high**, invents repayments below $67k | `paytax.js` → 3 calcs | 🔴 Critical |
| 3 | Salary sacrifice ignores **Division 293** — overstates benefit ~2× for $250k+ earners | `salarysacrifice.js` | 🔴 Critical |
| 4 | Borrowing Power **collects HECS balances and ignores them** — two dead inputs | `borrowingpower.js` | 🔴 Critical |
| 5 | FHSSS notional-earnings formula is **mathematically arbitrary** (overwrites, decaying multiplier) | `fhsss.js` | 🔴 Critical |
| 6 | Health chart **contradicts its own headline** when the safety floor engages; weight-gain shows negative kg/wk | `health.js` | 🔴 Critical |
| 7 | Rent v Buy: **QLD, SA, ACT, TAS first-home rules wrong or absent**; NSW brackets ~3 years stale | `rentvbuy.js` | 🔴 Critical |
| 8 | Novated Lease treats **PHEVs as FBT-exempt** — exemption ended 1 April 2025 | `novatedlease.js` | 🔴 Critical |
| 9 | **62 numeric fields** silently revert `0` → default on URL reload | All 12 | 🟠 High |
| 10 | `core/` declares itself "single source of truth for tax rates" and holds **2023-24 rates with a 32.5% bracket** | `core/src/tax/auTax.js` | 🟠 High |

**Two things that would prevent all of this recurring:** a golden-value test suite (there are currently **zero tests**), and a single dated rates module that every calculator imports.

---

# Part A — Cross-cutting findings

## A1. Tax data accuracy

### A1.1 Income tax brackets — bottom rate should be 15% 🔴 **[LEGISLATED]**

`lib/paytax.js` uses:

```js
{ from: 18200,  rate: 0.16, base: 0 },
{ from: 45000,  rate: 0.30, base: 4288 },
{ from: 135000, rate: 0.37, base: 31288 },
{ from: 190000, rate: 0.45, base: 51638 },
```

These are the **2024-25 / 2025-26** Stage 3 rates. The *Treasury Laws Amendment (Cost of Living—Tax Cuts) Act 2025* legislated two further cuts to the bottom marginal rate:

- **From 1 July 2026 (2026-27): 16% → 15%**
- From 1 July 2027 (2027-28): 15% → 14%

Correct 2026-27 resident brackets and cumulative base amounts:

| Threshold | Rate | Base | Code has |
|---|---|---|---|
| $0 – $18,200 | Nil | 0 | ✅ |
| $18,201 – $45,000 | **15%** | 0 | ❌ 16% |
| $45,001 – $135,000 | 30% | **$4,020** | ❌ $4,288 |
| $135,001 – $190,000 | 37% | **$31,020** | ❌ $31,288 |
| $190,001+ | 45% | **$51,370** | ❌ $51,638 |

**Impact:** a flat **$268/yr overstatement of tax** for everyone earning above $45,000. Not enormous per person, but it is the headline number of the flagship tax calculator, and it propagates into CGT, Redundancy, Salary Sacrifice, FHSSS, Novated Lease and Borrowing Power, all of which import `calcPayTax`.

**Recommendation:** correct to 15%, and structure the brackets so 2027-28's 14% is a one-line change. Working Holiday Maker rates keep their own 15% first bracket and are unaffected. Foreign-resident rates are correct as written.

---

### A1.2 HECS/HELP uses an abolished system 🔴 **[LEGISLATED]** — biggest numeric error in the suite

`paytax.js` implements the **old** HELP model: a percentage applied to *total* repayment income, with 18 brackets starting at $58,500.

That system was replaced from **1 July 2025**. The current model is **marginal** — you repay a percentage only of income *above* each threshold:

| Repayment income | Repayment |
|---|---|
| $0 – $67,000 | Nil |
| $67,001 – $125,000 | 15% of the amount over $67,000 |
| $125,001+ | $8,700 + 17% of the amount over $125,000 |

*(The $67,000 threshold is 2025-26; for 2026-27 it indexes to roughly $69,000–70,000 — **[INDEXED]**.)*

**Impact is severe and worst at low incomes:**

| Repayment income | Code says | Legislated | Error |
|---|---|---|---|
| $60,000 | $600 | **$0** | Invents a repayment that doesn't exist |
| $70,000 | $1,750 | **$450** | **289% too high** |
| $80,500 | $2,818 | **$2,025** | 39% too high |
| $120,000 | $8,400 | **$7,950** | 6% too high |

A graduate on $70k is told they lose $1,750/yr to HECS when the real figure is $450. That is a $1,300 error in the take-home number the whole calculator exists to produce.

**Also missing:** the **20% HELP debt reduction** applied to balances as at 1 June 2025. Users entering their current balance may already have had it applied; users entering an older figure won't. Worth a note.

---

### A1.3 Salary sacrifice and reportable super are added back for HECS and MLS 🔴 **[LEGISLATED]**

`calcPayTax` computes `taxableIncome = grossIncome − salarySacrifice`, then uses that figure for **HECS repayment income** and **MLS income**. Both are wrong.

- **HELP repayment income** = taxable income **+ reportable employer super contributions** + reportable fringe benefits + net investment losses + exempt foreign income.
- **MLS income** uses the same add-backs.

So salary sacrifice does **not** reduce your HECS repayment or your MLS exposure. The calculator currently says it does.

This is not a rounding issue — it's a **widely-held misconception that the calculator is actively reinforcing.** "Sacrifice to super to dodge HECS" is common bad advice, and a good calculator should be the thing that corrects it.

**Recommendation:** compute a separate `repaymentIncome = taxableIncome + salarySacrifice + reportableFringeBenefits` and use it for both HECS and MLS. Surface it in the UI as its own line — it's a genuinely useful teaching moment and a differentiator.

---

### A1.4 Rate figures — indexed values

| Item | Code | Actual (latest known) | Verdict |
|---|---|---|---|
| SG rate | 12% | 12% (from 1 Jul 2025, no further increases legislated) | ✅ **Correct** |
| LITO | $700, taper 5c then 1.5c | Matches exactly | ✅ **Correct** |
| Foreign resident brackets | 30/37/45 | Correct | ✅ **Correct** |
| WHM brackets | 15/30/37/45 | Correct | ✅ **Correct** |
| Concessional cap | $30,000 | $30,000 (2024-25, 2025-26) | ⚠️ May index to $32,500 — **[UNKNOWN]** |
| Medicare low-income threshold | $27,069 | $27,222 (2024-25) | ⚠️ Below even the 2024-25 figure — **[INDEXED]** |
| MLS tiers | $100k/$116k/$155k | $101k/$118k/$158k (2025-26) | ⚠️ Close; should be higher for 26-27 — **[INDEXED]** |
| Genuine redundancy tax-free | $13,462 + $6,734/yr | $13,100 + $6,552 (2025-26) | ✅ Plausible 26-27 projection |
| ETP cap | **$235,000** | ~$245k (24-25), ~$260k (25-26) | ❌ **2-3 years stale** — **[INDEXED]** |
| LCT fuel-efficient threshold | $91,000 | $91,387 (2025-26) | ✅ Close — **[INDEXED]** |
| Cents per km | 88c | 88c (24-25, 25-26) | ✅ Correct |
| FBT gross-up | 2.0802 | Type 1 = 2.0802 ✅ | ⚠️ **Comment says "type 2"** — value right, label wrong (Type 2 = 1.8868) |
| ATO residual values | 65.63/56.25/46.88/37.5/28.13 | Correct | ✅ **Correct** |
| ETP concessional rates | 32% / 17% | Correct (incl. 2% Medicare) | ✅ **Correct** |

---

### A1.5 Missing tax concepts across the suite

| Concept | Should appear in | Consequence of absence |
|---|---|---|
| **Division 293** (extra 15% on concessional contributions when income + contributions > $250,000) | Salary Sacrifice, Retirement, FHSSS, Novated Lease | High earners told they save marginal−15% when the real figure is marginal−30% |
| **Reportable fringe benefits** flow-through | Novated Lease → MLS, HECS, Div 293, FTB, child support | The single biggest real-world novated-lease gotcha is invisible |
| **Whole-of-income cap** ($180,000) | Redundancy (non-genuine ETPs) | Non-genuine redundancy taxed too favourably |
| **Carry-forward concessional cap** (5 yrs, balance < $500k) | Salary Sacrifice, FHSSS | A major planning lever is missing |
| **Main residence CGT exemption** | CGT, Rent v Buy | Rent v Buy structurally understates the case for buying |
| **Preservation age lock** (60) | Salary Sacrifice, Retirement, FHSSS | "You save $X" with no mention the money is inaccessible for decades |

---

## A2. Systemic correctness bugs

### A2.1 Zero values silently revert to defaults — 62 fields 🟠

Every calculator decodes URL params as:

```js
monthlyContribution: parseFloat(p.get('mc')) || 500,
```

`parseFloat('0')` is `0`, and `0 || 500` is **`500`**. So any field whose default is non-zero **cannot be set to zero across a page reload or a shared link.**

Verified: **62 numeric fields** across the suite. Real examples:

- Savings: set monthly contribution to `$0` (lump-sum-only scenario) → reload → back to `$500`
- Borrowing Power: set credit card limits to `$0` → reload → back to `$10,000`, cutting borrowing power by ~$50k
- Retirement: set extra contributions to `$0` (the natural baseline) → reload → back to `$5,000`
- Novated Lease: set running costs to `$0` → reload → back to `$5,000`

This breaks the **Save/Share feature**, which is a headline capability with its own toolbar button and modal. A shared link can silently show the recipient different numbers than the sender saw.

**Fix:** one helper, used everywhere.

```js
const num = (v, fallback) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };
```

Note the mortgage calc already recognised this problem and reached for `??` on two fields (`offsetStart`, `offsetMonthly`) — but `parseFloat` returns `NaN`, not `null`, and `NaN ?? x` is `NaN`. So those two are broken in the opposite direction: a malformed URL yields `NaN` and renders `$NaN`. Both need the same helper.

---

### A2.2 Dead inputs — collected from the user, then ignored 🔴

| Input | Calculator | What happens |
|---|---|---|
| `hecsBalance1`, `hecsBalance2` | Borrowing Power | Never passed to `calcPayTax`. HECS is always $0. UI shows a "HECS repayment /mo" stat card permanently reading **$0**. |
| `superBalance` | FHSSS | Destructured, never referenced. |
| `sgRate` | Novated Lease | Destructured, never referenced. |
| `otherSacrifice` | Salary Sacrifice | Feeds the cap warning but **not** the tax calc. Entering $20k of novated lease changes the warning and nothing else. |
| `repaymentType` | Borrowing Power | Destructured, never used, not even URL-encoded. Interest-only isn't modelled. |
| `leaseBalloon` | Novated Lease | Destructured, never used. |
| `employmentType: 'casual'` | Borrowing Power | UI option exists; lib only branches on `'self-employed'`. Casual behaves as PAYG. |
| `terminationReason` (3 of 4 options) | Redundancy | Lib only branches on `'redundancy'`. Resignation, dismissal and non-genuine all take one path. |

These are worse than missing features — the user provides information, watches nothing change, and reasonably concludes the tool is broken or that their input genuinely doesn't matter.

---

### A2.3 Dead and unreachable code 🟠

**`salarysacrifice.js:36-38` — a literal no-op:**

```js
const carryForwardAvailable = superBalance < 500000
  ? Math.max(0, CONCESSIONAL_CAP * 5 - (CONCESSIONAL_CAP * 5))  // X - X = 0. Always.
  : 0;
```

Always `0`, and never returned. Carry-forward is a genuinely valuable feature; this is a placeholder that looks like an implementation.

**`SavingsInstance.jsx:179-184` — unreachable "goal unreachable" message:**

```js
const goalStr = goalMonths !== null ? [...].join(' ') || '< 1 month' : null;
...
{goalStr !== null && (
  <div className="rate-callout">
    <strong>Goal: {fmt(inputs.goalAmount)} reached in {goalStr}</strong>
    {goalMonths === null ? 'Goal cannot be reached...' : ''}   // ← unreachable
  </div>
)}
```

If `goalMonths` is `null`, `goalStr` is also `null`, so the whole block doesn't render and the message never shows. **A user with an impossible savings goal gets no feedback at all** — the callout just vanishes. This is exactly the case where feedback matters most.

**Also dead:** `finalPropertyValue` (rentvbuy.js:167), `employeeContrib` (novatedlease.js:60), `SG_RATE` (retirement.js:3), `milestoneAges` (computed in retirement.js, UI hardcodes `[50,55,60]` instead), `totalTaxSaving` (fhsss.js — computed, never displayed; a *second* competing total sits beside it as `totalConSaving`).

---

### A2.4 Marginal-rate shortcuts vs. proper bracket-crossing ⚠️

Two different techniques are used to tax a lump sum, and only one is right.

**Correct** (`cgt.js`) — differencing:
```js
const taxOnIncomeAlone   = calcPayTax({ grossIncome }).incomeTax;
const taxOnIncomeAndGain = calcPayTax({ grossIncome: grossIncome + gain }).incomeTax;
const cgtPayable = taxOnIncomeAndGain - taxOnIncomeAlone;
```

**Incorrect** (`redundancy.js`, `novatedlease.js`, `fhsss.js`) — flat marginal rate:
```js
const annualLeaveTax = annualLeavePay * getMarginalRate(grossAnnualIncome + annualLeavePay);
```

Applying a single marginal rate to an entire lump sum mis-states tax whenever the payment straddles a bracket. Someone on $130k receiving a $20k leave payout crosses the $135k boundary — the flat method applies 37% to all $20k, when the first $5k is taxed at 30%.

**Recommendation:** extract the differencing approach into a shared `taxOnAdditionalIncome(baseIncome, extraIncome, opts)` helper and use it everywhere. This is the kind of thing that belongs in a shared core.

---

## A3. Consistency drift

Mortgage and Pay/Tax are the reference implementations. Measuring the other ten against them:

| Dimension | Mortgage / Pay-Tax | The other 10 | Impact |
|---|---|---|---|
| **CSS** | `MortgageCalc.css` | 11 **byte-identical** copies (`md5: f8a93f39…`), 782 lines each | ~9,400 duplicated lines shipped. One design change = 12 edits. |
| **Compare mode** | Up to 3 scenarios | None | Reasonable, but Rent v Buy, Borrowing Power and Retirement are all natural compare candidates. |
| **Desktop CTA** | Present | Absent | Consistent with no-compare, but see below. |
| **`fmtPct`** | `.toFixed(1)` | Redundancy uses `.toFixed(0)` | `32%` vs `32.0%` on otherwise identical cards. |
| **`fmtShort`** | 1 impl | **4 divergent impls** | See below. |
| **Sidebar ads** | 3 units | 2 units | Cosmetic. |
| **Chart type for a breakdown** | Pay/Tax uses a waterfall | Redundancy uses a plain bar chart that mixes gross components with tax *and* net in one axis — visually double-counts | Redundancy should be a waterfall. |

### A3.1 `fmtShort` — four implementations, two of them buggy

```js
// BorrowingPower  — 2dp on millions, NO sub-$1000 branch
n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : `$${Math.round(n/1000)}k`
// RentVBuy       — 1dp on millions, NO sub-$1000 branch
n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : `$${Math.round(n/1000)}k`
// Savings / Retirement / SalarySacrifice — 1dp, HAS sub-$1000 branch
// CalcInstance   — 2dp, HAS sub-$1000 branch
```

Two consequences:
1. **`$1.25M` on one page, `$1.2M` on another** for the same number.
2. Borrowing Power and Rent v Buy render **any value under $1,000 as `$0k`**. A borrowing power of $800 (plausible with high expenses) displays as **`$0k`**.

### A3.2 The `?vd=1` desktop-mode hack is broken on Pay/Tax 🟠

`index.html` contains:
```js
if (new URLSearchParams(location.search).has('vd')) {
  document.querySelector('meta[name=viewport]').content = 'width=1280';
}
```

Mortgage appends the flag correctly:
```jsx
href={window.location.href + (window.location.search ? '&vd=1' : '?vd=1')}
```

Pay/Tax does not:
```jsx
href={window.location.href}   // ← no vd=1
```

So on mobile, Pay/Tax's *"Open desktop site to compare up to 3 scenarios →"* opens an identical mobile-width page. The advertised feature doesn't work. Since compare is the marquee feature of that calculator, this is worth fixing regardless of everything else.

*(Secondary: `vd` ends up in shared URLs, forcing desktop layout on recipients' phones.)*

### A3.3 Undefined CSS variable

`CalcInstance.jsx:379` uses `var(--surface-alt)`. That token **is not defined** in `base.css` or any calc CSS. The adjacent code path (line 352, the `%` split mode) correctly uses `var(--surface-2)`. So the two split modes render read-only inputs differently — one grey, one transparent.

Also: `base.css` defines `--red: #E05252`, but every chart hardcodes `#E87070` / `#D85A30` instead. The token is defined and universally ignored. There are no `--green` / `--amber` tokens at all, and each of the 12 instances re-declares the same five chart colour constants — 60 lines of duplication that should be one `useChartTheme(theme)` hook.

---

## A4. Architecture & Android-readiness

The stated goal is that **each calculator becomes a standalone Android app.** The current structure actively works against that.

### A4.1 `core/` is a dead, wrong "single source of truth" 🟠

`core/src/tax/auTax.js` opens with:

```js
// AU marginal tax brackets, Medicare levy, HECS/HELP thresholds, super guarantee
// Single source of truth — update here each Budget
export const auTax = {
  year: '2024-25',
  brackets: [
    { min: 18201, max: 45000,  rate: 0.19 },    // ← abolished 1 July 2024
    { min: 45001, max: 135000, rate: 0.325 },   // ← abolished 1 July 2024
    ...
  ],
  superGuaranteeRate: 0.115,                     // ← now 12%
  medicareLevyThreshold: 26000,                  // ← 2023-24 figure
  hecsThresholds: [ /* 18 brackets, old system */ ],
};
```

Every one of these is wrong. The `0.19` and `0.325` brackets are **pre-Stage-3** — they ceased to exist on 1 July 2024, two years before the labelled year. This file is labelled 2024-25 but contains 2023-24 data.

Compounding it:
- `core/src/mortgage/amortize.js` is a **stub returning `[]`** with a `// TODO`.
- `@2176studios/core` is a declared dependency of `web` and is **imported nowhere**.
- Root `npm test` runs `node --test` in `core`, which finds no test files, exits 0, and **reports success while testing nothing.**

The danger is specific: a future developer — or the Android port — finds a file that says *"single source of truth, update each Budget"* and trusts it, silently shipping a 32.5% tax bracket.

**Recommendation:** either delete `core/` outright, or promote `web/src/lib/` into it properly. Do not leave a wrong authority claim in the tree.

### A4.2 Business logic is clean; presentation logic is not

The `lib/*.js` files are genuinely portable — pure functions, no React, no DOM. That part of the Android plan is sound.

What isn't portable, and is duplicated 12×:
- URL encode/decode (~40 lines each) — meaningless on Android
- Chart colour derivation (~6 lines each)
- Currency/percent formatters (divergent, as above)
- The entire wrapper shell (theme, modal, share) — ~68 lines × 10, near-identical

**Recommendation for the port:** formalise the split as `lib/` (pure, shared, tested) → `adapters/` (URL state on web, SavedState on Android) → `ui/`. Move formatters into `lib/format.js` and the tax constants into a single dated `lib/rates/2026-27.js`.

### A4.3 No tests, no linting, no types 🔴

Confirmed absent: any `*.test.*`, `*.spec.*`, `vitest.config.*`, `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `tsconfig*`.

For a suite whose entire value proposition is numerical correctness, this is the highest-leverage gap in the document. **Every single bug in Part B would be caught by a handful of golden-value tests** — assert `calcPayTax({grossIncome: 90000})` against the ATO's own published figures, assert `calcSavings` against a spreadsheet, assert stamp duty against each state revenue office's calculator.

A linter would have caught: `fortnigthlyCost`, `forthnightlyOutOfPocket`, `carryForwardAvailable` (unused), `finalPropertyValue` (unused), `employeeContrib` (unused), `SG_RATE` (unused), and every dead destructured input in A2.2.

**Suggested minimum:** Vitest, ~30 golden-value tests across the 11 libs, run in CI. A day's work that permanently changes the reliability of the product.

---

## A5. Accessibility — currently unusable with assistive technology 🟠

Measured across all 12 components:

| Check | Result |
|---|---|
| `aria-*` attributes | **0** |
| `<label htmlFor>` | **0** (of 113 `<label>` tags) |
| `<input id>` | **0** (of 117 `<input>` tags) |
| `role=` | **0** |
| `aria-pressed` on segmented controls | **0** |
| Visible focus styles | None defined (`.btn-icon` has hover only) |

Concretely:
- **No label is programmatically associated with any input.** A screen reader announces "edit text, blank" for all 117 fields. Clicking a label doesn't focus its input.
- **Segmented controls** (Gross/Net, Weekly/Monthly, rate type…) are plain `<button>`s with a CSS `.active` class. Their state is invisible to assistive tech — should be `role="radiogroup"` + `aria-checked`, or `aria-pressed`.
- **Modals** don't trap focus, aren't `role="dialog"`, don't return focus on close, and don't close on `Escape`.
- **Charts** have no text alternative. Recharts renders inline SVG with no `<title>`/`<desc>` — every chart is invisible non-visually. The underlying data is right there and could trivially be exposed as a visually-hidden table.
- **Colour alone** carries meaning in the Pay/Tax waterfall (green = income, red = deduction) with no non-colour cue.

The fix is mechanical and mostly `useId()` + `htmlFor`. Given financial tools attract an older demographic and Australian government/enterprise sites increasingly expect WCAG 2.1 AA, this is worth doing before the Android port hardens the pattern.

---

## A6. SEO, discoverability & monetisation 🔴

For an **ad-supported** site, organic search *is* the business model. This is where the largest commercial gap sits.

### A6.1 One `<title>` for all 13 pages

`web/index.html` hardcodes:

```html
<title>Mortgage Repayment + Offset Calculator — 2176 Studios</title>
```

This is a client-rendered SPA with no per-route head management. **Every page** — home, CGT, Health, Savings, all of them — is titled *"Mortgage Repayment + Offset Calculator."* Google will index eleven near-duplicate titles, treat them as duplicate content, and rank essentially none of them for their actual terms.

Also missing entirely:
- `<meta name="description">` — none, on any page
- **Open Graph / Twitter Card tags** — none

That second one is worth dwelling on: **Save/Share is a headline feature** with a dedicated toolbar button and modal. Every shared link currently previews in Slack, WhatsApp, iMessage and LinkedIn as a bare URL with no title, no description and no image. The feature's whole value is undercut at the last step.

- No `<link rel="canonical">`
- No favicon (none referenced, none in `public/`)
- No `robots.txt`, no `sitemap.xml` (`public/` contains only `_redirects` and `ads.txt`)
- No JSON-LD structured data — calculator pages do well with `WebApplication` and `FAQPage` rich results

**Recommendation:** add `react-helmet-async` (or a small `useDocumentHead` hook) and give every route a unique title, description, canonical and OG image. Add `robots.txt` + `sitemap.xml`. This is probably the single highest-ROI change in the document for revenue, and it's roughly half a day.

### A6.2 Ads are configured but disabled

`AdUnit.jsx` has a **real publisher ID** (`ca-pub-9072302221360810`, matching `ads.txt`), but **every single slot ID is the `'XXXXXXXXXX'` placeholder.** So:

- Zero ad revenue today
- Live users see grey dashed boxes reading **"Ad — horizontal (90px)"** on every calculator

The placeholder is also the **only element in the app that ignores the theme** — hardcoded `#d6dde5` / `#8fa3b1` / `#5a7385`, so dark mode shows a pale blue-grey block against near-black.

Two further issues for when real slots land:
- `data-ad-format={format}` passes `"skyscraper"` and `"rectangle"`; AdSense accepts `auto`, `horizontal`, `vertical`, `rectangle`, `fluid`. `"skyscraper"` is invalid.
- **5 ad slots per calculator page** (2–3 sidebar + 1 floating + 1 in-panel + 1 above chart). On mobile the sidebar is hidden, but the density is still aggressive and risks AdSense ad-to-content policy scrutiny.

**Recommendation:** either wire real slot IDs or hide placeholders in production builds (`import.meta.env.PROD`). Shipping visible "Ad —" boxes reads as unfinished.

### A6.3 No privacy policy or consent management

AdSense is loaded unconditionally on every page. There is no privacy policy, no cookie notice, no CMP. Under the Privacy Act 1988 a privacy policy is expected for a site running third-party advertising; for any EU/UK traffic a consent mechanism is required by Google's own EU User Consent Policy. There is also no terms-of-use page, which matters for a financial tool.

---

## A7. Trust & positioning

The disclaimers are **good** — present on all 12, specific, and honest about limitations (the mortgage one openly states "Interest calculated monthly (lenders use daily)"). That instinct is right and should be kept.

Three things would strengthen trust further:

1. **Date the figures.** Every calc says "2026-27 (estimated)". Users can't tell whether that means legislated or guessed. A `Rates last verified: DD MMM YYYY` line with a link to the ATO source page converts vagueness into credibility — and creates an internal prompt to actually re-verify.

2. **Distinguish legislated from projected.** Section A1 shows the suite currently mixes both silently. The SG rate is certain; the MLS thresholds are a guess. Users deserve to know which is which — and this is a genuine differentiator against competitors who present everything with equal false confidence.

3. **Show the workings.** An expandable "How this was calculated" panel — brackets applied, offsets, thresholds crossed — would materially increase trust, help users catch their own input errors, and is strong SEO content. The data is already computed; it just isn't shown.

---

# Part B — Per-calculator findings

## B1. Mortgage Repayments 🥇 *reference implementation*

**Verdict:** The strongest calculator in the suite. `amortize.js` is a proper month-by-month engine with fixed/variable/split, offset, lump sums and withdrawals, and it correctly recalculates the payment at the fixed→variable switch. The UI is the most thought-through. The issues below are refinements, not rescues.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **Extra repayments are gated behind the offset flag.** `amortize.js:62-67` wraps `extraRecurring` and `extraLumps` in `if (includeOffset)`. Two unrelated features share one switch — turning off the offset silently stops extra repayments too. | 🔴 |
| 2 | **Offset deposits vanish during the fixed period.** `if (includeOffset && !inFixedPeriod)` skips the `offset += offsetMonthly` accumulation entirely. The money should still *accumulate* even if it isn't *offsetting* — on revert, the balance should reflect everything deposited during the fixed years. Currently those deposits are lost forever. | 🔴 |
| 3 | **Chart off-by-one.** `chartData` samples `withRows[m]` for `m = 0, 12, 24…`, but `rows` are 1-indexed by month, so `withRows[12]` is month **13**. Every plotted year is one month late. | 🟡 |
| 4 | Final partial-year point hardcodes `'With offset': 0` (line 229) rather than the real balance. Fine when the loan is paid off; wrong if it isn't. | 🟡 |
| 5 | `parseFloat(...) ?? DEFAULT` on `offsetStart`/`offsetMonthly` — `??` doesn't catch `NaN`, so a malformed URL renders `$NaN`. (Inverse of A2.1; both need the `Number.isFinite` helper.) | 🟡 |
| 6 | `var(--surface-alt)` undefined (line 379) — the `$` and `%` split modes style read-only inputs differently. | 🟢 |
| 7 | Offset-on-fixed is hardcoded off. Defensible default, but **many AU lenders do offer offset on fixed loans.** Should be a toggle, not an assumption. | 🟡 |

### Missing features — ranked by Australian user demand

1. **Fortnightly / weekly repayments** — the most-requested AU mortgage feature by a wide margin. Paying half the monthly amount fortnightly yields 26 half-payments (13 monthly equivalents/yr) and typically cuts **4–6 years** off a 30-year loan. Its absence is the biggest functional gap in the suite's best calculator.
2. **Rate-change / sensitivity modelling** — "what if rates rise 1%?" is the #1 borrower anxiety. Borrowing Power already has a sensitivity chart; the mortgage calc doesn't. The pattern exists in-repo and should be shared.
3. **Interest-only period** — standard for investors.
4. **LMI estimate** — triggers below 20% deposit; materially changes the numbers.
5. **Fees** — application, ongoing, discharge.
6. **Loan start date** — `payoffDate()` currently counts from `new Date()` at render, so the answer drifts day to day.
7. Term capped at 30 years; some lenders offer 35–40.

### UX

- **Compare mode always starts from `DEFAULTS`.** The real workflow is "duplicate this scenario and change one thing." Starting from scratch each time makes A/B comparison tedious and error-prone. A **"Duplicate scenario"** action would be the single biggest UX win — and applies equally to Pay/Tax.
- The repayment schedule table is good; consider CSV export.
- Rate-switch callout reads `withRows[rateSwitchMonth - 2]` for the "before" payment — correct given 0-indexing, but fragile enough to deserve a comment.

---

## B2. Pay / Tax 🥈 *reference implementation*

**Verdict:** Well-structured and the recent work (pay-period entry, gross/net toggle, waterfall) is genuinely good. Undermined entirely by the tax data beneath it.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | Bottom bracket 16%, should be **15%** — see A1.1 | 🔴 |
| 2 | HECS uses the abolished system — see A1.2. Up to **3× too high** | 🔴 |
| 3 | Salary sacrifice wrongly reduces HECS and MLS income — see A1.3 | 🔴 |
| 4 | Desktop CTA missing `?vd=1` — advertised compare feature doesn't work on mobile — see A3.2 | 🟠 |
| 5 | `grossFromNet` binary search is sound (60 iterations, monotonic). ✅ But when a bonus is present it back-solves *base* salary from a net figure and then **adds the bonus on top as gross** — a defensible choice, undocumented in the UI. A user entering "my take-home is $5,000/mo" plus a bonus gets a total exceeding what they said they take home. | 🟡 |
| 6 | Medicare low-income threshold $27,069 is below even the 2024-25 figure ($27,222) | 🟢 |

### Missing

- **Division 293** warning above $250k
- **Tax offsets**: SAPTO, zone, invalid/carer, private health rebate
- **Deductions** input (work expenses, donations) — trivially added, materially improves accuracy
- **Financial-year selector** — huge for a tax tool: "what changes for me next year?" is the exact question the 15%/14% cuts create, and answering it is a strong reason to return
- HELP loan types beyond HECS (VET, SFSS)

### UX

- Waterfall is the right chart and reads well.
- Compare mode shares the "starts from defaults" problem (B1).
- With three scenarios open, there's no summary row showing the *deltas* — the reason to compare is the difference, and the user must compute it by eye.

---

## B3. Capital Gains Tax

**Verdict:** The cleanest of the ten new calculators. Correctly applies losses **before** the discount, and correctly uses the differencing method for tax on the gain — the only lib that does.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **Medicare levy excluded from the gain.** Uses `.incomeTax` only; a capital gain raises taxable income and therefore attracts the 2% levy. **~$2,000 understated on a $100k assessable gain.** | 🔴 |
| 2 | **HECS excluded.** A capital gain increases HELP repayment income; someone with a debt faces a materially larger bill. Not modelled. | 🟠 |
| 3 | `holdingMonths >= 12` — the ATO test is **more than** 12 months (365+ days, excluding acquisition and disposal days). Exactly 12 months should *fail*; here it passes. | 🟡 |
| 4 | Month-granularity date picker can't express the 12-month boundary precisely — and the boundary is worth 50% of the gain. | 🟡 |
| 5 | **CGT event = contract date, not settlement.** A near-universal misconception, unmentioned. Can shift the gain into a different financial year. | 🟠 |
| 6 | A **net capital loss** just shows $0 CGT. It should say "you have a $X capital loss to carry forward" — valuable information, currently discarded. | 🟠 |

### Missing

- **Main residence exemption** — the single most common CGT question in Australia
- Six-year absence rule; partial main-residence exemption
- Indexation method for pre-21 Sept 1999 assets
- Cost-base element guidance (third element: rates/interest for non-income-producing assets)
- Shares vs property presets (very different cost-base structures)

---

## B4. Redundancy Pay

**Verdict:** The NES weeks table is **correct**, including the counter-intuitive 10+ years = 12 weeks (down from 16 at 9 years). Good attention to detail. The tax treatment around it has real errors.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **Unused annual leave on genuine redundancy is capped at 32%**, not marginal rate. The code applies the marginal rate. For a high earner this overstates tax on the leave component by up to 15 points. | 🔴 |
| 2 | **Long service leave** likewise — post-1993 accrual on genuine redundancy is also capped at 32%; pre-1978 and 1978-1993 accrual have their own treatments. All flattened to marginal. | 🟠 |
| 3 | `ETP_CAP = 235000` — the **2023-24** figure. ~$245k (24-25), ~$260k (25-26). Also hardcoded again as prose in the disclaimer. | 🟠 |
| 4 | **Whole-of-income cap ($180,000) missing** — applies to non-genuine ETPs, which is 3 of the 4 dropdown options. | 🟠 |
| 5 | 3 of 4 `terminationReason` options behave identically (A2.2) | 🟠 |
| 6 | Flat marginal rate on lump sums rather than differencing (A2.4) | 🟠 |
| 7 | **Tax-free treatment requires being under Age Pension age (67).** Not checked — a 68-year-old gets a tax-free amount they aren't entitled to. | 🟡 |
| 8 | `fmtPct` uses `.toFixed(0)` — the only calc that does (A3.1) | 🟢 |

### Missing eligibility gates

NES redundancy pay does **not** apply to: small business employers (<15 employees), employees with <12 months service, casuals, or fixed-term contracts ending naturally. None are checked — the calculator will confidently quote 12 weeks' pay to someone entitled to nothing.

### UX

The payout chart plots gross components (redundancy, leave, notice) **alongside** total tax and net take-home on one axis — visually double-counting, since net = gross − tax. **This should be a waterfall**, exactly like Pay/Tax. The pattern already exists in the repo.

---

## B5. Salary Sacrifice

**Verdict:** Simple, clear, and wrong in the one place that matters most for its target audience.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **No Division 293.** Above $250k (income + concessional contributions), an extra 15% applies, so the saving is marginal−30%, not marginal−15%. For a $300k earner the calculator claims **roughly double** the real benefit. The headline reads "by paying 15% super tax instead of your marginal rate" — false for exactly the cohort most likely to use this tool. | 🔴 |
| 2 | `carryForwardAvailable` computes `X − X` = always 0, and isn't returned (A2.3) | 🟠 |
| 3 | `otherSacrifice` affects the cap warning but not the tax calc (A2.2) | 🟠 |
| 4 | **The projection isn't apples-to-apples.** "Without sacrifice" shows only the super balance, ignoring that the un-sacrificed cash could be invested outside super. Structurally flatters sacrificing. | 🟠 |
| 5 | Excess-contribution message oversimplifies — excess is assessable at marginal rate **with a 15% offset**, plus an ECC charge. | 🟡 |
| 6 | `fortnigthlyCost` typo in the public return shape (consistently misspelled, so it works) | 🟢 |
| 7 | `age` in DEFAULTS and URL, no UI field, unused in lib | 🟢 |

### Missing

- **Preservation age lock** — no mention the money is inaccessible until 60. For a "should I do this?" tool, that's the most important caveat there is.
- **Carry-forward unused cap** (5 years, balance < $500k) — a major lever, and the stub above suggests it was intended
- **Personal deductible contributions** (s290-170) — same tax effect, more flexibility, often better
- Government co-contribution and spouse contribution offset for lower incomes
- Cap headroom shown as `$30,000 − SG` so the user knows their actual available room

---

## B6. FHSSS

**Verdict:** The rules encoded ($15k/yr, $50k lifetime, marginal−30% withdrawal) are right. The arithmetic between them is not.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **The notional earnings formula is arbitrary.** `fhsss.js:40`:<br>`cumulativeEarnings = (cumulativeReleasable + cumulativeEarnings) * RATE * (years - yr + 1) / years;`<br>It **overwrites** rather than accumulates, and applies a decaying multiplier (3/3, 2/3, 1/3 for a 3-year run) with no basis in ATO method. The ATO compounds the shortfall interest charge **daily on each contribution from its date**. The displayed earnings figure is not an approximation of anything. | 🔴 |
| 2 | **The 85% rule is missing.** Only **85%** of concessional contributions are releasable (15% contributions tax). The code releases 100%, **overstating the concessional portion by ~15%**. | 🔴 |
| 3 | **Withdrawal tax omits Medicare.** Released amounts are taxed at marginal rate **+ 2% Medicare** less the 30% offset. Should be `marginalRate + 0.02 − 0.30`. | 🟠 |
| 4 | `superBalance` is collected and never used (A2.2) | 🟠 |
| 5 | **Two competing totals** — `totalTaxSaving` (convoluted, unused) and `totalConSaving` (different formula). Only `annualTaxSaving` reaches the UI. | 🟡 |

### Missing — eligibility gates

FHSSS has hard gates, none of which are checked:
- Must be **18+**
- Must **never have owned property in Australia** (with limited hardship exceptions)
- **Must apply for an FHSSS determination BEFORE signing a contract** — miss this and the entire benefit is lost
- Must occupy the property for **6 of the first 12 months**
- Release requests are limited

That third point is the one that ruins people. A calculator that shows a $50,000 benefit without warning about the sequencing requirement is actively dangerous. A short eligibility checklist above the result would fix it.

---

## B7. Retirement / Super Projection

**Verdict:** Mechanically sound compounding. Two framing choices make it optimistic, and the Age Pension feature promises far more than it delivers.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **Salary never grows.** Fixed for up to 45 years. Real wages grow ~3%/yr; SG is a percentage of salary, so contributions are understated throughout — materially so over long horizons. | 🟠 |
| 2 | **Headline is nominal.** `$1.2M` at age 65 is the big number; the real value sits in small text. At 2.5% inflation over 30 years that $1.2M is ~$573k in today's money. Most users will read the nominal figure and stop. | 🟠 |
| 3 | **Age Pension estimate is far too thin for how confidently it's presented.** "Full / Partial / Likely nil" is derived from the **super balance alone**, against **single homeowner** assets thresholds. It ignores: partner status (couple thresholds differ hugely), all non-super assets, and the **income test** (deeming), which is frequently the binding constraint. A couple gets a badly wrong answer stated as fact. | 🟠 |
| 4 | **No contribution cap check.** `extraContributions` can exceed $30k with no warning. | 🟠 |
| 5 | **No Division 293.** | 🟠 |
| 6 | `retirementAge` min is **55**, but preservation age is **60**. Users can model a retirement they cannot legally fund. | 🟡 |
| 7 | Drawdown is a flat `balance × rate%` — no depletion, no longevity, no Age Pension interaction, and no mention of **legislated minimum drawdown rates** (4% at 65-74, rising with age). | 🟡 |
| 8 | `SG_RATE` constant unused; `milestoneAges` computed then ignored (UI hardcodes `[50,55,60]`) | 🟢 |

### Missing

- Real-vs-nominal toggle (the data is already computed — this is a display switch)
- Salary growth input
- Transfer balance cap ($2.0m from 1 July 2025) for large balances
- Insurance premiums inside super (a real drag, often 0.5–1%)
- ASFA Comfortable/Modest benchmarks as reference lines — instantly meaningful context
- Fees as `flat $ + %` rather than % only

---

## B8. Borrowing Power

**Verdict:** The APRA buffer concept is right; almost everything around it needs work. This is the calculator where a wrong answer has the most immediate real-world consequence — someone bidding at auction.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **HECS balances are collected and completely ignored.** `hecsBalance1`/`hecsBalance2` are never passed to `calcPayTax`, so `hecsRepayment` is always 0. The results panel shows a **"HECS repayment /mo"** stat card that permanently reads **$0**. Visibly broken, and HECS is called out in the page subtitle as a feature. | 🔴 |
| 2 | **`otherIncome` is added after tax** — rental and dividend income is treated as **tax-free**, and isn't shaded (lenders typically apply 80% to rent). The field most likely to hold a big number is the one handled worst. | 🔴 |
| 3 | **No deposit / LVR input.** Borrowing power is purely serviceability-driven, so the tool can quote a figure the user could never access. For most first-home buyers the **deposit is the binding constraint**, not serviceability. | 🔴 |
| 4 | **HEM is far too low and doesn't scale.** Flat $2,100 single / $2,900 joint + $520/dependant. Real HEM scales with income band and location — a couple on $200k combined is benchmarked closer to $4,500–5,500/mo. Understating HEM **overstates borrowing power**, the dangerous direction. | 🟠 |
| 5 | **Self-employed shading applied to net income.** `incomeShade` multiplies `takeHome`; lenders shade **gross** before tax. Overstates the tax paid on the shaded portion. | 🟠 |
| 6 | `employmentType: 'casual'` has no effect (A2.2) | 🟠 |
| 7 | `repaymentType` dead — interest-only unmodelled (A2.2) | 🟡 |
| 8 | Credit cards at 3% of limit; many lenders use **3.8%** | 🟡 |
| 9 | No assessment-rate floor — lenders apply `max(rate + 3%, ~5.5%)` | 🟢 |
| 10 | `fmtShort` renders sub-$1,000 as `$0k` (A3.1) | 🟢 |

### Missing

- LMI estimate and the 20%-deposit cliff
- Existing home loan repayments (only personal/car loans exist)
- Rental income with shading
- Genuine savings / deposit source
- Stamp duty as a cash requirement alongside the deposit
- First Home Guarantee scheme (5% deposit, no LMI)

---

## B9. Novated Lease

**Verdict:** Residual values and the statutory formula are correct. The FBT logic double-counts, the flagship EV benefit is out of date, and the largest actual saving isn't modelled.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **PHEVs are still treated as FBT-exempt.** The exemption for plug-in hybrids **ended 1 April 2025**. The UI button literally reads *"Yes — EV/PHEV"*. Every PHEV user gets a materially wrong answer. | 🔴 |
| 2 | **ECM double-counts.** The non-exempt branch computes a full `fbtLiability` **and** subtracts the statutory base from the pre-tax reduction as an employee contribution. Under ECM, contributing the taxable value post-tax reduces FBT to **nil** — you can't have both. The UI then displays the full FBT figure as if payable. | 🔴 |
| 3 | **GST saving not modelled.** Novated leases are typically financed on the **GST-exclusive** price (employer claims the input tax credit) — roughly a **9% saving on the vehicle**, and one of the main reasons to novate. Absent. | 🟠 |
| 4 | **Reportable fringe benefits ignored.** Even FBT-*exempt* EVs generate a reportable fringe benefits amount that flows into MLS, HECS repayment income, Div 293, child support and Family Tax Benefit. **This is the biggest real-world novated-lease trap** and it's invisible. | 🟠 |
| 5 | **Cents-per-km misapplied.** The 88c/km method covers **work-related** travel only, not commuting. Applying it to all km up to 5,000 overstates the buy-outright benefit for most private users. | 🟠 |
| 6 | Outright comparison assumes a **cash purchase** (no finance cost) while the lease pays interest — apples to oranges, unstated. | 🟡 |
| 7 | `FBT_GROSS_UP = 2.0802` commented as "type 2"; **2.0802 is Type 1** (Type 2 = 1.8868). Value correct for novated leases, comment wrong. | 🟡 |
| 8 | LCT threshold `91000` hardcoded in **both** lib and instance — will drift. | 🟡 |
| 9 | `sgRate` and `leaseBalloon` dead (A2.2); `employeeContrib` assigned and unused | 🟢 |

### Missing

- Employer administration fees (typically $300–800/yr)
- Budgeted vs actual running costs and end-of-year reconciliation
- What happens on **leaving your employer** mid-lease — the #1 novated lease risk
- Balloon/residual payment options at term end
- State EV incentives / stamp duty concessions

---

## B10. Rent vs. Buy

**Verdict:** The most error-prone calculator in the suite. Stamp duty is wrong or missing for **half the country**, and several structural modelling choices systematically favour renting.

### Stamp duty — state by state

| State | Status | Detail |
|---|---|---|
| **NSW** | 🟠 Stale + wrong FHB | Brackets ($16k/$35k/$93k/$351k/$1.168M) look like **2022-23**; 2025-26 is ~$17k/$36k/$97k/$364k/$1.212M. Premium tier (>$3.6M @ 7%) missing. FHB concession `((price-800000)/200000) * dutyAt1M` computes duty on $1M regardless of actual price — directionally plausible, numerically wrong. |
| **VIC** | 🟡 Approximate | Linear taper `full * (1 - (750000-price)/150000)` is an approximation of the real sliding scale. Off-the-plan concession absent. |
| **QLD** | 🔴 **Badly wrong** | Applies an **"$8,750 rebate"** — that's the First Home Owner *Grant* conflated with duty concession. QLD actually gives a **full FHB exemption to $700,000** (raised from $500k on 9 June 2024), tapering to $800,000; and **from 1 May 2025 abolished duty entirely for FHBs buying new/off-the-plan.** QLD users get badly misleading numbers. |
| **SA** | 🔴 **No FHB handling at all** | `stampDutySA(price)` takes no `firstHome` parameter. SA **abolished stamp duty for first home buyers on new homes with no price cap** (June 2024). Also the top two brackets both use 5.5%, making the split pointless. |
| **WA** | 🟡 Partial | FHB thresholds ($430k/$530k) are dated. |
| **ACT** | 🔴 Conceptually wrong | ACT is **phasing out stamp duty** for owner-occupiers in favour of higher rates/land tax, and its Home Buyer Concession Scheme is **income-tested, not price-tested**. Neither is modelled; no FHB handling. |
| **TAS** | 🟠 No FHB | TAS offers a **50% discount** for FHBs on established homes to $750k. Absent. |
| **NT** | 🔴 Wrong formula | Uses `(price * 0.065 - 710) * price / 525000`. The actual NT formula below $525,000 is `D = (0.06571441 × V²)/1000 + 15V` where V = value/1000. Different function entirely. No FHB concessions. |

### Structural modelling issues

| # | Finding | Severity |
|---|---|---|
| 1 | **Interest computed on the opening balance for the whole year** (`mortgageBalance * rate`), ignoring monthly amortisation. Overstates interest, understates principal paid. **The repo already has a correct month-by-month engine in `amortize.js`** — this calculator should use it. | 🔴 |
| 2 | **The renter's investment is taxed on the wrong thing.** `renterWealth * (1+r) + max(0, surplus) * 0.7` applies the 0.7 "tax" factor to the **contribution**, not the **returns**. Systematically understates renter wealth. | 🔴 |
| 3 | **Asymmetric surplus.** `Math.max(0, renterSurplus)` means when rent exceeds mortgage+costs the renter contributes zero — but they should be *drawing down*. Flatters renting in expensive rental markets. | 🟠 |
| 4 | **No main-residence CGT exemption.** The buyer's gain is tax-free; the renter's portfolio attracts CGT on sale. A major structural advantage of buying, entirely absent. | 🟠 |
| 5 | **Stamp duty is capitalised into the loan** (`loanAmount = price - deposit + stampDuty`). Lenders generally don't permit this — duty is paid from cash and *reduces available deposit*. Internally consistent but unrealistic, and it inflates interest. | 🟠 |
| 6 | **No LMI** below 20% deposit. | 🟠 |
| 7 | `finalPropertyValue` computed and unused; `projectedPropertyValue` recomputed via `Math.pow` instead of reusing the loop value. | 🟢 |
| 8 | `fmtShort` renders sub-$1,000 as `$0k` (A3.1) | 🟢 |

**Overall recommendation:** this calculator needs stamp duty rebuilt from state revenue office sources with a per-state "last verified" date, and the mortgage math replaced with a call to `amortize.js`. Until then it's the highest-liability page on the site — property decisions are the largest financial commitments users make.

---

## B11. Savings

**Verdict:** The core FV formula is correct and contribution timing is internally consistent. Several secondary calculations don't agree with the primary one.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **`monthsToTarget` ignores `compoundFreq`.** It always uses monthly compounding (`r = annualRate/100/12`) even when the user selects quarterly or annual — so the goal date **contradicts the balance projection** on the same screen. | 🟠 |
| 2 | **`monthsToTarget` ignores tax and inflation** while the headline balance is net-of-tax. Two headline numbers on different bases. | 🟠 |
| 3 | **Tax is applied as a single lump at the end** (`totalInterest × rate`) rather than annually. Real interest tax reduces the compounding base every year. **Materially overstates** the final balance over long terms. | 🟠 |
| 4 | **Annual/quarterly compounding lumps contributions.** `contributionPerPeriod = monthlyContribution * 12 / periods` means annual compounding deposits 12 months of savings in one year-end lump, losing all intra-year interest. Should compound monthly and *credit* interest at the chosen frequency. | 🟠 |
| 5 | **Unreachable "goal cannot be reached" message** (A2.3) — a user with an impossible goal gets no feedback at all. | 🟠 |
| 6 | **No contribution indexation** while the balance is inflation-deflated. Asymmetric: $500/mo for 30 years is a shrinking real contribution measured against a real-terms result. | 🟡 |
| 7 | Contributions are end-of-period (ordinary annuity); most savers deposit at the start. Consistent internally, but worth an option. | 🟢 |

### Missing

- Marginal-rate integration (the tax field is a raw % the user must know — `paytax.js` is right there)
- Goal-seek in reverse: "I want $50k in 3 years — what monthly amount?" (often the more useful question)
- Offset-account comparison — for Australians with a mortgage, offsetting beats saving after tax almost always. High-value cross-link to the mortgage calc.
- First Home Super Saver cross-link (there's a whole FHSSS calculator sitting next to it)

---

## B12. Health

**Verdict:** Mifflin-St Jeor and the BMI categories are implemented correctly. The goal logic has a sign bug and a self-contradiction between the headline and the chart.

### Correctness

| # | Finding | Severity |
|---|---|---|
| 1 | **The chart contradicts the headline when the safety floor engages.** `weeklyWeightChange` uses `actualDeficit` (post-floor), but `chartData` uses `calorieDeficitOrSurplus` (**pre-floor**). Set an aggressive goal, hit the 1,200/1,500 kcal floor, and the stat says one rate of loss while the graph plots a faster one — on the same screen. | 🔴 |
| 2 | **Weight gain shows a negative weekly change.** For `goalType: 'gain'`, `actualDeficit = maintenanceCalories - safeCals` is **negative**, so `weeklyWeightChange` is negative. A user targeting +5kg sees **"-0.45 kg/wk"**. | 🔴 |
| 3 | **No warning when the safety floor overrides the goal.** Calories are silently clamped and the answer quietly changes. The user should be told their goal isn't safely achievable in that timeframe. | 🟠 |
| 4 | **TDEE held constant as weight changes.** BMR falls ~10 kcal per kg lost, so a 20kg loss cuts maintenance by ~200 kcal/day. The linear projection **systematically over-predicts** loss — the chart promises results that won't materialise. | 🟠 |
| 5 | **Protein scaled to current weight.** At 2.2 g/kg, a 120kg user targeting 80kg is told to eat **264g protein/day** — unrealistic and not evidence-based. For higher body-fat individuals, protein should scale to **goal weight or lean body mass**. | 🟠 |
| 6 | `projectedWeeks` recalculates for 'lose' but returns `goalWeeks` unchanged for 'gain' — inconsistent. | 🟡 |
| 7 | No warning above the safe rate of loss (~1% bodyweight/week). | 🟠 |

### Missing / safety

- **No exclusions** for pregnancy, breastfeeding, eating-disorder history, or under-18s. The age input allows **15**. A calorie-deficit tool aimed at minors warrants an explicit gate, not just a footer disclaimer.
- BMI limitations unstated (athletes; **lower thresholds are recommended for South and East Asian populations**)
- Body-fat % input would enable lean-mass-based protein targets
- Fibre and micronutrient guidance
- Only 4 activity levels; the standard scale includes 1.9 "extra active". "High" (1.725) conflates *"6-7 days hard training"* with *"physical job"* — quite different.

### UX

The activity-level cards are the **best input pattern in the entire suite** — real-world examples instead of jargon. Worth porting that thinking to other calculators (e.g. describing HEM bands, or risk tolerance in the retirement calc).

---

# Part C — Prioritised recommendations

## P0 — Wrong numbers users will act on

| # | Action | Files | Effort |
|---|---|---|---|
| 1 | Fix bottom bracket to **15%** and rebase cumulative amounts | `paytax.js` | 15 min |
| 2 | Rewrite HECS to the **marginal** system ($67k threshold, 15%/17%) | `paytax.js` | 1 hr |
| 3 | Add `repaymentIncome` (add back sacrifice + RFB) for HECS and MLS | `paytax.js` | 1 hr |
| 4 | Add **Division 293** | `salarysacrifice.js`, `retirement.js`, `fhsss.js` | 2 hr |
| 5 | Pass `hecsBalance` through in Borrowing Power; tax `otherIncome`; add deposit/LVR | `borrowingpower.js` | 3 hr |
| 6 | Rewrite FHSSS notional earnings; add the **85% rule**; add Medicare to withdrawal tax | `fhsss.js` | 2 hr |
| 7 | Fix Health: chart/headline contradiction, gain sign bug, floor warning | `health.js` | 1 hr |
| 8 | Split EV / **PHEV** / ICE; fix ECM double-count | `novatedlease.js` | 2 hr |
| 9 | Rebuild stamp duty from state sources (QLD, SA, ACT, NT, TAS first) | `rentvbuy.js` | 4 hr |
| 10 | Add Medicare levy to CGT; surface carry-forward losses | `cgt.js` | 30 min |
| 11 | Cap annual leave + LSL at 32% on genuine redundancy; update ETP cap | `redundancy.js` | 1 hr |
| 12 | Decouple extra repayments from the offset flag; accumulate offset during fixed period | `amortize.js` | 1 hr |

## P1 — Systemic

| # | Action | Effort |
|---|---|---|
| 13 | **Vitest + ~30 golden-value tests** against published ATO figures | 1 day |
| 14 | Single dated rates module (`lib/rates/2026-27.js`) with `LEGISLATED`/`INDEXED` flags | 3 hr |
| 15 | Fix the `0 → default` round-trip across **62 fields** (one shared helper) | 2 hr |
| 16 | Per-route `<title>`, meta description, **Open Graph**; add `robots.txt` + `sitemap.xml` | 4 hr |
| 17 | Delete or rebuild `core/` — remove the false "single source of truth" | 30 min |
| 18 | Remove all dead inputs, or wire them up | 2 hr |
| 19 | Consolidate 12 identical CSS files into one shared import | 1 hr |
| 20 | ESLint + Prettier | 1 hr |

## P2 — Quality & reach

| # | Action | Effort |
|---|---|---|
| 21 | Accessibility pass: `htmlFor`/`id`, `aria-pressed`, focus styles, modal focus trap, chart alt-tables | 1 day |
| 22 | **Fortnightly/weekly repayments** on the mortgage calc | 3 hr |
| 23 | **"Duplicate scenario"** in compare mode (Mortgage + Pay/Tax) | 2 hr |
| 24 | Shared `lib/format.js` — one `fmt`, `fmtShort`, `fmtPct` | 1 hr |
| 25 | Shared `useChartTheme(theme)` hook | 1 hr |
| 26 | Real AdSense slot IDs, or hide placeholders in prod; theme-aware placeholder | 1 hr |
| 27 | Privacy policy + terms + consent management | 3 hr |
| 28 | "Rates last verified" line with ATO source links | 2 hr |
| 29 | Redundancy chart → waterfall (reuse Pay/Tax pattern) | 1 hr |
| 30 | Fix Pay/Tax desktop CTA (`?vd=1`) | 5 min |

## P3 — Growth

- **Financial-year selector** on Pay/Tax — the 15% (2026-27) and 14% (2027-28) cuts make "what changes next year?" a compelling reason to return
- "Show the workings" expandable panel — trust + SEO content
- Cross-links between related calcs (Savings ↔ Offset ↔ FHSSS; Borrowing Power → Mortgage → Rent v Buy)
- CSV/PDF export
- Main residence exemption in CGT — the most-asked Australian CGT question
- Compare mode for Rent v Buy, Borrowing Power, Retirement

---

## Closing note

The scaffolding here is good. The component pattern, URL-state design, theming and visual language are consistent across twelve calculators and would support twelve more — that's the hard part of a project like this and it's already done well.

What's missing is a verification layer. Ten of these were built in one pass without review, and it shows in a very specific way: the *structure* is uniformly good and the *contents* are uniformly unchecked. Dead inputs survived because nothing flagged them. Wrong rates survived because nothing asserted them. The `X − X = 0` line survived because nothing ran it.

Item 13 — a golden-value test suite — is the one that changes the trajectory. Not because tests are virtuous, but because every P0 item in this document is a test that would have failed on the day the code was written. With those in place, the tax updates each Budget become a routine chore instead of a re-audit.

The second highest-value item is unglamorous: **item 16, per-page titles and metadata**. Twelve calculators currently share one `<title>` announcing all of them as the mortgage calculator, and every shared link previews as a bare URL. For an ad-supported product, that's a larger revenue constraint than anything in the calculations.
