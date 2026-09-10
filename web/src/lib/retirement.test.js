// Retirement / super projection.
//
// The §8.12 Age Pension vectors drive the means testing. Everything else here
// is the behaviour the vectors do not reach — salary growth, the concessional
// cap, Division 293, decumulation to depletion, and the real/nominal split.
//
// The two [trap] vectors are the ones worth reading twice:
//   - free areas and deeming THRESHOLDS are 1 July figures and do NOT move on
//     20 September; rates and the upper cut-offs do;
//   - both means tests must be calculated and the LOWER result paid.

import { describe, it, expect } from 'vitest';
import {
  calcRetirement,
  explainRetirement,
  agePensionEntitlement,
  deemedIncome,
  minimumDrawdownFactor,
  normaliseStatus,
  ASFA_RETIREMENT_STANDARD,
} from './retirement.js';
import { pensionRates, deeming, indexationAndMethod } from './vectors/agePension.vectors.js';
import { ratesFor } from './rates/index.js';

const BEFORE = '2026-09-19';   // pre-indexation window
const AFTER  = '2026-09-20';   // 20 September indexation
const R_BEFORE = ratesFor(BEFORE);
const R_AFTER  = ratesFor(AFTER);

const round2 = (n) => Math.round(n * 100) / 100;

// The published anchors write assets as a phrase when the point is only that
// the assets test is not binding.
const assetsOf = (v) => (typeof v === 'number' ? v : 0);

const base = {
  date: AFTER,
  currentAge: 35,
  retirementAge: 65,
  currentBalance: 80000,
  grossSalary: 90000,
  salaryGrowth: 3,
  sgRate: 12,
  extraContributions: 0,
  investmentReturn: 7,
  inflationRate: 2.5,
  feePercent: 0.5,
  feeFlat: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.12 Age Pension — published anchors [calc]', () => {
  it.each(pensionRates)('$note', ({ input, expected }) => {
    const r = agePensionEntitlement({
      status: input.status,
      homeowner: input.homeowner ?? true,
      assets: assetsOf(input.assets),
      incomePerFortnight: input.incomePerFortnight,
      date: input.from,
    });
    expect(r.fortnightly).toBe(expected);
  });

  it('names the binding test on each anchor', () => {
    // Anchors 1-2 are income-bound (assets nil); 3-4 are assets-bound (no income).
    expect(agePensionEntitlement({ status: 'Single', assets: 0, incomePerFortnight: 1000, date: AFTER }).bindingTest).toBe('income');
    expect(agePensionEntitlement({ status: 'Couple combined', assets: 0, incomePerFortnight: 2000, date: AFTER }).bindingTest).toBe('income');
    expect(agePensionEntitlement({ status: 'Single', homeowner: true, assets: 500000, incomePerFortnight: 0, date: AFTER }).bindingTest).toBe('assets');
    expect(agePensionEntitlement({ status: 'Couple combined', homeowner: true, assets: 800000, incomePerFortnight: 0, date: AFTER }).bindingTest).toBe('assets');
  });
});

describe('§8.12 deeming [calc]', () => {
  it.each(deeming)('$note', ({ input, expected }) => {
    const date = input.date.includes('to ') ? BEFORE : AFTER;
    const d = deemedIncome({ financialAssets: input.financialAssets, status: input.status, date });
    expect(d.perYear).toBe(expected.perYear);
    expect(d.perFortnight).toBe(expected.perFortnight);
  });

  it('uses the couple threshold on combined financial assets', () => {
    const d = deemedIncome({ financialAssets: 200000, status: 'Couple combined', date: AFTER });
    // $110,600 × 1.75% + $89,400 × 3.75%
    expect(d.threshold).toBe(110600);
    expect(d.perYear).toBe(round2(110600 * 0.0175 + 89400 * 0.0375));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.12 [trap] the 20 September indexation moves rates, not free areas', () => {
  const [trapIndexation, trapMethod] = indexationAndMethod;

  it(trapIndexation.note, () => {
    const { incomeFreeAreas, deemingThresholds } = trapIndexation.input;

    // Unchanged across the boundary — these are 1 July figures.
    expect(R_BEFORE.agePension.incomeFreeAreaSingle).toBe(incomeFreeAreas.single);
    expect(R_AFTER.agePension.incomeFreeAreaSingle).toBe(incomeFreeAreas.single);
    expect(R_BEFORE.agePension.incomeFreeAreaCouple).toBe(incomeFreeAreas.couple);
    expect(R_AFTER.agePension.incomeFreeAreaCouple).toBe(incomeFreeAreas.couple);
    expect(R_BEFORE.agePension.deemingThresholdSingle).toBe(deemingThresholds.single);
    expect(R_AFTER.agePension.deemingThresholdSingle).toBe(deemingThresholds.single);
    expect(R_BEFORE.agePension.deemingThresholdCouple).toBe(deemingThresholds.couple);
    expect(R_AFTER.agePension.deemingThresholdCouple).toBe(deemingThresholds.couple);

    // Changed on the same date — rates and the upper cut-offs.
    expect(R_BEFORE.agePension.maxRateSingle).toBe(1200.90);
    expect(R_AFTER.agePension.maxRateSingle).toBe(1237.70);
    expect(R_BEFORE.agePension.deemingLowerRate).toBe(0.0125);
    expect(R_AFTER.agePension.deemingLowerRate).toBe(0.0175);
    expect(R_BEFORE.agePension.deemingUpperRate).toBe(0.0325);
    expect(R_AFTER.agePension.deemingUpperRate).toBe(0.0375);
    expect(R_AFTER.agePension.assetsCutOffSingleHomeowner).toBe(745750);
  });

  it('[trap] the deemed income on the same assets differs by date, the threshold does not', () => {
    const before = deemedIncome({ financialAssets: 200000, date: BEFORE });
    const after  = deemedIncome({ financialAssets: 200000, date: AFTER });
    expect(before.threshold).toBe(after.threshold);         // 1 July figure
    expect(before.perYear).toBe(5164);                       // 1.25% / 3.25%
    expect(after.perYear).toBe(6164);                        // 1.75% / 3.75%
  });

  it('[trap] the income free area does NOT move, so the same income is assessed identically', () => {
    const before = agePensionEntitlement({ status: 'single', incomePerFortnight: 1000, date: BEFORE });
    const after  = agePensionEntitlement({ status: 'single', incomePerFortnight: 1000, date: AFTER });
    expect(before.incomeTest.freeArea).toBe(226);
    expect(after.incomeTest.freeArea).toBe(226);
    expect(before.incomeTest.reduction).toBe(387);
    expect(after.incomeTest.reduction).toBe(387);
    // Only the max rate moved, so the entitlement moves by exactly that.
    expect(round2(after.fortnightly - before.fortnightly)).toBe(round2(1237.70 - 1200.90));
  });

  it('[trap] a date-keyed lookup resolves the boundary, not the financial year', () => {
    expect(ratesFor('2026-07-01').agePension.effective_from).toBe('2026-07-01');
    expect(ratesFor('2026-09-19').agePension.effective_from).toBe('2026-07-01');
    expect(ratesFor('2026-09-20').agePension.effective_from).toBe('2026-09-20');
    expect(ratesFor('2027-06-30').agePension.effective_from).toBe('2026-09-20');
  });

  it(trapMethod.note, () => {
    // Assets bind: modest income, large assets.
    const assetsBound = agePensionEntitlement({
      status: 'single', homeowner: true, assets: 600000, incomePerFortnight: 300, date: AFTER,
    });
    expect(assetsBound.incomeTest.result).toBe(1200.70);   // 1237.70 − 0.5×74
    expect(assetsBound.assetsTest.result).toBe(436.70);    // 1237.70 − 267×3
    expect(assetsBound.fortnightly).toBe(436.70);
    expect(assetsBound.bindingTest).toBe('assets');

    // Income binds: large income, modest assets.
    const incomeBound = agePensionEntitlement({
      status: 'single', homeowner: true, assets: 350000, incomePerFortnight: 1800, date: AFTER,
    });
    expect(incomeBound.incomeTest.result).toBe(450.70);    // 1237.70 − 0.5×1574
    expect(incomeBound.assetsTest.result).toBe(1186.70);   // 1237.70 − 17×3
    expect(incomeBound.fortnightly).toBe(450.70);
    expect(incomeBound.bindingTest).toBe('income');

    // Both are always computed and exposed, whichever binds.
    for (const r of [assetsBound, incomeBound]) {
      expect(r.incomeTest.result).toBeGreaterThan(0);
      expect(r.assetsTest.result).toBeGreaterThan(0);
      expect(r.fortnightly).toBe(Math.min(r.incomeTest.result, r.assetsTest.result));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Age Pension — the cases the old super-balance-only check got wrong', () => {
  it('uses couple thresholds for a couple, not single ones', () => {
    const single = agePensionEntitlement({ status: 'single', assets: 480000, date: AFTER });
    const couple = agePensionEntitlement({ status: 'couple', assets: 480000, date: AFTER });
    // $480k is well past the single free area but under the couple one.
    expect(single.assetsTest.freeArea).toBe(333000);
    expect(couple.assetsTest.freeArea).toBe(499000);
    expect(couple.full).toBe(true);
    expect(single.full).toBe(false);
  });

  it('uses the non-homeowner free area, which is much higher', () => {
    const owner = agePensionEntitlement({ status: 'single', homeowner: true, assets: 550000, date: AFTER });
    const renter = agePensionEntitlement({ status: 'single', homeowner: false, assets: 550000, date: AFTER });
    expect(owner.assetsTest.freeArea).toBe(333000);
    expect(renter.assetsTest.freeArea).toBe(600000);
    expect(renter.fortnightly).toBeGreaterThan(owner.fortnightly);
    expect(renter.full).toBe(true);
  });

  it('deems financial assets into the income test — often the binding constraint', () => {
    // A single non-homeowner with $560k of financial assets is inside the
    // assets free area, but deeming still cuts the payment.
    const r = agePensionEntitlement({
      status: 'single', homeowner: false, assets: 560000, financialAssets: 560000, date: AFTER,
    });
    expect(r.assetsTest.result).toBe(1237.70);          // under the free area
    expect(r.deemed.perYear).toBe(round2(66800 * 0.0175 + 493200 * 0.0375));
    expect(r.bindingTest).toBe('income');
    expect(r.fortnightly).toBeLessThan(1237.70);
    expect(r.fortnightly).toBe(r.incomeTest.result);
  });

  it('pays nil past the published assets cut-off', () => {
    expect(agePensionEntitlement({ status: 'single', assets: 745750, date: AFTER }).fortnightly).toBe(0);
    // The taper reaches zero at $745,567, a little short of the published
    // $745,750 cut-off — so both the taper and the cut-off have to be applied.
    expect(agePensionEntitlement({ status: 'single', assets: 745000, date: AFTER }).fortnightly).toBe(1.70);
    expect(agePensionEntitlement({ status: 'single', assets: 745600, date: AFTER }).fortnightly).toBe(0);
    expect(agePensionEntitlement({ status: 'couple', assets: 1121000, date: AFTER }).fortnightly).toBe(0);
  });

  it('pays nil below Age Pension age', () => {
    const r = agePensionEntitlement({ status: 'single', assets: 100000, age: 66, date: AFTER });
    expect(r.eligibleByAge).toBe(false);
    expect(r.fortnightly).toBe(0);
    expect(r.bindingTest).toBe('ineligible');
    expect(agePensionEntitlement({ status: 'single', assets: 100000, age: 67, date: AFTER }).fortnightly).toBe(1237.70);
  });

  it('reports the couple estimate as unavailable in the pre-September window rather than inventing a rate', () => {
    const r = agePensionEntitlement({ status: 'couple', assets: 0, date: BEFORE });
    expect(r.estimateUnavailable).toBe(true);
    expect(r.fortnightly).toBeNull();
    // Singles are still answerable in that window.
    expect(agePensionEntitlement({ status: 'single', assets: 0, date: BEFORE }).fortnightly).toBe(1200.90);
  });

  it('derives a cut-out only where the registry has none, and flags that it did', () => {
    const after = agePensionEntitlement({ status: 'single', date: AFTER });
    expect(after.incomeTest.cutOut).toBe(2701.40);
    expect(after.incomeTest.cutOutDerived).toBe(false);
    const before = agePensionEntitlement({ status: 'single', date: BEFORE });
    expect(before.incomeTest.cutOutDerived).toBe(true);
    expect(before.assetsTest.cutOffDerived).toBe(true);
  });

  it('normalises the status labels the vectors use', () => {
    expect(normaliseStatus('Couple combined')).toBe('couple');
    expect(normaliseStatus('Single')).toBe('single');
    expect(normaliseStatus(undefined)).toBe('single');
  });

  it('does not model the Work Bonus — the audit records it as unverified', () => {
    expect(agePensionEntitlement({ status: 'single', date: AFTER }).workBonusModelled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('salary growth', () => {
  it('grows salary each year, so contributions rise with it', () => {
    const r = calcRetirement({ ...base, salaryGrowth: 3 });
    const first = r.path[0];
    const second = r.path[1];
    expect(first.salary).toBe(90000);
    expect(second.salary).toBe(Math.round(90000 * 1.03));
    expect(second.contribution).toBeGreaterThan(first.contribution);
  });

  it('a flat salary understates the balance — the bug the old version had', () => {
    const flat = calcRetirement({ ...base, salaryGrowth: 0 });
    const grown = calcRetirement({ ...base, salaryGrowth: 3 });
    expect(grown.projectedBalance).toBeGreaterThan(flat.projectedBalance);
    // 30 years of 3% on a 12% SG is not a rounding difference.
    expect(grown.projectedBalance / flat.projectedBalance).toBeGreaterThan(1.2);
  });

  it('respects the annual maximum contribution base as salary grows past it', () => {
    const r = calcRetirement({ ...base, grossSalary: 260000, salaryGrowth: 3, extraContributions: 0 });
    const capped = r.path.filter((p) => p.phase === 'accumulation' && p.salary > 270830);
    expect(capped.length).toBeGreaterThan(0);
    const sgCap = 270830 * 0.12 * 0.85;
    for (const p of capped) expect(p.contribution).toBeLessThanOrEqual(Math.round(sgCap) + 1);
  });

  it('indexes extra contributions with salary when asked, and holds them flat when not', () => {
    const indexed = calcRetirement({ ...base, extraContributions: 5000, indexExtraContributions: true });
    const flat = calcRetirement({ ...base, extraContributions: 5000, indexExtraContributions: false });
    expect(indexed.projectedBalance).toBeGreaterThan(flat.projectedBalance);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('real vs nominal', () => {
  it('returns both, and the real figure is the nominal deflated by inflation', () => {
    const r = calcRetirement({ ...base, inflationRate: 2.5 });
    expect(r.inflationFactor).toBeCloseTo(Math.pow(1.025, 30), 10);
    expect(r.realBalance).toBe(Math.round(r.projectedBalance / r.inflationFactor));
    expect(r.realBalance).toBeLessThan(r.projectedBalance);
  });

  it('the gap is the whole point — ~$1.2m nominal is ~$573k real at 2.5% over 30 years', () => {
    const nominal = 1200000;
    const real = nominal / Math.pow(1.025, 30);
    // The audit quotes ~$573k; the exact figure is $572,091.
    expect(Math.round(real)).toBe(572091);
    expect(real / 1000).toBeCloseTo(573, -1);
  });

  it('zero inflation collapses the two', () => {
    const r = calcRetirement({ ...base, inflationRate: 0 });
    expect(r.realBalance).toBe(r.projectedBalance);
    expect(r.inflationFactor).toBe(1);
  });

  it('gives the chart both bases with the same keys', () => {
    const r = calcRetirement({ ...base });
    expect(r.chartDataNominal).toHaveLength(r.path.length);
    expect(r.chartDataReal).toHaveLength(r.path.length);
    expect(Object.keys(r.chartDataReal[0])).toEqual(['age', 'Balance', 'Without extra']);
    const last = r.chartDataReal[r.chartDataReal.length - 1];
    const lastNom = r.chartDataNominal[r.chartDataNominal.length - 1];
    expect(last.Balance).toBeLessThan(lastNom.Balance);
    expect(r.chartData).toBe(r.chartDataNominal);   // legacy alias
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('concessional cap', () => {
  it('warns when SG plus extra contributions exceed $32,500', () => {
    const r = calcRetirement({ ...base, grossSalary: 200000, extraContributions: 15000, extraIsPreTax: true });
    expect(r.contributionCap.concessionalCap).toBe(32500);
    expect(r.contributionCap.totalConcessional).toBe(24000 + 15000);
    expect(r.contributionCap.exceeded).toBe(true);
    expect(r.contributionCap.excess).toBe(6500);
  });

  it('does not warn when the contributions fit', () => {
    const r = calcRetirement({ ...base, grossSalary: 90000, extraContributions: 5000, extraIsPreTax: true });
    expect(r.contributionCap.exceeded).toBe(false);
    expect(r.contributionCap.headroom).toBe(32500 - 90000 * 0.12);
  });

  it('after-tax contributions do not touch the concessional cap but do hit the non-concessional one', () => {
    const r = calcRetirement({ ...base, grossSalary: 200000, extraContributions: 15000, extraIsPreTax: false });
    expect(r.contributionCap.exceeded).toBe(false);
    expect(r.contributionCap.nonConcessionalExceeded).toBe(false);
    const big = calcRetirement({ ...base, extraContributions: 150000, extraIsPreTax: false });
    expect(big.contributionCap.nonConcessionalCap).toBe(130000);
    expect(big.contributionCap.nonConcessionalExceeded).toBe(true);
    expect(big.contributionCap.nonConcessionalExcess).toBe(20000);
  });

  it('lifts the cap by the carry-forward amount when it is claimed and the balance test passes', () => {
    const r = calcRetirement({
      ...base, currentBalance: 200000, grossSalary: 200000,
      extraContributions: 15000, priorUnusedCap: 20000, useCarryForward: true,
    });
    expect(r.contributionCap.carryForward.eligible).toBe(true);
    expect(r.contributionCap.effectiveCap).toBe(52500);
    expect(r.contributionCap.exceeded).toBe(false);
  });

  it('refuses carry-forward once the total super balance reaches $500,000', () => {
    const r = calcRetirement({
      ...base, currentBalance: 500000, grossSalary: 200000,
      extraContributions: 15000, priorUnusedCap: 20000, useCarryForward: true,
    });
    expect(r.contributionCap.carryForward.eligible).toBe(false);
    expect(r.contributionCap.effectiveCap).toBe(32500);
    expect(r.contributionCap.exceeded).toBe(true);
  });

  it('indexes the cap through the projection rather than crying breach on salary growth alone', () => {
    // $90k salary, $0 extra: SG never approaches the cap, indexed or not.
    expect(calcRetirement({ ...base }).contributionCap.firstBreachAge).toBeNull();
    // A salary already at the contribution base does breach, and reports when.
    const r = calcRetirement({ ...base, grossSalary: 280000, extraContributions: 12000 });
    expect(r.contributionCap.firstBreachAge).toBe(35);
    expect(r.contributionCap.capIndexationAssumed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Division 293', () => {
  it('does not apply below $250,000', () => {
    const r = calcRetirement({ ...base, grossSalary: 150000, extraContributions: 5000 });
    expect(r.division293Applies).toBe(false);
    expect(r.division293).toBe(0);
  });

  it('applies 15% to the lesser of the excess or the concessional contributions', () => {
    const r = calcRetirement({ ...base, grossSalary: 300000, extraContributions: 0, extraIsPreTax: true });
    const pay = r.path[0];
    expect(r.division293Threshold).toBe(250000);
    expect(r.division293Applies).toBe(true);
    // Taxable income ~$299,000 after the standard work deduction, plus $32,499.60
    // of SG, so the excess exceeds the contributions — 15% of the contributions.
    expect(Math.round(r.division293)).toBe(Math.round(270830 * 0.12 * 0.15));
    expect(pay.phase).toBe('accumulation');
  });

  it('caps the liability at 15% of the excess when the excess is the smaller number', () => {
    const r = calcRetirement({ ...base, grossSalary: 240000, extraContributions: 0 });
    // Taxable income $239,000 (standard deduction) + $28,800 SG = $267,800.
    expect(Math.round(r.division293)).toBe(Math.round((267800 - 250000) * 0.15));
  });

  it('accumulates over the projection and can optionally be released from super', () => {
    const personal = calcRetirement({ ...base, grossSalary: 300000, division293FromSuper: false });
    const fromSuper = calcRetirement({ ...base, grossSalary: 300000, division293FromSuper: true });
    expect(personal.division293Total).toBeGreaterThan(personal.division293);
    expect(fromSuper.projectedBalance).toBeLessThan(personal.projectedBalance);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('preservation age', () => {
  it('will not draw super before 60 even if the user retires earlier', () => {
    const r = calcRetirement({ ...base, currentAge: 50, retirementAge: 55 });
    expect(r.preservationAge).toBe(60);
    expect(r.accessAge).toBe(60);
    expect(r.beforePreservation).toBe(true);
    expect(r.preservationWarning).toMatch(/Preservation age is 60/);
    const preserved = r.path.filter((p) => p.phase === 'preserved').map((p) => p.age);
    expect(preserved).toEqual([55, 56, 57, 58, 59]);
    for (const p of r.path.filter((x) => x.age < 60)) expect(p.withdrawal).toBe(0);
  });

  it('compounds untouched through the gap — no salary, no contributions, no drawdown', () => {
    const r = calcRetirement({ ...base, currentAge: 50, retirementAge: 55, extraContributions: 0, feeFlat: 0 });
    const at55 = r.path.find((p) => p.age === 55);
    const at56 = r.path.find((p) => p.age === 56);
    expect(at55.contribution).toBe(0);
    expect(at56.balance).toBeGreaterThan(at55.balance);
  });

  it('has no warning at or after preservation age', () => {
    const r = calcRetirement({ ...base, retirementAge: 65 });
    expect(r.beforePreservation).toBe(false);
    expect(r.preservationWarning).toBeNull();
    expect(r.accessAge).toBe(65);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('minimum drawdown and depletion', () => {
  it('uses the legislated age-banded factors, which rise', () => {
    const rates = R_AFTER;
    expect(minimumDrawdownFactor(60, rates)).toBe(0.04);
    expect(minimumDrawdownFactor(64, rates)).toBe(0.04);
    expect(minimumDrawdownFactor(65, rates)).toBe(0.05);
    expect(minimumDrawdownFactor(74, rates)).toBe(0.05);
    expect(minimumDrawdownFactor(75, rates)).toBe(0.06);
    expect(minimumDrawdownFactor(80, rates)).toBe(0.07);
    expect(minimumDrawdownFactor(85, rates)).toBe(0.09);
    expect(minimumDrawdownFactor(90, rates)).toBe(0.11);
    expect(minimumDrawdownFactor(95, rates)).toBe(0.14);
    expect(minimumDrawdownFactor(101, rates)).toBe(0.14);
  });

  it('draws the minimum year by year, not a flat 4% forever', () => {
    const r = calcRetirement({ ...base, drawdownMode: 'minimum', planToAge: 90 });
    const at65 = r.path.find((p) => p.age === 65);
    const at80 = r.path.find((p) => p.age === 80);
    expect(at65.minimumFactor).toBe(0.05);
    expect(at80.minimumFactor).toBe(0.07);
    expect(at65.withdrawal).toBe(Math.round(at65.balance * 0.05));
    expect(at80.withdrawal).toBe(Math.round(at80.balance * 0.07));
  });

  it('at the minimum only, the balance is never exhausted — a real and useful finding', () => {
    const r = calcRetirement({ ...base, drawdownMode: 'minimum', planToAge: 95, feeFlat: 0 });
    expect(r.runsOut).toBe(false);
    expect(r.depletionAge).toBeNull();
    expect(r.moneyLastsToAge).toBe(95);
  });

  it('reports the age the money runs out when a target income outruns it', () => {
    const r = calcRetirement({
      ...base, currentAge: 64, retirementAge: 65, currentBalance: 300000,
      grossSalary: 0, drawdownMode: 'target', targetIncome: 60000,
      includeAgePension: false, planToAge: 95, investmentReturn: 5, inflationRate: 2.5,
    });
    expect(r.runsOut).toBe(true);
    expect(r.depletionAge).toBeGreaterThan(65);
    expect(r.depletionAge).toBeLessThan(80);
    const after = r.path.filter((p) => p.age >= r.depletionAge);
    for (const p of after) {
      expect(p.balance).toBe(0);
      expect(p.withdrawal).toBe(0);
    }
    expect(r.milestones.some((m) => m.label === 'Runs out')).toBe(true);
  });

  it('a target draw never falls below the legislated minimum', () => {
    const r = calcRetirement({
      ...base, currentAge: 64, retirementAge: 65, currentBalance: 2000000,
      drawdownMode: 'target', targetIncome: 40000, includeAgePension: false, planToAge: 85,
    });
    for (const p of r.path.filter((x) => x.phase === 'drawdown')) {
      expect(p.withdrawal).toBeGreaterThanOrEqual(Math.round(p.balance * p.minimumFactor) - 1);
    }
  });

  it('the Age Pension supplements the drawdown from 67 and lengthens the money', () => {
    const withP = calcRetirement({
      ...base, currentAge: 64, retirementAge: 65, currentBalance: 400000,
      drawdownMode: 'target', targetIncome: 55000, includeAgePension: true, planToAge: 95,
    });
    const withoutP = calcRetirement({ ...withP, includeAgePension: false });
    expect(withP.path.find((p) => p.age === 66).agePension).toBe(0);   // under pension age
    expect(withP.path.find((p) => p.age === 70).agePension).toBeGreaterThan(0);
    expect(withP.totalPensionReceived).toBeGreaterThan(0);
    expect(withoutP.totalPensionReceived).toBe(0);
    expect(withP.moneyLastsToAge).toBeGreaterThan(withoutP.moneyLastsToAge);
  });

  it('applies the means tests in today\'s dollars — a nominal balance against 2026 thresholds pays nobody', () => {
    // $20k at 35 on $60k grows to ~$826k nominal but only ~$394k real. Tested
    // nominally it would be past the $745,750 cut-off and paid nil; tested in
    // today's dollars it is a part pension.
    const r = calcRetirement({
      ...base, currentBalance: 20000, grossSalary: 60000, salaryGrowth: 2,
      extraContributions: 0, planToAge: 95,
    });
    expect(r.projectedBalance).toBeGreaterThan(745750);
    expect(r.realBalance).toBeLessThan(745750);
    expect(r.agePension.fortnightly).toBeGreaterThan(0);
    expect(r.agePension.fortnightly).toBeLessThan(1237.70);
    // And the nominal cash flow is the real entitlement inflated back.
    const at67 = r.path.find((p) => p.age === 67);
    expect(at67.agePension).toBeGreaterThan(at67.pensionDetail.annual);
  });

  it('assesses the pension against the rates in force when it STARTS, not today', () => {
    // 10 September 2026 resolves to the pre-indexation window, which the
    // registry covers for singles only. A 35-year-old retiring at 65 is paid
    // 2058 rates, so the projection must not be pinned to today's window.
    expect(ratesFor('2026-09-10').agePension.effective_from).toBe('2026-07-01');
    const r = calcRetirement({ ...base, date: '2026-09-10', relationshipStatus: 'couple' });
    expect(r.agePensionEffectiveFrom).toBe('2026-09-20');
    expect(r.agePension.estimateUnavailable).toBe(false);
    expect(r.agePension.maxRateFortnightly).toBe(1866.00);
    // The projection itself still resolves super against the date given.
    expect(r.rates.__date).toBe('2026-09-10');
  });

  it('exposes the first retirement year in both bases', () => {
    const r = calcRetirement({ ...base, planToAge: 90 });
    expect(r.firstYearIncome).toBe(r.firstYearDrawdown + r.firstYearPension);
    expect(r.firstYearIncomeReal).toBeLessThan(r.firstYearIncome);
    expect(r.firstYearMinimumFactor).toBe(0.05);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('fees', () => {
  it('supports a flat dollar admin fee alongside the percentage', () => {
    const pctOnly = calcRetirement({ ...base, feePercent: 0.5, feeFlat: 0 });
    const both = calcRetirement({ ...base, feePercent: 0.5, feeFlat: 100 });
    expect(both.projectedBalance).toBeLessThan(pctOnly.projectedBalance);
  });

  it('treats insurance premiums as the same kind of drag', () => {
    const noIns = calcRetirement({ ...base, feeFlat: 100, insurancePremium: 0 });
    const withIns = calcRetirement({ ...base, feeFlat: 100, insurancePremium: 500 });
    expect(withIns.projectedBalance).toBeLessThan(noIns.projectedBalance);
  });

  it('still accepts the old percentage-only `fees` field', () => {
    const legacy = calcRetirement({ ...base, feePercent: undefined, fees: 0.5, feeFlat: 0 });
    const current = calcRetirement({ ...base, feePercent: 0.5, feeFlat: 0 });
    expect(legacy.projectedBalance).toBe(current.projectedBalance);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Division 296 — flag, do not compute', () => {
  it('does not compute anything', () => {
    const r = calcRetirement({ ...base, currentBalance: 2500000, grossSalary: 300000 });
    expect(r.division296Flag.compute).toBe(false);
    expect(r.division296Flag).not.toHaveProperty('tax');
    expect(r.division296Flag.note).toMatch(/does not model it/);
  });

  it('flags a projected balance crossing $3m, and says where', () => {
    const r = calcRetirement({ ...base, currentBalance: 1500000, grossSalary: 250000, planToAge: 90 });
    expect(r.division296Flag.triggered).toBe(true);
    expect(r.division296Flag.threshold).toBe(3000000);
    expect(r.division296Flag.ageAtCrossing).toBeGreaterThan(35);
    expect(r.division296Flag.peakBalance).toBeGreaterThanOrEqual(3000000);
  });

  it('does not flag a balance that never gets there', () => {
    const r = calcRetirement({ ...base, currentBalance: 50000, grossSalary: 70000 });
    expect(r.division296Flag.triggered).toBe(false);
    expect(r.division296Flag.ageAtCrossing).toBeNull();
  });

  it('also reports the threshold indexed in $150,000 increments, since a nominal comparison over-flags', () => {
    const r = calcRetirement({ ...base, currentBalance: 500000, inflationRate: 2.5 });
    expect(r.division296Flag.indexationIncrement).toBe(150000);
    expect(r.division296Flag.thresholdIndexed).toBeGreaterThan(3000000);
    expect(r.division296Flag.thresholdIndexed % 150000).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('transfer balance cap', () => {
  it('taxes earnings on the share above $2.1m that cannot enter retirement phase', () => {
    const r = calcRetirement({ ...base, currentBalance: 2000000, grossSalary: 250000, planToAge: 80 });
    expect(r.transferBalanceCap).toBe(2100000);
    expect(r.aboveTransferBalanceCap).toBe(true);
    expect(r.retirementPhaseShare).toBeLessThan(1);
    expect(r.retirementPhaseShare).toBeCloseTo(2100000 / r.projectedBalance, 6);
  });

  it('leaves a balance under the cap wholly in retirement phase', () => {
    const r = calcRetirement({ ...base, planToAge: 80 });
    expect(r.aboveTransferBalanceCap).toBe(false);
    expect(r.retirementPhaseShare).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ASFA reference lines', () => {
  it('carries the standard as indicative, labelled, and not from the rates audit', () => {
    expect(ASFA_RETIREMENT_STANDARD.source).toBe('ASFA Retirement Standard');
    expect(ASFA_RETIREMENT_STANDARD.confidence).toBe('UNVERIFIED');
    expect(ASFA_RETIREMENT_STANDARD.note).toMatch(/indicative/);
  });

  it('compares against the REAL balance — ASFA figures are in today\'s dollars', () => {
    const r = calcRetirement({ ...base, currentBalance: 400000, extraContributions: 15000 });
    expect(r.asfa.comfortableLumpSum).toBe(595000);
    expect(r.asfa.meetsComfortable).toBe(r.realBalance >= 595000);
    expect(r.asfa.comfortableLumpSumNominal).toBe(Math.round(595000 * r.inflationFactor));
    expect(r.asfa.comfortableLumpSumNominal).toBeGreaterThan(595000);
  });

  it('switches to the couple figures with relationship status', () => {
    const single = calcRetirement({ ...base, relationshipStatus: 'single' });
    const couple = calcRetirement({ ...base, relationshipStatus: 'couple' });
    expect(single.asfa.comfortableLumpSum).toBe(595000);
    expect(couple.asfa.comfortableLumpSum).toBe(690000);
    expect(couple.asfa.comfortableAnnual).toBe(73875);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('milestones and housekeeping', () => {
  it('computes milestones the UI can render instead of a hardcoded [50, 55, 60]', () => {
    const r = calcRetirement({ ...base, currentAge: 35, retirementAge: 65, planToAge: 90 });
    expect(r.milestoneAges).toContain(60);   // preservation
    expect(r.milestoneAges).toContain(65);   // retirement
    expect(r.milestoneAges).toContain(67);   // Age Pension
    expect(r.milestones.map((m) => m.age)).toEqual([...r.milestoneAges].sort((a, b) => a - b));
    for (const m of r.milestones) expect(m.age).toBeGreaterThan(35);
  });

  it('drops milestones already behind the user', () => {
    const r = calcRetirement({ ...base, currentAge: 68, retirementAge: 68, planToAge: 90 });
    expect(r.milestoneAges).not.toContain(60);
    expect(r.milestoneAges).not.toContain(67);
  });

  it('surfaces the Payday Super basis rather than silently assuming quarterly OTE', () => {
    const r = calcRetirement({ ...base });
    expect(r.paydaySuper.inForce).toBe(true);
    expect(r.paydaySuper.earningsBase).toBe('qualifyingEarnings');
  });

  it('carries the resolved rate set for the methodology note', () => {
    const r = calcRetirement({ ...base });
    expect(r.rates.__fy).toBe('2026-27');
    expect(r.rates.agePension.effective_from).toBe('2026-09-20');
    expect(r.rates.superannuation.concessionalCap).toBe(32500);
  });

  it('handles a user already past retirement age without producing nonsense', () => {
    const r = calcRetirement({ ...base, currentAge: 70, retirementAge: 65, currentBalance: 500000, planToAge: 90 });
    expect(r.accessAge).toBe(70);
    expect(r.yearsToRetire).toBe(0);
    expect(r.projectedBalance).toBe(500000);
    expect(r.path[0].phase).toBe('drawdown');
  });

  it('never returns a negative balance', () => {
    const r = calcRetirement({
      ...base, currentAge: 64, retirementAge: 65, currentBalance: 50000, grossSalary: 0,
      drawdownMode: 'target', targetIncome: 90000, includeAgePension: false, planToAge: 95,
    });
    for (const p of r.path) expect(p.balance).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workings — "show me how you got there".
//
// Two things are asserted throughout: that the panel's totals are the SAME
// numbers the result object carries (no second, quietly divergent calculation),
// and that wherever component lines sit above a total, they add up to it.

const allSteps = (w) => w.sections.flatMap((s) => s.steps);
const headings = (w) => w.sections.map((s) => s.heading);
const sec = (w, re) => w.sections.find((s) => re.test(s.heading));
const find = (w, re) => allSteps(w).find((s) => re.test(s.label));
const inSec = (w, sre, lre) => sec(w, sre).steps.find((s) => lre.test(s.label));
const notesOf = (w) => allSteps(w).filter((s) => s.kind === 'note').map((s) => s.label).join(' ');

describe('explainRetirement', () => {
  const inputs = {
    ...base, currentAge: 35, retirementAge: 65, currentBalance: 80000,
    grossSalary: 90000, extraContributions: 5000, feeFlat: 100, investmentReturn: 7,
    feePercent: 0.5, inflationRate: 2.5,
  };
  const result = calcRetirement(inputs);
  const w = explainRetirement(result, inputs);

  it('produces the sections the panel needs', () => {
    expect(headings(w)).toContain('Contributions in year one');
    expect(headings(w)).toContain('The return the balance earns');
    expect(headings(w)).toContain(`Compounding to age ${result.accessAge}`);
    expect(headings(w)).toContain("What that is worth in today's money");
    expect(headings(w)).toContain('Age Pension — the income test');
    expect(headings(w)).toContain('Age Pension — the assets test');
    expect(headings(w)).toContain('Which test binds');
  });

  it('year one: employer plus personal reconciles to the concessional subtotal', () => {
    const employer = find(w, /^Employer super/).value;
    const personal = find(w, /^Your before-tax contributions$/).value;
    const sub = find(w, /^Concessional contributions$/).value;
    expect(employer + personal).toBeCloseTo(sub, 6);
    expect(sub).toBeCloseTo(result.contributionCap.totalConcessional, 6);
    expect(employer).toBeCloseTo(result.sgContributionYearOne, 6);
  });

  it('year one: the 15% contributions tax takes the subtotal to the amount landing in the fund', () => {
    const sub = find(w, /^Concessional contributions$/).value;
    const tax = find(w, /contributions tax at/).value;
    const into = find(w, /^Into your fund in year one$/).value;
    expect(tax).toBeCloseTo(-sub * result.rates.superannuation.contributionsTax, 6);
    expect(sub + tax).toBeCloseTo(into, 6);
    // And it is the same figure the projection actually credited.
    expect(into).toBeCloseTo(result.path[0].contribution, 0);
  });

  it('nets the fee percentage off the investment return', () => {
    const pctOf = (s) => parseFloat(String(s.value));
    expect(pctOf(find(w, /^Investment return$/))).toBeCloseTo(7, 6);
    expect(pctOf(find(w, /^less investment fees$/))).toBeCloseTo(-0.5, 6);
    expect(pctOf(find(w, /^Net return/))).toBeCloseTo(6.5, 6);
  });

  it('the compounding lines add up to the projected balance exactly', () => {
    const s = sec(w, /^Compounding to age/);
    const start = s.steps.find((x) => /^Starting balance$/.test(x.label)).value;
    const contrib = s.steps.find((x) => /^Contributions over/.test(x.label)).value;
    const growth = s.steps.find((x) => /^Investment growth/.test(x.label)).value;
    const tot = s.steps.find((x) => x.kind === 'total').value;
    expect(start + contrib + growth).toBe(tot);
    expect(tot).toBe(result.projectedBalance);
    expect(contrib).toBe(result.totalContributions);
  });

  it('shows nominal and real side by side, with inflation as the only thing between them', () => {
    const nominal = inSec(w, /today's money/, /nominal$/).value;
    const eaten = inSec(w, /today's money/, /^less what inflation takes out/);
    const real = inSec(w, /today's money/, /real$/).value;
    expect(nominal).toBe(result.projectedBalance);
    expect(real).toBe(result.realBalance);
    // The two lines above the total add up to it exactly.
    expect(nominal + eaten.value).toBe(real);
    expect(real).toBeLessThan(nominal);
    // And the erosion is genuinely the inflation factor, not a fudge.
    expect(nominal / result.inflationFactor).toBeCloseTo(real, -1);
    expect(eaten.note).toMatch(/Prices multiply by/);
    expect(sec(w, /today's money/).note).toMatch(/[Ii]nflation/);
  });

  it('the income test lines reconcile to the income test result', () => {
    const s = sec(w, /income test$/);
    const maxRate = s.steps.find((x) => /^Maximum rate/.test(x.label)).value;
    const income = s.steps.find((x) => /^Assessable income/.test(x.label)).value;
    const free = s.steps.find((x) => /income free area$/.test(x.label)).value;
    const excess = s.steps.find((x) => x.kind === 'subtotal').value;
    const reduction = s.steps.find((x) => /^Reduction at/.test(x.label)).value;
    const res = s.steps.find((x) => x.kind === 'total').value;

    expect(Math.max(0, income + free)).toBeCloseTo(excess, 1);
    expect(-reduction).toBeCloseTo(excess * result.agePension.incomeTest.taperPerDollar, 1);
    expect(Math.max(0, maxRate + reduction)).toBeCloseTo(res, 1);
    expect(res).toBe(result.agePension.incomeTest.result);
  });

  it('the assets test lines reconcile to the assets test result', () => {
    const s = sec(w, /assets test$/);
    const maxRate = s.steps.find((x) => /^Maximum rate/.test(x.label)).value;
    const assets = s.steps.find((x) => /^Assessable assets$/.test(x.label)).value;
    const free = s.steps.find((x) => /assets free area$/.test(x.label)).value;
    const excess = s.steps.find((x) => x.kind === 'subtotal').value;
    const reduction = s.steps.find((x) => /^Reduction at/.test(x.label)).value;
    const res = s.steps.find((x) => x.kind === 'total').value;

    expect(Math.max(0, assets + free)).toBeCloseTo(excess, 1);
    expect(-reduction).toBeCloseTo(
      (excess / 1000) * result.agePension.assetsTest.taperPerThousand, 1
    );
    // Past the published cut-off the taper is overridden and the answer is nil.
    if (assets < result.agePension.assetsTest.cutOff) {
      expect(Math.max(0, maxRate + reduction)).toBeCloseTo(res, 1);
    } else {
      expect(res).toBe(0);
    }
    expect(res).toBe(result.agePension.assetsTest.result);
  });

  it('pays the LOWER of the two tests and says which one binds', () => {
    const s = sec(w, /^Which test binds$/);
    const income = s.steps.find((x) => /^Income test$/.test(x.label)).value;
    const assets = s.steps.find((x) => /^Assets test$/.test(x.label)).value;
    const paid = s.steps.find((x) => x.kind === 'total').value;
    const annual = s.steps.find((x) => /^Over a year$/.test(x.label)).value;

    expect(paid).toBeCloseTo(Math.min(income, assets), 2);
    expect(paid).toBe(result.agePension.fortnightly);
    expect(annual).toBeCloseTo(paid * 26, 1);
    expect(notesOf(w)).toMatch(/LOWER of the two/);
  });

  it('names the binding test in words', () => {
    const modest = { ...inputs, currentBalance: 5000, grossSalary: 45000, extraContributions: 0 };
    const mr = calcRetirement(modest);
    const mw = explainRetirement(mr, modest);
    const expected = mr.agePension.bindingTest === 'income' ? /income test/ : /assets test/;
    expect(sec(mw, /^Which test binds$/).steps.filter((s) => s.kind === 'note').map((s) => s.label).join(' '))
      .toMatch(expected);
  });

  it('every numeric step is finite', () => {
    for (const s of allSteps(w)) {
      if (typeof s.value === 'number') expect(Number.isFinite(s.value), s.label).toBe(true);
    }
  });

  it('drops the year-one contributions section for someone already drawing down', () => {
    const retired = { ...inputs, currentAge: 67, retirementAge: 65, grossSalary: 0 };
    const rw = explainRetirement(calcRetirement(retired), retired);
    expect(headings(rw)).not.toContain('Contributions in year one');
    expect(headings(rw)).toContain('Compounding to age 67');
  });

  it('replaces the three pension sections with a single note when the pension is excluded', () => {
    const noPension = { ...inputs, includeAgePension: false };
    const nw = explainRetirement(calcRetirement(noPension), noPension);
    expect(headings(nw)).toContain('Age Pension');
    expect(headings(nw)).not.toContain('Age Pension — the income test');
    expect(headings(nw)).not.toContain('Which test binds');
  });

  it('says so rather than inventing a rate where the registry has none', () => {
    // The pre-20-September window is covered for singles only.
    const couple = { ...inputs, rates: R_BEFORE, relationshipStatus: 'couple' };
    const cr = calcRetirement(couple);
    expect(cr.agePension.estimateUnavailable).toBe(true);
    const cw = explainRetirement(cr, couple);
    expect(headings(cw)).toContain('Age Pension');
    expect(headings(cw)).not.toContain('Which test binds');
    expect(sec(cw, /^Age Pension$/).steps[0].label).toMatch(/No published maximum rate/);
  });

  it('carries the financial year through to the panel footer', () => {
    expect(w.asAt).toMatch(/^FY/);
  });
});
