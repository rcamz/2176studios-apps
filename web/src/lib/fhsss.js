// FHSSS (First Home Super Saver Scheme) — 2026-27 ATO rules
import { getMarginalRate } from './paytax.js';

const ANNUAL_LIMIT = 15000;   // max releasable per year
const LIFETIME_LIMIT = 50000; // lifetime maximum
const CONCESSIONAL_CAP = 30000; // annual concessional cap 2026-27
const NOTIONAL_EARNINGS_RATE = 0.0714; // ATO shortfall interest charge rate (approx)
const CONCESSIONAL_TAX = 0.15; // tax on concessional contributions in super

export function calcFHSSS(inputs) {
  const {
    grossIncome = 0,
    annualConcessional = 0,
    annualNonConcessional = 0,
    years = 3,
    superBalance = 0,
    sgRate = 12,
  } = inputs;

  const sgContribution = grossIncome * (sgRate / 100);
  const totalConcessional = sgContribution + annualConcessional;
  const concCapExceeded = totalConcessional > CONCESSIONAL_CAP;
  const availableConcessional = Math.max(0, Math.min(annualConcessional, CONCESSIONAL_CAP - sgContribution, ANNUAL_LIMIT));
  const availableNonCon = Math.min(annualNonConcessional, ANNUAL_LIMIT - availableConcessional);
  const annualReleasable = Math.min(availableConcessional + availableNonCon, ANNUAL_LIMIT);

  const marginalRate = getMarginalRate(grossIncome, 'resident');

  // Accumulate year by year
  const yearData = [];
  let cumulativeReleasable = 0;
  let cumulativeEarnings = 0;

  for (let yr = 1; yr <= Math.min(years, 10); yr++) {
    // Can't exceed lifetime limit
    const thisYearReleasable = Math.min(annualReleasable, LIFETIME_LIMIT - cumulativeReleasable);
    cumulativeReleasable += thisYearReleasable;

    // Notional earnings accrue on the cumulative releasable amount
    cumulativeEarnings = (cumulativeReleasable + cumulativeEarnings) * NOTIONAL_EARNINGS_RATE * (years - yr + 1) / years;

    yearData.push({
      year: yr,
      releasable: Math.round(cumulativeReleasable),
      earnings: Math.round(cumulativeEarnings),
      total: Math.round(cumulativeReleasable + cumulativeEarnings),
    });
  }

  const totalReleasable = Math.min(cumulativeReleasable, LIFETIME_LIMIT);
  const totalWithEarnings = totalReleasable + cumulativeEarnings;

  // Withdrawal tax: (marginal rate - 30%) × amount
  const withholdingRate = Math.max(0, marginalRate - 0.30);
  const withdrawalTax = withholdingRate * totalWithEarnings;
  const netDeposit = totalWithEarnings - withdrawalTax;

  // Tax saving: concessional contributions taxed at 15% in super vs marginal outside
  const annualTaxSaving = annualConcessional * (marginalRate - CONCESSIONAL_TAX);
  const totalTaxSaving = annualTaxSaving * Math.min(years, totalReleasable / Math.max(1, annualReleasable));

  // Non-con comes out tax-free on withdrawal
  const totalConSaving = annualConcessional * years * (marginalRate - CONCESSIONAL_TAX);

  const lifetimeLimitReached = cumulativeReleasable >= LIFETIME_LIMIT;
  const annualCapWarning = concCapExceeded;

  return {
    annualReleasable,
    totalReleasable,
    totalWithEarnings,
    withdrawalTax,
    netDeposit,
    withholdingRate,
    annualTaxSaving,
    totalConSaving,
    yearData,
    lifetimeLimitReached,
    annualCapWarning,
    marginalRate,
    sgContribution,
    concCapExceeded,
    ANNUAL_LIMIT,
    LIFETIME_LIMIT,
  };
}
