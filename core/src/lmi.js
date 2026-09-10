// Lenders Mortgage Insurance.
//
// Premiums are indicative. Helia and QBE underwrite virtually all Australian
// residential LMI and published dollar examples vary by up to 2x for the same
// scenario because lender rate cards genuinely differ — so this works in
// percentage-of-loan bands, which are the stable part.
//
// Rates rise NON-LINEARLY with cliffs at 85%, 90% and 95%. Crossing 90% to 91%
// can add ~0.6% of the loan. Never interpolate smoothly across a cliff — that
// misleads exactly the users sitting nearest one.

import { ratesFor } from './rates/index.js';

export const LMI_DISCLOSURE =
  'LMI numbers vary from bank to bank. These are indicative, for research purposes.';

export function lvrFor(loanAmount, propertyValue) {
  if (!propertyValue || propertyValue <= 0) return null;
  return loanAmount / propertyValue;
}

/**
 * @returns {{ lvr, payable, low, high, midpoint, band, capitalisedLoan, disclosure, zeroPaths }}
 */
export function estimateLmi({
  loanAmount,
  propertyValue,
  date = new Date(),
  firstHomeGuarantee = false,
  investor = false,
  capitalise = true,
}) {
  const rates = ratesFor(date);
  const bands = rates.lending.lmiBands;
  const lvr = lvrFor(loanAmount, propertyValue);

  const base = {
    lvr,
    payable: false,
    low: 0, high: 0, midpoint: 0,
    band: null,
    capitalisedLoan: loanAmount,
    disclosure: LMI_DISCLOSURE,
    zeroPaths: [],
  };

  if (lvr === null) return base;

  // The guarantee removes LMI entirely — for an eligible first home buyer this
  // matters far more than premium precision.
  if (firstHomeGuarantee) {
    return { ...base, zeroPaths: ['First Home Guarantee — no LMI charged'] };
  }
  if (lvr <= 0.80) {
    return { ...base, zeroPaths: ['LVR is at or below 80%'] };
  }

  // Most lenders cap investors at 90% rather than 95%, and price above
  // owner-occupied at the same LVR.
  const cap = investor ? rates.lending.lmiInvestorMaxLvr : 0.95;
  const overCap = lvr > cap;

  const band = bands.find((b) => lvr > b.fromLvr && lvr <= b.toLvr) ?? bands[bands.length - 1];
  const low = loanAmount * band.low;
  const high = loanAmount * band.high;
  const midpoint = (low + high) / 2;

  return {
    ...base,
    payable: true,
    low, high, midpoint,
    band: { from: band.fromLvr, to: band.toLvr },
    overCap,
    overCapNote: overCap
      ? `Most lenders cap ${investor ? 'investor' : 'this'} lending at ${Math.round(cap * 100)}% LVR.`
      : null,
    capitalisedLoan: capitalise ? loanAmount + midpoint : loanAmount,
    // Capitalising lifts the effective LVR and roughly doubles the true cost
    // over a 30-year term.
    capitalisedLvr: capitalise && propertyValue ? (loanAmount + midpoint) / propertyValue : lvr,
    zeroPaths: [
      'Deposit of 20% or more',
      'First Home Guarantee, if eligible',
      'Professional waiver (medical, legal, accounting) to 90% LVR',
      'Family guarantor',
    ],
  };
}

// Deposit needed to avoid LMI entirely.
export function depositToAvoidLmi(propertyValue) {
  return propertyValue * 0.20;
}
