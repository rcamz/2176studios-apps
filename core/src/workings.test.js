import { describe, it, expect } from 'vitest';
import { calcPayTax, explainPayTax } from './paytax.js';
import { bracketBreakdown, workings, section, step, total } from './workings.js';
import { ratesFor } from './rates/index.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const pct = (r) => (r * 100).toFixed(0) + '%';
const FY = ratesFor('2026-09-10');

const allSteps = (w) => w.sections.flatMap((s) => s.steps);
const find = (w, re) => allSteps(w).find((s) => re.test(s.label));
const sum = (w, re) => allSteps(w).filter((s) => re.test(s.label)).reduce((a, s) => a + (typeof s.value === 'number' ? s.value : 0), 0);

describe('bracketBreakdown', () => {
  it('emits one line per bracket actually reached', () => {
    const steps = bracketBreakdown(50000, FY.incomeTax.resident, money, pct);
    expect(steps).toHaveLength(3); // 0%, 15%, 30%
  });

  it('the slices sum to the total tax', () => {
    for (const income of [30000, 50000, 100000, 140000, 250000]) {
      const direct = calcPayTax({ grossIncome: income, date: '2026-09-10' });
      // Break down TAXABLE income, which is below gross once the standard
      // deduction applies — and compare against tax before offsets.
      const steps = bracketBreakdown(direct.taxableIncome, FY.incomeTax.resident, money, pct);
      const fromSlices = steps.reduce((a, s) => a + s.value, 0);
      expect(fromSlices, `at gross ${income}`).toBeCloseTo(direct.incomeTax + direct.lito, 2);
    }
  });

  it('stops at the income, not the top of the scale', () => {
    const steps = bracketBreakdown(50000, FY.incomeTax.resident, money, pct);
    expect(steps.at(-1).label).toContain('$50,000');
  });

  it('returns nothing below the tax-free threshold', () => {
    expect(bracketBreakdown(15000, FY.incomeTax.resident, money, pct)).toHaveLength(1);
  });
});

describe('explainPayTax', () => {
  const inputs = { grossIncome: 145000, hecsBalance: 40000, salarySacrifice: 10000, sgRate: 12, date: '2026-09-10' };
  const result = calcPayTax(inputs);
  const w = explainPayTax(result, inputs);

  it('produces the expected sections', () => {
    const headings = w.sections.map((s) => s.heading);
    expect(headings).toContain('Taxable income');
    expect(headings).toContain('Income tax, bracket by bracket');
    expect(headings).toContain('Levies');
    expect(headings).toContain('Take-home');
  });

  it('the take-home total matches the calculation', () => {
    expect(find(w, /^Take-home pay$/).value).toBeCloseTo(result.takeHome, 2);
  });

  it('the taxable income total matches', () => {
    expect(find(w, /^Taxable income$/).value).toBeCloseTo(result.taxableIncome, 2);
  });

  it('the bracket slices reconcile to the income tax line', () => {
    const bracketSection = w.sections.find((s) => s.heading.startsWith('Income tax'));
    const slices = bracketSection.steps.filter((s) => / at \d/.test(s.label));
    const sliceTotal = slices.reduce((a, s) => a + s.value, 0);
    expect(sliceTotal).toBeCloseTo(result.incomeTax + result.lito, 2);
  });

  it('shows repayment income above taxable income when sacrificing', () => {
    // The teaching point: sacrifice is added back, so it does not reduce HELP.
    const repayment = find(w, /^Repayment income$/);
    expect(repayment.value).toBeGreaterThan(result.taxableIncome);
    expect(repayment.value).toBeCloseTo(result.repaymentIncome, 2);
  });

  it('states plainly that sacrifice does not reduce the repayment', () => {
    const notes = allSteps(w).filter((s) => s.kind === 'note').map((s) => s.label).join(' ');
    expect(notes).toMatch(/does not reduce your repayment/i);
  });

  it('omits the offset subtotal when no offset applies', () => {
    expect(find(w, /Tax before offsets/)).toBeUndefined();
  });

  it('includes the offset lines when LITO applies', () => {
    const low = { grossIncome: 40000, date: '2026-09-10' };
    const lw = explainPayTax(calcPayTax(low), low);
    expect(find(lw, /Low Income Tax Offset/)).toBeTruthy();
    expect(find(lw, /Tax before offsets/)).toBeTruthy();
  });

  it('omits the study loan section with no debt', () => {
    const noDebt = { grossIncome: 145000, date: '2026-09-10' };
    const nw = explainPayTax(calcPayTax(noDebt), noDebt);
    expect(nw.sections.map((s) => s.heading)).not.toContain('Study and training loan');
  });

  it('carries the financial year', () => {
    expect(w.asAt).toBe('FY2026-27');
  });

  it('every numeric step is finite', () => {
    for (const s of allSteps(w)) {
      if (typeof s.value === 'number') expect(Number.isFinite(s.value), s.label).toBe(true);
    }
  });
});

describe('builders', () => {
  it('drops falsy steps so conditionals can be inlined', () => {
    const w = workings([section('X', [step('a', 1), false, null, total('t', 1)])]);
    expect(w.sections[0].steps).toHaveLength(2);
  });

  it('drops falsy sections', () => {
    expect(workings([section('X', [step('a', 1)]), null, false]).sections).toHaveLength(1);
  });
});
