// Savings / compound interest calculator

export function calcSavings(inputs) {
  const {
    initialDeposit = 10000,
    monthlyContribution = 500,
    annualRate = 5.0,
    termYears = 10,
    compoundFreq = 'monthly',
    inflationRate = 2.5,
    taxOnInterest = 0,
  } = inputs;

  const periods = compoundFreq === 'monthly' ? 12 : compoundFreq === 'quarterly' ? 4 : 1;
  const ratePerPeriod = annualRate / 100 / periods;
  const totalPeriods = termYears * periods;
  const contributionPerPeriod = monthlyContribution * 12 / periods;

  // FV = PV*(1+r)^n + PMT * ((1+r)^n - 1) / r
  const growthFactor = Math.pow(1 + ratePerPeriod, totalPeriods);
  const fvDeposit = initialDeposit * growthFactor;
  const fvContributions = ratePerPeriod === 0
    ? contributionPerPeriod * totalPeriods
    : contributionPerPeriod * (growthFactor - 1) / ratePerPeriod;

  const grossFinalBalance = fvDeposit + fvContributions;
  const totalContributed = initialDeposit + monthlyContribution * 12 * termYears;
  const totalInterest = grossFinalBalance - totalContributed;
  const interestTax = totalInterest * (taxOnInterest / 100);
  const finalBalance = grossFinalBalance - interestTax;

  // Inflation-adjusted real value
  const inflationFactor = Math.pow(1 + inflationRate / 100, termYears);
  const realBalance = finalBalance / inflationFactor;

  // Year-by-year data
  const chartData = [];
  let runningBalance = initialDeposit;
  let runningContributed = initialDeposit;

  for (let yr = 0; yr <= termYears; yr++) {
    chartData.push({
      year: yr,
      'Balance': Math.round(runningBalance),
      'Contributed': Math.round(runningContributed),
    });
    for (let m = 0; m < periods; m++) {
      runningBalance = runningBalance * (1 + ratePerPeriod) + contributionPerPeriod;
    }
    runningContributed += monthlyContribution * 12;
  }

  // Goal comparison: how many months to reach a target
  function monthsToTarget(target) {
    if (target <= initialDeposit) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return Math.ceil((target - initialDeposit) / monthlyContribution);
    let bal = initialDeposit;
    for (let m = 1; m <= 1200; m++) {
      bal = bal * (1 + r) + monthlyContribution;
      if (bal >= target) return m;
    }
    return null;
  }

  return {
    finalBalance: Math.round(finalBalance),
    grossFinalBalance: Math.round(grossFinalBalance),
    totalContributed,
    totalInterest: Math.round(totalInterest),
    interestTax: Math.round(interestTax),
    realBalance: Math.round(realBalance),
    chartData,
    monthsToTarget,
    annualEffectiveRate: (Math.pow(1 + ratePerPeriod, periods) - 1) * 100,
  };
}
