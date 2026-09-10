// Savings regression tests.
//
// There are no pre-written vectors for this calculator, so the anchors are
// (a) the closed-form annuity formulae, recomputed here independently of the
// engine, and (b) a hand-rolled reference loop for the frequencies the closed
// form cannot express.

import { describe, it, expect } from 'vitest';
import {
  calcSavings,
  simulate,
  solveMonthsToTarget,
  solveMonthlyContribution,
  effectiveAnnualRate,
  periodsPerYear,
} from './savings.js';

const round2 = (n) => Math.round(n * 100) / 100;

// ─── Independent references ──────────────────────────────────────────────────

// Ordinary annuity, computed from the textbook formula rather than the engine.
function fvOrdinary(pv, pmt, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const g = (1 + r) ** n;
  return pv * g + (r === 0 ? pmt * n : (pmt * (g - 1)) / r);
}

// Annuity due — the same cash flows moved to the start of each month.
function fvDue(pv, pmt, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const g = (1 + r) ** n;
  return pv * g + (r === 0 ? pmt * n : (pmt * (g - 1) * (1 + r)) / r);
}

// Reference loop for quarterly/annual crediting: interest accrues monthly on
// the running balance and is added at the end of each period.
function referenceCredited(pv, pmt, annualRate, years, monthsPerPeriod) {
  const r = annualRate / 100 / 12;
  let bal = pv;
  let accrued = 0;
  for (let m = 1; m <= years * 12; m++) {
    accrued += bal * r;
    if (m % monthsPerPeriod === 0) {
      bal += accrued;
      accrued = 0;
    }
    bal += pmt;
  }
  return bal;
}

// ─── Compound interest, verified against the closed form ─────────────────────

describe('compound interest', () => {
  it('monthly compounding matches the ordinary-annuity closed form exactly', () => {
    const r = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
    });
    const expected = fvOrdinary(10000, 500, 5, 10);
    expect(round2(expected)).toBe(94111.23); // independently computed anchor
    expect(r.finalBalance).toBe(Math.round(expected));
    expect(r.totalContributed).toBe(10000 + 500 * 120);
    expect(r.totalInterest).toBe(Math.round(expected - 70000));
  });

  it('start-of-month contributions match the annuity-due closed form', () => {
    const r = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
      contributionTiming: 'start',
    });
    expect(r.finalBalance).toBe(Math.round(fvDue(10000, 500, 5, 10)));
    // An annuity due is worth one month of interest more.
    const end = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
    });
    expect(r.finalBalance).toBeGreaterThan(end.finalBalance);
  });

  it.each([
    ['quarterly', 3],
    ['annually', 12],
  ])('%s crediting matches the reference loop', (compoundFreq, monthsPerPeriod) => {
    const r = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq, taxOnInterest: 0, inflationRate: 0,
    });
    expect(r.finalBalance).toBe(Math.round(referenceCredited(10000, 500, 5, 10, monthsPerPeriod)));
  });

  it('ranks the frequencies correctly: monthly > quarterly > annual', () => {
    const base = {
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, taxOnInterest: 0, inflationRate: 0,
    };
    const m = calcSavings({ ...base, compoundFreq: 'monthly' }).finalBalance;
    const q = calcSavings({ ...base, compoundFreq: 'quarterly' }).finalBalance;
    const a = calcSavings({ ...base, compoundFreq: 'annually' }).finalBalance;
    expect(m).toBeGreaterThan(q);
    expect(q).toBeGreaterThan(a);
  });

  it('does not lump contributions into a year-end deposit', () => {
    // The old model deposited monthlyContribution × 12 once a year under annual
    // compounding, forfeiting every dollar of intra-year interest.
    const lumped = (() => {
      const r = 0.05;
      let bal = 10000;
      for (let y = 0; y < 10; y++) bal = bal * (1 + r) + 6000;
      return bal;
    })();
    const annual = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq: 'annually', taxOnInterest: 0, inflationRate: 0,
    }).finalBalance;
    expect(annual).toBeGreaterThan(Math.round(lumped));
  });

  it('handles a zero interest rate without dividing by zero', () => {
    const r = calcSavings({
      initialDeposit: 1000, monthlyContribution: 100, annualRate: 0,
      termYears: 5, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
    });
    expect(r.finalBalance).toBe(1000 + 100 * 60);
    expect(r.totalInterest).toBe(0);
  });

  it('reports the effective annual rate implied by the crediting frequency', () => {
    expect(round2(effectiveAnnualRate(5, 'monthly') * 100)).toBe(5.12);
    expect(round2(effectiveAnnualRate(5, 'quarterly') * 100)).toBe(5.09);
    expect(round2(effectiveAnnualRate(5, 'annually') * 100)).toBe(5);
    expect(periodsPerYear('quarterly')).toBe(4);
  });

  it('handles a part-year term', () => {
    const r = calcSavings({
      initialDeposit: 1000, monthlyContribution: 0, annualRate: 12,
      termYears: 0.5, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
    });
    expect(r.finalBalance).toBe(Math.round(1000 * 1.01 ** 6));
  });
});

// ─── Tax ─────────────────────────────────────────────────────────────────────

describe('tax on interest', () => {
  const base = {
    initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
    termYears: 30, compoundFreq: 'monthly', inflationRate: 0,
  };

  it('is deducted annually, not as one lump at the end', () => {
    const taxed = calcSavings({ ...base, taxOnInterest: 32.5 });
    const gross = calcSavings({ ...base, taxOnInterest: 0 });

    // The old model: gross FV less one lump of tax on total interest.
    const lumpTaxed = gross.finalBalance - (gross.totalInterest * 0.325);

    expect(taxed.finalBalance).toBeLessThan(Math.round(lumpTaxed));
    // Over 30 years the difference is material, not a rounding artefact.
    expect(lumpTaxed - taxed.finalBalance).toBeGreaterThan(10000);
  });

  it('reduces the compounding base each year', () => {
    const t = simulate({
      initialDeposit: 10000, monthlyContribution: 0, annualRate: 10,
      months: 24, compoundFreq: 'annually', taxOnInterest: 50,
    });
    // Year 1: 1,000 interest, 500 tax → 10,500.
    // Year 2: 1,050 interest, 525 tax → 11,025. A lump-sum model would compound
    // the untaxed 11,000 → 12,100 and tax 2,100 once, ending at 11,050.
    expect(round2(t.balance)).toBe(11025);
    expect(round2(t.totalTax)).toBe(1025);
  });

  it('gross balance is the net balance plus the tax paid', () => {
    const r = calcSavings({ ...base, taxOnInterest: 30 });
    expect(r.grossFinalBalance).toBe(r.finalBalance + r.interestTax);
    expect(r.interestTax).toBeGreaterThan(0);
  });

  it('a zero tax rate leaves the balance untouched', () => {
    expect(calcSavings({ ...base, taxOnInterest: 0 }).interestTax).toBe(0);
  });
});

// ─── Goal: time to target ────────────────────────────────────────────────────

describe('time to target', () => {
  const base = {
    initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
    termYears: 10, inflationRate: 2.5, taxOnInterest: 0,
  };

  it('respects the compounding frequency the user picked', () => {
    const monthly = calcSavings({ ...base, compoundFreq: 'monthly' }).monthsToTarget(500000);
    const quarterly = calcSavings({ ...base, compoundFreq: 'quarterly' }).monthsToTarget(500000);
    const annual = calcSavings({ ...base, compoundFreq: 'annually' }).monthsToTarget(500000);
    expect(monthly.reachable).toBe(true);
    expect(annual.reachable).toBe(true);
    expect(quarterly.months).toBeGreaterThan(monthly.months);
    // Annual crediting is slower, so the goal arrives later — the old code
    // returned the same month for both.
    expect(annual.months).toBeGreaterThan(monthly.months);
  });

  it('agrees with the balance projection at the month it names', () => {
    for (const compoundFreq of ['monthly', 'quarterly', 'annually']) {
      const opts = { ...base, compoundFreq, taxOnInterest: 20 };
      const hit = calcSavings(opts).monthsToTarget(50000);
      const at = simulate({ ...opts, months: hit.months }).balance;
      const before = simulate({ ...opts, months: hit.months - 1 }).balance;
      expect(at).toBeGreaterThanOrEqual(50000);
      expect(before).toBeLessThan(50000);
    }
  });

  it('accounts for tax, like the headline balance does', () => {
    const noTax = calcSavings({ ...base, compoundFreq: 'monthly', taxOnInterest: 0 }).monthsToTarget(80000);
    const taxed = calcSavings({ ...base, compoundFreq: 'monthly', taxOnInterest: 45 }).monthsToTarget(80000);
    expect(taxed.months).toBeGreaterThan(noTax.months);
  });

  it('offers a real-terms answer that is never earlier than the nominal one', () => {
    const r = calcSavings({ ...base, compoundFreq: 'monthly' });
    const nominal = r.monthsToTarget(100000);
    const real = r.realMonthsToTarget(100000);
    expect(real.basis).toBe('real');
    expect(real.months).toBeGreaterThan(nominal.months);
  });

  it('returns 0 when the starting balance already clears the target', () => {
    const r = calcSavings({ ...base, compoundFreq: 'monthly' }).monthsToTarget(5000);
    expect(r).toMatchObject({ months: 0, reachable: true });
  });

  it('tells the user when a goal is unreachable instead of going silent', () => {
    const r = calcSavings({
      initialDeposit: 1000, monthlyContribution: 0, annualRate: 0,
      termYears: 10, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
    }).monthsToTarget(1000000);
    expect(r.reachable).toBe(false);
    expect(r.months).toBeNull();
    expect(r.reason).toMatch(/never changes/);
  });

  it('explains an unreachable goal differently when interest alone is the problem', () => {
    const r = calcSavings({
      initialDeposit: 1000, monthlyContribution: 0, annualRate: 0.01,
      termYears: 10, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 0,
    }).monthsToTarget(1000000);
    expect(r.reachable).toBe(false);
    expect(r.reason).toMatch(/regular contribution/);
  });

  it('rejects a zero or negative target with a usable message', () => {
    const r = solveMonthsToTarget({ initialDeposit: 0, monthlyContribution: 100, annualRate: 5 }, 0);
    expect(r.reachable).toBe(false);
    expect(r.reason).toMatch(/above \$0/);
  });
});

// ─── Reverse goal-seek ───────────────────────────────────────────────────────

describe('reverse goal-seek', () => {
  it('$50,000 in 3 years returns a contribution that actually lands there', () => {
    const opts = {
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 3, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 2.5,
    };
    const solved = calcSavings(opts).requiredMonthlyContribution(50000, 3);
    expect(solved.achievable).toBe(true);
    expect(solved.monthly).toBeGreaterThan(0);

    const check = calcSavings({ ...opts, monthlyContribution: solved.monthly });
    expect(check.finalBalance).toBeGreaterThanOrEqual(50000);
    expect(check.finalBalance).toBeLessThan(50001);

    // Cross-check against the closed form for the same cash flows.
    const r = 0.05 / 12;
    const n = 36;
    const g = (1 + r) ** n;
    const closedForm = ((50000 - 10000 * g) * r) / (g - 1);
    expect(Math.abs(solved.monthly - closedForm)).toBeLessThan(0.02);
  });

  it('inverts consistently under quarterly compounding and tax', () => {
    const opts = {
      initialDeposit: 5000, monthlyContribution: 0, annualRate: 6,
      termYears: 8, compoundFreq: 'quarterly', taxOnInterest: 37, inflationRate: 0,
    };
    const solved = calcSavings(opts).requiredMonthlyContribution(120000, 8);
    expect(solved.achievable).toBe(true);
    const check = calcSavings({ ...opts, monthlyContribution: solved.monthly });
    expect(check.finalBalance).toBeGreaterThanOrEqual(120000);
    expect(check.finalBalance).toBeLessThan(120010);
  });

  it('returns zero when the starting balance alone gets there', () => {
    const solved = solveMonthlyContribution(
      { initialDeposit: 60000, annualRate: 5, compoundFreq: 'monthly' }, 50000, 3
    );
    expect(solved).toMatchObject({ monthly: 0, achievable: true });
    expect(solved.reason).toMatch(/no further contributions/i);
  });

  it('rejects a missing target or timeframe', () => {
    expect(solveMonthlyContribution({ initialDeposit: 0 }, 0, 3).achievable).toBe(false);
    expect(solveMonthlyContribution({ initialDeposit: 0 }, 1000, 0).achievable).toBe(false);
  });
});

// ─── Contribution indexation ─────────────────────────────────────────────────

describe('contribution indexation', () => {
  const base = {
    initialDeposit: 0, monthlyContribution: 500, annualRate: 5,
    termYears: 30, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 2.5,
  };

  it('raises the contribution each anniversary', () => {
    const flat = calcSavings(base);
    const indexed = calcSavings({ ...base, contributionGrowth: 2.5 });
    expect(indexed.totalContributed).toBeGreaterThan(flat.totalContributed);
    expect(indexed.finalBalance).toBeGreaterThan(flat.finalBalance);
    expect(indexed.finalMonthlyContribution).toBe(Math.round(500 * 1.025 ** 29));
  });

  it('contributes exactly the indexed schedule', () => {
    const r = calcSavings({ ...base, termYears: 3, contributionGrowth: 10 });
    const expected = 12 * (500 + 550 + 605);
    expect(r.totalContributed).toBe(expected);
  });

  it('indexing at the inflation rate holds the real contribution steady', () => {
    const r = calcSavings({ ...base, contributionGrowth: 2.5 });
    const realFinalContribution = r.finalMonthlyContribution / 1.025 ** 29;
    expect(Math.abs(realFinalContribution - 500)).toBeLessThan(1);
  });
});

// ─── Chart and reporting surface ─────────────────────────────────────────────

describe('reporting', () => {
  it('the chart ends on the headline balance', () => {
    const r = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq: 'quarterly', taxOnInterest: 25, inflationRate: 2.5,
    });
    const last = r.chartData[r.chartData.length - 1];
    expect(r.chartData.length).toBe(11);
    expect(last.year).toBe(10);
    expect(last.Balance).toBe(r.finalBalance);
    expect(last.Contributed).toBe(r.totalContributed);
    expect(r.chartData[0]).toEqual({ year: 0, Balance: 10000, Contributed: 10000 });
  });

  it('deflates the balance for inflation', () => {
    const r = calcSavings({
      initialDeposit: 10000, monthlyContribution: 500, annualRate: 5,
      termYears: 10, compoundFreq: 'monthly', taxOnInterest: 0, inflationRate: 2.5,
    });
    expect(Math.abs(r.realBalance - r.finalBalance / 1.025 ** 10)).toBeLessThanOrEqual(1);
    expect(r.realBalance).toBeLessThan(r.finalBalance);
  });

  it('states the basis of the tax and goal figures', () => {
    const r = calcSavings({});
    expect(r.assumptions.taxBasis).toMatch(/each year/);
    expect(r.assumptions.goalBasis).toMatch(/Net of tax/);
  });
});
