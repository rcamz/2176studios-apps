import { useState } from 'react';
import {
  calcStatus, allCalcStatuses, allSharedStatuses, BUILD,
  RATES_VERIFIED, RATES_NEXT_REVIEW, formatDate, relativeDate,
} from './lib/version.js';

// Compact stamp for a single calculator page. Lives in the wrapper, not the
// instance, so it appears once per page rather than three times in compare mode.
export function VersionFooter({ calcId }) {
  const s = calcStatus(calcId);
  if (!s) return null;

  return (
    <footer className="version-footer">
      <span className="version-badge">v{s.version}</span>
      {BUILD.perFileAvailable && (
        <>
          <span className="version-sep">·</span>
          <span>Updated {formatDate(s.lastDate)}</span>
        </>
      )}
      {BUILD.perFileAvailable && s.viaDependency && (
        <>
          <span className="version-sep">·</span>
          <span title={`Most recent change came from ${s.changedBy}, which this calculator uses`}>
            via {s.changedBy}
          </span>
        </>
      )}
      <span className="version-sep">·</span>
      <span className="version-commit" title={BUILD.commitDate ? `Commit ${BUILD.commit} — ${formatDate(BUILD.commitDate)}` : undefined}>
        build {BUILD.commit}{BUILD.dirty ? '+' : ''}
      </span>
      {BUILD.dirty && <span className="version-dirty" title="Built with uncommitted changes">uncommitted</span>}
    </footer>
  );
}

function StatusDot({ iso }) {
  if (!iso) return <span className="stk-dot stk-dot--none" title="No commit recorded" />;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  const tone = days <= 7 ? 'fresh' : days <= 90 ? 'recent' : 'stale';
  return <span className={`stk-dot stk-dot--${tone}`} title={relativeDate(iso)} />;
}

// Full stocktake for the home page. Collapsed by default — it is a
// verification tool, not something to read on the way to a calculator.
export function VersionStocktake() {
  const [open, setOpen] = useState(false);
  const calcs = allCalcStatuses();
  const shared = allSharedStatuses();

  const newest = [...calcs, ...shared]
    .map((x) => x.lastDate)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <footer className="stocktake">
      <button className="stocktake-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="stocktake-toggle-label">
          Build {BUILD.commit}{BUILD.dirty ? '+' : ''} · {calcs.length} calculators · last change {relativeDate(newest)}
        </span>
        <span className="stocktake-toggle-icon">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="stocktake-body">
          <div className="stocktake-meta">
            <div>
              <span className="stk-k">Commit</span>
              <span className="stk-v">{BUILD.commit} on {BUILD.branch}</span>
            </div>
            <div>
              <span className="stk-k">Committed</span>
              <span className="stk-v">{formatDate(BUILD.commitDate)}</span>
            </div>
            <div>
              <span className="stk-k">Built</span>
              <span className="stk-v">{formatDate(BUILD.builtAt)}</span>
            </div>
            <div>
              <span className="stk-k">Tax data verified</span>
              <span className="stk-v">{formatDate(RATES_VERIFIED)} · next review {formatDate(RATES_NEXT_REVIEW)}</span>
            </div>
            <div>
              <span className="stk-k">File history from</span>
              <span className="stk-v">
                {BUILD.source === 'snapshot'
                  ? `snapshot at ${BUILD.snapshotFrom ?? 'unknown'}`
                  : BUILD.source}
              </span>
            </div>
          </div>

          {BUILD.dirty && (
            <p className="stocktake-warn">
              This build was made with uncommitted changes, so it does not correspond to any commit.
            </p>
          )}

          {!BUILD.perFileAvailable && (
            <p className="stocktake-warn">
              Per-file history is unavailable in this build. It ran against a shallow clone with no
              committed snapshot to fall back on, so every file would report the same commit. The
              dates are withheld rather than shown as identical and misleading — the build commit
              above is still accurate. Run <code>npm run version:snapshot</code> and commit the
              result to restore them.
            </p>
          )}

          <div className="stocktake-scroll">
            <table className="stocktake-table">
              <caption>Calculators</caption>
              <thead>
                <tr>
                  <th>Calculator</th><th>Version</th><th>Last updated</th><th>Commit</th><th>Changed by</th>
                </tr>
              </thead>
              <tbody>
                {calcs.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <StatusDot iso={c.lastDate} />
                      {c.href ? <a href={c.href}>{c.name}</a> : c.name}
                    </td>
                    <td className="stk-mono">v{c.version}</td>
                    <td>
                      {formatDate(c.lastDate)}
                      <span className="stk-rel">{relativeDate(c.lastDate)}</span>
                    </td>
                    <td className="stk-mono">{c.lastCommit || '—'}</td>
                    <td className="stk-why">
                      {c.viaDependency ? c.changedBy : 'own files'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="stocktake-table">
              <caption>Shared modules</caption>
              <thead>
                <tr>
                  <th>Module</th><th>Path</th><th>Last updated</th><th>Commit</th><th>Commits</th>
                </tr>
              </thead>
              <tbody>
                {shared.map((s) => (
                  <tr key={s.id}>
                    <td><StatusDot iso={s.lastDate} />{s.name}</td>
                    <td className="stk-mono stk-path">{s.path.replace('web/src/', '')}</td>
                    <td>
                      {formatDate(s.lastDate)}
                      <span className="stk-rel">{relativeDate(s.lastDate)}</span>
                    </td>
                    <td className="stk-mono">{s.lastCommit || '—'}</td>
                    <td className="stk-mono">{s.commits || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="stocktake-note">
            Version numbers are curated by hand; dates and commits are read from git at build time, so they cannot drift.
            A calculator shows “changed by” a shared module when that module moved more recently than its own files —
            the tax engine changing moves the numbers in every calculator that uses it.
            {BUILD.source === 'snapshot' && ' CI clones shallow, so per-file dates come from a snapshot committed alongside the code; the build commit above is read live either way.'}
          </p>
        </div>
      )}
    </footer>
  );
}
