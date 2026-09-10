// Version manifest.
//
// Two layers, deliberately:
//
//   version   — hand-curated semver. Says how much a calculator has changed
//               in a way a human cares about. Bump it when you change one.
//   git data  — injected at build time from the actual commit history. Says
//               what is truly deployed. Cannot be forgotten or faked.
//
// If the two ever disagree — a calculator whose files changed after its
// version was last bumped — the stocktake flags it rather than quietly
// showing a stale number.

import buildInfo from 'virtual:build-info';

const S = (id, name, path) => ({ id, name, path });

// Shared modules every calculator depends on. A change here moves the numbers
// in every calculator that imports it, which is why dependants inherit the
// date rather than appearing untouched.
export const SHARED = [
  S('rates',      'Rates registry (FY2026-27)', 'web/src/lib/rates'),
  S('paytax',     'Tax engine',                 'web/src/lib/paytax.js'),
  S('amortize',   'Amortisation engine',        'web/src/lib/amortize.js'),
  S('stampduty',  'Stamp duty, 8 jurisdictions','web/src/lib/stampduty.js'),
  S('lmi',        'Lenders mortgage insurance', 'web/src/lib/lmi.js'),
  S('format',     'Shared formatters',          'web/src/lib/format.js'),
  S('urlState',   'URL state helpers',          'web/src/lib/urlState.js'),
  S('vectors',    'Regression test vectors',    'web/src/lib/vectors'),
  S('styles',     'Shared stylesheet',          'web/src/calc-shared.css'),
  S('tokens',     'Design tokens',              'web/src/base.css'),
];

const SHARED_BY_ID = Object.fromEntries(SHARED.map((s) => [s.id, s]));

// `2.x` marks a calculator rewritten against the verified FY2026-27 rates.
// Anything still on 1.x has not had that treatment.
export const CALCS = [
  {
    id: 'home', name: 'Home', href: '/', version: '1.1.0',
    paths: ['web/src/Home.jsx', 'web/src/Home.css'],
    deps: ['tokens'],
  },
  {
    id: 'mortgage', name: 'Mortgage Repayments', href: '/mortgagecalc', version: '2.1.0',
    paths: ['web/src/CalcInstance.jsx', 'web/src/MortgageCalc.jsx'],
    deps: ['amortize', 'lmi', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'paytax', name: 'Pay / Tax', href: '/paytaxcalc', version: '2.1.0',
    paths: ['web/src/PayTaxInstance.jsx', 'web/src/PayTaxCalc.jsx'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'borrowingpower', name: 'Borrowing Power', href: '/borrowingpowercalc', version: '2.0.0',
    paths: ['web/src/BorrowingPowerInstance.jsx', 'web/src/BorrowingPowerCalc.jsx', 'web/src/lib/borrowingpower.js'],
    deps: ['paytax', 'rates', 'lmi', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'rentvbuy', name: 'Rent vs. Buy', href: '/rentvbuycalc', version: '2.0.0',
    paths: ['web/src/RentVBuyInstance.jsx', 'web/src/RentVBuyCalc.jsx', 'web/src/lib/rentvbuy.js'],
    deps: ['amortize', 'stampduty', 'lmi', 'paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'cgt', name: 'Capital Gains Tax', href: '/cgtcalc', version: '2.0.0',
    paths: ['web/src/CGTInstance.jsx', 'web/src/CGTCalc.jsx', 'web/src/lib/cgt.js'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'redundancy', name: 'Redundancy Pay', href: '/redundancycalc', version: '2.0.0',
    paths: ['web/src/RedundancyInstance.jsx', 'web/src/RedundancyCalc.jsx', 'web/src/lib/redundancy.js'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'salarysacrifice', name: 'Salary Sacrifice', href: '/salarysacrificecalc', version: '2.0.0',
    paths: ['web/src/SalarySacrificeInstance.jsx', 'web/src/SalarySacrificeCalc.jsx', 'web/src/lib/salarysacrifice.js'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'fhsss', name: 'First Home Super Saver', href: '/fhssscalc', version: '2.0.0',
    paths: ['web/src/FHSSSInstance.jsx', 'web/src/FHSSSCalc.jsx', 'web/src/lib/fhsss.js'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'retirement', name: 'Retirement / Super', href: '/retirementcalc', version: '2.0.0',
    paths: ['web/src/RetirementInstance.jsx', 'web/src/RetirementCalc.jsx', 'web/src/lib/retirement.js'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'novatedlease', name: 'Novated Lease', href: '/novatedleasecalc', version: '2.0.0',
    paths: ['web/src/NovatedLeaseInstance.jsx', 'web/src/NovatedLeaseCalc.jsx', 'web/src/lib/novatedlease.js'],
    deps: ['paytax', 'rates', 'format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'savings', name: 'Savings', href: '/savingscalc', version: '2.0.0',
    paths: ['web/src/SavingsInstance.jsx', 'web/src/SavingsCalc.jsx', 'web/src/lib/savings.js'],
    deps: ['format', 'urlState', 'styles', 'tokens'],
  },
  {
    id: 'health', name: 'Health', href: '/healthcalc', version: '2.0.0',
    paths: ['web/src/HealthInstance.jsx', 'web/src/HealthCalc.jsx', 'web/src/lib/health.js'],
    deps: ['rates', 'format', 'urlState', 'styles', 'tokens'],
  },
];

const CALC_BY_ID = Object.fromEntries(CALCS.map((c) => [c.id, c]));

// Rate data freshness is separate from code freshness — a calculator can be
// untouched for months and still be correct, or freshly deployed and running
// stale figures. Both belong on the stocktake.
export const RATES_VERIFIED = '2026-09-10';
export const RATES_NEXT_REVIEW = '2027-04-01'; // FBT year rollover, per DEFERRED.md

export const BUILD = {
  commit: buildInfo.commit,
  commitDate: buildInfo.commitDate,
  branch: buildInfo.branch,
  dirty: buildInfo.dirty,
  builtAt: buildInfo.builtAt,
  // False when the build ran against a shallow clone or without git, in which
  // case per-file dates are withheld rather than shown as 12 identical rows.
  perFileAvailable: buildInfo.perFileAvailable !== false,
  shallow: Boolean(buildInfo.shallow),
  // 'git' | 'git (unshallowed)' | 'snapshot' — where the per-file dates came
  // from. CI clones shallow, so a snapshot committed from a full clone is the
  // usual source in production.
  source: buildInfo.source ?? 'git',
  snapshotFrom: buildInfo.snapshotFrom ?? null,
};

function fileInfo(path) {
  return buildInfo.files?.[path] ?? { lastCommit: '', lastDate: '', lastSubject: '', commits: 0 };
}

function latestOf(paths) {
  let best = null;
  for (const p of paths) {
    const f = fileInfo(p);
    if (f.lastDate && (!best || f.lastDate > best.lastDate)) best = { ...f, path: p };
  }
  return best ?? { lastCommit: '', lastDate: '', lastSubject: '', commits: 0, path: paths[0] };
}

export function sharedStatus(id) {
  const s = SHARED_BY_ID[id];
  return { ...s, ...latestOf([s.path]) };
}

/**
 * Resolved status for one calculator.
 *
 * `lastDate` is the later of its own files and any shared module it depends
 * on — because when the tax engine changes, a calculator's numbers change
 * even though none of its own files were touched. Reporting it as unchanged
 * on the day its output moved would be the wrong answer.
 */
export function calcStatus(id) {
  const c = CALC_BY_ID[id];
  if (!c) return null;

  const own = latestOf(c.paths);
  const depStatuses = c.deps.map(sharedStatus);
  const newestDep = depStatuses.reduce(
    (a, b) => (b.lastDate && (!a || b.lastDate > a.lastDate) ? b : a),
    null
  );

  const viaDependency = Boolean(newestDep && newestDep.lastDate > own.lastDate);
  const lastDate = viaDependency ? newestDep.lastDate : own.lastDate;

  return {
    ...c,
    version: c.version,
    lastDate,
    lastCommit: viaDependency ? newestDep.lastCommit : own.lastCommit,
    lastSubject: viaDependency ? newestDep.lastSubject : own.lastSubject,
    // True when the most recent change came from a shared module rather than
    // this calculator's own files.
    viaDependency,
    changedBy: viaDependency ? newestDep.name : null,
    commits: c.paths.reduce((n, p) => n + fileInfo(p).commits, 0),
    deps: depStatuses,
  };
}

export function allCalcStatuses() {
  return CALCS.map((c) => calcStatus(c.id));
}

export function allSharedStatuses() {
  return SHARED.map((s) => sharedStatus(s.id));
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeDate(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
}
