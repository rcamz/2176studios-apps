// Mortgage amortisation.
//
// Interest is calculated per payment period; Australian lenders calculate daily
// and charge monthly, so this slightly understates interest. That limitation is
// disclosed in the UI.

export const PERIODS_PER_YEAR = { monthly: 12, fortnightly: 26, weekly: 52 };

function scheduledPayment(principal, periodRate, periods) {
  if (periods <= 0) return principal;
  if (periodRate === 0) return principal / periods;
  return (principal * periodRate) / (1 - Math.pow(1 + periodRate, -periods));
}

/**
 * Fortnightly and weekly repayments in Australia are conventionally half or a
 * quarter of the MONTHLY payment, not a re-amortised fortnightly figure. That
 * means 26 half-payments a year is 13 months' worth, which is exactly why the
 * loan clears years early. Deriving the payment from the monthly equivalent is
 * what produces that effect — re-amortising per fortnight would not.
 */
function paymentForFrequency(balance, annualRatePercent, remainingMonths, frequency) {
  const monthlyRate = annualRatePercent / 100 / 12;
  const monthly = scheduledPayment(balance, monthlyRate, remainingMonths);
  if (frequency === 'fortnightly') return monthly / 2;
  if (frequency === 'weekly') return monthly / 4;
  return monthly;
}

export function amortize({
  loanAmount,
  annualRatePercent,
  termYears,
  paymentFrequency = 'monthly',
  interestOnlyYears = 0,
  fixedRatePercent = 0,
  fixedPeriodYears = 0,
  revertRatePercent = 0,
  offsetStart = 0,
  offsetMonthly = 0,
  offsetLumps = [],
  offsetWithdrawals = [],
  extraRecurring = 0,
  extraLumps = [],
  includeOffset = true,
  // Extra repayments are independent of having an offset account. These were
  // previously gated behind includeOffset, so switching the offset off silently
  // stopped extra repayments too.
  includeExtras = true,
  // Many Australian lenders DO offer offset against a fixed loan. Previously
  // hardcoded off with no way to model it.
  offsetAppliesDuringFixed = false,
}) {
  const perYear = PERIODS_PER_YEAR[paymentFrequency] ?? 12;
  const periodsPerMonth = perYear / 12;
  const totalPeriods = Math.round(termYears * perYear);
  const fixedPeriods = Math.round(fixedPeriodYears * perYear);
  const ioPeriods = Math.round(interestOnlyYears * perYear);
  const useFixed = fixedRatePercent > 0 && fixedPeriodYears > 0;

  // Lump sums are entered in months; convert to this schedule's periods.
  const atPeriod = (list) =>
    list.map((l) => ({ period: Math.max(1, Math.round(l.month * periodsPerMonth)), amount: l.amount }));
  const offsetDeposits = atPeriod(offsetLumps);
  const offsetTakeouts = atPeriod(offsetWithdrawals);
  const extraDeposits = atPeriod(extraLumps);

  let balance = loanAmount;
  let offset = includeOffset ? offsetStart : 0;
  let payment = null;
  const rows = [];

  for (let period = 1; period <= totalPeriods && balance > 0.005; period++) {
    const inFixed = useFixed && period <= fixedPeriods;
    const inInterestOnly = period <= ioPeriods;

    const ratePct = inFixed
      ? fixedRatePercent
      : useFixed && revertRatePercent > 0
        ? revertRatePercent
        : annualRatePercent;
    const periodRate = ratePct / 100 / perYear;

    // Recalculate at the start, when the fixed rate reverts, and when the
    // interest-only period ends — the loan must then amortise over what's left.
    const isRateSwitch = useFixed && period === fixedPeriods + 1;
    const ioEnds = ioPeriods > 0 && period === ioPeriods + 1;
    if (period === 1 || isRateSwitch || ioEnds) {
      const remainingMonths = (totalPeriods - period + 1) / periodsPerMonth;
      payment = paymentForFrequency(balance, ratePct, remainingMonths, paymentFrequency);
    }

    // The offset BALANCE always accrues, even while a fixed rate stops it
    // reducing interest. Previously these deposits were skipped entirely, so
    // money the user said they were saving simply vanished and was not there on
    // revert.
    if (includeOffset) {
      offset += offsetMonthly / periodsPerMonth;
      for (const d of offsetDeposits) if (d.period === period) offset += d.amount;
      for (const w of offsetTakeouts) if (w.period === period) offset = Math.max(0, offset - w.amount);
    }

    const offsetApplies = includeOffset && (!inFixed || offsetAppliesDuringFixed);
    const activeOffset = offsetApplies ? Math.min(offset, balance) : 0;
    const interest = Math.max(0, balance - activeOffset) * periodRate;

    let extra = 0;
    if (includeExtras) {
      extra += extraRecurring / periodsPerMonth;
      for (const d of extraDeposits) if (d.period === period) extra += d.amount;
    }

    const scheduled = inInterestOnly ? interest : payment;
    const total = Math.min(scheduled + extra, balance + interest);
    const principal = total - interest;
    balance = Math.max(0, balance - principal);

    rows.push({
      period,
      monthIndex: period / periodsPerMonth,
      payment: total,
      interest,
      principal,
      balance,
      offset: activeOffset,
      offsetBalance: offset,
      ratePct,
      isRateSwitch,
      isInterestOnly: inInterestOnly,
    });
  }

  return rows;
}

export function summarize(rows, paymentFrequency = 'monthly') {
  const perYear = PERIODS_PER_YEAR[paymentFrequency] ?? 12;
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0);
  const periods = rows.length;
  return {
    totalInterest,
    totalPaid,
    periods,
    payoffMonths: Math.round((periods / perYear) * 12),
    payoffYears: periods / perYear,
  };
}

// Sensitivity to rate movements — the question borrowers actually ask.
export function rateSensitivity(config, deltas = [-1, -0.5, 0, 0.5, 1, 2]) {
  return deltas.map((delta) => {
    const rows = amortize({
      ...config,
      annualRatePercent: config.annualRatePercent + delta,
      revertRatePercent: config.revertRatePercent ? config.revertRatePercent + delta : 0,
    });
    const s = summarize(rows, config.paymentFrequency);
    return {
      delta,
      rate: config.annualRatePercent + delta,
      payment: rows[0]?.payment ?? 0,
      totalInterest: s.totalInterest,
      payoffMonths: s.payoffMonths,
    };
  });
}

// ─── Explanation ─────────────────────────────────────────────────────────────

import {
  workings, section, step, total, note,
} from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const trim = (n, dp) => String(Number(n.toFixed(dp)));

function monthsLabel(months) {
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  const parts = [y && `${y}y`, m && `${m}m`].filter(Boolean);
  return parts.length ? parts.join(' ') : '0m';
}

const PERIOD_NOUN = { monthly: 'month', fortnightly: 'fortnight', weekly: 'week' };
const PERIOD_ADJ = { monthly: 'Monthly', fortnightly: 'Fortnightly', weekly: 'Weekly' };

/**
 * Build a step-by-step account of an amortisation.
 *
 * Kept out of `amortize` itself so the schedule loop stays free of presentation
 * concerns — the explanation is opt-in and built once, from the finished rows.
 *
 * `result` is what CalcInstance already computes:
 *   { withRows, withSummary, baseSummary, offsetOnlySummary?, rateSwitchPeriod?, lmi? }
 * `offsetOnlySummary` is the offset with extra repayments switched off. Without
 * it the two savings cannot be told apart, so they are reported together.
 */
export function explainAmortisation(result = {}, inputs = {}) {
  const {
    withRows = [],
    offsetOnlySummary = null,
    rateSwitchPeriod = null,
    lmi = null,
  } = result;

  const {
    loanAmount = 0,
    annualRatePercent = 0,
    termYears = 30,
    paymentFrequency = 'monthly',
    interestOnlyYears = 0,
    rateType = 'variable',
    fixedRatePercent = 0,
    fixedPeriodYears = 0,
    revertRatePercent = 0,
    splitMode = 'pct',
    splitFixedPct = 0,
    splitFixedAmt = 0,
    splitVariableRatePercent = 0,
    offsetStart = 0,
    offsetMonthly = 0,
    offsetLumps = [],
    offsetWithdrawals = [],
    extraRecurring = 0,
    extraLumps = [],
    propertyValue = 0,
  } = inputs;

  if (!withRows.length) return workings([]);

  const ws = result.withSummary ?? summarize(withRows, paymentFrequency);
  const bs = result.baseSummary ?? ws;

  const perYear = PERIODS_PER_YEAR[paymentFrequency] ?? 12;
  const periodsPerMonth = perYear / 12;
  const noun = PERIOD_NOUN[paymentFrequency] ?? 'month';
  const adj = PERIOD_ADJ[paymentFrequency] ?? 'Monthly';
  const isSplit = rateType === 'split';
  const isFixed = rateType === 'fixed' && fixedRatePercent > 0 && fixedPeriodYears > 0;
  const startRate = isFixed ? fixedRatePercent : annualRatePercent;

  // Months the schedule actually ran for — the denominator for everything
  // accumulated over the life of the loan.
  const monthsRun = withRows.length / periodsPerMonth;

  // ─── The repayment ─────────────────────────────────────────────────────────
  const monthlyRate = startRate / 100 / 12;
  const scheduledMonths = termYears * 12;
  // Exactly what amortize does at period 1: amortise over the term in MONTHS,
  // then divide for the chosen frequency.
  const monthlyPayment = scheduledPayment(loanAmount, monthlyRate, scheduledMonths);
  const periodPayment = paymentFrequency === 'fortnightly' ? monthlyPayment / 2
    : paymentFrequency === 'weekly' ? monthlyPayment / 4
    : monthlyPayment;

  const fixedAmt = isSplit
    ? (splitMode === 'dollar' ? splitFixedAmt : loanAmount * (splitFixedPct / 100))
    : 0;
  const varAmt = isSplit ? loanAmount - fixedAmt : 0;

  const repayment = isSplit
    ? section('Your repayment', [
        step(`Fixed portion at ${trim(fixedRatePercent, 2)}% p.a.`, fixedAmt),
        step(`Variable portion at ${trim(splitVariableRatePercent, 2)}% p.a.`, varAmt),
        total('Total borrowed', fixedAmt + varAmt),
        step(`${adj} repayment, both portions`, withRows[0].payment),
      ], {
        note: 'Each portion is amortised separately over the full term and the two repayments added together. The offset and any extra repayments apply to the variable portion only, which is how most lenders treat a split.',
      })
    : section('Your repayment', [
        step('Loan amount', loanAmount),
        step('Interest rate', `${trim(startRate, 2)}% p.a.`, {
          note: isFixed ? `Fixed for the first ${trim(fixedPeriodYears, 2)} years` : null,
        }),
        step('Rate per month', `${trim(monthlyRate * 100, 4)}%`, { note: 'The annual rate divided by 12' }),
        step('Number of monthly repayments', String(Math.round(scheduledMonths)), {
          note: `${trim(termYears, 2)} years × 12`,
        }),
        step('Monthly repayment', monthlyPayment, {
          note: 'Loan × monthly rate ÷ (1 − (1 + monthly rate) ^ −months)',
        }),
        paymentFrequency !== 'monthly' && step(
          `${adj} repayment`,
          periodPayment,
          { note: paymentFrequency === 'fortnightly' ? 'Half the monthly amount' : 'A quarter of the monthly amount' }
        ),
        interestOnlyYears > 0 && note(
          `Interest-only for the first ${trim(interestOnlyYears, 2)} years, so nothing comes off the ${money(loanAmount)} balance in that time. The repayment then has to clear the whole loan over the years that are left, which is why it steps up rather than staying put.`
        ),
      ], {
        note: 'The repayment is worked out from the monthly rate, not a daily one. Lenders accrue interest daily and charge it monthly, so a real statement will differ slightly.',
      });

  // ─── Why 26 or 52 payments clears the loan early ───────────────────────────
  const paidPerYear = periodPayment * perYear;
  const monthlyPerYear = monthlyPayment * 12;
  const frequencyEffect = paymentFrequency === 'monthly' ? null : section(
    `Why paying ${paymentFrequency} clears the loan early`,
    [
      step(`${adj} repayment`, periodPayment),
      step(`× ${perYear} payments a year`, paidPerYear),
      step('A year of monthly repayments', monthlyPerYear, { muted: true }),
      total('Extra paid each year', paidPerYear - monthlyPerYear),
    ],
    {
      note: paymentFrequency === 'fortnightly'
        ? 'There are 26 fortnights in a year but only 12 months. Paying half the monthly amount 26 times is 13 months of repayments, not 12 — one whole extra repayment a year, straight off the principal. That extra month, not the more frequent compounding, is what takes years off the loan.'
        : 'There are 52 weeks in a year but only 12 months. Paying a quarter of the monthly amount 52 times is 13 months of repayments, not 12 — one whole extra repayment a year, straight off the principal. The more frequent payment barely matters; the extra month is the whole effect.',
    }
  );

  // ─── The offset account ────────────────────────────────────────────────────
  const lumpPeriod = (l) => Math.max(1, Math.round(l.month * periodsPerMonth));
  const appliedOffsetLumps = offsetLumps.filter((l) => lumpPeriod(l) <= withRows.length);
  const appliedWithdrawals = offsetWithdrawals.filter((l) => lumpPeriod(l) <= withRows.length);
  const offsetDeposited = offsetMonthly * monthsRun;
  const lumpTotal = appliedOffsetLumps.reduce((s, l) => s + l.amount, 0);
  const withdrawnTotal = appliedWithdrawals.reduce((s, l) => s + l.amount, 0);
  const hasOffset = offsetStart > 0 || offsetMonthly > 0 || appliedOffsetLumps.length > 0;

  const offsetSection = hasOffset ? section('Your offset account', [
    step('Balance at settlement', offsetStart),
    offsetMonthly > 0 && step(`${money(offsetMonthly)} a month for ${monthsLabel(monthsRun)}`, offsetDeposited),
    ...appliedOffsetLumps.map((l) => step(`Lump sum deposit at month ${l.month}`, l.amount)),
    ...appliedWithdrawals.map((l) => step(`Withdrawal at month ${l.month}`, -l.amount)),
    total('Offset balance when the loan is repaid', offsetStart + offsetDeposited + lumpTotal - withdrawnTotal),
  ], {
    note: 'Interest is charged on the loan balance less whatever is sitting in the offset, and the money stays yours to withdraw. The saving is untaxed, which is the part people miss: a savings account paying the same rate would be taxed at your marginal rate, so a dollar in the offset beats a dollar in savings at the same rate.',
  }) : null;

  const fixedBlocksOffset = hasOffset && isFixed && !inputs.offsetAppliesDuringFixed
    ? note(`During the fixed period the offset does not reduce your interest, but the balance keeps building — it starts working the day the loan reverts.`)
    : null;

  // ─── Extra repayments ──────────────────────────────────────────────────────
  const appliedExtraLumps = extraLumps.filter((l) => lumpPeriod(l) <= withRows.length);
  const extraRecurringTotal = extraRecurring * monthsRun;
  const extraLumpTotal = appliedExtraLumps.reduce((s, l) => s + l.amount, 0);
  const hasExtras = extraRecurring > 0 || appliedExtraLumps.length > 0;

  const extrasSection = hasExtras ? section('Your extra repayments', [
    extraRecurring > 0 && step(`${money(extraRecurring)} a month for ${monthsLabel(monthsRun)}`, extraRecurringTotal),
    ...appliedExtraLumps.map((l) => step(`Lump sum at month ${l.month}`, l.amount)),
    total('Extra principal paid', extraRecurringTotal + extraLumpTotal),
  ], {
    note: 'An extra repayment is not a deposit — it comes straight off the principal, so that dollar stops accruing interest for every year left on the loan. That is why an extra payment made in year one is worth several times the same payment made in year twenty.',
  }) : null;

  // ─── Interest and time saved ───────────────────────────────────────────────
  const totalSaved = bs.totalInterest - ws.totalInterest;
  const offsetSaved = offsetOnlySummary ? bs.totalInterest - offsetOnlySummary.totalInterest : null;
  // The residual, so the two savings always add back to the total.
  const extraSaved = offsetSaved !== null ? totalSaved - offsetSaved : null;
  const monthsSaved = bs.payoffMonths - ws.payoffMonths;

  const savingSection = section('Interest saved', [
    step('Interest with no offset and no extra repayments', bs.totalInterest),
    offsetSaved !== null && hasOffset && step('less saved by the offset', -offsetSaved),
    extraSaved !== null && hasExtras && step('less saved by extra repayments', -extraSaved),
    (offsetSaved === null || (!hasOffset && !hasExtras)) && totalSaved !== 0 && step('less saved by the offset and extra repayments', -totalSaved),
    total('Interest you actually pay', ws.totalInterest),
    step('Loan cleared in', monthsLabel(ws.payoffMonths), {
      note: monthsSaved > 0 ? `${monthsLabel(monthsSaved)} sooner than ${monthsLabel(bs.payoffMonths)}` : null,
    }),
  ]);

  // ─── The fixed rate ending ─────────────────────────────────────────────────
  const revertSection = rateSwitchPeriod ? section('When the fixed rate ends', [
    step('Fixed rate', `${trim(fixedRatePercent, 2)}% p.a.`),
    step('Fixed for', `${trim(fixedPeriodYears, 2)} years`, {
      note: `The ${Math.round(rateSwitchPeriod / periodsPerMonth)}th month of the loan`,
    }),
    step('Reverts to', `${trim(revertRatePercent, 2)}% p.a.`),
    step(`Repayment the ${noun} before`, withRows[rateSwitchPeriod - 2]?.payment ?? 0),
    step(`Repayment the ${noun} after`, withRows[rateSwitchPeriod - 1]?.payment ?? 0),
    total('Change in repayment',
      (withRows[rateSwitchPeriod - 1]?.payment ?? 0) - (withRows[rateSwitchPeriod - 2]?.payment ?? 0)),
  ], {
    note: 'On revert the remaining balance is re-amortised over the years that are left, at the revert rate. Shortening the term is what lifts the repayment as much as the higher rate does.',
  }) : null;

  // ─── Total cost ────────────────────────────────────────────────────────────
  const finalBalance = withRows[withRows.length - 1].balance;
  const principalRepaid = loanAmount - finalBalance;

  const costSection = section('What you pay in total', [
    step('Principal repaid', principalRepaid),
    step('Interest', ws.totalInterest),
    finalBalance > 0.005 && step('Balance still owing at the end of the term', finalBalance, { muted: true }),
    total('Total paid over the loan', principalRepaid + ws.totalInterest),
    step('Interest as a share of what you borrowed',
      `${trim((ws.totalInterest / Math.max(1, loanAmount)) * 100, 1)}%`, { muted: true }),
  ]);

  // ─── LMI ───────────────────────────────────────────────────────────────────
  const lmiSection = propertyValue > 0 && lmi ? section('Lenders Mortgage Insurance', [
    step('Deposit', propertyValue - loanAmount),
    step('Loan amount', loanAmount),
    total('Property value', propertyValue),
    step('Loan to value ratio', `${trim((lmi.lvr ?? 0) * 100, 1)}%`),
    lmi.payable && step('Premium, low estimate', lmi.low),
    lmi.payable && step('Premium, high estimate', lmi.high),
    lmi.payable && total('Midpoint estimate', lmi.midpoint),
    lmi.payable && step('Deposit that would avoid it', propertyValue * 0.2, { muted: true }),
    !lmi.payable && note(lmi.zeroPaths?.[0]
      ? `No LMI is payable — ${lmi.zeroPaths[0].charAt(0).toLowerCase()}${lmi.zeroPaths[0].slice(1)}.`
      : 'No LMI is payable at this loan to value ratio.'),
    lmi.payable && note('LMI insures the lender, not you, and it is not refundable if you sell. Premiums rise in steps at 85%, 90% and 95% LVR rather than smoothly, so a few thousand dollars more deposit can drop the premium sharply if it takes you under a threshold.'),
  ]) : null;

  return workings([
    repayment,
    frequencyEffect,
    offsetSection && (fixedBlocksOffset
      ? section(offsetSection.heading, [...offsetSection.steps, fixedBlocksOffset], { note: offsetSection.note })
      : offsetSection),
    extrasSection,
    savingSection,
    revertSection,
    costSection,
    lmiSection,
  ], {
    source: 'Interest calculated per repayment period',
  });
}
