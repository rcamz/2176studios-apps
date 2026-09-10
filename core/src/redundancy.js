// Termination, redundancy, ETPs and unused leave.
//
// Two separate regimes run side by side here, and conflating them is the source
// of most of the errors this module used to have:
//
//   1. FAIR WORK — whether NES redundancy pay is owed at all, how many weeks,
//      and at which rate of pay. Read from the s119 scale in the rate registry.
//      The scale is NOT monotonic: it peaks at 16 weeks for 9–<10 years and
//      DROPS to 12 at 10+. Never extrapolate it.
//   2. ATO — how the resulting money is taxed. The genuine-redundancy tax-free
//      limit, the ETP caps, and the concessional caps on unused leave.
//
// An employee can be owed nothing under (1) and still be taxed under (2) on
// leave and notice, and can be owed redundancy pay under (1) whose payment
// fails the genuine-redundancy test under (2) — for example because they have
// reached Age Pension age.
//
// Every rate resolves from lib/rates against a date, so this works for any
// covered financial year.

import { ratesFor } from './rates/index.js';
import { taxOnAdditionalIncome, medicareLevyOn, getMarginalRate } from './paytax.js';

const DAYS_PER_WEEK = 5;

export const TERMINATION_REASONS = [
  { value: 'redundancy',  label: 'Genuine redundancy (NES applies)' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'dismissal',   label: 'Dismissal' },
  { value: 'non-genuine', label: 'Redundancy (not genuine)' },
];

// The reasons where the role itself is made redundant. Both can attract NES
// redundancy pay; only the first can attract the tax-free limit.
const REDUNDANCY_REASONS = new Set(['redundancy', 'non-genuine']);

// ─── Fair Work: NES redundancy pay ───────────────────────────────────────────

// Weeks of redundancy pay for a period of continuous service. Bands are
// half-open — [minYears, maxYears) — so 9.5 years reads the 9–<10 row (16) and
// 10.5 years reads the 10-and-over row (12).
export function nesWeeksFor(yearsOfService, rates = ratesFor(new Date())) {
  const y = Math.max(0, yearsOfService || 0);
  for (const row of rates.termination.nes.weeks) {
    if (y >= row.minYears && (row.maxYears === null || y < row.maxYears)) return row.weeks;
  }
  return 0;
}

// Whether s119 redundancy pay is switched on at all. Returns the reasons it is
// not, plus caveats that must be shown even when the answer is nil — awards and
// enterprise agreements can improve on the NES, and some provide redundancy pay
// regardless of employer size, so a small-business nil is never the last word.
export function nesRedundancyEligibility(inputs = {}, rates = ratesFor(new Date())) {
  const nes = rates.termination.nes;
  const ex = nes.exclusions;

  const {
    yearsService = 0,
    terminationReason = 'redundancy',
    employmentBasis = 'permanent', // 'permanent' | 'casual' | 'apprentice'
    smallBusinessEmployer = false,
    employeeHeadcount = null,      // headcount overrides the toggle when supplied
    employerInsolvent = false,
    fixedTermEndingNaturally = false,
    seriousMisconduct = false,
    industrySpecificScheme = false,
  } = inputs;

  const reasons = [];
  const caveats = [];

  const isSmallBusiness = employeeHeadcount === null || employeeHeadcount === undefined
    ? Boolean(smallBusinessEmployer)
    : employeeHeadcount < ex.smallBusinessHeadcount;

  if (!REDUNDANCY_REASONS.has(terminationReason)) {
    reasons.push('Redundancy pay under the NES only applies where the position is made redundant.');
  }

  // s121(4): a small-business employee IS entitled where the employer later
  // becomes bankrupt or goes into liquidation and became a small business
  // employer because of that.
  if (isSmallBusiness && !(nes.insolvencyCarveOut && employerInsolvent)) {
    reasons.push(
      `Small business employer — fewer than ${ex.smallBusinessHeadcount} employees by headcount ` +
      '(including regular and systematic casuals; associated entities count as one employer).'
    );
    if (nes.insolvencyCarveOut) {
      caveats.push(
        'If the employer later becomes bankrupt or goes into liquidation and became a small ' +
        'business employer because of that, the entitlement is restored (s121(4)).'
      );
    }
  }

  const minYears = ex.minimumServiceMonths / 12;
  if (yearsService < minYears) {
    reasons.push(`Under ${ex.minimumServiceMonths} months of continuous service.`);
  }

  if (employmentBasis === 'casual' && !ex.casualServiceCounts) {
    reasons.push('Casual service does not count towards redundancy pay (s119(3)).');
  }
  if (employmentBasis === 'apprentice' && ex.apprenticesTrainees) {
    reasons.push('Apprentices, trainees and time-limited training arrangements are excluded.');
  }
  if (fixedTermEndingNaturally && ex.fixedTermEndingNaturally) {
    reasons.push('A contract for a specified period, task or season ending on its stated expiry is excluded.');
  }
  if (seriousMisconduct && ex.seriousMisconduct) {
    reasons.push('Dismissal for serious misconduct is excluded.');
  }
  if (industrySpecificScheme && ex.industrySpecificSchemes) {
    reasons.push('An industry-specific redundancy scheme applies instead of the NES (ss121–123).');
  }

  if (nes.awardsMayImprove) {
    caveats.push(
      'Awards and enterprise agreements can improve on the NES minimum, and some provide ' +
      'redundancy pay regardless of employer size — check the instrument that covers the role.'
    );
  }
  caveats.push(
    'The Fair Work Commission may reduce redundancy pay, including to nil, on application ' +
    'under s120 for other acceptable employment or inability to pay.'
  );

  return { entitled: reasons.length === 0, isSmallBusiness, reasons, caveats };
}

// ─── ATO: caps and limits ────────────────────────────────────────────────────

// Tax-free limit for a genuine redundancy. Uses COMPLETED years of service.
export function genuineRedundancyTaxFreeLimit(completedYearsOfService, rates = ratesFor(new Date())) {
  const g = rates.termination.genuineRedundancy;
  return g.baseLimit + g.perYearOfService * Math.max(0, Math.floor(completedYearsOfService || 0));
}

// Whole-of-income cap remaining after other taxable income for the year. Not
// indexed. Applies to ETPs that are NOT excluded payments — i.e. everything
// except genuine redundancy, invalidity, early retirement scheme and death.
export function wholeOfIncomeCapRemaining(otherTaxablePayments, rates = ratesFor(new Date())) {
  return Math.max(0, rates.termination.etp.wholeOfIncomeCap - Math.max(0, otherTaxablePayments || 0));
}

// ─── Tax primitives ──────────────────────────────────────────────────────────

// Tax on an amount stacked on top of income already counted, by differencing —
// so a payment straddling a bracket is taxed correctly. Includes the Medicare
// levy, because the concessional caps below (32%, 17%) are inclusive of it.
function additionalTax(base, extra, residency, rates) {
  if (!(extra > 0)) return 0;
  return (
    taxOnAdditionalIncome(base, extra, { residency, rates }) +
    medicareLevyOn(base + extra, residency, rates) -
    medicareLevyOn(base, residency, rates)
  );
}

// Components where a tax offset holds the effective rate to a ceiling. The
// ceiling is a MAXIMUM, not a flat rate — someone whose marginal rate is below
// it pays the lower amount, so this must be a min(), never a multiplication.
function cappedTax(base, amount, capRate, residency, rates) {
  if (!(amount > 0)) return 0;
  return Math.min(additionalTax(base, amount, residency, rates), amount * capRate);
}

// Splits a leave balance across accrual periods, never letting the carve-outs
// exceed the total.
function splitDays(totalDays, carveOuts) {
  let left = Math.max(0, totalDays || 0);
  const out = [];
  for (const c of carveOuts) {
    const taken = Math.min(left, Math.max(0, c || 0));
    out.push(taken);
    left -= taken;
  }
  out.push(left);
  return out;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcRedundancy(inputs = {}) {
  const {
    date = new Date(),

    // Redundancy pay uses the BASE rate of pay for ordinary hours (s16).
    // Payment in lieu of notice uses the FULL rate, which includes overtime,
    // penalties, allowances, loadings and bonuses. `weeklyGross` is the legacy
    // single-rate input and backs both when the split is not supplied.
    weeklyGross = 0,
    weeklyBaseRate = null,
    weeklyFullRate = null,

    yearsService = 0,
    terminationReason = 'redundancy',
    age = 45,
    ageAt30June = null,
    grossAnnualIncome = 0,
    residency = 'resident',

    unusedAnnualLeaveDays = 0,
    annualLeavePre1993Days = 0,

    unusedLslDays = 0,
    lslPre1978Days = 0,
    lsl1978to1993Days = 0,

    noticePaidWeeks = 0,

    // Ex gratia / severance paid on top of the NES minimum. Part of the ETP.
    otherEtpAmount = 0,

    // NES eligibility gates.
    employmentBasis = 'permanent',
    smallBusinessEmployer = false,
    employeeHeadcount = null,
    employerInsolvent = false,
    fixedTermEndingNaturally = false,
    seriousMisconduct = false,
    industrySpecificScheme = false,
  } = inputs;

  const rates = inputs.rates ?? ratesFor(date);
  const t = rates.termination;
  const leaveTax = t.leaveTax;

  const baseRate = weeklyBaseRate === null || weeklyBaseRate === undefined
    ? weeklyGross : weeklyBaseRate;
  const fullRate = weeklyFullRate === null || weeklyFullRate === undefined
    ? Math.max(weeklyGross, baseRate) : weeklyFullRate;
  const dayRate = baseRate / DAYS_PER_WEEK;

  const completedYears = Math.max(0, Math.floor(yearsService || 0));
  const isRedundancy = REDUNDANCY_REASONS.has(terminationReason);

  // Tax-free treatment requires the employee to be under Age Pension age at
  // dismissal. Past that, the payment is still made — it is simply no longer a
  // genuine redundancy for tax purposes, which also drags it under the
  // whole-of-income cap and removes the 32% ceiling on unused leave.
  const agePensionAge = t.genuineRedundancy.maxAge;
  const underAgePensionAge = age < agePensionAge;
  const isGenuineRedundancy = terminationReason === 'redundancy' && underAgePensionAge;

  // ── Fair Work entitlement ──
  const nes = nesRedundancyEligibility({
    yearsService, terminationReason, employmentBasis, smallBusinessEmployer,
    employeeHeadcount, employerInsolvent, fixedTermEndingNaturally,
    seriousMisconduct, industrySpecificScheme,
  }, rates);

  const nesWeeksIfEntitled = isRedundancy ? nesWeeksFor(yearsService, rates) : 0;
  const redundancyWeeks = nes.entitled ? nesWeeksIfEntitled : 0;
  const redundancyPay = redundancyWeeks * baseRate;

  // Summary dismissal for serious misconduct carries no notice entitlement.
  const noticeWeeks = seriousMisconduct ? 0 : Math.max(0, noticePaidWeeks || 0);
  const noticePay = noticeWeeks * fullRate;

  // ── Unused leave ──
  const [alPre1993Days, alPost1993Days] = splitDays(unusedAnnualLeaveDays, [annualLeavePre1993Days]);
  const alPre1993 = alPre1993Days * dayRate;
  const alPost1993 = alPost1993Days * dayRate;
  const annualLeavePay = alPre1993 + alPost1993;

  const [lslPre1978Split, lslMidSplit, lslPost1993Days] =
    splitDays(unusedLslDays, [lslPre1978Days, lsl1978to1993Days]);
  const lslPre1978 = lslPre1978Split * dayRate;
  const lslMid = lslMidSplit * dayRate;
  const lslPost1993 = lslPost1993Days * dayRate;
  const lslPay = lslPre1978 + lslMid + lslPost1993;

  // Only 5% of a pre-16 Aug 1978 LSL amount is assessable, at marginal rates.
  const lslPre1978Assessable = lslPre1978 * 0.05;

  const alPost1993Rate = isGenuineRedundancy
    ? leaveTax.annualLeave.postAug1993.redundancy
    : leaveTax.annualLeave.postAug1993.normal;
  const lslPost1993Rate = isGenuineRedundancy
    ? leaveTax.longServiceLeave.postAug1993.redundancy
    : leaveTax.longServiceLeave.postAug1993.normal;
  const alPre1993Rate = leaveTax.annualLeave.preAug1993.normal;   // 32% either way
  const lslMidRate = leaveTax.longServiceLeave.aug1978Aug1993.normal; // 32% either way

  // ── Tax, layered ──
  // Every one of these amounts is assessable income, so each layer sits on top
  // of the last and the offsets are applied per layer. Ordinary income first,
  // then the capped leave components, then the ETP.
  let runningBase = Math.max(0, grossAnnualIncome || 0);

  const marginalLayer = (amount) => {
    const tax = additionalTax(runningBase, amount, residency, rates);
    runningBase += Math.max(0, amount);
    return tax;
  };
  const cappedLayer = (amount, capRate) => {
    const tax = cappedTax(runningBase, amount, capRate, residency, rates);
    runningBase += Math.max(0, amount);
    return tax;
  };
  const applyLeaveRate = (amount, rate) =>
    rate === 'marginal' ? marginalLayer(amount) : cappedLayer(amount, rate);

  // Payment in lieu of notice is salary and wages — always marginal.
  const noticeTax = marginalLayer(noticePay);

  const annualLeaveTax =
    applyLeaveRate(alPre1993, alPre1993Rate) +
    applyLeaveRate(alPost1993, alPost1993Rate);

  // 'marginal5pct' — 5% of the total in assessable income at marginal rates.
  const lslPre1978Tax = marginalLayer(lslPre1978Assessable);
  const lslTax =
    lslPre1978Tax +
    applyLeaveRate(lslMid, lslMidRate) +
    applyLeaveRate(lslPost1993, lslPost1993Rate);

  // ── ETP ──
  const etpGross = redundancyPay + Math.max(0, otherEtpAmount || 0);
  const taxFreeLimit = isGenuineRedundancy
    ? genuineRedundancyTaxFreeLimit(completedYears, rates)
    : 0;
  const taxFreeAmount = Math.min(etpGross, taxFreeLimit);
  const taxableETP = Math.max(0, etpGross - taxFreeAmount);

  // A genuine redundancy payment is an EXCLUDED payment: the ETP cap alone
  // applies. Everything else is also measured against the whole-of-income cap,
  // reduced by the other taxable income already counted above.
  const isExcludedEtp = isGenuineRedundancy;
  const otherTaxableIncomeForCap = runningBase; // base + notice + leave, all assessable
  const etpCap = t.etp.lifeBenefitCap;
  const wicRemaining = wholeOfIncomeCapRemaining(otherTaxableIncomeForCap, rates);
  const applicableCap = isExcludedEtp ? etpCap : Math.min(etpCap, wicRemaining);
  const capBinding = isExcludedEtp
    ? 'etpCap'
    : (wicRemaining < etpCap ? 'wholeOfIncomeCap' : 'etpCap');

  // Measured against preservation age at 30 June of the payment year, not a
  // hardcoded 60. Callers that know the birth date can pass ageAt30June.
  const preservationAge = rates.superannuation.preservationAge;
  const etpAge = ageAt30June === null || ageAt30June === undefined ? age : ageAt30June;
  const concessionalRate = etpAge >= preservationAge
    ? t.etp.rateAtPreservationAge
    : t.etp.rateUnderPreservationAge;

  const etpWithinCap = Math.min(taxableETP, applicableCap);
  const etpAboveCap = Math.max(0, taxableETP - etpWithinCap);
  const etpTaxWithinCap = cappedLayer(etpWithinCap, concessionalRate);
  // Above the cap there is no offset — the top marginal rate applies outright.
  const etpTaxAboveCap = etpAboveCap * t.etp.rateAboveCap;
  const etpTax = etpTaxWithinCap + etpTaxAboveCap;

  // ── Totals ──
  const totalGross = etpGross + annualLeavePay + lslPay + noticePay;
  const totalTax = etpTax + annualLeaveTax + lslTax + noticeTax;
  const netTakeHome = Math.max(0, totalGross - totalTax);

  // ── Caveats worth surfacing ──
  const caveats = [];
  if (isRedundancy && !nes.entitled) caveats.push(...nes.caveats);
  if (terminationReason === 'redundancy' && !underAgePensionAge) {
    caveats.push(
      `Tax-free treatment of a genuine redundancy requires being under Age Pension age ` +
      `(${agePensionAge}). The payment is taxed as an ordinary ETP instead.`
    );
  }
  if (etpAge === preservationAge - 1) {
    caveats.push(
      `Turning ${preservationAge} on or before 30 June of the payment year drops the ETP ` +
      `ceiling from ${Math.round(t.etp.rateUnderPreservationAge * 100)}% to ` +
      `${Math.round(t.etp.rateAtPreservationAge * 100)}%.`
    );
  }
  if (lslPost1993 > 0 && lslPost1993 < leaveTax.smallAmountRuleThreshold && !isGenuineRedundancy) {
    caveats.push(
      `A post-17 August 1993 LSL lump sum under $${leaveTax.smallAmountRuleThreshold} on a normal ` +
      'termination is subject to a special small-amount rule.'
    );
  }
  if (unusedLslDays > 0) {
    caveats.push(
      'LSL is apportioned by DAYS, not dollars, and leave already taken must be attributed to ' +
      'the period it was used in — total service alone gives the wrong split.'
    );
  }

  return {
    // Fair Work
    nes,
    nesEntitled: nes.entitled,
    nesWeeksIfEntitled,
    redundancyWeeks,
    redundancyPay,
    redundancyPayBasis: t.nes.redundancyPayBasis,
    noticePayBasis: t.nes.noticePayBasis,
    baseRate,
    fullRate,

    // ETP
    otherEtpAmount: Math.max(0, otherEtpAmount || 0),
    etpGross,
    taxFreeLimit,
    taxFreeAmount,
    taxableETP,
    etpWithinCap,
    etpAboveCap,
    etpTaxWithinCap,
    etpTaxAboveCap,
    etpTax,
    etpCap,
    wholeOfIncomeCap: t.etp.wholeOfIncomeCap,
    wholeOfIncomeCapRemaining: wicRemaining,
    wholeOfIncomeCapApplies: !isExcludedEtp,
    applicableCap,
    capBinding,
    concessionalRate,
    preservationAge,
    isGenuineRedundancy,
    underAgePensionAge,
    agePensionAge,

    // Leave and notice
    annualLeavePay,
    annualLeavePre1993: alPre1993,
    annualLeavePost1993: alPost1993,
    annualLeaveTax,
    annualLeaveCapped: alPost1993Rate !== 'marginal',
    lslPay,
    lslPre1978,
    lslPre1978Assessable,
    lsl1978to1993: lslMid,
    lslPost1993,
    lslTax,
    lslPost1993Capped: lslPost1993Rate !== 'marginal',
    noticeWeeks,
    noticePay,
    noticeTax,

    // Totals
    totalGross,
    totalTax,
    netTakeHome,
    effectiveTaxRate: totalGross > 0 ? totalTax / totalGross : 0,
    marginalRate: getMarginalRate(Math.max(0, grossAnnualIncome || 0), residency, rates),

    caveats,
    rates,
  };
}

// ─── Explanation ─────────────────────────────────────────────────────────────

import { workings, section, step, subtotal, total, note } from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const pct = (r) => (r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 1) + '%';

// The band of the s119 scale a given service length falls in, read back out of
// the registry rather than restated here.
function nesBandFor(yearsOfService, rates) {
  const y = Math.max(0, yearsOfService || 0);
  return rates.termination.nes.weeks.find(
    (row) => y >= row.minYears && (row.maxYears === null || y < row.maxYears)
  ) ?? null;
}

function bandLabel(band) {
  if (!band) return 'Outside the scale';
  if (band.maxYears === null) return `${band.minYears} years and over`;
  return `${band.minYears} to under ${band.maxYears} years`;
}

/**
 * Build a step-by-step account of a calcRedundancy result.
 *
 * Separate from calcRedundancy so the hot path stays free of presentation
 * concerns. Every figure comes from the result object or the inputs.
 */
export function explainRedundancy(result, inputs = {}) {
  const r = result;
  const rates = r.rates;
  const t = rates.termination;
  const leaveTax = t.leaveTax;
  const yearsService = inputs.yearsService ?? 0;
  const band = nesBandFor(yearsService, rates);
  const peak = [...t.nes.weeks].reduce((a, b) => (b.weeks > a.weeks ? b : a));
  const topBand = t.nes.weeks.find((w) => w.maxYears === null);

  // ── NES entitlement ───────────────────────────────────────────────────────
  const nesSection = section('Redundancy pay under the NES', [
    step('Continuous service', `${yearsService} ${yearsService === 1 ? 'year' : 'years'}`),
    step('Service band', bandLabel(band), { muted: true }),
    !r.nesEntitled && r.nesWeeksIfEntitled > 0 && step(
      'Weeks the scale would give', `${r.nesWeeksIfEntitled} weeks`, { muted: true }
    ),
    step('Weeks of redundancy pay', `${r.redundancyWeeks} weeks`, {
      note: r.nesEntitled ? null : 'Not payable — see below',
    }),
    step('Base rate of pay per week', r.baseRate, {
      note: `Redundancy pay uses the ${r.redundancyPayBasis} rate; notice uses the ${r.noticePayBasis} rate`,
    }),
    total('Redundancy pay', r.redundancyPay),
    topBand && peak && topBand.weeks < peak.weeks && note(
      `The scale is not a ladder. It peaks at ${peak.weeks} weeks for ${bandLabel(peak).toLowerCase()}, then ` +
      `DROPS to ${topBand.weeks} weeks at ${topBand.minYears} years and stays there. Staying past ` +
      `${peak.maxYears} years reduces the NES entitlement — it never increases it.`
    ),
    !r.nesEntitled && r.nes.reasons.length > 0 && note(
      `No NES redundancy pay: ${r.nes.reasons.join(' ')}`
    ),
  ]);

  // ── Tax-free limit ────────────────────────────────────────────────────────
  const g = t.genuineRedundancy;
  const completedYears = Math.max(0, Math.floor(yearsService || 0));
  const limitSection = section('Genuine redundancy tax-free limit', [
    r.isGenuineRedundancy && step('Base amount', g.baseLimit),
    r.isGenuineRedundancy && step(
      `plus ${money(g.perYearOfService)} for each of ${completedYears} completed ${completedYears === 1 ? 'year' : 'years'}`,
      g.perYearOfService * completedYears,
      { note: 'Completed years only — a part year adds nothing' }
    ),
    total('Tax-free limit', r.taxFreeLimit),
    !r.isGenuineRedundancy && note(
      r.underAgePensionAge
        ? 'The tax-free limit applies only to a genuine redundancy. This payment does not qualify, so the whole ETP is taxable.'
        : `The tax-free limit requires being under Age Pension age (${r.agePensionAge}) at dismissal. Past that the payment is still made, but it is taxed as an ordinary ETP.`
    ),
  ]);

  // ── ETP split ─────────────────────────────────────────────────────────────
  const etpSection = section('Employment termination payment', [
    step('Redundancy pay', r.redundancyPay),
    r.otherEtpAmount > 0 && step('plus ex gratia / severance', r.otherEtpAmount),
    subtotal('ETP gross', r.etpGross),
    step('Tax-free portion', r.taxFreeAmount, {
      note: r.taxFreeLimit > 0 ? `Capped at the ${money(r.taxFreeLimit)} limit` : null,
    }),
    step('Concessionally taxed portion', r.etpWithinCap, {
      note: `Held to ${pct(r.concessionalRate)} because you are ${
        r.concessionalRate === t.etp.rateAtPreservationAge ? 'at or over' : 'under'
      } preservation age (${r.preservationAge}) at 30 June`,
    }),
    r.etpAboveCap > 0 && step('Portion above the cap', r.etpAboveCap, {
      note: `Taxed at ${pct(t.etp.rateAboveCap)} with no offset`,
    }),
    subtotal('Taxable ETP', r.taxableETP, {
      note: `${money(r.taxFreeAmount)} tax-free plus ${money(r.taxableETP)} taxable is the whole ${money(r.etpGross)}`,
    }),
    step('Cap applied', r.applicableCap, {
      muted: true,
      note: r.capBinding === 'wholeOfIncomeCap'
        ? `The whole-of-income cap binds — ${money(r.wholeOfIncomeCap)} less the other taxable income already counted leaves ${money(r.wholeOfIncomeCapRemaining)}`
        : `The ${money(r.etpCap)} ETP cap binds`,
    }),
    step('Tax on the concessional portion', r.etpTaxWithinCap),
    r.etpAboveCap > 0 && step('Tax on the portion above the cap', r.etpTaxAboveCap),
    total('ETP tax', r.etpTax),
    note(
      `The concessional rate is a CEILING, not a flat rate. Someone whose marginal rate sits below ` +
      `${pct(r.concessionalRate)} pays the lower amount — the offset only ever brings the tax down.`
    ),
  ]);

  // ── Leave, and what the 32% ceiling is worth ──────────────────────────────
  const alRedundancyRate = leaveTax.annualLeave.postAug1993.redundancy;
  const lslRedundancyRate = leaveTax.longServiceLeave.postAug1993.redundancy;
  const cappedRate = typeof alRedundancyRate === 'number' ? alRedundancyRate : lslRedundancyRate;

  const leaveSection = (r.annualLeavePay > 0 || r.lslPay > 0 || r.noticePay > 0)
    ? section('Unused leave and notice', [
        r.noticePay > 0 && step(`Payment in lieu of notice — ${r.noticeWeeks} weeks at ${money(r.fullRate)}`, r.noticePay, {
          note: 'Salary and wages, always taxed at marginal rates — no ceiling applies',
        }),
        r.annualLeavePre1993 > 0 && step('Annual leave accrued before 18 August 1993', r.annualLeavePre1993, {
          note: `Held to ${pct(leaveTax.annualLeave.preAug1993.normal)} whatever the reason for leaving`,
        }),
        r.annualLeavePost1993 > 0 && step('Annual leave accrued after 17 August 1993', r.annualLeavePost1993, {
          note: r.annualLeaveCapped
            ? `Held to ${pct(alRedundancyRate)} because this is a genuine redundancy`
            : 'Taxed at your marginal rate',
        }),
        r.lslPre1978 > 0 && step('Long service leave accrued before 16 August 1978', r.lslPre1978, {
          note: `Only 5% of it — ${money(r.lslPre1978Assessable)} — is assessable, at marginal rates`,
        }),
        r.lsl1978to1993 > 0 && step('Long service leave accrued 16 Aug 1978 to 17 Aug 1993', r.lsl1978to1993, {
          note: `Held to ${pct(leaveTax.longServiceLeave.aug1978Aug1993.normal)} whatever the reason for leaving`,
        }),
        r.lslPost1993 > 0 && step('Long service leave accrued after 17 August 1993', r.lslPost1993, {
          note: r.lslPost1993Capped
            ? `Held to ${pct(lslRedundancyRate)} because this is a genuine redundancy`
            : 'Taxed at your marginal rate',
        }),
        subtotal('Gross leave and notice', r.annualLeavePay + r.lslPay + r.noticePay),
        step('Tax on notice', r.noticeTax),
        step('Tax on annual leave', r.annualLeaveTax),
        step('Tax on long service leave', r.lslTax),
        total('Tax on leave and notice', r.noticeTax + r.annualLeaveTax + r.lslTax),
        r.isGenuineRedundancy && (r.annualLeaveCapped || r.lslPost1993Capped) && note(
          `Because this is a genuine redundancy, post-August-1993 leave is held to ${pct(cappedRate)}. ` +
          'On any other kind of termination — a resignation, or a redundancy that is not genuine — the same ' +
          'leave would be taxed at your full marginal rate plus Medicare. That single distinction is usually ' +
          'worth more than the concessional ETP rate.'
        ),
        !r.isGenuineRedundancy && (r.annualLeavePost1993 > 0 || r.lslPost1993 > 0) && note(
          `This is not a genuine redundancy, so post-August-1993 leave is taxed at your full marginal rate. ` +
          `Were it genuine, the same leave would be held to ${pct(cappedRate)}.`
        ),
      ])
    : null;

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = section('What you take home', [
    step('ETP gross', r.etpGross),
    step('Annual leave', r.annualLeavePay),
    step('Long service leave', r.lslPay),
    step('Payment in lieu of notice', r.noticePay),
    subtotal('Total gross', r.totalGross),
    step('less ETP tax', -r.etpTax),
    step('less tax on annual leave', -r.annualLeaveTax),
    step('less tax on long service leave', -r.lslTax),
    step('less tax on notice', -r.noticeTax),
    subtotal('Total tax', r.totalTax),
    total('Net take-home', r.netTakeHome),
    step('Effective tax rate', pct(r.effectiveTaxRate), { muted: true }),
  ]);

  return workings([nesSection, limitSection, etpSection, leaveSection, totals], {
    source: 'Fair Work Act NES minimums and Australian Taxation Office rates',
    asAt: rates.__fy ? `FY${rates.__fy}` : null,
  });
}
