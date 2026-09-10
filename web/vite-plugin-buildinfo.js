// Injects real git metadata at build time as `virtual:build-info`.
//
// A hand-maintained "last updated" date is worse than none — it eventually
// goes stale and then confidently asserts something false. Everything here is
// read from git, so it cannot drift from what was actually committed.

import { execSync } from 'node:child_process';

const git = (cmd, fallback = '') => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
};

export default function buildInfo({ paths = [], root = '..' } = {}) {
  const VIRTUAL_ID = 'virtual:build-info';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;

  function collect() {
    const cwd = `git -C "${root}"`;
    const files = {};

    for (const p of paths) {
      // A path may be a directory; -- <path> works for both.
      const lastDate = git(`${cwd} log -1 --format=%cI -- "${p}"`);
      files[p] = {
        lastCommit: git(`${cwd} log -1 --format=%h -- "${p}"`),
        lastDate,
        lastSubject: git(`${cwd} log -1 --format=%s -- "${p}"`),
        commits: Number(git(`${cwd} rev-list --count HEAD -- "${p}"`, '0')) || 0,
      };
    }

    return {
      commit: git(`${cwd} rev-parse --short HEAD`, 'unknown'),
      commitDate: git(`${cwd} log -1 --format=%cI`),
      branch: git(`${cwd} rev-parse --abbrev-ref HEAD`),
      // Uncommitted changes at build time mean the deployed bundle does not
      // correspond to any commit — worth surfacing rather than hiding.
      dirty: git(`${cwd} status --porcelain`).length > 0,
      builtAt: new Date().toISOString(),
      files,
    };
  }

  return {
    name: 'build-info',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export default ${JSON.stringify(collect())};`;
    },
    // In dev, re-collect on reload so the footer stays honest while working.
    handleHotUpdate({ server }) {
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
