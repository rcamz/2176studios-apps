// Regression test vectors — First Home Super Saver Scheme.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.8 [ATO] (context: §2.6, §3.7).

export const releasableAmount = [
  {
    input: { salarySacrificed: 25000, years: 1 },
    expected: 12750,
    source: 'ATO',
    trap: true,
    note:
      '$25,000 salary sacrificed in one year → $12,750 (ATO example). ' +
      'The first case tests ordering: the $15,000 annual cap applies before the 85% haircut. ' +
      'Applying 85% first gives $21,250 → capped at $15,000 — wrong by $2,250.',
  },
  {
    input: { salarySacrificed: 5000, personalContributions: 3000, deductionClaimed: false },
    expected: 7250,
    source: 'published',
    trap: true,
    note:
      '$5,000 salary sacrifice + $3,000 personal (no deduction claimed) → $7,250 (published example). ' +
      'The second case tests that non-concessional contributions release at 100% while concessional ' +
      'release at 85%.',
  },
];

export default {
  releasableAmount,
};
