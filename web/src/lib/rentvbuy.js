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
  let finalBalance = loanAmount;
  let finalSellingCostAmount = 0;
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
    finalBalance = balance;
    finalSellingCostAmount = sellingCostAmount;

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

    // Kept so the explanation can show how equity at the horizon is reached
    // without re-deriving it by subtraction.
    mortgageBalance: finalBalance,
    sellingCostAmount: finalSellingCostAmount,
    renterCostBase: portfolioCostBase,

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

// ─── Explanation ─────────────────────────────────────────────────────────────

import {
  workings, section, step, subtotal, total, note,
} from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const pct = (r) => (r * 100).toFixed(1) + '%';
const trim = (n) => String(Number(Number(n).toFixed(2)));

/**
 * Build a step-by-step account of a calcRentVsBuy result.
 *
 * Separate from the calculation so the projection loop stays free of
 * presentation concerns.
 */
export function explainRentVsBuy(result, inputs = {}) {
  const r = result;
  const {
    purchasePrice = 800000,
    state = 'NSW',
    firstHomeBuyer = false,
    deposit = 160000,
    purchaseCosts = 3000,
    capitaliseStampDuty = false,
    mortgageRate = 6.0,
    loanTerm = 30,
    propertyGrowth = 4,
    sellingCosts = 2,
    annualRent = 36000,
    investmentReturn = 7,
    comparisonYears = 10,
  } = inputs;

  const years = comparisonYears;
  const baseLoan = Math.max(0, purchasePrice - deposit);
  const contributions = r.renterCostBase - r.buyerUpfrontCash;
  const portfolioGrowth = r.renterPortfolioGross - r.renterCostBase;
  const propertyGain = r.projectedPropertyValue - purchasePrice;

  // ─── Upfront ───────────────────────────────────────────────────────────────
  const upfront = section('Cash the buyer needs upfront', [
    step('Deposit', deposit),
    !capitaliseStampDuty && step(`Stamp duty, ${state}`, r.stampDuty, {
      note: firstHomeBuyer && r.stampDuty === 0 ? 'Exempt as a first home buyer at this price' : null,
    }),
    step('Purchase costs', purchaseCosts, { note: 'Conveyancing, building and pest, loan fees' }),
    total('Cash needed at settlement', r.buyerUpfrontCash),
    capitaliseStampDuty && note(
      `Stamp duty of ${money(r.stampDuty)} is capitalised into the loan here rather than paid in cash, so it is not part of the cash needed at settlement — the buyer borrows it and pays interest on it for the life of the loan. Most lenders require duty to be paid in cash.`
    ),
  ], {
    note: 'This is the number the comparison turns on. The renter never spends it, so the model hands the renter exactly this amount as starting capital on day one — the opportunity cost of the deposit, which a rent-versus-buy comparison that ignores it will always get wrong.',
  });

  // ─── The loan ──────────────────────────────────────────────────────────────
  const loan = section('The loan', [
    step('Purchase price', purchasePrice),
    step('less deposit', -deposit),
    subtotal('Base loan', baseLoan),
    r.lmiPremium > 0 && step('plus LMI, capitalised', r.lmiPremium),
    capitaliseStampDuty && step('plus stamp duty, capitalised', r.stampDuty),
    total('Loan amount', r.loanAmount),
    step('Loan to value ratio', r.lvr !== null ? pct(r.lvr) : '—', { muted: true }),
    step('Monthly repayment', r.monthlyMortgage, {
      note: `${trim(mortgageRate)}% p.a. over ${trim(loanTerm)} years`,
    }),
  ], {
    note: r.lmiPayable
      ? 'LMI insures the lender, not the buyer. Capitalising it means paying interest on the premium for the whole term, so it costs considerably more than the sticker price.'
      : 'No LMI at this deposit — the loan to value ratio is at or below 80%.',
  });

  // ─── Cashflow along the way ────────────────────────────────────────────────
  const cashflow = section(`Cash out over ${years} years`, [
    step('Owner outgoings', r.cumulativeOwnerOutgoings, {
      note: 'Mortgage repayments plus rates, strata, insurance and maintenance',
    }),
    step('less rent the renter pays instead', -r.cumulativeRent),
    total('Difference the renter invests', r.cumulativeOwnerOutgoings - r.cumulativeRent),
    step('Of the owner outgoings, interest', r.cumulativeInterest, { muted: true }),
  ], {
    note: 'A negative figure means rent costs more than owning, and the renter draws the difference out of the portfolio rather than adding to it. Both directions are modelled — flooring this at zero would quietly flatter renting in expensive rental markets.',
  });

  // ─── Buyer at the horizon ──────────────────────────────────────────────────
  const buyer = section(`Buyer equity after ${years} years`, [
    step(`Property value, growing at ${trim(propertyGrowth)}% a year`, r.projectedPropertyValue, {
      note: `From ${money(purchasePrice)}`,
    }),
    step('less mortgage balance', -r.mortgageBalance),
    step(`less selling costs at ${trim(sellingCosts)}%`, -r.sellingCostAmount),
    total('Buyer equity', r.buyerEquity),
  ], {
    note: 'The mortgage balance falls faster each year, because a fixed repayment covers less interest and more principal as the balance shrinks. Interest is the price of the loan, not a component of equity.',
  });

  // ─── Renter at the horizon ─────────────────────────────────────────────────
  const renter = section(`Renter wealth after ${years} years`, [
    step('Starting capital', r.buyerUpfrontCash, {
      note: 'The cash the buyer spends at settlement, invested instead',
    }),
    step(contributions >= 0 ? 'Contributions from the cost difference' : 'Drawdowns to cover rent', contributions),
    subtotal('Cost base', r.renterCostBase, { note: 'What the renter has actually put in' }),
    step(`Investment growth at ${trim(investmentReturn)}% a year`, portfolioGrowth),
    subtotal('Portfolio value', r.renterPortfolioGross),
    step('less capital gains tax on the gain', -r.renterCgt, {
      note: `50% discount for holding over 12 months, then ${pct(r.marginalRate)} plus Medicare on what is left`,
    }),
    total('Renter wealth', r.renterWealth),
  ], {
    note: 'Tax lands on the return, not on the contributions — money invested is already after-tax. Taxing the contribution instead is a common modelling error and it understates renter wealth badly over a long horizon.',
  });

  // ─── The asymmetry ─────────────────────────────────────────────────────────
  const cgt = section('Capital gains tax — the asymmetry', [
    step('Growth on the home', propertyGain),
    step('Tax the buyer pays on it', 0, { note: 'Main residence exemption — none' }),
    step('Gain on the portfolio', portfolioGrowth),
    step('Tax the renter pays on it', r.renterCgt, {
      note: `At a marginal rate of ${pct(r.marginalRate)} plus the Medicare levy, after the 50% discount`,
    }),
  ], {
    note: 'The main residence exemption is the single largest tax concession available to an individual in Australia, and it is the part of this comparison people most often leave out. The renter is investing in a taxed environment; the buyer is not. Two assets can return the same percentage and still leave the owner ahead purely on this.',
  });

  // ─── The verdict ───────────────────────────────────────────────────────────
  const verdict = section('The difference', [
    step('Buyer equity', r.buyerEquity),
    step('less renter wealth', -r.renterWealth),
    total('Buyer ahead by', r.wealthGap, {
      note: r.wealthGap >= 0 ? null : 'A negative figure means renting and investing wins over this horizon',
    }),
    step('Break-even', r.breakEvenYear ? `Year ${r.breakEvenYear}` : 'Beyond this horizon', { muted: true }),
  ], {
    note: 'Both sides are measured after liquidating — the buyer after selling costs, the renter after tax. Comparing gross property value against a net portfolio would overstate buying.',
  });

  return workings([upfront, loan, cashflow, buyer, renter, cgt, verdict], {
    source: `Stamp duty for ${state}`,
  });
}
