// Health — BMR / TDEE, energy targets, weight projection, protein and BMI.
//
// Constants resolve from lib/rates/health.js against a date; nothing numeric is
// hardcoded here. Read FY2026-27-rates-audit-v2.md §1.12, §2.12, §2.13, §3.11,
// §3.12 and §7.4 before changing any of this.
//
// Three rules drive the shape of this module:
//
//  1. HARD BLOCK (§7.4, §3.12). If the arithmetic produces an intake below the
//     minimum (1,200 kcal women / 1,500 kcal men) or a requested rate of loss
//     above 1.1% of bodyweight per week, the number is NOT returned. Every goal
//     field comes back null so no caller can render it. A warning beside a
//     displayed figure does not satisfy the decision.
//
//  2. ONE PROJECTION. The headline weekly rate and the chart are read off the
//     same week-by-week simulation. They cannot disagree because there is only
//     one source of them.
//
//  3. DECLINING BMR (§2.12). Weight loss removes fat plus 20–25% lean mass, so
//     BMR falls roughly 100–150 kcal/day per 10 kg lost. A static-TDEE
//     projection systematically over-predicts loss.

import { ratesFor } from './rates/index.js';

const DEFAULT_RATES = ratesFor(new Date());

// Re-exported for the UI's activity cards. Conventional multipliers, NOT the
// DRI PAL taxonomy — see §3.11.
export const ACTIVITY_LEVELS = DEFAULT_RATES.health.activityLevels;

const round = (n, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

// ─── Primitives ──────────────────────────────────────────────────────────────

// Mifflin-St Jeor, rounded-coefficient form, on ACTUAL body weight (§3.11).
// Returned unrounded — callers round for display.
export function bmrMifflinStJeor(weightKg, heightCm, age, sex, rates = DEFAULT_RATES) {
  const c = rates.health.bmrCoefficients;
  const base = c.weight * weightKg + c.height * heightCm - c.age * age;
  return base + (normaliseSex(sex) === 'male' ? c.maleConstant : c.femaleConstant);
}

export function normaliseSex(sex) {
  return String(sex ?? '').toLowerCase().startsWith('f') ? 'female' : 'male';
}

export function activityFor(key, rates = DEFAULT_RATES) {
  const levels = rates.health.activityLevels;
  return levels.find((a) => a.key === key) ?? levels.find((a) => a.key === 'moderate') ?? levels[0];
}

export function minIntakeFor(sex, rates = DEFAULT_RATES) {
  return normaliseSex(sex) === 'male' ? rates.health.minIntakeMale : rates.health.minIntakeFemale;
}

// Daily energy change needed for a given weekly weight change.
// 0.5 kg/week → 550 kcal/day (§8.13).
export function dailyEnergyForRate(kgPerWeek, rates = DEFAULT_RATES) {
  return (kgPerWeek * rates.health.kcalPerKg) / 7;
}

// The most weight a person of this bodyweight may lose per week at a given
// fraction of bodyweight. 80 kg at 1.0% → 0.8 kg/week (§8.13).
export function safeRateCeiling(bodyweightKg, fractionPerWeek) {
  return bodyweightKg * fractionPerWeek;
}

export function leanBodyMass(weightKg, bodyFatPercent) {
  if (bodyFatPercent == null || !Number.isFinite(bodyFatPercent)) return null;
  return weightKg * (1 - bodyFatPercent / 100);
}

// ─── BMI ─────────────────────────────────────────────────────────────────────

export function bmiFor(weightKg, heightCm) {
  const m = heightCm / 100;
  if (!(m > 0)) return 0;
  return weightKg / (m * m);
}

export function bmiCategoryFor(bmi, rates = DEFAULT_RATES) {
  for (const c of rates.health.bmiCategories) {
    if (c.max === null || bmi < c.max) return c.label;
  }
  return rates.health.bmiCategories[rates.health.bmiCategories.length - 1].label;
}

// WHO 2004 Expert Consultation ACTION POINTS — 23.0 / 27.5 / 32.5 / 37.5.
// The consultation RETAINED the standard cut-offs as the international
// classification and declined to set population-specific ones (§2.13), so this
// is offered as an optional attributed view, never as the Australian default.
export function asianActionPointFor(bmi, rates = DEFAULT_RATES) {
  const e = rates.health.ethnicityAdjustedBmi;
  const points = e.actionPoints;
  const labels = [
    'Below the first action point (23.0)',
    'Increased risk — action point 23.0',
    'High risk — action point 27.5',
    'Very high risk — action point 32.5',
    'Highest risk — action point 37.5',
  ];
  let idx = 0;
  for (const p of points) if (bmi >= p) idx += 1;
  return {
    label: labels[idx],
    crossed: points.filter((p) => bmi >= p),
    attribution: e.attribution,
    confidence: e.confidence,
    isAustralianDefault: e.isAustralianDefault,
    competingObesityThreshold: e.competingObesityThreshold,
    note:
      'The 2004 WHO Expert Consultation retained the standard cut-offs as the international ' +
      'classification and identified these as public health action points instead. Two obesity ' +
      `thresholds are in active use — ${points[1]} (Expert Consultation) and ` +
      `${e.competingObesityThreshold} (WHO Western Pacific / South and South-East Asian consensus). ` +
      'Australian authority for ethnicity-adjusted thresholds is NOT confirmed.',
  };
}

// ─── Protein ─────────────────────────────────────────────────────────────────

// Scaling basis matters more than the coefficient (§3.12). Multiplying g/kg by
// total bodyweight regardless of composition is the classic bug: 2.0 g/kg on a
// 120 kg person at 35% body fat is 240 g against bodyweight but 156 g against
// lean mass (78 kg).
//
// Morton (1.6 g/kg) is per kg of BODYWEIGHT. Helms (2.3–3.1 g/kg) is per kg of
// FAT-FREE MASS. They are reported separately, each against its own
// denominator — never blended.
export function proteinTargets({
  goalType = 'maintain',
  weightKg,
  goalWeightKg = null,
  bodyFatPercent = null,
  rates = DEFAULT_RATES,
}) {
  const p = rates.health.protein;
  const lbm = leanBodyMass(weightKg, bodyFatPercent);
  const highBodyFat = lbm !== null && bodyFatPercent / 100 > p.scaleToLeanMassAboveBodyFat;

  let basis;
  let basisKg;
  if (highBodyFat) {
    basis = 'leanMass';
    basisKg = lbm;
  } else if (goalType === 'lose' && goalWeightKg != null && goalWeightKg > 0 && goalWeightKg < weightKg) {
    basis = 'goalWeight';
    basisKg = goalWeightKg;
  } else {
    basis = 'bodyweight';
    basisKg = weightKg;
  }

  // Bodyweight-denominated ranges (§3.12). Applied to the reference weight
  // above, which is the audit's own recommended treatment for higher body fat.
  const range =
    goalType === 'lose'
      ? p.fatLossPerKgBodyweight
      : [p.mortonPlateauPerKgBodyweight, 2.2];

  const [perKgLow, perKgHigh] = range;
  const gramsLow = Math.round(perKgLow * basisKg);
  const gramsHigh = Math.round(perKgHigh * basisKg);

  const basisLabel =
    basis === 'leanMass'
      ? `lean body mass (${round(basisKg, 1)} kg)`
      : basis === 'goalWeight'
        ? `goal weight (${round(basisKg, 1)} kg)`
        : `bodyweight (${round(basisKg, 1)} kg)`;

  return {
    basis,
    basisKg: round(basisKg, 1),
    basisLabel,
    perKgLow,
    perKgHigh,
    gramsLow,
    gramsHigh,
    // Midpoint drives the macro split.
    targetG: Math.round(((perKgLow + perKgHigh) / 2) * basisKg),
    // Reported against ITS OWN denominator.
    morton: {
      perKg: p.mortonPlateauPerKgBodyweight,
      grams: Math.round(p.mortonPlateauPerKgBodyweight * weightKg),
      denominator: 'bodyweight',
      note: `Morton 2018 — ${p.mortonPlateauPerKgBodyweight} g per kg of BODYWEIGHT (MPS returns plateau, trained adults).`,
    },
    helms:
      lbm === null
        ? null
        : {
            perKgLow: p.helmsPerKgFatFreeMass[0],
            perKgHigh: p.helmsPerKgFatFreeMass[1],
            gramsLow: Math.round(p.helmsPerKgFatFreeMass[0] * lbm),
            gramsHigh: Math.round(p.helmsPerKgFatFreeMass[1] * lbm),
            denominator: 'fat-free mass',
            note:
              `Helms 2014 — ${p.helmsPerKgFatFreeMass[0]}–${p.helmsPerKgFatFreeMass[1]} g per kg of ` +
              'FAT-FREE MASS, for natural physique athletes in a deficit. A different denominator ' +
              'from Morton: the two figures are not comparable.',
          },
    leanMassKg: lbm === null ? null : round(lbm, 1),
  };
}

function macroSplit(calories, proteinG) {
  const proteinCal = proteinG * 4;
  const fatCal = calories * 0.27;
  const fatG = Math.round(fatCal / 9);
  const carbCal = Math.max(0, calories - proteinCal - fatCal);
  return {
    proteinG,
    fatG,
    carbG: Math.round(carbCal / 4),
    proteinCal: Math.round(proteinCal),
    fatCal: Math.round(fatCal),
    carbCal: Math.round(carbCal),
  };
}

// ─── Declining-BMR projection ────────────────────────────────────────────────

// Mifflin's weight coefficient already drops BMR by 10 kcal/day per kg lost,
// which is only 100 kcal per 10 kg — the bottom of the published 100–150 band.
// The remainder is metabolic adaptation and the 20–25% lean-mass share of the
// tissue lost, applied as an extra decrement on weight ALREADY LOST. Gain gets
// no symmetric bonus.
export function adaptiveDropPerKg(rates = DEFAULT_RATES) {
  const [lo, hi] = rates.health.bmrDropPer10kgLost;
  const midPerKg = (lo + hi) / 2 / 10;
  return Math.max(0, midPerKg - rates.health.bmrCoefficients.weight);
}

export function projectWeight({
  startWeightKg,
  heightCm,
  age,
  sex,
  activityMultiplier,
  intakeKcal,
  goalWeightKg = null,
  maxWeeks = 260,
  rates = DEFAULT_RATES,
}) {
  const kcalPerKg = rates.health.kcalPerKg;
  const adaptive = adaptiveDropPerKg(rates);
  const direction = goalWeightKg == null ? 0 : Math.sign(goalWeightKg - startWeightKg);

  const weeks = [];
  let weight = startWeightKg;
  let reachedWeek = null;
  let plateaued = false;

  for (let w = 0; w <= maxWeeks; w++) {
    const rawBmr = bmrMifflinStJeor(weight, heightCm, age, sex, rates);
    const lost = Math.max(0, startWeightKg - weight);
    const bmr = rawBmr - adaptive * lost;
    const tdee = bmr * activityMultiplier;
    const dailyDelta = intakeKcal - tdee; // +ve = surplus
    weeks.push({
      week: w,
      weightKg: round(weight, 2),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyDelta: Math.round(dailyDelta),
    });

    if (reachedWeek === null && direction !== 0) {
      const hit = direction < 0 ? weight <= goalWeightKg + 1e-9 : weight >= goalWeightKg - 1e-9;
      if (hit) reachedWeek = w;
    }
    if (reachedWeek !== null) break;

    const weeklyChange = (dailyDelta * 7) / kcalPerKg;
    if (Math.abs(weeklyChange) < 0.005) {
      plateaued = true;
      break;
    }
    weight += weeklyChange;
  }

  const firstWeekChange = weeks.length > 1 ? weeks[1].weightKg - weeks[0].weightKg : 0;

  return {
    weeks,
    reachedWeek,
    plateaued,
    firstWeekChange: round(firstWeekChange, 3),
    endWeightKg: weeks[weeks.length - 1].weightKg,
    startBmr: weeks[0].bmr,
    endBmr: weeks[weeks.length - 1].bmr,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const BLOCKED_GOAL = {
  goalCalories: null,
  calorieDeficitOrSurplus: null,
  weeklyWeightChange: null,
  projectedWeeks: null,
  goalMacros: null,
  goalProtein: null,
  chartData: [],
  projection: null,
};

export function calcHealth(inputs = {}) {
  const {
    heightCm = 175,
    weightKg = 80,
    age = 30,
    sex = 'male',
    activityLevel = 'moderate',
    goalType = 'maintain',
    goalWeightKg = null,
    goalWeeks = 12,
    bodyFatPercent = null,
    bmiView = 'standard', // 'standard' | 'who-asian'
    date = new Date(),
  } = inputs;

  const rates = inputs.rates ?? ratesFor(date);
  const h = rates.health;
  const resolvedSex = normaliseSex(sex);
  const warnings = [];
  const notes = [];

  // ── Age gate. Mifflin-St Jeor was validated on adults 19–78 and is not valid
  // under 18 (§3.11). A calorie-deficit tool must not answer for a minor.
  const [validFrom, validTo] = h.bmrValidAgeRange;
  if (age < 18) {
    return {
      ageBlocked: true,
      ageBlockMessage:
        'This calculator is for adults only. The Mifflin-St Jeor equation is not valid under 18, ' +
        'and calorie targets for children and teenagers must come from paediatric growth references. ' +
        'Speak to a GP, a paediatric dietitian, or use paediatric BMI-for-age charts instead.',
      bmr: null,
      maintenanceCalories: null,
      bmi: null,
      bmiCategory: null,
      maintenanceMacros: null,
      goalBlocked: true,
      blockReasons: [],
      warnings: [],
      notes: [],
      ...BLOCKED_GOAL,
    };
  }
  if (age < validFrom || age > validTo) {
    warnings.push({
      key: 'age-range',
      level: 'info',
      title: 'Outside the validated age range',
      message: `Mifflin-St Jeor was validated on adults ${validFrom}–${validTo}. At ${age} the estimate is an extrapolation.`,
    });
  }

  // ── Baseline
  const activity = activityFor(activityLevel, rates);
  const activityMultiplier = activity.multiplier;
  const bmrExact = bmrMifflinStJeor(weightKg, heightCm, age, sex, rates);
  const bmrValue = Math.round(bmrExact);
  const maintenanceExact = bmrExact * activityMultiplier;
  const maintenanceCalories = Math.round(maintenanceExact);

  // ── BMI
  const bmiExact = bmiFor(weightKg, heightCm);
  const bmi = round(bmiExact, 1);
  const bmiCategory = bmiCategoryFor(bmiExact, rates);
  const asian = asianActionPointFor(bmiExact, rates);
  const bmiAsianCategory = asian.label;

  if (bmiExact > h.bmrOverestimatesAboveBmi) {
    warnings.push({
      key: 'bmi-overestimate',
      level: 'warn',
      title: 'BMR is likely overstated',
      message: `Mifflin-St Jeor overestimates above BMI ${h.bmrOverestimatesAboveBmi} because it cannot separate lean from fat mass. Where reliable body composition is available, Katch-McArdle is preferred.`,
    });
  }

  const bfPct = Number.isFinite(bodyFatPercent) && bodyFatPercent > 0 ? bodyFatPercent : null;
  const lbm = leanBodyMass(weightKg, bfPct);

  // ── Maintenance protein and macros
  const maintenanceProtein = proteinTargets({
    goalType: 'maintain',
    weightKg,
    goalWeightKg: null,
    bodyFatPercent: bfPct,
    rates,
  });
  const maintenanceMacros = macroSplit(maintenanceCalories, maintenanceProtein.targetG);

  notes.push({
    key: 'mifflin-validation',
    text:
      'Mifflin-St Jeor was never validated outside Caucasian populations, and accuracy declines at ' +
      'very high lean mass or very low body fat. It is a fallback for indirect calorimetry, not a ' +
      'substitute for it.',
  });
  notes.push({
    key: 'activity-taxonomy',
    text:
      'Activity multipliers are the conventional 1.2–1.9 set, not the DRI Physical Activity Level ' +
      'taxonomy (sedentary / low active / active / very active).',
  });
  notes.push({
    key: 'kcal-per-kg',
    text:
      `The ${h.kcalPerKg.toLocaleString('en-AU')} kcal/kg constant is a first-order approximation. ` +
      'Real weight change diverges because of metabolic adaptation, changing body composition, and ' +
      'glycogen and fluid shifts.',
  });

  const base = {
    ageBlocked: false,
    ageBlockMessage: null,
    bmr: bmrValue,
    maintenanceCalories,
    activityMultiplier,
    activityLabel: activity.label,
    bmi,
    bmiCategory,
    bmiAsianCategory,
    bmiAsian: asian,
    bmiView,
    bodyFatPercent: bfPct,
    leanMassKg: lbm === null ? null : round(lbm, 1),
    fatMassKg: lbm === null ? null : round(weightKg - lbm, 1),
    maintenanceMacros,
    maintenanceProtein,
    minIntake: minIntakeFor(sex, rates),
    maxSafeLossRate: h.maxSafeLossRate,
    safeLossBands: h.safeLossBands,
    notes,
  };

  // ── Maintenance only
  const hasGoal = goalType === 'lose' || goalType === 'gain';
  if (!hasGoal || goalWeightKg == null || !(goalWeeks > 0)) {
    return { ...base, ...BLOCKED_GOAL, goalBlocked: false, blockReasons: [], warnings, requested: null };
  }

  // ── Requested plan
  const weightDiff = goalWeightKg - weightKg;
  const directionMatchesGoal =
    (goalType === 'lose' && weightDiff < 0) || (goalType === 'gain' && weightDiff > 0);
  const requestedRateKgPerWeek = Math.abs(weightDiff) / goalWeeks;
  const requestedRateFraction = weightKg > 0 ? requestedRateKgPerWeek / weightKg : 0;
  const dailyDelta = dailyEnergyForRate(weightDiff / goalWeeks, rates); // signed
  const requestedCalories = Math.round(maintenanceCalories + dailyDelta);

  const requested = {
    weightDiffKg: round(weightDiff, 2),
    goalWeeks,
    rateKgPerWeek: round(requestedRateKgPerWeek, 3),
    rateFractionOfBodyweight: round(requestedRateFraction, 5),
    ratePercentOfBodyweight: round(requestedRateFraction * 100, 2),
    dailyEnergyDelta: Math.round(dailyDelta),
    // Kept for the block message only. Never rendered as a target.
    requestedCalories,
    safeRateCeilingKgPerWeek: round(safeRateCeiling(weightKg, h.maxSafeLossRate), 2),
  };

  if (!directionMatchesGoal || weightDiff === 0) {
    return {
      ...base,
      ...BLOCKED_GOAL,
      goalBlocked: false,
      blockReasons: [],
      requested,
      warnings: [
        ...warnings,
        {
          key: 'goal-direction',
          level: 'warn',
          title: 'Goal weight does not match the goal',
          message:
            goalType === 'lose'
              ? 'Set a goal weight below your current weight to plan a loss.'
              : 'Set a goal weight above your current weight to plan a gain.',
        },
      ],
    };
  }

  // ── HARD BLOCKS (§7.4). Nothing numeric is returned when either trips.
  const blockReasons = [];

  // 1. Rate above the safe band. The band is a rate of LOSS; a gain that fast
  //    is flagged, not blocked, because the published limit does not cover it.
  if (
    h.hardBlockAboveMaxRate &&
    goalType === 'lose' &&
    requestedRateFraction > h.maxSafeLossRate + 1e-9
  ) {
    blockReasons.push({
      code: 'RATE_ABOVE_SAFE_BAND',
      title: 'That rate of loss is above the safe band',
      message:
        `Losing ${round(requestedRateKgPerWeek, 2)} kg a week is ` +
        `${round(requestedRateFraction * 100, 2)}% of your bodyweight — above the ` +
        `${round(h.maxSafeLossRate * 100, 1)}% ceiling. No calorie target is shown for this plan. ` +
        `At the ceiling you would lose at most ${round(safeRateCeiling(weightKg, h.maxSafeLossRate), 2)} kg ` +
        `a week, so allow at least ${Math.ceil(Math.abs(weightDiff) / safeRateCeiling(weightKg, h.maxSafeLossRate))} weeks — ` +
        'or set a smaller goal.',
    });
  }

  // 2. Intake below the public-health floor for unsupervised dieting.
  const minIntake = minIntakeFor(sex, rates);
  if (h.hardBlockBelowMinimum && requestedCalories < minIntake) {
    const supervised = requestedCalories < h.medicalSupervisionBelow;
    blockReasons.push({
      code: 'BELOW_MINIMUM_INTAKE',
      title: 'That plan needs an intake below the safe minimum',
      message:
        `Reaching ${goalWeightKg} kg in ${goalWeeks} weeks would need an intake below the ` +
        `${minIntake.toLocaleString('en-AU')} kcal/day floor for ${resolvedSex === 'male' ? 'men' : 'women'} ` +
        'dieting without supervision, so the target is not shown. Lengthen the timeframe or reduce the goal.' +
        (supervised
          ? ` Intakes below ${h.medicalSupervisionBelow} kcal/day are very low calorie diets and require medical supervision.`
          : ''),
    });
  }

  if (blockReasons.length) {
    return { ...base, ...BLOCKED_GOAL, goalBlocked: true, blockReasons, requested, warnings };
  }

  // ── Safe. One projection drives the headline AND the chart.
  const goalCalories = requestedCalories;
  const projection = projectWeight({
    startWeightKg: weightKg,
    heightCm,
    age,
    sex,
    activityMultiplier,
    intakeKcal: goalCalories,
    goalWeightKg,
    maxWeeks: 260,
    rates,
  });

  const projectedWeeks = projection.reachedWeek;
  const weeklyWeightChange = round(projection.firstWeekChange, 2);

  const goalProtein = proteinTargets({
    goalType,
    weightKg,
    goalWeightKg,
    bodyFatPercent: bfPct,
    rates,
  });
  const goalMacros = macroSplit(goalCalories, goalProtein.targetG);

  const chartData = projection.weeks.map((w) => ({
    week: w.week,
    'Weight (kg)': round(w.weightKg, 1),
  }));

  // ── Warnings that do NOT suppress the number.
  if (goalType === 'lose') {
    const band = h.safeLossBands.find((b) => requestedRateFraction <= b.maxRate + 1e-9);
    if (band && band.key === 'aggressive') {
      warnings.push({
        key: 'aggressive-band',
        level: 'warn',
        title: `${band.label} rate of loss`,
        message: `${band.note} The leaner you already are, the more of this comes off as lean mass — the safe rate falls as body fat falls.`,
      });
    }
    if (goalCalories < minIntake * 1.1) {
      warnings.push({
        key: 'near-floor',
        level: 'warn',
        title: 'Close to the minimum intake',
        message: `${goalCalories.toLocaleString('en-AU')} kcal/day is within 10% of the ${minIntake.toLocaleString('en-AU')} kcal floor. There is very little room to reduce further.`,
      });
    }
  }

  if (projectedWeeks === null) {
    warnings.push({
      key: 'plateau',
      level: 'warn',
      title: 'The goal is not reached at this intake',
      message:
        `Holding ${goalCalories.toLocaleString('en-AU')} kcal/day, BMR falls as weight comes off and the ` +
        `projection flattens at about ${projection.endWeightKg} kg — short of ${goalWeightKg} kg. ` +
        'This is what a declining-BMR projection shows that a flat one hides.',
    });
  } else if (projectedWeeks > goalWeeks) {
    warnings.push({
      key: 'slower-than-requested',
      level: 'info',
      title: 'This will take longer than your timeframe',
      message:
        `Your ${goalWeeks}-week target assumes maintenance stays at ${maintenanceCalories.toLocaleString('en-AU')} kcal. ` +
        `It does not: BMR falls about ${Math.round((h.bmrDropPer10kgLost[0] + h.bmrDropPer10kgLost[1]) / 2)} kcal/day ` +
        `per 10 kg lost, so the same intake gets you there in about ${projectedWeeks} weeks.`,
    });
  }

  return {
    ...base,
    goalBlocked: false,
    blockReasons: [],
    requested,
    warnings,
    goalCalories,
    calorieDeficitOrSurplus: goalCalories - maintenanceCalories, // signed
    weeklyWeightChange, // signed: negative when losing
    projectedWeeks,
    goalMacros,
    goalProtein,
    chartData,
    projection: {
      startBmr: projection.startBmr,
      endBmr: projection.endBmr,
      bmrDrop: projection.startBmr - projection.endBmr,
      endWeightKg: projection.endWeightKg,
      plateaued: projection.plateaued,
      weeks: projection.weeks,
    },
  };
}
