# FY2026-27 Rates Verification — Fix Brief

**Verified:** 10 September 2026 · **Applies to:** FY2026-27 (1 July 2026 – 30 June 2027)
**Scope:** Australian tax, super, lending, stamp duty, Age Pension and health figures feeding 12 public calculators.

This supersedes all earlier versions. It contains no superseded content — every figure here is the current verified position.

## How to read this

**§1** is the per-item verdict table, in the format originally requested. One row per item, one verdict per row. Source URLs are given as short IDs resolved in **§9**, because full URLs inline make the table unreadable; that is the only deviation from the requested format.

**§2** covers changes that need new logic, not a value swap. Read it before touching any of the items §1 marks as structural.

**§3** holds the reference tables. **§4** is new regimes to build. **§5** is confirmed-correct, do-not-touch. **§6** is unpublished and deferred items. **§7** is the re-verification schedule and the recorded decisions.

**§8 is the test-vector set.** Run the relevant cases against each implementation as you build it, not at the end. Cases marked `[trap]` test the structural issues in §2 — those are the failures that produce plausible-looking wrong numbers rather than obvious errors.

### Status values

| Status | Meaning |
|---|---|
| `CODE CORRECT` | Existing value verified right. Do not change. |
| `CODE WRONG` | Existing value verified wrong. Change it. |
| `CLAIM WRONG` | The value asserted in the original brief was wrong; code may or may not be. |
| `BOTH WRONG` | Existing value **and** the asserted correction are both wrong. |
| `NOT VERIFIED` | Could not be confirmed. **Do not change on the strength of this document.** |
| `MISSING` | Not present in the code at all and needs adding. |

### Confidence labels

`[P]` primary source — ato.gov.au, a revenue office, APRA, Treasury, legislation.
`[S]` secondary — consistent across reputable non-primary sources.
`[D]` derived — calculated from a published method or anchors, with the validation shown.
`[I]` inferred — reasoned from a primary source but not directly stated.

**Anything labelled `[S]`, `[D]` or `[I]` should carry its source date in the calculator's methodology note.**

---

# §1 Fix table

## 1.1 Income tax — residents

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| 2nd bracket rate | 16% | 15% | **15%** `[P]` | S1 | `CODE WRONG` | 1 Jul 2026 | Claim was right |
| Cumulative base at $45,001 | $4,288 | $4,020 | **$4,020** `[P]` | S1 | `CODE WRONG` | 1 Jul 2026 | |
| Cumulative base at $135,001 | $31,288 | $31,020 | **$31,020** `[P]` | S1 | `CODE WRONG` | 1 Jul 2026 | |
| Cumulative base at $190,001 | $51,638 | $51,370 | **$51,370** `[P]` | S1 | `CODE WRONG` | 1 Jul 2026 | |
| Bracket thresholds | 18,200/45,000/135,000/190,000 | unchanged | **unchanged** `[P]` | S1 | `CODE CORRECT` | — | Rate changed, thresholds did not |
| 14% second bracket | — | scheduled | **still scheduled** `[P]` | S1 | — | 1 Jul 2027 | Build brackets as year-keyed data |
| Foreign resident scale | — | — | **30% / 37% / 45%, no threshold, no Medicare levy** `[I]` | S1 | `NOT VERIFIED` | — | Unchanged by inference — the amended bracket doesn't exist in the non-resident scale. No separately published FY2026-27 table located |
| WHM scale | — | — | **15% to $45,000, then 30% to $135,000, then resident rates** `[P]` | S2 | — | FY2026-27 | 45% if no TFN. Registered employers only; unregistered withhold at foreign resident rates |

## 1.2 Offsets and levies

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| LITO maximum | $700 | — | **$700** `[P]` | S3 | `CODE CORRECT` | unchanged since 2020-21 | |
| LITO taper 1 | 5c/$1 from $37,500 | — | **5c/$1 from $37,500** `[P]` | S3 | `CODE CORRECT` | | |
| LITO taper 2 | 1.5c/$1 from $45,000 | — | **$325 less 1.5c/$1 over $45,000** `[P]` | S3 | `CODE CORRECT` | | |
| LITO cut-out | $66,667 | — | **$66,667** `[P]` | S3 | `CODE CORRECT` | | Non-refundable. **Do not apply to per-pay figures** — PAYG ignores LITO |
| Medicare levy rate | 2% | — | **2%** `[P]` | S1 | `CODE CORRECT` | — | |
| ML low-income single lower | $27,069 | — | **not published** | S4 | `NOT VERIFIED` | — | Use $28,011 (FY2025-26) + note. See §6.1 |
| ML low-income single upper | $33,836 | — | **not published** | S4 | `NOT VERIFIED` | — | Use $35,013 (FY2025-26) + note |
| ML phase-in rate | 10c/$1 | — | **10c/$1, capped at 2%** `[P]` | S4 | `CODE CORRECT` | — | Structure right, thresholds stale |
| MLS Tier 1 single | >$100,000 → 1% | — | **$105,001–$123,000 → 1%** `[P]` | S5 | `CODE WRONG` | 1 Jul 2026 | |
| MLS Tier 2 single | >$116,000 → 1.25% | — | **$123,001–$164,000 → 1.25%** `[P]` | S5 | `CODE WRONG` | 1 Jul 2026 | |
| MLS Tier 3 single | >$155,000 → 1.5% | — | **$164,001+ → 1.5%** `[P]` | S5 | `CODE WRONG` | 1 Jul 2026 | |
| MLS family tiers | absent | — | **$210,000 / $246,001 / $328,001** `[P]` | S5 | `MISSING` | 1 Jul 2026 | +$1,500 per dependent child after the first |
| MLS charged on | — | — | **whole income for MLS purposes, not the excess** `[P]` | S5 | — | — | Cliff, not taper. See §2.5 |
| MLS income — RESC added back? | — | — | **Yes** `[P]` | S5 | — | — | Full definition in §2.5 |
| SAPTO exists | — | — | **Yes** `[P]` | S6 | — | — | Max amounts unchanged; thresholds moved with the tax cuts |
| SAPTO single max / shade-out / cut-out | — | — | **$2,230 / $36,034 / $53,874** `[D]` | S6 | — | 1 Jul 2026 | Derivation and validation in §3.2 |
| SAPTO couple max / shade-out / cut-out | — | — | **$1,602 / $31,847 / $44,663** each `[D]` | S6 | — | 1 Jul 2026 | |
| SAPTO illness-separated | — | — | **$2,040 / $34,767 / $51,087** each `[D]` | S6 | — | 1 Jul 2026 | |
| SAPTO taper | — | — | **12.5c/$1, rounded up to nearest dollar** `[P]` | S6 | — | — | |

## 1.3 HELP / study and training loans

**The code implements the abolished system. The correction asserted in the original brief is also wrong — it quotes FY2025-26 figures and omits the top tier.**

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| Structure | % of total, 18 brackets | marginal | **marginal for two bands, then flat % of total** `[P]` | S7 | `BOTH WRONG` | FY2025-26 onwards | See §2.1 — this is the largest error in the audit |
| Nil threshold | $58,500 | $67,000 | **$69,528** `[P]` | S7 | `BOTH WRONG` | 1 Jul 2026 | $67,000 was FY2025-26 |
| Band 1 | — | 15% over $67,000 | **15c/$1 over $69,528** `[P]` | S7 | `BOTH WRONG` | 1 Jul 2026 | Applies $69,529–$129,717 |
| Band 2 | — | $8,700 + 17% over $125,000 | **$9,028 + 17c/$1 over $129,717** `[P]` | S7 | `BOTH WRONG` | 1 Jul 2026 | Applies $129,718–$186,050 |
| Top tier | absent | not mentioned | **10% of TOTAL repayment income above $186,051** `[P]` | S7 | `BOTH WRONG` | 1 Jul 2026 | **Not marginal.** See §2.1 |
| Repayment income definition | partial | partial | **five components** `[P]` | S7 | `CODE WRONG` | — | Full definition in §2.1 |
| Loan types | — | — | **HELP, VSL, SFSS, SSL, ABSTUDY SSL, AASL all use the same schedule** `[P]` | S7 | — | — | Repayment order: HELP → VSL → SFSS → SSL → ABSTUDY SSL → AASL |
| 20% debt reduction | — | — | **applied 1 Jun 2025, before 2025 indexation** `[S]` | S8 | `NOT VERIFIED` | 1 Jun 2025 | Automatic; most processed by end 2025. No similar event since |
| Indexation rate | — | — | **2.8% applied 1 Jun 2026** `[S]` | S8 | `NOT VERIFIED` | 1 Jun 2026 | Lower-of-CPI-and-WPI cap not confirmed |

## 1.4 Superannuation

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| SG rate | 12% | — | **12.00%** `[P]` | S9 | `CODE CORRECT` | — | Also 12.00% from 1 Jul 2027. No further increases legislated |
| Concessional cap | $30,000 | — | **$32,500** `[P]` | S9 | `CODE WRONG` | 1 Jul 2026 | AWOTE indexation |
| Non-concessional cap | — | — | **$130,000** `[P]` | S9 | `MISSING` | 1 Jul 2026 | Multiple of the concessional cap |
| Bring-forward maximum | — | — | **$390,000** over 3 years `[P]` | S9 | `MISSING` | 1 Jul 2026 | Under 75; tiered by total super balance |
| Contributions tax | 15% | — | **15%** `[P]` | S9 | `CODE CORRECT` | — | |
| Division 293 threshold | not modelled | $250,000 | **$250,000** `[P]` | S9 | `MISSING` | unchanged since 2017-18 | Rate 15%. Payable on the lesser of the excess over the threshold or the concessional contributions |
| Carry-forward TSB test | — | $500,000 | **$500,000, not indexed** `[P]` | S9 | — | — | Tested at 30 June of the previous year |
| Carry-forward lookback | — | 5 years | **5 years, then expires** `[P]` | S9 | — | — | |
| Transfer balance cap | — | — | **$2.1m** `[P]` | S9 | `MISSING` | 1 Jul 2026 | Up from $2.0m |
| Defined benefit income cap | — | — | **$131,250** `[P]` | S9 | `MISSING` | 1 Jul 2026 | |
| Low rate cap | — | — | **$260,000** `[P]` | S9 | `MISSING` | 1 Jul 2026 | |
| Untaxed plan cap | — | — | **$1,935,000** `[P]` | S9 | `MISSING` | FY2026-27 | |
| CGT cap amount | — | — | **$1,935,000** `[P]` | S9 | `MISSING` | FY2026-27 | |
| Preservation age | — | 60 for everyone | **60 for anyone born from 1 Jul 1964** `[P]` | S9 | `CODE CORRECT` | — | Effectively 60 for all — everyone born earlier is already past it |
| Minimum drawdown | — | — | **standard factors, no reduction in force** `[P]` | S9 | — | — | Table in §3.5. 50% reduction ran FY2019-20 to FY2022-23 only |
| Max super contribution base | quarterly | — | **ANNUAL $270,830** `[P]` | S9 | `CODE WRONG` | 1 Jul 2026 | Structural change. See §2.2 |
| Co-contribution | — | — | **max $500; lower $49,293; higher $64,293** `[P]` | S9 | `MISSING` | 1 Jul 2026 | |
| LISTO | — | — | **up to $500, ATI to $37,000** `[P]` | S9 | `MISSING` | — | |
| Division 296 | not modelled | legislated? | **legislated, applies from 1 Jul 2026** `[S]` | S10 | `MISSING` | 1 Jul 2026 | **Flag, do not compute** — decision recorded. See §4.2 |

## 1.5 First Home Super Saver Scheme

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| Annual releasable | $15,000 | — | **$15,000** `[P]` | S11 | `CODE CORRECT` | — | |
| Lifetime releasable | $50,000 | — | **$50,000** `[P]` | S11 | `CODE CORRECT` | — | |
| Concessional releasable % | **100%** | 85% | **85%** `[P]` | S11 | `CODE WRONG` | — | Materially overstates the benefit. Claim was right |
| Non-concessional releasable % | — | — | **100%** `[P]` | S11 | — | — | |
| Annual cap ordering | — | — | **$15,000 cap applies BEFORE the 85% haircut** `[P]` | S11 | `CODE WRONG` | — | $25,000 sacrificed → $15,000 eligible → $12,750 releasable |
| Associated earnings rate | 7.14% | SIC? | **SIC rate, quarterly — 7.43% for Q1 FY2026-27** `[P]` | S12 | `CODE WRONG` | 1 Jul 2026 | 90-day BAB + 3%, **compounded daily**. Structural — see §2.6 |
| Withdrawal tax | marginal − 30% | marginal + Medicare − 30% | **assessable, with a 30% offset; Medicare applies** `[I]` | S11 | `CODE WRONG` | — | Likely understating by 2pp. Not directly confirmed |
| FHSS released amount in HELP/MLS income | — | — | **EXCLUDED from both** `[P]` | S5, S7 | `MISSING` | — | Don't double-count |
| Eligibility | — | — | **full set** `[P]` | S11 | — | — | See §3.7 |

## 1.6 Termination and redundancy

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| Genuine redundancy base limit | $13,462 | — | **$13,598** `[P]` | S9 | `CODE WRONG` | FY2026-27 | Code value matches no published year |
| Genuine redundancy per year of service | $6,734 | — | **$6,801** `[P]` | S9 | `CODE WRONG` | FY2026-27 | AWOTE indexed; new figures each February |
| ETP cap (life benefit) | $235,000 | — | **$270,000** `[P]` | S9, S13 | `CODE WRONG` | FY2026-27 | |
| ETP cap (death benefit) | — | — | **$270,000** `[P]` | S9 | `MISSING` | FY2026-27 | |
| Whole-of-income cap | absent | $180,000, un-indexed | **$180,000, NOT indexed** `[P]` | S13 | `MISSING` | FY2026-27 and later | Reduced by other taxable income in the year |
| ETP rate under preservation age | 32% | — | **32%** (30% + 2%) `[P]` | S13 | `CODE CORRECT` | — | |
| ETP rate at/above preservation age | 17% | — | **17%** (15% + 2%) `[P]` | S13 | `CODE CORRECT` | — | |
| ETP rate above cap | — | — | **47%** (45% + 2%) `[P]` | S13 | `MISSING` | — | |
| ETP age test | fixed 60? | preservation age or 60? | **preservation age, measured at 30 June of the payment year** `[P]` | S13 | `CODE WRONG` | — | Same outcome today, but implement as preservation age |
| Unused annual leave on redundancy | — | max 32% | **max 32%** `[P]` | S14 | `CLAIM CORRECT` | — | Offset limits it to 30% + Medicare |
| Unused LSL | — | — | **three accrual periods** `[P]` | S14 | `MISSING` | — | Table in §3.3 |
| Redundancy age limit | — | under Age Pension age? | **under Age Pension age** `[S]` | S15 | — | — | Raised from 65. Age Pension age = 67 |
| Age Pension age | — | — | **67** `[P]` | S6 | — | since 1 Jul 2023 | |
| NES redundancy scale | — | — | **4 to 16 weeks, then DROPS to 12** `[S]` | S16 | `MISSING` | — | Non-monotonic. Table in §3.4, warning in §2.4 |

## 1.7 Capital gains tax

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| CGT discount for individuals | 50% | still 50%? | **50%** `[P]` | S17 | `CODE CORRECT` | to 30 Jun 2027 | **Abolished for CGT events from 1 Jul 2027** — see §4.1 |
| Ownership period test | — | more than 12 months? | **at least 12 months, EXCLUDING both the acquisition day and the CGT event day** `[P]` | S17 | `CODE WRONG` | — | Off-by-two trap. See §2.3 |
| CGT event date | — | contract date | **contract date, not settlement** `[P]` | S17 | `CLAIM CORRECT` | — | Applies to acquisition too. No contract → time of sale |
| Loss ordering | — | losses before discount | **losses applied BEFORE the discount** `[S]` | S18 | `CLAIM CORRECT` | — | Discounting first understates tax |
| Super fund discount | — | — | **33.33%** `[P]` | S17 | `MISSING` | — | Companies not eligible at all |
| Medicare levy on capital gain | — | — | **applies** `[I]` | S17 | `NOT VERIFIED` | — | Gain sits in taxable income |
| Gain in HELP / MLS income | — | — | **counts in both** `[I]` | S5, S7 | `NOT VERIFIED` | — | Both start from taxable income |
| Main residence 6-year rule | — | — | **6 years if income-producing; indefinite if not** `[P]` | S19 | `MISSING` | — | Limit applies **separately to each absence**. See §2.7 |
| Partial exemption formula | — | — | **gain × (non-MR days ÷ ownership days)** `[P]` | S19 | `MISSING` | — | Discount then applies to the assessable portion |
| Foreign resident main residence exemption | — | — | **none at all** `[S]` | S19 | `MISSING` | — | Cliff, not apportioned. Tested at contract signing date |
| Foreign resident CGT withholding | — | — | **15%, NO price threshold** `[S]` | S19 | `CODE WRONG` | 1 Jan 2025 | Old 12.5% / $750,000 settings gone. Now catches resident sellers without a clearance certificate |

## 1.8 FBT and novated leasing

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| FBT rate | 47% | — | **47%** `[S]` | S20 | `CODE CORRECT` | FBT year to 31 Mar 2027 | |
| Type 1 gross-up | 2.0802 | — | **2.0802** `[S]` | S20 | `CODE CORRECT` | — | The one for a novated lease where the employer claims the ITC |
| Type 2 gross-up | absent | — | **1.8868** `[S]` | S20 | `MISSING` | — | Classification follows GST treatment, not the benefit's label |
| Statutory fraction | 20% | — | **20% standard, but 0% / 15% for EVs** `[P]` | S21 | `CODE WRONG` | — | Needs a date-and-price lookup. See §2.8 |
| PHEVs FBT-exempt | **yes** | exemption ended 1 Apr 2025 | **not exempt** `[P]` | S22 | `CODE WRONG` | 1 Apr 2025 | Claim was right. Narrow grandfathering only — see §2.8 |
| BEV / FCEV exemption | — | — | **full, to 31 Mar 2027** `[P]` | S21 | — | — | Then phases down |
| LCT threshold — fuel-efficient | $91,000 | — | **$91,661** `[S]` | S23 | `CODE WRONG` | 1 Jul 2026 | This is the one gating EV FBT exemption |
| LCT threshold — general | absent | — | **$80,809** `[S]` | S23 | `MISSING` | 1 Jul 2026 | CPI indexation factor 1.003 `[P]` |
| Fuel-efficient definition | — | — | **≤3.5L/100km** `[S]` | S23 | `CODE WRONG` | 1 Jul 2025 | Was ≤7L/100km. Most hybrids now fall to the lower threshold |
| RFBA on exempt EV | — | — | **still reportable** `[P]` | S21 | `MISSING` | — | Downstream effects in §3.6 |
| Residual values 1–5 yr | 65.63 / 56.25 / 46.88 / 37.5 / 28.13% | — | **same** `[S]` | S24 | `CODE CORRECT` | — | But see the three caveats in §3.8 |
| Cents per km | — | — | **91c, cap 5,000km, max $4,550** `[S]` | S25 | `CODE WRONG` | 1 Jul 2026 | Was 88c. Work-related only, not commuting |
| EV home charging rate | — | — | **5.47c/km** `[S]` | S24 | `CODE WRONG` | FBT year to 31 Mar 2027 | Was 4.20c. PCG 2024/2 |
| FBT benchmark interest rate | — | — | **8.27%** `[S]` | S26 | `MISSING` | FBT year to 31 Mar 2027 | Was 8.62% |
| Employee contribution method | — | post-tax = taxable value → nil FBT | **confirmed** `[S]` | S27 | `CLAIM CORRECT` | — | Must be paid before 31 March. Employer keeps GST credits and deductions |

## 1.9 Stamp duty

Full scales in **§3.1**. This table records only the verdicts and the first-home-buyer positions.

| Jurisdiction | Verified FY2026-27 FHB position | Source | Status | Effective | Notes |
|---|---|---|---|---|---|
| **NSW** | Full exemption ≤$800,000; concession $800,001–$999,999; land ≤$350,000 / to $449,999 `[P]` | S28 | — | 1 Jul 2023 | Brackets and premium threshold **CPI-indexed each 1 July** `[P]`. Premium tier above $3,870,000. Foreign surcharge 9% |
| **VIC** | Full exemption ≤$600,000; sliding concession to $750,000; nothing above `[S]` | S29 | — | — | Concession band uses **general** rates, not PPR rates. FPAD 8%. No rate changes in the 2026-27 Budget |
| **QLD** | New home / vacant land: **full concession, no value cap**. Established: $700,000 full, phasing to $800,000 `[P]` | S30 | — | 1 May 2025 / 9 Jun 2024 | **Both still in force** — the original brief's claim was correct. **Plus a new citizenship requirement from 1 Aug 2026** — see §4.4. AFAD 8% |
| **SA** | New homes / off-the-plan / land to build: **no value cap**. **No relief on established homes** `[P]` | S31 | `CLAIM CORRECT` | 2024-25 Budget | Commercial and industrial **duty-free since 1 Jul 2018**. Surcharge 7% on residential and primary production |
| **WA** | Full exemption ≤$600,000; concession to $800,000; land ≤$450,000 / to $550,000 `[S]` | S32 | `CODE WRONG` | **7 May 2026** | Was $430,000/$530,000. **Metro/regional distinction removed.** Reassessments and refunds back to 7 May 2026. Surcharge 7% |
| **TAS** | Established-home exemption **ENDED**. Permanent uncapped **new-home** exemption remains `[P]` | S33 | `CODE WRONG` | **30 Jun 2026** | Test is **settlement** date, not contract. FHOG now **$20,000** (was $10,000). Surcharge 8% + 1.5% on primary production land |
| **ACT** | HBCS: **full exemption, no value cap, no income test** `[P]` | S34 | `CODE WRONG` | **1 Jul 2026** | Delete the $1,020,000 cap. **Not a first-home-buyer test** — see §2.9. No duty surcharge; 0.75% annual land tax surcharge instead |
| **NT** | **No FHB duty concession.** $50,000 HomeGrown Territory Grant instead `[S]` | S35 | `CODE WRONG` | — | If the code has an NT FHB concession, **delete it**. Quadratic formula still applies — see §3.1. **No foreign surcharge, no land tax** |

## 1.10 Lending and serviceability

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| APRA serviceability buffer | 3.0pp | still 3.0? | **3.0 percentage points** `[P]` | S36 | `CODE CORRECT` | since Oct 2021 | No signalled change. Confirmed still 3pp as at Aug 2026 |
| Minimum assessment rate floor | — | — | **no universal floor exists** `[P]` | S36 | `NOT VERIFIED` | — | Industry anchor: weighted average assessment rate **8.71%** in the March 2026 quarter, against 5.90% on loans funded |
| HEM benchmarks | — | — | **proprietary, not published** `[P]` | S37 | `NOT VERIFIED` | — | Melbourne Institute, licensed to lenders. Approximation guidance in §3.9 |
| Credit card assessment | — | 3% or 3.8%? | **3.0%–3.8% of limit monthly** `[S]` | S37 | `NOT VERIFIED` | — | Sources split. Use 3.8%, editable. Applies to the **full approved limit** regardless of balance |
| HELP in serviceability | — | 2025 guidance allows disregarding? | **No — repayment still counts** `[S]` | S38 | `CLAIM WRONG` | — | The exclusion is **DTI only**. See §2.10 |
| HELP in DTI ratio | — | — | **must be EXCLUDED** `[S]` | S38 | `MISSING` | 30 Sep 2025 | APRA ARS 223.0. No lender discretion |
| Rental income shading | — | — | **80%** (range 70–80%) `[P]` | S39 | `MISSING` | — | APG 223 requires ≥20% shading of rent, bonuses and overtime |
| LMI | — | — | **bracket percentages** `[S]` | S40 | `MISSING` | — | Table and label in §3.10 |
| First Home Guarantee | — | — | **no income caps, no place caps** `[S]` | S41 | `CODE WRONG` | 1 Oct 2025 | **Do not hardcode price caps** — see §2.11 |
| APRA DTI limit | — | — | **DTI ≥6 capped at 20% of new lending** `[S]` | S38 | `MISSING` | 1 Feb 2026 | Lender-level, **not a borrower cap**. See §4.3 |

## 1.11 Age Pension

| Item | Code value | Claimed correct | Verified FY2026-27 | Source | Status | Effective | Notes |
|---|---|---|---|---|---|---|---|
| Age Pension age | — | — | **67** `[P]` | S6 | — | since 1 Jul 2023 | |
| Max rate single | — | — | **$1,237.70/ft** `[S]` | S42 | `CODE WRONG` | **20 Sep 2026** | Was $1,200.90. Includes Pension and Energy Supplements |
| Max rate couple each | — | — | **$933.00/ft** `[S]` | S42 | `CODE WRONG` | 20 Sep 2026 | Combined $1,866.00 |
| Deeming lower / upper | — | — | **1.75% / 3.75%** `[S]` | S42 | `CODE WRONG` | **20 Sep 2026** | Was 1.25% / 3.25% |
| Deeming thresholds | — | — | **$66,800 / $110,600** `[S]` | S42 | `MISSING` | 1 Jul 2026 | **Unchanged on 20 September** |
| Income free area | — | — | **$226 / $396 per ft** `[S]` | S42 | `MISSING` | 1 Jul 2026 | **Unchanged on 20 September** — only upper limits move |
| Income taper | — | — | **50c/$1** (couples 25c each on combined) `[S]` | S42 | `MISSING` | — | |
| Income cut-out | — | — | **$2,701.40 / $4,128.00 per ft** `[S]` | S42 | `MISSING` | **20 Sep 2026** | Illness-separated combined $5,346.80 |
| Assets threshold (full) | — | — | **$333,000 / $600,000 / $499,000 / $766,000** `[S]` | S42 | `MISSING` | 1 Jul 2026 | Single homeowner / single non-HO / couple HO / couple non-HO |
| Assets cut-off (part) | — | — | **$745,750 / $1,012,750 / $1,121,000 / $1,388,000** `[S]` | S42 | `MISSING` | **20 Sep 2026** | Rose with the rate |
| Assets taper | — | — | **$3.00/ft per $1,000** `[S]` | S42 | `MISSING` | — | |
| Method | — | — | **calculate both tests, pay the LOWER** `[S]` | S42 | `MISSING` | — | |
| Family home | — | exempt | **exempt** `[S]` | S42 | `CLAIM CORRECT` | — | |
| Work Bonus | — | — | **$300/ft, bank to $11,800** `[S]` | S42 | `NOT VERIFIED` | — | One source gives $460 — conflict. Use $300 |

## 1.12 Health

| Item | Code value | Claimed correct | Verified | Source | Status | Notes |
|---|---|---|---|---|---|---|
| BMR equation | Mifflin-St Jeor | still recommended? | **still recommended, using actual body weight** `[P]` | S43 | `CODE CORRECT` | Other equations tested were less accurate. Limitations in §3.11 |
| Activity multipliers | — | — | **DRI PAL: sedentary / low active / active / very active** `[P]` | S43 | `NOT VERIFIED` | Only "very active = 1.9 to <2.5" and "low active" confirmed. Different taxonomy from the common 1.2–1.9 set |
| kcal per kg | ~7,700 | still accepted? | **~7,700** `[S]` | S44 | `CODE CORRECT` | First-order only — see §2.12 |
| Minimum safe intake | — | — | **1,200 kcal women / 1,500 kcal men** `[S]` | S44 | `MISSING` | Below 800 kcal/day requires medical supervision. **HARD BLOCK** — decision recorded |
| Max safe rate of loss | — | — | **0.5%–1.0% of bodyweight/week** `[S]` | S44 | `MISSING` | Bands in §3.12. **HARD BLOCK above 1.1%** |
| Protein intake | — | — | **1.6–2.4 g/kg fat loss** `[S]` | S45 | `MISSING` | Ranges and the scaling answer in §3.12 |
| Protein scaling basis | — | total / goal / LBM? | **lean body mass or goal weight for higher body fat** `[S]` | S45 | — | Morton 1.6 g/kg is per **bodyweight**; Helms 2.3–3.1 g/kg is per **fat-free mass**. Different denominators |
| Ethnicity-adjusted BMI | — | Australian recommendation? | **WHO yes; Australian authorities NOT CONFIRMED** `[S]` | S46 | `NOT VERIFIED` | See §2.13 — more qualified than it appears |
| Metabolic adaptation | — | — | **~100–150 kcal/day per 10kg lost** `[S]` | S43 | `MISSING` | Weight loss removes fat plus 20–25% lean mass |

---

# §2 Structural changes — read before implementing

These cannot be fixed by swapping a constant.

## 2.1 HELP — replace the whole calculation

Delete the percentage-of-total logic entirely. FY2026-27:

| Repayment income | Repayment |
|---|---|
| $0 – $69,528 | Nil |
| $69,529 – $129,717 | 15c for each $1 over $69,528 |
| $129,718 – $186,050 | $9,028 plus 17c for each $1 over $129,717 |
| $186,051 and over | **10% of total repayment income** |

### The trap

**The top tier is not marginal.** Above $186,051 the calculation reverts to a flat 10% of *total* income. A purely marginal implementation understates high earners by thousands.

ATO example: repayment income $254,780 → 10% → **$25,478**.

Unit-test the boundary. At $186,050 the marginal path gives $9,028 + 17% × $56,333 = $18,604.61. At $186,051 the flat path gives $18,605.10. Small step, structurally different formulae.

### Repayment income — five components

1. Taxable income — **excluding** any assessable FHSS released amount
2. Reportable fringe benefits — **regardless of the exempt status of the employer**
3. Total net investment loss, including net rental losses
4. Reportable super contributions
5. Exempt foreign employment income

Both qualifiers matter and are commonly missed.

## 2.2 Max super contribution base — quarterly to annual

Replace any quarterly cap logic. From 1 July 2026 there is a single **annual** cap of **$270,830**.

ATO formula: `concessional cap × 100 ÷ charge percentage`, rounded down to the nearest $10. $32,500 × 100 ÷ 12 = $270,833 → $270,830.

Once payments of qualifying earnings reach the annual base, the employer can stop paying minimum SG for that employee for the year.

**Payday Super, same date:** SG is payable **each payday**, not quarterly, and is calculated on **"qualifying earnings"** rather than ordinary time earnings. `[S]` within 7 business days of payday. If the Salary Sacrifice or Retirement calculators assume quarterly SG or an OTE base, both need revisiting — the OTE → qualifying earnings change may alter which earnings attract SG.

## 2.3 CGT 12-month test — off by two

**Both the acquisition day and the CGT event day are excluded.**

ATO example: acquired 20 June 2025, CGT event 20 June 2026 → count 21 June 2025 to 19 June 2026 = 364 days → **no discount**.

`sale_date - purchase_date >= 365` wrongly grants the discount on exactly-one-year holdings. 11 months 29 days gets nothing.

## 2.4 NES redundancy scale is not monotonic

It **peaks at 16 weeks for 9–10 years, then drops to 12 weeks at 10+**. Any rising-scale implementation is wrong for every employee past ten years.

Deliberate — from the 2004 Redundancy Case, reflecting long-serving employees accessing long service leave on termination. An employee with 9.5 years gets 16 weeks; one with 10.5 years gets 12 weeks **plus** their LSL.

Read from the table in §3.4. Never extrapolate the pattern.

## 2.5 MLS is a cliff, and its income base is wide

**MLS applies to the whole income for MLS purposes once a tier is entered, not to the excess.** ATO example: taxable income $90,000 + RFB $27,000 = $117,000 → Tier 1 → MLS = $117,000 × 1% = **$1,170**.

**Income for MLS purposes:**

1. Taxable income — including the net amount on which family trust distribution tax was paid; **excluding** assessable FHSS released amounts
2. Reportable fringe benefits
3. Total net investment losses = net financial investment losses + net rental property losses
4. Reportable super contributions = reportable **employer** super contributions **+ deductible personal** super contributions
5. If there is a spouse: their share of trust net income taxed to the trustee under s98 ITAA 1936

Plus exempt foreign employment income where taxable income is $1 or more. Couples use **combined** income.

Note component 4 includes deductible *personal* contributions, not just salary sacrifice.

## 2.6 FHSSS associated earnings — quarterly and compounding

Not a constant. The rate is the **shortfall interest charge**: 90-day Bank Accepted Bill rate **+ 3%**, set quarterly (announced ~2 weeks ahead), **compounded daily**, with the daily rate being the annual rate ÷ days in the calendar year. Statutory basis: s280-105 Schedule 1 TAA 1953.

Build a quarterly lookup keyed to quarter start date. Q1 FY2026-27 = **7.43%**. Q2 onward populate as published.

## 2.7 Main residence 6-year rule resets

**The 6-year limit applies separately to each period of absence** immediately following a period of actually living in the property. The ATO's own example has a taxpayer treating a house as their main residence across **two separate rental periods** and disregarding the gain entirely.

A single cumulative six-year counter is wrong.

Also: **indefinitely** if the property was not income-producing during the absence — the six-year limit only bites where it was rented or otherwise producing income.

## 2.8 FBT on vehicles — three rates, plus a PHEV correction

### PHEVs are not exempt

From 1 April 2025 a plug-in hybrid is not a zero or low emissions vehicle for FBT. Grandfathering requires **both**: use or availability was exempt **before** 1 April 2025, **and** a financially binding pre-existing commitment continues. And it terminates — if the commitment **changes** on or after 1 April 2025 the exemption stops from the new commitment date; if it **ends**, the exemption applies up to and including that date.

### Statutory rate becomes a date-and-price lookup

| Period | Car cost | Statutory rate | Effect |
|---|---|---|---|
| To 31 Mar 2027 | ≤ fuel-efficient LCT threshold | **0%** | Full exemption |
| 1 Apr 2027 – 1 Apr 2029 | ≤$75,000 | **0%** | 100% discount |
| 1 Apr 2027 – 1 Apr 2029 | >$75,000, < LCT threshold | **15%** | 25% discount |
| From 1 Apr 2029 | All eligible EVs | **15%** | 25% discount |
| Any | Non-eligible vehicle | **20%** | Standard |

Pre-existing leases are excluded from the new rules `[S]`. Note that from 1 April 2027 EVs above $75,000 gain a *partial* discount they were previously excluded from — not uniformly a tightening.

**Exemption conditions (all required):** zero or low emissions vehicle; first held **and** used on or after 1 July 2022; used by a current employee or associate; LCT has **never** been payable. Salary-packaged benefits are included. Motorcycles and scooters are never cars for FBT and never qualify.

An ATO review of the exemption is due to be completed by **mid-2027**.

## 2.9 ACT HBCS is not a first-home-buyer test

The test is **not having owned property in the last five years** — for all buyers and their domestic partners. Someone who sold a home six years ago qualifies.

If the code gates this on `is_first_home_buyer`, it wrongly excludes eligible people.

Also required: at least one buyer must own and live in the home as their principal residence for **at least 12 months, commencing within one year of settlement**.

**Transaction date governs, and it is the date contracts are signed and exchanged, not settlement.** Contracts exchanged before 1 July 2026 may fall under the old income-tested rules even if settlement is later. This needs a date branch.

Separately: the **eligible owner-occupier duty rate** is a broader and different test — you only need to genuinely live there, not to be a first home buyer. Two distinct concessions.

## 2.10 HELP in serviceability vs DTI

Two calculations; the 2025 change affects only one.

**Serviceability:** the compulsory repayment is a committed expense reducing net disposable income. **Unchanged.** Lenders still count it, regardless of repayment progress.

**DTI ratio:** APRA's revision of **ARS 223.0, effective 30 September 2025**, requires HELP debts to be **excluded** from the credit limit of all debts for DTI purposes. No lender discretion.

If the code disregards HELP in serviceability on the strength of that guidance, it is wrong.

Useful behaviour to reflect: because lenders assess the **repayment**, not the balance, a $25,000 and an $80,000 HELP debt cost roughly the same capacity at the same income. Capacity drops once repayments trigger and stays there until the debt clears.

## 2.11 First Home Guarantee price caps — do not hardcode

Secondary sources contradict each other badly, and several are still republishing pre-October-2025 figures.

| Location | Post-Oct-2025 | Stale figures still circulating |
|---|---|---|
| Sydney | $1,500,000 | $900,000 |
| Melbourne | $950,000 | $800,000 |
| Brisbane | $1,000,000 | $700,000 |
| Regional NSW | $800,000 | $650,000 |

Anything still describing **income caps** ($125,000/$200,000) or **35,000 places** is pre-expansion and unreliable on caps too.

**Confirmed structure:** the $1.5m Sydney cap extends to Illawarra, Newcastle and Lake Macquarie. Regional centres are specifically defined — Geelong (VIC), Gold Coast and Sunshine Coast (QLD). NT from 1 July 2026: Darwin $750,000, rest of Territory $600,000. **Both** the purchase price and the lender-assessed valuation must be at or below the cap. Some suburbs straddle postcodes with different caps.

**Take the postcode and link to Housing Australia's Postcode Search Tool** at firsthomebuyers.gov.au. Caps are indexed and vary by address; a hardcoded table will be wrong somewhere you can't see.

**Also flag:** the guarantee solves the deposit and LMI problem, not serviceability. A 5% deposit buyer still faces the full assessment. If the Borrowing Power tool implies the scheme increases capacity, that's wrong.

## 2.12 The 7,700 kcal/kg constant needs a caveat

7,700 kcal per kilogram of body fat remains standard. But `deficit × days ÷ 7700` diverges from reality because of metabolic adaptation, changing body composition, glycogen and fluid shifts, and individual variation. Weight lost is not purely fat.

Implement a **declining-BMR projection**, not a static one: weight loss removes fat plus **20–25% lean mass**, so a 10kg loss lowers BMR by roughly **100–150 kcal/day**. A static-BMR projection systematically overstates how fast loss continues.

## 2.13 Ethnicity-adjusted BMI is more qualified than it looks

The 2004 WHO Expert Consultation is commonly cited for Asian cut-offs of **23** (overweight) and **27.5** (obesity), on the basis that Asian populations carry more body fat — particularly visceral — at any given BMI.

**But two complications:**

1. **The consultation did not redefine the classification.** It **retained the standard WHO cut-offs** as the international classification and declined to set population-specific ones, because the data didn't support one clear threshold. Instead it identified **public health action points** at 23.0, 27.5, 32.5 and 37.5 kg/m². Observed-risk cut-offs range from 22 to 25 across different Asian populations.
2. **Two competing obesity thresholds are in active use.** The Expert Consultation gives **27.5**; WHO's Western Pacific Regional Office and South/Southeast Asian consensus groups give **25**.

**I could not confirm that Australian health authorities recommend ethnicity-adjusted thresholds.** Everything located is WHO or non-Australian (NICE, ICMR, Asian national bodies).

**Recommendation:** if offered, present as an optional, clearly attributed view — "WHO Asian-adjusted cut-offs, 2004 Expert Consultation" — not as the Australian default. Note that BMI is a screening tool and waist circumference adds information it can't capture. Point mixed-ancestry users to a clinician rather than asking them to self-select.

Separately, the Mifflin-St Jeor equation itself was never validated outside Caucasian populations. Different limitation; both belong in the methodology note.

---

# §3 Reference tables

## 3.1 Stamp duty — eight jurisdictions

Duty is charged on the **transfer date**, not by financial year. Several jurisdictions changed mid-year. **Key every scale to contract date.**

### NSW `[S, cross-checked to Revenue NSW]`

| Dutiable value | Duty |
|---|---|
| ≤ $18,000 | 1.25% |
| $18,001 – $38,000 | $225 + 1.5% over $18,000 |
| $38,001 – $103,000 | $525 + 1.75% over $38,000 |
| $103,001 – $387,000 | $1,662 + 3.5% over $103,000 |
| $387,001 – $1,290,000 | $11,602 + 4.5% over $387,000 |
| $1,290,001 – $3,870,000 | $52,237 + 5.5% over $1,290,000 |
| > $3,870,000 (premium residential) | $194,137 + 7% over $3,870,000 |

Brackets and the premium threshold are **CPI-indexed each 1 July** `[P]`. Premium duty is residential-only and applies to the **first 2 hectares** of large properties as a proportion of value; the remainder is at general rates. Duty payable within 3 months of contract date or at settlement, whichever is first. Foreign surcharge **9%** (up from 8% on 1 Jan 2025). FHOG $10,000 for new homes — ⚠️ cap given as both $600,000 and $750,000; resolve if surfaced.

### VIC `[S, two cross-checks]`

**General:**

| Dutiable value | Duty |
|---|---|
| $0 – $25,000 | 1.4% |
| $25,001 – $130,000 | $350 + 2.4% over $25,000 |
| $130,001 – $960,000 | $2,870 + 6.0% over $130,000 |
| $960,001 – $2,000,000 | **flat 5.5% of the ENTIRE value** |
| > $2,000,000 | $110,000 + 6.5% over $2,000,000 |

**PPR (owner-occupier, ≤$550,000 only):** $130,001–$550,000 = $2,870 + **5.0%** over $130,000. Below $130,000 use general rates. **Above $550,000 general rates apply to the entire calculation** — no PPR benefit at all above that line.

⚠️ **The $960,001–$2,000,000 band is flat on the whole value, not a marginal slice.** A marginal implementation is wrong across a $1.04m range. Checks: $500,000 = $25,070; $800,000 = $43,070; $1,000,000 = $55,000; $2,000,000 = $110,000. PPR $500,000 = $21,370.

Also available: **City of Melbourne concession** — new residential property in the City of Melbourne LGA with dutiable value up to $1m may attract a 50% concession or full exemption (different contract dates for each). Not currently modelled; worth adding. FPAD 8%. Duty within 30 days of settlement. Unchanged in the 2026-27 Budget: pensioner concession, PPR concession, family farm exemption, deceased estate exemption, young farmer concession.

### QLD `[S, verified against two QRO worked examples]`

**Not indexed annually** — changes by legislation only.

**General:**

| Dutiable value | Duty |
|---|---|
| $0 – $5,000 | Nil |
| $5,001 – $75,000 | $1.50 per $100 over $5,000 |
| $75,001 – $540,000 | $1,050 + $3.50 per $100 over $75,000 |
| $540,001 – $1,000,000 | $17,325 + $4.50 per $100 over $540,000 |
| > $1,000,000 | $38,025 + $5.75 per $100 over $1,000,000 |

**Home concession (owner-occupier, move in within 1 year):**

| Dutiable value | Duty |
|---|---|
| $0 – $350,000 | $1.00 per $100 |
| $350,001 – $540,000 | $3,500 + $3.50 per $100 over $350,000 |
| $540,001 – $1,000,000 | $10,150 + $4.50 per $100 over $540,000 |
| > $1,000,000 | $30,850 + $5.75 per $100 over $1,000,000 |

Mechanism: the concession rate applies to the first $350,000 of the residence value, general rates to the balance. **Maximum saving $7,175 — capped, does not grow with price.**

**Rounding is per $100 or part of $100** — implement as `ceil(excess / 100) × rate`, not a percentage. QRO checks: $850,000 investment = $17,325 + $4.50/$100 over $540,000; $950,000 with home concession = **$28,600**.

Liability arises when the contract is signed or becomes unconditional. AFAD **8%**; NZ SCV 444 holders exempt. FHOG **$30,000** for new homes under $750,000, continuing from 1 July 2026. **No seniors or pensioner concession exists in QLD.** The new-home concession applies to **residential** land only — ordinary rates apply to any additional non-residential land. The concession is **conditional after settlement**; QRO requires notification (Form D2.4) if circumstances change.

### SA `[P — RevenueSA, four passing cross-checks]`

Nine marginal brackets, unchanged since 2012. **Per $100 or part of $100.**

| Value conveyed | Duty |
|---|---|
| ≤ $12,000 | $1.00 per $100 |
| $12,001 – $30,000 | $120 + $2.00 per $100 over $12,000 |
| $30,001 – $50,000 | $480 + $3.00 per $100 over $30,000 |
| $50,001 – $100,000 | $1,080 + $3.50 per $100 over $50,000 |
| $100,001 – $200,000 | $2,830 + $4.00 per $100 over $100,000 |
| $200,001 – $250,000 | $6,830 + $4.25 per $100 over $200,000 |
| $250,001 – $300,000 | $8,955 + $4.75 per $100 over $250,000 |
| $300,001 – $500,000 | $11,330 + $5.00 per $100 over $300,000 |
| > $500,000 | $21,330 + $5.50 per $100 over $500,000 |

Checks: $500,000 = **$21,330**; $600,000 = **$26,830**; $750,000 = **$35,080**; $1,000,000 = **$48,830**.

**Commercial and industrial: zero duty since 1 July 2018.** Mixed-use apportionment per RevenueSA Ruling SDA001. Foreign Ownership Surcharge **7%** on residential and primary production — **not reduced by the FHB relief**, calculated independently on the full value. Separate off-the-plan apartment concession up to **$15,500** in approved precincts (inner Adelaide). FHOG $15,000 — ⚠️ cap disputed (uncapped vs $650,000 with taper).

### WA `[S, two independent price cross-checks]`

**General:**

| Dutiable value | Duty |
|---|---|
| ≤ $120,000 | $1.90 per $100 |
| $120,001 – $150,000 | $2,280 + $2.85 per $100 over $120,000 |
| $150,001 – $360,000 | $3,135 + $3.80 per $100 over $150,000 |
| $360,001 – $725,000 | $11,115 + $4.75 per $100 over $360,000 |
| > $725,000 | $28,452.50 + $5.15 per $100 over $725,000 |

Checks: $650,000 = **$24,890**; $800,000 = **$32,315.50**. **No premium tier** — 5.15% is the top rate.

**FHOR bands (from 7 May 2026):** exemption ≤$600,000; **$16.15 per $100** in the $600,000–$800,000 band; land exemption ≤$450,000; **$20.14 per $100** in the $450,000–$550,000 band.

**Residential rate** is narrow — PPR only, and only to **$200,000**. Don't confuse with the FHOR. RevenueWA has completed system implementation with reassessments and refunds back to **7 May 2026**, so a purchase in the interim may have been assessed at the old rate and be refundable. FHOG cap for homes south of the 26th parallel rose to **$800,000** on 7 May 2026. Foreign buyers duty **7%**.

**Off-the-plan concession** `[S]`: pre-construction contracts (before footings complete) 100% up to $750,000, tapering to 50% between $750,000 and $850,000, and 50% above $850,000. **Extended to 30 June 2028** and widened to survey-strata and community title (land) schemes for transactions from 12 March 2026. ⚠️ Required legislative amendment — confirm with RevenueWA.

### TAS `[D from seven SRO-sourced anchors, all reconciling]`

Unchanged since 21 October 2013. Same rates for all buyer types and property types — no owner-occupier/investor split.

| Dutiable value | Duty |
|---|---|
| ≤ $3,000 | $50 (flat minimum) |
| $3,001 – $25,000 | $50 + $1.75 per $100 over $3,000 |
| $25,001 – $75,000 | $435 + $2.25 per $100 over $25,000 |
| $75,001 – $200,000 | $1,560 + $3.50 per $100 over $75,000 |
| $200,001 – $375,000 | $5,935 + $4.00 per $100 over $200,000 |
| $375,001 – $725,000 | $12,935 + $4.25 per $100 over $375,000 |
| > $725,000 | $27,810 + $4.50 per $100 over $725,000 |

Reconciling anchors: $300,000 = $9,935; $400,000 = $13,997.50; $500,000 = $18,247.50; $600,000 = $22,497.50; $650,000 = $24,622.50; $700,000 = $26,747.50; $800,000 = $31,185.

⚠️ **Error to avoid:** one published source states $750,000 duty is "approximately $27,810". Wrong — $27,810 is the duty at exactly $725,000. At $750,000 it is **$28,935**. Don't seed test cases from that figure.

Per $100 or part of $100 — round the price up to the next whole $100 first. FIDS **8%** for agreements from 1 April 2020, applied to the foreign person's **proportionate interest**, plus **1.5%** on primary production land. Australian citizens living overseas are not foreign persons; nor are permanent visa holders or eligible NZ citizens meeting the residency test.

**Expired relief, retained for back-dated calculations:** the 100% established-home FHB exemption applied to transfers **settling** 18 February 2024 – 30 June 2026 for dutiable value ≤$750,000; earlier thresholds $600,000 (1 Jan 2022 – 17 Feb 2024), and a 50% concession 7 Feb 2018 – 17 Feb 2024 at $400,000/$500,000/$600,000 by settlement window. Eligibility: all purchasers ≥18, Australian citizens or PRs, never owned a home in Australia; established (previously occupied) homes only; owner-occupied ≥6 months within 12 months of settlement.

Still current: permanent uncapped **new-home** exemption; **$20,000 FHOG** for new-home transactions 1 July 2026 – 30 June 2027; **50% reduction for eligible pensioners downsizing** to a new home cheaper than the former and not exceeding $600,000.

### ACT `[D from six anchors]`

Rate tables effective 1 July 2025 remain current for 2026-27.

**Non-owner-occupier (standard):**

| Dutiable value | Duty |
|---|---|
| ≤ $200,000 | $1.20 per $100 |
| $200,001 – $300,000 | $2,400 + $2.20 per $100 over $200,000 |
| $300,001 – $500,000 | $4,600 + $3.40 per $100 over $300,000 |
| $500,001 – $750,000 | $11,400 + $4.32 per $100 over $500,000 |
| $750,001 – $1,000,000 | $22,200 + $5.90 per $100 over $750,000 |
| $1,000,001 – $1,455,000 | $36,950 + $6.40 per $100 over $1,000,000 |
| > $1,455,000 | **flat 4.54% of the ENTIRE value** |

**Eligible owner-occupier:**

| Dutiable value | Duty |
|---|---|
| ≤ $260,000 | **$0.28 per $100** (reduced from $0.40 on 1 Jul 2025) |
| $260,001 – $300,000 | $728 + $2.20 per $100 over $260,000 |
| $300,001 – $500,000 | $1,608 + $3.40 per $100 over $300,000 |
| $500,001 – $750,000 | $8,408 + $4.32 per $100 over $500,000 |
| $750,001 – $1,000,000 | $19,208 + $5.90 per $100 over $750,000 |
| $1,000,001 – $1,455,000 | $33,958 + $6.40 per $100 over $1,000,000 |
| > $1,455,000 | flat 4.54% of entire value, **less a $35,238 deduction** |

### Implement as one table plus a constant

**Above $300,000 both schedules use identical marginal rates.** The whole owner-occupier benefit is the lower base ($1,608 vs $4,600), so the saving is a **constant $2,992** at every price above $300,000. One table plus a flat $2,992 reduction gives the same result and is far easier to maintain.

Anchors: OO $500,000 = $8,408; $750,000 = $19,208; $1,000,000 = $33,958. Standard $500,000 = $11,400; $600,000 = $15,720; $650,000 = $17,880; $750,000 = $22,200; $850,000 = $28,100.

⚠️ Per $100 or part thereof. The $1,000,001–$1,455,000 rate of 6.40% is `[S]` and the weakest link — worth one confirming fetch.

**Commercial tax-free threshold:** $2.0m from 1 July 2025, **$2.1m** from 1 July 2026. History: $1.5m (2018), $1.6m (2021), $1.9m (2024-25).

**Other 2026-27 ACT Budget changes:** off-the-plan unit concession made **permanent** and expanded to **turn-key units**, price cap removed; new exemption for owner-occupiers buying newly constructed, unit-titled property **not sold off the plan**; expanded exemptions for pensioners and DDCS recipients.

**Historical branch (contracts before 1 July 2026):** HBCS was income-tested with a **$1,020,000** cap, income thresholds from **$250,000** rising **$4,600 per dependent child** `[S]`. Different rules again before 18 September 2017.

Tax reform programme commenced 2012-13, `[S]` scheduled for completion by **2032**.

### NT `[S]`

For dutiable value **≤ $525,000**:

```
D = (0.06571441 × V²) + (15 × V)     where V = dutiable value ÷ 1,000
```

Verified: $500,000 → V = 500 → (0.06571441 × 250,000) + 7,500 = **$23,928.60**.

⚠️ **The formula uses V², not V.** At least one published source writes "(0.06571441 × V)" while computing with V².

Above $525,000 the rate applies to the **entire** value, not marginally:

| Dutiable value | Rate |
|---|---|
| $525,001 – $3,000,000 | 4.95% |
| $3,000,001 – $5,000,000 | **5.75%** |
| > $5,000,000 | **5.95%** |

⚠️ **Two competing structures.** Three sources (one citing NT Treasury, effective 1 January 2024) give the tiered version above; two give a flat **5.45%** above $3m, likely superseded. Implement the tiered version and confirm with the Territory Revenue Office. Only affects properties over $3m.

The $525,000 boundary is near-continuous by design: the formula gives $25,989.28 at $525,000, and 4.95% of $525,001 is $25,987.55.

**NT concessions the code probably lacks:**
- **Home Land Purchase Exemption (HLPE)** — **full** exemption for new house-and-land packages, **all buyers not just FHBs**, reportedly to **30 June 2027**. Significant and easy to miss.
- **HomeGrown Territory Grant $50,000**, no value cap, replaced the $10,000 FHOG. ⚠️ One source puts the end date at **30 September 2026**. Verify urgently — see §7.2.
- **Principal Place of Residence Rebate** up to **$7,000**.
- **No land tax** at all. **No foreign buyer surcharge.**
- Payment within **60 days** of the contract becoming unconditional or settlement, whichever is earlier. ⚠️ One source says 30 days.

### Foreign purchaser surcharges

| Jurisdiction | Surcharge |
|---|---|
| NSW | 9% (up from 8% on 1 Jan 2025) |
| VIC | 8% (FPAD) |
| QLD | 8% (AFAD) — NZ SCV 444 exempt |
| TAS | 8% (+1.5% primary production land) |
| SA | 7% (since 1 Jan 2018) |
| WA | 7% |
| ACT | **None** on duty; 0.75% annual land tax surcharge |
| NT | **None** |

### Mid-year changes to handle

| Jurisdiction | Change | Date |
|---|---|---|
| WA | FHOR thresholds to $600k/$800k | 7 May 2026 |
| TAS | Established-home FHB exemption ended | 30 Jun 2026 |
| ACT | HBCS cap and income test removed | 1 Jul 2026 |
| QLD | Citizenship requirement for home concessions | 1 Aug 2026 |
| NT | Possible HomeGrown grant end | 30 Sep 2026 ⚠️ |
| VIC | Off-the-plan concession expiry | 21 Apr 2027 |
| WA | Off-the-plan concession expiry | 30 Jun 2028 |
| NSW | Bracket and premium threshold CPI indexation | Each 1 Jul |

## 3.2 SAPTO — thresholds, derivation and mechanics

### FY2026-27 `[D]`

| Status | Max offset | Shading-out | Cut-out |
|---|---|---|---|
| Single | $2,230 | **$36,034** | **$53,874** |
| Each partner of a couple | $1,602 | **$31,847** | **$44,663** |
| Each partner of an illness-separated couple | $2,040 | **$34,767** | **$51,087** |

**Combined rebate income limits** (eligibility, = 2 × per-partner cut-out): couple **$89,326**; illness-separated **$102,174**.

Taper: **12.5c per $1** above the shading-out threshold, **rounded up to the nearest whole dollar**.

### Why these are derived

The ATO's SAPTO page still publishes the **FY2025-26** table, and its worked example uses a lowest marginal rate of 0.16. But it publishes the method:

```
shading-out = ((max offset + $445) ÷ lowest marginal rate) + $18,200
cut-out     = shading-out + (max offset ÷ 0.125)
```

Both rounded up. `$445` is the *rebate maximum amount* in the *Income Tax Assessment (1936 Act) – Regulations 2025*, alongside a rebate reduction threshold of `$37,000` and reduction rate of `0.015`.

**Validated at 0.16 against all six published FY2025-26 figures:** single $34,919 / $52,759; couple $30,994 / $43,810; illness-separated $33,732 / $50,052. Six for six. Substituting 0.15 gives the FY2026-27 figures above. The derived single figures independently match a secondary source published August 2026.

⚠️ **Dependency:** assumes `$445` is unchanged for FY2026-27. If amended, all six thresholds move.

### Three mechanics the code probably gets wrong

**1. The couple test uses two different income figures.** Eligibility against the cut-out is tested on **50% of combined** rebate income; the offset **amount** uses the person's **own actual** rebate income.

ATO example: Keith $33,650, Jean nil. Cut-out test uses $16,825 each. Keith's offset uses his actual $33,650, reducing $1,602 to $1,270. In another example Ying ($54,020) and Li Jun ($25,677) are **both eligible** — half combined is $39,848.50, under $43,810 — but Ying gets **nothing** while Li Jun gets the full $1,602. A single-income-figure implementation cannot produce these results.

**2. SAPTO unlocks the higher Medicare levy threshold, but only if the offset survives.** You must be entitled to **at least $1** of SAPTO to use the increased low-income threshold. Taper it to zero and the ordinary thresholds apply. The ATO warns explicitly that where SAPTO reduces to zero before the upper Medicare limit is reached, the **non-SAPTO** thresholds must be used.

**3. Transfers change the threshold calculation.** Spouse's unused amount = `A − ((B − $6,000) × 0.15)`, where A = spouse's SAPTO amount and B = spouse's taxable income **plus exempt pension income**. Full transfer if taxable income ≤ $6,000. Where a transfer occurs the recipient's rebate threshold is recalculated through the full steps A–O — and if an intermediate result exceeds $37,000, an entirely different formula applies using the second-lowest marginal rate plus 0.015.

**Recommendation:** unless implementing steps A–O in full, restrict SAPTO output to the no-transfer case and say transfers aren't modelled. A partial implementation is wrong in ways users can't detect.

Exempt pensions for transfer purposes: DSP (Part 2.3 SSA 1991), youth disability supplement with DSP, carer payment (Part 2.5), invalidity service pension and partner service pension (Divisions 4 and 5, Part III, VEA 1986). Foreign resident spouse: unused = `A − (B × marginal rate)`; if also receiving an Australian pension, worked out as if resident.

### Rebate income

Taxable income + reportable superannuation contributions + total net investment loss + **adjusted** fringe benefits total. **Not the same as MLS income** — no spouse-trust component, and it uses the *adjusted* FBT figure.

### Eligibility

Must be eligible for a listed Australian Government pension or allowance **and** meet the income limits. Only these qualify: Age Pension, Carer Payment, DSP (at age-pension age), Education Entry Payment, Parenting Payment (single), age service pension, income support supplement, Veteran Payment, invalidity service pension (at age-pension age), partner service pension.

Also eligible: someone who was age-pension age and *eligible* but didn't receive it (no claim, or failed the income or assets test), subject to residency conditions. SAPTO is **non-refundable**. Cannot be claimed if in jail for the whole income year.

## 3.3 Unused leave on termination `[P — ATO Schedule 7]`

### Long service leave

| Accrual period | Normal termination | Genuine redundancy / invalidity / early retirement |
|---|---|---|
| **Pre-16 Aug 1978** | **5% of the total** in assessable income at marginal rates | Same |
| **16 Aug 1978 – 17 Aug 1993** | **32%** flat | **32%** flat |
| **Post-17 Aug 1993** | **Marginal rates** — include in salary/wages | **32%** flat |

**The only difference is the third row.** Resignation taxes the post-1993 component at marginal rates; genuine redundancy caps it at 32%. That single row is the entire redundancy-vs-resignation delta on LSL.

⚠️ **Use 32%, not 31.5%.** Older tables (NAT 3351) show 31.5% = 30% + 1.5% Medicare. Current ATO Schedule 7 confirms 32%.

### Annual leave

| Accrual period | Normal termination | Genuine redundancy etc |
|---|---|---|
| Pre-18 Aug 1993 | 32% flat | 32% flat |
| Post-17 Aug 1993 | Marginal rates | **32%** flat |

### Apportionment

**By days, not dollars:** `unused LSL days in the relevant period ÷ total unused LSL days`.

Two complications: **LSL taken during employment** must be attributed to the periods in which it was used, which shifts the remaining balance between periods — working from total service alone gives the wrong split. And **part-time and full-time service periods must be separated**, with entitlement calculated separately for each.

If the post-17 August 1993 lump sum from a normal termination is **under $300**, a special small-amount rule applies.

**Neither annual leave nor LSL is an ETP** — don't run them through ETP cap logic.

## 3.4 NES redundancy pay `[S — s119 Fair Work Act 2009]`

| Continuous service | Redundancy pay |
|---|---|
| Under 1 year | Nil |
| 1 – <2 years | 4 weeks |
| 2 – <3 years | 6 weeks |
| 3 – <4 years | 7 weeks |
| 4 – <5 years | 8 weeks |
| 5 – <6 years | 10 weeks |
| 6 – <7 years | 11 weeks |
| 7 – <8 years | 13 weeks |
| 8 – <9 years | 14 weeks |
| 9 – <10 years | 16 weeks |
| **10 years and over** | **12 weeks** |

See §2.4 — **not monotonic**.

**Pay basis:** the **base rate of pay** for ordinary hours (s16) — excludes overtime, penalty rates, allowances, loadings and bonuses. **Payment in lieu of notice uses the full rate of pay** instead, including those amounts. Don't use one rate for both.

**Exclusions (s121, s119(3)):** small business employer — fewer than 15 employees by **headcount**, including regular and systematic casuals, **associated entities treated as one employer** — switches s119 off entirely; under 12 months' continuous service (s121(1)(a)); casual service doesn't count (s119(3)); apprentices, trainees, time-limited training arrangements; contracts for a specified period, task or season ending on the stated expiry; serious misconduct; transfer-of-business arrangements; industry-specific redundancy schemes (ss121–123).

**Carve-out (s121(4)):** even where the employer was a small business employer at termination, the employee **is** entitled if the employer later becomes bankrupt or goes into liquidation (other than a members' voluntary winding up) and became a small business employer because of that.

Termination due to insolvency is redundancy (s119(1)(b)). The FWC may reduce redundancy pay to a specified amount including nil, on application under **s120**, for other acceptable employment or inability to pay. **Awards and enterprise agreements can improve on the minimum, and some provide redundancy pay regardless of employer size** — so a small-business result of nil should be caveated, not stated flatly.

Related: age 45+ with 2+ years service gets **+1 week notice** (s117(3)(b)).

## 3.5 Minimum pension drawdown `[P]`

| Age | Factor |
|---|---|
| Under 65 | 4% |
| 65–74 | 5% |
| 75–79 | 6% |
| 80–84 | 7% |
| 85–89 | 9% |
| 90–94 | 11% |
| 95+ | 14% |

**No temporary reduction in force.** The 50% reduction ran FY2019-20 to FY2022-23 and was not extended from FY2023-24.

ATO notes these are **indicative only** — for precise minimums, especially market-linked income streams, the pro-rating and rounding rules in the SIS Regulations 1994 govern. Pensions commencing part-way through a year are pro-rated from commencement day.

## 3.6 Reportable fringe benefits — downstream effects `[S]`

**Threshold:** an RFBA arises only where the **taxable value** of reportable benefits exceeds **$2,000** in an FBT year (1 April – 31 March). The **grossed-up** value appears on the income statement.

RFBA is **not** income in the return — no income tax or Medicare levy on it directly. But it feeds:

| Income test | Affected |
|---|---|
| Medicare levy surcharge | Yes `[P]` |
| HELP repayment income | Yes `[P]` |
| Division 293 | Yes `[S]` |
| Family Tax Benefit A and B | Yes `[S]` |
| Child support assessments | Yes `[S]` |
| Private health insurance rebate | Yes |
| Super co-contribution | Yes |
| Other means-tested social security | Yes |

**Carve-out:** for employees of **FBT-exempt employers** — PBIs, health promotion charities, public and NFP hospitals, public ambulance services — Services Australia counts only **53%** of the RFBA for **family assistance and youth income support**. The full amount applies to everything else.

**Consequence for the novated lease calculator:** an FBT-exempt EV still generates an RFBA, which can reduce Family Tax Benefit and increase child support. For a salary-packaging family that materially offsets the headline saving. Showing only the tax benefit tells half the story.

Employee contributions must be made **before 31 March** to reduce that year's taxable value and RFBA.

## 3.7 FHSSS eligibility `[P]`

All conditions must be met:

- **18 or older** when requesting the determination. Contributions made **before** 18 still count.
- **Never owned property in Australia** — wide definition: investment property, vacant land, commercial property, a lease of land, or a company title interest in land. An **inherited share with your name on the title counts** as ownership. Being on **utility bills** but not the title does not.
  - Exception: **FHSS financial hardship** determination (bankruptcy, divorce or separation, loss of employment, natural disaster, illness) — must be requested and granted **before** you start saving under the scheme.
- **No completed prior release request.** One use only, even if you didn't take the maximum.
- **Your name must be on the title** of the property you buy.
- **Residential property** — excludes houseboats, motor homes, and vacant land unless there is a construction contract, entered within 12 months of the release request.

**Occupancy:** genuinely intend to occupy **as soon as practicable**, and occupy for **at least 6 of the first 12 months** it is practicable to occupy.

**Determination-before-contract — the trap:** request the determination **before your interest in the land is registered** with the land title office (ATO GN 2024/1). Once you hold a relevant property interest you cannot make a valid request. Plainer ATO phrasing: before ownership of any real property transfers to you, generally following settlement.

**Timing (determinations from 15 September 2024):** sign a contract within a window starting **90 days before** the release request and ending **12 months after**; **notify the ATO within 90 days** of signing. Extension available for a further 12 months, to a **maximum of 24 months** after the request. If no contract in time: **recontribute** as a non-concessional contribution, or keep the funds and pay **20% FHSS tax**. For determinations on or before 14 September 2024 the notification window was **14 days**.

**Assessed individually** — couples, siblings or friends can each access their own contributions toward the same property; one person's prior ownership doesn't disqualify the others.

**Compulsory employer SG contributions are not eligible** — voluntary only.

No FY2026-27 changes identified.

## 3.8 Novated lease residual values `[S]`

| Term | Minimum residual |
|---|---|
| 1 year | 65.63% |
| 2 years | 56.25% |
| 3 years | 46.88% |
| 4 years | 37.50% |
| 5 years | 28.13% |

Existing values correct. **Three nuances likely missing:**

1. **Calculated on the BASE vehicle price** — excluding stamp duty, registration and CTP. Not the drive-away price. A $55,000 drive-away vehicle might have a $52,782 base; the residual applies to $52,782.
2. **GST is added on payout.** A 5-year residual on a $60,000 EV is $16,878, or about **$18,566 with GST**.
3. These are **minimums** — the ATO permits **reduced** percentages for high-kilometre drivers. Presenting the percentage as fixed slightly overstates it.

The minimums exist to stop the residual being set artificially low, which would inflate the salary-sacrificed amount and the tax benefit.

## 3.9 HEM approximation guidance `[P on the constraint, S on behaviour]`

**The HEM tables are proprietary** — licensed by the Melbourne Institute to lenders, not published. There is no lawful public figure to implement.

Publicly known behaviour, which should shape the approximation:

- Varies by **household type** (single, couple, with/without children) and **income band** — higher income gets a higher HEM
- Adjusted **quarterly** for inflation
- Uses the **median** for absolute basics but only the **25th percentile** for discretionary spending — deliberately conservative
- **Excludes housing payments** — rent, mortgage repayments, council rates and home insurance are separate commitments. For an owner-occupier loan, current rent is **dropped** because the new loan replaces it
- Excludes gardeners, overseas holidays, premium services, private school fees, luxury spending
- Acts as a **floor** — the lender uses the higher of HEM or declared expenses. Declared expenses only matter if higher
- Lender overlays cause capacity quotes to differ by **$30,000–$80,000** for the same household

**Implement as** `max(user_declared, benchmark_estimate)`, where `benchmark_estimate` is your own transparently documented approximation scaling by household composition and income band. Label it as an indicative benchmark and note that lenders use a licensed dataset that isn't public. **Do not call it HEM.**

## 3.10 LMI `[S]`

**Citable published source:** Helia's indicative fee estimator at helia.com.au. Helia (formerly Genworth) and QBE LMI underwrite virtually all Australian residential LMI. Most public calculators derive bracket rates from Helia's estimator, so it's the defensible single reference — per the decision recorded in §7.4.

**Use percentage-of-loan brackets, not dollar figures.** Published dollar examples vary by up to 2× for the same scenario, which reflects genuinely different lender rate cards. The percentages are the stable part.

| LVR band | Indicative premium |
|---|---|
| ≤ 80% | **Nil** |
| 80.01 – 85% | ~0.5% – 1.0% of loan |
| 85.01 – 90% | ~1.45% – 2.0% of loan |
| 90.01 – 95% | ~2.5% – 4.5% of loan (≈3% at 95%) |

**Required display label:** *"LMI numbers vary from bank to bank. These are indicative, for research purposes."*

**Structural behaviour to build in:**

- **Rates rise non-linearly with cliffs at 85%, 90% and 95%.** Crossing 90% to 91% can add ~0.6% of the loan — $3,000+ on $500k. **Do not interpolate smoothly across a cliff** — that misleads exactly the users nearest one.
- **Investor lending is priced above owner-occupied** at the same LVR, and most lenders cap investors at 90% not 95%.
- Also varies by loan size, state/territory, FHB status, and loan type (P&I vs interest-only).
- **State insurance duty applies on top**, varying by state.
- Usually **capitalised**, lifting effective LVR — a 95% loan can settle at 96–97%. Capitalising roughly **doubles** the true cost over 30 years (a $12,000 premium at ~6.2% over 30 years adds about $14,500 in interest).
- High LVR often attracts a **0.10%–0.40%** rate margin, separate from the premium.
- Some lenders **self-insure**, sometimes cheaper.

**Zero-LMI paths — get these right first:**

1. **First Home Guarantee** — no LMI at all. With no income or place caps since October 2025 this is the dominant path for eligible first home buyers, and matters more than premium precision.
2. **Professional waivers** — medical, legal, accounting/finance and some others, to 90% LVR, with ANZ, NAB and Westpac among others. Typically minimum income $90,000–$150,000 and peak body membership.
3. **Family guarantor.**
4. **LVR ≤ 80%.**

Helia publishes **refund positions** (as at August 2026) — no refund where the loan was in arrears, and some policies trade the refund for a larger upfront discount.

## 3.11 BMR and TDEE `[P]`

**Mifflin-St Jeor remains recommended.** The Academy of Nutrition and Dietetics evidence review found the majority of research supports it using **actual body weight** to predict RMR in overweight and obese adults, with good accuracy and correlation to indirect calorimetry, and that other equations evaluated were less accurate. Where possible RMR should be measured by indirect calorimetry; the equation is the fallback.

```
Men:   RMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) + 5
Women: RMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) − 161
```

⚠️ **Two coefficient variants circulate.** The rounded form above is most common; the Academy also publishes the original coefficients `(9.99 × weight) + (6.25 × height) − (4.92 × age) ± constant`. Pick one, cite it, be consistent — otherwise your output won't reconcile against other calculators.

**Accuracy:** within 10% for ~82% of non-obese adults, within 15% for ~96%; within 10% for ~70% of obese individuals, with up to 9% overestimations and 21% underestimations.

**Limitations to surface:**
- Validated on adults **19–78**. Not valid under 18 — use paediatric guidelines or Schofield.
- **Overestimates where BMI >35** — doesn't distinguish lean from fat mass. Katch-McArdle (using lean body mass) is preferred where reliable body composition data exists.
- Accuracy declines at very high lean mass or very low body fat.
- Doesn't account for individual metabolic variation, thyroid function, adaptive thermogenesis or medication — any of which can shift true BMR by several hundred kcal/day.
- **Never validated outside Caucasian populations.**

**Activity multipliers:** the authoritative framing is **DRI Physical Activity Levels (PAL)** — the ratio of total to basal energy expenditure — as **sedentary, low active, active, very active**. Confirmed: **very active = 1.9 to under 2.5**; **low active** = typical daily living plus 30–60 minutes of daily moderate activity. The sedentary and active ranges were not retrieved. This is a **different taxonomy** from the common 1.2 / 1.375 / 1.55 / 1.725 / 1.9 set — if using the latter, label it as conventional rather than DRI.

## 3.12 Weight loss and protein `[S]`

### Safe rate of loss

| Band | Rate | Character |
|---|---|---|
| Conservative | ≤0.5% BW/week | Lean-mass-first; when already lean or in a long deficit |
| Moderate | 0.5–0.8% BW/week | Consensus target |
| Aggressive | 0.8–1.1% BW/week | Upper safe limit; needs high protein and planned refeeds |
| **Above safe band** | **>1.1% BW/week** | **HARD BLOCK** |

Public-health equivalents: NHS/NICE (PH53) recommend **0.5–1 kg per week** with a deficit around **600 kcal/day**. ISSN (Aragon & Schoenfeld 2017) put a **15–25% deficit** in the safe corridor for most adults.

**Mechanism worth surfacing:** the more severe the deficit the greater the lean mass loss — and **the leaner the person, the more susceptible**. The safe rate should scale down as body fat falls, not stay fixed.

### Minimum intake — hard block

- **1,200 kcal/day (women)** and **1,500 kcal/day (men)** are the public-health floors for unsupervised dieting.
- **Below 800 kcal/day** is a very low calorie diet, with documented risks including nutritional deficiencies, gallstone formation and electrolyte imbalance. **Requires medical supervision.**

Per the decision recorded in §7.4: if the arithmetic produces a target below the floor, **do not display that number**. A hard block, not a warning beside a displayed figure.

### Protein

| Context | Intake |
|---|---|
| Fat loss with lean mass preservation | **1.6–2.4 g/kg** |
| MPS returns plateau, trained adults | ~**1.6 g/kg of bodyweight** (Morton 2018) |
| Natural physique athletes in a deficit | **2.3–3.1 g/kg of FAT-FREE MASS** (Helms 2014) |
| General deficit, public-health framing | 1.2–1.6 g/kg bodyweight |
| Elderly, weight-loss prevention | ≥1.2 g/kg/day |

**Scaling basis:** for higher body fat, scale to **lean body mass or goal weight, not total bodyweight**. Note the two most-cited figures use **different denominators** — Morton's 1.6 is per kg of bodyweight, Helms' 2.3–3.1 is per kg of fat-free mass. Quoting them against the same denominator produces nonsense. Multiplying g/kg by total bodyweight regardless of composition is the likely bug.

---

# §4 New regimes to build

## 4.1 Treasury Laws Amendment (Tax Reform No. 1) Act 2026 `[P]`

**Act No. 49 of 2026**, Royal Assent **26 June 2026**. Companion imposition Act: **Income Tax Rates Amendment (Tax Reform No. 1) Act 2026, Act No. 50 of 2026**, same day. Four core elements, none currently in the code.

### 4.1a $1,000 instant tax deduction — LIVE NOW (Schedule 4)

**Applies from the 2026-27 income year — the current year.** The Pay/Tax calculator is understating deductions today.

- Standard deduction of up to **$1,000** for work-related expenses, no receipts.
- Australian tax residents earning income from work — employees and sole traders.
- **Taxpayer chooses at lodgement** between the standard $1,000 and substantiated actual expenses. If actual work expenses exceed $1,000 they claim the higher amount the usual way.
- Non-work deductions remain claimable **on top**: charitable donations, super contributions, union and professional association fees, income protection / sickness / accident premiums.
- Anti-double-dipping where expenses covered by the deduction are salary packaged.
- First claimed on returns lodged from 1 July 2027. Treasury: ~6.2 million workers, average benefit ~$205.

**Implement as `max(1000, substantiated_expenses)`, not an automatic +$1,000.** Always applying $1,000 is wrong for anyone with higher genuine deductions.

### 4.1b CGT — 50% discount abolished from 1 July 2027 (Schedule 1)

**Nothing changed on 1 July 2026.** Schedule 1 commenced 1 July 2026 but applies to CGT events on or after **1 July 2027**. The 50% discount applies to gains accruing up until 1 July 2027.

From 1 July 2027, for individuals, trusts and partnerships:

- 50% discount **replaced by cost base indexation** — index to inflation so only above-inflation gain is taxed
- Plus a **30% minimum tax rate** on real capital gains accruing from 1 July 2027
- Applies to **all CGT assets held at least 12 months**, including pre-20 September 1985 assets (pre-CGT status removed after 30 June 2027)
- **New builds:** investor may **choose** either the 50% discount or indexation-plus-minimum-tax at sale
- **Affordable housing:** the up-to-60% discount is **fully retained**
- **Small business:** all four concessions remain; the 50% active asset reduction turnover threshold rises $2m → **$10m** from 1 July 2027
- **Exempt from the minimum tax:** recipients of certain government payments including Age Pension and JobSeeker
- **Main residence exemption unchanged** `[S]`
- Super fund CGT discount not expected to change `[S]`

**Calculator impact:** correct for FY2026-27, but a user modelling a hold-and-sell decision today straddles the change. Add a date-aware projection and a warning. Treasury has flagged further tranches on implementation detail (small and start-up business low or zero cost base, AMIT interactions, tax consolidation, residency changes) — the detail is not final.

### 4.1c Negative gearing quarantined from 2027-28 (Schedule 2)

**The grandfathering line is already live: 7:30pm AEST, 12 May 2026.**

- From the **2027-28 income year**, losses on **existing residential** investment properties purchased **after** 7:30pm AEST 12 May 2026 are deductible only against **other residential property income, including capital gains**
- Excess losses **carry forward** against future residential property income
- Properties **held at announcement** can continue to be negatively geared until sold
- Applies to residential property held by individuals, partnerships, companies and most trusts
- **Excluded:** commercial property, shares and other asset classes; widely held trusts; superannuation funds **including SMSFs**
- **Exempt:** new builds, build-to-rent, social or affordable housing; dwellings on vacant land; existing properties demolished and replaced with a greater number of dwellings

**The Rent vs Buy tool needs this now** — purchase date determines treatment and the cut-off has passed.

### 4.1d $250 Working Australians Tax Offset — from 2027-28 (Schedule 3)

Permanent annual offset up to **$250**, from the **2027-28** financial year, for Australian residents with **net labour income** (salary, wages, sole trader business income). Over 13 million people. Operates **alongside** LITO.

Precise definition `[S]`, s61-160 ITAA 1997: the **lesser of $250 and the basic income tax that would apply if taxable income consisted only of net labour income**. Net labour income must exceed the $18,200 tax-free threshold, and the person must be an Australian resident at some time during the income year. Capped at basic income tax, so non-refundable like LITO.

Build the hook; **do not apply to FY2026-27**.

`[S]` A Senate amendment also touched superannuation borrowing rules — not investigated. Flag if SMSF or LRBA logic exists.

## 4.2 Division 296 — flag, do not compute

**Decision recorded (§7.4): flag only, pending ATO guidance.**

Legislated, passed both Houses, commences **1 July 2026** — the current year. Officially the Better Targeted Superannuation Concessions tax. The final design differs substantially from the original 2023 proposal, so **do not implement from older commentary**.

| Feature | Final law `[S]` |
|---|---|
| Earnings basis | **Realised** earnings only — interest, dividends, rent, realised capital gains. **No tax on unrealised gains.** |
| Threshold 1 | **$3m**, indexed in **$150,000** increments |
| Threshold 2 | **$10m**, indexed in **$500,000** increments |
| Rate $3m–$10m | additional **15%** (headline effective 30%) |
| Above $10m | a **further 10%** on the >$10m proportion (25% extra in total; headline 40%) |
| Basis | Total Superannuation Balance across all accounts including SMSFs |
| First assessment | based on FY2026-27, issued in 2027-28 |

Indexation is CPI-linked, consistent with the transfer balance cap. Calculation is proportional. Worked example: $840,000 realised earnings, 76.74% of balance above $3m, 22.48% above $10m → `(15% × 76.74% × $840,000) + (10% × 22.48% × $840,000)` = **$115,581**.

Capital gains and losses treated normally — carried-forward losses including pre-1 July 2026 offset gains, and only the net less the one-third fund discount is included. **Tax can spike sharply in a year a major asset sells.** SMSFs may elect a **transitional cost-base reset** to 30 June 2026 market value.

Treasury estimate: ~80,000 people (~0.5%) in year one.

**Why flag rather than compute:** a retirement calculator's inputs are balance, contributions and an assumed return. **Realised earnings is a fund-level figure that can differ from total return by an order of magnitude** — a fund that holds and doesn't sell has near-zero realised gains regardless of paper growth. Computing it would mean inventing the key variable. It's also lumpy by design, so a smooth annual projection actively misleads.

**Implement as:** when a projected balance crosses the threshold, show a note that Division 296 will apply, that this calculator doesn't model it, and that the methodology is pending ATO guidance with first assessments in 2027-28.

## 4.3 APRA debt-to-income limit `[S]`

From **1 February 2026**: lending at **DTI ≥ 6** is capped at **20% of each lender's new mortgage lending**, counted **separately** for owner-occupier and investor loans. Introduced after APRA flagged a build-up of higher-risk lending, particularly to investors, as rates fell through 2025.

**Do not model as a hard borrower cap.** It limits how much high-DTI lending each *bank* can write. A DTI of 6+ does not mean automatic decline, which is why two banks can read the same file the same week and answer differently.

**Correct treatment:** a warning at DTI ≥ 6 ("fewer lenders will consider this"), not a hard stop.

Note also that HELP debt must be **excluded** from the DTI calculation (§2.10), and that DTI uses raw gross income and total credit limits — none of the serviceability shading applies.

## 4.4 QLD citizenship requirement `[P]`

**A mid-year change inside FY2026-27.** For transactions entered into **on or after 1 August 2026**, each purchaser or relevant beneficiary claiming a Queensland home or first-home concession must be an **Australian citizen, permanent resident, or specified foreign retiree** when the transfer duty liability arises.

Transactions entered into **before** 1 August 2026 remain under the previous rules with no citizenship requirement.

The QLD calculator needs a contract-date branch and a residency input.

## 4.5 First Home Guarantee — current settings `[S]`

Branded by Housing Australia as the **Australian Government 5% Deposit Scheme**; still commonly the First Home Guarantee, within the Home Guarantee Scheme.

| Item | Position |
|---|---|
| Places | **No cap** (was 35,000/year) |
| Income caps | **Removed entirely** |
| Deposit | From **5%** |
| Government guarantee | Up to **15%** of property value |
| LMI | **Not charged** — lender sees an effective 80% lend |
| Price caps | **Retained and raised.** Do not hardcode — see §2.11 |
| Prior ownership | Qualifies if no Australian property owned in the **past 10 years** |
| Joint applications | **2+ eligible first home buyers**, including friends and siblings |
| Property types | Existing house, townhouse, apartment, house-and-land, off-the-plan, or vacant land with a separate building contract |
| Use | **Must be owner-occupied** — not an investment purchase |
| Access | **Participating lenders only** — cannot apply direct to Housing Australia |
| 2026 Budget | **No changes** — October 2025 settings current |

Panel: **47 lenders** as of 2026, including all four majors and subsidiaries. **ING, Macquarie, HSBC, Suncorp and AMP are not on it.** Related stream: **Family Home Guarantee** for eligible single parents or guardians with at least one dependent — deposit as low as **2%**. A separate **Regional First Home Buyer Guarantee** requires 12 months' residence in the regional area.

Uptake: 22,921 guarantees in the four months after the October 2025 overhaul, up 75%.

---

# §5 Confirmed correct — do not touch

| Item | Value | Confidence |
|---|---|---|
| Resident tax thresholds | $18,200 / $45,000 / $135,000 / $190,000 | `[P]` |
| Medicare levy rate | 2% | `[P]` |
| Medicare levy phase-in structure | 10c per $1, capped at 2% | `[P]` |
| LITO | $700 max, 5c from $37,500, 1.5c from $45,000, out at $66,667 | `[P]` |
| Super Guarantee rate | 12.00%, also 12.00% from 1 Jul 2027 | `[P]` |
| Contributions tax | 15% | `[P]` |
| Division 293 threshold and rate | $250,000; 15% | `[P]` |
| Carry-forward concessional | TSB < $500,000, 5-year lookback, not indexed | `[P]` |
| Preservation age | 60 (effectively universal) | `[P]` |
| FHSSS annual and lifetime limits | $15,000 / $50,000 | `[P]` |
| 50% CGT discount | 50% — for FY2026-27 only, see §4.1b | `[P]` |
| CGT event date | Contract date, not settlement | `[P]` |
| Loss ordering | Losses before discount | `[S]` |
| FBT rate | 47% | `[S]` |
| FBT Type 1 gross-up | 2.0802 | `[S]` |
| Novated lease residual values | 65.63 / 56.25 / 46.88 / 37.5 / 28.13% — but see §3.8 | `[S]` |
| Employee contribution method | Post-tax = taxable value → nil FBT | `[S]` |
| Whole-of-income cap | $180,000, not indexed | `[P]` |
| ETP concessional rates | 32% / 17% / 47% | `[P]` |
| Unused annual leave on redundancy | Max 32% | `[P]` |
| APRA serviceability buffer | 3.0 percentage points | `[P]` |
| Age Pension age | 67 | `[P]` |
| Family home exempt from assets test | Yes | `[S]` |
| Minimum pension drawdown | Standard factors, no reduction in force | `[P]` |
| Mifflin-St Jeor | Still recommended, actual body weight | `[P]` |
| kcal per kg | ~7,700 — but see §2.12 | `[S]` |
| NSW FHBAS | $800,000 full / $1,000,000 concession; land $350,000 / $450,000 | `[P]` |
| VIC FHB | $600,000 full / $750,000 concession, general rates in the band | `[S]` |
| QLD first home concessions | New: no cap. Established: $700,000 / $800,000 | `[P]` |
| SA FHB | New homes only, no value cap; nothing on established | `[P]` |

---

# §6 Unpublished and deferred

## 6.1 Medicare levy low-income thresholds — genuinely do not exist

Announced in each Budget for the year **just ending**, then legislated retrospectively. The 2026-27 Budget set the **FY2025-26** thresholds. FY2026-27 figures are expected in the 2027-28 Budget around **May 2027**.

**Decision recorded (§7.4): use the FY2025-26 set with a visible note.**

| Category | Lower (no levy at or below) | Upper (reduced levy to) |
|---|---|---|
| Single | $28,011 | $35,013 |
| Family | $47,238 | $59,047 |
| Single senior/pensioner (SAPTO) | $44,268 | $55,335 |
| Family senior/pensioner (SAPTO) | $61,623 | $77,028 |

Lower family threshold **+$4,338** per dependent child; upper **+$5,423** per dependent child.

**ATO qualifier:** if SAPTO entitlement reduces to zero before the upper limit is reached, the **non-SAPTO** thresholds must be used. See §3.2 mechanic 2.

The existing code values ($27,069 / $33,836) are roughly two years stale and wrong regardless.

## 6.2 FHSSS SIC rates — quarterly, forward-published only

| Quarter | SIC annual rate |
|---|---|
| 1 Jul – 30 Sep 2026 | **7.43%** |
| 1 Apr – 30 Jun 2026 (prior year) | 6.96% |

Q2 FY2026-27 (Oct–Dec 2026) should publish around **mid-September 2026** — likely available now. Q3 and Q4 do not yet exist. Build the lookup and populate as published.

Unrelated but noted: SIC incurred on or after 1 July 2025 is **no longer tax-deductible** (matching the GIC change).

## 6.3 Division 296 methodology

Deferred by decision. See §4.2.

## 6.4 Items to confirm before launch — none blocking

| Item | Why |
|---|---|
| TAS full scale | Derived from seven anchors, all reconciling |
| ACT both schedules | Derived from six anchors; the $1,000,001–$1,455,000 rate of 6.40% is weakest |
| **NT rate above $3m** | Two competing structures — §3.1 |
| **NT HomeGrown Grant end date** | One source says 30 September 2026 |
| NT payment window | 60 days vs 30 days |
| SAPTO `$445` rebate maximum amount | Underpins all six derived thresholds |
| Age Pension Work Bonus | $300 vs a $460 figure in one source |
| SA FHOG cap and exemption start date | Uncapped vs $650,000 with taper |
| WA off-the-plan concession end date | 2028 per two sources; required legislative amendment |
| NSW FHOG cap | $600,000 vs $750,000 |
| §7.4 CGT / Medicare / HELP / MLS interaction | Logically certain, not directly stated in a primary source |
| RFBA effect on Div 293, FTB, child support | Confirmed, but secondary sources only |
| Foreign resident FY2026-27 scale | Inferred, no separately published table located |
| DRI activity multiplier ranges | Only two of four confirmed |
| Australian ethnicity-adjusted BMI | Not confirmed — see §2.13 |

---

# §7 Maintenance

## 7.1 Re-verification schedule

| Cadence | Items | Trigger |
|---|---|---|
| **Quarterly** | FHSSS SIC rate; FBT benchmark interest rate | ATO quarterly publication; RBA 90-day BAB rate |
| **February** | ETP cap, genuine redundancy limits, CGT cap, untaxed plan cap | ATO: new indexed amounts generally available each February (AWOTE) |
| **March + September** | Age Pension payment rates; deeming rates when changed | DSS indexation — higher of CPI, PBLCI or MTAWE. **Rates and means-test thresholds move on different dates** |
| **1 April** | FBT year rollover; EV exemption phase changes | FBT year runs 1 April – 31 March |
| **1 June** | HELP indexation applied to balances | Annual |
| **1 July** | Income tax brackets; MLS tiers; super caps; HELP thresholds; LCT thresholds; NSW duty brackets; Age Pension assets, income and deeming **thresholds** | Start of financial year |
| **Post-Budget (May)** | Medicare levy low-income thresholds for the year **just ending**; SAPTO thresholds; new measures | Federal Budget. **This is the one that lands retrospectively** |
| **Ad hoc — watch** | APRA buffer and DTI limit; eight separate state and territory budgets; legislation in progress | APRA macroprudential reviews; state budget cycles |

## 7.2 Dated triggers

| Date | Event |
|---|---|
| **20 September 2026** | Age Pension rates rise; deeming rises to 1.75% / 3.75%. **Ten days from this audit.** |
| **30 September 2026** | Possible end of the NT HomeGrown Territory Grant. **Twenty days.** Verify this week. |
| Mid-September 2026 | FHSSS SIC rate for Oct–Dec quarter publishes |
| February 2027 | AWOTE-indexed ETP and redundancy limits publish |
| **1 April 2027** | FBT EV Phase 2: $75,000 price test and 15% statutory rate band begin |
| **21 April 2027** | VIC off-the-plan concession expires |
| **May 2027** | 2027-28 Budget — expect FY2026-27 Medicare levy thresholds, retrospectively |
| **1 July 2027** | Second bracket 15% → **14%**; CGT 50% discount replaced by indexation + 30% minimum tax; negative gearing quarantine begins; Working Australians Tax Offset begins; small business active asset threshold $2m → $10m |
| Mid-2027 | ATO review of the EV FBT exemption due |
| **30 June 2028** | WA off-the-plan concession expires |
| **1 April 2029** | FBT EV Phase 3: 25% discount for all eligible EVs |

## 7.3 Architecture recommendation

Several figures now change **within** a financial year — Age Pension in September, WA duty in May, QLD residency in August, FBT on 1 April. **A single `FY2026_27` constants object will give wrong answers for part of the year.**

Move to **effective-date-keyed lookups** for at least: Age Pension rates and deeming, FBT statutory rates, state duty scales and concessions, and the income tax bracket table. Every rate should carry `effective_from`, `effective_to` and `source_url`.

## 7.4 Decisions recorded

| Decision | Outcome |
|---|---|
| Health floors (min intake, max rate of loss) | **Hard block.** Do not display a target below the floor or a rate above the safe band. |
| LMI | **One published rate table, labelled.** Helia fee estimator. Display: *"LMI numbers vary from bank to bank. These are indicative, for research purposes."* |
| Division 296 | **Flag, do not compute.** Call out that it's pending ATO guidance and first applies in 2027-28. |
| Medicare levy low-income thresholds | **FY2025-26 figures with a visible note.** |

## 7.5 Suggested build order

1. **§4.1a — the $1,000 instant deduction.** The only item wrong *today*, affecting every user.
2. **§1.11 / §2 — Age Pension date-keying.** Ten-day deadline.
3. **§1 — P0 constants.** Straight value swaps; largest error reduction per unit of effort.
4. **§2.1 — HELP.** Largest single user-facing error, but needs new logic including the flat-10% top tier.
5. **§2.8 — PHEV and EV FBT rates.** Large overstatement of benefit for PHEV users.
6. **§3.1 — stamp duty scales.** Eight jurisdictions, mechanically straightforward. Watch the flat-rate bands in VIC and NT, and per-$100 rounding in QLD, SA, TAS and ACT.
7. **§4.1b–4.1c — CGT and negative gearing date-awareness.** Not wrong yet; wrong from 1 July 2027, and the negative gearing grandfathering line is already live.
8. Everything else.

---

# §8 Test vectors

Every anchor used to verify a figure in this document, consolidated as regression cases. **Run these against each implementation as you build it** — they are the cheapest defence against the traps in §2, which produce plausible-but-wrong numbers rather than obvious failures.

Cases marked **`[ATO]`** or **`[QRO]`** are published worked examples — an implementation that fails these is definitively wrong. Cases marked **`[calc]`** are computed from verified scales; a failure means either the scale or the implementation is wrong. Cases marked **`[trap]`** specifically test a §2 structural issue.

## 8.1 Resident income tax — FY2026-27 `[calc]`

Excludes Medicare levy and offsets.

| Taxable income | Expected tax |
|---|---|
| $18,200 | $0 |
| $30,000 | $1,770.00 |
| $45,000 | $4,020.00 |
| $50,000 | $5,520.00 |
| $100,000 | $20,520.00 |
| $135,000 | $31,020.00 |
| $150,000 | $36,570.00 |
| $190,000 | $51,370.00 |
| $200,000 | $55,870.00 |

**`[trap]`** Run the same set against FY2025-26 (16% second bracket) and confirm the results differ by exactly **$268** at every income at or above $45,000. That difference is the whole tax cut; if it isn't $268 the bracket table is wrong.

## 8.2 LITO `[ATO / calc]`

| Taxable income | Expected LITO | Source |
|---|---|---|
| $37,500 | $700.00 | calc |
| $39,000 | $625.00 | published example |
| $42,000 | $475.00 | published example |
| $45,000 | $325.00 | calc |
| $66,667 | $0.00 | calc |
| $70,000 | $0.00 | calc |

**`[trap]`** Confirm LITO is **not** applied to any per-pay or weekly figure — PAYG withholding ignores it.

## 8.3 HELP repayments — FY2026-27 `[ATO]`

| Repayment income | Expected repayment | Source |
|---|---|---|
| $69,528 | $0.00 | calc — threshold |
| $80,000 | $1,570.80 | calc |
| $86,380 | **$2,527.80** | ATO Example 1 |
| $137,064 | **$10,276.99** | ATO Example 2 |
| $254,780 | **$25,478.00** | ATO Example 3 |

### The boundary — the single most important test in this document `[trap]`

| Repayment income | Expected | Formula used |
|---|---|---|
| $186,050 | **$18,604.61** | $9,028 + 17% × $56,333 (marginal) |
| $186,051 | **$18,605.10** | 10% of total (flat) |

A purely marginal implementation returns roughly $18,605 at $186,051 too, so this pair *looks* fine. **Test $300,000 as well:** correct answer is **$30,000.00** (flat 10%). A marginal implementation returns about $28,388 — a $1,600 understatement that grows with income.

**`[trap]`** Test repayment income composition: taxable income $60,470 + RFB $5,400 + net investment loss $1,330 + reportable super $16,500 + exempt foreign employment income $2,680 should give repayment income of **$86,380** (ATO Example 1). If any component is dropped the answer is wrong.

**`[trap]`** An assessable FHSS released amount must be **excluded** from repayment income.

## 8.4 Medicare levy surcharge `[ATO]`

| Scenario | Expected MLS | Source |
|---|---|---|
| Taxable income $90,000 + RFB $27,000, no hospital cover | **$1,170.00** | ATO example |

**`[trap]`** That is 1% of **$117,000**, not 1% of the excess over $105,000 (which would be $120). MLS is a cliff applied to the whole income for MLS purposes.

| Income for MLS purposes | Expected tier and rate |
|---|---|
| $105,000 | Base — 0% |
| $105,001 | Tier 1 — 1% |
| $123,001 | Tier 2 — 1.25% |
| $164,001 | Tier 3 — 1.5% |

Family, two dependent children: base threshold = $210,000 + $1,500 = **$211,500** (the increment applies to each child *after the first*).

## 8.5 SAPTO `[ATO / derived]`

### Method validation — run at the FY2025-26 rate of 0.16 first

If these six don't reproduce, the derivation is misimplemented and the FY2026-27 figures below cannot be trusted.

| Status | Expected shade-out | Expected cut-out |
|---|---|---|
| Single | $34,919 | $52,759 |
| Couple, each | $30,994 | $43,810 |
| Illness-separated, each | $33,732 | $50,052 |

### FY2026-27 — at 0.15

| Status | Expected shade-out | Expected cut-out |
|---|---|---|
| Single | $36,034 | $53,874 |
| Couple, each | $31,847 | $44,663 |
| Illness-separated, each | $34,767 | $51,087 |

### Offset amounts — published examples, FY2025-26 thresholds

| Scenario | Expected offset | Source |
|---|---|---|
| Single, rebate income $39,000 | **$1,720** | ATO (José) |
| Couple, own income $33,650, spouse nil | **$1,270** | ATO (Keith) |
| Couple, own income $32,590, spouse $26,780 | **$1,403** | ATO (Vanh) |
| Couple, own income $26,780, spouse $32,590 | **$1,602** | ATO (Mai) |

**`[trap]`** Ying $54,020 and Li Jun $25,677, couple living together: **both are eligible** (half of combined = $39,848.50, under the $43,810 cut-out) but **Ying receives $0** and **Li Jun receives $1,602**. A single-income-figure implementation cannot produce this. See §3.2 mechanic 1.

**`[trap]`** Where SAPTO tapers to exactly $0, the increased Medicare levy low-income thresholds must **not** be available.

## 8.6 Stamp duty

### NSW `[calc]`

| Dutiable value | Expected duty |
|---|---|
| $500,000 | $16,687.00 |
| $800,000 | $30,187.00 |
| $1,000,000 | $39,187.00 |
| $1,500,000 | $63,787.00 |

FHB: $800,000 → **$0**. $1,000,000 → **$39,187** (concession fully phased out).

### VIC `[calc]`

| Dutiable value | Schedule | Expected duty |
|---|---|---|
| $500,000 | General | $25,070.00 |
| $500,000 | PPR | $21,370.00 |
| $800,000 | General | $43,070.00 |
| $960,000 | General | $52,670.00 |
| $960,001 | General | **$52,800.06** |
| $1,000,000 | General | **$55,000.00** |
| $2,000,000 | General | **$110,000.00** |
| $2,000,001 | General | $110,000.07 |

**`[trap]`** Note the step at $960,000 → $960,001: duty **rises by $130** for one extra dollar of value, because the band switches from marginal to a flat 5.5% of the whole value. A marginal implementation returns $52,670.06 at $960,001 and diverges further across the band — at $1,500,000 it gives $84,870 against the correct $82,500. FHB: $600,000 → **$0**.

### QLD `[QRO]`

| Dutiable value | Schedule | Expected duty | Source |
|---|---|---|---|
| $850,000 | General | **$31,275.00** | QRO example |
| $950,000 | Home concession | **$28,600.00** | QRO example |
| $540,000 | General | $17,325.00 | calc |
| $540,000 | Home concession | $10,150.00 | calc |

**`[trap]`** The gap between the two schedules at $540,000 and above is a constant **$7,175** — the maximum home concession saving. If it grows with price, the implementation is wrong.

**`[trap]`** Rounding is per $100 **or part of $100**. Test $850,050: `ceil(310050/100) × 4.50` not `3100.5 × 4.50`.

⚠️ One third-party source publishes $15,925 (owner-occupier) and $22,575 (investor) at $750,000. Neither reconciles with the QRO scale, which gives $19,600 and $26,775. **Use the QRO examples above, not those figures.**

### SA `[calc, RevenueSA-sourced scale]`

| Value conveyed | Expected duty |
|---|---|
| $500,000 | $21,330.00 |
| $600,000 | $26,830.00 |
| $750,000 | $35,080.00 |
| $1,000,000 | $48,830.00 |

**`[trap]`** Commercial or industrial property → **$0**, since 1 July 2018.

### WA `[calc]`

| Dutiable value | Expected duty |
|---|---|
| $360,000 | $11,115.00 |
| $650,000 | $24,890.00 |
| $725,000 | $28,452.50 |
| $800,000 | $32,315.50 |

FHOR from 7 May 2026: $600,000 → **$0**; $700,000 → $16.15 per $100 over $600,000 = **$16,150.00**.

**`[trap]`** No metro/regional branch. If one exists, remove it.

### TAS `[calc, derived scale]`

| Dutiable value | Expected duty |
|---|---|
| $300,000 | $9,935.00 |
| $400,000 | $13,997.50 |
| $500,000 | $18,247.50 |
| $600,000 | $22,497.50 |
| $650,000 | $24,622.50 |
| $700,000 | $26,747.50 |
| $725,000 | $27,810.00 |
| **$750,000** | **$28,935.00** |
| $800,000 | $31,185.00 |

**`[trap]`** $750,000 is **$28,935**, not $27,810. A published source has this wrong — $27,810 is the duty at exactly $725,000. Do not seed from that figure.

**`[trap]`** FHB purchasing an established home, contract now, settling after 30 June 2026 → **full standard duty, no exemption**. The test is settlement date, not contract date.

### ACT `[calc, derived scale]`

| Dutiable value | Schedule | Expected duty |
|---|---|---|
| $400,000 | Owner-occupier | $5,008.00 |
| $400,000 | Standard | $8,000.00 |
| $500,000 | Owner-occupier | $8,408.00 |
| $500,000 | Standard | $11,400.00 |
| $600,000 | Standard | $15,720.00 |
| $650,000 | Standard | $17,880.00 |
| $750,000 | Owner-occupier | $19,208.00 |
| $750,000 | Standard | $22,200.00 |
| $850,000 | Standard | $28,100.00 |
| $1,000,000 | Owner-occupier | $33,958.00 |

**`[trap]`** The owner-occupier / standard gap must be a **constant $2,992** at every value above $300,000. If it varies, the schedules have been implemented separately and at least one has an error.

**`[trap]`** HBCS, contract from 1 July 2026, buyer who owned a home seven years ago, will live in it 12 months → **$0 duty at any price**. Not a first-home-buyer test.

**`[trap]`** Same buyer, contract exchanged 30 June 2026 → old income-tested rules with the $1,020,000 cap.

### NT `[calc]`

| Dutiable value | Expected duty | Basis |
|---|---|---|
| $500,000 | $23,928.60 | formula |
| $525,000 | $25,989.28 | formula |
| $525,001 | $25,987.55 | flat 4.95% |
| $700,000 | $34,650.00 | flat 4.95% |

**`[trap]`** The formula uses **V²**, where V = value ÷ 1,000. At $500,000, V = 500 and V² = 250,000. Using V instead gives about $7,533 — badly wrong and easy to miss because it still looks like a plausible duty figure.

**`[trap]`** Above $525,000 the rate applies to the **entire** value, not marginally. Also confirm there is **no NT first-home-buyer duty concession** in the code.

## 8.7 Superannuation

| Item | Input | Expected |
|---|---|---|
| Max contribution base `[calc]` | $32,500 cap ÷ 12% charge | **$270,830** annual (rounded down to nearest $10) |
| Division 296 `[calc]` | $840,000 realised earnings; 76.74% above $3m; 22.48% above $10m | **$115,581** — see §4.2, flag only |

**`[trap]`** Max contribution base must be **annual**, not quarterly, from 1 July 2026. A quarterly implementation at $270,830 ÷ 4 is wrong in both structure and amount.

## 8.8 FHSSS `[ATO]`

| Scenario | Expected releasable | Source |
|---|---|---|
| $25,000 salary sacrificed in one year | **$12,750** | ATO example |
| $5,000 salary sacrifice + $3,000 personal (no deduction claimed) | **$7,250** | published example |

**`[trap]`** The first case tests ordering: the $15,000 annual cap applies **before** the 85% haircut. Applying 85% first gives $21,250 → capped at $15,000 — wrong by $2,250.

**`[trap]`** The second case tests that non-concessional contributions release at **100%** while concessional release at **85%**.

## 8.9 Termination and redundancy

| Item | Input | Expected |
|---|---|---|
| Genuine redundancy tax-free limit `[calc]` | 5 completed years | **$47,603** |
| Genuine redundancy tax-free limit `[calc]` | 10 completed years | **$81,608** |
| Whole-of-income cap `[ATO]` | $180,000 cap, $25,000 other taxable payments | **$155,000** |

### NES redundancy weeks `[trap]`

| Continuous service | Expected weeks |
|---|---|
| 11 months | **0** |
| 4.5 years | 8 |
| 9.5 years | **16** |
| 10.5 years | **12** |
| 25 years | **12** |

The 9.5 / 10.5 pair is the whole test. If the second returns 16 or more, the scale has been implemented as monotonic.

**`[trap]`** Small business employer (14 employees by headcount) → **0 weeks** under the NES, but notice and unused leave are still owed.

### Unused long service leave `[trap]`

Same LSL balance, post-17 August 1993 accrual only:
- **Resignation** → marginal rates
- **Genuine redundancy** → **32% flat**

If both return the same figure, the redundancy branch is missing.

## 8.10 CGT

### The 12-month test `[ATO]` `[trap]`

| Acquired | CGT event | Discount? |
|---|---|---|
| 20 June 2025 | 20 June 2026 | **NO** — 364 days |
| 19 June 2025 | 20 June 2026 | **YES** — 365 days |

Both the acquisition day and the event day are excluded. `sale − purchase >= 365` fails the first case.

### Main residence partial exemption `[ATO]`

| Input | Expected |
|---|---|
| $320,000 gain; 6,940 non-main-residence days; 9,133 ownership days | Assessable **$243,162**, then 50% discount → net capital gain **$121,581** |

### Loss ordering `[trap]`

$100,000 gain (held >12 months), $40,000 carried-forward capital loss:
- **Correct:** ($100,000 − $40,000) × 50% = **$30,000** net capital gain
- **Wrong:** ($100,000 × 50%) − $40,000 = $10,000

A $20,000 error on a common scenario.

### Six-year rule `[trap]`

Two separate rental periods of five years each, with the owner living in the property between them, no other main residence nominated → **fully exempt**. A single cumulative counter would treat year six onward as assessable.

## 8.11 FBT and novated leasing

| Item | Input | Expected |
|---|---|---|
| Employee contribution method `[trap]` | Taxable value $9,000, post-tax contribution $9,000 | FBT **$0** |
| Cents per km `[trap]` | 6,200 eligible km | **$4,550** (capped at 5,000 km) |
| Residual, 5 years `[calc]` | $60,000 base vehicle price | **$16,878** excluding GST, **$18,565.80** including |

### Statutory formula rate lookup `[trap]`

| Vehicle | Date | Expected statutory rate |
|---|---|---|
| BEV, $70,000, under LCT FE threshold | FY2026-27 | **0%** |
| **PHEV, $70,000, new lease** | FY2026-27 | **20%** |
| PHEV, binding commitment pre-1 Apr 2025, unchanged | FY2026-27 | 0% |
| BEV, $70,000 | 1 May 2027 | 0% |
| BEV, $85,000 | 1 May 2027 | **15%** |
| BEV, $70,000 | 1 May 2029 | **15%** |
| Petrol car | any | 20% |

The PHEV row is the one most likely to be wrong in the existing code.

**`[trap]`** An FBT-exempt EV must still produce a reportable fringe benefits amount, and that RFBA must flow into MLS income and HELP repayment income.

## 8.12 Age Pension — from 20 September 2026 `[calc, published anchors]`

| Scenario | Expected fortnightly pension |
|---|---|
| Single, income $1,000/ft, assets under threshold | **$850.70** |
| Couple combined, income $2,000/ft | **$1,064.00** |
| Single homeowner, $500,000 assets, no income | **$736.70** |
| Couple homeowner, $800,000 combined assets, no income | **$963.00** |

### Deeming `[calc]`

Single, $200,000 financial assets:
- To 19 Sep 2026: $66,800 × 1.25% + $133,200 × 3.25% = **$5,164/yr** ≈ $198.62/ft
- From 20 Sep 2026: $66,800 × 1.75% + $133,200 × 3.75% = **$6,164/yr** ≈ $237.08/ft

**`[trap]`** Free areas ($226 / $396) and deeming thresholds ($66,800 / $110,600) do **not** change on 20 September — only rates and the upper cut-offs do. An implementation that indexes everything together on the same date is wrong.

**`[trap]`** Both tests must be calculated and the **lower** result paid.

## 8.13 Health

| Item | Input | Expected |
|---|---|---|
| Mifflin-St Jeor `[calc]` | Male, 30, 80 kg, 180 cm | **1,780 kcal** |
| Mifflin-St Jeor `[calc]` | Female, 30, 65 kg, 165 cm | **1,370.25 kcal** |
| Deficit for rate `[calc]` | 0.5 kg/week | **550 kcal/day** (0.5 × 7,700 ÷ 7) |
| Safe rate ceiling `[calc]` | 80 kg person, 1.0% | 0.8 kg/week |

### Hard blocks `[trap]`

| Scenario | Required behaviour |
|---|---|
| Female, TDEE 1,600, requested 1.0%/week deficit → target ~1,050 kcal | **Refuse to display the target.** Below the 1,200 floor |
| Male, target computes to 1,400 kcal | **Refuse to display.** Below the 1,500 floor |
| Requested rate 1.5% of bodyweight/week | **Refuse.** Above the 1.1% safe band |

A warning displayed *beside* the number does not satisfy this. The number must not appear.

**`[trap]`** Protein for a 120 kg person at 35% body fat: scaling 2.0 g/kg to **total** bodyweight gives 240 g; scaling to **lean mass** (78 kg) gives 156 g. Confirm which denominator the code uses and that it matches the cited source.

**`[trap]`** A multi-year weight projection must show a **declining** BMR — roughly 100–150 kcal/day lower per 10 kg lost. A static-BMR projection overstates the rate of loss.

---

# §9 Source register

| ID | Source |
|---|---|
| S1 | ATO, Tax rates – Australian resident — https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents (updated 13 Aug 2026) |
| S2 | ATO, Schedule 15 – Tax table for working holiday makers — https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers |
| S3 | ATO, Low income tax offset — https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset |
| S4 | ATO, Medicare levy reduction for low-income earners / family income — https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction |
| S5 | ATO, Medicare levy surcharge income, thresholds and rates — https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates (updated 22 Jun 2026) |
| S6 | ATO, Seniors and pensioners tax offset — https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset (updated 8 Jun 2026) |
| S7 | ATO, Study and training loan repayment thresholds and rates — https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds (updated 30 Jun 2026) |
| S8 | Secondary — STSL / HELP indexation commentary, 2026 |
| S9 | ATO, Key super rates and thresholds (all subsections) — https://www.ato.gov.au/tax-rates-and-codes (contributions caps updated 24 Apr 2026; SG and ETP updated 17 Apr 2026; Div 293 updated 7 Aug 2026) |
| S10 | Secondary — Division 296 / Better Targeted Superannuation Concessions commentary, 2026 |
| S11 | ATO, First home super saver scheme, About / Eligibility — https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/early-access-to-super/first-home-super-saver-scheme (updated 8 Jul 2026); ATO GN 2024/1 |
| S12 | ATO, Shortfall interest charge (SIC) rates — https://www.ato.gov.au/tax-rates-and-codes/shortfall-interest-charge-rates |
| S13 | ATO, Schedule 11 – Tax table for employment termination payments — https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-11-tax-table-for-employment-termination-payments; ATO, Working out the whole-of-income cap amount |
| S14 | ATO, Schedule 7 – Tax table for unused leave payments on termination of employment — https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-7-tax-table-for-unused-leave-payments-on-termination-of-employment |
| S15 | Secondary — ETP / redundancy age limit commentary |
| S16 | Fair Work Act 2009 (Cth) s119, s120, s121, s123, s16, s117; secondary commentary |
| S17 | ATO, CGT discount — https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/cgt-discount (updated 29 Jun 2026) |
| S18 | Secondary — CGT loss ordering commentary, multiple consistent |
| S19 | ATO, Treating former home as main residence — https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/property-and-capital-gains-tax/your-main-residence-home/treating-former-home-as-main-residence (updated 22 Jun 2026); secondary on foreign resident withholding |
| S20 | Secondary — FBT rates and gross-up factors, FBT year to 31 Mar 2027 |
| S21 | ATO, Electric car discount – more sustainable FBT treatment of electric cars — https://www.ato.gov.au/about-ato/new-legislation/in-detail/businesses/electric-car-discount-more-sustainable-fbt-treatment-of-electric-cars; ATO, Electric cars exemption |
| S22 | ATO, FBT on plug-in hybrid electric vehicles — https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/fringe-benefits-tax/types-of-fringe-benefits/fbt-on-cars-other-vehicles-parking-and-tolls/fbt-on-plug-in-hybrid-electric-vehicles |
| S23 | ATO, Luxury car tax rate and thresholds — https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds; Treasury Laws Amendment (Tax Incentives and Integrity) Act 2025 |
| S24 | Secondary — novated lease residual values; ATO PCG 2024/2 (EV home charging rate) |
| S25 | Secondary — ATO cents per kilometre determination, FY2026-27 |
| S26 | Secondary — ATO FBT benchmark interest rate Taxation Determination, FBT year to 31 Mar 2027 |
| S27 | Secondary — FBT employee contribution method and otherwise deductible rule |
| S28 | Revenue NSW, Transfer duty / How to calculate transfer duty; First Home Buyers Assistance scheme — https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty |
| S29 | SRO Victoria, Land transfer duty current rates — https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates; vic.gov.au off-the-plan concession |
| S30 | QRO, Transfer duty rates / home concession rates / first home concessions — https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/ |
| S31 | RevenueSA, Rate of stamp duty — https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty; Premier of South Australia media releases |
| S32 | RevenueWA / wa.gov.au, Transfer duty assessment and Duties Fact Sheet – First Home Owner Rate — https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment |
| S33 | SRO Tasmania, First home buyers of established homes duty relief — https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/first-home-buyers-of-established-homes-duty-relief |
| S34 | ACT Revenue Office, ACT Budget 2026-27 updates and Conveyance duty for non-commercial property — https://www.revenue.act.gov.au/about-the-act-revenue-office/news/act-budget-2026-27-updates |
| S35 | NT Department of Treasury and Finance, Stamp duty — https://treasury.nt.gov.au/dtf/territory-revenue-office/stamp-duty; secondary on rate bands and concessions |
| S36 | APRA, macroprudential settings announcements and APG 223; APRA quarterly ADI statistics, March 2026 |
| S37 | Secondary — HEM and serviceability practice, 2026 |
| S38 | Secondary — APRA ARS 223.0 revision effective 30 Sep 2025; DTI limit from 1 Feb 2026 |
| S39 | APRA Prudential Practice Guide APG 223 (≥20% shading of rent, bonuses, overtime) |
| S40 | Helia indicative fee estimator, helia.com.au; QBE LMI premium schedules — via published derivations |
| S41 | Housing Australia, Australian Government 5% Deposit Scheme; firsthomebuyers.gov.au Property Price Caps and Postcode Search Tool |
| S42 | Services Australia / Department of Social Services payment rates; 20 August 2026 announcement of 20 September 2026 rates |
| S43 | Academy of Nutrition and Dietetics evidence analysis, Mifflin-St Jeor and DRI PAL — https://www.andeal.org |
| S44 | Secondary — NHS/NICE PH53; ISSN (Aragon & Schoenfeld 2017); weight loss rate and minimum intake guidance |
| S45 | Secondary — Morton et al. 2018; Helms et al. 2014; protein intake reviews |
| S46 | WHO Expert Consultation 2004, appropriate body-mass index for Asian populations; WHO WPRO |

**Additional legislation referenced:** Treasury Laws Amendment (Cost of Living—Tax Cuts) Act; Treasury Laws Amendment (Tax Reform No. 1) Act 2026 (Act No. 49 of 2026, register ID C2026A00049); Income Tax Rates Amendment (Tax Reform No. 1) Act 2026 (Act No. 50 of 2026); Treasurer's second reading speech, 28 May 2026 — https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/speeches/second-reading-speech-treasury-laws-amendment-tax-reform-no-1; Income Tax Assessment (1936 Act) – Regulations 2025; ITAA 1997 s61-160, Subdiv 61-D, Div 115, Subdiv 960-M; Taxation Administration Act 1953 Sch 1 s280-105; Superannuation Industry (Supervision) Regulations 1994.
