// Termination, redundancy, ETPs and unused leave.

// TRAP: NOT MONOTONIC. Peaks at 16 weeks for 9–<10 years, then DROPS to 12 at
// 10+. Deliberate — from the 2004 Redundancy Case, reflecting long-serving
// employees accessing long service leave on termination. Read from this table;
// never extrapolate the pattern.
const NES_REDUNDANCY_WEEKS = [
  { minYears: 0,  maxYears: 1,  weeks: 0 },
  { minYears: 1,  maxYears: 2,  weeks: 4 },
  { minYears: 2,  maxYears: 3,  weeks: 6 },
  { minYears: 3,  maxYears: 4,  weeks: 7 },
  { minYears: 4,  maxYears: 5,  weeks: 8 },
  { minYears: 5,  maxYears: 6,  weeks: 10 },
  { minYears: 6,  maxYears: 7,  weeks: 11 },
  { minYears: 7,  maxYears: 8,  weeks: 13 },
  { minYears: 8,  maxYears: 9,  weeks: 14 },
  { minYears: 9,  maxYears: 10, weeks: 16 },
  { minYears: 10, maxYears: null, weeks: 12 },
];

// The ONLY difference between normal termination and genuine redundancy is the
// post-17 Aug 1993 row. Use 32%, not the older 31.5% from NAT 3351.
const LEAVE_TAX = {
  longServiceLeave: {
    preAug1978:      { normal: 'marginal5pct', redundancy: 'marginal5pct' },
    aug1978Aug1993:  { normal: 0.32, redundancy: 0.32 },
    postAug1993:     { normal: 'marginal', redundancy: 0.32 },
  },
  annualLeave: {
    preAug1993:  { normal: 0.32, redundancy: 0.32 },
    postAug1993: { normal: 'marginal', redundancy: 0.32 },
  },
  // Apportionment is BY DAYS, not dollars. LSL taken during employment must be
  // attributed to the periods in which it was used, and part-time vs full-time
  // service periods are calculated separately.
  apportionBasis: 'days',
  smallAmountRuleThreshold: 300,
};

export const termination = [
  {
    __domain: 'termination',
    effective_from: '2026-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S9, S13, S14, S16',

    genuineRedundancy: {
      baseLimit: 13598,
      perYearOfService: 6801,
      // Tax-free treatment requires the employee to be under Age Pension age.
      maxAge: 67,
      maxAgeConfidence: 'S',
    },

    etp: {
      lifeBenefitCap: 270000,
      deathBenefitCap: 270000,
      // Not indexed. Reduced by other taxable income in the year. Applies to
      // NON-genuine-redundancy ETPs.
      wholeOfIncomeCap: 180000,
      wholeOfIncomeCapIndexed: false,
      rateUnderPreservationAge: 0.32, // 30% + 2% Medicare
      rateAtPreservationAge: 0.17,    // 15% + 2% Medicare
      rateAboveCap: 0.47,             // 45% + 2% Medicare
      // Measured at 30 June of the payment year, against preservation age —
      // not a hardcoded 60.
      ageTest: 'preservationAgeAt30June',
    },

    leaveTax: LEAVE_TAX,

    nes: {
      weeks: NES_REDUNDANCY_WEEKS,
      // Redundancy pay uses the BASE rate of pay (s16) — excludes overtime,
      // penalties, allowances, loadings and bonuses. Payment in lieu of notice
      // uses the FULL rate, which includes them. Do not use one rate for both.
      redundancyPayBasis: 'baseRate',
      noticePayBasis: 'fullRate',
      exclusions: {
        smallBusinessHeadcount: 15, // by headcount, incl. regular casuals; associated entities count as one
        minimumServiceMonths: 12,
        casualServiceCounts: false,
        apprenticesTrainees: true,
        fixedTermEndingNaturally: true,
        seriousMisconduct: true,
        industrySpecificSchemes: true,
      },
      // s121(4): a small-business employee IS entitled where the employer later
      // becomes bankrupt or goes into liquidation and became a small business
      // employer because of that.
      insolvencyCarveOut: true,
      // Awards and enterprise agreements can improve on the minimum, and some
      // provide redundancy pay regardless of employer size — a nil result for a
      // small business should be caveated, not stated flatly.
      awardsMayImprove: true,
      extraNoticeWeekAge: 45,
      extraNoticeWeekMinYears: 2,
    },
  },
];
