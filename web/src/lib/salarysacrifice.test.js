// Salary sacrifice. The §8.7 super vectors cover the maximum contribution
// base; everything else here is the logic the vectors don't reach — Division
// 293, carry-forward, the excess-contribution treatment and the projection.

import { describe, it, expect } from 'vitest';
import { calcSalarySacrifice, carryForwardAvailable, sgContributionFor } from './salarysacrifice.js';
import { maxContributionBase, division296 } from './vectors/super.vectors.js';
import { ratesFor } from './rates/index.js';

const FY2026 = ratesFor('2026-09-10');
const DATE = '2026-09-10';
const round2 = (n) => Math.round(n * 100) / 100;
const base = { sgRate: 12, date: DATE, superBalance: 0, horizonYears: 20, investmentReturn: 7 };

describe('§8.7 maximum contribution base [calc]', () => {
  it.each(maxContributionBase)('$note', ({ input, expected }) => {
    expect(FY2026.superannuation.concessionalCap).toBe(input.concessionalCap);
    expect(FY2026.superannuation.maxContributionBase).toMatchObject({
      period: 'annual', amount: expected,
    });
  });

  it('[trap] caps compulsory SG at the base — annual, not quarterly', () => {
    expect(round2(sgContributionFor(400000, 12, FY2026))).toBe(round2(270830 * 0.12));
    expect(round2(sgContributionFor(200000, 12, FY2026))).toBe(24000);
    const r = calcSalarySacrifice({ ...base, grossSalary: 400000, sacrificeAmount: 0 });
    expect(round2(r.sgContribution)).toBe(32499.6);
  });
});

describe('the concessional cap comes from the registry', () => {
  it('is $32,500 for FY2026-27, not the $30,000 that was hardcoded', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000 });
    expect(r.concessionalCap).toBe(32500);
    expect(r.effectiveCap).toBe(32500);
    expect(r.capExceeded).toBe(false);
    // $30,000 would have wrongly reported this as exceeded.
    expect(r.totalConcessional).toBe(17000);
    expect(r.capHeadroom).toBe(32500 - 12000);
  });
});

describe('Division 293', () => {
  it('leaves the saving at marginal + Medicare − 15% below the threshold', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000 });
    expect(r.division293Applies).toBe(false);
    expect(round2(r.savingRate)).toBe(round2(0.30 + 0.02 - 0.15));
    expect(round2(r.annualTaxSaving)).toBe(round2(5000 * 0.17));
  });

  it('[trap] takes the saving to marginal + Medicare − 30% above $250,000', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 300000, sacrificeAmount: 15000 });
    expect(r.division293Applies).toBe(true);
    expect(round2(r.division293Extra)).toBe(round2(15000 * 0.15));
    expect(round2(r.savingRate)).toBe(round2(0.45 + 0.02 - 0.30));

    // The pre-fix headline — "15% super tax instead of your marginal rate" —
    // claimed nearly double this.
    const naive = 15000 * (0.45 + 0.02 - 0.15);
    expect(naive / r.annualTaxSaving).toBeGreaterThan(1.8);
  });

  it('charges Division 293 only on the lesser of the excess or the contributions', () => {
    // $245k income: the sacrifice pushes the total just over $250,000, so only
    // the excess is surcharged, not the whole contribution.
    const r = calcSalarySacrifice({ ...base, grossSalary: 245000, sacrificeAmount: 10000 });
    const surchargeIncome = r.withSacrifice.taxableIncome;
    const excess = surchargeIncome + r.totalConcessional - 250000;
    expect(r.division293).toBeGreaterThan(0);
    expect(round2(r.division293)).toBe(round2(Math.min(excess, r.totalConcessional) * 0.15));
    expect(r.division293).toBeLessThan(r.totalConcessional * 0.15);
  });

  it('counts Division 293 as a cost to take-home pay', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 300000, sacrificeAmount: 15000 });
    const cash = (t, d) => t.takeHome - d;
    expect(round2(r.netTakeHomeCost)).toBe(
      round2(cash(r.withoutSacrifice, r.division293Without) - cash(r.withSacrifice, r.division293))
    );
    expect(round2(r.superTaxedSacrifice - r.netTakeHomeCost)).toBe(round2(r.annualTaxSaving));
  });
});

describe('carry-forward', () => {
  it('sums the five-year lookback and drops anything older', () => {
    const cf = carryForwardAvailable({
      unusedByYear: [6000, 5000, 4000, 3000, 2000, 9999],
      totalSuperBalance: 400000, rates: FY2026,
    });
    expect(cf.available).toBe(20000);
    expect(cf.expired).toBe(9999);
    expect(cf.lookbackYears).toBe(5);
  });

  it('[trap] is unavailable when total super balance reaches $500,000', () => {
    const at = (bal) => carryForwardAvailable({
      priorUnusedCap: 20000, totalSuperBalance: bal, rates: FY2026,
    });
    expect(at(499999).available).toBe(20000);
    expect(at(500000).available).toBe(0);
    expect(at(500000).eligible).toBe(false);
    expect(at(500000).claimed).toBe(20000); // still reported, just not usable
  });

  it('cannot exceed five years of cap', () => {
    const cf = carryForwardAvailable({
      priorUnusedCap: 999999, totalSuperBalance: 0, rates: FY2026,
    });
    expect(cf.maximum).toBe(32500 * 5);
    expect(cf.available).toBe(32500 * 5);
  });

  it('[trap] is not the old X − X = 0 stub', () => {
    const r = calcSalarySacrifice({
      ...base, grossSalary: 150000, sacrificeAmount: 30000,
      superBalance: 300000, priorUnusedCap: 40000,
    });
    expect(r.carryForward.available).toBe(40000);
    expect(r.effectiveCap).toBe(72500);
    expect(r.capExceeded).toBe(false);
    expect(r.excessAmount).toBe(0);
    expect(r.carryForwardUsed).toBe(48000 - 32500);
  });

  it('is ignored when the balance test fails, so the cap is exceeded', () => {
    const r = calcSalarySacrifice({
      ...base, grossSalary: 150000, sacrificeAmount: 30000,
      superBalance: 600000, priorUnusedCap: 40000,
    });
    expect(r.effectiveCap).toBe(32500);
    expect(r.capExceeded).toBe(true);
    expect(round2(r.excessAmount)).toBe(round2(48000 - 32500));
  });
});

describe('other concessional contributions', () => {
  it('[trap] changes the tax calculation, not just the cap warning', () => {
    const without = calcSalarySacrifice({ ...base, grossSalary: 150000, sacrificeAmount: 5000 });
    const with10k = calcSalarySacrifice({
      ...base, grossSalary: 150000, sacrificeAmount: 5000, otherSacrifice: 10000,
    });
    expect(with10k.totalSacrifice).toBe(15000);
    expect(with10k.annualTaxSaving).toBeGreaterThan(without.annualTaxSaving);
    expect(with10k.netTakeHomeCost).toBeGreaterThan(without.netTakeHomeCost);
    expect(with10k.withSacrifice.taxableIncome).toBeLessThan(without.withSacrifice.taxableIncome);
  });
});

describe('excess concessional contributions', () => {
  it('taxes the excess at the marginal rate with a 15% offset', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 150000, sacrificeAmount: 30000 });
    expect(r.excessAmount).toBe(48000 - 32500);
    expect(r.excessOffsetRate).toBe(0.15);
    const marginalOnly = r.excessAmount * (r.withSacrifice.marginalRate + 0.02);
    expect(r.excessTaxEstimate).toBeLessThan(marginalOnly);
    expect(round2(r.excessTaxEstimate)).toBe(round2(marginalOnly - r.excessAmount * 0.15));
  });

  it('is zero when the cap is not exceeded', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000 });
    expect(r.excessAmount).toBe(0);
    expect(r.excessTaxEstimate).toBe(0);
  });
});

describe('preservation age', () => {
  it('reports the wait to 60 for a 40-year-old', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000, age: 40 });
    expect(r.preservationAge).toBe(60);
    expect(r.yearsToPreservation).toBe(20);
    expect(r.lockedUntilPreservation).toBe(true);
  });

  it('clears once the user is past preservation age', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000, age: 62 });
    expect(r.yearsToPreservation).toBe(0);
    expect(r.lockedUntilPreservation).toBe(false);
  });
});

describe('projection', () => {
  const r = calcSalarySacrifice({
    ...base, grossSalary: 120000, sacrificeAmount: 10000, superBalance: 100000, horizonYears: 20,
  });

  it('[trap] models the alternative rather than comparing against nothing', () => {
    const last = r.projectionData[r.projectionData.length - 1];
    // "Without sacrifice" is super PLUS the un-sacrificed cash invested outside.
    expect(last.outsideSuper).toBeGreaterThan(0);
    // ±1 — each series is rounded before it is added.
    expect(Math.abs(last['Without sacrifice'] - (last.superWithout + last.outsideSuper)))
      .toBeLessThanOrEqual(1);
    expect(last['Without sacrifice']).toBeGreaterThan(last.superWithout);
  });

  it('taxes earnings inside super at 15% and outside at the marginal rate', () => {
    expect(round2(r.superReturn)).toBe(round2(0.07 * 0.85));
    expect(round2(r.outsideReturn)).toBe(round2(0.07 * (1 - r.withoutSacrifice.marginalRate)));
  });

  it('still favours sacrificing, but by a defensible margin', () => {
    expect(r.projectionDelta).toBeGreaterThan(0);
    expect(r.finalWith).toBeGreaterThan(r.finalWithout);
    expect(r.projectionDelta / r.finalWith).toBeLessThan(0.2);
  });

  it('is flat when nothing is sacrificed', () => {
    const none = calcSalarySacrifice({ ...base, grossSalary: 120000, sacrificeAmount: 0, superBalance: 100000 });
    expect(none.annualTaxSaving).toBe(0);
    expect(none.netTakeHomeCost).toBe(0);
    expect(none.finalWith).toBe(none.finalWithout);
    expect(none.savingRate).toBe(0);
  });

  it('spans horizon + 1 points and clamps to 40 years', () => {
    expect(r.projectionData).toHaveLength(21);
    const long = calcSalarySacrifice({ ...base, grossSalary: 120000, sacrificeAmount: 10000, horizonYears: 90 });
    expect(long.projectionData).toHaveLength(41);
  });
});

describe('§4.2 Division 296 — flag, do not compute', () => {
  it('flags a projected balance over $3m without computing a liability', () => {
    const r = calcSalarySacrifice({
      ...base, grossSalary: 300000, sacrificeAmount: 15000,
      superBalance: 2000000, horizonYears: 20,
    });
    expect(r.division296Flag.triggered).toBe(true);
    expect(r.division296Flag.threshold).toBe(3000000);
    expect(r.division296Flag.compute).toBe(false);
    expect(r.division296Flag.note).toMatch(/does not model it|flags it but does not model/);
    expect(r.division296Flag).not.toHaveProperty('liability');
  });

  it('stays quiet below the threshold', () => {
    const r = calcSalarySacrifice({ ...base, grossSalary: 90000, sacrificeAmount: 5000, superBalance: 50000 });
    expect(r.division296Flag.triggered).toBe(false);
  });

  it('records the deferral decision in the vectors rather than asserting a figure', () => {
    expect(division296[0].note).toMatch(/flag only, do not compute/);
  });
});

describe('return shape', () => {
  const r = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000 });

  it('spells fortnightlyCost correctly and derives it from the net cost', () => {
    expect(r).not.toHaveProperty('fortnigthlyCost');
    expect(round2(r.fortnightlyCost)).toBe(round2(r.netTakeHomeCost / 26));
    expect(round2(r.monthlyCost)).toBe(round2(r.netTakeHomeCost / 12));
  });

  it('uses age rather than carrying it as a dead input', () => {
    const older = calcSalarySacrifice({ ...base, grossSalary: 100000, sacrificeAmount: 5000, age: 58 });
    expect(older.yearsToPreservation).not.toBe(r.yearsToPreservation);
  });
});
