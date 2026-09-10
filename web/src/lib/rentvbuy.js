// Rent vs buy, for an owner-occupied home.
//
// Rewritten to fix four structural problems in the previous model, each of
// which pushed the answer the same way:
//
//  1. Interest was computed on the OPENING balance for a whole year, ignoring
//     amortisation. It now uses the same month-by-month engine as the mortgage
//     calculator instead of a parallel, wrong one.
//  2. The renter's "tax" multiplied their CONTRIBUTION by 0.7 rather than
//     taxing the RETURN, which systematically understated renter wealth.
//  3. Surplus was floored at zero, so when rent exceeded the cost of owning
//     the renter neither invested nor drew down — asymmetric, and it flattered
//     renting in expensive rental markets.
//  4. The main residence CGT exemption was absent. The buyer's gain is
//     tax-free; the renter's portfolio is not. That is a structural advantage
//     of buying and it was simply missing.

import { amortize, summarize } from './amortize.js';
import { calcStampDuty } from './stampduty.js';
import { estimateLmi } from './lmi.js';
import { ratesFor } from './rates/index.js';
import { negativeGearing } from './rates/cgt.js';
import { getMarginalRate } from './paytax.js';

export function calcRentVsBuy(inputs = {}) {
  const {
    purchasePrice = 800000,
    state = 'NSW',
    firstHomeBuyer = false,
    propertyType = 'established',
    contractDate = new Date().toISOString().slice(0, 10),
    firstHomeGuarantee = false,

    deposit = 160000,
    mortgageRate = 6.0,
    loanTerm = 30,
    capitaliseStampDuty = false,

    propertyGrowth = 4,
    ongoingCosts = 8000,
    purchaseCosts = 3000,      // conveyancing, building and pest, loan fees
    sellingCosts = 2,          // % of sale price

    annualRent = 36000,
    rentIncrease = 3,
    investmentReturn = 7,

    grossIncome = 120000,
    comparisonYears = 10,
    date = new Date(),
  } = inputs;

  const rates = ratesFor(date);

  // ─── Upfront ───────────────────────────────────────────────────────────────
  const { duty: stampDuty } = calcStampDuty({
    state, value: purchasePrice, firstHomeBuyer, propertyType,
    contractDate, settlementDate: contractDate,
  });

  const baseLoan = Math.max(0, purchasePrice - deposit);
  const lmi = estimateLmi({
    loanAmount: baseLoan, propertyValue: purchasePrice, date, firstHomeGuarantee,
  });
  const lmiPremium = lmi.payable ? lmi.midpoint : 0;

  // Lenders generally require duty to be paid in cash rather than capitalised,
  // so this defaults off. When it is capitalised the buyer needs less cash but
  // borrows more and pays interest on it.
  const loanAmount = baseLoan + lmiPremium + (capitaliseStampDuty ? stampDuty : 0);
  const buyerUpfrontCash =
    deposit + purchaseCosts + (capitaliseStampDuty ? 0 : stampDuty);

  // ─── Buyer: real amortisation ──────────────────────────────────────────────
  const rows = amortize({
    loanAmount,
    annualRatePercent: mortgageRate,
    termYears: loanTerm,
    includeOffset: false,
    includeExtras: false,
  });
  const annualMortgage = (rows[0]?.payment ?? 0) * 12;

  // ─── Renter: same starting capital, invested ───────────────────────────────
  // The renter does not spend the buyer's upfront cash, so they start with it.
  let portfolioValue = buyerUpfrontCash;
  let portfolioCostBase = buyerUpfrontCash;

  let propertyValue = purchasePrice;
  let currentRent = annualRent;
  let currentOngoing = ongoingCosts;
  let cumulativeRent = 0;
  let cumulativeInterest = 0;
  let cumulativeOwnerOutgoings = 0;

  const marginalRate = getMarginalRate(grossIncome, 'resident', rates);
  const chartData = [{
    year: 0,
    'Buyer equity': Math.round(purchasePrice - loanAmount),
    'Renter wealth': Math.round(portfolioValue),
  }];
  let breakEvenYear = null;

  for (let yr = 1; yr <= comparisonYears; yr++) {
    propertyValue *= 1 + propertyGrowth / 100;

    const slice = rows.slice((yr - 1) * 12, yr * 12);
    const yearInterest = slice.reduce((s, r) => s + r.interest, 0);
    const yearPaid = slice.reduce((s, r) => s + r.payment, 0);
    const balance = slice.length ? slice[slice.length - 1].balance : 0;
    cumulativeInterest += yearInterest;

    const ownerOutgoings = yearPaid + currentOngoing;
    cumulativeOwnerOutgoings += ownerOutgoings;

    // Signed, not floored. When rent exceeds the cost of owning, the renter
    // draws down rather than magically contributing nothing.
    const surplus = ownerOutgoings - currentRent;
    portfolioValue = portfolioValue * (1 + investmentReturn / 100) + surplus;
    portfolioCostBase += surplus;
    if (portfolioValue < 0) portfolioValue = 0;

    cumulativeRent += currentRent;
    currentRent *= 1 + rentIncrease / 100;
    currentOngoing *= 1 + rentIncrease / 100; // rates and strata track inflation too

    // Buyer sells: no CGT, because the main residence is exempt.
    const sellingCostAmount = propertyValue * (sellingCosts / 100);
    const buyerEquity = propertyValue - balance - sellingCostAmount;

    // Renter liquidates: CGT applies to the gain, with the 50% discount since
    // the holding period exceeds 12 months.
    const renterNet = netOfCgt(portfolioValue, portfolioCostBase, marginalRate, rates);

    chartData.push({
      year: yr,
      'Buyer equity': Math.round(buyerEquity),
      'Renter wealth': Math.round(renterNet),
    });

    if (breakEvenYear === null && buyerEquity > renterNet) breakEvenYear = yr;
  }

  const final = chartData[chartData.length - 1];
  const buyerEquity = final['Buyer equity'];
  const renterWealth = final['Renter wealth'];

  const renterGross = portfolioValue;
  const renterCgt = renterGross - netOfCgt(renterGross, portfolioCostBase, marginalRate, rates);

  // Grandfathering for the negative gearing quarantine is already live, so a
  // buyer contemplating renting this out later is affected by their contract
  // date today.
  const negativeGearingWarning =
    contractDate > negativeGearing.grandfatherCutoff.slice(0, 10)
      ? {
          level: 'info',
          title: 'If you later rent this property out',
          body: `Properties purchased after 7:30pm on 12 May 2026 lose the ability to offset rental losses against other income from the ${negativeGearing.quarantineFromFinancialYear} financial year. Losses can only be offset against other residential property income, and excess losses carry forward. Properties held at the announcement are unaffected until sold.`,
        }
      : null;

  return {
    stampDuty,
    lmiPremium,
    lmiPayable: lmi.payable,
    lvr: lmi.lvr,
    loanAmount,
    buyerUpfrontCash,
    monthlyMortgage: rows[0]?.payment ?? 0,
    annualMortgage,

    buyerEquity,
    renterWealth,
    wealthGap: buyerEquity - renterWealth,
    breakEvenYear,

    cumulativeInterest: Math.round(cumulativeInterest),
    cumulativeRent: Math.round(cumulativeRent),
    cumulativeOwnerOutgoings: Math.round(cumulativeOwnerOutgoings),
    projectedPropertyValue: Math.round(propertyValue),
    renterPortfolioGross: Math.round(renterGross),
    renterCgt: Math.round(renterCgt),
    marginalRate,

    totalLoanInterest: summarize(rows).totalInterest,
    chartData,
    warnings: [negativeGearingWarning].filter(Boolean),
  };
}

// The renter's portfolio is not CGT-exempt. Held beyond 12 months, the
// individual discount applies to the gain.
function netOfCgt(value, costBase, marginalRate, rates) {
  const gain = value - costBase;
  if (gain <= 0) return value;
  const discount = rates.cgt.individualDiscount ?? 0;
  const assessable = gain * (1 - discount);
  const tax = assessable * (marginalRate + rates.medicare.levyRate);
  return value - tax;
}
