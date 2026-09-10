// Renders the version UI for real. These exist because "the footer is
// missing" is otherwise indistinguishable from a caching or deploy problem —
// this pins down whether the markup is actually produced.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VersionFooter, VersionStocktake } from './VersionFooter.jsx';
import { CALCS, BUILD, calcStatus } from './lib/version.js';

describe('VersionFooter', () => {
  it('renders for every calculator in the manifest', () => {
    for (const c of CALCS) {
      const html = renderToStaticMarkup(<VersionFooter calcId={c.id} />);
      expect(html, `${c.id} should render a footer`).toContain('version-footer');
      expect(html, `${c.id} should show its version`).toContain(`v${c.version}`);
    }
  });

  it('always shows the build commit, even without per-file history', () => {
    const html = renderToStaticMarkup(<VersionFooter calcId="mortgage" />);
    expect(html).toContain('build');
    expect(html).toContain(BUILD.commit);
  });

  it('renders nothing for an unknown id rather than throwing', () => {
    expect(renderToStaticMarkup(<VersionFooter calcId="nope" />)).toBe('');
  });
});

describe('VersionStocktake', () => {
  const html = renderToStaticMarkup(<VersionStocktake />);

  it('renders the toggle', () => {
    expect(html).toContain('stocktake-toggle');
    expect(html).toContain(BUILD.commit);
  });

  it('is collapsed by default — the table is not in the initial markup', () => {
    expect(html).not.toContain('stocktake-table');
  });

  it('reports the calculator count in the collapsed summary', () => {
    expect(html).toContain(`${CALCS.length} calculators`);
  });
});

describe('manifest integrity', () => {
  it('every calculator resolves a status', () => {
    for (const c of CALCS) expect(calcStatus(c.id), c.id).toBeTruthy();
  });

  it('every calculator has a semver version', () => {
    for (const c of CALCS) expect(c.version, c.id).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('ids are unique', () => {
    expect(new Set(CALCS.map((c) => c.id)).size).toBe(CALCS.length);
  });
});
