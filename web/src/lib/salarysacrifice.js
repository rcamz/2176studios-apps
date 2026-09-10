// Salary sacrifice to superannuation.
//
// The saving is NOT "marginal rate minus 15%" for everyone. Once income plus
// concessional contributions passes $250,000, Division 293 adds another 15% to
// the contribution, so the saving is marginal − 30%. That is the cohort most
// likely to be using a tool like this, and getting it wrong roughly doubles the
// claimed benefit.
//
// Two other things this models that a naive version does not:
//  - CARRY-FORWARD. Unused concessional cap from the previous five years can be
//    used, but only if total super balance was under $500,000 at 30 June of the
//    prior year. Unused amounts expire after five years.
//  - THE ALTERNATIVE. "Without sacrifice" is not just a smaller super balance —
//    the money you did not sacrifice is take-home pay that could have been
//    invested outside super. Comparing a super balance against nothing at all
//    flatters sacrificing.

import { calcPayTax, taxOnAdditionalIncome, division293On } from './paytax.js';
import { ratesFor } from './rates/index.js';

// Compulsory SG stops at the maximum contribution base — annual from
// 1 July 2026, not quarterly. Without this a $300k salary is credited with
// $36,000 of SG instead of $32,500, and the concessional cap warning fires
// against a contribution that was never required.
export function sgContributionFor(grossSalary, sgRate, rates) {
  const base = rates.superannuation.maxContributionBase;
  const capped = base?.period === 'annual' ? Math.min(grossSalary, base.amount) : grossSalary;
  return Math.max(0, capped) * (sgRate / 100);
}

// ─── Carry-forward ───────────────────────────────────────────────────────────

// Unused cap from the lookback window, gated on the total super balance test.
// `unusedByYear` runs most-recent-first; anything past the lookback window has
// expired and is dropped.
export function carryForwardAvailable({
  unusedByYear = [],
  priorUnusedCap = null,
  totalSuperBalance = 0,
  rates = ratesFor(new Date()),
} = {}) {
  const cf = rates.superannuation.carryForward;
  const cap = rates.superannuation.concessionalCap;
  const eligible = totalSuperBalance < cf.totalSuperBalanceTest;

  const withinWindow = unusedByYear.slice(0, cf.lookbackYears);
  const expired = unusedByYear.slice(cf.lookbackYears).reduce((a, b) => a + Math.max(0, b), 0);

  // A single total is what the UI can realistically ask for; it is still
  // bounded by what five years of cap could physically hold.
  const raw = unusedByYear.length
    ? withinWindow.reduce((a, b) => a + Math.max(0, b), 0)
    : Math.max(0, priorUnusedCap ?? 0);

  const maximum = cap * cf.lookbackYears;
  const available = eligible ? Math.min(raw, maximum) : 0;

  return {
    eligible,
    available,
    claimed: raw,
    expired,
    maximum,
    lookbackYears: cf.lookbackYears,
    balanceTest: cf.totalSuperBalanceTest,
    totalSuperBalance,
  };
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcSalarySacrifice(inputs = {}) {
  const {
    grossSalary = 0,
    sgRate = 12,
    sacrificeAmount = 0,
    // Other amounts counting toward the concessional cap — a second employer's
    // sacrifice, or a personal deductible contribution. These reduce taxable
    // income and attract the 15% contributions tax exactly as the main
    // sacrifice does, so they belong in the tax calculation, not just in the
    // cap warning.
    otherSacrifice = 0,
    age = 40,
    superBalance = 0,
    priorUnusedCap = 0,
    unusedByYear = [],
    useCarryForward = true,
    horizonYears = 20,
    investmentReturn = 7,
    date = new Date(),
    residency = 'resident',
  } = inputs;

  const rates = inputs.rates ?? ratesFor(date);
  const s = rates.superannuation;
  const contributionsTaxRate = s.contributionsTax;
  const totalSacrifice = Math.max(0, sacrificeAmount) + Math.max(0, otherSacrifice);

  // ── Cap and carry-forward ──
  const sgContribution = sgContributionFor(grossSalary, sgRate, rates);
  const totalConcessional = sgContribution + totalSacrifice;

  const carryForward = carryForwardAvailable({
    unusedByYear,
    priorUnusedCap,
    totalSuperBalance: superBalance,
    rates,
  });
  const carryForwardUsed = useCarryForward
    ? Math.min(carryForward.available, Math.max(0, totalConcessional - s.concessionalCap))
    : 0;
  const effectiveCap = s.concessionalCap + (useCarryForward ? carryForward.available : 0);

  const capExceeded = totalConcessional > effectiveCap;
  const excessAmount = Math.max(0, totalConcessional - effectiveCap);
  const capHeadroom = Math.max(0, effectiveCap - sgContribution);

  // ── Tax, with and without ──
  const withoutSacrifice = calcPayTax({ grossIncome: grossSalary, sgRate, residency, rates });
  const withSacrifice = calcPayTax({
    grossIncome: grossSalary, sgRate, salarySacrifice: totalSacrifice, residency, rates,
  });

  const contributionsTax = totalSacrifice * contributionsTaxRate;

  // Computed here rather than taken from calcPayTax, so the SG side respects
  // the maximum contribution base. Income for surcharge purposes is taxable
  // income (already net of the sacrifice); the contributions are added by
  // division293On itself.
  const division293Without = division293On(withoutSacrifice.taxableIncome, sgContribution, rates);
  const division293 = division293On(withSacrifice.taxableIncome, totalConcessional, rates);
  const division293Extra = division293 - division293Without;
  const division293Applies = division293 > 0;

  // The one honest saving figure: personal tax and levies saved, less the 15%
  // the fund takes on the way in, less any Division 293 the contribution
  // triggers. Above $250k that last term is what turns marginal − 15% into
  // marginal − 30%.
  const personalTaxSaved = withoutSacrifice.totalTax - withSacrifice.totalTax;
  const annualTaxSaving = personalTaxSaved - contributionsTax - division293Extra;
  const savingRate = totalSacrifice > 0 ? annualTaxSaving / totalSacrifice : 0;

  // Division 293 is a personal liability, so it comes out of take-home cash
  // even though it is not part of `totalTax`.
  const cashWithout = withoutSacrifice.takeHome - division293Without;
  const cashWith = withSacrifice.takeHome - division293;
  const netTakeHomeCost = cashWithout - cashWith;
  const fortnightlyCost = netTakeHomeCost / 26;
  const monthlyCost = netTakeHomeCost / 12;

  // What actually lands in super. `superTaxedSacrifice - netTakeHomeCost` is
  // identically `annualTaxSaving`, which is the point — one saving figure.
  const superTaxedSacrifice = totalSacrifice * (1 - contributionsTaxRate);

  // ── Excess concessional contributions ──
  // Excess is included in assessable income and taxed at the marginal rate,
  // but a 15% offset recognises the tax the fund already paid. An excess
  // concessional contributions charge also applies; it tracks the GIC and is
  // not modelled here.
  const excessMarginalTax = taxOnAdditionalIncome(
    withSacrifice.taxableIncome, excessAmount, { residency, rates }
  );
  const excessMedicare = residency === 'resident' ? excessAmount * rates.medicare.levyRate : 0;
  const excessOffset = excessAmount * contributionsTaxRate;
  const excessTaxEstimate = Math.max(0, excessMarginalTax + excessMedicare - excessOffset);

  // ── Preservation ──
  const preservationAge = s.preservationAge;
  const yearsToPreservation = Math.max(0, preservationAge - age);
  const lockedUntilPreservation = yearsToPreservation > 0;

  // ── Projection ──
  // Apples to apples. Both paths pay the same 15% on earnings inside super;
  // the un-sacrificed cash is invested OUTSIDE super, where earnings are taxed
  // at the marginal rate. Ignoring that alternative is what makes a naive
  // projection flatter sacrificing.
  const grossReturn = investmentReturn / 100;
  const fundEarningsTax = s.fundEarningsTaxRate ?? contributionsTaxRate;
  const superReturn = grossReturn * (1 - fundEarningsTax);
  const outsideReturn = grossReturn * (1 - withoutSacrifice.marginalRate);
  const superMonthly = superReturn / 12;
  const outsideMonthly = outsideReturn / 12;

  const contribWith = (sgContribution + totalSacrifice) * (1 - contributionsTaxRate) / 12;
  const contribWithout = sgContribution * (1 - contributionsTaxRate) / 12;
  const investedMonthly = Math.max(0, netTakeHomeCost) / 12;

  const projectionData = [];
  let superWith = superBalance;
  let superWithout = superBalance;
  let outside = 0;
  let peakBalance = superBalance;

  const horizon = Math.max(1, Math.min(Math.floor(horizonYears) || 1, 40));
  for (let yr = 0; yr <= horizon; yr++) {
    const alternative = superWithout + outside;
    peakBalance = Math.max(peakBalance, superWith, alternative);
    projectionData.push({
      year: yr,
      'With sacrifice': Math.round(superWith),
      'Without sacrifice': Math.round(alternative),
      superWithout: Math.round(superWithout),
      outsideSuper: Math.round(outside),
    });
    for (let m = 0; m < 12; m++) {
      superWith = superWith * (1 + superMonthly) + contribWith;
      superWithout = superWithout * (1 + superMonthly) + contribWithout;
      outside = outside * (1 + outsideMonthly) + investedMonthly;
    }
  }

  const finalWith = projectionData[projectionData.length - 1]['With sacrifice'];
  const finalWithout = projectionData[projectionData.length - 1]['Without sacrifice'];

  // ── Division 296 — flag only ──
  const d296 = s.division296;
  const division296Flag = {
    triggered: d296.compute === false && peakBalance >= d296.threshold1,
    threshold: d296.threshold1,
    compute: d296.compute,
    note: d296.note,
  };

  return {
    // contributions and caps
    sgContribution,
    totalSacrifice,
    totalConcessional,
    concessionalCap: s.concessionalCap,
    effectiveCap,
    capHeadroom,
    capExceeded,
    excessAmount,
    excessTaxEstimate,
    excessOffsetRate: contributionsTaxRate,
    carryForward,
    carryForwardUsed,

    // tax
    annualTaxSaving,
    savingRate,
    personalTaxSaved,
    contributionsTax,
    division293,
    division293Without,
    division293Extra,
    division293Applies,
    division293Threshold: s.division293.threshold,
    netTakeHomeCost,
    fortnightlyCost,
    monthlyCost,
    superTaxedSacrifice,
    withoutSacrifice,
    withSacrifice,

    // preservation
    age,
    preservationAge,
    yearsToPreservation,
    lockedUntilPreservation,

    // projection
    projectionData,
    finalWith,
    finalWithout,
    projectionDelta: finalWith - finalWithout,
    superReturn,
    outsideReturn,
    division296Flag,

    rates,
  };
}
