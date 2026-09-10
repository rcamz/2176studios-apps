import { describe, it, expect } from 'vitest';
import { APP_META, validateAppMeta } from './appMeta.js';
import { APP_ROUTES, standaloneApps } from './appRoutes.js';

// Play rejects a listing outright when a field is over length, so these are
// mechanical checks rather than something to eyeball.
const PLAY_LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };

describe('validateAppMeta', () => {
  it('passes its own validator', () => {
    expect(validateAppMeta()).toEqual([]);
  });
});

describe('coverage', () => {
  it('has an entry for every route', () => {
    for (const r of APP_ROUTES) {
      expect(APP_META[r.id], `missing metadata for ${r.id}`).toBeTruthy();
    }
  });

  it('has no entry for a route that does not exist', () => {
    const ids = new Set(APP_ROUTES.map((r) => r.id));
    for (const id of Object.keys(APP_META)) expect(ids.has(id), `orphan: ${id}`).toBe(true);
  });

  it('gives every standalone app a Play listing', () => {
    for (const r of standaloneApps()) {
      expect(APP_META[r.id].play, `${r.id} ships as an app and needs a listing`).toBeTruthy();
    }
  });

  it('gives the site index no Play listing', () => {
    expect(APP_META.home.play).toBeNull();
  });
});

describe('Play Store limits', () => {
  for (const r of standaloneApps()) {
    for (const [field, max] of Object.entries(PLAY_LIMITS)) {
      it(`${r.id}: ${field} within ${max}`, () => {
        const v = APP_META[r.id].play[field];
        expect(typeof v).toBe('string');
        expect(v.length, `"${v.slice(0, 40)}…" is ${v.length}`).toBeLessThanOrEqual(max);
        expect(v.trim().length).toBeGreaterThan(0);
      });
    }
  }
});

describe('web fields', () => {
  for (const r of APP_ROUTES) {
    it(`${r.id}: title and description present and sane`, () => {
      const m = APP_META[r.id];
      expect(m.title.length).toBeGreaterThan(10);
      expect(m.title.length, 'titles beyond ~60 chars get truncated in results').toBeLessThanOrEqual(65);
      // Google typically renders 155-160 characters.
      expect(m.description.length).toBeGreaterThanOrEqual(100);
      expect(m.description.length).toBeLessThanOrEqual(170);
    });
  }

  it('every title is distinct', () => {
    const titles = APP_ROUTES.map((r) => APP_META[r.id].title);
    expect(new Set(titles).size, 'duplicate titles are why the old single title failed').toBe(titles.length);
  });

  it('every description is distinct', () => {
    const d = APP_ROUTES.map((r) => APP_META[r.id].description);
    expect(new Set(d).size).toBe(d.length);
  });
});

describe('claims', () => {
  const text = JSON.stringify(APP_META);

  it('never offers financial advice unqualified', () => {
    // "not financial or tax advice" is fine; an unqualified claim is not.
    expect(/(?<!not )(?<!never )(?<!isn't )(?<!or tax )financial advice/i.test(text)).toBe(false);
  });

  it('claims no ATO endorsement', () => {
    expect(/ATO[- ](approved|endorsed|official|certified)/i.test(text)).toBe(false);
  });

  it('guarantees no accuracy', () => {
    expect(/100% accurate|always correct|guaranteed accurate/i.test(text)).toBe(false);
  });

  it('carries a disclaimer on every finance listing', () => {
    for (const r of standaloneApps()) {
      if (r.id === 'health') continue;
      expect(APP_META[r.id].play.fullDescription, `${r.id} has no disclaimer`)
        .toMatch(/not financial or tax advice|estimates only/i);
    }
  });

  it('states plainly that health is not medical advice', () => {
    expect(APP_META.health.play.fullDescription).toMatch(/not medical advice|general (fitness|information)/i);
  });
});
