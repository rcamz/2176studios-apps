// Regression test vectors — superannuation.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.7 (context: §2.2, §4.2).

export const maxContributionBase = [
  {
    input: { concessionalCap: 32500, sgChargePercentage: 0.12 },
    expected: 270830,
    source: 'calc',
    trap: true,
    note:
      '$32,500 cap ÷ 12% charge → $270,830 annual (rounded down to nearest $10). ' +
      'Max contribution base must be annual, not quarterly, from 1 July 2026. ' +
      'A quarterly implementation at $270,830 ÷ 4 is wrong in both structure and amount.',
  },
];

export const division296 = [
  {
    input: {
      realisedEarnings: 840000,
      proportionAbove3m: 0.7674,
      proportionAbove10m: 0.2248,
    },
    expected: 115581,
    source: 'calc',
    note:
      '$840,000 realised earnings; 76.74% above $3m; 22.48% above $10m → $115,581 — see §4.2, flag only. ' +
      '§4.2 states the calculation as (15% × 76.74% × $840,000) + (10% × 22.48% × $840,000). ' +
      'TODO: that expression evaluates to $115,575.60, not the $115,581 the audit states in both §4.2 ' +
      'and §8.7. Reconcile with ATO guidance before asserting on this value. ' +
      'Decision recorded (§7.4): flag only, do not compute.',
  },
];

export default {
  maxContributionBase,
  division296,
};
