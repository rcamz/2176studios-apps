// Capital gains tax.
//
// TRAP: the 12-month test excludes BOTH the acquisition day and the CGT event
// day. Acquired 20 Jun 2025, event 20 Jun 2026 → 364 days → NO discount.
// `sale - purchase >= 365` wrongly grants it on exactly-one-year holdings.

export const cgt = [
  {
    __domain: 'cgt',
    effective_from: '2026-07-01',
    effective_to: '2027-06-30',
    confidence: 'P',
    source: 'S17, S19',

    individualDiscount: 0.50,
    superFundDiscount: 0.3333,
    companyDiscount: 0, // companies are not eligible at all

    minimumOwnershipDays: 365,
    excludeAcquisitionDay: true,
    excludeEventDay: true,

    eventDateBasis: 'contract', // not settlement; applies to acquisition too
    lossesBeforeDiscount: true,

    mainResidence: {
      available: true,
      // The six-year limit applies SEPARATELY to each period of absence
      // following a period of actually living there. A single cumulative
      // counter is wrong.
      absenceYearsIfIncomeProducing: 6,
      absenceYearsIfNotIncomeProducing: null, // indefinite
      absenceLimitResetsPerAbsence: true,
      partialExemptionFormula: 'gain × (nonMainResidenceDays ÷ ownershipDays)',
      // Foreign residents get NO main residence exemption at all — a cliff, not
      // apportioned. Tested at contract signing date.
      foreignResidentEligible: false,
      foreignResidentConfidence: 'S',
    },

    foreignResidentWithholding: {
      rate: 0.15,
      priceThreshold: null, // no threshold since 1 Jan 2025
      confidence: 'S',
      note: 'Now catches resident sellers who do not obtain a clearance certificate.',
    },

    // Gain sits in taxable income, so it attracts the Medicare levy and counts
    // toward both HELP repayment income and MLS income.
    attractsMedicareLevy: true,
    countsTowardHelpIncome: true,
    countsTowardMlsIncome: true,
    interactionConfidence: 'I',
  },
  {
    // Tax Reform No. 1 Act 2026, Sch 1. Applies to CGT events on or after
    // 1 July 2027 — nothing changed on 1 July 2026.
    __domain: 'cgt',
    effective_from: '2027-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S17',

    individualDiscount: null, // replaced by cost base indexation
    costBaseIndexation: true,
    minimumTaxRate: 0.30, // on real capital gains accruing from 1 Jul 2027
    superFundDiscount: 0.3333,
    companyDiscount: 0,

    minimumOwnershipDays: 365,
    excludeAcquisitionDay: true,
    excludeEventDay: true,
    eventDateBasis: 'contract',
    lossesBeforeDiscount: true,

    preCgtStatusRemoved: true, // pre-20 Sep 1985 assets lose pre-CGT status after 30 Jun 2027
    newBuildsMayElectDiscount: true,
    affordableHousingDiscount: 0.60,
    smallBusinessActiveAssetTurnover: 10000000, // up from $2m

    // Recipients of certain government payments, including Age Pension and
    // JobSeeker, are exempt from the minimum tax.
    minimumTaxExemptRecipients: true,

    mainResidence: {
      available: true,
      absenceYearsIfIncomeProducing: 6,
      absenceYearsIfNotIncomeProducing: null,
      absenceLimitResetsPerAbsence: true,
      partialExemptionFormula: 'gain × (nonMainResidenceDays ÷ ownershipDays)',
      foreignResidentEligible: false,
      foreignResidentConfidence: 'S',
      unchangedByReform: true,
    },

    foreignResidentWithholding: { rate: 0.15, priceThreshold: null, confidence: 'S' },
    attractsMedicareLevy: true,
    countsTowardHelpIncome: true,
    countsTowardMlsIncome: true,
    interactionConfidence: 'I',

    note: 'From 1 July 2027 the 50% discount is replaced by cost base indexation plus a 30% minimum tax rate on real gains. Treasury has flagged further tranches on implementation detail.',
  },
];

// Negative gearing quarantine — Tax Reform No. 1 Act 2026, Sch 2.
// The grandfathering line is ALREADY LIVE and matters for Rent vs Buy today.
export const negativeGearing = {
  grandfatherCutoff: '2026-05-12T19:30:00+10:00',
  quarantineFromFinancialYear: '2027-28',
  // Losses on existing residential property bought AFTER the cutoff are
  // deductible only against other residential property income, including
  // capital gains. Excess carries forward.
  appliesTo: 'existingResidential',
  carryForward: true,
  exemptions: [
    'newBuilds',
    'buildToRent',
    'socialOrAffordableHousing',
    'dwellingsOnVacantLand',
    'demolishedAndReplacedWithMoreDwellings',
  ],
  excludedEntities: ['widelyHeldTrusts', 'superannuationFunds', 'smsf'],
  excludedAssetClasses: ['commercialProperty', 'shares'],
  confidence: 'P',
  source: 'S1',
};
