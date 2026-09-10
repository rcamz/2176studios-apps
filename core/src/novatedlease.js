// Novated leasing — FBT, the employee contribution method, GST, and the
// reportable fringe benefits amount that nobody is shown.
//
// Four things this models that the previous version did not:
//
//  1. PHEVs ARE NOT EXEMPT. The plug-in hybrid exemption ended 1 April 2025.
//     Grandfathering is narrow: exempt use or availability BEFORE that date AND
//     a financially binding pre-existing commitment that continues unchanged.
//     Everything else is a 20% statutory fraction like any petrol car.
//
//  2. ECM IS A CHOICE, NOT A FREE LUNCH. A post-tax contribution equal to the
//     taxable value reduces FBT to nil. You cannot charge full FBT *and* apply
//     the reduction — the old code did both, which double-counted the benefit.
//
//  3. THE LEASE IS FINANCED GST-EXCLUSIVE. The employer claims the input tax
//     credit, so roughly 9.1% of the vehicle price drops out. This is one of
//     the main reasons novating beats a car loan, and it was missing entirely.
//
//  4. AN FBT-EXEMPT EV STILL PRODUCES AN RFBA. It is not income and no tax is
//     charged on it directly, but it lifts the income tests for the Medicare
//     levy surcharge, HELP repayments, Division 293, Family Tax Benefit and
//     child support. For a packaging family that materially offsets the
//     headline saving, and it is the biggest real-world trap in the product.

import { calcPayTax, getMarginalRate, division293On } from './paytax.js';
import { ratesFor } from './rates/index.js';
import { statutoryRateFor } from './rates/fbt.js';

// GST is not in the rate registry (it is not a rate that moves), so it lives
// here. If it is ever added to lib/rates, take it from there instead.
export const GST_RATE = 0.10;

export const exGst = (incGst) => incGst / (1 + GST_RATE);
export const gstComponent = (incGst) => incGst - exGst(incGst);

const clampTerm = (t) => Math.min(5, Math.max(1, Math.round(Number(t) || 1)));
const nonNeg = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

// ─── Finance ─────────────────────────────────────────────────────────────────

// Monthly rental on an amount financed with a balloon (the residual) at term.
// PV of the rentals plus the discounted residual equals the amount financed.
export function flatLeasePayment(amountFinanced, residual, ratePct, termYears) {
  const n = clampTerm(termYears) * 12;
  const i = (Number(ratePct) || 0) / 100 / 12;
  if (i === 0) return (amountFinanced - residual) / n;
  const disc = Math.pow(1 + i, -n);
  return (amountFinanced - residual * disc) * i / (1 - disc);
}

// Outstanding balance after `months`, which is what has to be paid out,
// refinanced or transferred if the employment ends mid-lease.
export function leaseBalanceAfter(amountFinanced, payment, ratePct, months) {
  const i = (Number(ratePct) || 0) / 100 / 12;
  if (i === 0) return Math.max(0, amountFinanced - payment * months);
  const g = Math.pow(1 + i, months);
  return Math.max(0, amountFinanced * g - payment * (g - 1) / i);
}

// ─── Residual ────────────────────────────────────────────────────────────────

// Three caveats the ATO table hides, all of them in the user's favour to know:
// the percentage applies to the BASE vehicle price (no stamp duty, rego or
// CTP), GST is added on payout, and these are MINIMUMS — a high-kilometre
// driver may be allowed a lower one.
export function residualFor({ basePriceExGst, termYears, rates, override = null }) {
  const term = clampTerm(termYears);
  const pct = rates.residualMinimums[term];
  const minimumExGst = nonNeg(basePriceExGst) * pct;
  const chosen = Number.isFinite(override) && override !== null ? Math.max(0, override) : minimumExGst;
  return {
    term,
    pct,
    minimumExGst,
    excludingGst: chosen,
    includingGst: chosen * (1 + GST_RATE),
    gstOnPayout: chosen * GST_RATE,
    belowMinimum: chosen < minimumExGst - 0.005,
    isMinimumNotFixed: rates.residualIsMinimumNotFixed === true,
    basis: rates.residualBasis,
  };
}

// ─── Cents per km ────────────────────────────────────────────────────────────

// WORK-RELATED travel only. Home-to-work commuting is private and does not
// count, which is why this takes work-related kilometres rather than the
// odometer. Capped at 5,000 km, and the cap binds before the rate does.
export function centsPerKmDeduction(workRelatedKm, rates) {
  const claimable = Math.min(nonNeg(workRelatedKm), rates.centsPerKmCapKm);
  return Math.min(claimable * rates.centsPerKm, rates.centsPerKmMax);
}

// ─── FBT ─────────────────────────────────────────────────────────────────────

// Type 1 gross-up: a novated lease is a GST-creditable benefit.
export function fbtPayableOn(taxableValue, postTaxContribution, rates) {
  const net = Math.max(0, nonNeg(taxableValue) - nonNeg(postTaxContribution));
  return net * rates.grossUpType1 * rates.rate;
}

// PHEV grandfathering needs BOTH limbs. Either alone is not enough, and if the
// commitment changed on or after 1 April 2025 the exemption stopped then.
export function phevGrandfatheredFrom({
  exemptUseBeforeCutoff = false,
  bindingCommitmentUnchanged = false,
} = {}) {
  return Boolean(exemptUseBeforeCutoff && bindingCommitmentUnchanged);
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcNovatedLease(inputs = {}) {
  const {
    // Vehicle
    vehicleType = 'bev',              // 'bev' | 'fcev' | 'phev' | 'ice'
    driveAwayPrice = 65000,           // GST-inclusive, including on-road costs
    onRoadCosts = 3500,               // stamp duty + registration + CTP
    termYears = 3,
    startDate = new Date(),           // the FBT rules are fixed at commencement
    residualOverride = null,          // ex-GST; the table value is a MINIMUM

    // PHEV grandfathering — both limbs required
    phevExemptUseBeforeCutoff = false,
    phevBindingCommitmentUnchanged = false,

    // Package
    financeRate = 7.5,
    runningCosts = 5000,              // GST-inclusive annual budget
    adminFee = 450,                   // employer / provider administration fee
    employerClaimsGstOnRunningCosts = true,
    useECM = true,                    // post-tax contribution to extinguish FBT

    // Employee
    grossSalary = 110000,
    sgRate = 12,
    sgOnPrePackagedSalary = false,
    residency = 'resident',
    helpBalance = 0,
    hasPrivateCover = false,
    family = false,
    dependentChildren = 0,

    // Buy-outright comparison
    workRelatedKms = 0,               // NOT total kilometres — commuting is private
    outrightFinanced = true,
  } = inputs;

  const rates = inputs.rates ?? ratesFor(startDate);
  const f = rates.fbt;
  const term = clampTerm(termYears);

  // ── Price decomposition ──
  // Stamp duty, rego and CTP carry no claimable GST and are not part of the
  // FBT base value or the residual base.
  const onRoads = Math.min(nonNeg(onRoadCosts), nonNeg(driveAwayPrice));
  const basePriceIncGst = Math.max(0, nonNeg(driveAwayPrice) - onRoads);
  const basePriceExGst = exGst(basePriceIncGst);
  const gstSavingOnVehicle = basePriceIncGst - basePriceExGst;
  const amountFinanced = basePriceExGst + onRoads;

  // ── Statutory rate ──
  // Resolved by the registry helper: date × price × eligibility. The LCT test
  // is on the GST-inclusive vehicle price, not the drive-away price.
  const phevGrandfathered = vehicleType === 'phev' && phevGrandfatheredFrom({
    exemptUseBeforeCutoff: phevExemptUseBeforeCutoff,
    bindingCommitmentUnchanged: phevBindingCommitmentUnchanged,
  });
  const statutory = statutoryRateFor({
    kind: vehicleType,
    priceIncGst: basePriceIncGst,
    date: startDate,
    rates: f,
    phevGrandfathered,
  });
  const statutoryRate = statutory.rate;
  const isExempt = statutoryRate === 0;
  const evEligible = vehicleType === 'bev' || vehicleType === 'fcev' || phevGrandfathered;
  const aboveLctThreshold = basePriceIncGst >= f.lctThresholdFuelEfficient;

  // ── Residual and rentals ──
  const residual = residualFor({ basePriceExGst, termYears: term, rates: f, override: residualOverride });
  const monthlyRental = flatLeasePayment(amountFinanced, residual.excludingGst, financeRate, term);
  const annualLeaseRental = monthlyRental * 12;
  const totalRentals = annualLeaseRental * term;
  const financeCost = totalRentals + residual.excludingGst - amountFinanced;

  // ── Operating budget ──
  const operatingIncGst = nonNeg(runningCosts) + nonNeg(adminFee);
  const operatingPackaged = employerClaimsGstOnRunningCosts ? exGst(operatingIncGst) : operatingIncGst;
  const gstSavingOnRunning = operatingIncGst - operatingPackaged;
  const totalPackagedCost = annualLeaseRental + operatingPackaged;

  // ── FBT and the employee contribution method ──
  // The base value for the statutory formula is the GST-inclusive cost price.
  // Assumes the car is available for the whole FBT year.
  const fbtTaxableValue = basePriceIncGst * statutoryRate;
  const ecmAvailable = fbtTaxableValue > 0;
  const ecmApplied = Boolean(useECM) && ecmAvailable;
  const postTaxContribution = ecmApplied ? fbtTaxableValue : 0;
  const fbtPayable = fbtPayableOn(fbtTaxableValue, postTaxContribution, f);
  const fbtIfNoContribution = fbtPayableOn(fbtTaxableValue, 0, f);

  // ── Reportable fringe benefits ──
  // An EXEMPT car benefit still has to be reported, and the notional taxable
  // value is worked out on the ORDINARY statutory fraction — the exemption
  // removes the tax, not the reporting. Where the benefit is taxable, the
  // reportable value is simply its taxable value. Employee contributions
  // reduce both. Grossed up at the type 2 rate, which is what appears on an
  // income statement regardless of the benefit's GST treatment.
  const reportableBasis = isExempt
    ? basePriceIncGst * f.statutoryFractionStandard
    : fbtTaxableValue;
  const reportableTaxableValue = Math.max(0, reportableBasis - postTaxContribution);
  const rfbaApplies = reportableTaxableValue > f.rfbaThreshold;
  const rfba = rfbaApplies ? reportableTaxableValue * f.grossUpType2 : 0;

  // ── Salary deductions ──
  // Under ECM the taxable value comes out post-tax and FBT is nil. Without it
  // the FBT is a cost of the package and is funded from pre-tax salary.
  const preTaxDeductionRaw = totalPackagedCost - postTaxContribution + fbtPayable;
  const preTaxDeduction = Math.max(0, Math.min(preTaxDeductionRaw, nonNeg(grossSalary)));
  const packageExceedsSalary = preTaxDeductionRaw > nonNeg(grossSalary);
  const postTaxDeduction = postTaxContribution;

  // ── Tax, three ways ──
  // The pre-tax deduction is taken off gross rather than passed as
  // `salarySacrifice`, because a packaged car is not a reportable employer
  // super contribution — routing it through that input would add it back into
  // the HELP and MLS bases a second time, on top of the RFBA.
  const payTaxCommon = { sgRate, residency, hasPrivateCover, helpBalance, family, dependentChildren, rates };
  const baseline = calcPayTax({ grossIncome: grossSalary, ...payTaxCommon });
  const withLease = calcPayTax({
    grossIncome: Math.max(0, nonNeg(grossSalary) - preTaxDeduction),
    reportableFringeBenefits: rfba,
    ...payTaxCommon,
  });
  const withLeaseIgnoringRfba = calcPayTax({
    grossIncome: Math.max(0, nonNeg(grossSalary) - preTaxDeduction),
    ...payTaxCommon,
  });

  // Division 293 counts the RFBA in its income base; calcPayTax only sees
  // taxable income, so the surcharge income is rebuilt here.
  const superRate = nonNeg(sgRate) / 100;
  const superWithout = nonNeg(grossSalary) * superRate;
  const sgBase = sgOnPrePackagedSalary ? nonNeg(grossSalary) : Math.max(0, nonNeg(grossSalary) - preTaxDeduction);
  const superWith = sgBase * superRate;
  const superReduction = superWithout - superWith;
  const division293Without = division293On(baseline.taxableIncome, superWithout, rates);
  const division293With = division293On(withLease.taxableIncome + rfba, superWith, rates);

  const cashWithout = baseline.takeHome - division293Without;
  const cashWith = withLease.takeHome - postTaxDeduction - division293With;

  // What the car actually costs in take-home pay.
  const netAnnualCost = cashWithout - cashWith;
  const fortnightlyOutOfPocket = netAnnualCost / 26;
  const monthlyOutOfPocket = netAnnualCost / 12;

  // The tax actually saved: income tax and levies avoided on the pre-tax
  // deduction, NET of the surcharge and repayments the reportable amount adds
  // back. Reporting the gross figure is what makes packaging look better than
  // it is. Division 293 is a personal liability that sits outside `totalTax`,
  // so it is added in explicitly.
  const totalSalaryDeduction = preTaxDeduction + postTaxDeduction;
  const annualTaxSaving =
    (baseline.totalTax + division293Without) - (withLease.totalTax + division293With);
  const totalSavingOverTerm = annualTaxSaving * term;

  // Downstream cost of the RFBA, isolated by re-running the same package with
  // the reportable amount removed.
  const rfbaMlsCost = withLease.mls - withLeaseIgnoringRfba.mls;
  const rfbaHelpCost = withLease.helpRepayment - withLeaseIgnoringRfba.helpRepayment;
  const rfbaDivision293Cost = division293With
    - division293On(withLeaseIgnoringRfba.taxableIncome, superWith, rates);
  const rfbaCost = rfbaMlsCost + rfbaHelpCost + rfbaDivision293Cost;

  // ── Buy outright ──
  // Same car, same running costs, out of after-tax income. Financed on the
  // same rate and term by default so the comparison is not a cash purchase
  // against an interest-bearing lease.
  const cpkDeduction = centsPerKmDeduction(workRelatedKms, f);
  const outrightTax = calcPayTax({ grossIncome: grossSalary, workExpenses: cpkDeduction, ...payTaxCommon });
  // The refund the claim produces. Only the excess over the standard work
  // deduction is worth anything — below the floor the claim buys nothing,
  // because the floor is already there.
  const cpkTaxBenefit = Math.max(0, baseline.totalTax - outrightTax.totalTax);

  const outrightMonthlyRepayment = outrightFinanced
    ? flatLeasePayment(nonNeg(driveAwayPrice), 0, financeRate, term)
    : 0;
  const outrightAnnualRepayment = outrightMonthlyRepayment * 12;
  const outrightAnnualCost = outrightAnnualRepayment + nonNeg(runningCosts) - cpkTaxBenefit;
  const outrightUpfront = outrightFinanced ? 0 : nonNeg(driveAwayPrice);
  const outrightInterest = outrightFinanced
    ? outrightAnnualRepayment * term - nonNeg(driveAwayPrice)
    : 0;

  // ── Cost of ownership over the term ──
  // Both paths end with the car owned outright, so the residual payout — with
  // GST — belongs in the novated total.
  const novatedTotalCost = netAnnualCost * term + residual.includingGst;
  const outrightTotalCost = outrightUpfront + outrightAnnualCost * term;
  const advantage = outrightTotalCost - novatedTotalCost;

  // ── Leaving your employer ──
  // The novation ends with the employment. The lease does not: it reverts to
  // the employee, in full, from after-tax income.
  const balanceByYear = Array.from({ length: term }, (_, i) => ({
    year: i + 1,
    leaseBalanceExGst: leaseBalanceAfter(amountFinanced, monthlyRental, financeRate, (i + 1) * 12),
  }));
  const leavingEmployer = {
    balanceByYear,
    balanceAfterOneYear: balanceByYear[0]?.leaseBalanceExGst ?? 0,
    residualIncludingGst: residual.includingGst,
    note:
      'The novation is an agreement between you, your employer and the financier. If the employment ends the '
      + 'novation ends with it and the lease reverts to you personally — the payments continue from after-tax '
      + 'income, with no pre-tax deduction and no employer input tax credit. Redundancy, a resignation or a move '
      + 'to an employer that does not offer packaging all trigger it, and early termination usually means paying '
      + 'out the balance plus the financier\'s break costs.',
  };

  // ── Chart ──
  const chartData = Array.from({ length: term }, (_, i) => {
    const last = i === term - 1;
    return {
      year: `Year ${i + 1}`,
      'Novated (net)': Math.round(netAnnualCost + (last ? residual.includingGst : 0)),
      'Buy outright (net)': Math.round(outrightAnnualCost + (i === 0 ? outrightUpfront : 0)),
    };
  });

  // ── Warnings ──
  const warnings = [];

  if (vehicleType === 'phev' && !phevGrandfathered) {
    warnings.push({
      level: 'warn',
      title: 'A plug-in hybrid is not FBT-exempt',
      body:
        'The exemption for plug-in hybrids ended on 1 April 2025. This lease is priced at the standard '
        + `${(f.statutoryFractionStandard * 100).toFixed(0)}% statutory fraction, exactly like a petrol car. `
        + 'Grandfathering needs both limbs: the car was in exempt use or available before 1 April 2025, and a '
        + 'financially binding pre-existing commitment continues unchanged.',
    });
  }
  if (phevGrandfathered) {
    warnings.push({
      level: 'note',
      title: 'Grandfathered plug-in hybrid — confirm both limbs',
      body:
        'Treated as exempt only because the car was in exempt use before 1 April 2025 and a binding commitment '
        + 'continues. If that commitment CHANGES the exemption stops from the date of the new commitment; if it '
        + 'ENDS, it applies up to and including that date. An optional extension is a new commitment.',
    });
  }
  if (evEligible && aboveLctThreshold) {
    warnings.push({
      level: 'warn',
      title: 'Above the fuel-efficient luxury car tax threshold',
      body:
        `The vehicle price of $${Math.round(basePriceIncGst).toLocaleString('en-AU')} (excluding on-road costs) `
        + `is at or above the $${f.lctThresholdFuelEfficient.toLocaleString('en-AU')} threshold, so the EV FBT `
        + 'exemption is unavailable and the standard statutory fraction applies. The test is whether LCT has '
        + 'EVER been payable on the car, so a used vehicle that was over the threshold when new never qualifies.',
    });
  }
  if (rfbaApplies) {
    warnings.push({
      level: 'warn',
      title: `Reportable fringe benefits amount of $${Math.round(rfba).toLocaleString('en-AU')}`,
      body:
        (isExempt
          ? 'The car benefit is FBT-exempt, but an exempt electric vehicle still produces a reportable amount. '
          : '')
        + 'It is not income and no tax is charged on it directly, but it appears on your income statement and '
        + 'lifts the income tests for the Medicare levy surcharge, HELP repayments, Division 293, Family Tax '
        + 'Benefit A and B, child support, the private health rebate and the super co-contribution. '
        + 'On these figures that costs about '
        + `$${Math.round(rfbaCost).toLocaleString('en-AU')} a year in surcharge and repayments alone; family `
        + 'assistance and child support are not modelled here and can add more.',
    });
  }
  if (ecmApplied) {
    warnings.push({
      level: 'note',
      title: 'Employee contribution method — FBT reduced to nil',
      body:
        `A post-tax contribution of $${Math.round(postTaxContribution).toLocaleString('en-AU')} equal to the `
        + `taxable value extinguishes the $${Math.round(fbtIfNoContribution).toLocaleString('en-AU')} of FBT that `
        + 'would otherwise be payable. It must be paid before 31 March. You cannot charge full FBT and claim the '
        + 'contribution reduction as well — it is one or the other.',
    });
  } else if (ecmAvailable) {
    warnings.push({
      level: 'warn',
      title: `FBT of $${Math.round(fbtPayable).toLocaleString('en-AU')} a year is payable`,
      body:
        'Funded from your pre-tax salary as a cost of the package. Switching to the employee contribution method '
        + `would replace it with a post-tax contribution of $${Math.round(fbtTaxableValue).toLocaleString('en-AU')} `
        + 'and reduce the FBT to nil — usually cheaper, because the gross-up means $1 of FBT costs more than $1 '
        + 'of contribution.',
    });
  } else if (useECM && !ecmAvailable) {
    warnings.push({
      level: 'note',
      title: 'Nothing for the employee contribution method to do',
      body:
        'The taxable value is nil, so there is no FBT to extinguish and a post-tax contribution would buy you '
        + 'nothing. Note that it would still reduce the reportable amount, if that matters more to you than cash.',
    });
  }
  if (residual.belowMinimum) {
    warnings.push({
      level: 'warn',
      title: 'Residual is below the ATO minimum',
      body:
        `A ${residual.term}-year lease has a minimum residual of `
        + `${(residual.pct * 100).toFixed(2)}% of the base vehicle price, or `
        + `$${Math.round(residual.minimumExGst).toLocaleString('en-AU')} excluding GST. A lower residual inflates `
        + 'the salary-sacrificed amount and the apparent tax benefit, which is exactly what the minimum exists '
        + 'to prevent.',
    });
  }
  if (packageExceedsSalary) {
    warnings.push({
      level: 'warn',
      title: 'The package costs more than the salary',
      body: 'The pre-tax deduction has been capped at gross salary. Reduce the vehicle price, the running costs '
        + 'or the term.',
    });
  }
  if (evEligible && !aboveLctThreshold) {
    const d = typeof startDate === 'string' ? startDate.slice(0, 10) : startDate.toISOString().slice(0, 10);
    if (d < '2027-04-01') {
      warnings.push({
        level: 'note',
        title: 'The EV exemption phases down from 1 April 2027',
        body:
          'From that date the statutory rate becomes 0% under $75,000 and 15% above it, and 15% for all eligible '
          + 'EVs from 1 April 2029. Pre-existing leases are excluded from the new rules, so a lease commenced '
          + 'before 1 April 2027 keeps its current treatment — but a refinance or an extension may not.',
      });
    }
  }
  warnings.push({
    level: 'note',
    title: 'Leaving your employer ends the novation, not the lease',
    body: leavingEmployer.note,
  });
  warnings.push({
    level: 'note',
    title: outrightFinanced
      ? 'The comparison finances both paths on the same terms'
      : 'The comparison assumes you pay cash for the car',
    body: outrightFinanced
      ? `Buying outright is modelled as a ${term}-year loan at ${financeRate}% with no balloon — `
        + `$${Math.round(outrightInterest).toLocaleString('en-AU')} of interest over the term — so the lease is `
        + 'not being compared against an interest-free purchase.'
      : `The full $${Math.round(nonNeg(driveAwayPrice)).toLocaleString('en-AU')} is paid up front in year one. `
        + 'No interest, and no return on the cash either — the opportunity cost of the capital is not modelled, '
        + 'so this flatters buying.',
  });
  if (f.confidence && f.confidence !== 'P') {
    warnings.push({
      level: 'note',
      title: `FBT figures for this date are ${f.confidence === 'UNVERIFIED' ? 'not yet published' : 'not from a primary source'}`,
      body: f.note || 'Scalar FBT rates re-index annually and are carried forward pending publication.',
    });
  }

  return {
    // rates and eligibility
    rates,
    fbtRates: f,
    financialYear: rates.__fy,
    vehicleType,
    evEligible,
    phevGrandfathered,
    statutoryRate,
    statutoryRateLabel: statutory.label,
    isExempt,
    aboveLctThreshold,
    lctThreshold: f.lctThresholdFuelEfficient,

    // price and GST
    driveAwayPrice,
    onRoadCosts: onRoads,
    basePriceIncGst,
    basePriceExGst,
    gstSavingOnVehicle,
    gstSavingOnRunning,
    gstSavingTotal: gstSavingOnVehicle + gstSavingOnRunning * term,
    amountFinanced,

    // lease
    termYears: term,
    residual,
    residualValue: residual.excludingGst,
    residualIncludingGst: residual.includingGst,
    monthlyRental,
    annualLeaseRental,
    totalRentals,
    financeCost,
    runningCosts: nonNeg(runningCosts),
    adminFee: nonNeg(adminFee),
    operatingPackaged,
    totalPackagedCost,

    // FBT
    fbtTaxableValue,
    fbtPayable,
    fbtIfNoContribution,
    ecmAvailable,
    ecmApplied,
    postTaxContribution,
    grossUpApplied: f.grossUpType1,

    // reportable fringe benefits
    reportableTaxableValue,
    rfbaApplies,
    rfba,
    rfbaThreshold: f.rfbaThreshold,
    rfbaCost,
    rfbaMlsCost,
    rfbaHelpCost,
    rfbaDivision293Cost,
    rfbaAffects: f.rfbaAffects,

    // salary and tax
    preTaxDeduction,
    postTaxDeduction,
    totalSalaryDeduction,
    packageExceedsSalary,
    baseline,
    withLease,
    marginalRate: getMarginalRate(baseline.taxableIncome, residency, rates),
    annualTaxSaving,
    totalSavingOverTerm,
    netAnnualCost,
    fortnightlyOutOfPocket,
    monthlyOutOfPocket,
    superWithout,
    superWith,
    superReduction,
    division293Without,
    division293With,

    // buy outright
    workRelatedKms: nonNeg(workRelatedKms),
    cpkDeduction,
    cpkTaxBenefit,
    centsPerKmRate: f.centsPerKm,
    centsPerKmCapKm: f.centsPerKmCapKm,
    centsPerKmMax: f.centsPerKmMax,
    outrightFinanced,
    outrightAnnualRepayment,
    outrightAnnualCost,
    outrightUpfront,
    outrightInterest,

    // comparison
    novatedTotalCost,
    outrightTotalCost,
    advantage,
    leavingEmployer,

    chartData,
    warnings,
  };
}

// ─── Explanation ─────────────────────────────────────────────────────────────

import { workings, section, step, subtotal, total, note } from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
// Takes a FRACTION (0.20 → '20%').
const pctFrac = (f) => `${Math.round(f * 10000) / 100}%`;

/**
 * Build a step-by-step account of a calcNovatedLease result.
 *
 * Separate from the calculation so the hot path stays free of presentation
 * concerns. Every figure comes from `result` or the inputs it was given.
 */
export function explainNovatedLease(result, inputs = {}) {
  const r = result;
  const f = r.fbtRates;
  const term = r.termYears;

  const startISO = typeof inputs.startDate === 'string'
    ? inputs.startDate.slice(0, 10)
    : inputs.startDate instanceof Date
      ? inputs.startDate.toISOString().slice(0, 10)
      : null;

  const TYPE_LABELS = {
    bev: 'Battery electric',
    fcev: 'Hydrogen fuel cell',
    phev: 'Plug-in hybrid',
    ice: 'Petrol or diesel',
  };

  // ── 1. What the car actually costs, before anything is financed ──
  const price = section('The vehicle price, decomposed', [
    step('Drive-away price', r.driveAwayPrice, { note: 'GST inclusive, as quoted' }),
    step('less on-road costs', -r.onRoadCosts, {
      note: 'Stamp duty, registration and CTP. No claimable GST, and they are outside the FBT base value and the residual base.',
    }),
    subtotal('Vehicle base price, GST inclusive', r.basePriceIncGst),
    step(`less GST at ${pctFrac(GST_RATE)}`, -r.gstSavingOnVehicle),
    total('Base price, GST exclusive', r.basePriceExGst),
  ], {
    note: 'Three different prices, each used for something different: the GST-inclusive base price '
      + 'sets the FBT taxable value and the luxury car tax test, the GST-exclusive base price sets '
      + 'the residual, and the drive-away price is what a private buyer would hand over.',
  });

  // ── 2. The lease, written on the ex-GST amount ──
  const finance = section('What gets financed', [
    step('Base price, GST exclusive', r.basePriceExGst),
    step('plus on-road costs', r.onRoadCosts),
    total('Amount financed', r.amountFinanced),
    step('Residual owing at the end of the term', r.residualValue, {
      muted: true,
      note: `${pctFrac(r.residual.pct)} of the ex-GST base price over ${term} year${term === 1 ? '' : 's'} — an ATO minimum, not a fixed figure. GST of ${money(r.residual.gstOnPayout)} is added on payout.`,
    }),
    step('Monthly rental', r.monthlyRental, { muted: true }),
    step('Annual lease rental', r.annualLeaseRental),
  ], {
    note: `The employer claims the GST input tax credit, so the lease is written on the price without GST. `
      + `That alone takes ${money(r.gstSavingOnVehicle)} out of the amount financed before a single tax `
      + 'saving is counted, and it is one of the main reasons novating beats a car loan.',
  });

  // ── 3. Why this statutory rate and not another ──
  const statutory = section('The statutory rate, and why', [
    step('Vehicle type', TYPE_LABELS[r.vehicleType] ?? r.vehicleType),
    step('Vehicle price against the fuel-efficient LCT threshold',
      `${money(r.basePriceIncGst)} v ${money(r.lctThreshold)}`, {
        note: r.aboveLctThreshold
          ? 'At or above the threshold, so the EV exemption is unavailable'
          : 'Below the threshold',
      }),
    startISO && step('Lease commences', startISO, {
      note: 'The FBT treatment is fixed at commencement, and the rules change on 1 April 2027 and again on 1 April 2029',
    }),
    r.vehicleType === 'phev' && step('Plug-in hybrid grandfathering',
      r.phevGrandfathered ? 'Both limbs met' : 'Not grandfathered', {
        note: 'The plug-in hybrid exemption ended on 1 April 2025. Grandfathering needs exempt use before that date AND a binding commitment that continues unchanged.',
      }),
    total('Statutory rate applied', pctFrac(r.statutoryRate)),
    note(r.statutoryRateLabel),
  ]);

  // ── 4. FBT, or the employee contribution — never both ──
  const netTaxableValue = r.fbtTaxableValue - r.postTaxContribution;
  const fbt = section('FBT, or the employee contribution', [
    step(`Base value x statutory rate of ${pctFrac(r.statutoryRate)}`, r.fbtTaxableValue),
    r.ecmApplied && step('less post-tax employee contribution', -r.postTaxContribution),
    r.ecmApplied && subtotal('Net taxable value', netTaxableValue),
    !r.ecmApplied && r.ecmAvailable && step(
      `Grossed up at ${r.grossUpApplied} and taxed at ${pctFrac(f.rate)}`,
      r.fbtPayable - r.fbtTaxableValue,
      { note: `${money(r.fbtTaxableValue)} of taxable value becomes ${money(r.fbtPayable)} of FBT` }
    ),
    total('FBT payable for the year', r.fbtPayable),
    r.ecmApplied && note(
      `A post-tax contribution of ${money(r.postTaxContribution)} equal to the taxable value reduces the `
      + `FBT to nil. The ${money(r.fbtIfNoContribution)} that would otherwise be payable is not also charged — `
      + 'it is one or the other, never both.'
    ),
    r.isExempt && note(
      'The car benefit is FBT-exempt, so there is no taxable value and nothing for a contribution to do. '
      + 'The exemption removes the tax. It does not remove the reporting.'
    ),
    !r.ecmApplied && r.ecmAvailable && note(
      'FBT is funded from pre-tax salary as a cost of the package. Because of the gross-up, $1 of FBT '
      + 'costs more than $1 of post-tax contribution — which is why the contribution method is usually cheaper.'
    ),
  ]);

  // ── 5. The salary reduction and what it saves ──
  const rawPreTax = r.totalPackagedCost - r.postTaxContribution + r.fbtPayable;
  const salary = section('What comes out of your salary', [
    step('Annual lease rental', r.annualLeaseRental),
    step('Running costs and administration, as packaged', r.operatingPackaged, {
      note: inputs.employerClaimsGstOnRunningCosts === false
        ? 'GST inclusive — the employer is not claiming the credit'
        : `GST claimed by the employer, worth ${money(r.gstSavingOnRunning)} a year`,
    }),
    subtotal('Total packaged cost', r.totalPackagedCost),
    r.postTaxContribution > 0 && step('less the part taken from post-tax pay', -r.postTaxContribution),
    r.fbtPayable > 0 && step('plus FBT, funded pre-tax', r.fbtPayable),
    r.packageExceedsSalary && step('capped at your gross salary', -(rawPreTax - r.preTaxDeduction), {
      note: 'The package costs more than the salary it comes out of',
    }),
    total('Pre-tax salary reduction', r.preTaxDeduction),
    r.postTaxDeduction > 0 && step('Post-tax deduction', r.postTaxDeduction, { muted: true }),
    step('Income tax and levies saved, net of the reportable amount', r.annualTaxSaving),
    r.superReduction > 0 && step('less employer super you no longer receive', -r.superReduction, {
      muted: true,
      note: 'SG is calculated on the reduced salary unless your employer agrees otherwise',
    }),
  ]);

  // ── 6. The reportable amount — the trap ──
  const rfbaSec = r.rfbaApplies ? section('The reportable fringe benefits amount', [
    step('Reportable taxable value', r.reportableTaxableValue, {
      note: r.isExempt
        ? `Worked out on the ordinary ${pctFrac(f.statutoryFractionStandard)} statutory fraction even though the car is FBT-exempt`
        : 'The taxable value of the benefit',
    }),
    step(`Grossed up at ${f.grossUpType2}`, r.rfba - r.reportableTaxableValue),
    subtotal('Reportable amount on your income statement', r.rfba),
    step('Medicare levy surcharge it adds', r.rfbaMlsCost),
    step('HELP repayment it adds', r.rfbaHelpCost),
    step('Division 293 it adds', r.rfbaDivision293Cost),
    total('What the reportable amount costs you a year', r.rfbaCost),
  ], {
    note: 'This is the biggest trap in the product. An FBT-exempt electric vehicle still generates a '
      + 'reportable amount. It is not income and no tax is charged on it directly, but it flows into '
      + 'the Medicare levy surcharge, HELP repayment income and Division 293 — and into Family Tax '
      + 'Benefit, child support, the private health rebate and the super co-contribution, which are '
      + 'not modelled here and can add more.',
  }) : section('The reportable fringe benefits amount', [
    step('Reportable taxable value', r.reportableTaxableValue),
    step('Reporting threshold', r.rfbaThreshold, { muted: true }),
    note(
      `Below the ${money(r.rfbaThreshold)} threshold, so nothing is reported and none of the downstream `
      + 'income tests move. Above it, the whole amount is reported, not just the excess.'
    ),
  ]);

  // ── 7. The bottom line ──
  const cashWithout = r.baseline.takeHome - r.division293Without;
  const cashWith = r.withLease.takeHome - r.postTaxDeduction - r.division293With;
  const bottom = section('What the car costs you in cash', [
    step('Take-home pay without the car', cashWithout),
    step('Take-home pay with the car packaged', cashWith, {
      note: 'After the pre-tax reduction, the post-tax contribution and the reportable amount',
    }),
    total('Net cost of the car a year', r.netAnnualCost),
    step('Per fortnight', r.fortnightlyOutOfPocket, { muted: true }),
  ]);

  return workings(
    [price, finance, statutory, fbt, salary, rfbaSec, bottom],
    {
      source: 'ATO fringe benefits tax and income tax rates',
      asAt: r.financialYear ? `FY${r.financialYear}` : null,
    }
  );
}
