// Capital gains tax — individuals, super funds and companies.
//
// Everything here resolves against the CGT EVENT DATE, which for an asset sold
// under contract is the CONTRACT date, not settlement. That matters twice: it
// decides which financial year the gain falls in, and it decides which CGT
// regime applies (the 50% discount is replaced by cost base indexation plus a
// 30% minimum tax rate for events on or after 1 July 2027).
//
// Three traps this module exists to get right:
//
//   1. The 12-month discount test excludes BOTH the acquisition day and the
//      CGT event day. Acquired 20 Jun 2025, event 20 Jun 2026 → 364 days → no
//      discount. `event - acquired >= 365` wrongly grants it.
//   2. Capital losses are applied BEFORE the discount. Discounting first
//      understates the gain — $20,000 on a $100k gain with a $40k loss.
//   3. The main residence six-year absence limit RESETS. It applies separately
//      to each absence that follows a period of actually living in the
//      property, so two five-year rentals either side of a period of occupancy
//      are both fully covered. A single cumulative counter is wrong.

import { ratesFor } from './rates/index.js';
import {
  calcPayTax,
  taxOnAdditionalIncome,
  getMarginalRate,
} from './paytax.js';

// ─── Dates ───────────────────────────────────────────────────────────────────
// All date maths runs in whole UTC days on an integer day index, so daylight
// saving and local midnight can never shift a boundary that is worth 50% of the
// gain.

const MS_PER_DAY = 86_400_000;

export function toISODate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

// null for anything that is not a real YYYY-MM-DD, so callers can distinguish
// "not entered yet" from "1970-01-01".
export function dayIndex(value) {
  const iso = toISODate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / MS_PER_DAY);
}

export function fromDayIndex(index) {
  return new Date(index * MS_PER_DAY).toISOString().slice(0, 10);
}

// 29 Feb + n years rolls to 1 March, which is the conventional treatment.
export function addYears(value, years) {
  const iso = toISODate(value);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y + years, m - 1, d)).toISOString().slice(0, 10);
}

// Inclusive day count — the number of days you owned the asset.
export function ownershipDaysBetween(acquired, disposed) {
  const a = dayIndex(acquired);
  const b = dayIndex(disposed);
  if (a === null || b === null || b < a) return 0;
  return b - a + 1;
}

// The discount test's own day count. `excludeAcquisitionDay` and
// `excludeEventDay` both come from the rate registry rather than being baked in
// here, because they are the thing most likely to be got wrong twice.
export function discountHoldingDays(acquired, disposed, rates) {
  const a = dayIndex(acquired);
  const b = dayIndex(disposed);
  if (a === null || b === null || b < a) return 0;
  let days = b - a + 1;
  if (rates.cgt.excludeAcquisitionDay) days -= 1;
  if (rates.cgt.excludeEventDay) days -= 1;
  return Math.max(0, days);
}

export function meetsTwelveMonthTest(acquired, disposed, rates) {
  return discountHoldingDays(acquired, disposed, rates) >= rates.cgt.minimumOwnershipDays;
}

// The registry only covers FY2026-27 onward. A sale date outside that window is
// a user input, not a bug, so fall back to today's rates and say so rather than
// throwing out of a render.
export function resolveCgtRates(date) {
  try {
    return { rates: ratesFor(date), resolvedFor: toISODate(date), fellBack: false };
  } catch {
    const today = new Date();
    return { rates: ratesFor(today), resolvedFor: toISODate(today), fellBack: true };
  }
}

// ─── Main residence ──────────────────────────────────────────────────────────

function normalisePeriods(periods, startDay, endDay) {
  const clean = [];
  for (const p of periods ?? []) {
    const from = dayIndex(p?.from);
    const to = dayIndex(p?.to);
    if (from === null) continue;
    // An open-ended "still living there" period runs to disposal.
    const end = to === null ? endDay : to;
    const lo = Math.max(from, startDay);
    const hi = Math.min(end, endDay);
    if (hi < lo) continue;
    clean.push({ from: lo, to: hi });
  }
  clean.sort((x, y) => x.from - y.from);

  // Merge overlaps and abutting periods so the gaps between them are real
  // absences rather than artefacts of how the user split their entries.
  const merged = [];
  for (const p of clean) {
    const last = merged[merged.length - 1];
    if (last && p.from <= last.to + 1) last.to = Math.max(last.to, p.to);
    else merged.push({ ...p });
  }
  return merged;
}

/**
 * Split the ownership period into exempt and assessable days.
 *
 * `status`:
 *   'never'   — investment throughout, no exemption
 *   'always'  — main residence for the whole ownership period, full exemption
 *   'partial' — `residencePeriods` are the spans actually lived in; the gaps
 *               after each of them are absences covered by s118-145
 *
 * The absence limit is applied PER ABSENCE, reset by each return to occupancy.
 * Six years where the property was income-producing during that absence;
 * indefinite where it was not.
 */
export function mainResidenceApportionment({
  acquired,
  disposed,
  status = 'never',
  residencePeriods = [],
  incomeProducingDuringAbsence = true,
  eligible = true,
  rates,
}) {
  const startDay = dayIndex(acquired);
  const endDay = dayIndex(disposed);
  const ownershipDays = ownershipDaysBetween(acquired, disposed);

  const empty = {
    ownershipDays,
    mainResidenceDays: 0,
    nonMainResidenceDays: ownershipDays,
    exemptFraction: 0,
    absences: [],
    limitYears: null,
    limitExceeded: false,
  };

  if (!eligible || !rates.cgt.mainResidence.available) return empty;
  if (ownershipDays === 0) return { ...empty, nonMainResidenceDays: 0 };
  if (status === 'never') return empty;

  if (status === 'always') {
    return {
      ownershipDays,
      mainResidenceDays: ownershipDays,
      nonMainResidenceDays: 0,
      exemptFraction: 1,
      absences: [],
      limitYears: null,
      limitExceeded: false,
    };
  }

  const mr = rates.cgt.mainResidence;
  const limitYears = incomeProducingDuringAbsence
    ? mr.absenceYearsIfIncomeProducing
    : mr.absenceYearsIfNotIncomeProducing; // null = indefinite

  const lived = normalisePeriods(residencePeriods, startDay, endDay);
  if (lived.length === 0) return empty;

  let exemptDays = 0;
  const absences = [];

  for (const p of lived) exemptDays += p.to - p.from + 1;

  // Every gap that FOLLOWS a period of occupancy is an absence with its own
  // fresh limit. A gap before the first occupancy is not — you cannot be absent
  // from somewhere you have never lived.
  for (let i = 0; i < lived.length; i++) {
    const gapFrom = lived[i].to + 1;
    const gapTo = i + 1 < lived.length ? lived[i + 1].from - 1 : endDay;
    if (gapTo < gapFrom) continue;

    const gapDays = gapTo - gapFrom + 1;
    let covered = gapDays;
    if (limitYears !== null && limitYears !== undefined) {
      const limitEnd = dayIndex(addYears(fromDayIndex(gapFrom), limitYears)) - 1;
      covered = Math.max(0, Math.min(gapTo, limitEnd) - gapFrom + 1);
    }
    exemptDays += covered;
    absences.push({
      from: fromDayIndex(gapFrom),
      to: fromDayIndex(gapTo),
      days: gapDays,
      exemptDays: covered,
      assessableDays: gapDays - covered,
      withinLimit: covered === gapDays,
    });
  }

  const leadIn = lived[0].from - startDay; // owned but not yet lived in
  const mainResidenceDays = Math.min(ownershipDays, exemptDays);

  return {
    ownershipDays,
    mainResidenceDays,
    nonMainResidenceDays: ownershipDays - mainResidenceDays,
    exemptFraction: mainResidenceDays / ownershipDays,
    absences,
    leadInDays: leadIn,
    limitYears: limitYears ?? null,
    limitExceeded: absences.some((a) => !a.withinLimit),
  };
}

// ─── Discount ────────────────────────────────────────────────────────────────

export function discountFor({ entity, residency, heldLongEnough, rates }) {
  const c = rates.cgt;

  if (entity === 'company') {
    return { rate: 0, eligible: false, reason: 'Companies are not eligible for the CGT discount.' };
  }
  if (!heldLongEnough) {
    return {
      rate: 0,
      eligible: false,
      reason: `Held for fewer than ${c.minimumOwnershipDays} days, counting neither the acquisition day nor the CGT event day.`,
    };
  }
  if (entity === 'super') {
    return { rate: c.superFundDiscount, eligible: true, reason: null };
  }
  if (residency !== 'resident') {
    return {
      rate: 0,
      eligible: false,
      reason: 'Foreign and working holiday residents do not get the CGT discount on assets acquired after 8 May 2012.',
    };
  }
  if (c.individualDiscount === null || c.individualDiscount === undefined) {
    // Post-reform: the discount is gone and cost base indexation replaces it.
    // The indexation mechanics are not final, so this is modelled at 0% and
    // flagged as an upper bound rather than guessed at.
    return {
      rate: 0,
      eligible: false,
      reason: 'The 50% discount does not apply to CGT events on or after 1 July 2027 — cost base indexation replaces it.',
    };
  }
  return { rate: c.individualDiscount, eligible: true, reason: null };
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcCGT(inputs = {}) {
  const {
    assetType = 'shares',
    entity = 'individual',

    purchasePrice = 0,
    purchaseCosts = 0,
    improvements = 0,
    salePrice = 0,
    saleCosts = 0,

    // CONTRACT dates, both ends. Not settlement.
    acquisitionDate = '',
    disposalDate = '',

    grossIncome = 0,
    capitalLosses = 0,
    residency = 'resident',
    helpBalance = 0,
    hasPrivateCover = false,
    workExpenses = 0,
    family = false,
    dependentChildren = 0,

    mainResidenceStatus = 'never',
    residencePeriods = [],
    incomeProducingDuringAbsence = true,
  } = inputs;

  const { rates, resolvedFor, fellBack } =
    inputs.rates
      ? { rates: inputs.rates, resolvedFor: inputs.rates.__date, fellBack: false }
      : resolveCgtRates(disposalDate || new Date());

  const c = rates.cgt;
  const warnings = [];

  if (fellBack) {
    warnings.push({
      level: 'info',
      title: 'Sale date outside the verified rate window',
      body: `Rates are only verified from 1 July 2026. This estimate uses the rates in force at ${resolvedFor}.`,
    });
  }

  // ── Cost base and gross gain ──────────────────────────────────────────────
  const costBase = purchasePrice + purchaseCosts + improvements;
  const netSaleProceeds = salePrice - saleCosts;
  const grossGain = netSaleProceeds - costBase;

  // ── Holding period ────────────────────────────────────────────────────────
  const ownershipDays = ownershipDaysBetween(acquisitionDate, disposalDate);
  const holdingDays = discountHoldingDays(acquisitionDate, disposalDate, rates);
  const heldLongEnough = holdingDays >= c.minimumOwnershipDays;
  const datesEntered = dayIndex(acquisitionDate) !== null && dayIndex(disposalDate) !== null;

  if (datesEntered && dayIndex(disposalDate) < dayIndex(acquisitionDate)) {
    warnings.push({
      level: 'warn',
      title: 'Sale date is before the purchase date',
      body: 'Check the two contract dates — the holding period is being treated as zero.',
    });
  }

  // ── Main residence exemption ──────────────────────────────────────────────
  const foreignResidentDenied =
    residency !== 'resident' &&
    mainResidenceStatus !== 'never' &&
    !c.mainResidence.foreignResidentEligible;

  const mainResidence = mainResidenceApportionment({
    acquired: acquisitionDate,
    disposed: disposalDate,
    status: mainResidenceStatus,
    residencePeriods,
    incomeProducingDuringAbsence,
    eligible: !foreignResidentDenied,
    rates,
  });

  if (foreignResidentDenied) {
    warnings.push({
      level: 'warn',
      title: 'No main residence exemption for foreign residents',
      body: 'Residency is tested when the sale contract is signed. A foreign resident at that moment loses the exemption entirely — it is a cliff, not an apportionment, no matter how long the property was a home.',
    });
  }
  if (mainResidence.limitExceeded) {
    warnings.push({
      level: 'info',
      title: 'An absence ran past the six-year limit',
      body: 'The limit applies separately to each absence and resets each time you move back in. Days beyond six years in any single income-producing absence are assessable.',
    });
  }

  // Apportion in both directions — a partial exemption reduces a capital loss
  // in the same proportion that it reduces a gain.
  const exemptAmount = grossGain * mainResidence.exemptFraction;
  const gainAfterExemption =
    ownershipDays === 0 ? grossGain : grossGain - exemptAmount;

  // ── Losses BEFORE the discount ────────────────────────────────────────────
  const lossesAvailable = Math.max(0, capitalLosses);
  const lossesApplied = Math.min(lossesAvailable, Math.max(0, gainAfterExemption));
  const gainAfterLosses = gainAfterExemption - lossesApplied;
  const netCapitalLossCarriedForward = Math.max(0, lossesAvailable - Math.max(0, gainAfterExemption)) +
    Math.max(0, -gainAfterExemption);
  const isCapitalLoss = gainAfterExemption < 0;

  // ── Discount ──────────────────────────────────────────────────────────────
  const discount = discountFor({ entity, residency, heldLongEnough, rates });
  const discountRate = discount.rate;
  const discountAmount = Math.max(0, gainAfterLosses) * discountRate;
  const assessableGain = Math.max(0, gainAfterLosses) - discountAmount;

  // ── Tax on the gain ───────────────────────────────────────────────────────
  // Differencing across the WHOLE package, not income tax alone. The gain sits
  // in taxable income, so it drags LITO, the Medicare levy, MLS and the HELP
  // repayment with it.
  //
  const SUPER_FUND_TAX_RATE = rates.superannuation.fundEarningsTaxRate;
  const COMPANY_TAX_RATE = rates.incomeTax.company.standard;

  let incomeTaxOnGain = 0;
  let medicareLevyOnGain = 0;
  let mlsOnGain = 0;
  let helpRepaymentOnGain = 0;
  let marginalRate = 0;
  let baseTax = null;
  let withGainTax = null;
  let grossIncomeTaxOnGain = 0;

  if (entity === 'super') {
    incomeTaxOnGain = assessableGain * SUPER_FUND_TAX_RATE;
    marginalRate = SUPER_FUND_TAX_RATE;
    warnings.push({
      level: 'info',
      title: 'Super fund rates are indicative',
      body: 'A complying fund pays 15% on the discounted gain, and the one-third discount needs the same 12-month holding period. Segregated pension assets can be exempt entirely — not modelled.',
    });
  } else if (entity === 'company') {
    incomeTaxOnGain = assessableGain * COMPANY_TAX_RATE;
    marginalRate = COMPANY_TAX_RATE;
    warnings.push({
      level: 'info',
      title: 'Companies get no CGT discount',
      body: 'The whole gain is assessable and taxed at the company rate — 30% here, or 25% for a base rate entity. Small business CGT concessions may still apply.',
    });
  } else {
    // The $1,000 standard work deduction is a floor that only engages when
    // there is income. Resolving it once and passing the same figure to both
    // calls keeps the deduction identical on each side, so the difference is
    // the tax on the gain and nothing else.
    const stdAmount = rates.incomeTax.standardWorkDeduction?.amount ?? 0;
    const hasAnyIncome = grossIncome > 0 || assessableGain > 0;
    const effectiveWorkExpenses = Math.max(workExpenses, hasAnyIncome ? stdAmount : 0);

    const profile = {
      residency,
      hasPrivateCover,
      helpBalance,
      workExpenses: effectiveWorkExpenses,
      family,
      dependentChildren,
      sgRate: 0, // a capital gain does not attract super guarantee
      rates,
    };
    baseTax = calcPayTax({ ...profile, grossIncome });
    withGainTax = calcPayTax({ ...profile, grossIncome: grossIncome + assessableGain });

    incomeTaxOnGain = withGainTax.incomeTax - baseTax.incomeTax;
    medicareLevyOnGain = withGainTax.medicareLevy - baseTax.medicareLevy;
    mlsOnGain = withGainTax.mls - baseTax.mls;
    helpRepaymentOnGain = withGainTax.helpRepayment - baseTax.helpRepayment;
    marginalRate = getMarginalRate(withGainTax.taxableIncome, residency, rates);

    // Bracket-crossing gross income tax, before offsets — kept for the
    // methodology note. Never a flat marginal rate.
    grossIncomeTaxOnGain = taxOnAdditionalIncome(baseTax.taxableIncome, assessableGain, {
      residency,
      rates,
    });
  }

  const cgtPayable = Math.max(0, incomeTaxOnGain + medicareLevyOnGain + mlsOnGain);
  const totalCostOfGain = cgtPayable + Math.max(0, helpRepaymentOnGain);

  const effectiveCGTRate = grossGain > 0 ? cgtPayable / grossGain : 0;
  const effectiveRateOnAssessable = assessableGain > 0 ? cgtPayable / assessableGain : 0;
  const afterTaxProceeds = netSaleProceeds - cgtPayable;

  // ── Post-2027 reform ──────────────────────────────────────────────────────
  const reformApplies = Boolean(c.costBaseIndexation);
  if (reformApplies && entity !== 'super' && entity !== 'company') {
    warnings.push({
      level: 'warn',
      title: 'Sale date falls under the post-1 July 2027 CGT regime',
      body:
        'For CGT events on or after 1 July 2027 the 50% discount is replaced by cost base indexation plus a ' +
        `${Math.round((c.minimumTaxRate ?? 0.3) * 100)}% minimum tax rate on real gains. Indexation is not modelled here, so ` +
        'this figure is an upper bound. Bringing the contract date forward to on or before 30 June 2027 keeps the discount.',
    });
  } else if (!reformApplies && entity === 'individual') {
    // Only worth saying while the decision is live — a sale being modelled
    // within two years of the change can still be moved either side of it.
    const cutoff = dayIndex('2027-07-01');
    const sold = dayIndex(disposalDate) ?? dayIndex(resolvedFor);
    if (sold !== null && cutoff - sold <= 730) {
      warnings.push({
        level: 'info',
        title: 'The 50% discount ends on 1 July 2027',
        body: 'It applies to CGT events up to and including 30 June 2027. If you are modelling a hold-and-sell, the sale contract date — not settlement — decides which regime you land in.',
      });
    }
  }

  // ── Foreign resident capital gains withholding ────────────────────────────
  const frw = c.foreignResidentWithholding;
  const withholding = {
    rate: frw.rate,
    priceThreshold: frw.priceThreshold,
    amount: salePrice > 0 && (frw.priceThreshold === null || salePrice >= frw.priceThreshold)
      ? salePrice * frw.rate
      : 0,
    note: frw.note ?? '',
  };
  if (assetType === 'property' && withholding.amount > 0) {
    warnings.push({
      level: 'info',
      title: `${Math.round(frw.rate * 100)}% withholding at settlement unless you have a clearance certificate`,
      body:
        'Since 1 January 2025 there is no price threshold, so this catches Australian resident vendors too. ' +
        'Without an ATO clearance certificate the purchaser must withhold ' +
        `$${Math.round(withholding.amount).toLocaleString('en-AU')} and pay it to the ATO. It is credited against your tax, not an extra cost.`,
    });
  }

  return {
    // context
    date: resolvedFor,
    financialYear: rates.__fy,
    rates,
    entity,
    assetType,
    eventDateBasis: c.eventDateBasis, // 'contract'
    regime: reformApplies ? 'indexation' : 'discount',
    reformApplies,
    minimumTaxRate: c.minimumTaxRate ?? null,
    warnings,

    // cost base
    costBase,
    netSaleProceeds,
    grossGain,

    // holding period
    ownershipDays,
    holdingDays,
    heldLongEnough,
    datesEntered,
    minimumOwnershipDays: c.minimumOwnershipDays,

    // main residence
    mainResidence,
    mainResidenceStatus,
    mainResidenceExemptAmount: exemptAmount,
    foreignResidentDenied,
    gainAfterExemption,

    // losses and discount
    capitalLosses: lossesAvailable,
    lossesApplied,
    gainAfterLosses,
    netCapitalLossCarriedForward,
    isCapitalLoss,
    discountRate,
    discountAmount,
    cgtDiscountEligible: discount.eligible,
    discountIneligibleReason: discount.reason,
    assessableGain,

    // tax
    incomeTaxOnGain,
    grossIncomeTaxOnGain,
    medicareLevyOnGain,
    mlsOnGain,
    helpRepaymentOnGain,
    cgtPayable,
    totalCostOfGain,
    afterTaxProceeds,
    effectiveCGTRate,
    effectiveRateOnAssessable,
    marginalRate,
    baseTax,
    withGainTax,

    withholding,
  };
}

export default calcCGT;

// ─── Explanation ─────────────────────────────────────────────────────────────

import { workings, section, step, subtotal, total, note } from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const pct = (r) => (r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 1) + '%';
const days = (n) => `${Math.round(n).toLocaleString('en-AU')} days`;

// How close to the 12-month line counts as "worth telling them about".
const BOUNDARY_WINDOW_DAYS = 45;

/**
 * Build a step-by-step account of a calcCGT result.
 *
 * Separate from calcCGT so the hot path stays free of presentation concerns.
 * Every figure here comes from the result object or the inputs — nothing is
 * recomputed and nothing is invented.
 */
export function explainCGT(result, inputs = {}) {
  const r = result;
  const {
    purchasePrice = 0,
    purchaseCosts = 0,
    improvements = 0,
    salePrice = 0,
    saleCosts = 0,
  } = inputs;

  const mr = r.mainResidence;
  const exemptApplies = r.mainResidenceStatus !== 'never' && mr.ownershipDays > 0;
  const individual = r.entity === 'individual';

  // ── Cost base ─────────────────────────────────────────────────────────────
  const costBase = section('Cost base', [
    step('Purchase price', purchasePrice),
    purchaseCosts > 0 && step('plus purchase costs', purchaseCosts, {
      note: 'Stamp duty, legal fees, agent and transfer costs on the way in',
    }),
    improvements > 0 && step('plus capital improvements', improvements, {
      note: 'Structural work that added value — not repairs or maintenance, which are deductible instead',
    }),
    total('Cost base', r.costBase),
  ]);

  // ── Proceeds and gross gain ───────────────────────────────────────────────
  const proceeds = section(r.grossGain < 0 ? 'Proceeds and gross loss' : 'Proceeds and gross gain', [
    step('Sale price', salePrice),
    saleCosts > 0 && step('less selling costs', -saleCosts, {
      note: 'Agent commission, marketing and legal costs on the way out',
    }),
    subtotal('Net sale proceeds', r.netSaleProceeds),
    step('less cost base', -r.costBase),
    total(r.grossGain < 0 ? 'Gross capital loss' : 'Gross capital gain', r.grossGain),
  ]);

  // ── Holding period ────────────────────────────────────────────────────────
  const shortBy = r.minimumOwnershipDays - r.holdingDays;
  const clearedBy = r.holdingDays - r.minimumOwnershipDays;
  const holding = r.datesEntered ? section('Holding period', [
    step('Days owned', days(r.ownershipDays), {
      note: 'Counted from the acquisition contract date to the CGT event date, both included',
    }),
    step('Days counted for the discount test', days(r.holdingDays), {
      note: 'The test excludes both the acquisition day and the CGT event day',
    }),
    step('Days required', days(r.minimumOwnershipDays), { muted: true }),
    step(
      r.heldLongEnough ? 'Twelve-month test' : 'Twelve-month test',
      r.heldLongEnough ? 'Passed' : 'Not met'
    ),
    !r.heldLongEnough && shortBy > 0 && shortBy <= BOUNDARY_WINDOW_DAYS && note(
      `You are ${shortBy} ${shortBy === 1 ? 'day' : 'days'} short. Because neither the acquisition day nor the ` +
      'event day counts, an asset held for exactly 364 counted days gets no discount at all. Signing the sale ' +
      `contract ${shortBy} ${shortBy === 1 ? 'day' : 'days'} later clears the test.`
    ),
    r.heldLongEnough && clearedBy >= 0 && clearedBy <= BOUNDARY_WINDOW_DAYS && note(
      `You cleared the test by ${clearedBy} ${clearedBy === 1 ? 'day' : 'days'}. It is the contract date that ` +
      'counts on both ends, not settlement — a contract signed earlier than you think can lose the discount.'
    ),
  ]) : null;

  // ── Main residence ────────────────────────────────────────────────────────
  const mainResidence = exemptApplies ? section('Main residence exemption', [
    step('Days as your main residence', days(mr.mainResidenceDays), {
      note: mr.absences.length
        ? 'Includes absences covered by the six-year rule, which resets each time you move back in'
        : null,
    }),
    step('Days assessable', days(mr.nonMainResidenceDays)),
    subtotal('Exempt fraction', `${pct(mr.exemptFraction)} of ${days(mr.ownershipDays)}`),
    step('Gross gain', r.grossGain),
    step('less exempt portion', -r.mainResidenceExemptAmount, {
      note: `${pct(mr.exemptFraction)} of the gain`,
    }),
    total('Gain after the exemption', r.gainAfterExemption),
    r.foreignResidentDenied && note(
      'Residency is tested at the sale contract date. A foreign resident at that moment loses the exemption ' +
      'entirely — it is a cliff, not an apportionment.'
    ),
    mr.limitExceeded && note(
      'One absence ran past the six-year limit. The limit is per absence and resets on each return to ' +
      'occupancy, so it is the length of a single absence that matters, not the total time away.'
    ),
  ]) : null;

  // ── Losses, then the discount, in that order ──────────────────────────────
  const discountLabel = r.discountRate > 0 ? `less the ${pct(r.discountRate)} CGT discount` : 'CGT discount';
  const lossesAndDiscount = section('Losses, then the discount', [
    step(exemptApplies ? 'Gain after the exemption' : 'Gross capital gain', r.gainAfterExemption),
    step('less capital losses applied', -r.lossesApplied, {
      note: r.capitalLosses > 0
        ? `${money(r.capitalLosses)} available`
        : 'No capital losses entered',
    }),
    subtotal('Gain after losses', r.gainAfterLosses),
    r.gainAfterLosses > 0 && (r.discountRate > 0
      ? step(discountLabel, -r.discountAmount)
      : step(discountLabel, 0, { muted: true })),
    r.gainAfterLosses <= 0 && note(
      'There is no gain left to discount, so nothing is assessable this year.'
    ),
    total('Assessable capital gain', r.assessableGain),
    note(
      'Capital losses come off BEFORE the discount, never after. Discounting first and then deducting the ' +
      'loss understates the gain — on a $100,000 gain with a $40,000 loss the error is $20,000.'
    ),
    !r.cgtDiscountEligible && r.discountIneligibleReason && note(r.discountIneligibleReason),
    r.netCapitalLossCarriedForward > 0 && step(
      'Net capital loss carried forward', r.netCapitalLossCarriedForward,
      { note: 'Carried to future years — a capital loss cannot be offset against ordinary income' }
    ),
  ]);

  // ── Tax on the gain ───────────────────────────────────────────────────────
  const taxSection = individual && r.baseTax && r.withGainTax
    ? section('Tax on the gain', [
        step('Taxable income without the gain', r.baseTax.taxableIncome, { muted: true }),
        step('Taxable income with the gain', r.withGainTax.taxableIncome, { muted: true }),
        step('Extra income tax', r.incomeTaxOnGain, {
          note: `Income tax rises from ${money(r.baseTax.incomeTax)} to ${money(r.withGainTax.incomeTax)}`,
        }),
        step('Extra Medicare levy', r.medicareLevyOnGain, {
          note: 'The gain is ordinary taxable income, so the levy rides along with it',
        }),
        r.mlsOnGain !== 0 && step('Extra Medicare levy surcharge', r.mlsOnGain),
        total('CGT payable', r.cgtPayable),
        r.helpRepaymentOnGain > 0 && step('Extra study loan repayment', r.helpRepaymentOnGain, {
          note: 'Not CGT, but it falls due in the same year because the gain lifts your repayment income',
        }),
        note(
          'Worked by differencing the whole tax position with and without the gain, not by applying a single ' +
          'marginal rate. A gain that straddles a bracket is taxed partly at each.'
        ),
      ])
    : section('Tax on the gain', [
        step('Assessable capital gain', r.assessableGain),
        step(`Tax at ${pct(r.marginalRate)}`, r.incomeTaxOnGain, {
          note: r.entity === 'super'
            ? 'A complying fund pays a flat rate on the discounted gain'
            : 'Companies get no discount and pay the company rate on the whole gain',
        }),
        total('CGT payable', r.cgtPayable),
      ]);

  // ── Outcome ───────────────────────────────────────────────────────────────
  const outcome = section('What you keep', [
    step('Net sale proceeds', r.netSaleProceeds),
    step('less CGT payable', -r.cgtPayable),
    total('After-tax proceeds', r.afterTaxProceeds),
    r.grossGain > 0 && step('Effective rate on the gross gain', pct(r.effectiveCGTRate), { muted: true }),
    r.assessableGain > 0 && step('Effective rate on the assessable gain', pct(r.effectiveRateOnAssessable), { muted: true }),
  ]);

  return workings(
    [costBase, proceeds, holding, mainResidence, lossesAndDiscount, taxSection, outcome],
    {
      source: 'Australian Taxation Office rates, resolved against the sale contract date',
      asAt: r.financialYear ? `FY${r.financialYear}` : null,
    }
  );
}
