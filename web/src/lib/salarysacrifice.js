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

// ─── Explanation ─────────────────────────────────────────────────────────────

import { workings, section, step, subtotal, total, note } from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const pct = (r) => (r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 1) + '%';

/**
 * Build a step-by-step account of a calcSalarySacrifice result.
 *
 * Separate from calcSalarySacrifice so the hot path stays free of presentation
 * concerns. Every figure comes from the result object or the inputs.
 */
export function explainSalarySacrifice(result, inputs = {}) {
  const r = result;
  const rates = r.rates;
  const contributionsTaxRate = rates.superannuation.contributionsTax;
  const d293Rate = rates.superannuation.division293.rate;
  const marginal = r.withSacrifice.marginalRate;
  const sgRate = inputs.sgRate ?? 12;
  const cf = r.carryForward;
  // Read back off the result rather than the inputs, so the line only ever
  // appears when the cap actually moved.
  const usingCarryForward = r.effectiveCap > r.concessionalCap;

  // ── Tax with and without ──────────────────────────────────────────────────
  const taxSection = section('Tax, with and without the sacrifice', [
    step('Taxable income without sacrificing', r.withoutSacrifice.taxableIncome),
    step('Taxable income after sacrificing', r.withSacrifice.taxableIncome, {
      note: r.totalSacrifice > 0 ? `${money(r.totalSacrifice)} taken before tax` : null,
    }),
    step('Tax and levies without sacrificing', r.withoutSacrifice.totalTax),
    step('less tax and levies after sacrificing', -r.withSacrifice.totalTax),
    total('Personal tax saved', r.personalTaxSaved),
  ], {
    note: 'Income tax, Medicare and any surcharge or study loan repayment, all moved together.',
  });

  // ── What the fund takes ───────────────────────────────────────────────────
  const insideSuper = section('What the fund takes on the way in', [
    step('Amount sacrificed', r.totalSacrifice),
    step(`less contributions tax at ${pct(contributionsTaxRate)}`, -r.contributionsTax),
    total('Lands in super', r.superTaxedSacrifice),
    r.division293Extra > 0 && step('Division 293 triggered by the sacrifice', r.division293Extra, {
      note: `Charged personally, not by the fund — ${money(r.division293)} in total this year, against ${money(r.division293Without)} without sacrificing`,
    }),
  ]);

  // ── The one honest saving figure ──────────────────────────────────────────
  const savingSection = section('The saving', [
    step('Personal tax saved', r.personalTaxSaved),
    step(`less contributions tax at ${pct(contributionsTaxRate)}`, -r.contributionsTax),
    r.division293Extra > 0 && step('less extra Division 293', -r.division293Extra),
    total('Net saving for the year', r.annualTaxSaving),
    r.totalSacrifice > 0 && step('Saving per dollar sacrificed', pct(r.savingRate), { muted: true }),
    r.division293Applies
      ? note(
          `Division 293 applies, so the saving is your ${pct(marginal)} marginal rate minus ` +
          `${pct(contributionsTaxRate + d293Rate)}, not minus ${pct(contributionsTaxRate)}. ` +
          'Assuming the usual 15% roughly doubles the benefit you would actually get.'
        )
      : note(
          `The sacrificed dollar avoids your ${pct(marginal)} marginal rate and pays ` +
          `${pct(contributionsTaxRate)} inside super instead. Past ` +
          `${money(r.division293Threshold)} of income plus contributions, Division 293 adds another ` +
          `${pct(d293Rate)} and the saving becomes marginal minus ${pct(contributionsTaxRate + d293Rate)}.`
        ),
  ]);

  // ── Cost to take-home ─────────────────────────────────────────────────────
  const costSection = section('What it costs your take-home pay', [
    step('Cash in hand without sacrificing', r.withoutSacrifice.takeHome - r.division293Without),
    step('less cash in hand after sacrificing', -(r.withSacrifice.takeHome - r.division293), {
      note: r.division293 > 0 ? 'Both figures are after Division 293, which is a personal bill' : null,
    }),
    total('Real cost for the year', r.netTakeHomeCost),
    step('Per fortnight', r.fortnightlyCost, { muted: true }),
    step('Per month', r.monthlyCost, { muted: true }),
    r.totalSacrifice > 0 && note(
      `You give up ${money(r.netTakeHomeCost)} of take-home pay and ${money(r.superTaxedSacrifice)} lands ` +
      'in super. The gap between those two is the saving — it is not free money, it is deferred money taxed less.'
    ),
  ]);

  // ── Cap and headroom ──────────────────────────────────────────────────────
  const capSection = section('Concessional cap', [
    step(`Employer contributions at ${sgRate}%`, r.sgContribution, {
      note: 'Capped at the maximum contribution base',
    }),
    step('Your sacrifice and other concessional contributions', r.totalSacrifice),
    subtotal('Total concessional contributions', r.totalConcessional),
    step('Concessional cap', r.concessionalCap),
    usingCarryForward && step('plus unused cap carried forward', r.effectiveCap - r.concessionalCap, {
      note: `From the last ${cf.lookbackYears} years, available because your total super balance of ${money(cf.totalSuperBalance)} is under ${money(cf.balanceTest)} at 30 June of the prior year`,
    }),
    total('Effective cap', r.effectiveCap),
    step('Headroom left after employer contributions', r.capHeadroom, { muted: true }),
    r.capExceeded && step('Excess contributions', r.excessAmount, {
      note: `Added to your assessable income and taxed at your marginal rate, with a ${pct(r.excessOffsetRate)} offset for the tax the fund already paid — about ${money(r.excessTaxEstimate)}`,
    }),
    !cf.eligible && cf.claimed > 0 && note(
      `Carry-forward is switched off: a total super balance of ${money(cf.totalSuperBalance)} is at or over ` +
      `the ${money(cf.balanceTest)} test at 30 June of the prior year.`
    ),
    cf.expired > 0 && note(
      `${money(cf.expired)} of unused cap has expired — unused amounts last only ${cf.lookbackYears} years.`
    ),
  ]);

  return workings([taxSection, insideSuper, savingSection, costSection, capSection], {
    source: 'Australian Taxation Office rates',
    asAt: rates.__fy ? `FY${rates.__fy}` : null,
  });
}
