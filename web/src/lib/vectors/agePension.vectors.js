// Regression test vectors — Age Pension, from 20 September 2026.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.12 [calc, published anchors]
// (context: §1.11).

export const pensionRates = [
  {
    input: { status: 'Single', incomePerFortnight: 1000, assets: 'under threshold', from: '2026-09-20' },
    expected: 850.7,
    source: 'calc',
    note: 'Single, income $1,000/ft, assets under threshold → $850.70 fortnightly.',
  },
  {
    input: { status: 'Couple combined', incomePerFortnight: 2000, from: '2026-09-20' },
    expected: 1064.0,
    source: 'calc',
    note: 'Couple combined, income $2,000/ft → $1,064.00 fortnightly.',
  },
  {
    input: { status: 'Single', homeowner: true, assets: 500000, incomePerFortnight: 0, from: '2026-09-20' },
    expected: 736.7,
    source: 'calc',
    note: 'Single homeowner, $500,000 assets, no income → $736.70 fortnightly.',
  },
  {
    input: {
      status: 'Couple combined',
      homeowner: true,
      assets: 800000,
      incomePerFortnight: 0,
      from: '2026-09-20',
    },
    expected: 963.0,
    source: 'calc',
    note: 'Couple homeowner, $800,000 combined assets, no income → $963.00 fortnightly.',
  },
];

// §8.12 "Deeming [calc]"
export const deeming = [
  {
    input: { status: 'Single', financialAssets: 200000, date: 'to 2026-09-19' },
    expected: { perYear: 5164, perFortnight: 198.62 },
    source: 'calc',
    note: 'To 19 Sep 2026: $66,800 × 1.25% + $133,200 × 3.25% = $5,164/yr ≈ $198.62/ft.',
  },
  {
    input: { status: 'Single', financialAssets: 200000, date: 'from 2026-09-20' },
    expected: { perYear: 6164, perFortnight: 237.08 },
    source: 'calc',
    note: 'From 20 Sep 2026: $66,800 × 1.75% + $133,200 × 3.75% = $6,164/yr ≈ $237.08/ft.',
  },
];

export const indexationAndMethod = [
  {
    input: {
      incomeFreeAreas: { single: 226, couple: 396 },
      deemingThresholds: { single: 66800, couple: 110600 },
      date: '2026-09-20',
    },
    expected: 'unchanged on 20 September — only rates and the upper cut-offs change',
    source: 'calc',
    trap: true,
    note:
      'Free areas ($226 / $396) and deeming thresholds ($66,800 / $110,600) do not change on ' +
      '20 September — only rates and the upper cut-offs do. An implementation that indexes everything ' +
      'together on the same date is wrong.',
  },
  {
    input: { tests: ['income test', 'assets test'] },
    expected: 'the lower result is paid',
    source: 'calc',
    trap: true,
    note: 'Both tests must be calculated and the lower result paid.',
  },
];

export default {
  pensionRates,
  deeming,
  indexationAndMethod,
};
