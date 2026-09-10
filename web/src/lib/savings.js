// Savings — compound growth, goal tracking and reverse goal-seek.
//
// One engine, one set of assumptions. Every figure on the screen — the balance,
// the chart, the time-to-goal and the required contribution — comes out of
// `simulate()`. The previous version had a closed-form FV for the headline and
// a separate monthly loop for the goal date, so the two contradicted each other
// whenever the user picked quarterly or annual compounding, and again whenever
// they entered a tax rate.
//
// Modelling decisions, all deliberate:
//
//  * Contributions are MONTHLY regardless of compounding frequency. Lumping a
//    year of savings into one year-end deposit (the old
//    `monthlyContribution * 12 / periods`) throws away every dollar of
//    intra-year interest.
//  * Interest ACCRUES monthly on the running balance and is CREDITED at the
//    chosen frequency. Within a compounding period it does not compound on
//    itself — that is what "quarterly compounding" means.
//  * Tax on interest is deducted ANNUALLY on the interest credited that year,
//    which is when it is actually assessed. Taking it as one lump at the end
//    leaves the compounding base overstated for the whole term.
//  * Contributions can be indexed, because deflating the balance for inflation
//    while holding the contribution flat is an asymmetric comparison.

const MONTHS = 12;

const clampNonNegative = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

function monthsPerCreditPeriod(compoundFreq) {
  if (compoundFreq === 'monthly') return 1;
  if (compoundFreq === 'quarterly') return 3;
  return 12; // annually
}

export function periodsPerYear(compoundFreq) {
  return MONTHS / monthsPerCreditPeriod(compoundFreq);
}

// Effective annual rate implied by crediting simple monthly accrual at the
// chosen frequency.
export function effectiveAnnualRate(annualRate, compoundFreq) {
  const p = periodsPerYear(compoundFreq);
  return (1 + annualRate / 100 / p) ** p - 1;
}

/**
 * Month-by-month simulation. Returns a per-month trace plus yearly snapshots.
 *
 * @param months        total months to run
 * @param onMonth       optional callback({month, balance, ...}) -> true to stop
 */
export function simulate({
  initialDeposit = 0,
  monthlyContribution = 0,
  annualRate = 0,
  months = 0,
  compoundFreq = 'monthly',
  taxOnInterest = 0,
  contributionGrowth = 0,
  contributionTiming = 'end', // 'end' (ordinary annuity) | 'start' (annuity due)
  inflationRate = 0,
  onMonth = null,
} = {}) {
  const creditEvery = monthsPerCreditPeriod(compoundFreq);
  const monthlyRate = annualRate / 100 / MONTHS;
  const taxRate = clampNonNegative(taxOnInterest) / 100;
  const growth = contributionGrowth / 100;
  const startOfPeriod = contributionTiming === 'start';

  let balance = initialDeposit;
  let accrued = 0; // interest earned but not yet credited
  let contribution = monthlyContribution;
  let totalContributed = initialDeposit;
  let totalInterest = 0;
  let totalTax = 0;
  let interestThisYear = 0;

  const yearly = [
    {
      year: 0,
      Balance: Math.round(balance),
      Contributed: Math.round(totalContributed),
      interest: 0,
      tax: 0,
    },
  ];

  let stoppedAt = null;

  for (let m = 1; m <= months; m++) {
    if (startOfPeriod) {
      balance += contribution;
      totalContributed += contribution;
    }

    accrued += balance * monthlyRate;

    if (m % creditEvery === 0) {
      balance += accrued;
      totalInterest += accrued;
      interestThisYear += accrued;
      accrued = 0;
    }

    if (!startOfPeriod) {
      balance += contribution;
      totalContributed += contribution;
    }

    // End of financial year: assess tax on interest credited during the year
    // and take it out of the balance, so it stops compounding.
    if (m % MONTHS === 0) {
      const tax = interestThisYear * taxRate;
      balance -= tax;
      totalTax += tax;
      interestThisYear = 0;
      contribution *= 1 + growth;

      yearly.push({
        year: m / MONTHS,
        Balance: Math.round(balance),
        Contributed: Math.round(totalContributed),
        interest: Math.round(totalInterest),
        tax: Math.round(totalTax),
      });
    }

    if (onMonth) {
      // Measured on the same basis as a term that ENDS at this month: credit
      // the outstanding accrual and net off the tax that would fall due on the
      // year to date. Without this the goal date and the balance projection
      // would part company inside a compounding period or a tax year.
      const netBalance = balance + accrued - (interestThisYear + accrued) * taxRate;
      const stop = onMonth({
        month: m,
        balance: netBalance,
        grossBalance: balance,
        realBalance: netBalance / (1 + inflationRate / 100) ** (m / MONTHS),
        totalContributed,
      });
      if (stop) {
        stoppedAt = m;
        break;
      }
    }
  }

  // A part-year tail: credit outstanding accrual and tax it so the headline is
  // on the same net-of-tax basis as every full year before it.
  if (stoppedAt === null && months % MONTHS !== 0) {
    balance += accrued;
    totalInterest += accrued;
    interestThisYear += accrued;
    const tax = interestThisYear * taxRate;
    balance -= tax;
    totalTax += tax;
    yearly.push({
      year: months / MONTHS,
      Balance: Math.round(balance),
      Contributed: Math.round(totalContributed),
      interest: Math.round(totalInterest),
      tax: Math.round(totalTax),
    });
  }

  return { balance, totalContributed, totalInterest, totalTax, yearly, stoppedAt };
}

// ─── Goal solving ────────────────────────────────────────────────────────────

const MAX_GOAL_MONTHS = 1200; // 100 years

/**
 * Time to reach `target` under the SAME assumptions as the headline balance —
 * same compounding frequency, same tax, same contribution timing and
 * indexation. Returns a result object rather than a bare number so an
 * unreachable goal can be reported instead of silently vanishing.
 */
export function solveMonthsToTarget(opts, target, { basis = 'nominal' } = {}) {
  const unreachable = (reason) => ({
    months: null,
    reachable: false,
    basis,
    reason,
  });

  if (!(target > 0)) return unreachable('Enter a target above $0.');
  if (target <= opts.initialDeposit) {
    return { months: 0, reachable: true, basis, reason: null };
  }

  const deflate = basis === 'real';
  const inflationRate = deflate ? opts.inflationRate ?? 0 : 0;

  let hit = null;
  simulate({
    ...opts,
    months: MAX_GOAL_MONTHS,
    inflationRate,
    onMonth: ({ month, balance, realBalance }) => {
      const measured = deflate ? realBalance : balance;
      if (measured >= target) {
        hit = month;
        return true;
      }
      return false;
    },
  });

  if (hit !== null) return { months: hit, reachable: true, basis, reason: null };

  const noContribution = !(opts.monthlyContribution > 0);
  const noGrowth = !(opts.annualRate > 0);
  let reason;
  if (noContribution && noGrowth) {
    reason = 'With no contributions and no interest, the balance never changes.';
  } else if (noContribution) {
    reason = 'Interest alone does not get there within 100 years. Add a regular contribution.';
  } else if (deflate) {
    reason = 'After inflation, this target is not reached within 100 years. Raise the contribution, the rate, or index your contributions.';
  } else {
    reason = 'This target is not reached within 100 years at this contribution and rate.';
  }
  return unreachable(reason);
}

/**
 * Reverse goal-seek: the monthly contribution that lands exactly on `target`
 * after `years`. Bisection over the same engine, so the answer is consistent
 * with the balance projection by construction.
 */
export function solveMonthlyContribution(opts, target, years) {
  const months = Math.round(years * MONTHS);
  const run = (monthlyContribution) =>
    simulate({ ...opts, monthlyContribution, months }).balance;

  if (!(target > 0) || !(months > 0)) {
    return { monthly: null, achievable: false, reason: 'Enter a target and a timeframe.' };
  }

  const withNothing = run(0);
  if (withNothing >= target) {
    return {
      monthly: 0,
      achievable: true,
      reason: 'Your starting balance alone gets there — no further contributions needed.',
      finalBalance: withNothing,
    };
  }

  let hi = 100;
  let guard = 0;
  while (run(hi) < target && guard < 40) {
    hi *= 2;
    guard += 1;
  }
  if (run(hi) < target) {
    return { monthly: null, achievable: false, reason: 'That target is out of range for this timeframe.' };
  }

  let lo = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (run(mid) < target) lo = mid;
    else hi = mid;
  }

  const monthly = Math.ceil(hi * 100) / 100;
  return {
    monthly,
    achievable: true,
    reason: null,
    finalBalance: run(monthly),
    totalOutOfPocket: monthly * months,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function calcSavings(inputs = {}) {
  const {
    initialDeposit = 10000,
    monthlyContribution = 500,
    annualRate = 5.0,
    termYears = 10,
    compoundFreq = 'monthly',
    inflationRate = 2.5,
    taxOnInterest = 0,
    contributionGrowth = 0,
    contributionTiming = 'end',
  } = inputs;

  const months = Math.round(termYears * MONTHS);
  const engine = {
    initialDeposit,
    monthlyContribution,
    annualRate,
    compoundFreq,
    taxOnInterest,
    contributionGrowth,
    contributionTiming,
    inflationRate,
  };

  const run = simulate({ ...engine, months });

  const finalBalance = run.balance;
  const grossFinalBalance = finalBalance + run.totalTax;
  const inflationFactor = (1 + inflationRate / 100) ** termYears;
  const realBalance = finalBalance / inflationFactor;

  const chartData = run.yearly.map((y) => ({
    year: y.year,
    Balance: y.Balance,
    Contributed: y.Contributed,
  }));

  return {
    finalBalance: Math.round(finalBalance),
    grossFinalBalance: Math.round(grossFinalBalance),
    totalContributed: Math.round(run.totalContributed),
    totalInterest: Math.round(run.totalInterest),
    interestTax: Math.round(run.totalTax),
    totalTax: Math.round(run.totalTax),
    realBalance: Math.round(realBalance),
    finalMonthlyContribution: Math.round(monthlyContribution * (1 + contributionGrowth / 100) ** Math.max(0, termYears - 1)),
    chartData,
    annualEffectiveRate: effectiveAnnualRate(annualRate, compoundFreq) * 100,
    periodsPerYear: periodsPerYear(compoundFreq),

    // Same engine, same assumptions — the goal date cannot contradict the
    // balance projection.
    monthsToTarget: (target) => solveMonthsToTarget(engine, target, { basis: 'nominal' }),
    realMonthsToTarget: (target) => solveMonthsToTarget(engine, target, { basis: 'real' }),
    requiredMonthlyContribution: (target, years = termYears) =>
      solveMonthlyContribution(engine, target, years),

    assumptions: {
      compoundFreq,
      contributionTiming,
      contributionGrowth,
      taxOnInterest,
      taxBasis: 'Deducted each year on that year\'s interest, so it reduces the compounding base.',
      goalBasis: 'Net of tax — the same basis as the balance above.',
    },
  };
}
