// 2026-27 ATO income tax figures (estimated — official rates subject to ATO publication)

const RESIDENT_BRACKETS = [
  { from: 0,      rate: 0.00, base: 0 },
  { from: 18200,  rate: 0.16, base: 0 },
  { from: 45000,  rate: 0.30, base: 4288 },
  { from: 135000, rate: 0.37, base: 31288 },
  { from: 190000, rate: 0.45, base: 51638 },
];

const FOREIGN_BRACKETS = [
  { from: 0,      rate: 0.30, base: 0 },
  { from: 135000, rate: 0.37, base: 40500 },
  { from: 190000, rate: 0.45, base: 60850 },
];

// Working Holiday Maker: 15% up to $45k, then resident rates
const HOLIDAY_BRACKETS = [
  { from: 0,      rate: 0.15, base: 0 },
  { from: 45000,  rate: 0.30, base: 6750 },
  { from: 135000, rate: 0.37, base: 33750 },
  { from: 190000, rate: 0.45, base: 54100 },
];

function applyBrackets(income, brackets) {
  if (income <= 0) return 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].from) {
      return brackets[i].base + brackets[i].rate * (income - brackets[i].from);
    }
  }
  return 0;
}

function grossIncomeTax(taxable, residency) {
  const b = residency === 'foreign' ? FOREIGN_BRACKETS
          : residency === 'holiday' ? HOLIDAY_BRACKETS
          : RESIDENT_BRACKETS;
  return applyBrackets(taxable, b);
}

// LITO 2026-27: max $700, tapers above $37,500 and $45,000
function calcLITO(taxable) {
  if (taxable <= 37500) return 700;
  if (taxable <= 45000) return Math.max(0, 700 - (taxable - 37500) * 0.05);
  if (taxable <= 66667) return Math.max(0, 325 - (taxable - 45000) * 0.015);
  return 0;
}

// Medicare levy 2% with low-income phase-in (2026-27 thresholds estimated)
function calcMedicareLevy(taxable, residency) {
  if (residency !== 'resident') return 0;
  const loThreshold = 27069;
  const loPhaseout = 33836;
  if (taxable <= loThreshold) return 0;
  if (taxable <= loPhaseout) return Math.min(taxable * 0.02, (taxable - loThreshold) * 0.10);
  return taxable * 0.02;
}

// MLS 2026-27 estimated thresholds (indexed from 2024-25: $93k/$108k/$144k)
function calcMLS(taxable, hasPrivateCover) {
  if (hasPrivateCover) return 0;
  if (taxable > 155000) return taxable * 0.015;
  if (taxable > 116000) return taxable * 0.0125;
  if (taxable > 100000) return taxable * 0.01;
  return 0;
}

// HECS repayment thresholds 2026-27 (estimated, indexed ~7.5% from 2024-25)
const HECS_RATES = [
  { from: 171600, rate: 0.100 },
  { from: 161900, rate: 0.095 },
  { from: 152800, rate: 0.090 },
  { from: 144100, rate: 0.085 },
  { from: 136000, rate: 0.080 },
  { from: 128300, rate: 0.075 },
  { from: 121000, rate: 0.070 },
  { from: 114100, rate: 0.065 },
  { from: 107700, rate: 0.060 },
  { from: 101600, rate: 0.055 },
  { from: 95800,  rate: 0.050 },
  { from: 90400,  rate: 0.045 },
  { from: 85300,  rate: 0.040 },
  { from: 80500,  rate: 0.035 },
  { from: 75900,  rate: 0.030 },
  { from: 71600,  rate: 0.025 },
  { from: 67500,  rate: 0.020 },
  { from: 58500,  rate: 0.010 },
  { from: 0,      rate: 0 },
];

function calcHECS(repaymentIncome, hecsBalance) {
  if (!hecsBalance || hecsBalance <= 0) return 0;
  for (const row of HECS_RATES) {
    if (repaymentIncome >= row.from) {
      return Math.min(hecsBalance, repaymentIncome * row.rate);
    }
  }
  return 0;
}

export function getMarginalRate(taxable, residency) {
  if (residency === 'foreign') {
    if (taxable > 190000) return 0.45;
    if (taxable > 135000) return 0.37;
    return 0.30;
  }
  if (residency === 'holiday') {
    if (taxable > 190000) return 0.45;
    if (taxable > 135000) return 0.37;
    if (taxable > 45000) return 0.30;
    return 0.15;
  }
  if (taxable > 190000) return 0.45;
  if (taxable > 135000) return 0.37;
  if (taxable > 45000) return 0.30;
  if (taxable > 18200) return 0.16;
  return 0;
}

export function calcPayTax(inputs) {
  const {
    grossIncome = 0,
    residency = 'resident',
    hasPrivateCover = false,
    hecsBalance = 0,
    sgRate = 12,
    salarySacrifice = 0,
  } = inputs;

  const taxableIncome = Math.max(0, grossIncome - salarySacrifice);

  const rawTax = grossIncomeTax(taxableIncome, residency);
  const lito = (residency === 'resident') ? calcLITO(taxableIncome) : 0;
  const incomeTax = Math.max(0, rawTax - lito);

  const medicareLevy = calcMedicareLevy(taxableIncome, residency);
  const mls = calcMLS(taxableIncome, hasPrivateCover);

  const hecsRepayment = calcHECS(taxableIncome, hecsBalance);

  const totalTax = incomeTax + medicareLevy + mls + hecsRepayment;
  const takeHome = Math.max(0, taxableIncome - totalTax);

  const effectiveTaxRate = grossIncome > 0 ? totalTax / grossIncome : 0;
  const marginalRate = getMarginalRate(taxableIncome, residency);

  const superAmount = grossIncome * (sgRate / 100);

  return {
    grossIncome,
    taxableIncome,
    salarySacrifice,
    incomeTax,
    lito,
    medicareLevy,
    mls,
    hecsRepayment,
    totalTax,
    takeHome,
    effectiveTaxRate,
    marginalRate,
    superAmount,
  };
}

export function byFreq(annual, freq) {
  if (freq === 'monthly')     return annual / 12;
  if (freq === 'fortnightly') return annual / 26;
  if (freq === 'weekly')      return annual / 52;
  return annual;
}

export function toAnnual(amount, freq) {
  if (freq === 'monthly')     return amount * 12;
  if (freq === 'fortnightly') return amount * 26;
  if (freq === 'weekly')      return amount * 52;
  return amount;
}

// Binary search: find grossIncome such that calcPayTax result.takeHome ≈ targetAnnualNet
export function grossFromNet(targetAnnualNet, inputs) {
  if (targetAnnualNet <= 0) return 0;
  let lo = targetAnnualNet;
  let hi = Math.max(targetAnnualNet * 4, 600000);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const net = calcPayTax({ ...inputs, grossIncome: mid }).takeHome;
    if (net < targetAnnualNet) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
