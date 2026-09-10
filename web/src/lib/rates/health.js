// Health — BMR, energy, weight change and protein.
//
// The floors here are HARD BLOCKS by decision (audit §7.4). If the arithmetic
// produces a target below the minimum intake or a rate above the safe band, the
// number must NOT be displayed. A warning beside a displayed figure does not
// satisfy this.

// Conventional multipliers, NOT the DRI Physical Activity Level taxonomy.
// The DRI framing is sedentary / low active / active / very active, of which
// only "very active = 1.9 to <2.5" and "low active" were confirmed. Label these
// as conventional rather than DRI.
const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary',  multiplier: 1.2,   examples: 'Desk job, little or no exercise' },
  { key: 'light',     label: 'Light',      multiplier: 1.375, examples: 'Light exercise 1–3 days a week, walking, yoga' },
  { key: 'moderate',  label: 'Moderate',   multiplier: 1.55,  examples: 'Gym, cycling or swimming 3–5 days a week' },
  { key: 'high',      label: 'High',       multiplier: 1.725, examples: 'Hard training 6–7 days a week' },
  { key: 'athlete',   label: 'Very high',  multiplier: 1.9,   examples: 'Twice-daily training, or a physically demanding job on top of training' },
];

const SAFE_LOSS_BANDS = [
  { key: 'conservative', maxRate: 0.005,  label: 'Conservative', note: 'Lean-mass-first. Appropriate when already lean or in a long deficit.' },
  { key: 'moderate',     maxRate: 0.008,  label: 'Moderate',     note: 'Consensus target for most people.' },
  { key: 'aggressive',   maxRate: 0.011,  label: 'Aggressive',   note: 'Upper safe limit. Needs high protein and planned refeeds.' },
];

export const health = [
  {
    __domain: 'health',
    effective_from: '2020-01-01',
    effective_to: null,
    confidence: 'P',
    source: 'S43, S44, S45, S46',

    // Rounded coefficients. The Academy also publishes the original
    // (9.99 / 6.25 / 4.92) form — pick one, cite it, stay consistent, or output
    // will not reconcile against other calculators.
    bmrEquation: 'mifflin-st-jeor',
    bmrCoefficients: { weight: 10, height: 6.25, age: 5, maleConstant: 5, femaleConstant: -161 },
    bmrUsesActualBodyWeight: true,
    bmrValidAgeRange: [19, 78],
    bmrOverestimatesAboveBmi: 35,
    bmrValidatedOnCaucasianOnly: true,

    activityLevels: ACTIVITY_LEVELS,
    activityTaxonomy: 'conventional',

    kcalPerKg: 7700,
    // Weight loss removes fat PLUS 20–25% lean mass, so BMR falls roughly
    // 100–150 kcal/day per 10 kg lost. A static-BMR projection systematically
    // overstates how fast loss continues.
    leanMassLossShare: 0.225,
    bmrDropPer10kgLost: [100, 150],
    requiresDecliningBmrProjection: true,

    // HARD BLOCK — do not display a target below these.
    minIntakeFemale: 1200,
    minIntakeMale: 1500,
    medicalSupervisionBelow: 800,
    hardBlockBelowMinimum: true,

    safeLossBands: SAFE_LOSS_BANDS,
    maxSafeLossRate: 0.011, // fraction of bodyweight per week
    hardBlockAboveMaxRate: true,
    // The leaner the person, the more susceptible to lean mass loss — the safe
    // rate should scale down as body fat falls, not stay fixed.
    safeRateScalesWithBodyFat: true,

    protein: {
      // Note the DIFFERENT DENOMINATORS. Morton is per kg of bodyweight;
      // Helms is per kg of FAT-FREE MASS. Quoting them against the same
      // denominator produces nonsense.
      fatLossPerKgBodyweight: [1.6, 2.4],
      mortonPlateauPerKgBodyweight: 1.6,
      helmsPerKgFatFreeMass: [2.3, 3.1],
      generalDeficitPerKgBodyweight: [1.2, 1.6],
      elderlyMinPerKgBodyweight: 1.2,
      // For higher body fat, scale to lean body mass or goal weight — not total
      // bodyweight. Multiplying g/kg by total bodyweight regardless of
      // composition is the common bug.
      scaleToLeanMassAboveBodyFat: 0.25,
    },

    bmiCategories: [
      { max: 18.5, label: 'Underweight' },
      { max: 25,   label: 'Healthy weight' },
      { max: 30,   label: 'Overweight' },
      { max: null, label: 'Obese' },
    ],
    // WHO's 2004 Expert Consultation RETAINED the standard cut-offs as the
    // international classification and declined to set population-specific
    // ones, identifying public health action points at 23.0 / 27.5 / 32.5 /
    // 37.5 instead. Two competing obesity thresholds are in active use (27.5
    // from the Consultation, 25 from WPRO). Australian authority NOT confirmed.
    // Offer as an optional, attributed view — never as the Australian default.
    ethnicityAdjustedBmi: {
      available: true,
      isAustralianDefault: false,
      confidence: 'UNVERIFIED',
      attribution: 'WHO Asian-adjusted action points, 2004 Expert Consultation',
      actionPoints: [23.0, 27.5, 32.5, 37.5],
      competingObesityThreshold: 25,
    },
  },
];
