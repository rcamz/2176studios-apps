// CGT calculations using 2026-27 ATO rates
import { calcPayTax, getMarginalRate } from './paytax.js';

export function calcCGT(inputs) {
  const {
    purchasePrice = 0,
    purchaseCosts = 0,
    salePrice = 0,
    saleCosts = 0,
    improvements = 0,
    purchaseDate = '',
    saleDate = '',
    grossIncome = 0,
    capitalLosses = 0,
    residency = 'resident',
  } = inputs;

  const costBase = purchasePrice + purchaseCosts + improvements;
  const netSaleProceeds = salePrice - saleCosts;
  const grossGain = netSaleProceeds - costBase;

  // Holding period check for 50% discount
  let holdingMonths = 0;
  if (purchaseDate && saleDate) {
    const from = new Date(purchaseDate + '-01');
    const to = new Date(saleDate + '-01');
    holdingMonths = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }
  const heldOver12Months = holdingMonths >= 12;
  const cgtDiscountEligible = heldOver12Months && residency === 'resident';
  const discountRate = cgtDiscountEligible ? 0.5 : 0;

  // Apply capital losses before discount
  const gainAfterLosses = Math.max(0, grossGain - Math.max(0, capitalLosses));

  // Apply 50% discount to the net gain (not to losses)
  const assessableGain = gainAfterLosses * (1 - discountRate);

  // Tax on income + CGT vs tax on income alone
  const taxOnIncomeAlone = calcPayTax({ grossIncome, residency }).incomeTax;
  const taxOnIncomeAndGain = calcPayTax({ grossIncome: grossIncome + assessableGain, residency }).incomeTax;

  const cgtPayable = Math.max(0, taxOnIncomeAndGain - taxOnIncomeAlone);

  const effectiveCGTRate = grossGain > 0 ? cgtPayable / grossGain : 0;
  const afterTaxProceeds = netSaleProceeds - cgtPayable;

  const marginalRate = getMarginalRate(grossIncome + assessableGain, residency);

  return {
    costBase,
    netSaleProceeds,
    grossGain,
    gainAfterLosses,
    assessableGain,
    discountRate,
    cgtDiscountEligible,
    holdingMonths,
    capitalLosses: Math.max(0, capitalLosses),
    cgtPayable,
    effectiveCGTRate,
    afterTaxProceeds,
    marginalRate,
    taxOnIncomeAlone,
    taxOnIncomeAndGain,
  };
}
