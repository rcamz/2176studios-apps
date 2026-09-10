// A withheld target must stay withheld. §7.4 blocks the calorie figure when a
// plan falls below the safe intake floor or above the safe rate of loss, and
// the accessibility pass added aria-labels, a live region and a hidden chart
// table — every one of which is a new way for that number to leak to a screen
// reader while staying invisible on screen. These tests render the real
// component and search the whole serialised markup, aria attributes included.

import { describe, it, expect, afterAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HealthInstance from './HealthInstance.jsx';
import { calcHealth } from './lib/health.js';

// 100 kg → 80 kg in 12 weeks. 1.67 kg/week is above the 1.1% of bodyweight
// ceiling, and the intake it would need is under the 1,500 kcal/day floor,
// so both hard blocks trip.
const BLOCKED_INPUTS = {
  heightCm: 175,
  weightKg: 100,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
  goalType: 'lose',
  goalWeightKg: 80,
  goalWeeks: 12,
  bodyFatPercent: 0,
  bmiView: 'standard',
};
const BLOCKED_SEARCH = '?ht=175&wt=100&ag=30&sx=m&al=m&gt=l&gw=80&gk=12&bf=0&bv=s';

// The component reads window.location.search only in its state initialiser;
// nothing else in this render path touches the DOM. The stub is installed at
// module scope because describe bodies render during collection, before hooks.
const previousWindow = globalThis.window;
globalThis.window = { location: { search: BLOCKED_SEARCH } };
afterAll(() => {
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
});

const render = () => renderToStaticMarkup(<HealthInstance instanceKey="" />);

// Every aria-* attribute value in the markup, decoded.
const ariaValues = (html) =>
  [...html.matchAll(/aria-[a-z-]+="([^"]*)"/g)].map(([, v]) =>
    v.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  );

describe('Health hard block', () => {
  const result = calcHealth(BLOCKED_INPUTS);

  it('is actually a blocked scenario', () => {
    expect(result.goalBlocked).toBe(true);
    expect(result.blockReasons.length).toBeGreaterThan(0);
    expect(result.goalCalories).toBeNull();
    expect(result.requested.requestedCalories).toBeLessThan(result.minIntake);
  });

  it('never exposes the withheld calorie target, in text or in aria', () => {
    const html = render();
    const withheld = result.requested.requestedCalories;
    const forms = [
      String(withheld),
      withheld.toLocaleString('en-AU'),
      withheld.toLocaleString(),
    ];
    for (const form of forms) {
      expect(html, `withheld target ${form} must not appear in the markup`).not.toContain(form);
      for (const value of ariaValues(html)) {
        expect(value, `withheld target ${form} must not appear in an aria attribute`).not.toContain(form);
      }
    }
  });

  it('withholds every derived goal figure too', () => {
    const html = render();
    // Weekly change and projected duration are all null when blocked; the
    // requested rate is only ever quoted inside the block explanation.
    expect(result.weeklyWeightChange).toBeNull();
    expect(result.projectedWeeks).toBeNull();
    expect(result.goalMacros).toBeNull();
    expect(html).not.toContain('Projected time');
    expect(html).not.toContain('Weekly change');
    expect(html).not.toContain('Goal macros');
  });

  it('has no chart and no chart alternative to leak a projection', () => {
    const html = render();
    expect(result.chartData).toHaveLength(0);
    expect(html).not.toContain('Projected weight by week');
    expect(html).not.toContain('Projected weight —');
    expect(html).not.toContain('role="img"');
  });

  it('announces the block with role="alert"', () => {
    const html = render();
    expect(html).toContain('role="alert"');
    for (const b of result.blockReasons) expect(html).toContain(b.title);
  });

  it('still shows maintenance calories, which are not withheld', () => {
    const html = render();
    expect(html).toContain(result.maintenanceCalories.toLocaleString());
    expect(html).toContain('aria-live="polite"');
  });
});

describe('Health accessibility markup', () => {
  const html = render();

  it('pairs every input with a label', () => {
    const ids = [...html.matchAll(/<input[^>]*\sid="([^"]+)"/g)].map(([, id]) => id);
    const fors = [...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map(([, f]) => f);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(fors, `input #${id} needs a label`).toContain(id);
  });

  it('makes the activity cards keyboard-reachable radios', () => {
    expect(html).toContain('role="radiogroup"');
    const radios = [...html.matchAll(/role="radio"[^>]*/g)];
    expect(radios.length).toBeGreaterThan(0);
    // Exactly one activity card is in the tab order at a time.
    expect([...html.matchAll(/tabindex="0"/g)]).toHaveLength(1);
    expect(html).toContain('aria-checked="true"');
  });
});
