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
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACKED_PATHS as PATHS } from './tracked-paths.mjs';

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
  let p = line.slice(3).trim();
  if (!p) continue;
  if (p.includes(' -> ')) p = p.split(' -> ')[1].trim(); // staged rename
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
  // --follow traces a single file through renames. Without it, moving the
  // calculation core into its own package would reset every file's history to
  // the move commit and report one commit each.
  const isDir = existsSync(resolve(ROOT, p)) && statSync(resolve(ROOT, p)).isDirectory();
  const follow = isDir ? '' : '--follow ';
  files[p] = {
    lastCommit: git(`log -1 ${follow}--format=%h -- "${p}"`),
    lastDate: git(`log -1 ${follow}--format=%cI -- "${p}"`),
    lastSubject: git(`log -1 ${follow}--format=%s -- "${p}"`),
    commits: Number(git(`rev-list --count ${follow}HEAD -- "${p}"`, '0')) || 0,
  };
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: now, generatedFrom: git('rev-parse --short HEAD'), files }, null, 2) + '\n');

console.log(`Wrote ${OUT}`);
console.log(`  ${PATHS.length} paths, ${dirty.size} marked as changing in the pending commit`);
