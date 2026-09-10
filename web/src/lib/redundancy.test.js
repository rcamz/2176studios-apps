// Drives the §8.9 vectors against the implementation, plus the structural
// guarantees §1.6, §2.4, §3.3 and §3.4 describe but no single vector pins down.
import { describe, it, expect } from 'vitest';
import { ratesFor } from './rates/index.js';
import { incomeTaxOn, medicareLevyOn } from './paytax.js';
import {
  calcRedundancy,
  nesWeeksFor,
  nesRedundancyEligibility,
  genuineRedundancyTaxFreeLimit,
  wholeOfIncomeCapRemaining,
} from './redundancy.js';
import {
  genuineRedundancyTaxFreeLimit as taxFreeLimitVectors,
  wholeOfIncomeCap as wholeOfIncomeCapVectors,
  nesRedundancyWeeks as nesWeeksVectors,
  unusedLongServiceLeave as lslVectors,
} from './vectors/termination.vectors.js';

// FY2026-27. Pinned so the suite does not drift when the clock does.
const DATE = '2026-09-10';
const RATES = ratesFor(DATE);

const label = (c) => `${c.trap ? '[trap] ' : ''}${JSON.stringify(c.input)}`;

// Marginal tax on `extra` stacked on `base`, Medicare included — the yardstick
// the 32% ceiling is measured against.
const marginalOn = (base, extra) =>
  incomeTaxOn(base + extra, 'resident', RATES) - incomeTaxOn(base, 'resident', RATES) +
  medicareLevyOn(base + extra, 'resident', RATES) - medicareLevyOn(base, 'resident', RATES);

// ─── §8.9 vectors ────────────────────────────────────────────────────────────

describe('genuine redundancy tax-free limit', () => {
  it.each(taxFreeLimitVectors.map((c) => [label(c), c]))('%s', (_l, c) => {
    expect(genuineRedundancyTaxFreeLimit(c.input.completedYearsOfService, RATES))
      .toBeCloseTo(c.expected, 2);
  });

  it('flows through calcRedundancy', () => {
    const r = calcRedundancy({ date: DATE, yearsService: 5, weeklyGross: 2000 });
    expect(r.taxFreeLimit).toBeCloseTo(47603, 2);
  });

  it('uses COMPLETED years — 5.9 years is still five', () => {
    expect(genuineRedundancyTaxFreeLimit(5.9, RATES))
      .toBeCloseTo(genuineRedundancyTaxFreeLimit(5, RATES), 2);
  });
});

describe('whole-of-income cap', () => {
  it.each(wholeOfIncomeCapVectors.map((c) => [label(c), c]))('%s', (_l, c) => {
    expect(c.input.cap).toBe(RATES.termination.etp.wholeOfIncomeCap);
    expect(wholeOfIncomeCapRemaining(c.input.otherTaxablePayments, RATES))
      .toBeCloseTo(c.expected, 2);
  });

  it('is not indexed', () => {
    expect(RATES.termination.etp.wholeOfIncomeCapIndexed).toBe(false);
  });

  it('floors at zero once other income exceeds the cap', () => {
    expect(wholeOfIncomeCapRemaining(400000, RATES)).toBe(0);
  });
});

describe('NES redundancy weeks', () => {
  const serviceCases = nesWeeksVectors.filter((c) => 'continuousServiceYears' in c.input);
  const gateCases = nesWeeksVectors.filter((c) => !('continuousServiceYears' in c.input));

  it.each(serviceCases.map((c) => [label(c), c]))('%s', (_l, c) => {
    expect(nesWeeksFor(c.input.continuousServiceYears, RATES)).toBe(c.expected);
  });

  it.each(gateCases.map((c) => [label(c), c]))('%s', (_l, c) => {
    // A gate case has to be driven through the full calc — the scale itself
    // would happily return weeks for this length of service.
    const r = calcRedundancy({
      date: DATE, yearsService: 12, weeklyGross: 2000,
      terminationReason: 'redundancy', ...c.input,
    });
    expect(r.redundancyWeeks).toBe(c.expected);
    expect(r.nesWeeksIfEntitled).toBe(12); // the scale would otherwise pay 12
  });

  it('[trap] the scale is not monotonic — 9.5 years beats 10.5 years', () => {
    expect(nesWeeksFor(9.5, RATES)).toBe(16);
    expect(nesWeeksFor(10.5, RATES)).toBe(12);
    expect(nesWeeksFor(9.5, RATES)).toBeGreaterThan(nesWeeksFor(10.5, RATES));
  });

  it('never extrapolates past the top row', () => {
    for (const y of [10, 15, 25, 40]) expect(nesWeeksFor(y, RATES)).toBe(12);
  });

  it('reads band boundaries as half-open', () => {
    expect(nesWeeksFor(0.999, RATES)).toBe(0);
    expect(nesWeeksFor(1, RATES)).toBe(4);
    expect(nesWeeksFor(9.999, RATES)).toBe(16);
    expect(nesWeeksFor(10, RATES)).toBe(12);
  });
});

describe('[trap] unused long service leave — post-17 August 1993 accrual', () => {
  // Same balance, same earner, only the reason changes.
  const common = {
    date: DATE, weeklyGross: 5000, grossAnnualIncome: 250000,
    yearsService: 12, unusedLslDays: 20, noticePaidWeeks: 0,
    unusedAnnualLeaveDays: 0,
  };
  const byReason = Object.fromEntries(
    lslVectors.map((c) => [
      c.expected,
      calcRedundancy({
        ...common,
        terminationReason: c.input.reason === 'Genuine redundancy' ? 'redundancy' : 'resignation',
      }),
    ])
  );

  it.each(lslVectors.map((c) => [label(c), c]))('%s', (_l, c) => {
    const r = byReason[c.expected];
    expect(r.lslPay).toBeCloseTo(20000, 2);
    if (c.expected === '32% flat') {
      expect(r.lslPost1993Capped).toBe(true);
      expect(r.lslTax).toBeCloseTo(20000 * 0.32, 2);
    } else {
      expect(r.lslPost1993Capped).toBe(false);
      expect(r.lslTax).toBeCloseTo(marginalOn(250000, 20000), 2);
      // Top bracket: 45% + 2% Medicare.
      expect(r.lslTax / r.lslPay).toBeCloseTo(0.47, 4);
    }
  });

  it('the two branches must not agree', () => {
    expect(byReason['32% flat'].lslTax).not.toBeCloseTo(byReason['marginal rates'].lslTax, 2);
  });
});

// ─── §3.3 unused leave — the rest of the table ───────────────────────────────

describe('unused leave treatment', () => {
  const earner = {
    date: DATE, weeklyGross: 5000, grossAnnualIncome: 250000,
    yearsService: 30, noticePaidWeeks: 0,
  };

  it('annual leave on a genuine redundancy is capped at 32%, not marginal', () => {
    const r = calcRedundancy({ ...earner, unusedAnnualLeaveDays: 20, terminationReason: 'redundancy' });
    expect(r.annualLeavePay).toBeCloseTo(20000, 2);
    expect(r.annualLeaveTax).toBeCloseTo(20000 * 0.32, 2);
  });

  it('annual leave on a resignation is marginal', () => {
    const r = calcRedundancy({ ...earner, unusedAnnualLeaveDays: 20, terminationReason: 'resignation' });
    expect(r.annualLeaveTax).toBeCloseTo(marginalOn(250000, 20000), 2);
  });

  it('the 32% ceiling is a maximum, not a flat rate — a low earner pays less', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 1000, grossAnnualIncome: 40000,
      yearsService: 30, unusedAnnualLeaveDays: 20, terminationReason: 'redundancy',
    });
    expect(r.annualLeavePay).toBeCloseTo(4000, 2);
    expect(r.annualLeaveTax).toBeLessThan(4000 * 0.32);
    expect(r.annualLeaveTax).toBeCloseTo(marginalOn(40000, 4000), 2);
  });

  it('LSL accrued 16 Aug 1978 – 17 Aug 1993 is 32% either way', () => {
    const red = calcRedundancy({ ...earner, unusedLslDays: 20, lsl1978to1993Days: 20, terminationReason: 'redundancy' });
    const res = calcRedundancy({ ...earner, unusedLslDays: 20, lsl1978to1993Days: 20, terminationReason: 'resignation' });
    expect(red.lslTax).toBeCloseTo(20000 * 0.32, 2);
    expect(res.lslTax).toBeCloseTo(20000 * 0.32, 2);
  });

  it('LSL accrued pre-16 Aug 1978 puts only 5% in assessable income', () => {
    const r = calcRedundancy({ ...earner, unusedLslDays: 20, lslPre1978Days: 20, terminationReason: 'resignation' });
    expect(r.lslPay).toBeCloseTo(20000, 2);
    expect(r.lslPre1978Assessable).toBeCloseTo(1000, 2);
    expect(r.lslTax).toBeCloseTo(marginalOn(250000, 1000), 2);
  });

  it('uses 32%, never the older 31.5%', () => {
    const t = RATES.termination.leaveTax;
    expect(t.longServiceLeave.postAug1993.redundancy).toBe(0.32);
    expect(t.longServiceLeave.aug1978Aug1993.normal).toBe(0.32);
    expect(t.annualLeave.postAug1993.redundancy).toBe(0.32);
  });

  it('splits a balance across accrual periods without exceeding the total', () => {
    const r = calcRedundancy({
      ...earner, unusedLslDays: 30, lslPre1978Days: 10, lsl1978to1993Days: 25,
      terminationReason: 'resignation',
    });
    expect(r.lslPre1978 + r.lsl1978to1993 + r.lslPost1993).toBeCloseTo(r.lslPay, 6);
    expect(r.lslPost1993).toBeCloseTo(0, 6);
  });

  it('neither leave type is run through the ETP cap', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 20000, grossAnnualIncome: 0, yearsService: 30,
      unusedAnnualLeaveDays: 200, unusedLslDays: 200, terminationReason: 'resignation',
      noticePaidWeeks: 0,
    });
    expect(r.taxableETP).toBe(0);
    expect(r.etpTax).toBe(0);
  });
});

// ─── §1.6 ETP caps and rates ─────────────────────────────────────────────────

describe('ETP caps', () => {
  it('the life benefit cap is $270,000, not the 2023-24 $235,000', () => {
    expect(RATES.termination.etp.lifeBenefitCap).toBe(270000);
    expect(calcRedundancy({ date: DATE }).etpCap).toBe(270000);
  });

  it('a genuine redundancy is an excluded payment — ETP cap only', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 10000, yearsService: 12, age: 45,
      grossAnnualIncome: 300000, terminationReason: 'redundancy',
    });
    expect(r.wholeOfIncomeCapApplies).toBe(false);
    expect(r.applicableCap).toBe(270000);
    expect(r.capBinding).toBe('etpCap');
  });

  it('a non-genuine redundancy is measured against the whole-of-income cap', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 10000, yearsService: 12, age: 45,
      grossAnnualIncome: 25000, terminationReason: 'non-genuine',
      unusedAnnualLeaveDays: 0, noticePaidWeeks: 0,
    });
    expect(r.wholeOfIncomeCapApplies).toBe(true);
    expect(r.wholeOfIncomeCapRemaining).toBeCloseTo(155000, 2);
    expect(r.applicableCap).toBeCloseTo(155000, 2);
    expect(r.capBinding).toBe('wholeOfIncomeCap');
  });

  it('the cap is reduced by other taxable termination payments too', () => {
    const withLeave = calcRedundancy({
      date: DATE, weeklyGross: 10000, yearsService: 12, age: 45,
      grossAnnualIncome: 25000, terminationReason: 'non-genuine',
      unusedAnnualLeaveDays: 10,
    });
    expect(withLeave.wholeOfIncomeCapRemaining).toBeCloseTo(155000 - 20000, 2);
  });

  it('amounts above the applicable cap are taxed at the top rate outright', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 30000, yearsService: 12, age: 45,
      grossAnnualIncome: 25000, terminationReason: 'non-genuine', noticePaidWeeks: 0,
    });
    expect(r.taxableETP).toBeCloseTo(360000, 2); // 12 weeks × $30,000
    expect(r.etpWithinCap).toBeCloseTo(155000, 2);
    expect(r.etpAboveCap).toBeCloseTo(205000, 2);
    expect(r.etpTaxAboveCap).toBeCloseTo(205000 * 0.47, 2);
  });

  it('the concessional ETP rate is a ceiling too', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 500, yearsService: 12, age: 45,
      grossAnnualIncome: 20000, terminationReason: 'non-genuine', noticePaidWeeks: 0,
    });
    expect(r.etpTax).toBeLessThan(r.taxableETP * 0.32);
  });

  it('uses preservation age, not a hardcoded 60, and picks 17% at or above it', () => {
    const under = calcRedundancy({ date: DATE, age: 59, terminationReason: 'non-genuine' });
    const at = calcRedundancy({ date: DATE, age: 61, terminationReason: 'non-genuine' });
    expect(under.preservationAge).toBe(RATES.superannuation.preservationAge);
    expect(under.concessionalRate).toBe(0.32);
    expect(at.concessionalRate).toBe(0.17);
  });

  it('honours ageAt30June when the caller knows it', () => {
    const r = calcRedundancy({ date: DATE, age: 59, ageAt30June: 60, terminationReason: 'non-genuine' });
    expect(r.concessionalRate).toBe(0.17);
  });
});

// ─── §1.6 Age Pension age gate ───────────────────────────────────────────────

describe('Age Pension age gate', () => {
  it('a 68-year-old gets no tax-free amount', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 4000, yearsService: 20, age: 68,
      terminationReason: 'redundancy',
    });
    expect(r.agePensionAge).toBe(67);
    expect(r.underAgePensionAge).toBe(false);
    expect(r.isGenuineRedundancy).toBe(false);
    expect(r.taxFreeLimit).toBe(0);
    expect(r.taxFreeAmount).toBe(0);
    expect(r.caveats.join(' ')).toMatch(/Age Pension age/);
  });

  it('a 66-year-old still gets it', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 4000, yearsService: 20, age: 66,
      terminationReason: 'redundancy',
    });
    expect(r.isGenuineRedundancy).toBe(true);
    expect(r.taxFreeLimit).toBeCloseTo(genuineRedundancyTaxFreeLimit(20, RATES), 2);
  });

  it('past Age Pension age the whole-of-income cap starts applying', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 4000, yearsService: 20, age: 68,
      grossAnnualIncome: 25000, terminationReason: 'redundancy',
    });
    expect(r.wholeOfIncomeCapApplies).toBe(true);
  });
});

// ─── §3.4 pay basis and eligibility ──────────────────────────────────────────

describe('pay basis', () => {
  it('redundancy pay uses the base rate and notice uses the full rate', () => {
    const r = calcRedundancy({
      date: DATE, weeklyBaseRate: 2000, weeklyFullRate: 2600,
      yearsService: 6, noticePaidWeeks: 4, terminationReason: 'redundancy',
    });
    expect(r.redundancyPayBasis).toBe('baseRate');
    expect(r.noticePayBasis).toBe('fullRate');
    expect(r.redundancyWeeks).toBe(11);
    expect(r.redundancyPay).toBeCloseTo(11 * 2000, 2);
    expect(r.noticePay).toBeCloseTo(4 * 2600, 2);
  });

  it('falls back to the single legacy rate when no split is given', () => {
    const r = calcRedundancy({ date: DATE, weeklyGross: 2000, yearsService: 6, noticePaidWeeks: 4 });
    expect(r.redundancyPay).toBeCloseTo(11 * 2000, 2);
    expect(r.noticePay).toBeCloseTo(4 * 2000, 2);
  });

  it('leave is paid at the base rate, one day being a fifth of a week', () => {
    const r = calcRedundancy({
      date: DATE, weeklyBaseRate: 2000, weeklyFullRate: 2600,
      yearsService: 6, unusedAnnualLeaveDays: 10, noticePaidWeeks: 0,
    });
    expect(r.annualLeavePay).toBeCloseTo(10 * 400, 2);
  });
});

describe('NES eligibility gates', () => {
  const base = { yearsService: 12, terminationReason: 'redundancy' };

  it('a small business employer switches s119 off, with caveats', () => {
    const e = nesRedundancyEligibility({ ...base, employeeHeadcount: 14 }, RATES);
    expect(e.entitled).toBe(false);
    expect(e.isSmallBusiness).toBe(true);
    expect(e.reasons.join(' ')).toMatch(/Small business employer/);
    expect(e.caveats.join(' ')).toMatch(/Awards and enterprise agreements/);
  });

  it('15 employees is not a small business employer', () => {
    expect(nesRedundancyEligibility({ ...base, employeeHeadcount: 15 }, RATES).entitled).toBe(true);
  });

  it('s121(4) restores the entitlement on employer insolvency', () => {
    const e = nesRedundancyEligibility({ ...base, employeeHeadcount: 14, employerInsolvent: true }, RATES);
    expect(e.entitled).toBe(true);
  });

  it('under 12 months of service is excluded', () => {
    expect(nesRedundancyEligibility({ ...base, yearsService: 11 / 12 }, RATES).entitled).toBe(false);
    expect(nesRedundancyEligibility({ ...base, yearsService: 1 }, RATES).entitled).toBe(true);
  });

  it.each([
    ['casual', { employmentBasis: 'casual' }],
    ['apprentice or trainee', { employmentBasis: 'apprentice' }],
    ['fixed term ending naturally', { fixedTermEndingNaturally: true }],
    ['serious misconduct', { seriousMisconduct: true }],
    ['industry-specific scheme', { industrySpecificScheme: true }],
  ])('%s is excluded', (_l, extra) => {
    expect(nesRedundancyEligibility({ ...base, ...extra }, RATES).entitled).toBe(false);
  });

  it('an excluded employee is still owed notice and unused leave', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 2000, yearsService: 12, employeeHeadcount: 14,
      unusedAnnualLeaveDays: 10, noticePaidWeeks: 4, terminationReason: 'redundancy',
    });
    expect(r.redundancyPay).toBe(0);
    expect(r.noticePay).toBeCloseTo(8000, 2);
    expect(r.annualLeavePay).toBeCloseTo(4000, 2);
    expect(r.totalGross).toBeCloseTo(12000, 2);
  });

  it('serious misconduct removes notice as well as redundancy pay', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 2000, yearsService: 12, seriousMisconduct: true,
      noticePaidWeeks: 4, terminationReason: 'dismissal',
    });
    expect(r.noticePay).toBe(0);
    expect(r.redundancyPay).toBe(0);
  });
});

// ─── §1.6 the four reasons must not collapse into one ────────────────────────

describe('termination reasons behave differently', () => {
  const common = {
    date: DATE, weeklyGross: 5000, yearsService: 12, age: 45,
    grossAnnualIncome: 150000, unusedAnnualLeaveDays: 20, unusedLslDays: 20,
    noticePaidWeeks: 5, otherEtpAmount: 40000,
  };
  const r = Object.fromEntries(
    ['redundancy', 'resignation', 'dismissal', 'non-genuine']
      .map((k) => [k, calcRedundancy({ ...common, terminationReason: k })])
  );

  it('produces four distinct outcomes across the dropdown', () => {
    expect(r.redundancy.redundancyWeeks).toBe(12);
    expect(r['non-genuine'].redundancyWeeks).toBe(12);
    expect(r.resignation.redundancyWeeks).toBe(0);
    expect(r.dismissal.redundancyWeeks).toBe(0);

    expect(r.redundancy.taxFreeAmount).toBeGreaterThan(0);
    expect(r['non-genuine'].taxFreeAmount).toBe(0);

    expect(r.redundancy.wholeOfIncomeCapApplies).toBe(false);
    expect(r['non-genuine'].wholeOfIncomeCapApplies).toBe(true);

    const nets = new Set(Object.values(r).map((x) => Math.round(x.netTakeHome)));
    expect(nets.size).toBeGreaterThanOrEqual(3);
  });

  it('genuine redundancy nets more than the same payment made non-genuine', () => {
    expect(r.redundancy.netTakeHome).toBeGreaterThan(r['non-genuine'].netTakeHome);
  });
});

// ─── §1.6 differencing, not one flat marginal rate ───────────────────────────

describe('lump sums are taxed by differencing', () => {
  it('a payment straddling a bracket is not taxed wholly at the top rate', () => {
    // $40,000 base, $40,000 of unused leave on a resignation: the payment
    // crosses 16% → 30%. A single marginal rate would charge 30% + 2% on all
    // of it.
    const r = calcRedundancy({
      date: DATE, weeklyGross: 2000, grossAnnualIncome: 40000, yearsService: 3,
      unusedAnnualLeaveDays: 100, noticePaidWeeks: 0, terminationReason: 'resignation',
    });
    expect(r.annualLeavePay).toBeCloseTo(40000, 2);
    expect(r.annualLeaveTax).toBeCloseTo(marginalOn(40000, 40000), 2);
    expect(r.annualLeaveTax).toBeLessThan(40000 * 0.32);
  });

  it('later components stack on top of earlier ones', () => {
    const r = calcRedundancy({
      date: DATE, weeklyGross: 2000, grossAnnualIncome: 40000, yearsService: 3,
      unusedAnnualLeaveDays: 50, noticePaidWeeks: 5, terminationReason: 'resignation',
    });
    expect(r.noticeTax).toBeCloseTo(marginalOn(40000, 10000), 2);
    expect(r.annualLeaveTax).toBeCloseTo(marginalOn(50000, 20000), 2);
  });
});

// ─── Shape guarantees ────────────────────────────────────────────────────────

describe('result shape', () => {
  it('net is gross less tax, and nothing is NaN', () => {
    const r = calcRedundancy({
      date: DATE, weeklyBaseRate: 2500, weeklyFullRate: 3100, yearsService: 9.5,
      age: 52, grossAnnualIncome: 130000, unusedAnnualLeaveDays: 22,
      unusedLslDays: 40, lslPre1978Days: 0, lsl1978to1993Days: 5,
      noticePaidWeeks: 5, otherEtpAmount: 15000, terminationReason: 'redundancy',
    });
    expect(r.netTakeHome).toBeCloseTo(r.totalGross - r.totalTax, 6);
    expect(r.totalGross).toBeCloseTo(
      r.etpGross + r.annualLeavePay + r.lslPay + r.noticePay, 6
    );
    expect(r.totalTax).toBeCloseTo(
      r.etpTax + r.annualLeaveTax + r.lslTax + r.noticeTax, 6
    );
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'number') expect(Number.isFinite(v), k).toBe(true);
    }
  });

  it('an empty call does not throw or produce NaN', () => {
    const r = calcRedundancy();
    expect(r.totalGross).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.netTakeHome).toBe(0);
    expect(r.effectiveTaxRate).toBe(0);
  });
});
