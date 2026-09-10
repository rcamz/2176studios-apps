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
