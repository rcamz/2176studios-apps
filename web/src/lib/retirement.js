// Retirement / Super projection — 2026-27
const SUPER_TAX = 0.15;
const SG_RATE = 0.12; // 2026-27

export function calcRetirement(inputs) {
  const {
    currentAge = 35,
    retirementAge = 65,
    currentBalance = 50000,
    grossSalary = 80000,
    sgRate = 12,
    extraContributions = 0,
    extraIsPreTax = true,
    investmentReturn = 7,
    inflationRate = 2.5,
    fees = 0.5,
    drawdownRate = 4,
  } = inputs;

  const yearsToRetire = Math.max(0, retirementAge - currentAge);
  const monthlyReturn = (investmentReturn - fees) / 100 / 12;

  const sgMonthly = (grossSalary * sgRate / 100) * (1 - SUPER_TAX) / 12;
  const extraMonthlyPreTax = extraIsPreTax
    ? extraContributions * (1 - SUPER_TAX) / 12
    : extraContributions / 12;

  // Milestones to track
  const milestoneAges = [50, 55, 60, 65, 70].filter(a => a >= currentAge && a <= retirementAge + 5);

  const withExtra = [];
  const withoutExtra = [];

  let balWith = currentBalance;
  let balWithout = currentBalance;

  for (let yr = 0; yr <= yearsToRetire; yr++) {
    const age = currentAge + yr;
    withExtra.push({ age, balance: Math.round(balWith) });
    withoutExtra.push({ age, balance: Math.round(balWithout) });

    for (let m = 0; m < 12; m++) {
      balWith = balWith * (1 + monthlyReturn) + sgMonthly + extraMonthlyPreTax;
      balWithout = balWithout * (1 + monthlyReturn) + sgMonthly;
    }
  }

  const projectedBalance = Math.round(balWith);
  const projectedBalanceNoExtra = Math.round(balWithout);

  // Inflation-adjusted (real) balance
  const inflationFactor = Math.pow(1 + inflationRate / 100, yearsToRetire);
  const realBalance = Math.round(projectedBalance / inflationFactor);

  // Sustainable annual drawdown at drawdownRate%
  const annualDrawdown = projectedBalance * (drawdownRate / 100);
  const annualDrawdownNoExtra = projectedBalanceNoExtra * (drawdownRate / 100);

  // Age Pension assets test (homeowner single, 2026-27 estimated)
  const fullPensionAssets = 314000;  // estimated indexed
  const noPensionAssets = 700000;   // estimated indexed
  const pensionEligible = projectedBalance < noPensionAssets;
  const fullPension = projectedBalance <= fullPensionAssets;

  // Chart data: yearly balance points
  const chartData = withExtra.map((w, i) => ({
    age: w.age,
    'With contributions': w.balance,
    'Without extra': withoutExtra[i]?.balance ?? 0,
  }));

  return {
    projectedBalance,
    projectedBalanceNoExtra,
    realBalance,
    annualDrawdown,
    annualDrawdownNoExtra,
    extraSuperBoost: projectedBalance - projectedBalanceNoExtra,
    pensionEligible,
    fullPension,
    yearsToRetire,
    chartData,
    milestoneAges,
  };
}
