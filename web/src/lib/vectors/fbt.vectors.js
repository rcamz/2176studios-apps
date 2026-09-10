// Regression test vectors — FBT and novated leasing.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.11 (context: §1.8, §2.8, §3.6, §3.8).
//
// Note: §8.11 rows marked only [trap] carry no source marker; 'published' is
// used for those, except the statutory-rate lookup which comes from the ATO
// pages at S21/S22.

export const employeeContributionMethod = [
  {
    input: { taxableValue: 9000, postTaxContribution: 9000 },
    expected: 0,
    source: 'published',
    trap: true,
    note: 'Taxable value $9,000, post-tax contribution $9,000 → FBT $0.',
  },
];

export const centsPerKm = [
  {
    input: { eligibleKm: 6200 },
    expected: 4550,
    source: 'published',
    trap: true,
    note: '6,200 eligible km → $4,550 (capped at 5,000 km).',
  },
];

export const residualValues = [
  {
    input: { baseVehiclePrice: 60000, termYears: 5 },
    expected: { excludingGst: 16878, includingGst: 18565.8 },
    source: 'calc',
    note: 'Residual, 5 years: $60,000 base vehicle price → $16,878 excluding GST, $18,565.80 including.',
  },
];

// §8.11 "Statutory formula rate lookup [trap]"
// "The PHEV row is the one most likely to be wrong in the existing code."
const STAT_RATE_NOTE = 'The PHEV row is the one most likely to be wrong in the existing code.';

export const statutoryRateLookup = [
  {
    input: { vehicle: 'BEV', price: 70000, underLctFuelEfficientThreshold: true, date: 'FY2026-27' },
    expected: 0,
    source: 'ATO',
    trap: true,
    note: 'BEV, $70,000, under LCT FE threshold, FY2026-27 → 0%. ' + STAT_RATE_NOTE,
  },
  {
    input: { vehicle: 'PHEV', price: 70000, newLease: true, date: 'FY2026-27' },
    expected: 0.2,
    source: 'ATO',
    trap: true,
    note: 'PHEV, $70,000, new lease, FY2026-27 → 20%. ' + STAT_RATE_NOTE,
  },
  {
    input: {
      vehicle: 'PHEV',
      bindingCommitmentPre: '2025-04-01',
      commitmentUnchanged: true,
      date: 'FY2026-27',
    },
    expected: 0,
    source: 'ATO',
    trap: true,
    note: 'PHEV, binding commitment pre-1 Apr 2025, unchanged, FY2026-27 → 0%. ' + STAT_RATE_NOTE,
  },
  {
    input: { vehicle: 'BEV', price: 70000, date: '2027-05-01' },
    expected: 0,
    source: 'ATO',
    trap: true,
    note: 'BEV, $70,000, 1 May 2027 → 0%. ' + STAT_RATE_NOTE,
  },
  {
    input: { vehicle: 'BEV', price: 85000, date: '2027-05-01' },
    expected: 0.15,
    source: 'ATO',
    trap: true,
    note: 'BEV, $85,000, 1 May 2027 → 15%. ' + STAT_RATE_NOTE,
  },
  {
    input: { vehicle: 'BEV', price: 70000, date: '2029-05-01' },
    expected: 0.15,
    source: 'ATO',
    trap: true,
    note: 'BEV, $70,000, 1 May 2029 → 15%. ' + STAT_RATE_NOTE,
  },
  {
    input: { vehicle: 'Petrol car', date: 'any' },
    expected: 0.2,
    source: 'ATO',
    trap: true,
    note: 'Petrol car, any date → 20%. ' + STAT_RATE_NOTE,
  },
];

export const reportableFringeBenefits = [
  {
    input: { vehicle: 'BEV', fbtExempt: true },
    expected: {
      reportableFringeBenefitsAmount: 'must still be produced',
      flowsIntoMlsIncome: true,
      flowsIntoHelpRepaymentIncome: true,
    },
    source: 'published',
    trap: true,
    note:
      'An FBT-exempt EV must still produce a reportable fringe benefits amount, and that RFBA must flow ' +
      'into MLS income and HELP repayment income.',
  },
];

export default {
  employeeContributionMethod,
  centsPerKm,
  residualValues,
  statutoryRateLookup,
  reportableFringeBenefits,
};
