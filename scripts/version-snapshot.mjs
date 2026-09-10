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
import { dirtyTrackedPaths } from './git-status.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'web/src/generated/build-manifest.json');

// `git rev-list --count` does not accept --follow, so counting through a
// rename means listing the commits and measuring the list.
const countCommits = (path, follow) => {
  const out = git(`log ${follow}--format=%h -- "${path}"`);
  return out ? out.split('\n').filter(Boolean).length : 0;
};

const git = (cmd, fallback = '', { trim = true } = {}) => {
  try {
    const out = execSync(`git -C "${ROOT}" ${cmd}`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return trim ? out.trim() : out;
  } catch {
    return fallback;
  }
};

if (git('rev-parse --is-shallow-repository') === 'true') {
  console.error('Refusing to write a snapshot from a shallow clone — it would record one commit for every path.');
  process.exit(1);
}

const dirty = dirtyTrackedPaths(
  // Not trimmed: porcelain v1 puts a two-character status in columns 1-2, and
  // for an unstaged change the first is a space. Trimming the whole output ate
  // it on the FIRST line only, so slicing off three characters then cut a
  // character off that one path and it silently failed to match. Everything
  // below it parsed fine, which is why this survived several snapshots.
  git('status --porcelain', '', { trim: false }),
  PATHS,
);

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
    commits: countCommits(p, follow),
  };
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: now, generatedFrom: git('rev-parse --short HEAD'), files }, null, 2) + '\n');

console.log(`Wrote ${OUT}`);
console.log(`  ${PATHS.length} paths, ${dirty.size} marked as changing in the pending commit`);
