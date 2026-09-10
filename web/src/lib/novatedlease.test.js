// Regression vectors from FY2026-27-rates-audit-v2.md §8.11 (context §1.8,
// §2.8, §3.6, §3.8), plus the correctness findings in calc-suite-audit.md §B9.
//
// [ATO] rows are published lookups — failing one is definitively wrong.
// [trap] rows guard structural errors that produce plausible-but-wrong numbers;
// each carries a "what the old implementation returned" assertion so a
// regression cannot pass by coincidence.

import { describe, it, expect } from 'vitest';
import {
  calcNovatedLease,
  centsPerKmDeduction,
  fbtPayableOn,
  residualFor,
  flatLeasePayment,
  leaseBalanceAfter,
  phevGrandfatheredFrom,
  exGst,
  GST_RATE,
} from './novatedlease.js';
import { statutoryRateFor } from './rates/fbt.js';
import { ratesFor } from './rates/index.js';
import vectors, {
  employeeContributionMethod,
  centsPerKm,
  residualValues,
  statutoryRateLookup,
  reportableFringeBenefits,
} from './vectors/fbt.vectors.js';

const FY2026 = ratesFor('2026-09-10');
const FBT = FY2026.fbt;
const round0 = (n) => Math.round(n);
const round2 = (n) => Math.round(n * 100) / 100;

// A commencement date inside the verified FBT year.
const START = '2026-09-10';

const base = (extra = {}) => calcNovatedLease({
  vehicleType: 'bev',
  driveAwayPrice: 65000,
  onRoadCosts: 3500,
  termYears: 3,
  startDate: START,
  grossSalary: 110000,
  runningCosts: 5000,
  adminFee: 450,
  financeRate: 7.5,
  ...extra,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.11 statutory formula rate lookup [ATO] [trap]', () => {
  // Each vector row resolved through the registry helper. The PHEV rows are
  // the ones the previous implementation got wrong.
  const KIND = { BEV: 'bev', PHEV: 'phev', 'Petrol car': 'ice' };
  const DATE = { 'FY2026-27': '2026-09-10', any: '2026-09-10' };

  it.each(statutoryRateLookup)('$note', (v) => {
    const iso = DATE[v.input.date] ?? v.input.date;
    const rates = ratesFor(iso).fbt;
    const { rate } = statutoryRateFor({
      kind: KIND[v.input.vehicle],
      priceIncGst: v.input.price ?? 70000,
      date: iso,
      rates,
      phevGrandfathered: Boolean(v.input.bindingCommitmentPre && v.input.commitmentUnchanged),
    });
    expect(rate).toBe(v.expected);
  });

  it('covers all seven rows, so a deleted vector cannot silently shrink the suite', () => {
    expect(statutoryRateLookup).toHaveLength(7);
  });

  it('[trap] a new PHEV lease is 20%, not exempt — the old code returned 0%', () => {
    const phev = base({ vehicleType: 'phev' });
    const ice = base({ vehicleType: 'ice' });
    expect(phev.statutoryRate).toBe(0.20);
    expect(phev.isExempt).toBe(false);
    expect(phev.evEligible).toBe(false);
    // Identical treatment to a petrol car — that is the whole point.
    expect(phev.fbtTaxableValue).toBe(ice.fbtTaxableValue);
    expect(phev.fbtIfNoContribution).toBe(ice.fbtIfNoContribution);
    // And materially different from the answer the old "Yes — EV/PHEV" button gave.
    expect(base({ vehicleType: 'bev' }).fbtTaxableValue).toBe(0);
    expect(phev.fbtTaxableValue).toBeGreaterThan(10000);
  });

  it('the registry says plug-in hybrids are not exempt, and when that ended', () => {
    expect(FBT.phevExempt).toBe(false);
    expect(FBT.phevExemptionEnded).toBe('2025-04-01');
    expect(FBT.phevGrandfatheringRequiresBindingCommitment).toBe(true);
  });

  it('grandfathering needs BOTH limbs — either one alone is not enough', () => {
    expect(phevGrandfatheredFrom({ exemptUseBeforeCutoff: true })).toBe(false);
    expect(phevGrandfatheredFrom({ bindingCommitmentUnchanged: true })).toBe(false);
    expect(phevGrandfatheredFrom({ exemptUseBeforeCutoff: true, bindingCommitmentUnchanged: true })).toBe(true);
    expect(phevGrandfatheredFrom()).toBe(false);

    const one = base({ vehicleType: 'phev', phevExemptUseBeforeCutoff: true });
    expect(one.phevGrandfathered).toBe(false);
    expect(one.statutoryRate).toBe(0.20);

    const both = base({
      vehicleType: 'phev',
      phevExemptUseBeforeCutoff: true,
      phevBindingCommitmentUnchanged: true,
    });
    expect(both.phevGrandfathered).toBe(true);
    expect(both.statutoryRate).toBe(0);
    expect(both.isExempt).toBe(true);
  });

  it('grandfathering is meaningless on anything that is not a plug-in hybrid', () => {
    const ice = base({
      vehicleType: 'ice',
      phevExemptUseBeforeCutoff: true,
      phevBindingCommitmentUnchanged: true,
    });
    expect(ice.phevGrandfathered).toBe(false);
    expect(ice.statutoryRate).toBe(0.20);
  });

  it('a fuel cell vehicle is treated as an eligible EV', () => {
    expect(base({ vehicleType: 'fcev' }).statutoryRate).toBe(0);
  });

  it('resolves the rate from the COMMENCEMENT date, across the phase change', () => {
    expect(base({ vehicleType: 'bev', startDate: '2027-05-01' }).statutoryRate).toBe(0);
    expect(base({ vehicleType: 'bev', driveAwayPrice: 88500, startDate: '2027-05-01' }).statutoryRate).toBe(0.15);
    expect(base({ vehicleType: 'bev', startDate: '2029-05-01' }).statutoryRate).toBe(0.15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.11 employee contribution method [trap]', () => {
  it.each(employeeContributionMethod)('$note', (v) => {
    expect(fbtPayableOn(v.input.taxableValue, v.input.postTaxContribution, FBT)).toBe(v.expected);
  });

  it('the same taxable value with no contribution is emphatically not nil', () => {
    const v = employeeContributionMethod[0].input;
    expect(round2(fbtPayableOn(v.taxableValue, 0, FBT)))
      .toBe(round2(9000 * FBT.grossUpType1 * FBT.rate));
    expect(round0(fbtPayableOn(v.taxableValue, 0, FBT))).toBe(8799);
  });

  it('grosses up at TYPE 1 — a novated lease is GST-creditable', () => {
    expect(FBT.grossUpType1).toBe(2.0802);
    expect(FBT.grossUpType2).toBe(1.8868);
    expect(base({ vehicleType: 'ice' }).grossUpApplied).toBe(FBT.grossUpType1);
  });

  it('[trap] never charges FBT and takes the contribution reduction at the same time', () => {
    const withEcm = base({ vehicleType: 'ice', useECM: true });
    const withoutEcm = base({ vehicleType: 'ice', useECM: false });

    expect(withEcm.ecmApplied).toBe(true);
    expect(withEcm.fbtPayable).toBe(0);
    expect(withEcm.postTaxContribution).toBe(withEcm.fbtTaxableValue);

    expect(withoutEcm.ecmApplied).toBe(false);
    expect(withoutEcm.postTaxContribution).toBe(0);
    expect(round2(withoutEcm.fbtPayable)).toBe(round2(withoutEcm.fbtTaxableValue * 2.0802 * 0.47));

    // The old code did both: a full FBT liability AND the taxable value taken
    // off the pre-tax reduction as a contribution. Exactly one of the two
    // reductions may be in play in each branch.
    for (const r of [withEcm, withoutEcm]) {
      expect(r.fbtPayable > 0 && r.postTaxContribution > 0).toBe(false);
    }
    // The double-counted figure the old code produced.
    const doubleCounted = withoutEcm.totalPackagedCost - withoutEcm.fbtTaxableValue;
    expect(withoutEcm.preTaxDeduction).not.toBe(doubleCounted);
    expect(withoutEcm.preTaxDeduction).toBe(withoutEcm.totalPackagedCost + withoutEcm.fbtPayable);
  });

  it('ECM comes out cheaper below a ~49.4% marginal rate, which is everyone', () => {
    // Gross-up × FBT rate is 2.0802 × 0.47 ≈ 0.978, so a dollar of taxable
    // value costs ~$0.98 of pre-tax salary as FBT, against $1 of post-tax
    // salary as a contribution. Post-tax wins while mr/(1-mr) < 0.978.
    expect(round2(FBT.grossUpType1 * FBT.rate)).toBe(0.98);
    const withEcm = base({ vehicleType: 'ice', useECM: true });
    const withoutEcm = base({ vehicleType: 'ice', useECM: false });
    expect(withEcm.netAnnualCost).toBeLessThan(withoutEcm.netAnnualCost);
    expect(withEcm.annualTaxSaving).toBeGreaterThan(0);
  });

  it('does nothing on an exempt vehicle, and says so', () => {
    const ev = base({ vehicleType: 'bev', useECM: true });
    expect(ev.ecmAvailable).toBe(false);
    expect(ev.ecmApplied).toBe(false);
    expect(ev.postTaxContribution).toBe(0);
    expect(ev.fbtPayable).toBe(0);
    expect(ev.warnings.some((w) => /employee contribution method to do/i.test(w.title))).toBe(true);
  });

  it('states the registry position and the 31 March deadline', () => {
    expect(FBT.ecmReducesFbtToNil).toBe(true);
    expect(FBT.ecmDeadline).toBe('03-31');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.11 cents per km [trap]', () => {
  it.each(centsPerKm)('$note', (v) => {
    expect(centsPerKmDeduction(v.input.eligibleKm, FBT)).toBe(v.expected);
  });

  it('uses 91c, a 5,000 km cap and a $4,550 maximum from the registry', () => {
    expect(FBT.centsPerKm).toBe(0.91);
    expect(FBT.centsPerKmCapKm).toBe(5000);
    expect(FBT.centsPerKmMax).toBe(4550);
    expect(FBT.centsPerKmWorkRelatedOnly).toBe(true);
    expect(round2(centsPerKmDeduction(5000, FBT))).toBe(4550);
    expect(round2(centsPerKmDeduction(4000, FBT))).toBe(3640);
    expect(centsPerKmDeduction(0, FBT)).toBe(0);
    expect(centsPerKmDeduction(-100, FBT)).toBe(0);
  });

  it('[trap] it is not 88c any more', () => {
    expect(round2(centsPerKmDeduction(4000, FBT))).not.toBe(round2(4000 * 0.88));
  });

  it('[trap] applies to WORK-RELATED kilometres, never the odometer', () => {
    // 15,000 km a year, almost all of it commuting: the deduction is nil, not
    // the $4,550 the old code handed out for driving to the office.
    const commuter = base({ workRelatedKms: 0 });
    expect(commuter.cpkDeduction).toBe(0);
    expect(commuter.cpkTaxBenefit).toBe(0);

    const rep = base({ workRelatedKms: 6200 });
    expect(rep.cpkDeduction).toBe(4550);
    expect(rep.cpkTaxBenefit).toBeGreaterThan(0);
    // Overstating the outright case is what the old behaviour did.
    expect(rep.outrightAnnualCost).toBeLessThan(commuter.outrightAnnualCost);
  });

  it('only the excess over the standard work deduction is worth anything', () => {
    const std = FY2026.incomeTax.standardWorkDeduction;
    const small = base({ workRelatedKms: 500 }); // $455 claim, under the $1,000 floor
    expect(small.cpkDeduction).toBe(455);
    if (std) {
      expect(small.cpkDeduction).toBeLessThan(std.amount);
      expect(small.cpkTaxBenefit).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.11 / §3.8 residual values [calc]', () => {
  it.each(residualValues)('$note', (v) => {
    const r = residualFor({
      basePriceExGst: v.input.baseVehiclePrice,
      termYears: v.input.termYears,
      rates: FBT,
    });
    expect(round2(r.excludingGst)).toBe(v.expected.excludingGst);
    expect(round2(r.includingGst)).toBe(v.expected.includingGst);
  });

  it('takes the whole table from the registry', () => {
    expect(FBT.residualMinimums).toEqual({ 1: 0.6563, 2: 0.5625, 3: 0.4688, 4: 0.3750, 5: 0.2813 });
    for (const [term, pct] of Object.entries(FBT.residualMinimums)) {
      expect(residualFor({ basePriceExGst: 60000, termYears: +term, rates: FBT }).pct).toBe(pct);
    }
  });

  it('caveat 1 — computed on the BASE price, not the drive-away price', () => {
    expect(FBT.residualBasis).toBe('baseVehiclePrice');
    // $55,000 drive-away with $2,218 of duty, rego and CTP → $52,782 base.
    const r = base({ driveAwayPrice: 55000, onRoadCosts: 2218, termYears: 3 });
    expect(round2(r.basePriceIncGst)).toBe(52782);
    expect(round2(r.residual.excludingGst)).toBe(round2(exGst(52782) * 0.4688));
    // The old code applied the percentage to the drive-away price.
    expect(round0(r.residual.excludingGst)).not.toBe(round0(55000 * 0.4688));
    expect(r.residual.excludingGst).toBeLessThan(55000 * 0.4688);
  });

  it('caveat 2 — GST is added on payout', () => {
    expect(FBT.residualGstOnPayout).toBe(true);
    const r = base();
    expect(round2(r.residual.includingGst)).toBe(round2(r.residual.excludingGst * (1 + GST_RATE)));
    expect(round2(r.residual.gstOnPayout)).toBe(round2(r.residual.excludingGst * GST_RATE));
    // The payout in the ownership comparison is the GST-inclusive one.
    expect(r.novatedTotalCost).toBeGreaterThan(r.netAnnualCost * r.termYears + r.residual.excludingGst);
  });

  it('caveat 3 — these are MINIMUMS, and a lower override is flagged', () => {
    expect(FBT.residualIsMinimumNotFixed).toBe(true);
    const r = base();
    expect(r.residual.isMinimumNotFixed).toBe(true);
    expect(r.residual.belowMinimum).toBe(false);

    const low = base({ residualOverride: 1000 });
    expect(low.residual.belowMinimum).toBe(true);
    expect(low.warnings.some((w) => /below the ATO minimum/i.test(w.title))).toBe(true);

    const high = base({ residualOverride: 40000 });
    expect(high.residual.belowMinimum).toBe(false);
    expect(high.residual.excludingGst).toBe(40000);
  });

  it('clamps the term to the 1–5 year table', () => {
    expect(residualFor({ basePriceExGst: 60000, termYears: 9, rates: FBT }).pct).toBe(0.2813);
    expect(residualFor({ basePriceExGst: 60000, termYears: 0, rates: FBT }).pct).toBe(0.6563);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.11 / §3.6 reportable fringe benefits [trap]', () => {
  const v = reportableFringeBenefits[0];

  it(`${v.note}`, () => {
    const ev = base({ vehicleType: 'bev' });

    // Exempt, no FBT — and still reportable.
    expect(ev.isExempt).toBe(true);
    expect(ev.fbtPayable).toBe(0);
    expect(ev.rfbaApplies).toBe(true);
    expect(ev.rfba).toBeGreaterThan(0);

    // …and it flows into both income tests.
    const noRfba = ev.baseline;
    expect(ev.withLease.mlsIncome).toBe(ev.withLease.taxableIncome + ev.rfba);
    expect(ev.withLease.repaymentIncome).toBe(ev.withLease.taxableIncome + ev.rfba);
    expect(ev.withLease.mlsIncome).toBeGreaterThan(ev.withLease.taxableIncome);
    expect(noRfba.mlsIncome).toBe(noRfba.taxableIncome);
  });

  it('the notional value uses the ORDINARY statutory fraction, grossed up at type 2', () => {
    const ev = base({ vehicleType: 'bev' });
    expect(FBT.exemptEvStillReportable).toBe(true);
    expect(round2(ev.reportableTaxableValue)).toBe(round2(ev.basePriceIncGst * FBT.statutoryFractionStandard));
    expect(round2(ev.rfba)).toBe(round2(ev.reportableTaxableValue * FBT.grossUpType2));
  });

  it('[trap] the old code reported nothing at all on an exempt EV', () => {
    const ev = base({ vehicleType: 'bev' });
    expect(ev.rfba).not.toBe(0);
    expect(round0(ev.rfba)).toBeGreaterThan(20000);
    expect(ev.warnings.some((w) => /[Rr]eportable fringe benefits amount/.test(w.title))).toBe(true);
  });

  it('arises only above the $2,000 taxable-value threshold', () => {
    expect(FBT.rfbaThreshold).toBe(2000);
    // A cheap car: 20% of $9,000 is $1,800, under the threshold.
    const cheap = base({ vehicleType: 'bev', driveAwayPrice: 10000, onRoadCosts: 1000 });
    expect(cheap.reportableTaxableValue).toBeLessThan(2000);
    expect(cheap.rfbaApplies).toBe(false);
    expect(cheap.rfba).toBe(0);
  });

  it('costs real money through the surcharge and HELP repayments', () => {
    const withDebt = base({
      vehicleType: 'bev',
      grossSalary: 130000,
      helpBalance: 40000,
      hasPrivateCover: false,
    });
    expect(withDebt.rfbaHelpCost).toBeGreaterThan(0);
    expect(withDebt.rfbaMlsCost).toBeGreaterThan(0);
    expect(withDebt.rfbaCost).toBe(
      withDebt.rfbaMlsCost + withDebt.rfbaHelpCost + withDebt.rfbaDivision293Cost
    );
    // The headline tax saving is reported NET of it, not gross.
    const ignoring = base({
      vehicleType: 'bev', grossSalary: 130000, helpBalance: 40000, hasPrivateCover: false,
      rates: { ...FY2026, fbt: { ...FBT, rfbaThreshold: Infinity } },
    });
    expect(ignoring.rfba).toBe(0);
    expect(withDebt.annualTaxSaving).toBeLessThan(ignoring.annualTaxSaving);
  });

  it('a post-tax contribution reduces the reportable amount too', () => {
    const withEcm = base({ vehicleType: 'ice', useECM: true });
    const withoutEcm = base({ vehicleType: 'ice', useECM: false });
    expect(withEcm.reportableTaxableValue).toBe(0);
    expect(withEcm.rfba).toBe(0);
    expect(withoutEcm.rfba).toBeGreaterThan(0);
  });

  it('surfaces every downstream test the registry lists', () => {
    const ev = base({ vehicleType: 'bev' });
    expect(ev.rfbaAffects).toEqual(FBT.rfbaAffects);
    expect(ev.rfbaAffects).toContain('medicareLevySurcharge');
    expect(ev.rfbaAffects).toContain('helpRepaymentIncome');
    expect(ev.rfbaAffects).toContain('division293');
    expect(ev.rfbaAffects).toContain('familyTaxBenefitAB');
    expect(ev.rfbaAffects).toContain('childSupport');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§B9.3 the GST saving', () => {
  it('finances the vehicle GST-exclusive — the employer claims the credit', () => {
    const r = base({ driveAwayPrice: 65000, onRoadCosts: 3500 });
    expect(r.basePriceIncGst).toBe(61500);
    expect(round2(r.basePriceExGst)).toBe(round2(61500 / 1.1));
    expect(round2(r.gstSavingOnVehicle)).toBe(round2(61500 - 61500 / 1.1));
    // Roughly 9.1% of the vehicle price.
    expect(r.gstSavingOnVehicle / r.basePriceIncGst).toBeCloseTo(1 / 11, 6);
    // On-road costs carry no claimable GST, so they are financed in full.
    expect(round2(r.amountFinanced)).toBe(round2(61500 / 1.1 + 3500));
    expect(r.amountFinanced).toBeLessThan(65000);
  });

  it('claims the credit on running costs and the admin fee as well', () => {
    const on = base({ employerClaimsGstOnRunningCosts: true });
    const off = base({ employerClaimsGstOnRunningCosts: false });
    expect(round2(on.operatingPackaged)).toBe(round2((5000 + 450) / 1.1));
    expect(off.operatingPackaged).toBe(5450);
    expect(round2(on.gstSavingOnRunning)).toBe(round2(5450 - 5450 / 1.1));
    expect(off.gstSavingOnRunning).toBe(0);
    expect(on.netAnnualCost).toBeLessThan(off.netAnnualCost);
  });

  it('[trap] the old code financed the GST-inclusive drive-away price', () => {
    const r = base();
    expect(r.amountFinanced).not.toBe(65000);
    expect(65000 - r.amountFinanced).toBeGreaterThan(5000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§1.8 / §B9.8 the LCT threshold comes from the registry', () => {
  it('is $91,661, not a hardcoded $91,000', () => {
    expect(FBT.lctThresholdFuelEfficient).toBe(91661);
    expect(base().lctThreshold).toBe(91661);
  });

  it('gates the exemption on the vehicle price excluding on-road costs', () => {
    const under = base({ vehicleType: 'bev', driveAwayPrice: 91660, onRoadCosts: 0 });
    expect(under.basePriceIncGst).toBe(91660);
    expect(under.aboveLctThreshold).toBe(false);
    expect(under.statutoryRate).toBe(0);

    const over = base({ vehicleType: 'bev', driveAwayPrice: 91661, onRoadCosts: 0 });
    expect(over.aboveLctThreshold).toBe(true);
    expect(over.statutoryRate).toBe(FBT.statutoryFractionStandard);
    expect(over.warnings.some((w) => /luxury car tax threshold/i.test(w.title))).toBe(true);

    // A car priced between $91,000 and $91,661 is exempt — the old hardcoded
    // threshold wrongly denied it.
    const between = base({ vehicleType: 'bev', driveAwayPrice: 91500, onRoadCosts: 0 });
    expect(between.statutoryRate).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§B9.6 / §B9.9 the buy-outright comparison', () => {
  it('finances the outright purchase on the same rate and term by default', () => {
    const r = base({ outrightFinanced: true });
    expect(r.outrightUpfront).toBe(0);
    expect(r.outrightAnnualRepayment).toBeGreaterThan(0);
    expect(r.outrightInterest).toBeGreaterThan(0);
    expect(round2(r.outrightAnnualRepayment))
      .toBe(round2(flatLeasePayment(65000, 0, 7.5, 3) * 12));
  });

  it('[trap] a cash purchase pays no interest — the assumption is stated', () => {
    const cash = base({ outrightFinanced: false });
    expect(cash.outrightInterest).toBe(0);
    expect(cash.outrightUpfront).toBe(65000);
    expect(cash.outrightAnnualRepayment).toBe(0);
    expect(cash.warnings.some((w) => /pay cash for the car/i.test(w.title))).toBe(true);
    // Financing the outright case costs more, which is the whole point.
    expect(base({ outrightFinanced: true }).outrightTotalCost)
      .toBeGreaterThan(cash.outrightTotalCost - 1e-9);
  });

  it('both paths end owning the car, so the residual payout is in the novated total', () => {
    const r = base();
    expect(round2(r.novatedTotalCost))
      .toBe(round2(r.netAnnualCost * 3 + r.residual.includingGst));
    expect(round2(r.advantage)).toBe(round2(r.outrightTotalCost - r.novatedTotalCost));
  });

  it('running costs are after-tax when you own the car and pre-tax when you package it', () => {
    const r = base();
    expect(r.outrightAnnualCost).toBeGreaterThan(r.runningCosts - 1e-9);
    expect(r.operatingPackaged).toBeLessThan(r.runningCosts + r.adminFee);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§B9.9 dead inputs', () => {
  it('sgRate is wired up — packaging reduces the SG base', () => {
    const a = base({ sgRate: 12 });
    const b = base({ sgRate: 15 });
    expect(a.superWith).not.toBe(b.superWith);
    expect(round2(a.superWithout)).toBe(round2(110000 * 0.12));
    expect(round2(a.superWith)).toBe(round2((110000 - a.preTaxDeduction) * 0.12));
    expect(a.superReduction).toBeGreaterThan(0);
  });

  it('an employer that keeps SG on the pre-packaged salary loses nothing', () => {
    const r = base({ sgOnPrePackagedSalary: true });
    expect(r.superReduction).toBe(0);
    expect(round2(r.superWith)).toBe(round2(110000 * 0.12));
  });

  it('leaseBalloon and employeeContrib are gone; the misspelling is fixed', () => {
    const r = base();
    expect(r).not.toHaveProperty('forthnightlyOutOfPocket');
    expect(r).not.toHaveProperty('leaseBalloon');
    expect(r).not.toHaveProperty('employeeContrib');
    expect(round2(r.fortnightlyOutOfPocket)).toBe(round2(r.netAnnualCost / 26));
    expect(round2(r.monthlyOutOfPocket)).toBe(round2(r.netAnnualCost / 12));
  });

  it('an unrecognised input cannot silently change the answer', () => {
    expect(base({ isEVExempt: true }).statutoryRate).toBe(base().statutoryRate);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§B9.11 leaving your employer', () => {
  it('reports the payout that falls on you if the employment ends', () => {
    const r = base({ termYears: 5 });
    expect(r.leavingEmployer.balanceByYear).toHaveLength(5);
    const balances = r.leavingEmployer.balanceByYear.map((b) => b.leaseBalanceExGst);
    for (let i = 1; i < balances.length; i++) expect(balances[i]).toBeLessThan(balances[i - 1]);
    // At the end of the term what remains is exactly the residual.
    expect(round2(balances[4])).toBe(round2(r.residual.excludingGst));
    expect(r.leavingEmployer.balanceAfterOneYear).toBeGreaterThan(r.residual.excludingGst);
    expect(r.warnings.some((w) => /[Ll]eaving your employer/.test(w.title))).toBe(true);
  });

  it('the amortisation is self-consistent', () => {
    const r = base({ termYears: 3 });
    expect(round2(leaseBalanceAfter(r.amountFinanced, r.monthlyRental, 7.5, 0)))
      .toBe(round2(r.amountFinanced));
    expect(round2(leaseBalanceAfter(r.amountFinanced, r.monthlyRental, 7.5, 36)))
      .toBe(round2(r.residual.excludingGst));
  });

  it('handles a zero finance rate without dividing by zero', () => {
    const r = base({ financeRate: 0 });
    expect(Number.isFinite(r.monthlyRental)).toBe(true);
    expect(round2(r.monthlyRental * 36)).toBe(round2(r.amountFinanced - r.residual.excludingGst));
    expect(round2(r.financeCost)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the administration fee', () => {
  it('is packaged and moves the answer', () => {
    const none = base({ adminFee: 0 });
    const some = base({ adminFee: 800 });
    expect(some.adminFee).toBe(800);
    expect(some.totalPackagedCost).toBeGreaterThan(none.totalPackagedCost);
    expect(some.netAnnualCost).toBeGreaterThan(none.netAnnualCost);
    // It is not part of the outright case — you do not pay a packager to own a car.
    expect(some.outrightAnnualCost).toBe(none.outrightAnnualCost);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('salary deductions and cash flow', () => {
  it('net cost equals the deductions less the tax actually saved', () => {
    for (const r of [base({ vehicleType: 'bev' }), base({ vehicleType: 'ice', useECM: true }), base({ vehicleType: 'ice', useECM: false })]) {
      expect(round2(r.netAnnualCost)).toBe(round2(r.totalSalaryDeduction - r.annualTaxSaving));
      expect(round2(r.totalSalaryDeduction)).toBe(round2(r.preTaxDeduction + r.postTaxDeduction));
    }
  });

  it('the pre-tax deduction is not routed through the super-sacrifice input', () => {
    // A reportable employer super contribution would be added back into the
    // HELP and MLS bases; a packaged car is not one, and adding it there would
    // double-count against the RFBA.
    const r = base({ vehicleType: 'bev' });
    expect(r.withLease.salarySacrifice).toBe(0);
    expect(r.withLease.mlsIncome).toBe(r.withLease.taxableIncome + r.rfba);
  });

  it('caps the deduction at gross salary and warns', () => {
    const r = base({ grossSalary: 20000, driveAwayPrice: 120000, termYears: 1 });
    expect(r.packageExceedsSalary).toBe(true);
    expect(r.preTaxDeduction).toBeLessThanOrEqual(20000);
    expect(Number.isFinite(r.netAnnualCost)).toBe(true);
    expect(r.warnings.some((w) => /costs more than the salary/i.test(w.title))).toBe(true);
  });

  it('produces no NaN on empty inputs', () => {
    const r = calcNovatedLease({ driveAwayPrice: 0, grossSalary: 0, runningCosts: 0, adminFee: 0, startDate: START });
    for (const k of ['netAnnualCost', 'annualTaxSaving', 'fbtPayable', 'rfba', 'novatedTotalCost', 'outrightTotalCost']) {
      expect(Number.isFinite(r[k])).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('rate provenance', () => {
  it('takes the FBT rate and gross-ups from the registry, not from constants', () => {
    const r = base({ vehicleType: 'ice', useECM: false });
    expect(FBT.rate).toBe(0.47);
    expect(round2(r.fbtPayable)).toBe(round2(r.fbtTaxableValue * FBT.grossUpType1 * FBT.rate));
    expect(r.financialYear).toBe('2026-27');
  });

  it('flags the unverified carried-forward FBT year', () => {
    const later = base({ startDate: '2027-09-10' });
    expect(later.fbtRates.confidence).toBe('UNVERIFIED');
    expect(later.warnings.some((w) => /not yet published/i.test(w.title))).toBe(true);
    expect(base().warnings.some((w) => /not yet published/i.test(w.title))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('every vector in the file is exercised', () => {
  it('covers all five vector groups', () => {
    expect(Object.keys(vectors).sort()).toEqual([
      'centsPerKm',
      'employeeContributionMethod',
      'reportableFringeBenefits',
      'residualValues',
      'statutoryRateLookup',
    ]);
    expect(employeeContributionMethod).toHaveLength(1);
    expect(centsPerKm).toHaveLength(1);
    expect(residualValues).toHaveLength(1);
    expect(statutoryRateLookup).toHaveLength(7);
    expect(reportableFringeBenefits).toHaveLength(1);
  });
});
