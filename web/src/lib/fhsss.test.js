// Drives the §8.8 FHSSS vectors, plus the logic the vectors don't reach:
// SIC daily compounding, the withdrawal-tax build-up, Division 293 and the
// eligibility gate.
//
// [ATO] cases are published worked examples — failing one is definitively
// wrong. [trap] cases test structural issues that produce plausible-but-wrong
// numbers.

import { describe, it, expect } from 'vitest';
import {
  calcFHSSS, releasableAmount, releasableBreakdown, checkEligibility,
  sicRateFor, sicAccrualFactor, daysInCalendarYear, daysBetween, addDays,
  ELIGIBILITY_ITEMS,
} from './fhsss.js';
import { releasableAmount as releasableVectors } from './vectors/fhsss.vectors.js';
import { ratesFor } from './rates/index.js';

const FY2026 = ratesFor('2026-09-10');
const DATE = '2026-09-10';
const round2 = (n) => Math.round(n * 100) / 100;

describe('§8.8 releasable amount [ATO]', () => {
  it.each(releasableVectors)('$note', ({ input, expected }) => {
    expect(round2(releasableAmount({ ...input, rates: FY2026 }))).toBe(expected);
  });

  it('[trap] applies the $15,000 annual cap BEFORE the 85% haircut', () => {
    const correct = releasableAmount({ salarySacrificed: 25000, rates: FY2026 });
    // The inverted order: haircut first, then cap.
    const inverted = Math.min(25000 * 0.85, FY2026.fhsss.annualLimit);
    expect(correct).toBe(12750);
    expect(inverted).toBe(15000);
    expect(inverted - correct).toBe(2250);
  });

  it('[trap] releases concessional at 85% and non-concessional at 100%', () => {
    expect(releasableAmount({ salarySacrificed: 10000, rates: FY2026 })).toBe(8500);
    expect(releasableAmount({ personalContributions: 10000, rates: FY2026 })).toBe(10000);
    // A personal contribution becomes concessional once a deduction is claimed.
    expect(releasableAmount({
      personalContributions: 10000, deductionClaimed: true, rates: FY2026,
    })).toBe(8500);
  });

  it('caps counted CONTRIBUTIONS at the $50,000 lifetime limit, not the released amount', () => {
    const b = releasableBreakdown({ salarySacrificed: 15000, years: 10, rates: FY2026 });
    expect(b.countedTotal).toBe(50000);
    expect(b.releasable).toBe(42500); // 85% of $50,000, not $50,000
    expect(b.lifetimeLimitReached).toBe(true);
  });

  it('counts concessional first when a year exceeds the annual limit', () => {
    // $20k concessional + $5k non-concessional, $15k annual room. Concessional
    // fills it, so nothing non-concessional is counted.
    const b = releasableBreakdown({
      salarySacrificed: 20000, personalContributions: 5000, years: 1, rates: FY2026,
    });
    expect(b.countedConcessional).toBe(15000);
    expect(b.countedNonConcessional).toBe(0);
    expect(b.releasable).toBe(12750);
  });

  it('ignores voluntary concessional contributions above the concessional cap headroom', () => {
    const headroom = 4000;
    expect(releasableAmount({
      salarySacrificed: 15000, concessionalHeadroom: headroom, rates: FY2026,
    })).toBe(headroom * 0.85);
  });
});

describe('shortfall interest charge — quarterly, compounded daily (§2.6)', () => {
  it('resolves a published quarter', () => {
    expect(sicRateFor('2026-08-01', FY2026)).toMatchObject({ annualRate: 0.0743, projected: false });
    expect(sicRateFor('2026-05-01', FY2026)).toMatchObject({ annualRate: 0.0696, projected: false });
  });

  it('falls back to the most recent published rate for a future quarter, and flags it', () => {
    const r = sicRateFor('2027-05-01', FY2026);
    expect(r.annualRate).toBe(0.0743);
    expect(r.projected).toBe(true);
  });

  it('uses days in the CALENDAR year as the divisor, including leap years', () => {
    expect(daysInCalendarYear('2026-07-01')).toBe(365);
    expect(daysInCalendarYear('2028-02-01')).toBe(366);
    expect(daysBetween('2026-07-01', '2027-07-01')).toBe(365);
    expect(daysBetween('2027-07-01', '2028-07-01')).toBe(366);
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('[trap] compounds daily — a full year at 7.43% grows by more than 7.43%', () => {
    const { factor } = sicAccrualFactor('2026-07-01', '2027-07-01', FY2026);
    const simple = 1.0743;
    expect(factor).toBeGreaterThan(simple);
    // Daily compounding at r/365 for 365 days converges on e^r.
    expect(round2((factor - 1) * 10000) / 10000).toBeCloseTo(Math.exp(0.0743) - 1, 4);
  });

  it('splits the accrual at quarter and calendar-year boundaries', () => {
    const { quarters, projected } = sicAccrualFactor('2026-04-01', '2027-07-01', FY2026);
    // 2026-04-01→07-01 (6.96%), 07-01→10-01 (7.43%), 10-01→2027-01-01,
    // 2027-01-01→07-01 (projected).
    expect(quarters.map((q) => q.annualRate)).toEqual([0.0696, 0.0743, 0.0743, 0.0743]);
    expect(quarters.filter((q) => q.projected)).toHaveLength(2);
    expect(quarters.reduce((a, q) => a + q.days, 0)).toBe(daysBetween('2026-04-01', '2027-07-01'));
    expect(projected).toBe(true);
  });

  it('returns a factor of 1 for a zero-length or reversed period', () => {
    expect(sicAccrualFactor('2026-07-01', '2026-07-01', FY2026).factor).toBe(1);
    expect(sicAccrualFactor('2027-07-01', '2026-07-01', FY2026).factor).toBe(1);
  });
});

describe('associated earnings accumulate', () => {
  const r = calcFHSSS({ grossIncome: 80000, annualConcessional: 10000, years: 3, date: DATE });

  it('[trap] accumulates rather than overwriting each year', () => {
    const earnings = r.yearData.map((y) => y.earnings);
    expect(earnings).toHaveLength(3);
    for (let i = 1; i < earnings.length; i++) {
      expect(earnings[i]).toBeGreaterThan(earnings[i - 1]);
    }
    // The old decaying (years - yr + 1)/years multiplier made the final year's
    // increment the SMALLEST. Each tranche compounds, so it is the largest.
    const growth = earnings.map((e, i) => e - (earnings[i - 1] ?? 0));
    expect(growth[2]).toBeGreaterThan(growth[1]);
    expect(growth[1]).toBeGreaterThan(growth[0]);
  });

  it('accrues each year from 1 July of the year it was contributed in', () => {
    // Year 1's $8,500 accrues from 1 July, whenever in the year it was paid,
    // through to 30 June — the whole first financial year.
    const { factor } = sicAccrualFactor('2026-07-01', '2027-06-30', FY2026);
    expect(r.yearData[0].earnings).toBe(Math.round(8500 * (factor - 1)));
    expect(r.yearData[0].earnings).toBeGreaterThan(600);
    expect(r.determinationDate).toBe('2029-06-30');
  });

  it('flags that later quarters are projected from the last published rate', () => {
    expect(r.sicProjected).toBe(true);
    expect(r.sicRatesUsed.some((q) => q.projected)).toBe(true);
  });
});

describe('withdrawal tax', () => {
  it('[trap] includes Medicare — the effective rate is marginal + 2% − 30%', () => {
    // Well above $190,000, so the whole release sits in the 45% bracket and the
    // differencing method collapses to the flat marginal rate.
    const r = calcFHSSS({ grossIncome: 300000, annualConcessional: 15000, years: 3, date: DATE });
    expect(r.marginalRate).toBe(0.45);
    expect(round2(r.withholdingRate)).toBe(0.17);
    expect(round2(r.effectiveWithdrawalRate)).toBe(0.17);
    // Omitting Medicare understates the tax by exactly 2% of the assessable
    // amount — the bug this replaces.
    const withoutMedicare = r.assessableAmount * (0.45 - 0.30);
    expect(round2(r.withdrawalTax - withoutMedicare)).toBe(round2(r.assessableAmount * 0.02));
  });

  it('taxes only the concessional portion and the earnings', () => {
    const r = calcFHSSS({
      grossIncome: 300000, annualConcessional: 0, annualNonConcessional: 15000,
      years: 2, date: DATE,
    });
    expect(r.releasableNonConcessional).toBe(30000);
    expect(r.assessableAmount).toBe(r.totalEarnings);
    expect(r.assessableAmount).toBeLessThan(r.totalWithEarnings);
  });

  it('never goes negative when the 30% offset exceeds marginal plus Medicare', () => {
    const r = calcFHSSS({ grossIncome: 40000, annualConcessional: 5000, years: 2, date: DATE });
    expect(r.marginalRate).toBe(0.15);
    expect(r.withholdingRate).toBe(0); // 15% + 2% − 30% floors at zero
    expect(r.withdrawalTax).toBe(0);
    expect(r.netDeposit).toBe(r.totalWithEarnings);
  });

  it('excludes the released amount from HELP and MLS income', () => {
    const r = calcFHSSS({ grossIncome: 120000, annualConcessional: 15000, years: 2, date: DATE });
    expect(r.excludedFromHelpIncome).toBe(true);
    expect(r.excludedFromMlsIncome).toBe(true);
  });
});

describe('contribution-stage saving', () => {
  it('reports one saving figure, at marginal + Medicare − 15%', () => {
    const r = calcFHSSS({ grossIncome: 100000, annualConcessional: 10000, years: 3, date: DATE });
    expect(round2(r.annualTaxSaving)).toBe(round2(10000 * (0.30 + 0.02 - 0.15)));
    expect(round2(r.totalTaxSaving)).toBe(round2(r.annualTaxSaving * 3));
    expect(r.division293Applies).toBe(false);
  });

  it('halves the saving rate once Division 293 bites', () => {
    const r = calcFHSSS({ grossIncome: 300000, annualConcessional: 15000, years: 1, date: DATE });
    expect(r.division293Applies).toBe(true);
    expect(round2(r.division293Extra)).toBe(round2(15000 * 0.15));
    // marginal 45% + 2% − 15% − 15% = 17%, not 32%.
    expect(round2(r.annualTaxSaving / 15000)).toBe(0.17);
  });
});

describe('caps and registry values', () => {
  it('takes the concessional cap from the registry ($32,500, not $30,000)', () => {
    const r = calcFHSSS({ grossIncome: 100000, annualConcessional: 10000, date: DATE });
    expect(r.concessionalCap).toBe(32500);
    expect(r.annualLimit).toBe(15000);
    expect(r.lifetimeLimit).toBe(50000);
  });

  it('caps SG at the annual maximum contribution base', () => {
    const r = calcFHSSS({ grossIncome: 400000, annualConcessional: 10000, date: DATE });
    expect(round2(r.sgContribution)).toBe(round2(270830 * 0.12));
  });

  it('ignores a superBalance input — FHSSS has no total super balance test', () => {
    const base = calcFHSSS({ grossIncome: 100000, annualConcessional: 10000, date: DATE });
    const withBalance = calcFHSSS({
      grossIncome: 100000, annualConcessional: 10000, superBalance: 900000, date: DATE,
    });
    expect(withBalance.totalReleasable).toBe(base.totalReleasable);
    expect(withBalance.netDeposit).toBe(base.netDeposit);
  });
});

describe('§3.7 eligibility gate', () => {
  it('passes when nothing is answered "no"', () => {
    const e = checkEligibility({});
    expect(e.eligible).toBe(true);
    expect(e.items).toHaveLength(ELIGIBILITY_ITEMS.length);
  });

  it('covers every published condition', () => {
    expect(ELIGIBILITY_ITEMS.map((i) => i.key)).toEqual([
      'age18Plus', 'neverOwnedProperty', 'noPriorRelease', 'onTitle',
      'residentialOnly', 'willOccupy', 'determinationBeforeRegistration',
    ]);
  });

  it('[trap] flags the determination-before-registration failure as critical', () => {
    const e = checkEligibility({ determinationBeforeRegistration: false });
    expect(e.eligible).toBe(false);
    expect(e.criticalFailure).toBe(true);
    expect(e.blocking.map((i) => i.key)).toEqual(['determinationBeforeRegistration']);
  });

  it('blocks on prior ownership without being critical', () => {
    const e = checkEligibility({ neverOwnedProperty: false });
    expect(e.eligible).toBe(false);
    expect(e.criticalFailure).toBe(false);
  });

  it('surfaces the gate on the calculator result', () => {
    const r = calcFHSSS({
      grossIncome: 100000, annualConcessional: 10000, date: DATE,
      eligibility: { age18Plus: false },
    });
    expect(r.eligibility.eligible).toBe(false);
  });
});
