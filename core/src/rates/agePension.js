// Age Pension.
//
// TRAP: rates and means-test thresholds move on DIFFERENT DATES. Payment rates,
// deeming rates and the upper cut-offs indexed on 20 September 2026. The income
// free areas and deeming thresholds are 1 July figures and did NOT change then.
// An implementation that indexes everything together is wrong.
//
// Method: calculate BOTH the income test and the assets test, pay the LOWER.

const COMMON = {
  __domain: 'agePension',
  pensionAge: 67,
  familyHomeExempt: true,
  method: 'lowerOfIncomeAndAssetsTest',
  incomeTaperPerDollar: 0.50,        // couples: 25c each on combined
  assetsTaperPerThousandPerFortnight: 3.00,
  // Free areas and deeming thresholds — 1 July 2026, unchanged on 20 September.
  incomeFreeAreaSingle: 226,
  incomeFreeAreaCouple: 396,
  deemingThresholdSingle: 66800,
  deemingThresholdCouple: 110600,
  assetsThresholdFullSingleHomeowner: 333000,
  assetsThresholdFullSingleNonHomeowner: 600000,
  assetsThresholdFullCoupleHomeowner: 499000,
  assetsThresholdFullCoupleNonHomeowner: 766000,
  workBonusPerFortnight: 300,
  workBonusBankMax: 11800,
  workBonusConfidence: 'UNVERIFIED', // one source gives $460 — conflict unresolved
};

export const agePension = [
  {
    ...COMMON,
    effective_from: '2026-07-01',
    effective_to: '2026-09-19',
    confidence: 'UNVERIFIED',
    source: 'S42',
    note: 'Pre-20 September 2026 window. Superseded by the 20 September indexation; retained so dates in this window resolve rather than throwing. Couple rate and cut-offs for this window were not separately verified.',

    maxRateSingle: 1200.90,
    maxRateCoupleEach: null,
    deemingLowerRate: 0.0125,
    deemingUpperRate: 0.0325,
    incomeCutOutSingle: null,
    incomeCutOutCouple: null,
    assetsCutOffSingleHomeowner: null,
    assetsCutOffSingleNonHomeowner: null,
    assetsCutOffCoupleHomeowner: null,
    assetsCutOffCoupleNonHomeowner: null,
  },
  {
    ...COMMON,
    effective_from: '2026-09-20',
    effective_to: null,
    confidence: 'S',
    source: 'S42',

    // Includes Pension and Energy Supplements.
    maxRateSingle: 1237.70,
    maxRateCoupleEach: 933.00,
    maxRateCoupleCombined: 1866.00,

    deemingLowerRate: 0.0175,
    deemingUpperRate: 0.0375,

    incomeCutOutSingle: 2701.40,
    incomeCutOutCouple: 4128.00,
    incomeCutOutIllnessSeparatedCombined: 5346.80,

    assetsCutOffSingleHomeowner: 745750,
    assetsCutOffSingleNonHomeowner: 1012750,
    assetsCutOffCoupleHomeowner: 1121000,
    assetsCutOffCoupleNonHomeowner: 1388000,
  },
];
