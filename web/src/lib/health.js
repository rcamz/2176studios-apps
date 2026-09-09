// Health calculator: BMR, TDEE, macros, goal-based caloric targets

// Activity level multipliers (Mifflin-St Jeor TDEE)
export const ACTIVITY_LEVELS = [
  {
    key: 'sedentary',
    label: 'Sedentary',
    multiplier: 1.2,
    examples: 'Desk job, no exercise, mostly sitting',
  },
  {
    key: 'light',
    label: 'Light',
    multiplier: 1.375,
    examples: '1–3 days/week light exercise, walking, yoga',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    multiplier: 1.55,
    examples: '3–5 days/week gym, cycling, swimming',
  },
  {
    key: 'high',
    label: 'High',
    multiplier: 1.725,
    examples: '6–7 days/week hard training, physical job',
  },
];

// Mifflin-St Jeor BMR
function bmr(weightKg, heightCm, age, sex) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// Macro split: protein, carbs, fat based on goal
function macroSplit(calories, goal, weightKg) {
  // Protein: 1.6–2.2g/kg (higher when losing fat to preserve muscle)
  const proteinPerKg = goal === 'lose' ? 2.2 : goal === 'gain' ? 2.0 : 1.8;
  const proteinG = Math.round(proteinPerKg * weightKg);
  const proteinCal = proteinG * 4;

  // Fat: ~25–30% of calories
  const fatPct = 0.27;
  const fatCal = calories * fatPct;
  const fatG = Math.round(fatCal / 9);

  // Carbs: remainder
  const carbCal = Math.max(0, calories - proteinCal - fatCal);
  const carbG = Math.round(carbCal / 4);

  return { proteinG, fatG, carbG, proteinCal: Math.round(proteinCal), fatCal: Math.round(fatCal), carbCal: Math.round(carbCal) };
}

export function calcHealth(inputs) {
  const {
    heightCm = 175,
    weightKg = 75,
    age = 30,
    sex = 'male',
    activityLevel = 'moderate',
    goalType = 'maintain',    // 'lose' | 'maintain' | 'gain'
    goalWeightKg = null,
    goalWeeks = 12,
  } = inputs;

  const bmrValue = Math.round(bmr(weightKg, heightCm, age, sex));
  const activityMultiplier = ACTIVITY_LEVELS.find(a => a.key === activityLevel)?.multiplier ?? 1.55;
  const maintenanceCalories = Math.round(bmrValue * activityMultiplier);

  // BMI
  const heightM = heightCm / 100;
  const bmi = +(weightKg / (heightM * heightM)).toFixed(1);
  const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy weight' : bmi < 30 ? 'Overweight' : 'Obese';

  // Maintenance macros
  const maintenanceMacros = macroSplit(maintenanceCalories, 'maintain', weightKg);

  // Goal calculations
  let goalCalories = maintenanceCalories;
  let weeklyWeightChange = 0;
  let goalMacros = maintenanceMacros;
  let projectedWeeks = null;
  let calorieDeficitOrSurplus = 0;

  if (goalType !== 'maintain' && goalWeightKg !== null) {
    const weightDiff = goalWeightKg - weightKg;
    const totalKcalChange = weightDiff * 7700; // ~7700kcal per kg body weight
    const weeklyKcalChange = goalWeeks > 0 ? totalKcalChange / goalWeeks : 0;
    calorieDeficitOrSurplus = Math.round(weeklyKcalChange / 7);
    goalCalories = Math.round(maintenanceCalories + calorieDeficitOrSurplus);

    // Safety floors
    const minCalories = sex === 'male' ? 1500 : 1200;
    const safeCals = Math.max(goalCalories, minCalories);
    const actualDeficit = maintenanceCalories - safeCals;

    weeklyWeightChange = +(actualDeficit * 7 / 7700).toFixed(2);
    goalMacros = macroSplit(safeCals, goalType, weightKg);
    goalCalories = safeCals;

    if (goalType === 'lose') {
      projectedWeeks = actualDeficit > 0
        ? Math.ceil(Math.abs(weightDiff * 7700) / (actualDeficit * 7))
        : null;
    } else {
      projectedWeeks = goalWeeks;
    }
  }

  // Weekly chart: projected weight over time
  const chartData = [];
  if (goalType !== 'maintain' && goalWeightKg !== null) {
    const actualWeeklyChange = +(calorieDeficitOrSurplus * 7 / 7700).toFixed(3);
    const weeks = Math.min(projectedWeeks ?? goalWeeks, 52);
    for (let w = 0; w <= weeks; w++) {
      chartData.push({
        week: w,
        'Weight (kg)': +(weightKg + actualWeeklyChange * w).toFixed(1),
      });
    }
  }

  return {
    bmr: bmrValue,
    maintenanceCalories,
    goalCalories,
    calorieDeficitOrSurplus,
    weeklyWeightChange,
    bmi,
    bmiCategory,
    maintenanceMacros,
    goalMacros,
    projectedWeeks,
    activityMultiplier,
    chartData,
  };
}
