// Injects real git metadata at build time as `virtual:build-info`.
//
// A hand-maintained "last updated" date is worse than none — it eventually
// goes stale and then confidently asserts something false. Everything here is
// read from git, so it cannot drift from what was actually committed.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (cmd, fallback = '', timeout = 10_000) => {
  try {
    return execSync(cmd, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout,
    }).trim();
  } catch {
    return fallback;
  }
};

function loadSnapshot(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export default function buildInfo({ paths = [], root = '..', snapshotFile = 'src/generated/build-manifest.json' } = {}) {
  const VIRTUAL_ID = 'virtual:build-info';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;
  const snapshot = loadSnapshot(snapshotFile);

  function collect() {
    const cwd = `git -C "${root}"`;

    const hasGit = git(`${cwd} rev-parse --git-dir`) !== '';
    let shallow = git(`${cwd} rev-parse --is-shallow-repository`) === 'true';
    let source = 'git';

    // CI providers commonly clone with --depth=1. With one commit of history,
    // `git log -1 -- <path>` returns that same commit for EVERY path, so
    // per-file dates would be identical and meaningless.
    //
    // First try to deepen the clone. The container just cloned from the remote,
    // so the fetch usually succeeds; it is bounded so a hang cannot stall the
    // build.
    if (shallow) {
      git(`${cwd} fetch --unshallow --quiet`, '', 60_000);
      shallow = git(`${cwd} rev-parse --is-shallow-repository`) === 'true';
      if (!shallow) source = 'git (unshallowed)';
    }

    let files = {};
    let perFileAvailable = hasGit && !shallow;

    if (perFileAvailable) {
      for (const p of paths) {
        // --follow traces a file through renames, so moving the calculation
        // core into its own package does not reset every file's history to
        // the move commit. It only accepts a single file, not a directory.
        const isDir = !p.endsWith('.js') && !p.endsWith('.jsx') && !p.endsWith('.css');
        const follow = isDir ? '' : '--follow ';
        files[p] = {
          lastCommit: git(`${cwd} log -1 ${follow}--format=%h -- "${p}"`),
          lastDate: git(`${cwd} log -1 ${follow}--format=%cI -- "${p}"`),
          lastSubject: git(`${cwd} log -1 ${follow}--format=%s -- "${p}"`),
          commits: (git(`${cwd} log ${follow}--format=%h -- "${p}"`) || '').split('\n').filter(Boolean).length,
        };
      }
    } else if (snapshot?.files) {
      // Still shallow. Fall back to the snapshot committed from a machine that
      // had the full history — accurate as at the commit that produced it.
      files = snapshot.files;
      perFileAvailable = true;
      source = 'snapshot';
    }

    return {
      commit: git(`${cwd} rev-parse --short HEAD`, 'unknown'),
      commitDate: git(`${cwd} log -1 --format=%cI`),
      branch: git(`${cwd} rev-parse --abbrev-ref HEAD`),
      // Uncommitted changes at build time mean the deployed bundle does not
      // correspond to any commit — worth surfacing rather than hiding.
      dirty: git(`${cwd} status --porcelain`).length > 0,
      builtAt: new Date().toISOString(),
      hasGit,
      shallow,
      perFileAvailable,
      source,
      snapshotFrom: source === 'snapshot' ? snapshot.generatedFrom : null,
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
