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
    : { takeHome: 0, helpRepayment: 0, totalTax: 0, deductionClaimed: 0 };

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

    // Income detail, so the explanation can show gross → shaded → net without
    // re-running the tax engine or backing figures out by subtraction.
    grossAnnualIncome: grossIncome1 + (isJoint ? grossIncome2 : 0) + rentalIncome + otherIncome,
    shadedAnnualIncome: shaded1 + shaded2 + shadedRent + otherIncome,
    annualTax: tax1.totalTax + tax2.totalTax,
    annualDeduction: tax1.deductionClaimed + tax2.deductionClaimed,
    netAnnualIncome,
    shading: {
      applicant1: shadeFor(employmentType1),
      applicant2: isJoint ? shadeFor(employmentType2) : null,
      rental: L.rentalIncomeShading,
    },

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

// ─── Explanation ─────────────────────────────────────────────────────────────

import {
  workings, section, step, subtotal, total, note,
} from './workings.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const pct = (r, dp = 1) => (r * 100).toFixed(dp).replace(/\.0$/, '') + '%';
const trim = (n) => String(Number(Number(n).toFixed(2)));

const EMPLOYMENT_LABEL = {
  payg: 'PAYG',
  contract: 'contract',
  casual: 'casual',
  'self-employed': 'self-employed',
};

/**
 * Build a step-by-step account of a calcBorrowingPower result.
 *
 * Separate from the calculation so the assessment stays free of presentation
 * concerns. Every figure here comes from the result or the inputs.
 */
export function explainBorrowingPower(result, inputs = {}) {
  const r = result;
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
    interestRate = 6.0,
    termYears = 30,
    repaymentType = 'pi',
    interestOnlyYears = 0,
    deposit = 0,
  } = inputs;

  const isJoint = applicantType === 'joint';
  const shade1 = r.shading?.applicant1 ?? 1;
  const shade2 = r.shading?.applicant2 ?? 1;
  const rentalShade = r.shading?.rental ?? 1;
  const io = repaymentType === 'io' ? interestOnlyYears : 0;
  const factor = monthlyRepaymentFactor(r.bufferedRate, termYears, io);
  const buffer = r.bufferedRate - interestRate;

  // ─── Income ────────────────────────────────────────────────────────────────
  const income = section('Income the lender will count', [
    step(isJoint ? 'Applicant 1 gross income' : 'Gross income', grossIncome1),
    shade1 < 1 && step(
      `less ${pct(1 - shade1, 0)} shading, ${EMPLOYMENT_LABEL[employmentType1] ?? employmentType1} income`,
      -(grossIncome1 * (1 - shade1)),
      { note: 'Shaded on gross, before tax — lenders discount income they consider less certain' }
    ),
    isJoint && step('Applicant 2 gross income', grossIncome2),
    isJoint && shade2 < 1 && step(
      `less ${pct(1 - shade2, 0)} shading, ${EMPLOYMENT_LABEL[employmentType2] ?? employmentType2} income`,
      -(grossIncome2 * (1 - shade2))
    ),
    rentalIncome > 0 && step('Rental income', rentalIncome),
    rentalIncome > 0 && step(`less ${pct(1 - rentalShade, 0)} shading on rent`, -(rentalIncome * (1 - rentalShade)), {
      note: 'APG 223 requires at least 20% to cover vacancy, agent fees and maintenance',
    }),
    otherIncome > 0 && step('Other income', otherIncome),
    subtotal('Assessable gross income', r.shadedAnnualIncome),
    step('less income tax, Medicare and any HELP repayment', -r.annualTax),
    r.annualDeduction > 0 && step('less the standard work deduction', -r.annualDeduction, {
      muted: true,
      note: 'Tax is worked out on taxable income, which is after this deduction, so the net figure below sits slightly under the cash actually banked',
    }),
    total('Net income a year', r.netAnnualIncome),
    step('Net income a month', r.netMonthlyIncome),
  ], {
    note: 'Other income is taxed, not added on tax-free at the end. Rental and investment income arriving untaxed is one of the most common ways an online estimate comes out well above what a lender will actually offer.',
  });

  // ─── Living expenses ───────────────────────────────────────────────────────
  const expenses = section('Living expenses used', [
    step('What you declared', monthlyExpenses, { muted: true }),
    step('Our indicative benchmark for your household', r.expenseBenchmark, {
      muted: true,
      note: `${isJoint ? 'Couple' : 'Single'}${dependants > 0 ? ` with ${dependants} dependant${dependants === 1 ? '' : 's'}` : ''}, scaled by income, excluding housing`,
    }),
    total('Figure used in the assessment', r.effectiveExpenses, {
      note: r.benchmarkApplied
        ? 'The higher of the two — the benchmark, because your declared figure sits below it'
        : 'The higher of the two — your declared figure',
    }),
  ], {
    note: 'This benchmark is our own, and indicative only. Lenders use a licensed household expenditure dataset that is not published, so no public calculator can reproduce their figure. What matters is the behaviour: a lender applies the higher of its benchmark and what you declare, which is why understating your spending on an application does not lift your borrowing power.',
  });

  // ─── Surplus ───────────────────────────────────────────────────────────────
  const surplus = section('Monthly surplus', [
    step('Net income a month', r.netMonthlyIncome),
    step('less living expenses', -r.effectiveExpenses),
    creditCardLimits > 0 && step(
      `less credit cards, ${pct(r.creditCardMonthly / creditCardLimits, 1)} of the ${money(creditCardLimits)} limit`,
      -r.creditCardMonthly,
      { note: 'Assessed on the limit, not the balance — a card paid off in full every month costs you the same capacity as one that is maxed out' }
    ),
    personalLoanMonthly > 0 && step('less personal loan repayment', -personalLoanMonthly),
    carLoanMonthly > 0 && step('less car loan repayment', -carLoanMonthly),
    total('Left over each month', r.monthlySurplus),
    r.helpMonthly > 0 && note(
      `Your HELP repayment of about ${money(r.helpMonthly)} a month is already taken out inside the tax calculation above, so it is not deducted a second time here. Lenders assess the repayment, not the balance — a small debt and a large one cost roughly the same capacity at the same income.`
    ),
  ], {
    note: 'Closing or reducing a card limit you never draw on is usually the fastest way to lift this number, and it takes days rather than a pay rise.',
  });

  // ─── Serviceability ────────────────────────────────────────────────────────
  const serviceability = section('What that surplus borrows', [
    step('Your rate', `${trim(interestRate)}% p.a.`),
    step('plus the APRA serviceability buffer', `${trim(buffer)}%`, {
      note: 'Lenders must confirm you could still repay if rates rose by this much',
    }),
    step('Assessment rate', `${trim(r.bufferedRate)}% p.a.`),
    step('Repayment on $1,000 borrowed, at that rate', factor * 1000, {
      note: io > 0
        ? `Principal and interest over the ${trim(termYears - io)} years left after the interest-only period`
        : `Principal and interest over ${trim(termYears)} years`,
    }),
    step('Your monthly surplus', r.monthlySurplus),
    total('Maximum loan on serviceability', r.maxByServiceability, {
      note: `Surplus divided by the repayment per dollar at ${trim(r.bufferedRate)}%`,
    }),
  ], {
    note: io > 0
      ? 'An interest-only loan is not assessed on the interest-only repayment. The lender assesses the higher principal and interest repayment that starts once that period ends, over a shorter remaining term — which is why interest-only reduces, rather than increases, how much you can borrow.'
      : 'The buffer is the reason a lender lends less than your current repayment capacity suggests. Every extra percentage point of buffer costs roughly 8 to 10 percent of borrowing power.',
  });

  // ─── Deposit ───────────────────────────────────────────────────────────────
  const depositSection = deposit > 0 && r.maxByDeposit !== null ? section('What your deposit reaches', [
    step('Deposit', deposit),
    step('Maximum loan to value ratio', pct(r.maxLvr, 0), {
      note: 'The practical ceiling with LMI. 80% is the level that avoids it.',
    }),
    step('Property price this deposit reaches', r.maxByDeposit + deposit),
    step('less the deposit', -deposit),
    total('Maximum loan on the deposit', r.maxByDeposit),
    r.maxPropertyPriceNoLmi && step('Price reachable with no LMI', r.maxPropertyPriceNoLmi, {
      muted: true,
      note: 'The same deposit at 80% LVR',
    }),
  ], {
    note: 'For most first home buyers this is the constraint that actually binds, not income. Saving another $10,000 of deposit lifts the ceiling by far more than $10,000, because the deposit is leveraged.',
  }) : null;

  // ─── Which constraint binds ────────────────────────────────────────────────
  const outcome = section('Which limit binds', [
    step('Maximum on serviceability', r.maxByServiceability, { muted: true }),
    step('Maximum on your deposit', r.maxByDeposit === null ? 'No deposit entered' : r.maxByDeposit, { muted: true }),
    total('Your borrowing power', r.maxBorrowing, { note: 'The lower of the two' }),
    step('Property price', r.maxPropertyPrice),
    step('Repayment at your actual rate', r.monthlyRepayment, {
      note: `${trim(interestRate)}% p.a. over ${trim(termYears)} years, not the assessment rate`,
    }),
    step('Debt to income ratio', trim(r.dti), {
      muted: true,
      note: 'Total debt divided by gross income. HELP is excluded from this ratio but still counts in serviceability.',
    }),
  ], {
    note: r.bindingConstraint === 'deposit'
      ? 'Your deposit binds here, not your income. More deposit lifts this figure before a pay rise would.'
      : 'Your income binds here, not your deposit. A larger deposit raises the price you can pay but not the loan you can service.',
  });

  return workings([income, expenses, surplus, serviceability, depositSection, outcome], {
    source: 'APRA APG 223 serviceability guidance',
  });
}
