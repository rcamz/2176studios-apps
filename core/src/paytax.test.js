// Regression vectors from FY2026-27-rates-audit-v2.md §8.1–8.4.
// [ATO] cases are published worked examples — failing one is definitively wrong.
// [trap] cases test structural issues that produce plausible-but-wrong numbers.

import { describe, it, expect } from 'vitest';
import {
  incomeTaxOn, litoFor, helpRepaymentOn, repaymentIncomeFrom,
  mlsOn, mlsIncomeFrom, taxOnAdditionalIncome, calcPayTax,
} from './paytax.js';
import { ratesFor, resolve } from './rates/index.js';
import { incomeTax } from './rates/incomeTax.js';

const FY2026 = ratesFor('2026-09-10');
// Only the bracket series reaches back to FY2025-26 — Medicare, HELP and super
// were not verified for that year, so the registry deliberately won't resolve
// it. The prior-year comparison below needs the brackets alone.
const FY2025_BRACKETS = { incomeTax: resolve(incomeTax, '2026-06-30') };
const round2 = (n) => Math.round(n * 100) / 100;

describe('§8.1 resident income tax — FY2026-27 [calc]', () => {
  const cases = [
    [18200, 0], [30000, 1770.00], [45000, 4020.00], [50000, 5520.00],
    [100000, 20520.00], [135000, 31020.00], [150000, 36570.00],
    [190000, 51370.00], [200000, 55870.00],
  ];
  it.each(cases)('taxable $%i → $%s', (taxable, expected) => {
    expect(round2(incomeTaxOn(taxable, 'resident', FY2026))).toBe(expected);
  });

  it('[trap] differs from FY2025-26 by exactly $268 at and above $45,000', () => {
    for (const income of [45000, 50000, 100000, 190000, 200000]) {
      const diff = incomeTaxOn(income, 'resident', FY2025_BRACKETS) - incomeTaxOn(income, 'resident', FY2026);
      expect(round2(diff)).toBe(268);
    }
  });

  it('applies no tax-free threshold to foreign residents', () => {
    expect(round2(incomeTaxOn(50000, 'foreign', FY2026))).toBe(15000);
  });

  it('taxes a working holiday maker at 15% to $45,000', () => {
    expect(round2(incomeTaxOn(45000, 'holiday', FY2026))).toBe(6750);
  });
});

describe('§8.2 LITO [ATO/calc]', () => {
  const cases = [[37500, 700], [39000, 625], [42000, 475], [45000, 325], [66667, 0], [70000, 0]];
  it.each(cases)('taxable $%i → LITO $%s', (taxable, expected) => {
    expect(round2(litoFor(taxable, FY2026))).toBe(expected);
  });

  it('does not apply to foreign residents', () => {
    expect(calcPayTax({ grossIncome: 40000, residency: 'foreign', date: '2026-09-10' }).lito).toBe(0);
  });
});

describe('§8.3 HELP repayments — FY2026-27 [ATO]', () => {
  const cases = [
    [69528, 0], [80000, 1570.80], [86380, 2527.80], [137064, 10276.99], [254780, 25478.00],
  ];
  it.each(cases)('repayment income $%i → $%s', (income, expected) => {
    expect(round2(helpRepaymentOn(income, 1_000_000, FY2026))).toBe(expected);
  });

  it('[trap] switches from marginal to flat 10% at $186,051', () => {
    expect(round2(helpRepaymentOn(186050, 1e6, FY2026))).toBe(18604.61);
    expect(round2(helpRepaymentOn(186051, 1e6, FY2026))).toBe(18605.10);
  });

  it('[trap] the top tier is FLAT 10% of total, not marginal', () => {
    // A purely marginal implementation returns ~$28,388 here.
    expect(round2(helpRepaymentOn(300000, 1e6, FY2026))).toBe(30000.00);
  });

  it('[trap] repayment income sums all five components', () => {
    expect(repaymentIncomeFrom({
      taxableIncome: 60470,
      reportableFringeBenefits: 5400,
      totalNetInvestmentLoss: 1330,
      reportableSuperContributions: 16500,
      exemptForeignEmploymentIncome: 2680,
    })).toBe(86380);
  });

  it('[trap] excludes an assessable FHSS released amount', () => {
    // The released amount is assessable, so it arrives inside taxable income
    // and has to be netted back out of the repayment base.
    expect(repaymentIncomeFrom({ taxableIncome: 92000, fhssReleasedAmount: 12000 })).toBe(80000);
  });

  it('[trap] salary sacrifice is added back, so it does not reduce HELP', () => {
    const without = calcPayTax({ grossIncome: 100000, hecsBalance: 50000, date: '2026-09-10' });
    const withSac = calcPayTax({ grossIncome: 100000, hecsBalance: 50000, salarySacrifice: 15000, date: '2026-09-10' });
    expect(round2(withSac.helpRepayment)).toBe(round2(without.helpRepayment));
  });

  it('never repays more than the outstanding balance', () => {
    expect(helpRepaymentOn(200000, 500, FY2026)).toBe(500);
  });

  it('charges nothing with no debt', () => {
    expect(helpRepaymentOn(200000, 0, FY2026)).toBe(0);
  });
});

describe('§8.4 Medicare levy surcharge [ATO]', () => {
  it('[trap] applies to the WHOLE income, not the excess over the threshold', () => {
    const income = mlsIncomeFrom({ taxableIncome: 90000, reportableFringeBenefits: 27000 });
    expect(income).toBe(117000);
    // 1% of $117,000 — not 1% of the $12,000 excess over $105,000.
    expect(round2(mlsOn(income, false, FY2026))).toBe(1170.00);
  });

  const tiers = [[105000, 0], [105001, 0.010], [123001, 0.0125], [164001, 0.015]];
  it.each(tiers)('income $%i sits in the %s tier', (income, rate) => {
    expect(round2(mlsOn(income, false, FY2026))).toBe(round2(income * rate));
  });

  it('charges nothing with private hospital cover', () => {
    expect(mlsOn(200000, true, FY2026)).toBe(0);
  });

  it('lifts family thresholds by $1,500 per child after the first', () => {
    const opts = { family: true, dependentChildren: 2 };
    expect(mlsOn(211500, false, FY2026, opts)).toBe(0);
    expect(mlsOn(211501, false, FY2026, opts)).toBeGreaterThan(0);
  });

  it('[trap] adds reportable super back into MLS income', () => {
    expect(mlsIncomeFrom({ taxableIncome: 100000, reportableSuperContributions: 10000 })).toBe(110000);
  });
});

describe('bracket-crossing lump sums', () => {
  it('[trap] taxes across a bracket boundary rather than at one flat marginal rate', () => {
    // $130k base + $20k lump straddles the $135k boundary: $5k at 30%, $15k at 37%.
    const actual = taxOnAdditionalIncome(130000, 20000, { residency: 'resident', rates: FY2026 });
    expect(round2(actual)).toBe(round2(5000 * 0.30 + 15000 * 0.37));
    // The flat-marginal shortcut would give 20000 × 0.37 = $7,400.
    expect(round2(actual)).not.toBe(7400);
  });
});

describe('standard $1,000 work deduction (Tax Reform No. 1 Act 2026, Sch 4)', () => {
  it('applies the $1,000 floor when expenses are lower', () => {
    const r = calcPayTax({ grossIncome: 90000, workExpenses: 300, date: '2026-09-10' });
    expect(r.deductionClaimed).toBe(1000);
  });

  it('[trap] uses substantiated expenses when they exceed $1,000 — never adds on top', () => {
    const r = calcPayTax({ grossIncome: 90000, workExpenses: 2500, date: '2026-09-10' });
    expect(r.deductionClaimed).toBe(2500);
  });

  it('did not exist before FY2026-27', () => {
    expect(resolve(incomeTax, '2026-06-30').standardWorkDeduction).toBeNull();
    expect(resolve(incomeTax, '2026-07-01').standardWorkDeduction.amount).toBe(1000);
  });

  it('reduces taxable income', () => {
    const r = calcPayTax({ grossIncome: 90000, date: '2026-09-10' });
    expect(r.taxableIncome).toBe(89000);
  });
});

describe('Division 293', () => {
  it('does not apply below the threshold', () => {
    expect(calcPayTax({ grossIncome: 200000, sgRate: 12, date: '2026-09-10' }).division293).toBe(0);
  });

  it('charges 15% on the lesser of the excess or the concessional contributions', () => {
    // $300k salary, 12% SG = $36k contributions. Income + contributions = $336k,
    // excess over $250k = $86k. Lesser of $86k and $36k is $36k → $5,400.
    const r = calcPayTax({ grossIncome: 300000, sgRate: 12, date: '2026-09-10' });
    expect(round2(r.division293)).toBe(5400);
  });

  it('caps at the excess when that is smaller than contributions', () => {
    // $240k salary less the $1,000 standard deduction = $239k taxable.
    // 12% SG = $28.8k. Total $267.8k, so the excess is $17.8k — below the
    // contributions, so the excess is what gets taxed.
    const r = calcPayTax({ grossIncome: 240000, sgRate: 12, date: '2026-09-10' });
    expect(round2(r.division293)).toBe(round2(17800 * 0.15));
  });
});

describe('net-to-gross back-solve', () => {
  it('round-trips within a dollar', () => {
    const gross = 120000;
    const net = calcPayTax({ grossIncome: gross, date: '2026-09-10' }).takeHome;
    const solved = calcPayTax({ targetNet: net, date: '2026-09-10' }).grossIncome;
    expect(Math.abs(solved - gross)).toBeLessThan(1);
  });
});
