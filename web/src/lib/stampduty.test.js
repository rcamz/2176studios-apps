// Drives the §8.6 vectors against the implementation.
import { describe, it, expect } from 'vitest';
import { stampDutyFor, calcStampDuty } from './stampduty.js';
import {
  nswDuty, vicDuty, qldDuty, saDuty, waDuty, tasDuty, actDuty, ntDuty,
} from './vectors/stampDuty.vectors.js';

const SETS = {
  NSW: nswDuty, VIC: vicDuty, QLD: qldDuty, SA: saDuty,
  WA: waDuty, TAS: tasDuty, ACT: actDuty, NT: ntDuty,
};

// The vectors transcribe each revenue office's own terminology and the audit's
// prose dates verbatim, which is the right call for a source-of-truth artifact.
// Mapping them onto the implementation's parameters belongs here, in one place.
function prosePeriodToDate(v) {
  if (typeof v !== 'string') return v;
  const onOrAfter = v.match(/on or after (\d{4}-\d{2}-\d{2})/);
  if (onOrAfter) return onOrAfter[1];
  const before = v.match(/before (\d{4}-\d{2}-\d{2})/);
  if (before) {
    const d = new Date(before[1]);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

const ANY_PRICE = 1200000; // stand-in where a vector says the result holds at any price

function normalise(input) {
  const o = { ...input };
  if ('firstHomeOwnerRate' in o) { o.firstHomeBuyer = o.firstHomeOwnerRate; delete o.firstHomeOwnerRate; }
  if ('transactionDate' in o) { o.contractDate = prosePeriodToDate(o.transactionDate); delete o.transactionDate; }
  if ('contractDate' in o) o.contractDate = prosePeriodToDate(o.contractDate);
  if ('settlementDate' in o) o.settlementDate = prosePeriodToDate(o.settlementDate);
  if ('ownedHomeYearsAgo' in o) { o.ownedPropertyLast5Years = o.ownedHomeYearsAgo < 5; delete o.ownedHomeYearsAgo; }
  if ('willOccupyMonths' in o) { o.willOccupy12Months = o.willOccupyMonths >= 12; delete o.willOccupyMonths; }
  if (typeof o.value !== 'number') o.value = ANY_PRICE;
  return o;
}

for (const [state, cases] of Object.entries(SETS)) {
  describe(`${state} transfer duty`, () => {
    const numeric = cases.filter((c) => typeof c.expected === 'number');
    it.each(numeric.map((c) => [
      `${c.trap ? '[trap] ' : ''}${JSON.stringify(c.input)}`, c,
    ]))('%s', (_label, c) => {
      const input = normalise(c.input);
      expect(stampDutyFor(state, input.value, input)).toBeCloseTo(c.expected, 2);
    });
  });
}

describe('structural guarantees', () => {
  it('[trap] QLD home concession saving is a constant $7,175 above $540,000', () => {
    for (const v of [540000, 700000, 850000, 1200000]) {
      const general = stampDutyFor('QLD', v, {});
      const concession = stampDutyFor('QLD', v, { schedule: 'Home concession' });
      expect(general - concession).toBeCloseTo(7175, 2);
    }
  });

  it('[trap] ACT owner-occupier saving is a constant $2,992 above $300,000', () => {
    for (const v of [400000, 500000, 750000, 1000000, 1400000]) {
      const standard = stampDutyFor('ACT', v, {});
      const oo = stampDutyFor('ACT', v, { schedule: 'Owner-occupier' });
      expect(standard - oo).toBeCloseTo(2992, 2);
    }
  });

  it('[trap] VIC steps UP by $130 crossing $960,000 into the flat band', () => {
    const at = stampDutyFor('VIC', 960000, {});
    const above = stampDutyFor('VIC', 960001, {});
    expect(above - at).toBeCloseTo(130.06, 1);
  });

  it('[trap] NT applies the flat rate to the entire value above $525,000', () => {
    expect(stampDutyFor('NT', 700000, {})).toBeCloseTo(700000 * 0.0495, 2);
  });

  it('[trap] NT has no first home buyer concession', () => {
    expect(stampDutyFor('NT', 500000, { firstHomeBuyer: true }))
      .toBe(stampDutyFor('NT', 500000, {}));
  });

  it('[trap] WA has no metro/regional branch', () => {
    expect(stampDutyFor('WA', 650000, { region: 'metro' }))
      .toBe(stampDutyFor('WA', 650000, { region: 'regional' }));
  });

  it('[trap] SA gives no relief on an established home to a first home buyer', () => {
    expect(stampDutyFor('SA', 600000, { firstHomeBuyer: true, propertyType: 'established' }))
      .toBe(stampDutyFor('SA', 600000, {}));
  });

  it('[trap] SA charges nothing on commercial property', () => {
    expect(stampDutyFor('SA', 1000000, { propertyType: 'commercial' })).toBe(0);
  });
});

describe('date-keyed mid-year changes', () => {
  it('[trap] TAS tests the established-home exemption on SETTLEMENT, not contract', () => {
    const before = stampDutyFor('TAS', 700000, { firstHomeBuyer: true, settlementDate: '2026-06-30' });
    const after  = stampDutyFor('TAS', 700000, { firstHomeBuyer: true, settlementDate: '2026-07-01' });
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0);
  });

  it('TAS keeps the uncapped new-home exemption', () => {
    expect(stampDutyFor('TAS', 900000, { firstHomeBuyer: true, propertyType: 'new', settlementDate: '2026-12-01' })).toBe(0);
  });

  it('[trap] ACT HBCS is a five-year ownership test, not a first-home test', () => {
    const duty = stampDutyFor('ACT', 1200000, {
      contractDate: '2026-08-01', ownedPropertyLast5Years: false, willOccupy12Months: true,
      firstHomeBuyer: false,
    });
    expect(duty).toBe(0);
  });

  it('[trap] ACT contracts exchanged before 1 July 2026 fall under the old rules', () => {
    const duty = stampDutyFor('ACT', 1200000, {
      contractDate: '2026-06-30', ownedPropertyLast5Years: false, willOccupy12Months: true,
    });
    expect(duty).toBeGreaterThan(0);
  });

  it('WA lifted the first home owner thresholds on 7 May 2026', () => {
    expect(stampDutyFor('WA', 600000, { firstHomeBuyer: true, contractDate: '2026-06-01' })).toBe(0);
    expect(stampDutyFor('WA', 600000, { firstHomeBuyer: true, contractDate: '2026-05-06' })).toBeGreaterThan(0);
  });

  it('QLD requires citizenship for concessions from 1 August 2026', () => {
    const before = stampDutyFor('QLD', 650000, {
      firstHomeBuyer: true, contractDate: '2026-07-31', isCitizenOrPR: false,
    });
    const after = stampDutyFor('QLD', 650000, {
      firstHomeBuyer: true, contractDate: '2026-08-01', isCitizenOrPR: false,
    });
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0);
  });
});

describe('foreign purchaser surcharge', () => {
  it('adds 9% in NSW on top of duty', () => {
    const r = calcStampDuty({ state: 'NSW', value: 1000000, foreignPurchaser: true });
    expect(r.surcharge).toBeCloseTo(90000, 2);
    expect(r.total).toBeCloseTo(r.duty + 90000, 2);
  });

  it('charges no surcharge in ACT or NT', () => {
    expect(calcStampDuty({ state: 'ACT', value: 1000000, foreignPurchaser: true }).surcharge).toBe(0);
    expect(calcStampDuty({ state: 'NT', value: 1000000, foreignPurchaser: true }).surcharge).toBe(0);
  });
});
