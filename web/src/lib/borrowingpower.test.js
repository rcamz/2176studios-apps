import { describe, it, expect } from 'vitest';
import { calcBorrowingPower, expenseBenchmark } from './borrowingpower.js';
import { ratesFor } from './rates/index.js';

const BASE = {
  grossIncome1: 120000, applicantType: 'single', monthlyExpenses: 3000,
  interestRate: 6.0, termYears: 30, date: '2026-09-10',
};

describe('[regression] HELP balances actually reach the tax engine', () => {
  it('reduces capacity when a HELP debt exists', () => {
    const none = calcBorrowingPower({ ...BASE, helpBalance1: 0 });
    const debt = calcBorrowingPower({ ...BASE, helpBalance1: 40000 });
    // Previously the balance was collected and never passed on, so these were
    // identical and the UI showed a permanent $0/mo HELP figure.
    expect(debt.helpMonthly).toBeGreaterThan(0);
    expect(debt.maxBorrowing).toBeLessThan(none.maxBorrowing);
  });

  it('costs roughly the same capacity for a small and a large debt', () => {
    // Lenders assess the repayment, not the balance.
    const small = calcBorrowingPower({ ...BASE, helpBalance1: 25000 });
    const large = calcBorrowingPower({ ...BASE, helpBalance1: 80000 });
    expect(small.helpMonthly).toBeCloseTo(large.helpMonthly, 2);
  });

  it('does not double-count the repayment as a separate commitment', () => {
    // takeHome is already net of HELP, so it must not also appear in debts.
    const r = calcBorrowingPower({ ...BASE, helpBalance1: 40000 });
    expect(r.existingDebts).toBe(0);
  });
});

describe('[regression] other income is taxed and shaded', () => {
  it('does not treat rental income as tax-free', () => {
    const withRent = calcBorrowingPower({ ...BASE, rentalIncome: 30000 });
    const asIfSalary = calcBorrowingPower({ ...BASE, grossIncome1: 120000 + 30000 * 0.8 });
    // Shaded to 80% then taxed — so it should match salary of the shaded
    // amount, not add 30k of untaxed cash.
    expect(withRent.netMonthlyIncome).toBeCloseTo(asIfSalary.netMonthlyIncome, 0);
  });

  it('shades rental income by at least 20% per APG 223', () => {
    const rates = ratesFor('2026-09-10');
    expect(rates.lending.rentalIncomeShading).toBeLessThanOrEqual(0.80);
  });

  it('shades self-employed income on gross, before tax', () => {
    const payg = calcBorrowingPower({ ...BASE, employmentType1: 'payg' });
    const selfEmp = calcBorrowingPower({ ...BASE, employmentType1: 'self-employed' });
    const equivalent = calcBorrowingPower({ ...BASE, grossIncome1: 120000 * 0.8 });
    expect(selfEmp.netMonthlyIncome).toBeCloseTo(equivalent.netMonthlyIncome, 0);
    expect(selfEmp.maxBorrowing).toBeLessThan(payg.maxBorrowing);
  });

  it('shades casual income too', () => {
    const casual = calcBorrowingPower({ ...BASE, employmentType1: 'casual' });
    const payg = calcBorrowingPower({ ...BASE, employmentType1: 'payg' });
    // Previously 'casual' was a UI option the lib never branched on.
    expect(casual.maxBorrowing).toBeLessThan(payg.maxBorrowing);
  });
});

describe('deposit constraint', () => {
  it('caps borrowing by the deposit when that binds first', () => {
    // $20k at a 95% ceiling reaches $380k, well under what this income services.
    const r = calcBorrowingPower({ ...BASE, deposit: 20000 });
    expect(r.bindingConstraint).toBe('deposit');
    expect(r.maxBorrowing).toBeLessThan(r.maxByServiceability);
    expect(r.warnings.some((w) => /deposit is the limit/i.test(w.title))).toBe(true);
  });

  it('reports the price reachable without paying LMI', () => {
    const r = calcBorrowingPower({ ...BASE, deposit: 100000 });
    // A 20% deposit on $500,000.
    expect(r.maxPropertyPriceNoLmi).toBeCloseTo(500000, 0);
    expect(r.maxPropertyPrice).toBeGreaterThan(r.maxPropertyPriceNoLmi);
  });

  it('honours an explicit LVR ceiling', () => {
    const at95 = calcBorrowingPower({ ...BASE, deposit: 50000, maxLvr: 0.95 });
    const at80 = calcBorrowingPower({ ...BASE, deposit: 50000, maxLvr: 0.80 });
    expect(at80.maxByDeposit).toBeLessThan(at95.maxByDeposit);
  });

  it('falls back to serviceability with a large deposit', () => {
    const r = calcBorrowingPower({ ...BASE, deposit: 400000 });
    expect(r.bindingConstraint).toBe('serviceability');
    expect(r.maxBorrowing).toBeCloseTo(r.maxByServiceability, 2);
  });

  it('reports serviceability alone when no deposit is entered', () => {
    const r = calcBorrowingPower({ ...BASE, deposit: 0 });
    expect(r.maxByDeposit).toBeNull();
    expect(r.bindingConstraint).toBe('serviceability');
  });
});

describe('expense benchmark', () => {
  it('scales with income rather than sitting at a flat floor', () => {
    const low = expenseBenchmark({ applicantType: 'single', dependants: 0, combinedGrossIncome: 60000 });
    const high = expenseBenchmark({ applicantType: 'single', dependants: 0, combinedGrossIncome: 200000 });
    expect(high).toBeGreaterThan(low);
  });

  it('scales with household composition', () => {
    const single = expenseBenchmark({ applicantType: 'single', dependants: 0, combinedGrossIncome: 120000 });
    const couple = expenseBenchmark({ applicantType: 'joint', dependants: 0, combinedGrossIncome: 120000 });
    const family = expenseBenchmark({ applicantType: 'joint', dependants: 2, combinedGrossIncome: 120000 });
    expect(couple).toBeGreaterThan(single);
    expect(family).toBeGreaterThan(couple);
  });

  it('lands in a plausible range for a family, unlike the old flat $2,900', () => {
    const family = expenseBenchmark({ applicantType: 'joint', dependants: 2, combinedGrossIncome: 200000 });
    expect(family).toBeGreaterThan(4000);
    expect(family).toBeLessThan(6500);
  });

  it('acts as a floor — declared expenses win when higher', () => {
    const r = calcBorrowingPower({ ...BASE, monthlyExpenses: 9000 });
    expect(r.effectiveExpenses).toBe(9000);
    expect(r.benchmarkApplied).toBe(false);
  });
});

describe('serviceability mechanics', () => {
  it('assesses at the rate plus the 3pp APRA buffer', () => {
    const r = calcBorrowingPower(BASE);
    expect(r.bufferedRate).toBeCloseTo(9.0, 2);
  });

  it('assesses interest-only on the higher eventual P&I repayment', () => {
    const pi = calcBorrowingPower({ ...BASE, repaymentType: 'pi' });
    const io = calcBorrowingPower({ ...BASE, repaymentType: 'io', interestOnlyYears: 5 });
    // Previously repaymentType was destructured and never used.
    expect(io.maxBorrowing).toBeLessThan(pi.maxBorrowing);
  });

  it('assesses credit cards on the full limit', () => {
    const none = calcBorrowingPower({ ...BASE, creditCardLimits: 0 });
    const card = calcBorrowingPower({ ...BASE, creditCardLimits: 20000 });
    expect(card.creditCardMonthly).toBeCloseTo(20000 * 0.038, 2);
    expect(card.maxBorrowing).toBeLessThan(none.maxBorrowing);
  });

  it('falls as rates rise', () => {
    const s = calcBorrowingPower(BASE).sensitivity;
    expect(s.find((x) => x.delta === 2).borrowing)
      .toBeLessThan(s.find((x) => x.delta === -1).borrowing);
  });
});

describe('debt to income', () => {
  it('excludes HELP from the ratio but keeps it in serviceability', () => {
    const r = calcBorrowingPower({ ...BASE, helpBalance1: 60000 });
    const grossIncome = 120000;
    // Only the new loan and credit limits count toward DTI, never the HELP debt.
    expect(r.dti).toBeCloseTo(r.maxBorrowing / grossIncome, 1);
    expect(r.helpMonthly).toBeGreaterThan(0);
  });

  it('warns rather than blocking at a ratio of 6 or more', () => {
    const r = calcBorrowingPower({ ...BASE, grossIncome1: 90000, monthlyExpenses: 1000 });
    if (r.dtiConstrained) {
      expect(r.maxBorrowing).toBeGreaterThan(0); // a warning, not a hard stop
      expect(r.warnings.some((w) => /debt-to-income/i.test(w.title))).toBe(true);
    }
  });
});

describe('First Home Guarantee', () => {
  it('removes LMI', () => {
    const r = calcBorrowingPower({ ...BASE, deposit: 40000, firstHomeGuarantee: true });
    expect(r.lmi.payable).toBe(false);
  });

  it('says plainly that it does not increase borrowing power', () => {
    const guaranteed = calcBorrowingPower({ ...BASE, deposit: 40000, firstHomeGuarantee: true });
    const plain = calcBorrowingPower({ ...BASE, deposit: 40000, firstHomeGuarantee: false });
    expect(guaranteed.maxByServiceability).toBeCloseTo(plain.maxByServiceability, 2);
    expect(guaranteed.warnings.some((w) => /does not increase your borrowing power/i.test(w.title))).toBe(true);
  });
});

describe('joint applicants', () => {
  it('counts both incomes', () => {
    const single = calcBorrowingPower({ ...BASE, applicantType: 'single' });
    const joint = calcBorrowingPower({ ...BASE, applicantType: 'joint', grossIncome2: 90000 });
    expect(joint.maxBorrowing).toBeGreaterThan(single.maxBorrowing);
  });

  it('ignores the second income when single', () => {
    const a = calcBorrowingPower({ ...BASE, applicantType: 'single', grossIncome2: 90000 });
    const b = calcBorrowingPower({ ...BASE, applicantType: 'single', grossIncome2: 0 });
    expect(a.maxBorrowing).toBeCloseTo(b.maxBorrowing, 2);
  });
});

describe('no dead output', () => {
  it('returns finite, defined values', () => {
    const r = calcBorrowingPower({ ...BASE, deposit: 100000, helpBalance1: 30000 });
    for (const [k, v] of Object.entries(r)) {
      expect(v, `${k} defined`).toBeDefined();
      if (typeof v === 'number') expect(Number.isFinite(v), `${k} finite`).toBe(true);
    }
  });
});
