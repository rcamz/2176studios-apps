// Regression test vectors — capital gains tax.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.10 (context: §1.7, §2.3, §2.7).
//
// Note: the "Loss ordering" and "Six-year rule" subsections of §8.10 carry a
// [trap] marker but no source marker; 'published' is used for those.

// §8.10 "The 12-month test [ATO] [trap]"
const TWELVE_MONTH_NOTE =
  'Both the acquisition day and the CGT event day are excluded. ' +
  '`sale − purchase >= 365` fails the first case.';

export const twelveMonthTest = [
  {
    input: { acquired: '2025-06-20', cgtEvent: '2026-06-20' },
    expected: { discount: false, days: 364 },
    source: 'ATO',
    trap: true,
    note: 'NO — 364 days. ' + TWELVE_MONTH_NOTE,
  },
  {
    input: { acquired: '2025-06-19', cgtEvent: '2026-06-20' },
    expected: { discount: true, days: 365 },
    source: 'ATO',
    trap: true,
    note: 'YES — 365 days. ' + TWELVE_MONTH_NOTE,
  },
];

// §8.10 "Main residence partial exemption [ATO]"
export const mainResidencePartialExemption = [
  {
    input: { gain: 320000, nonMainResidenceDays: 6940, ownershipDays: 9133 },
    expected: { assessable: 243162, netCapitalGain: 121581 },
    source: 'ATO',
    note:
      '$320,000 gain; 6,940 non-main-residence days; 9,133 ownership days → ' +
      'Assessable $243,162, then 50% discount → net capital gain $121,581.',
  },
];

// §8.10 "Loss ordering [trap]"
export const lossOrdering = [
  {
    input: { gain: 100000, heldMoreThan12Months: true, carriedForwardCapitalLoss: 40000 },
    expected: 30000,
    source: 'published',
    trap: true,
    note:
      'Correct: ($100,000 − $40,000) × 50% = $30,000 net capital gain. ' +
      'Wrong: ($100,000 × 50%) − $40,000 = $10,000. ' +
      'A $20,000 error on a common scenario.',
  },
];

// §8.10 "Six-year rule [trap]"
export const sixYearRule = [
  {
    input: {
      rentalPeriods: ['5 years', '5 years'],
      ownerLivedInPropertyBetweenPeriods: true,
      otherMainResidenceNominated: false,
    },
    expected: 'fully exempt',
    source: 'published',
    trap: true,
    note:
      'Two separate rental periods of five years each, with the owner living in the property between them, ' +
      'no other main residence nominated → fully exempt. ' +
      'A single cumulative counter would treat year six onward as assessable.',
  },
];

export default {
  twelveMonthTest,
  mainResidencePartialExemption,
  lossOrdering,
  sixYearRule,
};
