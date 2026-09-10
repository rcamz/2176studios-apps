// Lending, serviceability and mortgage insurance.

// Helia's indicative fee estimator is the defensible public reference — Helia
// and QBE underwrite virtually all Australian residential LMI. Use percentage
// bands, not dollar figures: published dollar examples vary by up to 2× for the
// same scenario because lender rate cards genuinely differ.
//
// Rates rise NON-LINEARLY with cliffs at 85%, 90% and 95%. Crossing 90% to 91%
// can add ~0.6% of the loan. Do not interpolate smoothly across a cliff.
const LMI_BANDS = [
  { fromLvr: 0,     toLvr: 0.80,  low: 0,      high: 0      },
  { fromLvr: 0.80,  toLvr: 0.85,  low: 0.005,  high: 0.010  },
  { fromLvr: 0.85,  toLvr: 0.90,  low: 0.0145, high: 0.020  },
  { fromLvr: 0.90,  toLvr: 0.95,  low: 0.025,  high: 0.045  },
];

export const lending = [
  {
    __domain: 'lending',
    effective_from: '2026-02-01',
    effective_to: null,
    confidence: 'P',
    source: 'S36, S37, S38, S39, S40, S41',

    serviceabilityBuffer: 0.03, // 3.0 percentage points, unchanged since Oct 2021

    // No universal minimum assessment rate floor exists. Industry anchor only.
    assessmentRateFloor: null,
    industryWeightedAssessmentRate: 0.0871, // March 2026 quarter
    industryWeightedFundedRate: 0.0590,

    // HEM tables are PROPRIETARY — licensed by the Melbourne Institute to
    // lenders, not published. There is no lawful public figure to implement.
    // Use max(declared, ownBenchmark) and DO NOT call the estimate "HEM".
    hemIsProprietary: true,
    expenseBenchmarkLabel: 'Indicative living expense benchmark',
    expenseBenchmarkNote:
      'Lenders use a licensed benchmark dataset that is not public. This is our own indicative estimate, scaled by household composition and income. Lenders apply the higher of your declared expenses or their benchmark.',
    // Excludes housing payments — rent, mortgage repayments, rates and home
    // insurance are assessed separately. For an owner-occupier loan the
    // applicant's current rent is dropped, since the new loan replaces it.
    expenseBenchmarkExcludesHousing: true,

    creditCardMonthlyRate: 0.038, // 3.0–3.8% across lenders; editable in the UI
    creditCardRateRange: [0.030, 0.038],
    creditCardAppliesToFullLimit: true, // regardless of balance owing

    // Two different calculations; the 2025 change touched only one.
    helpCountsInServiceability: true,   // unchanged — a committed expense
    helpCountsInDti: false,             // ARS 223.0 from 30 Sep 2025, no discretion
    helpDtiExclusionFrom: '2025-09-30',
    // Lenders assess the REPAYMENT, not the balance, so a $25k and an $80k HELP
    // debt cost roughly the same capacity at the same income.

    rentalIncomeShading: 0.80, // APG 223 requires ≥20% shading of rent, bonuses, overtime
    shadingAppliesTo: ['rentalIncome', 'bonuses', 'overtime'],
    selfEmployedShading: 0.80,
    shadingAppliesToGross: true, // shade gross income BEFORE tax, not net

    lmiBands: LMI_BANDS,
    lmiDisclosure: 'LMI numbers vary from bank to bank. These are indicative, for research purposes.',
    lmiUsuallyCapitalised: true,
    lmiHighLvrRateMargin: [0.001, 0.004],
    lmiInvestorPricedHigher: true,
    lmiInvestorMaxLvr: 0.90,

    // Lender-level macroprudential limit, NOT a borrower cap. A DTI of 6+ does
    // not mean automatic decline — it means fewer lenders will write it.
    dtiLimit: {
      threshold: 6,
      shareOfNewLending: 0.20,
      from: '2026-02-01',
      isBorrowerCap: false,
      confidence: 'S',
      warning: 'At a debt-to-income ratio of 6 or above, fewer lenders will consider the loan. This is a limit on each bank’s book, not an automatic decline.',
    },

    firstHomeGuarantee: {
      placesCapped: false,
      incomeCaps: null,
      minDepositRate: 0.05,
      governmentGuaranteeMax: 0.15,
      lmiCharged: false,
      priorOwnershipLookbackYears: 10,
      ownerOccupiedOnly: true,
      participatingLendersOnly: true,
      lenderCount: 47,
      // Price caps are retained, indexed, vary by address, and secondary sources
      // widely republish stale pre-October-2025 figures. DO NOT HARDCODE.
      priceCapsHardcoded: false,
      priceCapLookupUrl: 'https://www.firsthomebuyers.gov.au',
      priceCapNote:
        'Price caps vary by postcode and are indexed. Both the purchase price and the lender-assessed valuation must be at or below the cap. Check the Housing Australia postcode tool.',
      // The guarantee solves the deposit and LMI problem, NOT serviceability.
      improvesServiceability: false,
      confidence: 'S',
    },
  },
];
