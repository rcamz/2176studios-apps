// Parsing `git status --porcelain`, kept separate so it can be tested without
// executing the snapshot script's top-level body.

/**
 * Tracked paths with uncommitted work.
 *
 * Those are about to be committed, so their real last change is the commit
 * being made now, not whatever git currently reports. Without this the
 * snapshot is always one commit stale for exactly the files that changed.
 *
 * @param {string} statusOutput  Raw, UNTRIMMED `git status --porcelain` output.
 * @param {string[]} tracked     Paths the manifest reports on.
 */
export function dirtyTrackedPaths(statusOutput, tracked) {
  const dirty = new Set();

  for (const line of String(statusOutput).split('\n')) {
    // Columns 1-2 are the status, column 3 a space. Never trim the line first:
    // for an unstaged change the first column IS a space, and losing it shifts
    // the path left by one.
    let p = line.slice(3).trim();
    if (!p) continue;
    if (p.includes(' -> ')) p = p.split(' -> ')[1].trim(); // staged rename

    for (const t of tracked) {
      if (p === t || p.startsWith(t + '/')) dirty.add(t);
    }
  }

  return dirty;
}
