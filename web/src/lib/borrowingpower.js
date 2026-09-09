// Borrowing Power calculator — 2026-27 APRA serviceability rules
import { calcPayTax } from './paytax.js';

// HEM (simplified Household Expenditure Measure, 2026-27 estimates)
function hemFloor(applicantType, dependants) {
  const base = applicantType === 'joint' ? 2900 : 2100;
  return base + dependants * 520;
}

function monthlyRepaymentFactor(annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return 1 / n;
  return r / (1 - Math.pow(1 + r, -n));
}

export function calcBorrowingPower(inputs) {
  const {
    grossIncome1 = 0,
    grossIncome2 = 0,
    applicantType = 'single',
    employmentType = 'payg',
    otherIncome = 0,
    monthlyExpenses = 0,
    creditCardLimits = 0,
    personalLoanMonthly = 0,
    carLoanMonthly = 0,
    dependants = 0,
    interestRate = 6.0,
    termYears = 30,
    repaymentType = 'pi',
    hecsBalance1 = 0,
    hecsBalance2 = 0,
  } = inputs;

  // Net income after tax
  const tax1 = calcPayTax({ grossIncome: grossIncome1, residency: 'resident' });
  const tax2 = applicantType === 'joint'
    ? calcPayTax({ grossIncome: grossIncome2, residency: 'resident' })
    : { takeHome: 0, hecsRepayment: 0 };

  // Self-employed: lenders typically use 2-yr average, shaded at 80%
  const incomeShade = employmentType === 'self-employed' ? 0.80 : 1.0;
  const netMonthlyIncome = ((tax1.takeHome + tax2.takeHome) * incomeShade + otherIncome) / 12;

  // APRA buffer: assessed rate = interest rate + 3% (floor at rate + 3%)
  const bufferedRate = interestRate + 3.0;

  // Existing debt repayments per month
  const creditCardMonthly = creditCardLimits * 0.03; // lenders use 3% of limit
  const hecsMonthly = (tax1.hecsRepayment + tax2.hecsRepayment) / 12;
  const existingDebts = creditCardMonthly + personalLoanMonthly + carLoanMonthly + hecsMonthly;

  // HEM floor
  const hem = hemFloor(applicantType, dependants);
  const effectiveExpenses = Math.max(monthlyExpenses, hem);

  // Monthly surplus
  const monthlySurplus = netMonthlyIncome - effectiveExpenses - existingDebts;

  // Max borrowing at buffered rate
  const repayFactor = monthlyRepaymentFactor(bufferedRate, termYears);
  const maxBorrowing = Math.max(0, monthlySurplus / repayFactor);

  // Sensitivity: borrowing at ±0.5%, ±1% rate changes
  const sensitivity = [-1, -0.5, 0, 0.5, 1].map(delta => ({
    rateDelta: delta,
    rate: interestRate + delta,
    borrowing: Math.max(0, monthlySurplus / monthlyRepaymentFactor(interestRate + delta + 3, termYears)),
  }));

  // Monthly repayment at actual rate on max borrowing
  const actualRepayFactor = monthlyRepaymentFactor(interestRate, termYears);
  const monthlyRepayment = maxBorrowing * actualRepayFactor;

  return {
    maxBorrowing,
    netMonthlyIncome,
    effectiveExpenses,
    hem,
    existingDebts,
    creditCardMonthly,
    hecsMonthly,
    monthlySurplus,
    monthlyRepayment,
    bufferedRate,
    sensitivity,
    incomeShade,
  };
}
