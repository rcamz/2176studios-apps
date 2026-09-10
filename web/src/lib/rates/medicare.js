// Medicare levy and Medicare levy surcharge.
//
// Two traps live here:
//  1. MLS is a CLIFF, not a taper. Once a tier is entered the rate applies to the
//     WHOLE income for MLS purposes, not the excess over the threshold.
//  2. Income for MLS purposes is much wider than taxable income — see incomeBase.

// FY2026-27 low-income thresholds are not published. They are announced in the
// Budget for the year JUST ENDING, so FY2026-27 figures land around May 2027.
// Decision (audit §7.4): use the FY2025-26 set with a visible note.
const LOW_INCOME_FY2025_26 = {
  single:        { lower: 28011, upper: 35013 },
  family:        { lower: 47238, upper: 59047 },
  singleSenior:  { lower: 44268, upper: 55335 },
  familySenior:  { lower: 61623, upper: 77028 },
  perChildLower: 4338,
  perChildUpper: 5423,
};

export const medicare = [
  {
    __domain: 'medicare',
    effective_from: '2026-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S4, S5',

    levyRate: 0.02,
    phaseInRate: 0.10, // 10c per $1 above the lower threshold, capped at 2%

    lowIncomeThresholds: LOW_INCOME_FY2025_26,
    lowIncomeThresholdsConfidence: 'UNVERIFIED',
    lowIncomeThresholdsYear: '2025-26',
    lowIncomeThresholdsNote:
      'FY2026-27 Medicare levy low-income thresholds are not yet published — they are legislated retrospectively in the following Budget (expected May 2027). FY2025-26 figures shown.',

    // A senior only gets the higher threshold if they retain at least $1 of
    // SAPTO. Where SAPTO tapers to zero the ordinary thresholds apply.
    seniorThresholdRequiresSapto: true,

    surcharge: {
      appliesTo: 'wholeIncome', // cliff, not marginal
      single: [
        { from: 0,      to: 105000, rate: 0 },
        { from: 105001, to: 123000, rate: 0.010 },
        { from: 123001, to: 164000, rate: 0.0125 },
        { from: 164001, to: null,   rate: 0.015 },
      ],
      family: [
        { from: 0,      to: 210000, rate: 0 },
        { from: 210001, to: 246000, rate: 0.010 },
        { from: 246001, to: 328000, rate: 0.0125 },
        { from: 328001, to: null,   rate: 0.015 },
      ],
      // Family thresholds lift by this much for each dependent child AFTER the first.
      perAdditionalChild: 1500,
    },

    // Income for MLS purposes. Reportable super here includes deductible PERSONAL
    // contributions, not just employer salary sacrifice.
    incomeBase: [
      'taxableIncome',
      'reportableFringeBenefits',
      'totalNetInvestmentLosses',
      'reportableSuperContributions',
      'spouseTrustIncomeS98',
      'exemptForeignEmploymentIncome',
    ],
    // An assessable FHSS released amount is excluded from this base.
    incomeBaseExclusions: ['fhssReleasedAmount'],
  },
];
