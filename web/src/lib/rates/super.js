// Superannuation caps, thresholds and rates.

// Indicative only — for precise minimums, especially market-linked income
// streams, the pro-rating and rounding rules in the SIS Regulations 1994 govern.
// Pensions commencing part-way through a year are pro-rated. The 50% COVID-era
// reduction ran FY2019-20 to FY2022-23 and is NOT in force.
const MINIMUM_DRAWDOWN = [
  { fromAge: 0,  factor: 0.04 },
  { fromAge: 65, factor: 0.05 },
  { fromAge: 75, factor: 0.06 },
  { fromAge: 80, factor: 0.07 },
  { fromAge: 85, factor: 0.09 },
  { fromAge: 90, factor: 0.11 },
  { fromAge: 95, factor: 0.14 },
];

export const superannuation = [
  {
    __domain: 'superannuation',
    effective_from: '2026-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S9',

    sgRate: 0.12,          // also 12.00% from 1 Jul 2027; no further rises legislated
    contributionsTax: 0.15,

    concessionalCap: 32500,      // AWOTE-indexed, up from $30,000
    nonConcessionalCap: 130000,
    bringForwardMax: 390000,     // 3 years, under 75, tiered by total super balance

    carryForward: {
      totalSuperBalanceTest: 500000, // not indexed; tested at 30 June prior year
      lookbackYears: 5,
    },

    division293: {
      threshold: 250000,
      rate: 0.15,
      // Payable on the LESSER of the excess over the threshold or the
      // concessional contributions for the year.
      basis: 'lesserOfExcessOrConcessional',
    },

    transferBalanceCap: 2100000,
    definedBenefitIncomeCap: 131250,
    lowRateCap: 260000,
    untaxedPlanCap: 1935000,
    cgtCap: 1935000,

    preservationAge: 60, // for anyone born from 1 Jul 1964 — effectively universal

    // STRUCTURAL CHANGE: annual from 1 July 2026, previously quarterly.
    // concessional cap × 100 ÷ charge percentage, rounded down to nearest $10.
    maxContributionBase: { period: 'annual', amount: 270830 },

    // Payday Super, same date: SG is payable each payday within 7 business days,
    // and is calculated on "qualifying earnings" rather than ordinary time
    // earnings. Flagged for any calculator assuming quarterly SG or an OTE base.
    paydaySuper: {
      inForce: true,
      remittanceDays: 7,
      earningsBase: 'qualifyingEarnings',
      confidence: 'S',
    },

    coContribution: { max: 500, lowerThreshold: 49293, higherThreshold: 64293 },
    listo: { max: 500, adjustedTaxableIncomeThreshold: 37000 },

    minimumDrawdown: MINIMUM_DRAWDOWN,

    // Division 296 — FLAG, DO NOT COMPUTE (decision, audit §7.4).
    // Realised earnings is a fund-level figure that can differ from total return
    // by an order of magnitude; computing it would mean inventing the key
    // variable, and the liability is lumpy by design so a smooth annual
    // projection actively misleads.
    division296: {
      inForce: true,
      commences: '2026-07-01',
      firstAssessmentYear: '2027-28',
      compute: false,
      threshold1: 3000000,
      threshold1Indexation: 150000,
      threshold2: 10000000,
      threshold2Indexation: 500000,
      rateTier1: 0.15,
      rateTier2Additional: 0.10,
      earningsBasis: 'realised', // no tax on unrealised gains in the final law
      confidence: 'S',
      note: 'Division 296 applies from 1 July 2026 on realised earnings where total super balance exceeds $3m. This calculator flags it but does not model it — methodology pending ATO guidance, first assessments in 2027-28.',
    },
  },
];
