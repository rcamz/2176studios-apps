import { describe, it, expect } from 'vitest';
import { dirtyTrackedPaths } from './git-status.mjs';

const TRACKED = ['core/src/appRoutes.js', 'web/src/Home.jsx', 'core/src/rates'];

describe('dirtyTrackedPaths', () => {
  // The bug this pins: git() trimmed the whole output, which ate the leading
  // space of the FIRST line only. slice(3) then removed a character from that
  // path, it matched nothing, and the file was snapshotted as unchanged on the
  // very commit that changed it. Every line below it parsed correctly, so the
  // count looked plausible and it went unnoticed for several snapshots.
  it('reads the first line, whose status column starts with a space', () => {
    const out = ' M core/src/appRoutes.js\n M web/src/Home.jsx\n';
    expect([...dirtyTrackedPaths(out, TRACKED)]).toEqual([
      'core/src/appRoutes.js',
      'web/src/Home.jsx',
    ]);
  });

  it('is not fooled by output that has already been trimmed', () => {
    // Defence in depth: if a caller trims anyway, the first path is short by
    // one character and must not silently match something else.
    const trimmed = 'M core/src/appRoutes.js';
    expect([...dirtyTrackedPaths(trimmed, TRACKED)]).toEqual([]);
  });

  it('handles staged, unstaged and untracked status columns', () => {
    const out = 'M  core/src/appRoutes.js\n?? web/src/Home.jsx\nMM core/src/rates/help.js\n';
    expect([...dirtyTrackedPaths(out, TRACKED)].sort()).toEqual([
      'core/src/appRoutes.js', 'core/src/rates', 'web/src/Home.jsx',
    ]);
  });

  it('takes the destination of a staged rename, not the source', () => {
    const out = 'R  old/path.js -> web/src/Home.jsx\n';
    expect([...dirtyTrackedPaths(out, TRACKED)]).toEqual(['web/src/Home.jsx']);
  });

  it('matches a tracked directory through its children', () => {
    const out = ' M core/src/rates/medicare.js\n';
    expect([...dirtyTrackedPaths(out, TRACKED)]).toEqual(['core/src/rates']);
  });

  it('does not match a path that merely shares a prefix', () => {
    const out = ' M core/src/ratesomething.js\n M web/src/Home.jsx.bak\n';
    expect([...dirtyTrackedPaths(out, TRACKED)]).toEqual([]);
  });

  it('survives empty and blank output', () => {
    expect([...dirtyTrackedPaths('', TRACKED)]).toEqual([]);
    expect([...dirtyTrackedPaths('\n\n', TRACKED)]).toEqual([]);
  });
});
