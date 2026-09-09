// Redundancy/Termination calculations — 2026-27 ATO figures (estimated)
import { calcPayTax, getMarginalRate } from './paytax.js';

// NES minimum redundancy pay (Fair Work Act)
const NES_WEEKS = [
  { minYears: 10, weeks: 12 },
  { minYears: 9,  weeks: 16 },
  { minYears: 8,  weeks: 14 },
  { minYears: 7,  weeks: 13 },
  { minYears: 6,  weeks: 11 },
  { minYears: 5,  weeks: 10 },
  { minYears: 4,  weeks: 8 },
  { minYears: 3,  weeks: 7 },
  { minYears: 2,  weeks: 6 },
  { minYears: 1,  weeks: 4 },
  { minYears: 0,  weeks: 0 },
];

function nesWeeks(yearsService) {
  for (const row of NES_WEEKS) {
    if (yearsService >= row.minYears) return row.weeks;
  }
  return 0;
}

// 2026-27 estimated tax-free genuine redundancy amounts (indexed ~7.5% from 2024-25 $12,524/$6,264)
const TAX_FREE_BASE = 13462;  // 2026-27 estimated (was $12,524 in 2024-25)
const TAX_FREE_PER_YEAR = 6734; // 2026-27 estimated (was $6,264 in 2024-25)

// Concessional rate on ETP above tax-free: 32% if under preservation age (60), else 17%
const ETP_CONCESSIONAL_RATE = 0.32;
const ETP_CONCESSIONAL_SENIOR_RATE = 0.17;
const ETP_CAP = 235000; // ATO ETP cap (approximate, same as prior years)

export function calcRedundancy(inputs) {
  const {
    weeklyGross = 0,
    yearsService = 0,
    terminationReason = 'redundancy',
    unusedAnnualLeaveDays = 0,
    unusedLslDays = 0,
    noticePaidWeeks = 0,
    age = 45,
    grossAnnualIncome = 0,
  } = inputs;

  const weeklyRate = weeklyGross;
  const annualDayRate = (weeklyGross * 52) / 260;

  // Redundancy pay (NES minimum for genuine redundancy)
  const completedYears = Math.floor(yearsService);
  const redundancyWeeks = terminationReason === 'redundancy' ? nesWeeks(completedYears) : 0;
  const redundancyPay = redundancyWeeks * weeklyRate;

  // Tax-free component (genuine redundancy only)
  const taxFreeLimit = terminationReason === 'redundancy'
    ? TAX_FREE_BASE + TAX_FREE_PER_YEAR * completedYears
    : 0;
  const taxFreeAmount = Math.min(redundancyPay, taxFreeLimit);
  const taxableETP = Math.max(0, redundancyPay - taxFreeAmount);

  // ETP tax: concessional rate (32% / 17% for 60+) up to ETP cap
  const concessionalRate = age >= 60 ? ETP_CONCESSIONAL_SENIOR_RATE : ETP_CONCESSIONAL_RATE;
  const etpTaxableAtConcessional = Math.min(taxableETP, ETP_CAP);
  const etpTaxableAtMarginal = Math.max(0, taxableETP - ETP_CAP);
  const margRate = getMarginalRate(grossAnnualIncome, 'resident');
  const etpTax = etpTaxableAtConcessional * concessionalRate + etpTaxableAtMarginal * margRate;

  // Annual leave payout — taxed at marginal rate as ordinary income
  const annualLeavePay = unusedAnnualLeaveDays * annualDayRate;
  const annualLeaveTax = annualLeavePay * getMarginalRate(grossAnnualIncome + annualLeavePay, 'resident');

  // Long service leave — approximate marginal rate treatment (post-1978 accrual)
  const lslPay = unusedLslDays * annualDayRate;
  const lslTax = lslPay * getMarginalRate(grossAnnualIncome + lslPay, 'resident');

  // Notice in lieu — taxed as ordinary income at marginal rate
  const noticePay = noticePaidWeeks * weeklyRate;
  const noticeTax = noticePay * getMarginalRate(grossAnnualIncome + noticePay, 'resident');

  const totalGross = redundancyPay + annualLeavePay + lslPay + noticePay;
  const totalTax = etpTax + annualLeaveTax + lslTax + noticeTax;
  const netTakeHome = Math.max(0, totalGross - totalTax);

  return {
    redundancyPay,
    redundancyWeeks,
    taxFreeAmount,
    taxableETP,
    etpTax,
    annualLeavePay,
    annualLeaveTax,
    lslPay,
    lslTax,
    noticePay,
    noticeTax,
    totalGross,
    totalTax,
    netTakeHome,
    taxFreeLimit,
    concessionalRate,
    margRate,
  };
}
