// Regression test vectors — stamp duty, all eight jurisdictions.
// Transcribed VERBATIM from FY2026-27-rates-audit-v2.md §8.6 (context: §3.1).
// Do not edit values without re-verifying against the audit document.
//
// `source` convention:
//   'ATO' / 'QRO' — published worked examples; failing one is definitively wrong
//   'calc'        — computed from a verified scale
//   'published'   — published guidance/anchor that is neither of the above,
//                   and the fallback where §8 carries no explicit marker
// `trap: true`   — the case tests a §2 structural issue (plausible-but-wrong output)

// ---------------------------------------------------------------------------
// NSW — §8.6 [calc]
// ---------------------------------------------------------------------------
export const nswDuty = [
  { input: { value: 500000 }, expected: 16687.0, source: 'calc' },
  { input: { value: 800000 }, expected: 30187.0, source: 'calc' },
  { input: { value: 1000000 }, expected: 39187.0, source: 'calc' },
  { input: { value: 1500000 }, expected: 63787.0, source: 'calc' },
  {
    input: { value: 800000, firstHomeBuyer: true },
    expected: 0,
    source: 'calc',
    note: 'FHB: $800,000 → $0.',
  },
  {
    input: { value: 1000000, firstHomeBuyer: true },
    expected: 39187.0,
    source: 'calc',
    note: '$1,000,000 → $39,187 (concession fully phased out).',
  },
];

// ---------------------------------------------------------------------------
// VIC — §8.6 [calc]
// ---------------------------------------------------------------------------
const VIC_FLAT_BAND_TRAP =
  'Note the step at $960,000 → $960,001: duty rises by $130 for one extra dollar of value, ' +
  'because the band switches from marginal to a flat 5.5% of the whole value. ' +
  'A marginal implementation returns $52,670.06 at $960,001 and diverges further across the band ' +
  '— at $1,500,000 it gives $84,870 against the correct $82,500.';

export const vicDuty = [
  { input: { value: 500000, schedule: 'General' }, expected: 25070.0, source: 'calc' },
  { input: { value: 500000, schedule: 'PPR' }, expected: 21370.0, source: 'calc' },
  { input: { value: 800000, schedule: 'General' }, expected: 43070.0, source: 'calc' },
  { input: { value: 960000, schedule: 'General' }, expected: 52670.0, source: 'calc' },
  {
    input: { value: 960001, schedule: 'General' },
    expected: 52800.06,
    source: 'calc',
    trap: true,
    note: VIC_FLAT_BAND_TRAP,
  },
  { input: { value: 1000000, schedule: 'General' }, expected: 55000.0, source: 'calc' },
  {
    input: { value: 1500000, schedule: 'General' },
    expected: 82500.0,
    source: 'calc',
    trap: true,
    note:
      VIC_FLAT_BAND_TRAP +
      ' TODO: the audit states a marginal implementation "gives $84,870" at $1,500,000, ' +
      'but the §3.1 marginal scale ($2,870 + 6% over $130,000) gives $85,070. ' +
      'The correct answer $82,500 (5.5% flat) is unaffected; the $84,870 figure in the prose does not reconcile.',
  },
  { input: { value: 2000000, schedule: 'General' }, expected: 110000.0, source: 'calc' },
  { input: { value: 2000001, schedule: 'General' }, expected: 110000.07, source: 'calc' },
  {
    input: { value: 600000, firstHomeBuyer: true },
    expected: 0,
    source: 'calc',
    note: 'FHB: $600,000 → $0.',
  },
];

// ---------------------------------------------------------------------------
// QLD — §8.6 [QRO]
// ---------------------------------------------------------------------------
export const qldDuty = [
  {
    input: { value: 850000, schedule: 'General' },
    expected: 31275.0,
    source: 'QRO',
    note: 'QRO example.',
  },
  {
    input: { value: 950000, schedule: 'Home concession' },
    expected: 28600.0,
    source: 'QRO',
    note: 'QRO example.',
  },
  { input: { value: 540000, schedule: 'General' }, expected: 17325.0, source: 'calc' },
  {
    input: { value: 540000, schedule: 'Home concession' },
    expected: 10150.0,
    source: 'calc',
    trap: true,
    note:
      'The gap between the two schedules at $540,000 and above is a constant $7,175 — ' +
      'the maximum home concession saving. If it grows with price, the implementation is wrong.',
  },
  {
    input: { value: 850050, schedule: 'General' },
    expected: 31279.5,
    source: 'calc',
    trap: true,
    note:
      'Rounding is per $100 or part of $100. Test $850,050: `ceil(310050/100) × 4.50` not `3100.5 × 4.50`. ' +
      'TODO: §8.6 gives the rounding formula but states no expected total. $31,279.50 = $17,325 + ' +
      'ceil(310050/100) × $4.50 using the §3.1 QLD general scale — confirm against QRO before relying on it.',
  },
  {
    input: { value: 750000, schedule: 'Home concession' },
    expected: 19600.0,
    source: 'calc',
    trap: true,
    note:
      '⚠️ One third-party source publishes $15,925 (owner-occupier) and $22,575 (investor) at $750,000. ' +
      'Neither reconciles with the QRO scale, which gives $19,600 and $26,775. ' +
      'Use the QRO examples above, not those figures.',
  },
  {
    input: { value: 750000, schedule: 'General' },
    expected: 26775.0,
    source: 'calc',
    trap: true,
    note:
      '⚠️ One third-party source publishes $15,925 (owner-occupier) and $22,575 (investor) at $750,000. ' +
      'Neither reconciles with the QRO scale, which gives $19,600 and $26,775. ' +
      'Use the QRO examples above, not those figures.',
  },
];

// ---------------------------------------------------------------------------
// SA — §8.6 [calc, RevenueSA-sourced scale]
// ---------------------------------------------------------------------------
export const saDuty = [
  { input: { value: 500000 }, expected: 21330.0, source: 'calc' },
  { input: { value: 600000 }, expected: 26830.0, source: 'calc' },
  { input: { value: 750000 }, expected: 35080.0, source: 'calc' },
  { input: { value: 1000000 }, expected: 48830.0, source: 'calc' },
  {
    input: { value: 1000000, propertyType: 'commercial' },
    expected: 0,
    source: 'calc',
    trap: true,
    note: 'Commercial or industrial property → $0, since 1 July 2018.',
  },
  {
    input: { value: 1000000, propertyType: 'industrial' },
    expected: 0,
    source: 'calc',
    trap: true,
    note: 'Commercial or industrial property → $0, since 1 July 2018.',
  },
];

// ---------------------------------------------------------------------------
// WA — §8.6 [calc]
// ---------------------------------------------------------------------------
export const waDuty = [
  { input: { value: 360000 }, expected: 11115.0, source: 'calc' },
  { input: { value: 650000 }, expected: 24890.0, source: 'calc' },
  { input: { value: 725000 }, expected: 28452.5, source: 'calc' },
  {
    input: { value: 800000 },
    expected: 32315.0,
    source: 'calc',
    note:
      'CORRECTED from the source audit, which states $32,315.50 — a 50c arithmetic error. ' +
      '$28,452.50 + ceil(75,000/100) × $5.15 = $28,452.50 + $3,862.50 = $32,315.00. The scale is ' +
      'self-consistent at both band boundaries ($360,000 → $11,115 and $725,000 → $28,452.50, each ' +
      'matching the next band’s base), and the audit’s other two WA anchors reconcile exactly, so ' +
      'the error is in this figure alone. Do not revert.',
  },
  {
    input: { value: 600000, firstHomeOwnerRate: true, transactionDate: 'on or after 2026-05-07' },
    expected: 0,
    source: 'calc',
    note: 'FHOR from 7 May 2026: $600,000 → $0.',
  },
  {
    input: { value: 700000, firstHomeOwnerRate: true, transactionDate: 'on or after 2026-05-07' },
    expected: 16150.0,
    source: 'calc',
    note: 'FHOR from 7 May 2026: $700,000 → $16.15 per $100 over $600,000 = $16,150.00.',
  },
  {
    input: {
      value: 700000,
      firstHomeOwnerRate: true,
      region: 'regional',
      transactionDate: 'on or after 2026-05-07',
    },
    expected: 16150.0,
    source: 'calc',
    trap: true,
    note:
      'No metro/regional branch. If one exists, remove it. ' +
      'The regional result must equal the metro result — the distinction was removed on 7 May 2026 (§1.9).',
  },
];

// ---------------------------------------------------------------------------
// TAS — §8.6 [calc, derived scale]
// ---------------------------------------------------------------------------
export const tasDuty = [
  { input: { value: 300000 }, expected: 9935.0, source: 'calc' },
  { input: { value: 400000 }, expected: 13997.5, source: 'calc' },
  { input: { value: 500000 }, expected: 18247.5, source: 'calc' },
  { input: { value: 600000 }, expected: 22497.5, source: 'calc' },
  { input: { value: 650000 }, expected: 24622.5, source: 'calc' },
  { input: { value: 700000 }, expected: 26747.5, source: 'calc' },
  { input: { value: 725000 }, expected: 27810.0, source: 'calc' },
  {
    input: { value: 750000 },
    expected: 28935.0,
    source: 'calc',
    trap: true,
    note:
      '$750,000 is $28,935, not $27,810. A published source has this wrong — ' +
      '$27,810 is the duty at exactly $725,000. Do not seed from that figure.',
  },
  { input: { value: 800000 }, expected: 31185.0, source: 'calc' },
  {
    input: {
      firstHomeBuyer: true,
      propertyType: 'established',
      contractDate: 'current (FY2026-27)',
      settlementDate: 'after 2026-06-30',
    },
    expected: 'full standard duty, no exemption',
    source: 'calc',
    trap: true,
    note:
      'FHB purchasing an established home, contract now, settling after 30 June 2026 → ' +
      'full standard duty, no exemption. The test is settlement date, not contract date.',
  },
];

// ---------------------------------------------------------------------------
// ACT — §8.6 [calc, derived scale]
// ---------------------------------------------------------------------------
const ACT_GAP_TRAP =
  'The owner-occupier / standard gap must be a constant $2,992 at every value above $300,000. ' +
  'If it varies, the schedules have been implemented separately and at least one has an error.';

export const actDuty = [
  {
    input: { value: 400000, schedule: 'Owner-occupier' },
    expected: 5008.0,
    source: 'calc',
    trap: true,
    note: ACT_GAP_TRAP,
  },
  {
    input: { value: 400000, schedule: 'Standard' },
    expected: 8000.0,
    source: 'calc',
    trap: true,
    note: ACT_GAP_TRAP,
  },
  {
    input: { value: 500000, schedule: 'Owner-occupier' },
    expected: 8408.0,
    source: 'calc',
    trap: true,
    note: ACT_GAP_TRAP,
  },
  {
    input: { value: 500000, schedule: 'Standard' },
    expected: 11400.0,
    source: 'calc',
    trap: true,
    note: ACT_GAP_TRAP,
  },
  { input: { value: 600000, schedule: 'Standard' }, expected: 15720.0, source: 'calc' },
  { input: { value: 650000, schedule: 'Standard' }, expected: 17880.0, source: 'calc' },
  {
    input: { value: 750000, schedule: 'Owner-occupier' },
    expected: 19208.0,
    source: 'calc',
    trap: true,
    note: ACT_GAP_TRAP,
  },
  {
    input: { value: 750000, schedule: 'Standard' },
    expected: 22200.0,
    source: 'calc',
    trap: true,
    note: ACT_GAP_TRAP,
  },
  { input: { value: 850000, schedule: 'Standard' }, expected: 28100.0, source: 'calc' },
  { input: { value: 1000000, schedule: 'Owner-occupier' }, expected: 33958.0, source: 'calc' },
  {
    input: {
      scheme: 'HBCS',
      contractDate: 'on or after 2026-07-01',
      ownedHomeYearsAgo: 7,
      willOccupyMonths: 12,
      value: 'any price',
    },
    expected: 0,
    source: 'calc',
    trap: true,
    note:
      'HBCS, contract from 1 July 2026, buyer who owned a home seven years ago, will live in it 12 months → ' +
      '$0 duty at any price. Not a first-home-buyer test.',
  },
  {
    input: {
      scheme: 'HBCS',
      contractDate: '2026-06-30',
      ownedHomeYearsAgo: 7,
      willOccupyMonths: 12,
    },
    expected: 'old income-tested rules with the $1,020,000 cap',
    source: 'calc',
    trap: true,
    note: 'Same buyer, contract exchanged 30 June 2026 → old income-tested rules with the $1,020,000 cap.',
  },
];

// ---------------------------------------------------------------------------
// NT — §8.6 [calc]
// ---------------------------------------------------------------------------
export const ntDuty = [
  {
    input: { value: 500000 },
    expected: 23928.6,
    source: 'calc',
    trap: true,
    note:
      'Basis: formula. The formula uses V², where V = value ÷ 1,000. At $500,000, V = 500 and V² = 250,000. ' +
      'Using V instead gives about $7,533 — badly wrong and easy to miss because it still looks like a ' +
      'plausible duty figure.',
  },
  {
    input: { value: 525000 },
    expected: 25987.53,
    source: 'calc',
    note:
      'CORRECTED from the source audit, which states $25,989.28 at this value — that figure is an ' +
      'arithmetic error. 0.06571441 × 525² + 15 × 525 = 18,112.53 + 7,875 = $25,987.53. The audit’s own ' +
      'rationale supports the correction: it describes the $525,000 boundary as near-continuous, and ' +
      '$25,987.53 against the flat-rate $25,987.55 at $525,001 is a 2c step, where $25,989.28 would be ' +
      'a $1.73 step. Do not revert to the published figure.',
  },
  {
    input: { value: 525001 },
    expected: 25987.55,
    source: 'calc',
    trap: true,
    note:
      'Basis: flat 4.95%. Above $525,000 the rate applies to the entire value, not marginally. ' +
      'Also confirm there is no NT first-home-buyer duty concession in the code.',
  },
  {
    input: { value: 700000 },
    expected: 34650.0,
    source: 'calc',
    trap: true,
    note:
      'Basis: flat 4.95%. Above $525,000 the rate applies to the entire value, not marginally. ' +
      'Also confirm there is no NT first-home-buyer duty concession in the code.',
  },
  {
    input: { value: 700000, firstHomeBuyer: true },
    expected: 34650.0,
    source: 'calc',
    trap: true,
    note:
      'Confirm there is no NT first-home-buyer duty concession in the code — an FHB pays the same as any ' +
      'other buyer (§1.9: "No FHB duty concession. $50,000 HomeGrown Territory Grant instead").',
  },
];

export default {
  nswDuty,
  vicDuty,
  qldDuty,
  saDuty,
  waDuty,
  tasDuty,
  actDuty,
  ntDuty,
};
