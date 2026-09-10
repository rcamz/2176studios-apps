# Rates verification prompt — paste into Claude Desktop

> Copy everything below the line into Claude Desktop (with web search enabled).

---

I need you to verify a large set of Australian tax, superannuation, lending and government-scheme figures against **current authoritative online sources**. This is for a suite of public financial calculators, so accuracy matters more than speed — wrong numbers here become wrong advice.

**Today's date is 9 September 2026, so the current Australian financial year is FY2026-27 (1 July 2026 – 30 June 2027).** Official figures for this year should now be published. Please retrieve **actual published FY2026-27 figures**, not projections or indexation estimates. Where a figure genuinely hasn't been published yet, say so explicitly rather than estimating.

## Ground rules

1. **Use primary sources only** — ato.gov.au, servicesaustralia.gov.au, fairwork.gov.au, apra.gov.au, ausuper/moneysmart.gov.au, and each state/territory revenue office. Do not rely on accounting-firm blogs, news articles, or comparison sites except to locate the primary source.
2. **Cite a URL for every single figure.** If you can't find a source, mark it `NOT VERIFIED` — do not fill the gap with a plausible number.
3. **Distinguish legislated from indexed from proposed.** Note the effective date and whether anything is scheduled to change during or after FY2026-27.
4. **Treat every "current code value" and "claimed correct value" below as unverified.** Both may be wrong. Check both against the source and tell me which (if either) is right.
5. **Flag anything that changed recently** — particularly changes taking effect 1 July 2026, since the code was written before that date.

## Required output format

For every item, return a row in this exact structure:

| Item | Code value | Claimed correct | **Verified FY2026-27** | Source URL | Status | Effective date | Notes |
|---|---|---|---|---|---|---|---|

Where **Status** is one of: `CODE CORRECT` / `CODE WRONG` / `CLAIM WRONG` / `BOTH WRONG` / `NOT VERIFIED`.

At the end, give me:
- **A. Critical corrections** — figures where the code is wrong in a way that changes a user-facing result by more than ~$100/yr
- **B. Minor corrections** — wrong but low-impact
- **C. Confirmed correct** — so I know what not to touch
- **D. Not verifiable** — with a note on why and what the best available proxy is
- **E. Things I didn't ask about** — any FY2026-27 change relevant to the calculators listed at the end that isn't covered by my questions

---

# 1. Income tax — residents

Current code brackets (labelled 2026-27):

| From | Rate | Cumulative base |
|---|---|---|
| $0 | 0% | $0 |
| $18,201 | **16%** | $0 |
| $45,001 | 30% | $4,288 |
| $135,001 | 37% | $31,288 |
| $190,001 | 45% | $51,638 |

**Claim to verify:** the *Treasury Laws Amendment (Cost of Living—Tax Cuts) Act 2025* reduced the second bracket from 16% to **15% effective 1 July 2026**, and to 14% from 1 July 2027 — making the correct FY2026-27 cumulative bases $4,020 / $31,020 / $51,370.

Questions:
1.1 What are the **actual legislated FY2026-27** resident marginal rates and thresholds?
1.2 Did the 15% rate take effect 1 July 2026 as claimed? Is 14% still scheduled for 1 July 2027?
1.3 Were the *thresholds* ($18,200 / $45,000 / $135,000 / $190,000) changed at all, or only the rate?
1.4 Foreign resident rates and thresholds for FY2026-27?
1.5 Working Holiday Maker rates and thresholds for FY2026-27?

# 2. Offsets and levies

Code: LITO max $700, taper 5c/$1 from $37,500, then 1.5c/$1 from $45,000, exhausted at $66,667.
Code: Medicare levy 2%, low-income threshold $27,069, phase-in at 10c/$1 to $33,836.
Code MLS tiers: >$100,000 → 1%; >$116,000 → 1.25%; >$155,000 → 1.5%.

2.1 FY2026-27 **LITO** amount and taper points — confirm or correct.
2.2 FY2026-27 **Medicare levy low-income thresholds** — singles, families, seniors/pensioners, and the per-dependant-child increment. What is the phase-in formula and upper limit?
2.3 FY2026-27 **Medicare Levy Surcharge** income tiers for singles **and families**, with the rate at each tier.
2.4 Confirm the exact definition of **"income for MLS purposes"** — specifically, are reportable employer superannuation contributions (i.e. salary sacrifice) added back to taxable income?
2.5 Does **SAPTO** still exist for FY2026-27, and what are its thresholds?
2.6 Is the Medicare levy still 2%?

# 3. HELP / HECS — high priority

The code implements the **old** system: a percentage applied to *total* repayment income, 18 brackets, lowest threshold $58,500.

**Claim to verify:** from 1 July 2025 this was replaced by a **marginal** system — nil below $67,000, then 15% of income above $67,000, and $8,700 + 17% above $125,000.

3.1 What is the **actual FY2026-27 HELP repayment structure**? Marginal or percentage-of-total?
3.2 Exact FY2026-27 thresholds and rates. (If marginal, give the full schedule.)
3.3 Confirm the definition of **"repayment income"** — is it taxable income plus reportable super contributions, reportable fringe benefits, net investment losses and exempt foreign income?
3.4 Was there a **20% HELP debt reduction** applied to balances, and if so as at what date? Has anything similar happened since?
3.5 What is the FY2026-27 **indexation rate** applied to HELP debts, and on what date is it applied? Is indexation still capped at the lower of CPI and WPI?
3.6 Do VET Student Loans and SFSS use the same schedule?

# 4. Superannuation

Code: SG rate 12%; concessional cap $30,000; contributions tax 15%; no Division 293 modelled anywhere.

4.1 FY2026-27 **Super Guarantee rate**. Any further legislated increases after this year?
4.2 FY2026-27 **concessional contributions cap** — still $30,000 or has it indexed?
4.3 FY2026-27 **non-concessional cap** and the bring-forward thresholds.
4.4 **Division 293**: current income threshold (claimed $250,000), the rate, and exactly which income components count toward the threshold.
4.5 **Carry-forward unused concessional contributions** — is the total-super-balance test still $500,000? Still a 5-year lookback?
4.6 FY2026-27 **transfer balance cap**.
4.7 **Preservation age** — confirm it is now 60 for everyone.
4.8 **Minimum pension drawdown percentages** by age band for FY2026-27. Any temporary reductions in force?
4.9 **Maximum super contribution base** (quarterly) for FY2026-27.
4.10 Government **co-contribution** thresholds and maximum for FY2026-27.
4.11 Has the proposed **Division 296** tax on balances above $3m been legislated? If so: commencement date, rate, threshold, and whether the threshold is indexed.

# 5. First Home Super Saver Scheme

Code: $15,000/yr releasable, $50,000 lifetime, notional earnings 7.14%, withdrawal taxed at (marginal rate − 30%). Code releases **100%** of concessional contributions.

5.1 Confirm FY2026-27 annual and lifetime FHSSS limits.
5.2 **Is only 85% of concessional contributions releasable?** Confirm the exact treatment.
5.3 How are **associated earnings** actually calculated? Confirm the rate (shortfall interest charge?), the compounding frequency, and the current SIC rate for FY2026-27 quarters.
5.4 Withdrawal tax: is it marginal rate **plus Medicare levy** less a 30% offset, or marginal rate less 30% with no Medicare?
5.5 Full current **eligibility criteria** — age, prior property ownership, the determination-before-contract requirement, and the occupancy requirement.
5.6 Any FY2026-27 changes to the scheme?

# 6. Termination and redundancy

Code: tax-free base $13,462 + $6,734 per completed year; ETP cap **$235,000**; concessional ETP rates 32% (under 60) / 17% (60+).

6.1 FY2026-27 **genuine redundancy tax-free base amount and per-year-of-service amount**.
6.2 FY2026-27 **ETP cap**.
6.3 FY2026-27 **whole-of-income cap** — is it still $180,000 and still un-indexed? Confirm exactly when it applies instead of the ETP cap.
6.4 ETP concessional tax rates for FY2026-27, and confirm whether the age test is **preservation age** or a fixed age 60.
6.5 **Unused annual leave** paid on genuine redundancy — confirm the claim that it is taxed at a maximum of 32% (30% + Medicare) rather than marginal rate.
6.6 **Unused long service leave** — full breakdown by accrual period (pre-16 Aug 1978 / 16 Aug 1978–17 Aug 1993 / post-17 Aug 1993), and the treatment on genuine redundancy vs resignation.
6.7 Is the tax-free genuine redundancy treatment still restricted to people **under Age Pension age**? What is Age Pension age in FY2026-27?
6.8 Confirm the current **NES redundancy pay scale** (weeks by years of service) and all exclusions — small business employer definition, minimum service, casuals, fixed-term contracts.

# 7. Capital gains tax

7.1 Confirm the **50% CGT discount** for individuals — still 50%, still requires ownership for **more than** 12 months? Confirm exactly how the 12-month period is counted (which days are excluded).
7.2 Confirm the **CGT event date is the contract date**, not settlement.
7.3 Confirm the ordering: are **capital losses applied before** the 50% discount?
7.4 Does a capital gain attract the **Medicare levy**? Does it count toward **HELP repayment income** and **MLS income**?
7.5 Current **main residence exemption** rules, including the six-year absence rule and partial-exemption formula.
7.6 Any FY2026-27 changes to CGT for individuals? Confirm the status of the foreign-resident CGT withholding rate and threshold.

# 8. FBT and novated leasing — high priority

Code: FBT rate 47%; gross-up 2.0802; statutory fraction 20%; LCT threshold $91,000; treats **PHEVs as FBT-exempt**; ATO residual values 65.63/56.25/46.88/37.5/28.13% for 1–5 years.

8.1 FBT rate and **both** gross-up factors (Type 1 and Type 2) for the FBT year ending 31 March 2027 — and confirm which applies to a novated lease.
8.2 **EV FBT exemption**: confirm the claim that the exemption for **plug-in hybrids ended 1 April 2025**. What is the current position for battery EVs and hydrogen FCEVs?
8.3 Is there now a **sunset or review date** for the battery-EV exemption?
8.4 FY2026-27 **luxury car tax threshold for fuel-efficient vehicles** (the one that gates the FBT exemption) and the general LCT threshold.
8.5 Confirm the **reportable fringe benefits** consequence: does an FBT-*exempt* EV still generate a reportable fringe benefits amount, and does that amount affect MLS, HELP repayment income, Division 293, Family Tax Benefit and child support?
8.6 Confirm current **ATO minimum residual value percentages** by lease term.
8.7 FY2026-27 **cents-per-kilometre** deduction rate and the km cap. Confirm it applies only to work-related travel, not commuting.
8.8 Under the **employee contribution method**, confirm that a post-tax contribution equal to the taxable value reduces FBT to nil.

# 9. Stamp duty / transfer duty — all 8 jurisdictions, highest priority

I need **current FY2026-27 residential transfer duty scales** and **first-home-buyer concessions** for every state and territory. For each, give the full bracket table, the FHB exemption/concession thresholds and how the taper works, plus any new-build-specific rules, foreign purchaser surcharge, and off-the-plan concessions.

9.1 **NSW** — full scale including the premium tier. FHB Assistance Scheme thresholds. Are brackets still indexed annually?
9.2 **VIC** — full scale, PPR concession, FHB exemption/concession, off-the-plan concession.
9.3 **QLD** — full scale, home concession vs first-home concession. Confirm the claim that the FHB exemption rose to $700,000 (tapering to $800,000) in June 2024, and that duty was abolished for FHBs buying new/off-the-plan from 1 May 2025. Is that still in force?
9.4 **SA** — full scale. Confirm the claim that stamp duty was abolished for first home buyers on **new** homes with no price cap. Any change since?
9.5 **WA** — full scale and current FHB thresholds.
9.6 **TAS** — full scale and the FHB discount for established homes.
9.7 **ACT** — full scale. Explain the current state of the stamp-duty-to-land-tax phase-out, and how the **income-tested** Home Buyer Concession Scheme works.
9.8 **NT** — the exact current duty formula (including the quadratic formula for values under the threshold, if still applicable) and any FHB concessions.
9.9 For each jurisdiction: **when were these figures last changed, and is any change scheduled during FY2026-27?**

# 10. Lending and serviceability

10.1 Current **APRA serviceability buffer** — still 3.0 percentage points? Has APRA signalled or made any change?
10.2 Is there a common **minimum assessment rate floor** used alongside the buffer?
10.3 Current **HEM (Household Expenditure Measure)** benchmarks — how do they scale by income band, household composition and location? Give indicative monthly figures for: single on $90k; couple on $180k combined; couple with two children on $200k combined.
10.4 Typical lender treatment of **credit card limits** in serviceability (3% or 3.8% of limit monthly?).
10.5 How do lenders currently treat **HELP/HECS debt** in serviceability? Confirm whether any 2025 guidance allowed lenders to disregard HELP debt in defined circumstances.
10.6 Typical **rental income shading** percentage.
10.7 Current **LMI** cost as a rough percentage of loan value at 85%, 90% and 95% LVR.
10.8 Current **First Home Guarantee** / Home Guarantee Scheme rules — places, price caps by region, deposit minimum, and any FY2026-27 changes.

# 11. Age Pension

11.1 FY2026-27 **Age Pension age**.
11.2 Current **assets test** thresholds and cut-off limits — single and couple, homeowner and non-homeowner. Give the effective date (these index in March and September).
11.3 Current **income test** thresholds, the taper rate, and current **deeming rates and thresholds**.
11.4 Current maximum fortnightly pension rates, single and couple.
11.5 Confirm the family home is exempt from the assets test.

# 12. Health guidelines (non-tax — lower priority)

12.1 Is **Mifflin-St Jeor** still the recommended BMR equation for general population estimates? Any preferred alternative?
12.2 Standard **activity multipliers** for TDEE and their accepted descriptions.
12.3 Current evidence on the **kcal-per-kg-of-body-weight** figure — is ~7,700 kcal/kg still the accepted approximation?
12.4 Current **minimum safe calorie intake** guidance for unsupervised dieting, by sex.
12.5 Recommended **maximum safe rate of weight loss** (% of bodyweight per week).
12.6 Evidence-based **protein intake** ranges (g/kg) for fat loss, maintenance and muscle gain — and specifically whether protein should be scaled to **total bodyweight, goal weight or lean body mass** for people with higher body fat.
12.7 Do Australian health authorities recommend **ethnicity-adjusted BMI thresholds** (e.g. lower cut-offs for South and East Asian populations)?
12.8 Standard guidance on accounting for **metabolic adaptation** (falling BMR as weight is lost) in weight-loss projections.

---

## Context: what these figures feed

Twelve calculators — Pay/Tax, Mortgage, Borrowing Power, Rent vs Buy, CGT, Redundancy, Salary Sacrifice, FHSSS, Retirement/Super, Novated Lease, Savings, Health.

With that in mind, please also flag under **section E** any FY2026-27 change relevant to these tools that my questions above didn't cover — new schemes, abolished concessions, changed definitions, or anything scheduled to change mid-year that a calculator would need to handle.

Finally: for each major domain, tell me **how often these figures change and what would trigger a change**, so I can set a sensible re-verification schedule rather than re-auditing everything each year.
