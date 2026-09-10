// Regression test vectors — termination and redundancy.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.9 (context: §1.6, §2.4, §3.3, §3.4).
//
// Note: the NES and unused-LSL subsections of §8.9 carry a [trap] marker but no
// source marker. 'published' is used for those, per the file-level convention in
// stampDuty.vectors.js.

export const genuineRedundancyTaxFreeLimit = [
  {
    input: { completedYearsOfService: 5 },
    expected: 47603,
    source: 'calc',
    note: 'Genuine redundancy tax-free limit, 5 completed years.',
  },
  {
    input: { completedYearsOfService: 10 },
    expected: 81608,
    source: 'calc',
    note: 'Genuine redundancy tax-free limit, 10 completed years.',
  },
];

export const wholeOfIncomeCap = [
  {
    input: { cap: 180000, otherTaxablePayments: 25000 },
    expected: 155000,
    source: 'ATO',
    note: 'Whole-of-income cap: $180,000 cap, $25,000 other taxable payments → $155,000.',
  },
];

// §8.9 "NES redundancy weeks [trap]"
// "The 9.5 / 10.5 pair is the whole test. If the second returns 16 or more,
//  the scale has been implemented as monotonic."
const NES_NON_MONOTONIC_NOTE =
  'The 9.5 / 10.5 pair is the whole test. If the second returns 16 or more, the scale has been ' +
  'implemented as monotonic.';

export const nesRedundancyWeeks = [
  {
    input: { continuousService: '11 months', continuousServiceYears: 11 / 12 },
    expected: 0,
    source: 'published',
    trap: true,
    note: NES_NON_MONOTONIC_NOTE,
  },
  {
    input: { continuousService: '4.5 years', continuousServiceYears: 4.5 },
    expected: 8,
    source: 'published',
    trap: true,
    note: NES_NON_MONOTONIC_NOTE,
  },
  {
    input: { continuousService: '9.5 years', continuousServiceYears: 9.5 },
    expected: 16,
    source: 'published',
    trap: true,
    note: NES_NON_MONOTONIC_NOTE,
  },
  {
    input: { continuousService: '10.5 years', continuousServiceYears: 10.5 },
    expected: 12,
    source: 'published',
    trap: true,
    note: NES_NON_MONOTONIC_NOTE,
  },
  {
    input: { continuousService: '25 years', continuousServiceYears: 25 },
    expected: 12,
    source: 'published',
    trap: true,
    note: NES_NON_MONOTONIC_NOTE,
  },
  {
    input: { smallBusinessEmployer: true, employeeHeadcount: 14 },
    expected: 0,
    source: 'published',
    trap: true,
    note:
      'Small business employer (14 employees by headcount) → 0 weeks under the NES, ' +
      'but notice and unused leave are still owed.',
  },
];

// §8.9 "Unused long service leave [trap]"
// "Same LSL balance, post-17 August 1993 accrual only ...
//  If both return the same figure, the redundancy branch is missing."
const LSL_NOTE =
  'Same LSL balance, post-17 August 1993 accrual only. ' +
  'If both return the same figure, the redundancy branch is missing.';

export const unusedLongServiceLeave = [
  {
    input: { accrualPeriod: 'post-17 August 1993', reason: 'Resignation' },
    expected: 'marginal rates',
    source: 'published',
    trap: true,
    note: LSL_NOTE,
  },
  {
    input: { accrualPeriod: 'post-17 August 1993', reason: 'Genuine redundancy' },
    expected: '32% flat',
    source: 'published',
    trap: true,
    note: LSL_NOTE,
  },
];

export default {
  genuineRedundancyTaxFreeLimit,
  wholeOfIncomeCap,
  nesRedundancyWeeks,
  unusedLongServiceLeave,
};
