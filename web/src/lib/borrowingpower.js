// Borrowing power.
//
// Rewritten to fix five problems, three of which pushed the estimate UP —
// the dangerous direction for someone bidding at auction:
//
//  1. HECS/HELP balances were collected from the user and never passed to the
//     tax engine, so the repayment was always zero and the results panel
//     showed a permanent "$0/mo" HECS figure.
//  2. Other income was added AFTER tax, treating rental and dividend income as
//     tax-free, and was not shaded.
//  3. There was no deposit or LVR constraint at all, so the tool could quote a
//     figure the user could never actually access. For most first home buyers
//     the deposit is the binding constraint, not serviceability.
//  4. The living expense floor was a flat $2,100/$2,900 that did not scale with
//     income — far below reality, which overstates capacity.
//  5. Self-employed shading was applied to NET income; lenders shade gross
//     before tax.

import { calcPayTax } from './paytax.js';
import { estimateLmi } from './lmi.js';
import { ratesFor } from './rates/index.js';

// The real HEM tables are proprietary — licensed by the Melbourne Institute to
// lenders and not published. There is no lawful public figure to implement, so
// this is our own transparent approximation and must never be labelled "HEM".
//
// It reflects the published behaviour: scales with household composition and
// income, excludes housing costs, and acts as a floor rather than a substitute
// for declared expenses.
export function expenseBenchmark({ applicantType, dependants, combinedGrossIncome }) {
  const base = applicantType === 'joint' ? 2800 : 1900;
  const perDependant = 450;
  const incomeComponent = (combinedGrossIncome / 12) * 0.08;
  return Math.round(base + dependants * perDependant + incomeComponent);
}

function monthlyRepaymentFactor(annualRate, termYears, interestOnlyYears = 0) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  // Interest-only shortens the amortising period, so the eventual P&I
  // repayment is higher. Lenders assess on that higher figure, not the
  // interest-only payment.
  const amortising = n - interestOnlyYears * 12;
  if (r === 0) return 1 / Math.max(1, amortising);
  return r / (1 - Math.pow(1 + r, -Math.max(1, amortising)));
}

// Shading is applied to GROSS income, before tax.
function shadeFor(employmentType) {
  if (employmentType === 'self-employed') return 0.80;
  if (employmentType === 'casual') return 0.80;
  if (employmentType === 'contract') return 0.90;
  return 1.0;
}

export function calcBorrowingPower(inputs = {}) {
  const {
    grossIncome1 = 0,
    grossIncome2 = 0,
    applicantType = 'single',
    employmentType1 = 'payg',
    employmentType2 = 'payg',
    rentalIncome = 0,
    otherIncome = 0,

    monthlyExpenses = 0,
    dependants = 0,

    creditCardLimits = 0,
    personalLoanMonthly = 0,
    carLoanMonthly = 0,
    otherDebtBalance = 0,

    helpBalance1 = 0,
    helpBalance2 = 0,

    interestRate = 6.0,
    termYears = 30,
    repaymentType = 'pi',
    interestOnlyYears = 0,

    deposit = 0,
    firstHomeGuarantee = false,
    hasPrivateCover = false,

    date = new Date(),
  } = inputs;

  const rates = ratesFor(date);
  const L = rates.lending;
  const isJoint = applicantType === 'joint';

  // ─── Income, shaded on gross then taxed ────────────────────────────────────
  const shaded1 = grossIncome1 * shadeFor(employmentType1);
  const shaded2 = isJoint ? grossIncome2 * shadeFor(employmentType2) : 0;
  // APG 223 requires at least 20% shading of rental income, bonuses and overtime.
  const shadedRent = rentalIncome * L.rentalIncomeShading;

  // Other income is taxable, so it is added to the primary applicant's gross
  // and taxed, rather than dropped in tax-free at the end.
  const tax1 = calcPayTax({
    grossIncome: shaded1 + shadedRent + otherIncome,
    helpBalance: helpBalance1, hasPrivateCover, date,
  });
  const tax2 = isJoint
    ? calcPayTax({ grossIncome: shaded2, helpBalance: helpBalance2, hasPrivateCover, date })
    : { takeHome: 0, helpRepayment: 0 };

  const netAnnualIncome = tax1.takeHome + tax2.takeHome;
  const netMonthlyIncome = netAnnualIncome / 12;

  // takeHome is already net of the HELP repayment, so it must NOT also be
  // subtracted as a commitment — that was a double count waiting to happen.
  const helpMonthly = (tax1.helpRepayment + tax2.helpRepayment) / 12;

  // ─── Commitments ───────────────────────────────────────────────────────────
  const creditCardMonthly = creditCardLimits * L.creditCardMonthlyRate;
  const existingDebts = creditCardMonthly + personalLoanMonthly + carLoanMonthly;

  const benchmark = expenseBenchmark({
    applicantType,
    dependants,
    combinedGrossIncome: grossIncome1 + (isJoint ? grossIncome2 : 0) + rentalIncome + otherIncome,
  });
  const effectiveExpenses = Math.max(monthlyExpenses, benchmark);
  const benchmarkApplied = benchmark > monthlyExpenses;

  const monthlySurplus = netMonthlyIncome - effectiveExpenses - existingDebts;

  // ─── Serviceability at the buffered rate ───────────────────────────────────
  const bufferedRate = interestRate + L.serviceabilityBuffer * 100;
  const io = repaymentType === 'io' ? interestOnlyYears : 0;
  const factor = monthlyRepaymentFactor(bufferedRate, termYears, io);
  const maxByServiceability = Math.max(0, monthlySurplus / factor);

  // ─── Deposit constraint ────────────────────────────────────────────────────
  // Serviceability is only half the question, and for most first home buyers
  // the deposit binds first. 95% is the practical ceiling with LMI; 80% is the
  // threshold that avoids it, which is what people actually want to know.
  const maxLvr = inputs.maxLvr ?? 0.95;
  const maxByDeposit = deposit > 0 ? (deposit / (1 - maxLvr)) - deposit : Infinity;
  const maxPropertyByDeposit = deposit > 0 ? deposit / (1 - maxLvr) : Infinity;
  const propertyAt80 = deposit > 0 ? deposit / 0.20 : null;

  const maxBorrowing = Math.min(maxByServiceability, maxByDeposit);
  const bindingConstraint =
    deposit <= 0 ? 'serviceability'
    : maxByDeposit < maxByServiceability ? 'deposit'
    : 'serviceability';

  const propertyPrice = deposit > 0 ? maxBorrowing + deposit : maxBorrowing;
  const lmi = deposit > 0
    ? estimateLmi({ loanAmount: maxBorrowing, propertyValue: propertyPrice, date, firstHomeGuarantee })
    : null;

  // ─── Debt to income ────────────────────────────────────────────────────────
  // HELP is EXCLUDED from DTI under ARS 223.0 from 30 September 2025, though it
  // still counts as a commitment in serviceability. DTI uses raw gross income
  // and total credit limits — none of the shading applies.
  const grossForDti = grossIncome1 + (isJoint ? grossIncome2 : 0) + rentalIncome + otherIncome;
  const totalDebt = maxBorrowing + creditCardLimits + otherDebtBalance;
  const dti = grossForDti > 0 ? totalDebt / grossForDti : 0;
  const dtiConstrained = dti >= L.dtiLimit.threshold;

  const actualFactor = monthlyRepaymentFactor(interestRate, termYears, io);
  const monthlyRepayment = maxBorrowing * actualFactor;

  const sensitivity = [-1, -0.5, 0, 0.5, 1, 2].map((delta) => {
    const f = monthlyRepaymentFactor(interestRate + delta + L.serviceabilityBuffer * 100, termYears, io);
    const serviceable = Math.max(0, monthlySurplus / f);
    return {
      delta,
      rate: interestRate + delta,
      borrowing: Math.min(serviceable, maxByDeposit),
    };
  });

  const warnings = [];
  if (bindingConstraint === 'deposit') {
    warnings.push({
      level: 'warn',
      title: 'Your deposit is the limit here, not your income',
      body: `You could service more, but a ${(maxLvr * 100).toFixed(0)}% maximum LVR caps your borrowing at ${Math.round(maxByDeposit).toLocaleString('en-AU')} on a ${deposit.toLocaleString('en-AU')} deposit. Saving more deposit lifts this before a pay rise would.`,
    });
  }
  if (dtiConstrained) {
    warnings.push({ level: 'warn', title: `Debt-to-income ratio of ${dti.toFixed(1)}`, body: L.dtiLimit.warning });
  }
  if (helpMonthly > 0) {
    warnings.push({
      level: 'info',
      title: `HELP repayments reduce your capacity by about ${Math.round(helpMonthly).toLocaleString('en-AU')} a month`,
      body: 'Lenders assess the repayment, not the balance, so a small debt and a large one cost roughly the same capacity at the same income. It is excluded from the debt-to-income ratio but still counts here.',
    });
  }
  if (firstHomeGuarantee) {
    warnings.push({
      level: 'info',
      title: 'The First Home Guarantee does not increase your borrowing power',
      body: 'It removes LMI and lets you buy with a 5% deposit, but you still face the full serviceability assessment. Price caps vary by postcode — check the Housing Australia tool.',
    });
  }

  return {
    maxBorrowing,
    maxByServiceability,
    maxByDeposit: Number.isFinite(maxByDeposit) ? maxByDeposit : null,
    maxPropertyPrice: Number.isFinite(maxPropertyByDeposit)
      ? Math.min(maxPropertyByDeposit, maxByServiceability + deposit)
      : maxBorrowing,
    // The price this deposit reaches without paying LMI.
    maxPropertyPriceNoLmi: propertyAt80
      ? Math.min(propertyAt80, maxByServiceability + deposit)
      : null,
    maxLvr,
    bindingConstraint,

    netMonthlyIncome,
    effectiveExpenses,
    expenseBenchmark: benchmark,
    benchmarkApplied,
    existingDebts,
    creditCardMonthly,
    helpMonthly,
    monthlySurplus,
    monthlyRepayment,
    bufferedRate,

    dti,
    dtiConstrained,
    lmi,
    sensitivity,
    warnings,
  };
}
