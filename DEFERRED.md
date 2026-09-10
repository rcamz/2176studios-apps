# Deferred work and re-verification calendar

Living document. Sources are `FY2026-27-rates-audit-v2.md` (§ references below)
and `calc-suite-audit.md`.

---

## 1. Deferred features

### 1.1 SAPTO — Seniors and Pensioners Tax Offset

**Status:** deferred by decision, 10 Sep 2026.
**Why:** net-new scope. No calculator currently collects the inputs it needs, and
§3.2 warns that a partial implementation is wrong in ways users cannot detect.

**What it needs before it can be built:**

| Requirement | Detail |
|---|---|
| New inputs | Age, pension/allowance eligibility, partner status, partner's rebate income |
| Two income figures | Couple eligibility is tested on **50% of combined** rebate income; the offset **amount** uses the person's **own actual** rebate income. A single-income implementation cannot produce the published results |
| Rebate income definition | Taxable income + reportable super + total net investment loss + **adjusted** fringe benefits. Not the same as MLS income — no spouse-trust component, and it uses the *adjusted* FBT figure |
| Medicare interaction | SAPTO unlocks the higher Medicare levy low-income threshold **only if at least $1 of offset survives**. Where it tapers to zero, ordinary thresholds apply |
| Transfers | Spouse's unused amount = `A − ((B − $6,000) × 0.15)`. Recipient's threshold is recalculated through steps A–O, and if an intermediate exceeds $37,000 an entirely different formula applies |

**Recommended scope when built:** no-transfer case only (single + couple), clearly
labelled as not modelling transfers. Full steps A–O is the alternative.

**Derived thresholds ready to use** (§3.2, `[D]`, validated 6/6 against published
FY2025-26 figures at 0.16 then re-derived at 0.15):

| Status | Max offset | Shade-out | Cut-out |
|---|---|---|---|
| Single | $2,230 | $36,034 | $53,874 |
| Couple, each | $1,602 | $31,847 | $44,663 |
| Illness-separated, each | $2,040 | $34,767 | $51,087 |

Taper 12.5c/$1, rounded up to the nearest dollar.
**Dependency:** assumes the `$445` rebate maximum amount is unchanged for
FY2026-27. If amended, all six thresholds move.

**Test vectors are already written** — §8.5, including the Ying/Li Jun trap.

---

## 2. Unverified figures shipped with a caveat

Implemented, flagged in the UI, and needing confirmation. None are blocking.

| # | Item | Risk | Action |
|---|---|---|---|
| 1 | **NT HomeGrown Territory Grant end date** | One source says **30 Sep 2026** — 20 days out | ⚠️ **Check this week** |
| 2 | NT duty rate above $3m | Two competing structures — tiered 5.75%/5.95% vs flat 5.45% | Confirm with Territory Revenue Office. Only affects >$3m |
| 3 | Medicare levy low-income thresholds | FY2026-27 not published; using FY2025-26 | Re-check after the **May 2027** Budget |
| 4 | SAPTO `$445` rebate maximum | Underpins all six derived thresholds | Confirm before SAPTO ships |
| 5 | Age Pension Work Bonus | $300 vs $460 across sources | Using $300 |
| 6 | Age Pension pre-20-Sep-2026 window | Couple rate and cut-offs not separately verified | Window expires 20 Sep 2026 — becomes moot |
| 7 | FBT scalars, year to 31 Mar 2028 | Carried forward, re-index annually | Re-check **1 Apr 2027** |
| 8 | ACT $1,000,001–$1,455,000 rate (6.40%) | Weakest link in a derived scale | One confirming fetch |
| 9 | TAS full scale | Derived from 7 anchors, all reconciling | Low risk |
| 10 | SA FHOG cap | Uncapped vs $650,000 with taper | Only if surfaced in UI |
| 11 | NSW FHOG cap | $600,000 vs $750,000 | Only if surfaced in UI |
| 12 | WA off-the-plan concession end date | 2028 per two sources; needed legislative amendment | Confirm with RevenueWA |
| 13 | Foreign resident FY2026-27 scale | Inferred; no separately published table found | Low risk — scale unchanged by the amendment |
| 14 | FHSSS withdrawal + Medicare | Inferred, not directly stated | Likely understating by 2pp if wrong |
| 15 | CGT gain → Medicare / HELP / MLS | Logically certain, not directly stated | Low risk |
| 16 | RFBA → Div 293, FTB, child support | Secondary sources only | Low risk |
| 17 | DRI activity multipliers | Only 2 of 4 ranges confirmed | Labelled "conventional", not DRI |
| 18 | Australian ethnicity-adjusted BMI | Not confirmed for Australia | Offered as attributed WHO view, not the default |

---

## 3. Re-verification calendar

| Cadence | Items |
|---|---|
| **Quarterly** | FHSSS shortfall interest charge rate; FBT benchmark interest rate |
| **February** | ETP cap, genuine redundancy limits, CGT cap, untaxed plan cap (AWOTE) |
| **March + September** | Age Pension payment rates; deeming rates. **Rates and means-test thresholds move on different dates** |
| **1 April** | FBT year rollover; EV exemption phase changes |
| **1 June** | HELP indexation applied to balances |
| **1 July** | Income tax brackets; MLS tiers; super caps; HELP thresholds; LCT thresholds; NSW duty brackets; Age Pension thresholds |
| **Post-Budget (May)** | Medicare levy low-income thresholds for the year *just ending*; SAPTO thresholds. **This one lands retrospectively** |
| **Ad hoc** | APRA buffer and DTI limit; eight state/territory budgets |

### Dated triggers

| Date | Event | Affects |
|---|---|---|
| **20 Sep 2026** | Age Pension rates up; deeming to 1.75% / 3.75% | Retirement |
| **30 Sep 2026** | Possible end of NT HomeGrown Grant ⚠️ | Rent v Buy |
| Mid-Sep 2026 | FHSSS SIC rate for Oct–Dec publishes | FHSSS |
| Feb 2027 | AWOTE-indexed ETP and redundancy limits | Redundancy |
| **1 Apr 2027** | FBT EV Phase 2 — $75,000 test, 15% band | Novated Lease |
| 21 Apr 2027 | VIC off-the-plan concession expires | Rent v Buy |
| **May 2027** | 2027-28 Budget — FY2026-27 Medicare thresholds, retrospectively | Pay/Tax |
| **1 Jul 2027** | Bracket 15% → 14%; CGT discount → indexation + 30% min tax; negative gearing quarantine; Working Australians Offset; small business threshold $2m → $10m | Pay/Tax, CGT, Rent v Buy |
| Mid-2027 | ATO review of EV FBT exemption due | Novated Lease |
| 30 Jun 2028 | WA off-the-plan concession expires | Rent v Buy |
| **1 Apr 2029** | FBT EV Phase 3 — 25% discount all eligible EVs | Novated Lease |

---

## 4. Known-incomplete models

Shipped deliberately simplified. Each needs a visible caveat in the UI.

| Model | Simplification |
|---|---|
| **Division 296** | Flagged, not computed. Realised earnings is a fund-level figure that can differ from total return by an order of magnitude; computing it would mean inventing the key variable. Pending ATO guidance, first assessments 2027-28 |
| **Living expense benchmark** | HEM tables are proprietary and unpublished. Using our own documented approximation. Must **not** be labelled "HEM" |
| **LMI** | Indicative bands from Helia's public estimator. Required label: *"LMI numbers vary from bank to bank. These are indicative, for research purposes."* |
| **First Home Guarantee price caps** | Not hardcoded — caps are indexed, vary by postcode, and stale pre-Oct-2025 figures circulate widely. Links to the Housing Australia postcode tool instead |
| **Payday Super** | SG payable each payday on "qualifying earnings" from 1 Jul 2026. Calculators use annual salary × SG%, which is unaffected in aggregate, but the OTE → qualifying earnings change may alter which earnings attract SG |
| **Long service leave apportionment** | Apportioned by days. Does not model LSL taken during employment being attributed to the period used, nor separate part-time/full-time service calculations |

---

## 5. Accessibility — known residual items

The suite went from zero accessibility attributes to full labelling, radio
semantics, live regions and chart text alternatives. Four things remain, each
because fixing it properly needs a design change rather than markup.

| # | Item | Why it was left |
|---|---|---|
| 1 | **Rent vs Buy chart lines are distinguished by colour alone** — both series are solid, so the legend text is the only non-colour cue | A dash pattern would change the visual design. Data is covered in the hidden table. Other charts already have a shape or axis cue |
| 2 | **Pay/Tax waterfall segments carry no in-chart non-colour cue** | Hatching or in-bar labels would alter what a sighted user sees. The hidden table has a Type column (Income / Deduction / Take-home), but a colour-blind sighted user still gets nothing in the chart itself |
| 3 | **Most segmented controls have no roving tabindex** — each button is individually tabbable rather than the group being one tab stop with arrow-key navigation | Valid and usable as-is; proper roving focus is JS behaviour rather than attributes. The Health activity cards DO implement it and are the pattern to copy |
| 4 | **Ad placeholders render as visible grey boxes** and ignore the theme | Deliberate, pending AdSense approval. `AdUnit.jsx` hardcodes `#d6dde5` — the only element in the app that ignores dark mode |

Worth doing before the Android wrappers freeze the markup: items 1 and 2 are
small design decisions, and item 3 is a contained piece of shared behaviour.
