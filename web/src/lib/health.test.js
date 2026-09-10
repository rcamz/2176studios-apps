// Health regression tests.
//
// Drives the transcribed vectors in vectors/health.vectors.js (audit §8.13)
// plus cases for the three things the audit says a wrong implementation gets
// wrong quietly: the hard blocks, the declining-BMR projection, and the
// protein denominator.

import { describe, it, expect } from 'vitest';
import {
  calcHealth,
  bmrMifflinStJeor,
  dailyEnergyForRate,
  safeRateCeiling,
  leanBodyMass,
  proteinTargets,
  projectWeight,
  bmiFor,
  bmiCategoryFor,
  asianActionPointFor,
  adaptiveDropPerKg,
  minIntakeFor,
  ACTIVITY_LEVELS,
} from './health.js';
import { ratesFor } from './rates/index.js';
import vectors from './vectors/health.vectors.js';

const RATES = ratesFor('2026-09-10');
const H = RATES.health;

const round2 = (n) => Math.round(n * 100) / 100;

// ─── §8.13 transcribed vectors ───────────────────────────────────────────────

describe('§8.13 Mifflin-St Jeor [calc]', () => {
  it.each(vectors.mifflinStJeor)('$note', ({ input, expected }) => {
    const got = bmrMifflinStJeor(input.weightKg, input.heightCm, input.age, input.sex, RATES);
    expect(got).toBeCloseTo(expected, 6);
  });

  it('uses the rounded coefficient form consistently', () => {
    expect(H.bmrCoefficients).toEqual({
      weight: 10, height: 6.25, age: 5, maleConstant: 5, femaleConstant: -161,
    });
  });
});

describe('§8.13 deficit and rate [calc]', () => {
  it('0.5 kg/week → 550 kcal/day', () => {
    const v = vectors.deficitAndRate[0];
    expect(dailyEnergyForRate(v.input.rateKgPerWeek, RATES)).toBeCloseTo(v.expected, 9);
  });

  it('80 kg person at 1.0% → 0.8 kg/week', () => {
    const v = vectors.deficitAndRate[1];
    const got = safeRateCeiling(v.input.bodyweightKg, v.input.ratePercentOfBodyweightPerWeek / 100);
    expect(round2(got)).toBe(v.expected);
  });

  it('the hard-block ceiling is 1.1% of bodyweight per week', () => {
    expect(H.maxSafeLossRate).toBe(0.011);
  });
});

// ─── Hard blocks [trap] ──────────────────────────────────────────────────────
//
// "A warning displayed beside the number does not satisfy this. The number
// must not appear." Every goal field must come back null.

function expectNoNumberLeaks(r) {
  expect(r.goalBlocked).toBe(true);
  expect(r.goalCalories).toBeNull();
  expect(r.calorieDeficitOrSurplus).toBeNull();
  expect(r.weeklyWeightChange).toBeNull();
  expect(r.projectedWeeks).toBeNull();
  expect(r.goalMacros).toBeNull();
  expect(r.goalProtein).toBeNull();
  expect(r.projection).toBeNull();
  expect(r.chartData).toEqual([]);
  expect(r.blockReasons.length).toBeGreaterThan(0);
  for (const reason of r.blockReasons) {
    expect(typeof reason.title).toBe('string');
    expect(reason.message.length).toBeGreaterThan(20);
  }
}

describe('§8.13 hard blocks [trap]', () => {
  // Female, TDEE ~1,600, requested 1.0%/week → target well under the floor.
  const femaleBelowFloor = {
    sex: 'female', age: 30, heightCm: 165, weightKg: 60,
    activityLevel: 'sedentary', goalType: 'lose', goalWeightKg: 54, goalWeeks: 10,
    date: '2026-09-10',
  };

  it('female at ~1,600 kcal TDEE asking 1.0%/week: refuses to display the target', () => {
    const r = calcHealth(femaleBelowFloor);
    expect(r.maintenanceCalories).toBe(1584); // ≈ the vector's TDEE 1,600
    expect(r.requested.ratePercentOfBodyweight).toBe(1); // inside the 1.1% band
    expect(r.requested.requestedCalories).toBeLessThan(1200);
    expect(r.blockReasons.map((b) => b.code)).toContain('BELOW_MINIMUM_INTAKE');
    expectNoNumberLeaks(r);
  });

  it('male whose target computes to exactly 1,400 kcal: refuses to display', () => {
    const r = calcHealth({
      sex: 'male', age: 30, heightCm: 175, weightKg: 80,
      activityLevel: 'sedentary', goalType: 'lose', goalWeightKg: 73.6455, goalWeeks: 10,
      date: '2026-09-10',
    });
    expect(r.requested.requestedCalories).toBe(1400);
    expect(r.requested.ratePercentOfBodyweight).toBeLessThan(1.1);
    expect(r.blockReasons.map((b) => b.code)).toContain('BELOW_MINIMUM_INTAKE');
    expectNoNumberLeaks(r);
  });

  it('a requested rate of 1.5% of bodyweight/week is refused', () => {
    const r = calcHealth({
      sex: 'male', age: 30, heightCm: 180, weightKg: 80,
      activityLevel: 'moderate', goalType: 'lose', goalWeightKg: 68, goalWeeks: 10,
      date: '2026-09-10',
    });
    expect(r.requested.ratePercentOfBodyweight).toBe(1.5);
    expect(r.blockReasons.map((b) => b.code)).toContain('RATE_ABOVE_SAFE_BAND');
    expectNoNumberLeaks(r);
  });

  it('1.1% exactly is allowed; a hair over is blocked', () => {
    const at = calcHealth({
      sex: 'male', age: 30, heightCm: 180, weightKg: 100,
      activityLevel: 'moderate', goalType: 'lose', goalWeightKg: 89, goalWeeks: 10,
      date: '2026-09-10',
    });
    expect(at.requested.ratePercentOfBodyweight).toBe(1.1);
    expect(at.goalBlocked).toBe(false);
    expect(at.goalCalories).toBeGreaterThan(0);

    const over = calcHealth({
      sex: 'male', age: 30, heightCm: 180, weightKg: 100,
      activityLevel: 'moderate', goalType: 'lose', goalWeightKg: 88.5, goalWeeks: 10,
      date: '2026-09-10',
    });
    expect(over.goalBlocked).toBe(true);
    expect(over.blockReasons[0].code).toBe('RATE_ABOVE_SAFE_BAND');
  });

  it('applies the sex-specific floor, not a single number', () => {
    expect(minIntakeFor('female', RATES)).toBe(1200);
    expect(minIntakeFor('male', RATES)).toBe(1500);

    // Identical body, identical plan — 1,350 kcal passes for a woman, not a man.
    const plan = {
      age: 30, heightCm: 170, weightKg: 70, activityLevel: 'sedentary',
      goalType: 'lose', goalWeeks: 12, date: '2026-09-10',
    };
    const female = calcHealth({ ...plan, sex: 'female', goalWeightKg: 64.5455 });
    const male = calcHealth({ ...plan, sex: 'male', goalWeightKg: 64.5455 });
    expect(female.requested.requestedCalories).toBeGreaterThanOrEqual(1200);
    expect(female.requested.requestedCalories).toBeLessThan(1500);
    expect(female.goalBlocked).toBe(false);
    expect(male.goalBlocked).toBe(true);
  });

  it('blocks the whole calculator under 18 rather than footnoting it', () => {
    const r = calcHealth({ age: 16, sex: 'female', weightKg: 55, heightCm: 165, date: '2026-09-10' });
    expect(r.ageBlocked).toBe(true);
    expect(r.bmr).toBeNull();
    expect(r.maintenanceCalories).toBeNull();
    expect(r.bmi).toBeNull();
    expect(r.ageBlockMessage).toMatch(/not valid under 18/i);
  });

  it('warns outside the 19–78 validation range without blocking', () => {
    const r = calcHealth({ age: 82, sex: 'male', weightKg: 75, heightCm: 175, date: '2026-09-10' });
    expect(r.ageBlocked).toBe(false);
    expect(r.bmr).toBeGreaterThan(0);
    expect(r.warnings.map((w) => w.key)).toContain('age-range');
  });
});

// ─── Protein denominators [trap] ─────────────────────────────────────────────

describe('§8.13 protein scaling [trap]', () => {
  const v = vectors.proteinScaling[0];

  it('120 kg at 35% body fat → 78 kg lean mass', () => {
    expect(leanBodyMass(v.input.bodyweightKg, v.input.bodyFatPercent)).toBe(v.expected.leanMassKg);
  });

  it('2.0 g/kg is 240 g on bodyweight but 156 g on lean mass', () => {
    expect(v.input.gramsPerKg * v.input.bodyweightKg).toBe(v.expected.scaledToTotalBodyweight);
    expect(v.input.gramsPerKg * v.expected.leanMassKg).toBe(v.expected.scaledToLeanMass);
  });

  it('scales to lean mass above 25% body fat — 156 g, not 240 g', () => {
    const p = proteinTargets({
      goalType: 'lose', weightKg: 120, goalWeightKg: 90, bodyFatPercent: 35, rates: RATES,
    });
    expect(p.basis).toBe('leanMass');
    expect(p.basisKg).toBe(78);
    expect(p.targetG).toBe(156);
    expect(p.targetG).not.toBe(240);
  });

  it('falls back to goal weight when losing without a body-fat reading', () => {
    const p = proteinTargets({ goalType: 'lose', weightKg: 120, goalWeightKg: 90, rates: RATES });
    expect(p.basis).toBe('goalWeight');
    expect(p.basisKg).toBe(90);
    expect(p.targetG).toBe(180); // 2.0 × 90, not 2.0 × 120
  });

  it('keeps Morton and Helms on their own denominators', () => {
    const p = proteinTargets({
      goalType: 'lose', weightKg: 120, goalWeightKg: 90, bodyFatPercent: 35, rates: RATES,
    });
    expect(p.morton.denominator).toBe('bodyweight');
    expect(p.morton.grams).toBe(Math.round(1.6 * 120));
    expect(p.helms.denominator).toBe('fat-free mass');
    expect(p.helms.gramsLow).toBe(Math.round(2.3 * 78));
    expect(p.helms.gramsHigh).toBe(Math.round(3.1 * 78));
    expect(p.morton.perKg).not.toBe(p.helms.perKgLow);
  });

  it('omits the Helms figure when fat-free mass is unknown', () => {
    const p = proteinTargets({ goalType: 'maintain', weightKg: 80, rates: RATES });
    expect(p.helms).toBeNull();
    expect(p.basis).toBe('bodyweight');
  });

  it('the whole-calculator result carries the lean-mass target through to macros', () => {
    const r = calcHealth({
      sex: 'male', age: 40, heightCm: 178, weightKg: 120, bodyFatPercent: 35,
      activityLevel: 'light', goalType: 'lose', goalWeightKg: 105, goalWeeks: 40,
      date: '2026-09-10',
    });
    expect(r.goalBlocked).toBe(false);
    expect(r.goalProtein.basis).toBe('leanMass');
    expect(r.goalMacros.proteinG).toBe(156);
    expect(r.leanMassKg).toBe(78);
    expect(r.fatMassKg).toBe(42);
  });
});

// ─── Declining BMR [trap] ────────────────────────────────────────────────────

describe('§8.13 declining-BMR projection [trap]', () => {
  const plan = {
    sex: 'male', age: 35, heightCm: 180, weightKg: 110,
    activityLevel: 'light', goalType: 'lose', goalWeightKg: 85, goalWeeks: 60,
    date: '2026-09-10',
  };

  it('BMR falls monotonically as weight comes off', () => {
    const r = calcHealth(plan);
    const bmrs = r.projection.weeks.map((w) => w.bmr);
    expect(bmrs.length).toBeGreaterThan(20);
    for (let i = 1; i < bmrs.length; i++) expect(bmrs[i]).toBeLessThanOrEqual(bmrs[i - 1]);
    expect(r.projection.bmrDrop).toBeGreaterThan(0);
  });

  it('the drop is inside the published 100–150 kcal/day per 10 kg band', () => {
    const r = calcHealth(plan);
    const weeks = r.projection.weeks;
    const kgLost = weeks[0].weightKg - weeks[weeks.length - 1].weightKg;
    const dropPer10kg = (r.projection.bmrDrop / kgLost) * 10;
    expect(kgLost).toBeGreaterThan(5);
    expect(dropPer10kg).toBeGreaterThanOrEqual(H.bmrDropPer10kgLost[0]);
    expect(dropPer10kg).toBeLessThanOrEqual(H.bmrDropPer10kgLost[1]);
    expect(adaptiveDropPerKg(RATES)).toBeCloseTo(2.5, 9);
  });

  it('the weekly rate of loss slows over time — a static projection would not', () => {
    const r = calcHealth(plan);
    const w = r.projection.weeks;
    const firstWeek = w[0].weightKg - w[1].weightKg;
    const lastWeek = w[w.length - 2].weightKg - w[w.length - 1].weightKg;
    expect(lastWeek).toBeLessThan(firstWeek);
  });

  it('takes longer than the naive static-TDEE estimate', () => {
    const r = calcHealth(plan);
    const staticWeeks = Math.ceil(
      (25 * H.kcalPerKg) / ((r.maintenanceCalories - r.goalCalories) * 7)
    );
    expect(r.projectedWeeks).toBeGreaterThan(staticWeeks);
  });

  it('reports a plateau instead of promising an unreachable goal', () => {
    const r = calcHealth({
      sex: 'female', age: 45, heightCm: 160, weightKg: 90,
      activityLevel: 'sedentary', goalType: 'lose', goalWeightKg: 50, goalWeeks: 200,
      date: '2026-09-10',
    });
    expect(r.goalBlocked).toBe(false);
    expect(r.projectedWeeks).toBeNull();
    expect(r.warnings.map((w) => w.key)).toContain('plateau');
    expect(r.projection.endWeightKg).toBeGreaterThan(50);
  });

  it('projectWeight is stable at maintenance intake', () => {
    const p = projectWeight({
      startWeightKg: 80, heightCm: 180, age: 30, sex: 'male',
      activityMultiplier: 1.55, intakeKcal: Math.round(1780 * 1.55),
      goalWeightKg: null, rates: RATES,
    });
    expect(Math.abs(p.endWeightKg - 80)).toBeLessThan(0.05);
    expect(p.plateaued).toBe(true);
  });
});

// ─── Headline / chart agreement, and the sign bug ────────────────────────────

describe('headline and chart cannot disagree', () => {
  it('the chart is generated from the same projection as the weekly rate', () => {
    const r = calcHealth({
      sex: 'male', age: 30, heightCm: 178, weightKg: 95,
      activityLevel: 'moderate', goalType: 'lose', goalWeightKg: 85, goalWeeks: 14,
      date: '2026-09-10',
    });
    expect(r.goalBlocked).toBe(false);
    const chartFirstWeek = r.chartData[1]['Weight (kg)'] - r.chartData[0]['Weight (kg)'];
    expect(Math.abs(chartFirstWeek - r.weeklyWeightChange)).toBeLessThanOrEqual(0.06);
    expect(r.chartData.length).toBe(r.projection.weeks.length);
    expect(r.chartData[r.chartData.length - 1]['Weight (kg)']).toBeCloseTo(r.projection.endWeightKg, 1);
  });

  it('a plan close to the floor still agrees with its chart', () => {
    // The old code plotted the PRE-floor deficit against a POST-floor headline.
    // Nothing is clamped any more, so there is only one rate in play.
    const r = calcHealth({
      sex: 'female', age: 30, heightCm: 168, weightKg: 75,
      activityLevel: 'sedentary', goalType: 'lose', goalWeightKg: 68, goalWeeks: 12,
      date: '2026-09-10',
    });
    if (!r.goalBlocked) {
      expect(r.goalCalories).toBeGreaterThanOrEqual(1200);
      const chartFirstWeek = r.chartData[1]['Weight (kg)'] - r.chartData[0]['Weight (kg)'];
      expect(Math.abs(chartFirstWeek - r.weeklyWeightChange)).toBeLessThanOrEqual(0.06);
    }
  });

  it('weight GAIN reports a positive weekly change', () => {
    const r = calcHealth({
      sex: 'male', age: 28, heightCm: 175, weightKg: 70,
      activityLevel: 'moderate', goalType: 'gain', goalWeightKg: 75, goalWeeks: 20,
      date: '2026-09-10',
    });
    expect(r.goalBlocked).toBe(false);
    expect(r.weeklyWeightChange).toBeGreaterThan(0);
    expect(r.calorieDeficitOrSurplus).toBeGreaterThan(0);
    expect(r.goalCalories).toBeGreaterThan(r.maintenanceCalories);
    expect(r.chartData[1]['Weight (kg)']).toBeGreaterThan(r.chartData[0]['Weight (kg)']);
  });

  it('weight LOSS reports a negative weekly change', () => {
    const r = calcHealth({
      sex: 'male', age: 28, heightCm: 175, weightKg: 90,
      activityLevel: 'moderate', goalType: 'lose', goalWeightKg: 85, goalWeeks: 20,
      date: '2026-09-10',
    });
    expect(r.weeklyWeightChange).toBeLessThan(0);
    expect(r.calorieDeficitOrSurplus).toBeLessThan(0);
  });

  it('recomputes projectedWeeks for gain rather than echoing goalWeeks', () => {
    const r = calcHealth({
      sex: 'male', age: 28, heightCm: 175, weightKg: 70,
      activityLevel: 'moderate', goalType: 'gain', goalWeightKg: 75, goalWeeks: 20,
      date: '2026-09-10',
    });
    // BMR rises with weight, so the surplus shrinks and the goal arrives late.
    expect(r.projectedWeeks).toBeGreaterThan(20);
    expect(r.warnings.map((w) => w.key)).toContain('slower-than-requested');
  });

  it('flags a mismatched goal direction instead of computing nonsense', () => {
    const r = calcHealth({
      sex: 'male', age: 30, heightCm: 175, weightKg: 80,
      goalType: 'lose', goalWeightKg: 90, goalWeeks: 12, date: '2026-09-10',
    });
    expect(r.goalCalories).toBeNull();
    expect(r.warnings.map((w) => w.key)).toContain('goal-direction');
  });
});

// ─── BMI ─────────────────────────────────────────────────────────────────────

describe('BMI', () => {
  it.each([
    [55, 175, 'Underweight'],
    [70, 175, 'Healthy weight'],
    [85, 175, 'Overweight'],
    [100, 175, 'Obese'],
  ])('%i kg at %i cm → %s', (kg, cm, label) => {
    expect(bmiCategoryFor(bmiFor(kg, cm), RATES)).toBe(label);
  });

  it('the WHO Asian view is optional and attributed, never the default', () => {
    expect(H.ethnicityAdjustedBmi.isAustralianDefault).toBe(false);
    expect(H.ethnicityAdjustedBmi.confidence).toBe('UNVERIFIED');

    const r = calcHealth({ sex: 'male', age: 30, heightCm: 175, weightKg: 75, date: '2026-09-10' });
    expect(r.bmiCategory).toBe('Healthy weight'); // standard classification stays the default
    expect(r.bmiAsian.attribution).toMatch(/WHO/);
    expect(r.bmiAsian.note).toMatch(/NOT confirmed/);
    expect(r.bmiAsian.note).toMatch(/action points/i);
  });

  it('reports action points crossed, not a redefined category', () => {
    const a = asianActionPointFor(28.0, RATES);
    expect(a.crossed).toEqual([23.0, 27.5]);
    expect(a.label).toMatch(/27\.5/);
    expect(a.competingObesityThreshold).toBe(25);
  });

  it('surfaces the BMI > 35 overestimation limit', () => {
    const r = calcHealth({ sex: 'male', age: 30, heightCm: 170, weightKg: 110, date: '2026-09-10' });
    expect(r.bmi).toBeGreaterThan(35);
    expect(r.warnings.map((w) => w.key)).toContain('bmi-overestimate');
  });
});

// ─── Methodology surface ─────────────────────────────────────────────────────

describe('methodology notes', () => {
  it('states the Caucasian-only validation and the conventional multipliers', () => {
    const r = calcHealth({ date: '2026-09-10' });
    const text = r.notes.map((n) => n.text).join(' ');
    expect(text).toMatch(/never validated outside Caucasian populations/);
    expect(text).toMatch(/not the DRI Physical Activity Level/);
    expect(text).toMatch(/7,700 kcal\/kg/);
  });

  it('offers five activity levels including a very high band', () => {
    expect(ACTIVITY_LEVELS.length).toBe(5);
    expect(ACTIVITY_LEVELS[ACTIVITY_LEVELS.length - 1].multiplier).toBe(1.9);
    for (const a of ACTIVITY_LEVELS) expect(a.examples.length).toBeGreaterThan(10);
  });

  it('maintenance mode returns macros but no goal fields', () => {
    const r = calcHealth({ goalType: 'maintain', date: '2026-09-10' });
    expect(r.maintenanceCalories).toBeGreaterThan(0);
    expect(r.maintenanceMacros.proteinG).toBeGreaterThan(0);
    expect(r.goalBlocked).toBe(false);
    expect(r.goalCalories).toBeNull();
    expect(r.chartData).toEqual([]);
  });
});
