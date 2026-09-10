// Regression test vectors — health.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.13 (context: §1.12, §2.12, §3.11, §3.12).
//
// Note: the "Hard blocks" subsection of §8.13 and the trailing traps carry a
// [trap] marker but no source marker; 'published' is used for those.

export const mifflinStJeor = [
  {
    input: { sex: 'Male', age: 30, weightKg: 80, heightCm: 180 },
    expected: 1780,
    source: 'calc',
    note: 'Male, 30, 80 kg, 180 cm → 1,780 kcal.',
  },
  {
    input: { sex: 'Female', age: 30, weightKg: 65, heightCm: 165 },
    expected: 1370.25,
    source: 'calc',
    note: 'Female, 30, 65 kg, 165 cm → 1,370.25 kcal.',
  },
];

export const deficitAndRate = [
  {
    input: { rateKgPerWeek: 0.5 },
    expected: 550,
    source: 'calc',
    note: 'Deficit for rate: 0.5 kg/week → 550 kcal/day (0.5 × 7,700 ÷ 7).',
  },
  {
    input: { bodyweightKg: 80, ratePercentOfBodyweightPerWeek: 1.0 },
    expected: 0.8,
    source: 'calc',
    note: 'Safe rate ceiling: 80 kg person, 1.0% → 0.8 kg/week.',
  },
];

// §8.13 "Hard blocks [trap]"
// "A warning displayed *beside* the number does not satisfy this.
//  The number must not appear."
const HARD_BLOCK_NOTE =
  'A warning displayed beside the number does not satisfy this. The number must not appear.';

export const hardBlocks = [
  {
    input: { sex: 'Female', tdee: 1600, requestedRatePercentPerWeek: 1.0, computedTargetKcal: 1050 },
    expected: 'Refuse to display the target.',
    source: 'published',
    trap: true,
    note:
      'Female, TDEE 1,600, requested 1.0%/week deficit → target ~1,050 kcal. ' +
      'Refuse to display the target. Below the 1,200 floor. ' +
      HARD_BLOCK_NOTE,
  },
  {
    input: { sex: 'Male', computedTargetKcal: 1400 },
    expected: 'Refuse to display.',
    source: 'published',
    trap: true,
    note:
      'Male, target computes to 1,400 kcal. Refuse to display. Below the 1,500 floor. ' + HARD_BLOCK_NOTE,
  },
  {
    input: { requestedRatePercentOfBodyweightPerWeek: 1.5 },
    expected: 'Refuse.',
    source: 'published',
    trap: true,
    note: 'Requested rate 1.5% of bodyweight/week. Refuse. Above the 1.1% safe band. ' + HARD_BLOCK_NOTE,
  },
];

export const proteinScaling = [
  {
    input: { bodyweightKg: 120, bodyFatPercent: 35, gramsPerKg: 2.0 },
    expected: { scaledToTotalBodyweight: 240, scaledToLeanMass: 156, leanMassKg: 78 },
    source: 'published',
    trap: true,
    note:
      'Protein for a 120 kg person at 35% body fat: scaling 2.0 g/kg to total bodyweight gives 240 g; ' +
      'scaling to lean mass (78 kg) gives 156 g. Confirm which denominator the code uses and that it ' +
      'matches the cited source.',
  },
];

export const bmrProjection = [
  {
    input: { projection: 'multi-year weight projection' },
    expected: 'declining BMR — roughly 100–150 kcal/day lower per 10 kg lost',
    source: 'published',
    trap: true,
    note:
      'A multi-year weight projection must show a declining BMR — roughly 100–150 kcal/day lower per ' +
      '10 kg lost. A static-BMR projection overstates the rate of loss.',
  },
];

export default {
  mifflinStJeor,
  deficitAndRate,
  hardBlocks,
  proteinScaling,
  bmrProjection,
};
