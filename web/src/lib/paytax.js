// Australian income tax engine.
//
// All rates resolve from lib/rates against a date, so this module works for any
// covered financial year rather than hardcoding one. Pass `date` to model a
// different year.

import { ratesFor } from './rates/index.js';

// ─── Primitives ──────────────────────────────────────────────────────────────

function applyBrackets(income, brackets) {
  if (income <= 0) return 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].from) {
      return brackets[i].base + brackets[i].rate * (income - brackets[i].from);
    }
  }
  return 0;
}

function scaleFor(residency, rates) {
  if (residency === 'foreign') return rates.incomeTax.foreign;
  if (residency === 'holiday') return rates.incomeTax.holiday;
  return rates.incomeTax.resident;
}

// Gross income tax before offsets.
export function incomeTaxOn(taxable, residency, rates) {
  return applyBrackets(taxable, scaleFor(residency, rates));
}

// Low Income Tax Offset. Non-refundable, residents only, and PAYG withholding
// ignores it — never apply this to a per-pay figure.
export function litoFor(taxable, rates) {
  const l = rates.incomeTax.lito;
  if (taxable <= l.taper1From) return l.max;
  if (taxable <= l.taper2From) {
    return Math.max(0, l.max - (taxable - l.taper1From) * l.taper1Rate);
  }
  if (taxable <= l.cutOut) {
    return Math.max(0, l.taper2Base - (taxable - l.taper2From) * l.taper2Rate);
  }
  return 0;
}

// `rates` defaults so the libs still on the old two-argument signature keep
// working until they are migrated.
export function getMarginalRate(taxable, residency, rates = ratesFor(new Date())) {
  const scale = scaleFor(residency, rates);
  let rate = 0;
  for (const b of scale) if (taxable > b.from) rate = b.rate;
  return rate;
}

// Tax on a lump sum sitting on top of base income. Uses differencing so a
// payment straddling a bracket is taxed correctly — applying a single marginal
// rate to the whole amount overstates or understates it.
export function taxOnAdditionalIncome(baseIncome, extra, { residency = 'resident', rates }) {
  if (extra <= 0) return 0;
  return incomeTaxOn(baseIncome + extra, residency, rates) - incomeTaxOn(baseIncome, residency, rates);
}

// ─── Income bases ────────────────────────────────────────────────────────────
// Taxable income is NOT the base for HELP, MLS or Division 293. Each adds back
// amounts that reduce taxable income, which is why salary sacrifice does not
// reduce a HELP repayment.

export function repaymentIncomeFrom({
  taxableIncome = 0,
  reportableFringeBenefits = 0,
  totalNetInvestmentLoss = 0,
  reportableSuperContributions = 0,
  exemptForeignEmploymentIncome = 0,
  fhssReleasedAmount = 0, // excluded — subtracted back out if it sits in taxable income
} = {}) {
  return Math.max(0,
    taxableIncome
    + reportableFringeBenefits
    + totalNetInvestmentLoss
    + reportableSuperContributions
    + exemptForeignEmploymentIncome
    - fhssReleasedAmount
  );
}

export function mlsIncomeFrom({
  taxableIncome = 0,
  reportableFringeBenefits = 0,
  totalNetInvestmentLosses = 0,
  reportableSuperContributions = 0, // includes deductible PERSONAL contributions
  spouseTrustIncomeS98 = 0,
  exemptForeignEmploymentIncome = 0,
  fhssReleasedAmount = 0,
} = {}) {
  return Math.max(0,
    taxableIncome
    + reportableFringeBenefits
    + totalNetInvestmentLosses
    + reportableSuperContributions
    + spouseTrustIncomeS98
    + exemptForeignEmploymentIncome
    - fhssReleasedAmount
  );
}

// ─── Levies ──────────────────────────────────────────────────────────────────

export function medicareLevyOn(taxable, residency, rates, { senior = false, family = false, dependentChildren = 0 } = {}) {
  if (residency !== 'resident') return 0;
  const m = rates.medicare;
  const t = m.lowIncomeThresholds;

  let band;
  if (family) band = senior ? t.familySenior : t.family;
  else band = senior ? t.singleSenior : t.single;

  let lower = band.lower;
  let upper = band.upper;
  if (family && dependentChildren > 0) {
    lower += t.perChildLower * dependentChildren;
    upper += t.perChildUpper * dependentChildren;
  }

  if (taxable <= lower) return 0;
  if (taxable <= upper) return Math.min(taxable * m.levyRate, (taxable - lower) * m.phaseInRate);
  return taxable * m.levyRate;
}

// MLS is a CLIFF: once a tier is entered the rate applies to the WHOLE income
// for MLS purposes, not to the excess over the threshold.
export function mlsOn(mlsIncome, hasPrivateCover, rates, { family = false, dependentChildren = 0 } = {}) {
  if (hasPrivateCover) return 0;
  const s = rates.medicare.surcharge;
  const tiers = family ? s.family : s.single;
  // Family thresholds lift for each dependent child AFTER the first.
  const lift = family && dependentChildren > 1
    ? s.perAdditionalChild * (dependentChildren - 1)
    : 0;

  for (const tier of tiers) {
    const to = tier.to === null ? Infinity : tier.to + lift;
    if (mlsIncome <= to) return mlsIncome * tier.rate;
  }
  return mlsIncome * tiers[tiers.length - 1].rate;
}

// ─── HELP ────────────────────────────────────────────────────────────────────
// Two marginal bands, then a FLAT 10% of TOTAL repayment income above the top
// threshold. A purely marginal implementation understates high earners by
// thousands, and the error grows with income.

export function helpRepaymentOn(repaymentIncome, balance, rates) {
  if (!balance || balance <= 0) return 0;
  const h = rates.help;
  if (repaymentIncome <= h.nilThreshold) return 0;

  let repayment;
  if (repaymentIncome >= h.flatTierFrom) {
    repayment = repaymentIncome * h.flatTierRate;
  } else {
    const band = h.marginalBands.find(
      (b) => repaymentIncome >= b.from && repaymentIncome <= b.to
    );
    if (!band) return 0;
    repayment = band.base + (repaymentIncome - (band.from - 1)) * band.rate;
  }
  return Math.min(balance, repayment);
}

// ─── Division 293 ────────────────────────────────────────────────────────────

export function division293On(surchargeIncome, concessionalContributions, rates) {
  const d = rates.superannuation.division293;
  const total = surchargeIncome + concessionalContributions;
  if (total <= d.threshold) return 0;
  const excess = total - d.threshold;
  return Math.min(excess, concessionalContributions) * d.rate;
}

// ─── Frequency helpers ───────────────────────────────────────────────────────

export function byFreq(annual, freq) {
  if (freq === 'monthly')     return annual / 12;
  if (freq === 'fortnightly') return annual / 26;
  if (freq === 'weekly')      return annual / 52;
  return annual;
}

export function toAnnual(amount, freq) {
  if (freq === 'monthly')     return amount * 12;
  if (freq === 'fortnightly') return amount * 26;
  if (freq === 'weekly')      return amount * 52;
  return amount;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcPayTax(inputs = {}) {
  const {
    grossIncome = 0,
    targetNet = null,           // back-solve gross from a net figure
    date = new Date(),
    residency = 'resident',
    hasPrivateCover = false,
    hecsBalance = 0,
    helpBalance = null,         // preferred name; hecsBalance kept for callers
    sgRate = 12,
    salarySacrifice = 0,
    workExpenses = 0,
    otherDeductions = 0,
    reportableFringeBenefits = 0,
    totalNetInvestmentLoss = 0,
    senior = false,
    family = false,
    dependentChildren = 0,
  } = inputs;

  const rates = inputs.rates ?? ratesFor(date);

  if (targetNet !== null) {
    const solved = grossFromNet(targetNet, { ...inputs, targetNet: null, rates });
    return calcPayTax({ ...inputs, targetNet: null, grossIncome: solved, rates });
  }

  const balance = helpBalance ?? hecsBalance;

  // The standard work deduction is a FLOOR, not an addition — the taxpayer
  // claims it INSTEAD of substantiated expenses, whichever is higher.
  const std = rates.incomeTax.standardWorkDeduction;
  const workDeduction = std && grossIncome > 0
    ? Math.max(std.amount, workExpenses)
    : workExpenses;
  const deductionClaimed = workDeduction + otherDeductions;
  const usedStandardDeduction = Boolean(std) && workDeduction === std.amount && workExpenses < std.amount;

  const taxableIncome = Math.max(0, grossIncome - salarySacrifice - deductionClaimed);

  const rawTax = incomeTaxOn(taxableIncome, residency, rates);
  const lito = residency === 'resident' ? litoFor(taxableIncome, rates) : 0;
  const incomeTax = Math.max(0, rawTax - lito);

  const medicareLevy = medicareLevyOn(taxableIncome, residency, rates, { senior, family, dependentChildren });

  // Salary sacrifice and reportable fringe benefits are added BACK for both of
  // these — sacrificing does not reduce HELP or MLS exposure.
  const mlsIncome = mlsIncomeFrom({
    taxableIncome,
    reportableFringeBenefits,
    totalNetInvestmentLosses: totalNetInvestmentLoss,
    reportableSuperContributions: salarySacrifice,
  });
  const mls = residency === 'resident'
    ? mlsOn(mlsIncome, hasPrivateCover, rates, { family, dependentChildren })
    : 0;

  const repaymentIncome = repaymentIncomeFrom({
    taxableIncome,
    reportableFringeBenefits,
    totalNetInvestmentLoss,
    reportableSuperContributions: salarySacrifice,
  });
  const helpRepayment = helpRepaymentOn(repaymentIncome, balance, rates);

  const superAmount = grossIncome * (sgRate / 100);
  const concessionalContributions = superAmount + salarySacrifice;
  const division293 = division293On(taxableIncome, concessionalContributions, rates);

  const totalTax = incomeTax + medicareLevy + mls + helpRepayment;
  const takeHome = Math.max(0, taxableIncome - totalTax);

  const concessionalCap = rates.superannuation.concessionalCap;

  return {
    grossIncome,
    taxableIncome,
    salarySacrifice,
    deductionClaimed,
    usedStandardDeduction,
    incomeTax,
    lito,
    medicareLevy,
    mls,
    mlsIncome,
    repaymentIncome,
    helpRepayment,
    hecsRepayment: helpRepayment, // legacy alias
    division293,
    totalTax,
    takeHome,
    effectiveTaxRate: grossIncome > 0 ? totalTax / grossIncome : 0,
    marginalRate: getMarginalRate(taxableIncome, residency, rates),
    superAmount,
    concessionalContributions,
    concessionalCap,
    concessionalCapExceeded: concessionalContributions > concessionalCap,
    rates,
  };
}

// Binary search for the gross that produces a target net. takeHome is monotonic
// in gross, so this converges.
export function grossFromNet(targetAnnualNet, inputs = {}) {
  if (targetAnnualNet <= 0) return 0;
  let lo = targetAnnualNet;
  let hi = Math.max(targetAnnualNet * 4, 600000);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const net = calcPayTax({ ...inputs, targetNet: null, grossIncome: mid }).takeHome;
    if (net < targetAnnualNet) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
