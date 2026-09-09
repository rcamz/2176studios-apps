function calcPayment(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

export function amortize({
  loanAmount,
  annualRatePercent,
  termYears,
  fixedRatePercent = 0,
  fixedPeriodYears = 0,
  revertRatePercent = 0,
  offsetStart = 0,
  offsetMonthly = 0,
  offsetLumps = [],
  extraRecurring = 0,
  extraLumps = [],
  includeOffset = true,
}) {
  const termMonths = termYears * 12;
  const fixedMonths = fixedPeriodYears * 12;
  const useFixed = fixedRatePercent > 0 && fixedPeriodYears > 0;

  let balance = loanAmount;
  let offset = includeOffset ? offsetStart : 0;
  let scheduledPayment = null;
  const rows = [];

  for (let month = 1; month <= termMonths && balance > 0.005; month++) {
    const inFixedPeriod = useFixed && month <= fixedMonths;

    const currentRatePct = inFixedPeriod
      ? fixedRatePercent
      : useFixed && revertRatePercent > 0
      ? revertRatePercent
      : annualRatePercent;

    const monthlyRate = currentRatePct / 100 / 12;

    // Recalculate payment at start and at fixed->variable switch
    if (month === 1 || (useFixed && month === fixedMonths + 1)) {
      const remaining = termMonths - month + 1;
      scheduledPayment = calcPayment(balance, monthlyRate, remaining);
    }

    // Offset updates (offset does not apply during fixed period per AU lender standard)
    if (includeOffset && !inFixedPeriod) {
      offset += offsetMonthly;
      for (const lump of offsetLumps) {
        if (lump.month === month) offset += lump.amount;
      }
    }

    const activeOffset = includeOffset && !inFixedPeriod ? offset : 0;
    const effectiveBalance = Math.max(0, balance - activeOffset);
    const interest = effectiveBalance * monthlyRate;

    let extra = includeOffset ? extraRecurring : 0;
    if (includeOffset) {
      for (const lump of extraLumps) {
        if (lump.month === month) extra += lump.amount;
      }
    }

    const totalPayment = Math.min(scheduledPayment + extra, balance + interest);
    const principal = totalPayment - interest;
    balance = Math.max(0, balance - principal);

    rows.push({
      month,
      payment: totalPayment,
      interest,
      principal,
      balance,
      offset: activeOffset,
      ratePct: currentRatePct,
      isRateSwitch: useFixed && month === fixedMonths + 1,
    });
  }

  return rows;
}

export function summarize(rows) {
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0);
  return { totalInterest, totalPaid, payoffMonths: rows.length };
}
