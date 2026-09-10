// Resident, foreign resident and working holiday maker scales.
//
// The second bracket steps down 16% → 15% → 14% across FY2025-26, FY2026-27 and
// FY2027-28 under the Cost of Living—Tax Cuts Act. Thresholds do not move; only
// the rate. Keeping all three years live is what backs the year selector.
//
// Cumulative `base` is tax payable at the bracket's lower bound.

const RESIDENT_16 = [
  { from: 0,      rate: 0.00, base: 0 },
  { from: 18200,  rate: 0.16, base: 0 },
  { from: 45000,  rate: 0.30, base: 4288 },
  { from: 135000, rate: 0.37, base: 31288 },
  { from: 190000, rate: 0.45, base: 51638 },
];

const RESIDENT_15 = [
  { from: 0,      rate: 0.00, base: 0 },
  { from: 18200,  rate: 0.15, base: 0 },
  { from: 45000,  rate: 0.30, base: 4020 },
  { from: 135000, rate: 0.37, base: 31020 },
  { from: 190000, rate: 0.45, base: 51370 },
];

const RESIDENT_14 = [
  { from: 0,      rate: 0.00, base: 0 },
  { from: 18200,  rate: 0.14, base: 0 },
  { from: 45000,  rate: 0.30, base: 3752 },
  { from: 135000, rate: 0.37, base: 30752 },
  { from: 190000, rate: 0.45, base: 51102 },
];

// No tax-free threshold, no Medicare levy, no LITO.
const FOREIGN = [
  { from: 0,      rate: 0.30, base: 0 },
  { from: 135000, rate: 0.37, base: 40500 },
  { from: 190000, rate: 0.45, base: 60850 },
];

// 15% to $45,000, then the resident scale above it. Registered employers only —
// unregistered employers withhold at foreign resident rates.
const HOLIDAY = [
  { from: 0,      rate: 0.15, base: 0 },
  { from: 45000,  rate: 0.30, base: 6750 },
  { from: 135000, rate: 0.37, base: 33750 },
  { from: 190000, rate: 0.45, base: 54100 },
];

// Companies are not eligible for any CGT discount, so the whole gain is taxed
// at the applicable company rate.
const COMPANY_RATES = {
  standard: 0.30,
  baseRateEntity: 0.25, // aggregated turnover under $50m with sufficient passive income limits
};

// Unchanged since 2020-21. Non-refundable, and PAYG withholding ignores it —
// never apply LITO to a per-pay figure.
const LITO = {
  max: 700,
  taper1From: 37500, taper1Rate: 0.05,
  taper2From: 45000, taper2Rate: 0.015, taper2Base: 325,
  cutOut: 66667,
};

export const incomeTax = [
  {
    __domain: 'incomeTax',
    effective_from: '2024-07-01',
    effective_to: '2026-06-30',
    confidence: 'P',
    source: 'S1',
    resident: RESIDENT_16,
    foreign: FOREIGN,
    holiday: HOLIDAY,
    lito: LITO,
    company: COMPANY_RATES,
    standardWorkDeduction: null,
  },
  {
    __domain: 'incomeTax',
    effective_from: '2026-07-01',
    effective_to: '2027-06-30',
    confidence: 'P',
    source: 'S1',
    resident: RESIDENT_15,
    foreign: FOREIGN,
    holiday: HOLIDAY,
    lito: LITO,
    company: COMPANY_RATES,
    // Tax Reform No. 1 Act 2026, Sch 4. Live from FY2026-27. The taxpayer picks
    // the higher of this or substantiated expenses, so it is a floor, never an
    // automatic addition.
    standardWorkDeduction: {
      amount: 1000,
      requiresWorkIncome: true,
      note: 'Standard $1,000 work-expense deduction — claimed instead of substantiated expenses, whichever is higher.',
    },
    workingAustraliansOffset: null,
  },
  {
    __domain: 'incomeTax',
    effective_from: '2027-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S1',
    resident: RESIDENT_14,
    foreign: FOREIGN,
    holiday: HOLIDAY,
    lito: LITO,
    company: COMPANY_RATES,
    standardWorkDeduction: {
      amount: 1000,
      requiresWorkIncome: true,
      note: 'Standard $1,000 work-expense deduction — claimed instead of substantiated expenses, whichever is higher.',
    },
    // Tax Reform No. 1 Act 2026, Sch 3. Non-refundable, alongside LITO. Capped at
    // the basic tax on net labour income alone.
    workingAustraliansOffset: {
      max: 250,
      basis: 'netLabourIncome',
      note: 'Working Australians Tax Offset — lesser of $250 and the basic tax on net labour income.',
    },
  },
];
