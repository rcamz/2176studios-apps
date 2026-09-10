import { describe, it, expect } from 'vitest';
import appRoutes from './vite-plugin-approutes.js';
import { APP_ROUTES } from '../core/src/appRoutes.js';
import { APP_META } from '../core/src/appMeta.js';

// The plugin decides what ends up in each app binary, so the interesting
// assertions are about what it leaves OUT.
const load = (target) => {
  const p = appRoutes({ routes: APP_ROUTES, meta: APP_META, target });
  p.configResolved({ root: '/app/web' });
  return p.load('\0virtual:app-routes');
};

describe('full site build', () => {
  const src = load(null);

  it('emits every route', () => {
    for (const r of APP_ROUTES) expect(src).toContain(`path: '${r.href}'`);
  });

  it('has no catch-all target', () => {
    expect(src).toContain('export const TARGET = null;');
  });
});

describe('standalone app build', () => {
  const src = load('health');

  it('imports only its own calculator and the About page', () => {
    const imported = [...src.matchAll(/import (\w+) from/g)].map((m) => m[1]).sort();
    expect(imported).toEqual(['About', 'HealthCalc']);
  });

  it('leaves every other calculator out entirely', () => {
    for (const name of ['MortgageCalc', 'PayTaxCalc', 'CGTCalc', 'Home', 'SavingsCalc']) {
      expect(src, `${name} must not reach the Health app`).not.toContain(name);
    }
  });

  it('answers "/" as well as its real route, so a cold launch lands somewhere', () => {
    expect(src).toContain("{ path: '/', Component: HealthCalc }");
    expect(src).toContain("{ path: '/healthcalc', Component: HealthCalc }");
  });

  it('keeps the About page, which carries the privacy policy Play points at', () => {
    expect(src).toContain("{ path: '/about', Component: About }");
  });

  it('ships only its own head metadata, not thirteen apps worth', () => {
    const meta = JSON.parse(src.match(/export const HEAD_META = (\{[\s\S]*?\n\});/)[1]);
    expect(Object.keys(meta).sort()).toEqual(['about', 'health']);
    expect(meta.health.title).toBe(APP_META.health.title);
  });

  it('carries no Play Store listing copy', () => {
    // ~40KB of store descriptions live on APP_META entries. None of it belongs
    // in an app binary, and none of it should reach a browser either.
    expect(src).not.toContain('WHO IT IS FOR');
    expect(src).not.toMatch(/shortDescription|fullDescription/);
  });

  it('strips the AdSense script from index.html', () => {
    const html = '<head>\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1" crossorigin="anonymous"></script>\n</head>';
    const p = appRoutes({ routes: APP_ROUTES, meta: APP_META, target: 'health' });
    expect(p.transformIndexHtml(html)).not.toContain('adsbygoogle');
  });

  it('leaves the web build\'s AdSense script alone', () => {
    const html = '<script src="adsbygoogle.js"></script>';
    const p = appRoutes({ routes: APP_ROUTES, meta: APP_META, target: null });
    expect(p.transformIndexHtml(html)).toContain('adsbygoogle');
  });

  it('refuses an unknown target rather than emitting an empty app', () => {
    expect(() => load('nosuchapp')).toThrow(/unknown id|no metadata/);
  });
});
