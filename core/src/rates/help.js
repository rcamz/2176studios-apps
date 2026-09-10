// HELP / study and training loan repayments.
//
// THE TRAP: this is not a purely marginal scale. Two marginal bands, then the
// top tier reverts to a FLAT 10% OF TOTAL repayment income. A purely marginal
// implementation understates high earners by thousands and the error grows with
// income — at $300,000 it is out by roughly $1,600.
//
// The percentage-of-total system with 18 brackets was abolished from FY2025-26.

export const help = [
  {
    __domain: 'help',
    effective_from: '2026-07-01',
    effective_to: null,
    confidence: 'P',
    source: 'S7',

    nilThreshold: 69528,

    // Marginal bands. `base` is the repayment at the band's lower bound.
    marginalBands: [
      { from: 69529,  to: 129717, base: 0,    rate: 0.15 },
      { from: 129718, to: 186050, base: 9028, rate: 0.17 },
    ],

    // Above this, repayment = flatRate × TOTAL repayment income. Not marginal.
    flatTierFrom: 186051,
    flatTierRate: 0.10,

    // Repayment income — all five components. Both qualifiers matter and are
    // commonly missed: RFB counts regardless of the employer's exempt status,
    // and an assessable FHSS released amount is excluded.
    incomeBase: [
      'taxableIncome',
      'reportableFringeBenefits',
      'totalNetInvestmentLoss',
      'reportableSuperContributions',
      'exemptForeignEmploymentIncome',
    ],
    incomeBaseExclusions: ['fhssReleasedAmount'],

    // All study and training loans share one schedule; only the order in which
    // a repayment is applied across loan types differs.
    loanTypes: ['HELP', 'VSL', 'SFSS', 'SSL', 'ABSTUDY SSL', 'AASL'],
    repaymentOrder: ['HELP', 'VSL', 'SFSS', 'SSL', 'ABSTUDY SSL', 'AASL'],

    indexation: {
      lastApplied: '2026-06-01',
      lastRate: 0.028,
      confidence: 'S',
      note: 'Indexation of 2.8% applied 1 June 2026. A one-off 20% debt reduction was applied 1 June 2025, before that year’s indexation.',
    },
  },
];
