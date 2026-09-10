// Regression vectors from FY2026-27-rates-audit-v2.md §8.10, plus the
// correctness findings in calc-suite-audit.md §B3.
//
// [ATO] cases are published worked examples — failing one is definitively
// wrong. [trap] cases test structural issues that produce plausible-but-wrong
// numbers; each one has a "what the naive implementation returns" assertion so
// a regression cannot pass by coincidence.

import { describe, it, expect } from 'vitest';
import {
  calcCGT,
  discountHoldingDays,
  meetsTwelveMonthTest,
  ownershipDaysBetween,
  mainResidenceApportionment,
  dayIndex,
  fromDayIndex,
  addYears,
  explainCGT,
} from './cgt.js';
import { ratesFor } from './rates/index.js';
import vectors, {
  twelveMonthTest,
  mainResidencePartialExemption,
  lossOrdering,
  sixYearRule,
} from './vectors/cgt.vectors.js';

const FY2026 = ratesFor('2026-09-10');
const FY2028 = ratesFor('2027-09-10');
const round0 = (n) => Math.round(n);
const round2 = (n) => Math.round(n * 100) / 100;

// A disposal inside the verified window, so the discount regime is in force.
const SALE = '2026-11-20';
const shift = (iso, days) => fromDayIndex(dayIndex(iso) + days);

// Workings helpers. The panel is a flat list of steps once the sections are
// unwrapped, so reconciliation is a filter and a sum.
const allWorkingSteps = (w) => w.sections.flatMap((s) => s.steps);
const findStep = (w, re) => allWorkingSteps(w).find((s) => re.test(s.label));
const sumOf = (w, re) => allWorkingSteps(w)
  .filter((s) => s.kind !== 'note' && re.test(s.label))
  .reduce((a, s) => a + (typeof s.value === 'number' ? s.value : 0), 0);
const sectionSteps = (w, heading) =>
  (w.sections.find((s) => s.heading === heading)?.steps ?? []);
const sumIn = (w, heading, re) => sectionSteps(w, heading)
  .filter((s) => s.kind !== 'note' && re.test(s.label))
  .reduce((a, s) => a + (typeof s.value === 'number' ? s.value : 0), 0);
const notesText = (w) => [
  ...allWorkingSteps(w).filter((s) => s.kind === 'note').map((s) => s.label),
  ...allWorkingSteps(w).map((s) => s.note).filter(Boolean),
  ...w.sections.map((s) => s.note).filter(Boolean),
].join(' ');

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.10 the 12-month test [ATO] [trap]', () => {
  it.each(twelveMonthTest)('$input.acquired → $input.cgtEvent', (v) => {
    const days = discountHoldingDays(v.input.acquired, v.input.cgtEvent, FY2026);
    expect(days).toBe(v.expected.days);
    expect(meetsTwelveMonthTest(v.input.acquired, v.input.cgtEvent, FY2026)).toBe(
      v.expected.discount
    );
  });

  it('[trap] the naive `event - acquired >= 365` grants the discount a day early', () => {
    const naive = (a, b) => (dayIndex(b) - dayIndex(a)) >= 365;
    // Both endpoints are excluded, so the naive form is wrong on the first
    // vector and right on the second — exactly the off-by-two.
    expect(naive('2025-06-20', '2026-06-20')).toBe(true);
    expect(meetsTwelveMonthTest('2025-06-20', '2026-06-20', FY2026)).toBe(false);
    expect(naive('2025-06-19', '2026-06-20')).toBe(true);
    expect(meetsTwelveMonthTest('2025-06-19', '2026-06-20', FY2026)).toBe(true);
  });

  it('[trap] a month-granularity picker cannot express the boundary', () => {
    // Both of these are "June 2025 → June 2026" to a month picker, yet they
    // land on opposite sides of a 50% discount.
    const a = calcCGT({
      purchasePrice: 400000, salePrice: 500000,
      acquisitionDate: '2025-06-20', disposalDate: '2026-06-20',
      grossIncome: 90000, rates: FY2026,
    });
    const b = calcCGT({
      purchasePrice: 400000, salePrice: 500000,
      acquisitionDate: '2025-06-19', disposalDate: '2026-06-20',
      grossIncome: 90000, rates: FY2026,
    });
    expect(a.discountRate).toBe(0);
    expect(b.discountRate).toBe(0.5);
    expect(a.assessableGain).toBe(100000);
    expect(b.assessableGain).toBe(50000);
  });

  it('reads the exclusions from the rate registry rather than hardcoding them', () => {
    expect(FY2026.cgt.excludeAcquisitionDay).toBe(true);
    expect(FY2026.cgt.excludeEventDay).toBe(true);
    expect(FY2026.cgt.minimumOwnershipDays).toBe(365);
  });

  it('counts ownership days inclusively, which is two more than the discount count', () => {
    expect(ownershipDaysBetween('2025-06-20', '2026-06-20')).toBe(366);
    expect(discountHoldingDays('2025-06-20', '2026-06-20', FY2026)).toBe(364);
  });

  it('returns zero days when the sale precedes the purchase', () => {
    expect(discountHoldingDays('2026-06-20', '2025-06-20', FY2026)).toBe(0);
    expect(ownershipDaysBetween('2026-06-20', '2025-06-20')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.10 main residence partial exemption [ATO]', () => {
  // Rented from purchase, then lived in until sale. The lead-in period is not
  // an "absence" — you cannot be absent from a home you have never occupied —
  // so those days are assessable, which is what the vector needs.
  const v = mainResidencePartialExemption[0];
  const { gain, nonMainResidenceDays, ownershipDays } = v.input;

  const ACQ = '2000-01-01';
  const DISP = shift(ACQ, ownershipDays - 1);
  const MOVED_IN = shift(ACQ, nonMainResidenceDays);

  const result = calcCGT({
    assetType: 'property',
    purchasePrice: 500000,
    salePrice: 500000 + gain,
    acquisitionDate: ACQ,
    disposalDate: DISP,
    grossIncome: 90000,
    mainResidenceStatus: 'partial',
    residencePeriods: [{ from: MOVED_IN, to: DISP }],
    incomeProducingDuringAbsence: true,
    rates: FY2026,
  });

  it('splits the ownership period exactly as the vector states', () => {
    expect(result.ownershipDays).toBe(ownershipDays);
    expect(result.mainResidence.nonMainResidenceDays).toBe(nonMainResidenceDays);
    expect(result.grossGain).toBe(gain);
  });

  it('applies gain × (non-MR days ÷ ownership days) → assessable $243,162', () => {
    expect(round0(result.gainAfterExemption)).toBe(v.expected.assessable);
  });

  it('then discounts the assessable portion → net capital gain $121,581', () => {
    expect(result.discountRate).toBe(0.5);
    expect(round0(result.assessableGain)).toBe(v.expected.netCapitalGain);
  });

  it('[trap] does not discount first and apportion second', () => {
    // Discounting the whole gain and then apportioning gives the same number
    // here by commutativity, but apportioning the DISCOUNT (rather than the
    // gain) does not — guard the exemption amount explicitly.
    expect(round0(result.mainResidenceExemptAmount)).toBe(gain - v.expected.assessable);
  });

  it('a full exemption wipes the gain out entirely', () => {
    const full = calcCGT({
      assetType: 'property',
      purchasePrice: 500000, salePrice: 500000 + gain,
      acquisitionDate: ACQ, disposalDate: DISP,
      grossIncome: 90000,
      mainResidenceStatus: 'always',
      rates: FY2026,
    });
    expect(full.mainResidence.exemptFraction).toBe(1);
    expect(full.gainAfterExemption).toBe(0);
    expect(full.assessableGain).toBe(0);
    expect(full.cgtPayable).toBe(0);
  });

  it('no exemption at all when the property was never a main residence', () => {
    const never = calcCGT({
      assetType: 'property',
      purchasePrice: 500000, salePrice: 500000 + gain,
      acquisitionDate: ACQ, disposalDate: DISP,
      grossIncome: 90000,
      mainResidenceStatus: 'never',
      rates: FY2026,
    });
    expect(never.mainResidence.exemptFraction).toBe(0);
    expect(never.gainAfterExemption).toBe(gain);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.10 loss ordering [trap]', () => {
  const v = lossOrdering[0];
  const { gain, carriedForwardCapitalLoss } = v.input;

  const result = calcCGT({
    purchasePrice: 100000,
    salePrice: 100000 + gain,
    acquisitionDate: '2023-01-10',
    disposalDate: SALE,
    grossIncome: 90000,
    capitalLosses: carriedForwardCapitalLoss,
    rates: FY2026,
  });

  it('applies losses BEFORE the discount → $30,000 net capital gain', () => {
    expect(result.heldLongEnough).toBe(true);
    expect(result.discountRate).toBe(0.5);
    expect(result.assessableGain).toBe(v.expected);
  });

  it('[trap] is not the $10,000 that discounting first produces', () => {
    const wrong = gain * 0.5 - carriedForwardCapitalLoss;
    expect(wrong).toBe(10000);
    expect(result.assessableGain).not.toBe(wrong);
    expect(result.assessableGain - wrong).toBe(20000);
  });

  it('confirms the registry states the ordering', () => {
    expect(FY2026.cgt.lossesBeforeDiscount).toBe(true);
  });

  it('reports the carry-forward balance when losses exceed the gain', () => {
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 130000,
      acquisitionDate: '2023-01-10', disposalDate: SALE,
      grossIncome: 90000, capitalLosses: 50000,
      rates: FY2026,
    });
    expect(r.lossesApplied).toBe(30000);
    expect(r.assessableGain).toBe(0);
    expect(r.cgtPayable).toBe(0);
    expect(r.netCapitalLossCarriedForward).toBe(20000);
  });

  it('reports the carry-forward when the disposal is itself a loss', () => {
    const r = calcCGT({
      purchasePrice: 200000, purchaseCosts: 5000,
      salePrice: 150000, saleCosts: 3000,
      acquisitionDate: '2023-01-10', disposalDate: SALE,
      grossIncome: 90000, capitalLosses: 10000,
      rates: FY2026,
    });
    expect(r.isCapitalLoss).toBe(true);
    expect(r.grossGain).toBe(-58000);
    expect(r.cgtPayable).toBe(0);
    // The fresh $58,000 loss joins the $10,000 already carried.
    expect(r.netCapitalLossCarriedForward).toBe(68000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8.10 six-year rule [trap]', () => {
  const v = sixYearRule[0];

  // Lived in it, rented 5 years, moved back in, rented 5 years, sold.
  const ACQ = '2000-01-01';
  const LIVED_1 = { from: '2000-01-01', to: '2000-12-31' };
  const LIVED_2 = { from: '2006-01-01', to: '2006-12-31' };
  const DISP = '2011-12-31';

  const scenario = (extra = {}) => calcCGT({
    assetType: 'property',
    purchasePrice: 400000,
    salePrice: 900000,
    acquisitionDate: ACQ,
    disposalDate: DISP,
    grossIncome: 120000,
    mainResidenceStatus: 'partial',
    residencePeriods: [LIVED_1, LIVED_2],
    incomeProducingDuringAbsence: true,
    rates: FY2026,
    ...extra,
  });

  it('two separate five-year rentals with occupancy between → fully exempt', () => {
    const r = scenario();
    expect(r.mainResidence.absences).toHaveLength(2);
    expect(r.mainResidence.absences.every((a) => a.withinLimit)).toBe(true);
    expect(r.mainResidence.nonMainResidenceDays).toBe(0);
    expect(r.mainResidence.exemptFraction).toBe(1);
    expect(r.cgtPayable).toBe(0);
    expect(v.expected).toBe('fully exempt');
  });

  it('[trap] a single cumulative counter would tax the second absence', () => {
    // Ten years of absence in ONE stretch blows the limit; the same ten years
    // split by a return to occupancy does not.
    const cumulative = calcCGT({
      assetType: 'property',
      purchasePrice: 400000, salePrice: 900000,
      acquisitionDate: ACQ, disposalDate: DISP,
      grossIncome: 120000,
      mainResidenceStatus: 'partial',
      residencePeriods: [LIVED_1],
      incomeProducingDuringAbsence: true,
      rates: FY2026,
    });
    expect(cumulative.mainResidence.limitExceeded).toBe(true);
    expect(cumulative.mainResidence.nonMainResidenceDays).toBeGreaterThan(0);
    expect(cumulative.cgtPayable).toBeGreaterThan(0);
    // And the correctly-reset version pays nothing.
    expect(scenario().cgtPayable).toBe(0);
  });

  it('the limit resets: each absence gets its own six years', () => {
    const r = scenario();
    for (const a of r.mainResidence.absences) {
      expect(a.assessableDays).toBe(0);
      expect(a.days).toBeGreaterThan(365 * 4);
    }
    expect(r.mainResidence.limitYears).toBe(6);
  });

  it('is indefinite where the property was not income-producing', () => {
    const r = calcCGT({
      assetType: 'property',
      purchasePrice: 400000, salePrice: 900000,
      acquisitionDate: ACQ, disposalDate: '2020-12-31',
      grossIncome: 120000,
      mainResidenceStatus: 'partial',
      residencePeriods: [LIVED_1],
      incomeProducingDuringAbsence: false,
      rates: FY2026,
    });
    expect(r.mainResidence.limitYears).toBeNull();
    expect(r.mainResidence.nonMainResidenceDays).toBe(0);
    expect(r.cgtPayable).toBe(0);
  });

  it('taxes only the days past six years in an over-long income-producing absence', () => {
    // Lived in it for 2005, absent and renting from 2006-01-01 to 2013-12-31.
    // Six years of that absence are covered: 2006-01-01 to 2011-12-31.
    const r = mainResidenceApportionment({
      acquired: '2005-01-01',
      disposed: '2013-12-31',
      status: 'partial',
      residencePeriods: [{ from: '2005-01-01', to: '2005-12-31' }],
      incomeProducingDuringAbsence: true,
      rates: FY2026,
    });
    const expectedAssessable = ownershipDaysBetween('2012-01-01', '2013-12-31');
    expect(r.nonMainResidenceDays).toBe(expectedAssessable);
    expect(r.absences[0].exemptDays).toBe(ownershipDaysBetween('2006-01-01', '2011-12-31'));
  });

  it('the absence rule needs a prior period of occupancy', () => {
    // Never lived there → no absence to protect, whatever the income status.
    const r = mainResidenceApportionment({
      acquired: '2005-01-01',
      disposed: '2013-12-31',
      status: 'partial',
      residencePeriods: [],
      incomeProducingDuringAbsence: false,
      rates: FY2026,
    });
    expect(r.exemptFraction).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§B3.1 Medicare levy on the gain', () => {
  const base = {
    purchasePrice: 300000, salePrice: 500000,
    acquisitionDate: '2020-03-01', disposalDate: SALE,
    grossIncome: 90000, rates: FY2026,
  };

  it('charges the 2% levy on the assessable gain', () => {
    const r = calcCGT(base);
    expect(r.assessableGain).toBe(100000);
    expect(round2(r.medicareLevyOnGain)).toBe(round2(100000 * FY2026.medicare.levyRate));
    expect(round0(r.medicareLevyOnGain)).toBe(2000);
  });

  it('[trap] differencing income tax alone understates by the levy', () => {
    const r = calcCGT(base);
    expect(r.cgtPayable).toBe(
      r.incomeTaxOnGain + r.medicareLevyOnGain + r.mlsOnGain
    );
    expect(r.cgtPayable - r.incomeTaxOnGain).toBeGreaterThan(1900);
  });

  it('does not charge the levy to a foreign resident', () => {
    const r = calcCGT({ ...base, residency: 'foreign' });
    expect(r.medicareLevyOnGain).toBe(0);
  });
});

describe('§B3.2 the gain flows into HELP and MLS income', () => {
  it('increases the compulsory HELP repayment', () => {
    const withDebt = calcCGT({
      purchasePrice: 300000, salePrice: 500000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 90000, helpBalance: 60000, rates: FY2026,
    });
    const noDebt = calcCGT({
      purchasePrice: 300000, salePrice: 500000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 90000, helpBalance: 0, rates: FY2026,
    });
    expect(noDebt.helpRepaymentOnGain).toBe(0);
    expect(withDebt.helpRepaymentOnGain).toBeGreaterThan(0);
    // Reported alongside the tax, not folded into it.
    expect(withDebt.cgtPayable).toBe(noDebt.cgtPayable);
    expect(round2(withDebt.totalCostOfGain)).toBe(
      round2(withDebt.cgtPayable + withDebt.helpRepaymentOnGain)
    );
  });

  it('[trap] can push the taxpayer over an MLS threshold — a cliff on the whole income', () => {
    const r = calcCGT({
      purchasePrice: 300000, salePrice: 340000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 100000, hasPrivateCover: false, rates: FY2026,
    });
    expect(r.assessableGain).toBe(20000);
    expect(r.mlsOnGain).toBeGreaterThan(0);
    const covered = calcCGT({
      purchasePrice: 300000, salePrice: 340000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 100000, hasPrivateCover: true, rates: FY2026,
    });
    expect(covered.mlsOnGain).toBe(0);
  });
});

describe('§B3.6 differencing, never a flat marginal rate', () => {
  it('[trap] taxes a bracket-crossing gain across both brackets', () => {
    // $130k income, $20k assessable gain, straddling the $135k boundary.
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 140000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 131000, rates: FY2026,
    });
    expect(r.assessableGain).toBe(20000);
    // $131k gross less the $1,000 standard deduction = $130k taxable.
    expect(round2(r.grossIncomeTaxOnGain)).toBe(round2(5000 * 0.30 + 15000 * 0.37));
    expect(round2(r.grossIncomeTaxOnGain)).not.toBe(20000 * 0.37);
  });

  it('never returns a negative tax on a gain', () => {
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 100000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 40000, rates: FY2026,
    });
    expect(r.cgtPayable).toBe(0);
  });
});

describe('§B3.5 the CGT event is the contract date', () => {
  it('states the basis so the UI can surface it', () => {
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2020-03-01', disposalDate: SALE,
      grossIncome: 90000, rates: FY2026,
    });
    expect(r.eventDateBasis).toBe('contract');
  });

  it('resolves the rate year from the disposal date, not from today', () => {
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2020-03-01', disposalDate: '2026-11-20',
      grossIncome: 90000,
    });
    expect(r.financialYear).toBe('2026-27');
    expect(r.regime).toBe('discount');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('foreign residents', () => {
  const shared = {
    assetType: 'property',
    purchasePrice: 400000, salePrice: 900000,
    acquisitionDate: '2005-01-01', disposalDate: SALE,
    grossIncome: 90000,
    mainResidenceStatus: 'always',
  };

  it('[trap] lose the main residence exemption entirely — a cliff, not an apportionment', () => {
    const resident = calcCGT({ ...shared, residency: 'resident', rates: FY2026 });
    const foreign = calcCGT({ ...shared, residency: 'foreign', rates: FY2026 });
    expect(resident.gainAfterExemption).toBe(0);
    expect(foreign.gainAfterExemption).toBe(500000);
    expect(foreign.mainResidence.exemptFraction).toBe(0);
    expect(foreign.foreignResidentDenied).toBe(true);
    expect(FY2026.cgt.mainResidence.foreignResidentEligible).toBe(false);
  });

  it('get no CGT discount either', () => {
    const foreign = calcCGT({ ...shared, residency: 'foreign', rates: FY2026 });
    expect(foreign.discountRate).toBe(0);
    expect(foreign.cgtDiscountEligible).toBe(false);
    expect(foreign.assessableGain).toBe(500000);
  });

  it('surfaces the 15% withholding with no price threshold', () => {
    const r = calcCGT({ ...shared, residency: 'foreign', rates: FY2026 });
    expect(r.withholding.rate).toBe(0.15);
    expect(r.withholding.priceThreshold).toBeNull();
    expect(r.withholding.amount).toBe(900000 * 0.15);
  });

  it('withholding has no threshold, so a small sale is caught too', () => {
    const r = calcCGT({
      assetType: 'property',
      purchasePrice: 100000, salePrice: 300000,
      acquisitionDate: '2005-01-01', disposalDate: SALE,
      grossIncome: 90000, rates: FY2026,
    });
    expect(r.withholding.amount).toBe(45000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('entity types', () => {
  const shared = {
    purchasePrice: 100000, salePrice: 200000,
    acquisitionDate: '2020-03-01', disposalDate: SALE,
    grossIncome: 0,
  };

  it('gives a complying super fund the one-third discount', () => {
    const r = calcCGT({ ...shared, entity: 'super', rates: FY2026 });
    expect(r.discountRate).toBe(0.3333);
    expect(round2(r.assessableGain)).toBe(round2(100000 * (1 - 0.3333)));
    expect(round2(r.cgtPayable)).toBe(round2(r.assessableGain * 0.15));
  });

  it('gives a super fund nothing on a short hold', () => {
    const r = calcCGT({
      ...shared, entity: 'super',
      acquisitionDate: '2026-06-01', disposalDate: SALE,
      rates: FY2026,
    });
    expect(r.discountRate).toBe(0);
    expect(r.assessableGain).toBe(100000);
  });

  it('gives a company no discount at all, however long it held the asset', () => {
    const r = calcCGT({ ...shared, entity: 'company', rates: FY2026 });
    expect(r.heldLongEnough).toBe(true);
    expect(r.discountRate).toBe(0);
    expect(r.cgtDiscountEligible).toBe(false);
    expect(r.discountIneligibleReason).toMatch(/[Cc]ompanies/);
    expect(r.assessableGain).toBe(100000);
    expect(FY2026.cgt.companyDiscount).toBe(0);
  });

  it('gives an individual 50%', () => {
    const r = calcCGT({ ...shared, entity: 'individual', rates: FY2026 });
    expect(r.discountRate).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§4.1b the 1 July 2027 reform', () => {
  it('nothing changed on 1 July 2026 — the discount still applies', () => {
    expect(ratesFor('2027-06-30').cgt.individualDiscount).toBe(0.5);
  });

  it('the discount is gone for CGT events from 1 July 2027', () => {
    expect(FY2028.cgt.individualDiscount).toBeNull();
    expect(FY2028.cgt.costBaseIndexation).toBe(true);
    expect(FY2028.cgt.minimumTaxRate).toBe(0.30);
  });

  it('warns when the modelled sale date lands on or after 1 July 2027', () => {
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2020-03-01', disposalDate: '2027-07-01',
      grossIncome: 90000,
    });
    expect(r.regime).toBe('indexation');
    expect(r.reformApplies).toBe(true);
    expect(r.discountRate).toBe(0);
    expect(r.warnings.some((w) => /1 July 2027/.test(w.title))).toBe(true);
  });

  it('a sale one day earlier keeps the discount — the contract date decides', () => {
    const before = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2020-03-01', disposalDate: '2027-06-30',
      grossIncome: 90000,
    });
    expect(before.regime).toBe('discount');
    expect(before.discountRate).toBe(0.5);
    expect(before.assessableGain).toBe(50000);
  });

  it('flags the coming change only while the decision is still live', () => {
    const soon = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2020-03-01', disposalDate: '2026-11-20',
      grossIncome: 90000,
    });
    expect(soon.warnings.some((w) => /50% discount ends/.test(w.title))).toBe(true);

    const longPast = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2018-03-01', disposalDate: '2020-05-05',
      grossIncome: 90000,
    });
    expect(longPast.warnings.some((w) => /50% discount ends/.test(w.title))).toBe(false);
  });

  it('the main residence exemption is unchanged by the reform', () => {
    expect(FY2028.cgt.mainResidence.absenceYearsIfIncomeProducing).toBe(6);
    expect(FY2028.cgt.mainResidence.foreignResidentEligible).toBe(false);
    const r = calcCGT({
      assetType: 'property',
      purchasePrice: 400000, salePrice: 900000,
      acquisitionDate: '2005-01-01', disposalDate: '2027-09-10',
      grossIncome: 90000, mainResidenceStatus: 'always',
    });
    expect(r.gainAfterExemption).toBe(0);
    expect(r.cgtPayable).toBe(0);
  });

  it('the super fund discount is not expected to change', () => {
    expect(FY2028.cgt.superFundDiscount).toBe(0.3333);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('date arithmetic', () => {
  it('is immune to local timezone offsets', () => {
    expect(dayIndex('2026-01-01')).toBe(dayIndex(new Date(Date.UTC(2026, 0, 1))));
    expect(fromDayIndex(dayIndex('2026-06-30'))).toBe('2026-06-30');
  });

  it('rolls 29 February forward to 1 March when adding years', () => {
    expect(addYears('2024-02-29', 6)).toBe('2030-03-01');
    expect(addYears('2020-01-15', 6)).toBe('2026-01-15');
  });

  it('returns null for a date that is not a real ISO day', () => {
    expect(dayIndex('')).toBeNull();
    expect(dayIndex('2026-06')).toBeNull();
    expect(dayIndex(undefined)).toBeNull();
  });

  it('handles a sale date outside the verified rate window without throwing', () => {
    const r = calcCGT({
      purchasePrice: 100000, salePrice: 200000,
      acquisitionDate: '2018-03-01', disposalDate: '2020-05-05',
      grossIncome: 90000,
    });
    expect(r.warnings.some((w) => /verified rate window/.test(w.title))).toBe(true);
    expect(Number.isFinite(r.cgtPayable)).toBe(true);
  });

  it('produces no NaN with no dates entered at all', () => {
    const r = calcCGT({ purchasePrice: 100000, salePrice: 200000, grossIncome: 90000 });
    expect(r.datesEntered).toBe(false);
    expect(r.ownershipDays).toBe(0);
    expect(r.discountRate).toBe(0);
    expect(Number.isFinite(r.cgtPayable)).toBe(true);
    expect(Number.isFinite(r.assessableGain)).toBe(true);
  });
});

describe('cost base and proceeds', () => {
  it('adds acquisition costs and improvements, and nets sale costs', () => {
    const r = calcCGT({
      purchasePrice: 600000, purchaseCosts: 28000, improvements: 45000,
      salePrice: 900000, saleCosts: 22000,
      acquisitionDate: '2018-03-01', disposalDate: SALE,
      grossIncome: 110000, rates: FY2026,
    });
    expect(r.costBase).toBe(673000);
    expect(r.netSaleProceeds).toBe(878000);
    expect(r.grossGain).toBe(205000);
    expect(r.assessableGain).toBe(102500);
    expect(round2(r.afterTaxProceeds)).toBe(round2(878000 - r.cgtPayable));
  });
});

describe('every vector in the file is exercised', () => {
  it('covers all four vector groups', () => {
    expect(Object.keys(vectors).sort()).toEqual([
      'lossOrdering', 'mainResidencePartialExemption', 'sixYearRule', 'twelveMonthTest',
    ]);
    expect(twelveMonthTest).toHaveLength(2);
    expect(mainResidencePartialExemption).toHaveLength(1);
    expect(lossOrdering).toHaveLength(1);
    expect(sixYearRule).toHaveLength(1);
  });
});

// ─── Workings ────────────────────────────────────────────────────────────────
// The panel must reconcile: every set of component lines has to add up to the
// total sitting under it, or the panel is worse than showing nothing.

describe('explainCGT', () => {
  const inputs = {
    purchasePrice: 600000, purchaseCosts: 28000, improvements: 45000,
    salePrice: 900000, saleCosts: 22000,
    acquisitionDate: '2018-03-01', disposalDate: '2026-09-10',
    grossIncome: 110000, capitalLosses: 30000, rates: FY2026,
  };
  const result = calcCGT(inputs);
  const w = explainCGT(result, inputs);

  it('produces the expected sections', () => {
    const headings = w.sections.map((s) => s.heading);
    expect(headings).toContain('Cost base');
    expect(headings).toContain('Proceeds and gross gain');
    expect(headings).toContain('Holding period');
    expect(headings).toContain('Losses, then the discount');
    expect(headings).toContain('Tax on the gain');
    expect(headings).toContain('What you keep');
  });

  it('the cost base components reconcile to the cost base', () => {
    const parts = sumIn(w, 'Cost base', /^(Purchase price|plus purchase costs|plus capital improvements)$/);
    expect(parts).toBeCloseTo(result.costBase, 6);
    expect(findStep(w, /^Cost base$/).value).toBeCloseTo(result.costBase, 6);
  });

  it('the proceeds lines reconcile to the gross gain', () => {
    const parts = sumIn(w, 'Proceeds and gross gain', /^(Sale price|less selling costs|less cost base)$/);
    expect(parts).toBeCloseTo(result.grossGain, 6);
    expect(findStep(w, /^Net sale proceeds$/).value).toBeCloseTo(result.netSaleProceeds, 6);
  });

  it('losses come off before the discount and the lines reconcile', () => {
    const sec = w.sections.find((s) => s.heading === 'Losses, then the discount');
    const labels = sec.steps.map((s) => s.label);
    const lossIdx = labels.findIndex((l) => /capital losses applied/.test(l));
    const discIdx = labels.findIndex((l) => /CGT discount/.test(l));
    expect(lossIdx).toBeGreaterThan(-1);
    expect(discIdx).toBeGreaterThan(lossIdx);

    const parts = sumIn(w, 'Losses, then the discount',
      /^(Gross capital gain|Gain after the exemption|less capital losses applied|less the .* CGT discount)$/);
    expect(parts).toBeCloseTo(result.assessableGain, 6);
  });

  it('the tax components reconcile to CGT payable', () => {
    const parts = sumOf(w, /^Extra (income tax|Medicare levy|Medicare levy surcharge)$/);
    expect(parts).toBeCloseTo(result.cgtPayable, 6);
    expect(findStep(w, /^CGT payable$/).value).toBeCloseTo(result.cgtPayable, 6);
  });

  it('the outcome lines reconcile to the after-tax proceeds', () => {
    const parts = sumIn(w, 'What you keep', /^(Net sale proceeds|less CGT payable)$/);
    expect(parts).toBeCloseTo(result.afterTaxProceeds, 6);
  });

  it('shows the holding period in days and whether the test was cleared', () => {
    expect(findStep(w, /^Days counted for the discount test$/).value)
      .toBe(`${result.holdingDays.toLocaleString('en-AU')} days`);
    expect(findStep(w, /^Twelve-month test$/).value).toBe('Passed');
  });

  it('says plainly how many days short a near-miss is', () => {
    const near = { ...inputs, acquisitionDate: '2025-09-12', disposalDate: '2026-09-10' };
    const nw = explainCGT(calcCGT(near), near);
    expect(findStep(nw, /^Twelve-month test$/).value).toBe('Not met');
    expect(notesText(nw)).toMatch(/3 days short/);
    expect(notesText(nw)).toMatch(/364 counted days/);
  });

  it('warns that losses applied after the discount is the expensive error', () => {
    expect(notesText(w)).toMatch(/BEFORE the discount/);
  });

  it('omits the main residence section when the asset was never a home', () => {
    expect(w.sections.map((s) => s.heading)).not.toContain('Main residence exemption');
  });

  it('shows the apportionment when a main residence exemption applies', () => {
    const mrInputs = {
      ...inputs,
      mainResidenceStatus: 'partial',
      residencePeriods: [{ from: '2018-03-01', to: '2022-03-01' }],
    };
    const mrResult = calcCGT(mrInputs);
    const mw = explainCGT(mrResult, mrInputs);
    expect(mw.sections.map((s) => s.heading)).toContain('Main residence exemption');
    const parts = sumIn(mw, 'Main residence exemption', /^(Gross gain|less exempt portion)$/);
    expect(parts).toBeCloseTo(mrResult.gainAfterExemption, 6);
    expect(findStep(mw, /^Gain after the exemption$/).value)
      .toBeCloseTo(mrResult.gainAfterExemption, 6);
  });

  it('reconciles when the discount is not available', () => {
    const short = { ...inputs, acquisitionDate: '2026-06-01' };
    const sr = calcCGT(short);
    const sw = explainCGT(sr, short);
    expect(sr.discountRate).toBe(0);
    expect(findStep(sw, /^Assessable capital gain$/).value).toBeCloseTo(sr.assessableGain, 6);
    expect(notesText(sw)).toMatch(/fewer than 365 days/i);
  });

  it('handles a capital loss without claiming a phantom discount', () => {
    const lossInputs = { ...inputs, salePrice: 400000 };
    const lr = calcCGT(lossInputs);
    const lw = explainCGT(lr, lossInputs);
    expect(lr.isCapitalLoss).toBe(true);
    expect(findStep(lw, /^Assessable capital gain$/).value).toBe(0);
    expect(findStep(lw, /CGT discount/)).toBeUndefined();
    expect(findStep(lw, /^Net capital loss carried forward$/).value)
      .toBeCloseTo(lr.netCapitalLossCarriedForward, 6);
  });

  it('reconciles for a company, which gets no discount', () => {
    const co = { ...inputs, entity: 'company' };
    const cr = calcCGT(co);
    const cw = explainCGT(cr, co);
    expect(findStep(cw, /^CGT payable$/).value).toBeCloseTo(cr.cgtPayable, 6);
    expect(sumIn(cw, 'What you keep', /^(Net sale proceeds|less CGT payable)$/))
      .toBeCloseTo(cr.afterTaxProceeds, 6);
  });

  it('every numeric step is finite', () => {
    const cases = [
      inputs,
      { ...inputs, entity: 'super' },
      { ...inputs, entity: 'company' },
      { ...inputs, salePrice: 400000 },
      { ...inputs, acquisitionDate: '', disposalDate: '' },
      { ...inputs, mainResidenceStatus: 'always' },
    ];
    for (const c of cases) {
      for (const s of allWorkingSteps(explainCGT(calcCGT(c), c))) {
        if (typeof s.value === 'number') expect(Number.isFinite(s.value), s.label).toBe(true);
      }
    }
  });

  it('drops the holding period section when no dates are entered', () => {
    const noDates = { ...inputs, acquisitionDate: '', disposalDate: '' };
    const nw = explainCGT(calcCGT(noDates), noDates);
    expect(nw.sections.map((s) => s.heading)).not.toContain('Holding period');
  });

  it('carries the financial year', () => {
    expect(w.asAt).toBe(`FY${result.financialYear}`);
  });
});
