// Fringe benefits tax and novated leasing.
// The FBT year runs 1 April – 31 March, so these windows are not financial years.

// ATO minimum residual values, as a percentage of the BASE vehicle price.
// Three caveats that are easy to miss:
//  1. Calculated on the base price — EXCLUDING stamp duty, registration and CTP.
//     Not the drive-away price.
//  2. GST is added on payout. A $16,878 residual is ~$18,566 with GST.
//  3. These are MINIMUMS. The ATO permits reduced percentages for high-km
//     drivers, so presenting the figure as fixed slightly overstates it.
const RESIDUAL_MINIMUMS = {
  1: 0.6563,
  2: 0.5625,
  3: 0.4688,
  4: 0.3750,
  5: 0.2813,
};

// Statutory fraction is a DATE × PRICE × ELIGIBILITY lookup, not a constant.
// Resolved by statutoryRateFor() below.
const EV_PHASES = [
  { from: '2022-07-01', to: '2027-03-31', priceCap: null,  rate: 0.00, label: 'Full exemption' },
  { from: '2027-04-01', to: '2029-03-31', priceCap: 75000, rate: 0.00, label: '100% discount under $75,000' },
  { from: '2027-04-01', to: '2029-03-31', priceCap: null,  rate: 0.15, label: '25% discount above $75,000' },
  { from: '2029-04-01', to: null,         priceCap: null,  rate: 0.15, label: '25% discount, all eligible EVs' },
];

export const fbt = [
  {
    __domain: 'fbt',
    effective_from: '2026-04-01',
    effective_to: '2027-03-31',
    confidence: 'S',
    source: 'S20, S21, S22, S23, S24, S25, S26',

    rate: 0.47,
    grossUpType1: 2.0802, // GST-creditable — the one that applies to a novated lease
    grossUpType2: 1.8868, // classification follows GST treatment, not the benefit's label

    statutoryFractionStandard: 0.20,
    evPhases: EV_PHASES,

    // PHEVs ceased to be zero/low emissions vehicles for FBT on 1 April 2025.
    // Grandfathering requires BOTH: exempt use or availability before that date,
    // AND a financially binding pre-existing commitment that continues. If the
    // commitment CHANGES on or after 1 Apr 2025 the exemption stops from the new
    // commitment date; if it ENDS, it applies up to and including that date.
    phevExempt: false,
    phevExemptionEnded: '2025-04-01',
    phevGrandfatheringRequiresBindingCommitment: true,

    // All four conditions required for the EV exemption.
    evExemptionConditions: [
      'zeroOrLowEmissionsVehicle',
      'firstHeldAndUsedOnOrAfter2022-07-01',
      'usedByCurrentEmployeeOrAssociate',
      'luxuryCarTaxNeverPayable',
    ],
    motorcyclesAndScootersEligible: false, // never cars for FBT

    lctThresholdFuelEfficient: 91661, // the one gating the EV FBT exemption
    lctThresholdGeneral: 80809,
    fuelEfficientLitresPer100km: 3.5,  // tightened from 7.0 on 1 Jul 2025

    centsPerKm: 0.91,
    centsPerKmCapKm: 5000,
    centsPerKmMax: 4550,
    centsPerKmWorkRelatedOnly: true, // does NOT cover commuting

    evHomeChargingCentsPerKm: 0.0547, // PCG 2024/2, up from 4.20c
    benchmarkInterestRate: 0.0827,

    residualMinimums: RESIDUAL_MINIMUMS,
    residualBasis: 'baseVehiclePrice',
    residualGstOnPayout: true,
    residualIsMinimumNotFixed: true,

    // Employee contribution method: a post-tax contribution equal to the taxable
    // value reduces FBT to NIL. Must be paid before 31 March. You cannot charge
    // full FBT and apply an ECM reduction simultaneously.
    ecmReducesFbtToNil: true,
    ecmDeadline: '03-31',

    // An FBT-EXEMPT EV still produces a reportable fringe benefits amount.
    // This is the biggest real-world novated lease trap.
    exemptEvStillReportable: true,
    rfbaThreshold: 2000, // taxable value, per FBT year
    rfbaAffects: [
      'medicareLevySurcharge',
      'helpRepaymentIncome',
      'division293',
      'familyTaxBenefitAB',
      'childSupport',
      'privateHealthInsuranceRebate',
      'superCoContribution',
    ],
    // Employees of FBT-exempt employers (PBIs, health promotion charities,
    // public and NFP hospitals, public ambulance) have only 53% of RFBA counted
    // for family assistance and youth income support. Full amount elsewhere.
    rfbaExemptEmployerFamilyAssistanceRate: 0.53,

    reviewDue: '2027-06-30',
  },
  {
    // FBT year to 31 March 2028. The EV phase change on 1 April 2027 is
    // verified and is the substantive change here. The scalar rates below are
    // CARRIED FORWARD from the prior FBT year — they re-index annually and had
    // not been published at the time of verification, so they are marked
    // unverified rather than presented as fact. Re-check each 1 April.
    __domain: 'fbt',
    effective_from: '2027-04-01',
    effective_to: null,
    confidence: 'UNVERIFIED',
    source: 'S20, S21',
    note: 'Scalar FBT rates carried forward from the FBT year to 31 March 2027 pending publication. The 1 April 2027 EV phase change is verified.',

    rate: 0.47,
    grossUpType1: 2.0802,
    grossUpType2: 1.8868,

    statutoryFractionStandard: 0.20,
    evPhases: EV_PHASES,

    phevExempt: false,
    phevExemptionEnded: '2025-04-01',
    phevGrandfatheringRequiresBindingCommitment: true,

    evExemptionConditions: [
      'zeroOrLowEmissionsVehicle',
      'firstHeldAndUsedOnOrAfter2022-07-01',
      'usedByCurrentEmployeeOrAssociate',
      'luxuryCarTaxNeverPayable',
    ],
    motorcyclesAndScootersEligible: false,

    lctThresholdFuelEfficient: 91661,
    lctThresholdGeneral: 80809,
    fuelEfficientLitresPer100km: 3.5,

    centsPerKm: 0.91,
    centsPerKmCapKm: 5000,
    centsPerKmMax: 4550,
    centsPerKmWorkRelatedOnly: true,

    evHomeChargingCentsPerKm: 0.0547,
    benchmarkInterestRate: 0.0827,

    residualMinimums: RESIDUAL_MINIMUMS,
    residualBasis: 'baseVehiclePrice',
    residualGstOnPayout: true,
    residualIsMinimumNotFixed: true,

    ecmReducesFbtToNil: true,
    ecmDeadline: '03-31',

    exemptEvStillReportable: true,
    rfbaThreshold: 2000,
    rfbaAffects: [
      'medicareLevySurcharge',
      'helpRepaymentIncome',
      'division293',
      'familyTaxBenefitAB',
      'childSupport',
      'privateHealthInsuranceRebate',
      'superCoContribution',
    ],
    rfbaExemptEmployerFamilyAssistanceRate: 0.53,

    reviewDue: '2027-06-30',
  },
];

// Resolve the statutory fraction for a vehicle on a date.
// `kind` is 'bev' | 'fcev' | 'phev' | 'ice'.
export function statutoryRateFor({ kind, priceIncGst, date, rates, phevGrandfathered = false }) {
  const eligible =
    kind === 'bev' ||
    kind === 'fcev' ||
    (kind === 'phev' && phevGrandfathered);

  if (!eligible) return { rate: rates.statutoryFractionStandard, label: 'Standard — not an eligible EV' };
  if (priceIncGst >= rates.lctThresholdFuelEfficient) {
    return { rate: rates.statutoryFractionStandard, label: 'Above LCT threshold — exemption unavailable' };
  }

  const d = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  for (const phase of rates.evPhases) {
    const inWindow = phase.from <= d && (phase.to === null || d <= phase.to);
    if (!inWindow) continue;
    if (phase.priceCap !== null && priceIncGst > phase.priceCap) continue;
    return { rate: phase.rate, label: phase.label };
  }
  return { rate: rates.statutoryFractionStandard, label: 'Standard' };
}
