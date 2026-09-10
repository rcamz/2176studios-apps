#!/usr/bin/env node
//
// Records per-file git history to a committed JSON snapshot.
//
// CI providers clone with --depth=1, which leaves one commit of history. Live
// `git log -1 -- <path>` then returns that same commit for every path, so the
// build cannot recover real per-file dates. This runs on a machine that has
// the full history and commits the answer alongside the code.
//
// Run before committing:  npm run version:snapshot

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'web/src/generated/build-manifest.json');

const git = (cmd, fallback = '') => {
  try {
    return execSync(`git -C "${ROOT}" ${cmd}`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
};

// Kept in step with the TRACKED list in web/vite.config.js.
const PATHS = [
  'web/src/Home.jsx', 'web/src/Home.css',
  'web/src/CalcInstance.jsx', 'web/src/MortgageCalc.jsx',
  'web/src/PayTaxInstance.jsx', 'web/src/PayTaxCalc.jsx',
  'web/src/BorrowingPowerInstance.jsx', 'web/src/BorrowingPowerCalc.jsx', 'web/src/lib/borrowingpower.js',
  'web/src/RentVBuyInstance.jsx', 'web/src/RentVBuyCalc.jsx', 'web/src/lib/rentvbuy.js',
  'web/src/CGTInstance.jsx', 'web/src/CGTCalc.jsx', 'web/src/lib/cgt.js',
  'web/src/RedundancyInstance.jsx', 'web/src/RedundancyCalc.jsx', 'web/src/lib/redundancy.js',
  'web/src/SalarySacrificeInstance.jsx', 'web/src/SalarySacrificeCalc.jsx', 'web/src/lib/salarysacrifice.js',
  'web/src/FHSSSInstance.jsx', 'web/src/FHSSSCalc.jsx', 'web/src/lib/fhsss.js',
  'web/src/RetirementInstance.jsx', 'web/src/RetirementCalc.jsx', 'web/src/lib/retirement.js',
  'web/src/NovatedLeaseInstance.jsx', 'web/src/NovatedLeaseCalc.jsx', 'web/src/lib/novatedlease.js',
  'web/src/SavingsInstance.jsx', 'web/src/SavingsCalc.jsx', 'web/src/lib/savings.js',
  'web/src/HealthInstance.jsx', 'web/src/HealthCalc.jsx', 'web/src/lib/health.js',
  'web/src/lib/rates', 'web/src/lib/paytax.js', 'web/src/lib/amortize.js',
  'web/src/lib/stampduty.js', 'web/src/lib/lmi.js', 'web/src/lib/format.js',
  'web/src/lib/urlState.js', 'web/src/lib/vectors',
  'web/src/calc-shared.css', 'web/src/base.css',
];

if (git('rev-parse --is-shallow-repository') === 'true') {
  console.error('Refusing to write a snapshot from a shallow clone — it would record one commit for every path.');
  process.exit(1);
}

// Paths with uncommitted work are about to be committed, so their real last
// change is the commit being made now, not whatever git currently reports.
// Without this the snapshot is always one commit stale for the files that
// actually changed.
const dirty = new Set();
for (const line of git('status --porcelain').split('\n')) {
  const p = line.slice(3).trim();
  if (!p) continue;
  for (const tracked of PATHS) {
    if (p === tracked || p.startsWith(tracked + '/')) dirty.add(tracked);
  }
}

const now = new Date().toISOString();
const files = {};
for (const p of PATHS) {
  if (dirty.has(p)) {
    files[p] = { lastCommit: 'pending', lastDate: now, lastSubject: 'Uncommitted at snapshot time', commits: Number(git(`rev-list --count HEAD -- "${p}"`, '0')) + 1 };
    continue;
  }
  files[p] = {
    lastCommit: git(`log -1 --format=%h -- "${p}"`),
    lastDate: git(`log -1 --format=%cI -- "${p}"`),
    lastSubject: git(`log -1 --format=%s -- "${p}"`),
    commits: Number(git(`rev-list --count HEAD -- "${p}"`, '0')) || 0,
  };
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: now, generatedFrom: git('rev-parse --short HEAD'), files }, null, 2) + '\n');

console.log(`Wrote ${OUT}`);
console.log(`  ${PATHS.length} paths, ${dirty.size} marked as changing in the pending commit`);
