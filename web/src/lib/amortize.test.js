import { describe, it, expect } from 'vitest';
import { amortize, summarize, rateSensitivity, PERIODS_PER_YEAR } from './amortize.js';

const BASE = { loanAmount: 650000, annualRatePercent: 6.2, termYears: 30 };
const round2 = (n) => Math.round(n * 100) / 100;

describe('monthly amortisation', () => {
  it('matches the closed-form annuity payment', () => {
    const rows = amortize({ ...BASE, includeOffset: false, includeExtras: false });
    const r = 0.062 / 12;
    const n = 360;
    const expected = (650000 * r) / (1 - Math.pow(1 + r, -n));
    expect(round2(rows[0].payment)).toBeCloseTo(round2(expected), 2);
  });

  it('runs the full term and clears the balance', () => {
    const rows = amortize({ ...BASE, includeOffset: false, includeExtras: false });
    expect(rows.length).toBe(360);
    expect(rows[rows.length - 1].balance).toBeLessThan(0.01);
  });

  it('splits every payment into interest plus principal', () => {
    const rows = amortize({ ...BASE, includeOffset: false, includeExtras: false });
    for (const r of rows.slice(0, 50)) {
      expect(round2(r.interest + r.principal)).toBeCloseTo(round2(r.payment), 2);
    }
  });
});

describe('payment frequency', () => {
  it('pays a fortnightly instalment of half the monthly amount', () => {
    const monthly = amortize({ ...BASE, includeOffset: false, includeExtras: false });
    const fortnightly = amortize({ ...BASE, paymentFrequency: 'fortnightly', includeOffset: false, includeExtras: false });
    expect(round2(fortnightly[0].payment)).toBeCloseTo(round2(monthly[0].payment / 2), 1);
  });

  it('clears the loan years early on fortnightly repayments', () => {
    const monthly = summarize(amortize({ ...BASE, includeOffset: false, includeExtras: false }), 'monthly');
    const fortnightly = summarize(
      amortize({ ...BASE, paymentFrequency: 'fortnightly', includeOffset: false, includeExtras: false }),
      'fortnightly'
    );
    const yearsSaved = (monthly.payoffMonths - fortnightly.payoffMonths) / 12;
    // 26 half-payments a year is 13 months' worth — the standard AU result is
    // roughly four to six years off a 30-year loan.
    expect(yearsSaved).toBeGreaterThan(3.5);
    expect(yearsSaved).toBeLessThan(7);
    expect(fortnightly.totalInterest).toBeLessThan(monthly.totalInterest);
  });

  it('saves more again on weekly repayments', () => {
    const f = summarize(amortize({ ...BASE, paymentFrequency: 'fortnightly', includeOffset: false, includeExtras: false }), 'fortnightly');
    const w = summarize(amortize({ ...BASE, paymentFrequency: 'weekly', includeOffset: false, includeExtras: false }), 'weekly');
    expect(w.totalInterest).toBeLessThanOrEqual(f.totalInterest);
  });

  it('uses the right number of periods per year', () => {
    expect(PERIODS_PER_YEAR).toEqual({ monthly: 12, fortnightly: 26, weekly: 52 });
  });
});

describe('[regression] extra repayments are independent of the offset account', () => {
  it('still applies extras when the offset is switched off', () => {
    const withExtras = amortize({ ...BASE, includeOffset: false, extraRecurring: 500 });
    const without = amortize({ ...BASE, includeOffset: false, extraRecurring: 0 });
    // Previously extras were gated behind includeOffset, so these were equal.
    expect(withExtras.length).toBeLessThan(without.length);
  });

  it('honours includeExtras independently', () => {
    const on = amortize({ ...BASE, includeOffset: false, extraRecurring: 500, includeExtras: true });
    const off = amortize({ ...BASE, includeOffset: false, extraRecurring: 500, includeExtras: false });
    expect(on.length).toBeLessThan(off.length);
  });
});

describe('[regression] offset accrues during a fixed period', () => {
  const fixedCfg = {
    ...BASE, fixedRatePercent: 5.8, fixedPeriodYears: 3, revertRatePercent: 6.5,
    offsetStart: 25000, offsetMonthly: 2000, includeExtras: false,
  };

  it('keeps accumulating deposits while the fixed rate blocks offsetting', () => {
    const rows = amortize(fixedCfg);
    const atRevert = rows[36]; // first period after the 3-year fixed term
    // Previously deposits were skipped entirely during the fixed period, so the
    // balance was still $25,000 here and three years of saving had vanished.
    expect(atRevert.offsetBalance).toBeGreaterThan(25000 + 2000 * 35);
  });

  it('does not offset interest during the fixed period by default', () => {
    const rows = amortize(fixedCfg);
    expect(rows[10].offset).toBe(0);
    expect(rows[10].offsetBalance).toBeGreaterThan(25000);
  });

  it('offsets during the fixed period when the lender allows it', () => {
    const rows = amortize({ ...fixedCfg, offsetAppliesDuringFixed: true });
    expect(rows[10].offset).toBeGreaterThan(0);
  });

  it('the accumulated balance reduces interest immediately on revert', () => {
    const accrues = summarize(amortize(fixedCfg));
    const noOffset = summarize(amortize({ ...fixedCfg, includeOffset: false }));
    expect(accrues.totalInterest).toBeLessThan(noOffset.totalInterest);
  });
});

describe('fixed rate revert', () => {
  it('flags the switch period and recalculates the payment', () => {
    const rows = amortize({
      ...BASE, fixedRatePercent: 5.8, fixedPeriodYears: 2, revertRatePercent: 7.5,
      includeOffset: false, includeExtras: false,
    });
    const switchRow = rows.find((r) => r.isRateSwitch);
    expect(switchRow.period).toBe(25);
    expect(switchRow.ratePct).toBe(7.5);
    expect(rows[24].payment).toBeGreaterThan(rows[23].payment);
  });
});

describe('interest-only period', () => {
  const io = { ...BASE, interestOnlyYears: 5, includeOffset: false, includeExtras: false };

  it('pays no principal during the interest-only years', () => {
    const rows = amortize(io);
    for (const r of rows.slice(0, 60)) {
      expect(r.isInterestOnly).toBe(true);
      expect(round2(r.principal)).toBe(0);
    }
    expect(round2(rows[59].balance)).toBe(650000);
  });

  it('amortises over the remaining term afterwards, at a higher payment', () => {
    const rows = amortize(io);
    const plain = amortize({ ...BASE, includeOffset: false, includeExtras: false });
    expect(rows[60].payment).toBeGreaterThan(plain[60].payment);
    expect(rows[rows.length - 1].balance).toBeLessThan(0.01);
  });

  it('costs more interest overall', () => {
    expect(summarize(amortize(io)).totalInterest)
      .toBeGreaterThan(summarize(amortize({ ...BASE, includeOffset: false, includeExtras: false })).totalInterest);
  });
});

describe('offset behaviour', () => {
  it('never offsets more than the outstanding balance', () => {
    const rows = amortize({ ...BASE, offsetStart: 900000, includeExtras: false });
    expect(rows[0].offset).toBeLessThanOrEqual(rows[0].balance + rows[0].principal);
    expect(rows[0].interest).toBe(0);
  });

  it('applies lump deposits and withdrawals at the right month', () => {
    const rows = amortize({
      ...BASE, offsetStart: 0, offsetMonthly: 0,
      offsetLumps: [{ month: 12, amount: 50000 }],
      offsetWithdrawals: [{ month: 24, amount: 20000 }],
      includeExtras: false,
    });
    expect(rows[10].offsetBalance).toBe(0);
    expect(rows[11].offsetBalance).toBe(50000);
    expect(rows[23].offsetBalance).toBe(30000);
  });
});

describe('rate sensitivity', () => {
  it('reports higher repayments and interest as rates rise', () => {
    const s = rateSensitivity({ ...BASE, includeOffset: false, includeExtras: false });
    const down = s.find((x) => x.delta === -1);
    const flat = s.find((x) => x.delta === 0);
    const up = s.find((x) => x.delta === 2);
    expect(down.payment).toBeLessThan(flat.payment);
    expect(up.payment).toBeGreaterThan(flat.payment);
    expect(up.totalInterest).toBeGreaterThan(flat.totalInterest);
  });
});

describe('summarize', () => {
  it('converts periods to months for any frequency', () => {
    const rows = amortize({ ...BASE, paymentFrequency: 'fortnightly', includeOffset: false, includeExtras: false });
    const s = summarize(rows, 'fortnightly');
    expect(s.payoffMonths).toBeCloseTo((rows.length / 26) * 12, 0);
  });

  it('handles a zero interest rate', () => {
    const rows = amortize({ loanAmount: 120000, annualRatePercent: 0, termYears: 10, includeOffset: false, includeExtras: false });
    expect(round2(rows[0].payment)).toBe(1000);
    expect(round2(summarize(rows).totalInterest)).toBe(0);
  });
});
