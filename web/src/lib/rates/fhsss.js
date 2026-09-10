// First Home Super Saver Scheme.
//
// TRAP: the $15,000 annual cap applies BEFORE the 85% concessional haircut.
// $25,000 sacrificed → $15,000 eligible → $12,750 releasable. Applying 85%
// first gives $21,250 → capped at $15,000, which is wrong by $2,250.

// Shortfall interest charge: 90-day Bank Accepted Bill rate + 3%, set quarterly
// and announced roughly two weeks ahead, COMPOUNDED DAILY with the daily rate
// being the annual rate ÷ days in the calendar year (s280-105 Sch 1 TAA 1953).
// Populate later quarters as they publish.
const SIC_QUARTERS = [
  { from: '2026-04-01', to: '2026-06-30', annualRate: 0.0696 },
  { from: '2026-07-01', to: '2026-09-30', annualRate: 0.0743 },
];

export const fhsss = [
  {
    __domain: 'fhsss',
    effective_from: '2026-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S11, S12',

    annualLimit: 15000,
    lifetimeLimit: 50000,

    concessionalReleasableRate: 0.85,    // 15% contributions tax already deducted
    nonConcessionalReleasableRate: 1.00,
    capBeforeHaircut: true,              // see trap above

    sicQuarters: SIC_QUARTERS,
    sicCompounding: 'daily',

    // Released amount is assessable with a 30% offset. Medicare applies, so the
    // effective rate is marginal + 2% − 30%.
    withdrawalOffset: 0.30,
    withdrawalAttractsMedicare: true,
    withdrawalConfidence: 'I',

    // Excluded from BOTH HELP repayment income and MLS income — do not
    // double-count it into those bases.
    excludedFromHelpIncome: true,
    excludedFromMlsIncome: true,

    eligibility: {
      minAge: 18, // when requesting the determination; earlier contributions still count
      neverOwnedAustralianProperty: true,
      onePriorReleaseOnly: true,
      mustBeOnTitle: true,
      residentialOnly: true,
      occupancyMonths: 6,
      occupancyWindowMonths: 12,
      // THE TRAP: the determination must be requested before your interest in
      // the land is registered. Once you hold the interest you cannot make a
      // valid request, and the entire benefit is lost.
      determinationBeforeContract: true,
      contractWindowDaysBefore: 90,
      contractWindowMonthsAfter: 12,
      notifyWithinDays: 90,
      maxExtensionMonths: 24,
      failureTax: 0.20, // if no contract in time and funds are kept
      employerSgEligible: false,
      assessedIndividually: true,
    },
  },
];
