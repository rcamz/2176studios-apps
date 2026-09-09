// Salary Sacrifice calculations — 2026-27
import { calcPayTax } from './paytax.js';

// Concessional cap 2026-27: $30,000 (indexed from $27,500 in prior years)
const CONCESSIONAL_CAP = 30000;
const SUPER_TAX_RATE = 0.15;

export function calcSalarySacrifice(inputs) {
  const {
    grossSalary = 0,
    sgRate = 12,
    sacrificeAmount = 0,
    otherSacrifice = 0,
    age = 40,
    superBalance = 0,
    horizonYears = 20,
    investmentReturn = 0.07,
  } = inputs;

  const sgContribution = grossSalary * (sgRate / 100);
  const totalConcessional = sgContribution + sacrificeAmount + otherSacrifice;
  const capExceeded = totalConcessional > CONCESSIONAL_CAP;
  const excessAmount = Math.max(0, totalConcessional - CONCESSIONAL_CAP);

  // Tax comparison: with vs without sacrifice
  const withoutSacrifice = calcPayTax({ grossIncome: grossSalary, sgRate, residency: 'resident' });
  const withSacrifice = calcPayTax({ grossIncome: grossSalary, sgRate, salarySacrifice: sacrificeAmount, residency: 'resident' });

  const annualTaxSaving = withoutSacrifice.totalTax - withSacrifice.totalTax;
  const netTakeHomeCost = sacrificeAmount - annualTaxSaving;

  // Fortnightly cost
  const fortnigthlyCost = netTakeHomeCost / 26;

  // Carry-forward: available if super balance < $500k (simplified — use current cap × 5yr lookback)
  const carryForwardAvailable = superBalance < 500000
    ? Math.max(0, CONCESSIONAL_CAP * 5 - (CONCESSIONAL_CAP * 5))
    : 0;

  // Projection: super balance with vs without sacrifice
  const monthlyReturn = investmentReturn / 12;
  const superTaxedSacrifice = sacrificeAmount * (1 - SUPER_TAX_RATE);

  const projectionData = [];
  let balWith = superBalance;
  let balWithout = superBalance;
  const monthlyWithBase = sgContribution * (1 - SUPER_TAX_RATE) / 12;
  const monthlyWithSacrifice = (sgContribution + sacrificeAmount) * (1 - SUPER_TAX_RATE) / 12;

  for (let yr = 0; yr <= Math.min(horizonYears, 40); yr++) {
    projectionData.push({
      year: yr,
      'With sacrifice': Math.round(balWith),
      'Without sacrifice': Math.round(balWithout),
    });
    for (let m = 0; m < 12; m++) {
      balWith = balWith * (1 + monthlyReturn) + monthlyWithSacrifice;
      balWithout = balWithout * (1 + monthlyReturn) + monthlyWithBase;
    }
  }

  return {
    sgContribution,
    totalConcessional,
    capExceeded,
    excessAmount,
    annualTaxSaving,
    netTakeHomeCost,
    fortnigthlyCost,
    withoutSacrifice,
    withSacrifice,
    projectionData,
    CONCESSIONAL_CAP,
    superTaxedSacrifice,
  };
}
