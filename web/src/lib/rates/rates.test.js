import { describe, it, expect } from 'vitest';
import {
  ratesFor, resolve, financialYear, financialYearRange, availableFinancialYears,
} from './index.js';
import { incomeTax } from './incomeTax.js';
import { agePension } from './agePension.js';
import { fbt, statutoryRateFor } from './fbt.js';

describe('financial year helpers', () => {
  it('maps dates to the AU financial year', () => {
    expect(financialYear('2026-09-10')).toBe('2026-27');
    expect(financialYear('2026-07-01')).toBe('2026-27');
    expect(financialYear('2026-06-30')).toBe('2025-26');
    expect(financialYear('2027-01-15')).toBe('2026-27');
  });

  it('round-trips a financial year to its date range', () => {
    expect(financialYearRange('2026-27')).toEqual({ from: '2026-07-01', to: '2027-06-30' });
  });
});

describe('date resolution', () => {
  it('picks the bracket set applying on the date, not the calendar year', () => {
    expect(resolve(incomeTax, '2026-06-30').resident[1].rate).toBe(0.16);
    expect(resolve(incomeTax, '2026-07-01').resident[1].rate).toBe(0.15);
    expect(resolve(incomeTax, '2027-07-01').resident[1].rate).toBe(0.14);
  });

  it('throws rather than guessing when a date is uncovered', () => {
    expect(() => resolve(incomeTax, '2019-01-01', 'incomeTax')).toThrow(/No incomeTax defined/);
  });

  it('resolves every domain for today', () => {
    const r = ratesFor('2026-09-10');
    expect(r.__fy).toBe('2026-27');
    expect(r.incomeTax.resident[1].rate).toBe(0.15);
    expect(r.help.nilThreshold).toBe(69528);
    expect(r.superannuation.concessionalCap).toBe(32500);
    expect(r.termination.etp.lifeBenefitCap).toBe(270000);
  });

  it('only offers financial years it can answer end to end', () => {
    const years = availableFinancialYears();
    expect(years).toContain('2026-27');
    // FY2025-26 has income tax brackets but no verified medicare/help/super,
    // so it must not be offered even though the bracket series covers it.
    expect(years).not.toContain('2025-26');
  });
});

describe('mid-year changes', () => {
  it('switches Age Pension deeming on 20 September 2026, not 1 July', () => {
    expect(resolve(agePension, '2026-09-19').deemingLowerRate).toBe(0.0125);
    expect(resolve(agePension, '2026-09-20').deemingLowerRate).toBe(0.0175);
    expect(resolve(agePension, '2026-09-20').deemingUpperRate).toBe(0.0375);
  });

  it('holds free areas and deeming thresholds steady across that date', () => {
    const before = resolve(agePension, '2026-09-19');
    const after = resolve(agePension, '2026-09-20');
    expect(after.incomeFreeAreaSingle).toBe(before.incomeFreeAreaSingle);
    expect(after.deemingThresholdSingle).toBe(before.deemingThresholdSingle);
  });
});

describe('FBT statutory rate lookup', () => {
  const rates = resolve(fbt, '2026-09-10');

  it('exempts an eligible BEV under the threshold', () => {
    expect(statutoryRateFor({ kind: 'bev', priceIncGst: 70000, date: '2026-09-10', rates }).rate).toBe(0);
  });

  it('does NOT exempt a PHEV on a new lease', () => {
    expect(statutoryRateFor({ kind: 'phev', priceIncGst: 70000, date: '2026-09-10', rates }).rate).toBe(0.20);
  });

  it('exempts a grandfathered PHEV', () => {
    expect(statutoryRateFor({
      kind: 'phev', priceIncGst: 70000, date: '2026-09-10', rates, phevGrandfathered: true,
    }).rate).toBe(0);
  });

  it('applies the LCT ceiling', () => {
    expect(statutoryRateFor({ kind: 'bev', priceIncGst: 95000, date: '2026-09-10', rates }).rate).toBe(0.20);
  });

  it('phases to 15% above $75,000 from 1 April 2027', () => {
    expect(statutoryRateFor({ kind: 'bev', priceIncGst: 70000, date: '2027-05-01', rates }).rate).toBe(0);
    expect(statutoryRateFor({ kind: 'bev', priceIncGst: 85000, date: '2027-05-01', rates }).rate).toBe(0.15);
  });

  it('applies 15% to all eligible EVs from 1 April 2029', () => {
    expect(statutoryRateFor({ kind: 'bev', priceIncGst: 70000, date: '2029-05-01', rates }).rate).toBe(0.15);
  });

  it('always uses the standard fraction for a petrol car', () => {
    expect(statutoryRateFor({ kind: 'ice', priceIncGst: 50000, date: '2026-09-10', rates }).rate).toBe(0.20);
  });
});
