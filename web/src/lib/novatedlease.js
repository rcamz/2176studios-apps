// Novated Lease calculator — 2026-27 ATO rules
import { calcPayTax, getMarginalRate } from './paytax.js';

// ATO residual value guidelines (% of drive-away price)
const RESIDUAL_PCT = { 1: 0.6563, 2: 0.5625, 3: 0.4688, 4: 0.375, 5: 0.2813 };

// FBT rate 2026-27 (47%)
const FBT_RATE = 0.47;
const FBT_GROSS_UP = 2.0802; // type 2 gross-up factor

// LCT threshold 2026-27 estimated (~$91,000, indexed from $89,332 in 2024-25)
const LCT_THRESHOLD = 91000;

function flatLeasePayment(vehiclePrice, residual, rate, termYears) {
  const termMonths = termYears * 12;
  const monthlyRate = rate / 100 / 12;
  if (monthlyRate === 0) return (vehiclePrice - residual) / termMonths;
  return (vehiclePrice - residual * Math.pow(1 + monthlyRate, -termMonths)) *
    monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

export function calcNovatedLease(inputs) {
  const {
    vehiclePrice = 50000,
    isEVExempt = true,
    termYears = 3,
    annualKms = 15000,
    grossSalary = 100000,
    sgRate = 12,
    runningCosts = 5000,
    financeRate = 7.5,
    residualOverride = null,
    leaseBalloon = null,
  } = inputs;

  const isExempt = isEVExempt && vehiclePrice < LCT_THRESHOLD;
  const residualPct = RESIDUAL_PCT[Math.min(5, Math.max(1, termYears))] ?? 0.4688;
  const residualValue = residualOverride !== null ? residualOverride : vehiclePrice * residualPct;

  const monthlyLeasePayment = flatLeasePayment(vehiclePrice, residualValue, financeRate, termYears);
  const annualLeasePayment = monthlyLeasePayment * 12;
  const totalLeaseAndRunning = annualLeasePayment + runningCosts;

  const marginalRate = getMarginalRate(grossSalary, 'resident');

  let annualTaxSaving = 0;
  let fbtLiability = 0;
  let preTaxSalaryReduction = 0;

  if (isExempt) {
    // EV FBT-exempt: full lease + running costs from pre-tax salary
    preTaxSalaryReduction = totalLeaseAndRunning;
    annualTaxSaving = totalLeaseAndRunning * marginalRate;
    fbtLiability = 0;
  } else {
    // Non-EV: statutory method, FBT = base × 2.0802 × 47%
    const fbtBase = vehiclePrice * 0.20; // statutory fraction
    fbtLiability = fbtBase * FBT_GROSS_UP * FBT_RATE;
    // Employee contribution to reduce FBT = fbt base value
    const employeeContrib = fbtBase;
    preTaxSalaryReduction = totalLeaseAndRunning - fbtBase;
    annualTaxSaving = preTaxSalaryReduction * marginalRate;
  }

  const totalSavingOverTerm = annualTaxSaving * termYears;

  // Out-of-pocket: after-tax cost of the salary reduction
  const netAnnualCost = preTaxSalaryReduction - annualTaxSaving;
  const forthnightlyOutOfPocket = netAnnualCost / 26;

  // Compare to buying outright
  // Cents-per-km method (88c/km up to 5000km) — otherwise logbook
  const centsPerKmDeduction = Math.min(annualKms, 5000) * 0.88;
  const outright_annualCost = runningCosts - centsPerKmDeduction * marginalRate;

  // Comparison: total cost of ownership over term
  const novatedTotalCost = netAnnualCost * termYears + residualValue;
  const outrightTotalCost = vehiclePrice + outright_annualCost * termYears - residualValue;

  // Chart: annual breakdown
  const chartData = Array.from({ length: termYears }, (_, i) => ({
    year: `Year ${i + 1}`,
    'Novated (net)': Math.round(netAnnualCost),
    'Buy outright (net)': Math.round(outright_annualCost + vehiclePrice / termYears),
  }));

  return {
    vehiclePrice,
    residualValue,
    annualLeasePayment,
    runningCosts,
    totalLeaseAndRunning,
    isExempt,
    fbtLiability,
    preTaxSalaryReduction,
    annualTaxSaving,
    totalSavingOverTerm,
    netAnnualCost,
    forthnightlyOutOfPocket,
    centsPerKmDeduction,
    outright_annualCost,
    novatedTotalCost,
    outrightTotalCost,
    marginalRate,
    chartData,
  };
}
