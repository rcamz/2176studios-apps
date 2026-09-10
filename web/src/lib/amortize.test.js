import { describe, it, expect } from 'vitest';
import { amortize, summarize, rateSensitivity, explainAmortisation, PERIODS_PER_YEAR } from './amortize.js';
import { estimateLmi } from './lmi.js';

const BASE = { loanAmount: 650000, annualRatePercent: 6.2, termYears: 30 };
const round2 = (n) => Math.round(n * 100) / 100;

// ─── Explanation helpers ─────────────────────────────────────────────────────
const allSteps = (w) => w.sections.flatMap((s) => s.steps);
const sec = (w, re) => w.sections.find((s) => re.test(s.heading));
const find = (w, re) => allSteps(w).find((s) => re.test(s.label));
const notes = (w) => allSteps(w).filter((s) => s.kind === 'note').map((s) => s.label).join(' ');
// Component lines are everything above the section's total.
const reconciles = (section) => {
  const t = section.steps.find((s) => s.kind === 'total');
  const upTo = section.steps.slice(0, section.steps.indexOf(t));
  const sum = upTo
    .filter((s) => s.kind === 'line' && typeof s.value === 'number' && !s.muted)
    .reduce((a, s) => a + s.value, 0);
  return { sum, total: t.value };
};

function build(inputs, opts = {}) {
  const cfg = { includeOffset: true, includeExtras: true, ...inputs };
  const withRows = amortize(cfg);
  const baseRows = amortize({
    ...cfg, offsetStart: 0, offsetMonthly: 0, offsetLumps: [], offsetWithdrawals: [],
    extraRecurring: 0, extraLumps: [], includeOffset: false, includeExtras: false,
  });
  const offsetOnlyRows = amortize({ ...cfg, extraRecurring: 0, extraLumps: [], includeExtras: false });
  const freq = inputs.paymentFrequency ?? 'monthly';
  return explainAmortisation({
    withRows,
    withSummary: summarize(withRows, freq),
    baseSummary: summarize(baseRows, freq),
    offsetOnlySummary: summarize(offsetOnlyRows, freq),
    rateSwitchPeriod: withRows.find((r) => r.isRateSwitch)?.period ?? null,
    lmi: inputs.propertyValue
      ? estimateLmi({ loanAmount: inputs.loanAmount, propertyValue: inputs.propertyValue })
      : null,
    ...opts,
  }, inputs);
}

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

describe('explainAmortisation', () => {
  const inputs = {
    ...BASE, propertyValue: 780000, paymentFrequency: 'monthly',
    offsetStart: 25000, offsetMonthly: 1000, extraRecurring: 400,
    offsetLumps: [{ month: 12, amount: 10000 }],
    offsetWithdrawals: [{ month: 60, amount: 5000 }],
    extraLumps: [{ month: 24, amount: 15000 }],
  };
  const w = build(inputs);

  it('produces the expected sections', () => {
    const headings = w.sections.map((s) => s.heading);
    expect(headings).toContain('Your repayment');
    expect(headings).toContain('Your offset account');
    expect(headings).toContain('Your extra repayments');
    expect(headings).toContain('Interest saved');
    expect(headings).toContain('What you pay in total');
    expect(headings).toContain('Lenders Mortgage Insurance');
  });

  it('derives the repayment the schedule actually charges', () => {
    const plain = build({ ...BASE, includeOffset: false, includeExtras: false });
    const rows = amortize({ ...BASE, includeOffset: false, includeExtras: false });
    expect(find(plain, /^Monthly repayment$/).value).toBeCloseTo(rows[0].payment, 6);
  });

  it('the interest lines reconcile to the interest actually paid', () => {
    const { sum, total } = reconciles(sec(w, /^Interest saved$/));
    expect(sum).toBeCloseTo(total, 6);
    const rows = amortize({ ...inputs, includeOffset: true, includeExtras: true });
    expect(total).toBeCloseTo(summarize(rows).totalInterest, 6);
  });

  it('splits the saving between the offset and the extra repayments', () => {
    const s = sec(w, /^Interest saved$/);
    const offset = s.steps.find((x) => /saved by the offset$/.test(x.label));
    const extras = s.steps.find((x) => /saved by extra repayments$/.test(x.label));
    expect(offset.value).toBeLessThan(0);
    expect(extras.value).toBeLessThan(0);
    const base = s.steps.find((x) => /no offset and no extra/.test(x.label));
    expect(base.value + offset.value + extras.value).toBeCloseTo(
      s.steps.find((x) => x.kind === 'total').value, 6
    );
  });

  it('reports the saving as one line when the split is not available', () => {
    const one = build(inputs, { offsetOnlySummary: null });
    const s = sec(one, /^Interest saved$/);
    expect(s.steps.some((x) => /offset and extra repayments/.test(x.label))).toBe(true);
    const { sum, total } = reconciles(s);
    expect(sum).toBeCloseTo(total, 6);
  });

  it('the offset deposits reconcile to the closing offset balance', () => {
    const { sum, total } = reconciles(sec(w, /^Your offset account$/));
    expect(sum).toBeCloseTo(total, 6);
    const rows = amortize({ ...inputs, includeOffset: true, includeExtras: true });
    expect(total).toBeCloseTo(rows[rows.length - 1].offsetBalance, 2);
  });

  it('the extra repayments reconcile to the extra principal shown', () => {
    const { sum, total } = reconciles(sec(w, /^Your extra repayments$/));
    expect(sum).toBeCloseTo(total, 6);
  });

  it('principal plus interest reconciles to the total paid', () => {
    const { sum, total } = reconciles(sec(w, /^What you pay in total$/));
    expect(sum).toBeCloseTo(total, 6);
    const rows = amortize({ ...inputs, includeOffset: true, includeExtras: true });
    expect(total).toBeCloseTo(summarize(rows).totalPaid, 2);
  });

  it('spells out that 26 fortnightly payments is 13 months of repayments', () => {
    const fw = build({ ...BASE, paymentFrequency: 'fortnightly', includeOffset: false, includeExtras: false });
    const s = sec(fw, /clears the loan early/);
    expect(s).toBeTruthy();
    const monthly = find(fw, /^Monthly repayment$/).value;
    const fortnightly = find(fw, /^Fortnightly repayment$/).value;
    const perYear = s.steps.find((x) => /× 26 payments a year/.test(x.label)).value;
    const twelve = s.steps.find((x) => /A year of monthly repayments/.test(x.label)).value;
    const extra = s.steps.find((x) => x.kind === 'total').value;

    expect(fortnightly).toBeCloseTo(monthly / 2, 6);
    expect(perYear).toBeCloseTo(fortnightly * 26, 6);
    expect(perYear).toBeCloseTo(monthly * 13, 6);       // 13 months, not 12
    expect(perYear - twelve).toBeCloseTo(extra, 6);
    expect(extra).toBeCloseTo(monthly, 6);              // exactly one extra month
    expect(s.note).toMatch(/13 months/);
  });

  it('shows a weekly payment as a quarter of the monthly amount', () => {
    const ww = build({ ...BASE, paymentFrequency: 'weekly', includeOffset: false, includeExtras: false });
    const monthly = find(ww, /^Monthly repayment$/).value;
    expect(find(ww, /^Weekly repayment$/).value).toBeCloseTo(monthly / 4, 6);
    expect(sec(ww, /clears the loan early/).steps.find((x) => x.kind === 'total').value)
      .toBeCloseTo(monthly, 6);
  });

  it('omits the frequency section for a monthly loan', () => {
    expect(sec(build({ ...BASE, includeOffset: false, includeExtras: false }), /clears the loan early/))
      .toBeUndefined();
  });

  it('shows where the fixed rate reverts and what the repayment becomes', () => {
    const fx = build({
      ...BASE, rateType: 'fixed', fixedRatePercent: 5.8, fixedPeriodYears: 2, revertRatePercent: 7.5,
      includeOffset: false, includeExtras: false,
    });
    const s = sec(fx, /fixed rate ends/);
    expect(s).toBeTruthy();
    const before = s.steps.find((x) => /the month before/.test(x.label)).value;
    const after = s.steps.find((x) => /the month after/.test(x.label)).value;
    const change = s.steps.find((x) => x.kind === 'total').value;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeCloseTo(change, 6);
  });

  it('omits the revert section on a variable loan', () => {
    expect(sec(build({ ...BASE, includeOffset: false, includeExtras: false }), /fixed rate ends/))
      .toBeUndefined();
  });

  it('reconciles the deposit and loan to the property value, and low/high to the midpoint', () => {
    const s = sec(w, /Lenders Mortgage Insurance/);
    const { sum, total } = reconciles(s);
    expect(sum).toBeCloseTo(total, 6);
    expect(total).toBe(780000);
    const low = s.steps.find((x) => /low estimate/.test(x.label)).value;
    const high = s.steps.find((x) => /high estimate/.test(x.label)).value;
    const mid = s.steps.filter((x) => x.kind === 'total').at(-1).value;
    expect((low + high) / 2).toBeCloseTo(mid, 6);
  });

  it('drops the LMI section when no property value was entered', () => {
    expect(sec(build({ ...BASE, includeOffset: false, includeExtras: false }), /Lenders Mortgage Insurance/))
      .toBeUndefined();
  });

  it('says there is no LMI at a 20% deposit rather than hiding the section', () => {
    const lw = build({ ...BASE, loanAmount: 640000, propertyValue: 800000, includeOffset: false, includeExtras: false });
    const s = sec(lw, /Lenders Mortgage Insurance/);
    expect(s.steps.some((x) => /low estimate/.test(x.label))).toBe(false);
    expect(s.steps.some((x) => x.kind === 'note' && /No LMI/i.test(x.label))).toBe(true);
  });

  it('drops the offset and extras sections when neither is used', () => {
    const bare = build({ ...BASE, includeOffset: false, includeExtras: false });
    const headings = bare.sections.map((s) => s.heading);
    expect(headings).not.toContain('Your offset account');
    expect(headings).not.toContain('Your extra repayments');
    expect(headings).toContain('Interest saved');
  });

  it('explains the offset rather than restating the arithmetic', () => {
    expect(notes(w) + w.sections.map((s) => s.note ?? '').join(' '))
      .toMatch(/taxed at your marginal rate/i);
  });

  it('warns that the offset does not bite during a fixed period', () => {
    const fx = build({
      ...BASE, rateType: 'fixed', fixedRatePercent: 5.8, fixedPeriodYears: 3, revertRatePercent: 6.5,
      offsetStart: 25000, offsetMonthly: 2000, includeExtras: false,
    });
    expect(notes(fx)).toMatch(/does not reduce your interest/i);
  });

  it('handles a split loan without inventing a single rate', () => {
    const sw = build({
      ...BASE, rateType: 'split', splitMode: 'pct', splitFixedPct: 60,
      fixedRatePercent: 5.8, fixedPeriodYears: 2, revertRatePercent: 6.5,
      splitVariableRatePercent: 6.2, includeOffset: false, includeExtras: false,
    });
    const { sum, total } = reconciles(sec(sw, /^Your repayment$/));
    expect(sum).toBeCloseTo(total, 6);
    expect(total).toBe(650000);
  });

  it('every numeric step is finite', () => {
    for (const variant of [
      w,
      build({ ...BASE, paymentFrequency: 'weekly' }),
      build({ ...BASE, annualRatePercent: 0, includeOffset: false, includeExtras: false }),
      build({ ...BASE, interestOnlyYears: 5, includeOffset: false, includeExtras: false }),
      build({ ...BASE, rateType: 'split', splitFixedPct: 50, splitVariableRatePercent: 6.4 }),
    ]) {
      for (const s of allSteps(variant)) {
        if (typeof s.value === 'number') expect(Number.isFinite(s.value), s.label).toBe(true);
      }
    }
  });

  it('returns nothing at all when there is no schedule', () => {
    expect(explainAmortisation({ withRows: [] }, BASE).sections).toHaveLength(0);
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
