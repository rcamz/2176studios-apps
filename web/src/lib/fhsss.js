// First Home Super Saver Scheme.
//
// Three things in this scheme are easy to get wrong and all three change the
// answer materially:
//
//  1. ORDERING. The $15,000 annual and $50,000 lifetime limits count ELIGIBLE
//     CONTRIBUTIONS, and the 85% concessional haircut is applied afterwards.
//     $25,000 sacrificed in one year → $15,000 counted → $12,750 releasable.
//     Applying 85% first gives $21,250, capped to $15,000 — wrong by $2,250.
//  2. ASSOCIATED EARNINGS are not a flat rate on the balance. They are the
//     shortfall interest charge (90-day BAB + 3%), set quarterly and compounded
//     DAILY, with the daily rate being the annual rate ÷ days in the CALENDAR
//     year (s280-105 Sch 1 TAA 1953). They accrue on each year's releasable
//     amount from 1 July of the financial year the contribution was made in.
//  3. WITHDRAWAL TAX. The released concessional amount and the earnings are
//     assessable with a 30% offset, and Medicare applies — so the effective
//     rate is marginal + 2% − 30%, not marginal − 30%.
//
// The released amount is EXCLUDED from both HELP repayment income and MLS
// income, so it is never fed into those bases here.

import { calcPayTax, taxOnAdditionalIncome, division293On } from './paytax.js';
import { sgContributionFor } from './salarysacrifice.js';
import { ratesFor, financialYear } from './rates/index.js';

// ─── Date primitives ─────────────────────────────────────────────────────────
// Everything is ISO date strings in UTC. Daily compounding over a decade is
// sensitive to off-by-one days, so the arithmetic is kept explicit.

const MS_DAY = 86_400_000;
const asDate = (iso) => new Date(`${iso}T00:00:00Z`);
const asISO = (d) => d.toISOString().slice(0, 10);

export function addDays(iso, n) {
  return asISO(new Date(asDate(iso).getTime() + n * MS_DAY));
}

export function daysBetween(fromISO, toISO) {
  return Math.round((asDate(toISO) - asDate(fromISO)) / MS_DAY);
}

function isLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInCalendarYear(iso) {
  return isLeap(+iso.slice(0, 4)) ? 366 : 365;
}

const jan1Next = (iso) => `${+iso.slice(0, 4) + 1}-01-01`;

// ─── Shortfall interest charge ───────────────────────────────────────────────

// The published quarter covering a date. Quarters are announced about two weeks
// ahead, so anything past the last published quarter falls back to the most
// recent known rate and is flagged `projected` — the caller must surface that.
export function sicRateFor(dateISO, rates) {
  const quarters = rates.fhsss.sicQuarters;
  const hit = quarters.find((q) => q.from <= dateISO && dateISO <= q.to);
  if (hit) {
    return { annualRate: hit.annualRate, from: hit.from, to: hit.to, projected: false };
  }
  // Not published (before the series starts, a gap in it, or a future quarter).
  // Hold the nearest known rate and stop the segment where the series resumes.
  const next = quarters.find((q) => q.from > dateISO);
  const prior = [...quarters].reverse().find((q) => q.to < dateISO);
  const fallback = prior ?? quarters[0];
  return {
    annualRate: fallback.annualRate,
    from: null,
    to: null,
    projected: true,
    knownFrom: next ? next.from : undefined,
  };
}

// Daily-compounded growth factor between two dates. Segments break at quarter
// boundaries (the rate changes) and at calendar-year boundaries (the divisor
// changes from 365 to 366 or back).
export function sicAccrualFactor(fromISO, toISO, rates) {
  if (!(fromISO < toISO)) return { factor: 1, projected: false, quarters: [] };

  let cursor = fromISO;
  let factor = 1;
  let projected = false;
  const quarters = [];

  // Bounded so a malformed rate series can never spin: ~5 breaks a year.
  for (let guard = 0; cursor < toISO && guard < 2000; guard++) {
    const r = sicRateFor(cursor, rates);
    if (r.projected) projected = true;

    const bounds = [toISO, jan1Next(cursor)];
    if (r.to) bounds.push(addDays(r.to, 1));
    if (r.knownFrom) bounds.push(r.knownFrom);
    const segEnd = bounds.sort()[0];

    const days = daysBetween(cursor, segEnd);
    const daily = r.annualRate / daysInCalendarYear(cursor);
    factor *= Math.pow(1 + daily, days);

    quarters.push({ from: cursor, to: segEnd, days, annualRate: r.annualRate, projected: r.projected });
    cursor = segEnd;
  }

  return { factor, projected, quarters };
}

// ─── Releasable contributions ────────────────────────────────────────────────

// Per-year and lifetime limits count CONTRIBUTIONS; the 85% / 100% release
// rates are applied to what was counted. Where a year's contributions exceed
// the annual limit the concessional amounts are counted first — the ATO counts
// in the order contributed, and without contribution dates this is the
// conservative choice, since concessional dollars release at only 85%.
export function releasableBreakdown({
  salarySacrificed = 0,
  personalContributions = 0,
  deductionClaimed = false,
  concessionalHeadroom = Infinity,
  years = 1,
  rates = ratesFor(new Date()),
} = {}) {
  const f = rates.fhsss;

  const concessionalPerYear = Math.max(
    0,
    Math.min(salarySacrificed + (deductionClaimed ? personalContributions : 0), concessionalHeadroom)
  );
  const nonConcessionalPerYear = deductionClaimed ? 0 : Math.max(0, personalContributions);

  const byYear = [];
  let countedConcessional = 0;
  let countedNonConcessional = 0;

  for (let y = 1; y <= Math.max(0, Math.floor(years)); y++) {
    const lifetimeRoom = f.lifetimeLimit - countedConcessional - countedNonConcessional;
    if (lifetimeRoom <= 0) break;

    let room = Math.min(f.annualLimit, lifetimeRoom);
    const c = Math.min(concessionalPerYear, room);
    room -= c;
    const n = Math.min(nonConcessionalPerYear, room);

    countedConcessional += c;
    countedNonConcessional += n;
    byYear.push({
      year: y,
      countedConcessional: c,
      countedNonConcessional: n,
      releasable: c * f.concessionalReleasableRate + n * f.nonConcessionalReleasableRate,
    });
  }

  const releasableConcessional = countedConcessional * f.concessionalReleasableRate;
  const releasableNonConcessional = countedNonConcessional * f.nonConcessionalReleasableRate;

  return {
    byYear,
    countedConcessional,
    countedNonConcessional,
    countedTotal: countedConcessional + countedNonConcessional,
    releasableConcessional,
    releasableNonConcessional,
    releasable: releasableConcessional + releasableNonConcessional,
    lifetimeLimitReached: countedConcessional + countedNonConcessional >= f.lifetimeLimit,
  };
}

// Contributions releasable, before associated earnings. Drives the §8.8 vectors.
export function releasableAmount(input) {
  return releasableBreakdown(input).releasable;
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

// Every condition must be met. The last one is the trap: the determination has
// to be requested BEFORE your interest in the land is registered. Miss it and
// the whole benefit is gone — no partial release, no second chance.
export const ELIGIBILITY_ITEMS = [
  {
    key: 'age18Plus',
    label: 'I am 18 or older',
    detail: 'Required when you request the determination. Contributions made before you turned 18 still count.',
  },
  {
    key: 'neverOwnedProperty',
    label: 'I have never owned property in Australia',
    detail: 'Includes investment property, vacant land, commercial property, a lease of land, or an inherited share with your name on the title. Utility bills alone are not ownership. A financial hardship determination is the only exception, and it must be granted before you start saving.',
  },
  {
    key: 'noPriorRelease',
    label: 'I have never had an FHSS release before',
    detail: 'One use only, even if you released less than the maximum.',
  },
  {
    key: 'onTitle',
    label: 'My name will be on the title',
    detail: 'You must hold an interest in the property you buy.',
  },
  {
    key: 'residentialOnly',
    label: 'It is residential property I intend to live in',
    detail: 'Excludes houseboats, motor homes, and vacant land unless a construction contract is entered within 12 months of the release request.',
  },
  {
    key: 'willOccupy',
    label: 'I will live in it for at least 6 of the first 12 months',
    detail: 'You must genuinely intend to occupy as soon as practicable, and occupy for 6 of the first 12 months it is practicable to do so.',
  },
  {
    key: 'determinationBeforeRegistration',
    label: 'I will request the determination BEFORE my interest in the land is registered',
    detail: 'The trap. Once you hold a relevant interest in real property — generally on settlement — you can no longer make a valid request and the entire benefit is lost. Sign the contract within a window from 90 days before the request to 12 months after, and notify the ATO within 90 days of signing.',
    critical: true,
  },
];

export function checkEligibility(answers = {}) {
  const items = ELIGIBILITY_ITEMS.map((item) => ({
    ...item,
    // Unanswered is treated as met, so the calculator still shows a number on
    // first load; anything explicitly answered "no" blocks.
    met: answers[item.key] !== false,
  }));
  const blocking = items.filter((i) => !i.met);
  return {
    items,
    blocking,
    eligible: blocking.length === 0,
    criticalFailure: blocking.some((i) => i.critical),
  };
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function calcFHSSS(inputs = {}) {
  const {
    grossIncome = 0,
    annualConcessional = 0,
    annualNonConcessional = 0,
    years = 3,
    sgRate = 12,
    date = new Date(),
    residency = 'resident',
    eligibility: eligibilityAnswers = {},
  } = inputs;

  const rates = inputs.rates ?? ratesFor(date);
  const f = rates.fhsss;
  const contributingYears = Math.max(1, Math.min(Math.floor(years) || 1, 10));

  // ── Contributions ──
  const sgContribution = sgContributionFor(grossIncome, sgRate, rates);
  const concessionalCap = rates.superannuation.concessionalCap;
  const concessionalHeadroom = Math.max(0, concessionalCap - sgContribution);
  const concessionalCapExceeded = sgContribution + annualConcessional > concessionalCap;

  const breakdown = releasableBreakdown({
    salarySacrificed: annualConcessional,
    personalContributions: annualNonConcessional,
    deductionClaimed: false,
    concessionalHeadroom,
    years: contributingYears,
    rates,
  });

  // ── Associated earnings ──
  // Contributions in a financial year are deemed to earn from 1 July of that
  // year, whenever in the year they were actually made. The determination is
  // modelled as requested at the end of the final contribution year.
  const startYear = +financialYear(rates.__date).slice(0, 4);
  const trancheStart = (yr) => `${startYear + yr - 1}-07-01`;
  const determinationDate = `${startYear + contributingYears}-06-30`;

  let sicProjected = false;
  const earningsAt = (asOfISO) => {
    let earnings = 0;
    for (const y of breakdown.byYear) {
      const from = trancheStart(y.year);
      if (from >= asOfISO) continue;
      const { factor, projected } = sicAccrualFactor(from, asOfISO, rates);
      if (projected) sicProjected = true;
      earnings += y.releasable * (factor - 1);
    }
    return earnings;
  };

  const yearData = [];
  let cumulativeReleasable = 0;
  for (const y of breakdown.byYear) {
    cumulativeReleasable += y.releasable;
    const asOf = `${startYear + y.year}-06-30`;
    const earnings = earningsAt(asOf);
    yearData.push({
      year: y.year,
      releasable: Math.round(cumulativeReleasable),
      earnings: Math.round(earnings),
      total: Math.round(cumulativeReleasable + earnings),
    });
  }

  const totalReleasable = breakdown.releasable;
  const totalEarnings = earningsAt(determinationDate);
  const totalWithEarnings = totalReleasable + totalEarnings;

  const sicRatesUsed = [
    ...new Map(
      sicAccrualFactor(trancheStart(1), determinationDate, rates).quarters.map((q) => [
        `${q.annualRate}|${q.projected}`,
        { annualRate: q.annualRate, projected: q.projected },
      ])
    ).values(),
  ];

  // ── Tax on the released amount ──
  // Only the concessional portion and the earnings are assessable; released
  // non-concessional contributions are tax-free. Income tax is taken by
  // differencing so an amount straddling a bracket is taxed correctly, then
  // Medicare is added and the 30% offset applied.
  const withSacrifice = calcPayTax({
    grossIncome, sgRate, salarySacrifice: annualConcessional, residency, rates,
  });
  const withoutSacrifice = calcPayTax({ grossIncome, sgRate, residency, rates });

  const assessableAmount = breakdown.releasableConcessional + totalEarnings;
  const medicareRate = residency === 'resident' ? rates.medicare.levyRate : 0;
  const marginalRate = withSacrifice.marginalRate;

  const incomeTaxOnRelease = taxOnAdditionalIncome(
    withSacrifice.taxableIncome, assessableAmount, { residency, rates }
  );
  const medicareOnRelease = assessableAmount * medicareRate;
  const offsetOnRelease = assessableAmount * f.withdrawalOffset;
  const withdrawalTax = Math.max(0, incomeTaxOnRelease + medicareOnRelease - offsetOnRelease);

  // Headline rate the fund withholds at: marginal + Medicare − 30%.
  const withholdingRate = Math.max(0, marginalRate + medicareRate - f.withdrawalOffset);
  const effectiveWithdrawalRate = assessableAmount > 0 ? withdrawalTax / assessableAmount : 0;

  const netDeposit = totalWithEarnings - withdrawalTax;

  // ── Contribution-stage saving ──
  // One figure, not two. Income tax and levies saved, less the 15% the fund
  // takes on the way in, less any Division 293 the contribution triggers.
  const contributionsTax = annualConcessional * rates.superannuation.contributionsTax;
  const division293Without = division293On(withoutSacrifice.taxableIncome, sgContribution, rates);
  const division293 = division293On(
    withSacrifice.taxableIncome, sgContribution + annualConcessional, rates
  );
  const division293Extra = division293 - division293Without;
  const annualTaxSaving =
    (withoutSacrifice.totalTax - withSacrifice.totalTax) - contributionsTax - division293Extra;
  const totalTaxSaving = annualTaxSaving * contributingYears;
  const division293Applies = division293 > 0;

  const eligibility = checkEligibility(eligibilityAnswers);

  return {
    // contributions
    annualReleasable: breakdown.byYear[0]?.releasable ?? 0,
    totalReleasable,
    countedContributions: breakdown.countedTotal,
    releasableConcessional: breakdown.releasableConcessional,
    releasableNonConcessional: breakdown.releasableNonConcessional,
    lifetimeLimitReached: breakdown.lifetimeLimitReached,
    concessionalCapExceeded,
    concessionalCap,
    concessionalHeadroom,
    sgContribution,

    // earnings
    totalEarnings,
    totalWithEarnings,
    yearData,
    determinationDate,
    sicProjected,
    sicRatesUsed,

    // withdrawal
    assessableAmount,
    withdrawalTax,
    netDeposit,
    withholdingRate,
    effectiveWithdrawalRate,
    marginalRate,
    medicareRate,
    withdrawalOffset: f.withdrawalOffset,

    // contribution-stage saving
    annualTaxSaving,
    totalTaxSaving,
    division293,
    division293Extra,
    division293Applies,

    // gates and provenance
    eligibility,
    contributingYears,
    excludedFromHelpIncome: f.excludedFromHelpIncome,
    excludedFromMlsIncome: f.excludedFromMlsIncome,
    annualLimit: f.annualLimit,
    lifetimeLimit: f.lifetimeLimit,
    rates,
  };
}
