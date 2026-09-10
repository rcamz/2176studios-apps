// Residential transfer duty, all eight jurisdictions.
//
// Duty is charged on the TRANSFER DATE, not by financial year, and several
// jurisdictions changed mid-2026. Every scale is therefore keyed to a date:
//   WA   7 May 2026  — first home owner rate thresholds lifted, metro/regional split removed
//   TAS 30 Jun 2026  — established-home FHB exemption ended (tested on SETTLEMENT date)
//   ACT  1 Jul 2026  — HBCS cap and income test removed
//   QLD  1 Aug 2026  — citizenship requirement added to home concessions
//
// Three structural traps:
//   1. VIC $960,001–$2,000,000 and NT above $525,000 are FLAT on the ENTIRE
//      value, not marginal slices.
//   2. QLD, SA, TAS, ACT and WA charge per $100 OR PART of $100 — use ceil(),
//      not a plain percentage.
//   3. The NT formula below $525,000 is quadratic in V², where V = value/1000.

const per100 = (excess, ratePer100) => Math.ceil(excess / 100) * ratePer100;
const round2 = (n) => Math.round(n * 100) / 100;

export const JURISDICTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

// ─── NSW ─────────────────────────────────────────────────────────────────────
// Brackets and the premium threshold are CPI-indexed each 1 July.

function nswGeneral(v) {
  if (v <= 18000)   return v * 0.0125;
  if (v <= 38000)   return 225 + (v - 18000) * 0.015;
  if (v <= 103000)  return 525 + (v - 38000) * 0.0175;
  if (v <= 387000)  return 1662 + (v - 103000) * 0.035;
  if (v <= 1290000) return 11602 + (v - 387000) * 0.045;
  if (v <= 3870000) return 52237 + (v - 1290000) * 0.055;
  return 194137 + (v - 3870000) * 0.07; // premium residential
}

function nsw({ value, firstHomeBuyer, propertyType }) {
  if (firstHomeBuyer && propertyType === 'vacantLand') {
    if (value <= 350000) return 0;
    if (value < 450000) {
      const full = nswGeneral(value);
      return round2(full * ((value - 350000) / 100000));
    }
  }
  if (firstHomeBuyer) {
    if (value <= 800000) return 0;
    if (value < 1000000) {
      // Concession phases linearly across the band.
      const full = nswGeneral(value);
      return round2(full * ((value - 800000) / 200000));
    }
  }
  return round2(nswGeneral(value));
}

// ─── VIC ─────────────────────────────────────────────────────────────────────

function vicGeneral(v) {
  if (v <= 25000)   return v * 0.014;
  if (v <= 130000)  return 350 + (v - 25000) * 0.024;
  if (v <= 960000)  return 2870 + (v - 130000) * 0.06;
  if (v <= 2000000) return v * 0.055; // FLAT on the entire value, not marginal
  return 110000 + (v - 2000000) * 0.065;
}

// Principal place of residence. Only available at or below $550,000 — above
// that, general rates apply to the whole calculation with no PPR benefit.
function vicPPR(v) {
  if (v > 550000) return vicGeneral(v);
  if (v <= 130000) return vicGeneral(v);
  return 2870 + (v - 130000) * 0.05;
}

function vic({ value, firstHomeBuyer, schedule }) {
  if (firstHomeBuyer) {
    if (value <= 600000) return 0;
    if (value <= 750000) {
      // The concession band uses GENERAL rates, not PPR rates.
      const full = vicGeneral(value);
      return round2(full * (1 - (750000 - value) / 150000));
    }
  }
  if (schedule === 'PPR') return round2(vicPPR(value));
  return round2(vicGeneral(value));
}

// ─── QLD ─────────────────────────────────────────────────────────────────────
// Not indexed — changes by legislation only. Per $100 or part of $100.

function qldGeneral(v) {
  if (v <= 5000)    return 0;
  if (v <= 75000)   return per100(v - 5000, 1.50);
  if (v <= 540000)  return 1050 + per100(v - 75000, 3.50);
  if (v <= 1000000) return 17325 + per100(v - 540000, 4.50);
  return 38025 + per100(v - 1000000, 5.75);
}

// Owner-occupier. The concession rate applies to the first $350,000 of the
// residence value and general rates to the balance, so the saving is capped at
// $7,175 and does NOT grow with price.
function qldHomeConcession(v) {
  if (v <= 350000)  return per100(v, 1.00);
  if (v <= 540000)  return 3500 + per100(v - 350000, 3.50);
  if (v <= 1000000) return 10150 + per100(v - 540000, 4.50);
  return 30850 + per100(v - 1000000, 5.75);
}

function qld({ value, firstHomeBuyer, schedule, propertyType, contractDate, isCitizenOrPR = true }) {
  // From 1 August 2026 every purchaser claiming a home or first-home concession
  // must be an Australian citizen, permanent resident or specified foreign
  // retiree. Transactions before that date are unaffected.
  const citizenshipRequired = contractDate && contractDate >= '2026-08-01';
  const concessionAllowed = !citizenshipRequired || isCitizenOrPR;

  if (firstHomeBuyer && concessionAllowed) {
    // New builds and vacant land: full concession, no value cap.
    if (propertyType === 'new' || propertyType === 'vacantLand') return 0;
    if (value <= 700000) return 0;
    if (value < 800000) {
      const full = qldHomeConcession(value);
      return round2(full * ((value - 700000) / 100000));
    }
  }
  if (schedule === 'Home concession' && concessionAllowed) return round2(qldHomeConcession(value));
  return round2(qldGeneral(value));
}

// ─── SA ──────────────────────────────────────────────────────────────────────
// Nine marginal brackets, unchanged since 2012. Per $100 or part of $100.

function saGeneral(v) {
  if (v <= 12000)  return per100(v, 1.00);
  if (v <= 30000)  return 120 + per100(v - 12000, 2.00);
  if (v <= 50000)  return 480 + per100(v - 30000, 3.00);
  if (v <= 100000) return 1080 + per100(v - 50000, 3.50);
  if (v <= 200000) return 2830 + per100(v - 100000, 4.00);
  if (v <= 250000) return 6830 + per100(v - 200000, 4.25);
  if (v <= 300000) return 8955 + per100(v - 250000, 4.75);
  if (v <= 500000) return 11330 + per100(v - 300000, 5.00);
  return 21330 + per100(v - 500000, 5.50);
}

function sa({ value, firstHomeBuyer, propertyType }) {
  // Commercial and industrial: zero duty since 1 July 2018.
  if (propertyType === 'commercial' || propertyType === 'industrial') return 0;
  // First home buyers: new homes, off-the-plan and land to build, no value cap.
  // NO relief on established homes.
  if (firstHomeBuyer && (propertyType === 'new' || propertyType === 'offThePlan' || propertyType === 'vacantLand')) {
    return 0;
  }
  return round2(saGeneral(value));
}

// ─── WA ──────────────────────────────────────────────────────────────────────

function waGeneral(v) {
  if (v <= 120000) return per100(v, 1.90);
  if (v <= 150000) return 2280 + per100(v - 120000, 2.85);
  if (v <= 360000) return 3135 + per100(v - 150000, 3.80);
  if (v <= 725000) return 11115 + per100(v - 360000, 4.75);
  return 28452.50 + per100(v - 725000, 5.15); // no premium tier — 5.15% is the top rate
}

function wa({ value, firstHomeBuyer, propertyType, contractDate }) {
  // First Home Owner Rate. Thresholds lifted on 7 May 2026 and the
  // metro/regional distinction was removed. RevenueWA reassessed and refunded
  // back to that date, so a purchase in the interim may be refundable.
  const post7May2026 = !contractDate || contractDate >= '2026-05-07';
  const homeExempt = post7May2026 ? 600000 : 430000;
  const homeCap    = post7May2026 ? 800000 : 530000;
  const landExempt = post7May2026 ? 450000 : 300000;
  const landCap    = post7May2026 ? 550000 : 400000;

  if (firstHomeBuyer) {
    if (propertyType === 'vacantLand') {
      if (value <= landExempt) return 0;
      if (value <= landCap) return round2(per100(value - landExempt, 20.14));
    } else {
      if (value <= homeExempt) return 0;
      if (value <= homeCap) return round2(per100(value - homeExempt, 16.15));
    }
  }
  return round2(waGeneral(value));
}

// ─── TAS ─────────────────────────────────────────────────────────────────────
// Unchanged since 21 October 2013. Same rates for all buyer and property types.

function tasGeneral(v) {
  if (v <= 3000)   return 50; // flat minimum
  if (v <= 25000)  return 50 + per100(v - 3000, 1.75);
  if (v <= 75000)  return 435 + per100(v - 25000, 2.25);
  if (v <= 200000) return 1560 + per100(v - 75000, 3.50);
  if (v <= 375000) return 5935 + per100(v - 200000, 4.00);
  if (v <= 725000) return 12935 + per100(v - 375000, 4.25);
  return 27810 + per100(v - 725000, 4.50);
}

function tas({ value, firstHomeBuyer, propertyType, settlementDate }) {
  // Permanent uncapped new-home exemption.
  if (firstHomeBuyer && propertyType === 'new') return 0;
  // The established-home FHB exemption ENDED 30 June 2026, and the test is the
  // SETTLEMENT date, not the contract date. A contract signed before the cutoff
  // that settles after it gets no relief.
  if (firstHomeBuyer && settlementDate && settlementDate <= '2026-06-30' && value <= 750000) {
    return 0;
  }
  return round2(tasGeneral(value));
}

// ─── ACT ─────────────────────────────────────────────────────────────────────
// Above $300,000 both schedules use identical marginal rates, so the entire
// owner-occupier benefit is a CONSTANT $2,992 reduction. Implemented as one
// table plus that constant.

const ACT_OWNER_OCCUPIER_SAVING = 2992;

function actStandard(v) {
  if (v <= 200000)  return per100(v, 1.20);
  if (v <= 300000)  return 2400 + per100(v - 200000, 2.20);
  if (v <= 500000)  return 4600 + per100(v - 300000, 3.40);
  if (v <= 750000)  return 11400 + per100(v - 500000, 4.32);
  if (v <= 1000000) return 22200 + per100(v - 750000, 5.90);
  if (v <= 1455000) return 36950 + per100(v - 1000000, 6.40);
  return v * 0.0454; // flat on the ENTIRE value
}

function actOwnerOccupier(v) {
  if (v <= 260000) return per100(v, 0.28);
  if (v <= 300000) return 728 + per100(v - 260000, 2.20);
  if (v > 1455000) return round2(v * 0.0454 - 35238);
  return actStandard(v) - ACT_OWNER_OCCUPIER_SAVING;
}

function act({ value, schedule, contractDate, ownedPropertyLast5Years = true, willOccupy12Months = false }) {
  // The Home Buyer Concession Scheme is NOT a first-home-buyer test — it turns
  // on not having owned property in the last five years. From 1 July 2026 the
  // value cap and income test were removed entirely.
  const post1Jul2026 = !contractDate || contractDate >= '2026-07-01';
  if (post1Jul2026 && !ownedPropertyLast5Years && willOccupy12Months) return 0;

  if (schedule === 'Owner-occupier') return round2(actOwnerOccupier(value));
  return round2(actStandard(value));
}

// ─── NT ──────────────────────────────────────────────────────────────────────
// No first home buyer duty concession exists. A $50,000 HomeGrown Territory
// Grant applies instead, which is a grant rather than a duty reduction.

function nt({ value }) {
  if (value <= 525000) {
    const V = value / 1000;
    return round2(0.06571441 * V * V + 15 * V); // quadratic in V², not V
  }
  // Above the threshold the rate applies to the ENTIRE value, not marginally.
  if (value <= 3000000) return round2(value * 0.0495);
  if (value <= 5000000) return round2(value * 0.0575);
  return round2(value * 0.0595);
}

// ─── Foreign purchaser surcharges ────────────────────────────────────────────

export const FOREIGN_SURCHARGE = {
  NSW: 0.09, VIC: 0.08, QLD: 0.08, TAS: 0.08,
  SA: 0.07, WA: 0.07, ACT: 0, NT: 0,
};

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const HANDLERS = { NSW: nsw, VIC: vic, QLD: qld, SA: sa, WA: wa, TAS: tas, ACT: act, NT: nt };

/**
 * @param {object} opts
 * @param {string} opts.state            One of JURISDICTIONS.
 * @param {number} opts.value            Dutiable value.
 * @param {boolean} [opts.firstHomeBuyer]
 * @param {string} [opts.propertyType]   'established' | 'new' | 'offThePlan' | 'vacantLand' | 'commercial' | 'industrial'
 * @param {string} [opts.schedule]       'General' | 'PPR' | 'Home concession' | 'Owner-occupier'
 * @param {string} [opts.contractDate]   ISO date — drives the mid-year branches.
 * @param {string} [opts.settlementDate] ISO date — TAS tests on settlement, not contract.
 * @param {boolean} [opts.foreignPurchaser]
 */
export function calcStampDuty(opts) {
  const { state, value = 0, foreignPurchaser = false } = opts;
  const handler = HANDLERS[state];
  if (!handler) throw new Error(`Unknown jurisdiction: ${state}`);
  if (value <= 0) return { duty: 0, surcharge: 0, total: 0 };

  const duty = handler({ propertyType: 'established', ...opts });
  const surcharge = foreignPurchaser ? round2(value * (FOREIGN_SURCHARGE[state] ?? 0)) : 0;

  return { duty, surcharge, total: round2(duty + surcharge) };
}

export function stampDutyFor(state, value, opts = {}) {
  return calcStampDuty({ state, value, ...opts }).duty;
}
