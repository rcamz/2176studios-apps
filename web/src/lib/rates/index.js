// Date-keyed rate registry.
//
// Several figures change WITHIN a financial year — Age Pension in September,
// WA duty in May, QLD residency rules in August, FBT on 1 April. A single
// per-FY constants object returns wrong answers for part of the year, so every
// rate is stored as a dated series and resolved against a specific date.
//
// Verified 10 September 2026 against FY2026-27-rates-audit-v2.md.

import { incomeTax } from './incomeTax.js';
import { medicare } from './medicare.js';
import { help } from './help.js';
import { superannuation } from './super.js';
import { fhsss } from './fhsss.js';
import { termination } from './termination.js';
import { cgt } from './cgt.js';
import { fbt } from './fbt.js';
import { lending } from './lending.js';
import { agePension } from './agePension.js';
import { health } from './health.js';

const SERIES = {
  incomeTax, medicare, help, superannuation, fhsss,
  termination, cgt, fbt, lending, agePension, health,
};

// Confidence, per the source audit. Anything not 'P' should surface its source
// date in the calculator's methodology note.
export const CONFIDENCE = {
  P: 'Primary source — ATO, revenue office, APRA, Treasury or legislation',
  S: 'Secondary — consistent across reputable non-primary sources',
  D: 'Derived — calculated from a published method, validated against anchors',
  I: 'Inferred — reasoned from a primary source but not directly stated',
  UNVERIFIED: 'Could not be confirmed — displayed with a caveat',
};

export function toISO(date) {
  if (typeof date === 'string') return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

// Australian financial year containing a date, e.g. '2026-27'.
export function financialYear(date) {
  const d = toISO(date);
  const year = +d.slice(0, 4);
  const month = +d.slice(5, 7);
  const start = month >= 7 ? year : year - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export function financialYearRange(fy) {
  const start = +fy.slice(0, 4);
  return { from: `${start}-07-01`, to: `${start + 1}-06-30` };
}

// Pick the entry in a dated series whose window contains `date`.
export function resolve(series, date, label = 'rate') {
  const d = toISO(date);
  const hit = series.find(
    (e) => e.effective_from <= d && (e.effective_to === null || d <= e.effective_to)
  );
  if (!hit) {
    throw new Error(
      `No ${label} defined for ${d}. Series covers ` +
      series.map((e) => `${e.effective_from}..${e.effective_to ?? 'open'}`).join(', ')
    );
  }
  return hit;
}

// Resolve every domain at once. Pass a date to model a different year —
// this is what backs the financial-year selector.
export function ratesFor(date = new Date()) {
  const d = toISO(date);
  const out = { __date: d, __fy: financialYear(d) };
  for (const [name, series] of Object.entries(SERIES)) {
    out[name] = resolve(series, d, name);
  }
  return out;
}

// Financial years the registry can FULLY answer for — every domain must resolve
// across the whole year. Domains verified only from FY2026-27 therefore exclude
// earlier years from the selector, even though the income tax series reaches
// further back for regression testing.
export function availableFinancialYears() {
  const candidates = new Set();
  for (const series of Object.values(SERIES)) {
    for (const entry of series) candidates.add(financialYear(entry.effective_from));
  }
  return [...candidates].sort().filter((fy) => {
    const { from, to } = financialYearRange(fy);
    try {
      // Both ends must resolve, so a year is only offered when it is covered
      // end to end rather than picked up by a mid-year change.
      ratesFor(from);
      ratesFor(to);
      return true;
    } catch {
      return false;
    }
  });
}

// Every non-primary figure in play at a given date, for the methodology note.
export function caveatsFor(date = new Date()) {
  const r = ratesFor(date);
  return Object.entries(SERIES)
    .map(([name]) => r[name])
    .filter((e) => e.confidence && e.confidence !== 'P')
    .map((e) => ({ domain: e.__domain, confidence: e.confidence, source: e.source, note: e.note }));
}
