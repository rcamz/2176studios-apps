// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import SiteFooter from './SiteFooter.jsx';
import About from './About.jsx';
import { CALCS, SHARED } from './lib/version.js';
import { APP_ROUTES, routeFor } from '../../core/src/appRoutes.js';
import { APP_META } from '../../core/src/appMeta.js';

const SRC = dirname(fileURLToPath(import.meta.url));
const at = (path) => (route) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[path]}>{route}</MemoryRouter>
);

const SUPPORT = 'support@2176studios.com';

describe('SiteFooter', () => {
  const html = at('/')(<SiteFooter />);

  it('offers exactly the three links, in order', () => {
    const labels = [...html.matchAll(/site-footer-link[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(labels).toEqual(['About', 'Contact', 'Privacy']);
  });

  it('points every link at a section of the one about page', () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(['/about#about', '/about#contact', '/about#privacy']);
  });

  it('separates them with pipes that a screen reader does not read out', () => {
    const seps = [...html.matchAll(/<span class="site-footer-sep" aria-hidden="true">\|<\/span>/g)];
    // Two separators for three links — not a trailing one.
    expect(seps).toHaveLength(2);
  });

  it('is a labelled landmark rather than an anonymous row of links', () => {
    expect(html).toMatch(/<nav class="site-footer" aria-label="Site information">/);
  });
});

// The footer is only useful if it is actually on the pages. Asserting this
// against the source is deliberate: rendering twelve wrappers would pull in
// every chart library for a one-line structural check.
describe('every page carries the footer', () => {
  const PAGES = [
    'Home', 'About',
    'MortgageCalc', 'PayTaxCalc', 'CGTCalc', 'RedundancyCalc', 'SalarySacrificeCalc',
    'FHSSSCalc', 'RetirementCalc', 'BorrowingPowerCalc', 'NovatedLeaseCalc',
    'RentVBuyCalc', 'SavingsCalc', 'HealthCalc',
  ];

  for (const page of PAGES) {
    it(`${page} renders SiteFooter above the version stamp`, () => {
      const src = readFileSync(resolve(SRC, `${page}.jsx`), 'utf8');
      const footer = src.indexOf('<SiteFooter />');
      const version = src.search(/<Version(Footer|Stocktake)/);
      expect(footer, 'SiteFooter is not rendered').toBeGreaterThan(-1);
      expect(version).toBeGreaterThan(-1);
      expect(footer, 'SiteFooter must sit above the version footer').toBeLessThan(version);
    });
  }
});

describe('About page', () => {
  const html = at('/about')(<About />);

  it('carries the three anchors the footer links to', () => {
    for (const id of ['about', 'contact', 'privacy']) {
      expect(html, `#${id} is missing — the footer link would land nowhere`)
        .toContain(`id="${id}"`);
    }
  });

  it('gives one contact address, and it is the support mailbox', () => {
    const mailtos = new Set(
      [...html.matchAll(/href="mailto:([^"]+)"/g)].map((m) => m[1])
    );
    expect([...mailtos]).toEqual([SUPPORT]);
  });

  it('states plainly that there are no accounts and nothing is stored', () => {
    expect(html).toMatch(/no accounts, no logins and no sign-?up/i);
    expect(html).toMatch(/never leaves your device|never sent to us/i);
  });

  // The site loads adsbygoogle.js and Google Fonts from index.html. A policy
  // claiming "no third parties" would be false, and Play rejects listings whose
  // policy contradicts the data-safety form.
  it('discloses the third parties the page actually loads', () => {
    expect(html, 'AdSense is on every page').toMatch(/AdSense/);
    expect(html, 'fonts are fetched from Google').toMatch(/Google Fonts/);
    expect(html, 'the host keeps server logs').toMatch(/Cloudflare/);
  });

  it('warns that share links carry the figures in the address', () => {
    expect(html).toMatch(/encoded in the (web )?address/i);
  });

  it('does not claim to be advice or ATO-affiliated', () => {
    expect(html).toMatch(/not financial, tax, legal or medical advice/i);
    expect(html).toMatch(/not affiliated with/i);
  });
});

describe('about route wiring', () => {
  it('is a route, but not a shippable app', () => {
    const r = routeFor('about');
    expect(r).toBeTruthy();
    expect(r.href).toBe('/about');
    expect(r.standalone).toBe(false);
  });

  it('has web metadata and explicitly no Play listing', () => {
    expect(APP_META.about).toBeTruthy();
    expect(APP_META.about.play).toBeNull();
  });

  it('appears in the version stocktake, so its date is reported', () => {
    expect(CALCS.map((c) => c.id)).toContain('about');
  });

  it('registers the footer as a shared module every page depends on', () => {
    expect(SHARED.map((s) => s.id)).toContain('sitefooter');
    const missing = CALCS.filter((c) => !c.deps.includes('sitefooter')).map((c) => c.id);
    expect(missing, 'every page renders the footer, so every page inherits its date')
      .toEqual([]);
  });

  it('keeps the route list and the version manifest in step', () => {
    const routeIds = APP_ROUTES.map((r) => r.id).sort();
    const calcIds = CALCS.map((c) => c.id).sort();
    expect(calcIds).toEqual(routeIds);
  });
});
