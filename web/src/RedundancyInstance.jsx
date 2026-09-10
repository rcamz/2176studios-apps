import { useState, useMemo, useEffect, useId } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcRedundancy, explainRedundancy } from './lib/redundancy.js';
import Workings from './Workings.jsx';
import { fmt, fmtPct } from './lib/format.js';
import { num, bool, enumOf, parseInput, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const DEFAULTS = {
  weeklyBaseRate: 2000,
  weeklyFullRate: 2000,
  yearsService: 5,
  terminationReason: 'redundancy',
  unusedAnnualLeaveDays: 10,
  unusedLslDays: 0,
  splitLsl: false,
  lslPre1978Days: 0,
  lsl1978to1993Days: 0,
  noticePaidWeeks: 4,
  otherEtpAmount: 0,
  age: 40,
  grossAnnualIncome: 104000,
  employmentBasis: 'permanent',
  smallBusinessEmployer: false,
  employeeHeadcount: 20,
  employerInsolvent: false,
  seriousMisconduct: false,
};

const TR_CODE = { redundancy: 'r', resignation: 'g', dismissal: 'd', 'non-genuine': 'n' };
const TR_MAP  = { r: 'redundancy', g: 'resignation', d: 'dismissal', n: 'non-genuine' };
const EB_CODE = { permanent: 'p', fixedTerm: 'x', casual: 'c', apprentice: 'a' };
const EB_MAP  = { p: 'permanent', x: 'fixedTerm', c: 'casual', a: 'apprentice' };

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('wb', inp.weeklyBaseRate);
  p.set('wf', inp.weeklyFullRate);
  p.set('ys', inp.yearsService);
  p.set('tr', TR_CODE[inp.terminationReason] ?? 'r');
  p.set('al', inp.unusedAnnualLeaveDays);
  p.set('ls', inp.unusedLslDays);
  p.set('lx', inp.splitLsl ? '1' : '0');
  p.set('l7', inp.lslPre1978Days);
  p.set('l9', inp.lsl1978to1993Days);
  p.set('np', inp.noticePaidWeeks);
  p.set('oe', inp.otherEtpAmount);
  p.set('ag', inp.age);
  p.set('gi', inp.grossAnnualIncome);
  p.set('eb', EB_CODE[inp.employmentBasis] ?? 'p');
  p.set('sb', inp.smallBusinessEmployer ? '1' : '0');
  p.set('hc', inp.employeeHeadcount);
  p.set('iv', inp.employerInsolvent ? '1' : '0');
  p.set('sm', inp.seriousMisconduct ? '1' : '0');
  return p;
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  // Legacy links carried a single 'wg' weekly gross and no rate split.
  const legacyRate = p.has('wg') ? num(p.get('wg'), DEFAULTS.weeklyBaseRate) : null;
  if (!p.has('wb') && legacyRate === null) return {};

  const base = legacyRate ?? num(p.get('wb'), DEFAULTS.weeklyBaseRate);
  return {
    weeklyBaseRate:        base,
    weeklyFullRate:        num(p.get('wf'), base),
    yearsService:          num(p.get('ys'), DEFAULTS.yearsService),
    terminationReason:     enumOf(p.get('tr'), TR_MAP, DEFAULTS.terminationReason),
    unusedAnnualLeaveDays: num(p.get('al'), DEFAULTS.unusedAnnualLeaveDays),
    unusedLslDays:         num(p.get('ls'), DEFAULTS.unusedLslDays),
    splitLsl:              bool(p.get('lx'), DEFAULTS.splitLsl),
    lslPre1978Days:        num(p.get('l7'), 0),
    lsl1978to1993Days:     num(p.get('l9'), 0),
    noticePaidWeeks:       num(p.get('np'), DEFAULTS.noticePaidWeeks),
    otherEtpAmount:        num(p.get('oe'), 0),
    age:                   num(p.get('ag'), DEFAULTS.age),
    grossAnnualIncome:     num(p.get('gi'), DEFAULTS.grossAnnualIncome),
    employmentBasis:       enumOf(p.get('eb'), EB_MAP, DEFAULTS.employmentBasis),
    smallBusinessEmployer: bool(p.get('sb'), DEFAULTS.smallBusinessEmployer),
    employeeHeadcount:     num(p.get('hc'), DEFAULTS.employeeHeadcount),
    employerInsolvent:     bool(p.get('iv'), false),
    seriousMisconduct:     bool(p.get('sm'), false),
  };
}

export default function RedundancyInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const uid = useId();
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseInput(e.target.value));

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(encodeInputs(inputs));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcRedundancy({
    ...inputs,
    // The headcount test only applies once the user says it is a small
    // employer; otherwise the toggle alone drives it.
    employeeHeadcount: inputs.smallBusinessEmployer ? inputs.employeeHeadcount : null,
    fixedTermEndingNaturally: inputs.employmentBasis === 'fixedTerm',
    employmentBasis: inputs.employmentBasis === 'fixedTerm' ? 'permanent' : inputs.employmentBasis,
    seriousMisconduct: inputs.terminationReason === 'dismissal' && inputs.seriousMisconduct,
    lslPre1978Days: inputs.splitLsl ? inputs.lslPre1978Days : 0,
    lsl1978to1993Days: inputs.splitLsl ? inputs.lsl1978to1993Days : 0,
  }), [inputs]);

  const explanation = useMemo(() => explainRedundancy(result, inputs), [result, inputs]);

  const isRedundancyReason = inputs.terminationReason === 'redundancy' || inputs.terminationReason === 'non-genuine';

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const colorEtp    = theme === 'dark' ? '#9E98E8' : '#7F77DD';
  const colorLeave  = theme === 'dark' ? '#D9931E' : '#BA7517';
  const colorNotice = theme === 'dark' ? '#5BA4E8' : '#378ADD';
  const colorRed    = theme === 'dark' ? '#E87070' : '#D85A30';
  const colorNet    = chartAccent;

  // Waterfall: one stacked "total payout" bar, then each tax as a reduction
  // floating on a transparent spacer, then net. Gross components and net are
  // never plotted side by side — that double-counts.
  const waterfallData = useMemo(() => {
    const T = 'transparent';
    const wfEtp    = Math.round(result.etpGross);
    const wfLeave  = Math.round(result.annualLeavePay + result.lslPay);
    const wfNotice = Math.round(result.noticePay);
    const entries = [{
      name: 'Total payout',
      spacer: 0,
      s1: wfEtp,    c1: colorEtp,
      s2: wfLeave,  c2: colorLeave,
      s3: wfNotice, c3: colorNotice,
    }];
    let running = wfEtp + wfLeave + wfNotice;
    const drop = (name, amount) => {
      const v = Math.round(amount);
      if (v <= 0) return;
      running -= v;
      entries.push({ name, spacer: running, s1: v, c1: colorRed, s2: 0, c2: T, s3: 0, c3: T });
    };
    drop('ETP tax', result.etpTax);
    drop('Leave tax', result.annualLeaveTax + result.lslTax);
    drop('Notice tax', result.noticeTax);
    entries.push({ name: 'Net', spacer: 0, s1: Math.round(result.netTakeHome), c1: colorNet, s2: 0, c2: T, s3: 0, c3: T });
    return entries;
  }, [result, colorEtp, colorLeave, colorNotice, colorRed, colorNet]);

  // Text alternative for the waterfall — the same figures the bars plot. The
  // "type" column is the non-colour cue for what each fill encodes.
  const altEtp       = Math.round(result.etpGross);
  const altLeave     = Math.round(result.annualLeavePay + result.lslPay);
  const altNotice    = Math.round(result.noticePay);
  const altGross     = altEtp + altLeave + altNotice;
  const altNet       = Math.round(result.netTakeHome);
  const altEtpTax    = Math.round(result.etpTax);
  const altLeaveTax  = Math.round(result.annualLeaveTax + result.lslTax);
  const altNoticeTax = Math.round(result.noticeTax);
  const chartRows = [
    { key: 'etp', label: 'Redundancy pay and ETP', kind: 'Payment', value: altEtp },
    ...(altLeave > 0 ? [{ key: 'leave', label: 'Leave payout (annual and long service)', kind: 'Payment', value: altLeave }] : []),
    ...(altNotice > 0 ? [{ key: 'notice', label: 'Notice pay', kind: 'Payment', value: altNotice }] : []),
    { key: 'gross', label: 'Total payout', kind: 'Subtotal', value: altGross },
    ...(altEtpTax > 0 ? [{ key: 'etptax', label: 'ETP tax', kind: 'Deduction', value: -altEtpTax }] : []),
    ...(altLeaveTax > 0 ? [{ key: 'leavetax', label: 'Leave tax', kind: 'Deduction', value: -altLeaveTax }] : []),
    ...(altNoticeTax > 0 ? [{ key: 'noticetax', label: 'Notice tax', kind: 'Deduction', value: -altNoticeTax }] : []),
    { key: 'net', label: 'Net take-home', kind: 'Take-home', value: altNet },
  ];
  const chartAlt =
    `Payout waterfall. Total payout ${fmt(altGross)}, made up of redundancy pay and ETP ${fmt(altEtp)}`
    + (altLeave > 0 ? `, leave payout ${fmt(altLeave)}` : '')
    + (altNotice > 0 ? `, notice pay ${fmt(altNotice)}` : '')
    + `. Less tax of ${fmt(altEtpTax + altLeaveTax + altNoticeTax)}, leaving net take-home of ${fmt(altNet)}.`;

  return (
    <div className="calc-instance">
      {isComparison && (
        <div className="instance-header">
          <span className="instance-label">{label}</span>
          <button className="instance-remove" onClick={onRemove || undefined} title="Remove scenario"
            style={!onRemove ? { visibility: 'hidden', pointerEvents: 'none' } : {}}>×</button>
        </div>
      )}

      {!isComparison ? (
        <div className="calc-heading">
          <h1>Redundancy Pay Calculator<br /><span className="calc-heading-sub">Termination + Tax-Free Threshold</span></h1>
          <p>Estimate your redundancy payout including the tax-free component, leave payouts, notice pay and total tax. Based on {result.rates.__fy.replace('-', '–')} ATO figures and the Fair Work Act NES.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Redundancy</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Employment details</div>
            <div className="field">
              <label htmlFor={`${uid}-baserate`}>Weekly base rate of pay</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-baserate`} type="number" inputMode="decimal" aria-describedby={`${uid}-baserate-note`} value={inputs.weeklyBaseRate || ''} onChange={setNum('weeklyBaseRate')} min="0" step="50" />
              </div>
              <div className="offset-note" id={`${uid}-baserate-note`} style={{ marginTop: 4, marginBottom: 0 }}>
                Ordinary hours only — excludes overtime, penalties, allowances, loadings and bonuses. Redundancy pay and leave are paid at this rate.
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-fullrate`}>Weekly full rate of pay (for notice)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-fullrate`} type="number" inputMode="decimal" aria-describedby={`${uid}-fullrate-note`} value={inputs.weeklyFullRate || ''} onChange={setNum('weeklyFullRate')} min="0" step="50" />
              </div>
              <div className="offset-note" id={`${uid}-fullrate-note`} style={{ marginTop: 4, marginBottom: 0 }}>
                Includes overtime, penalties, allowances, loadings and bonuses. Payment in lieu of notice uses this rate.
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-otherincome`}>Other taxable income this year (for tax rates)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-otherincome`} type="number" inputMode="decimal" value={inputs.grossAnnualIncome || ''} onChange={setNum('grossAnnualIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-yearsservice`}>Years of continuous service</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-yearsservice`} type="number" inputMode="decimal" value={inputs.yearsService || ''} onChange={setNum('yearsService')} min="0" max="50" step="0.25" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-age`}>Age at termination</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-age`} type="number" inputMode="numeric" value={inputs.age || ''} onChange={setNum('age')} min="16" max="80" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label id={`${uid}-basis-label`}>Employment basis</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-basis-label`}>
                {[['permanent','Permanent'],['fixedTerm','Fixed term'],['casual','Casual'],['apprentice','Apprentice']].map(([v,l]) => (
                  <button key={v} className={inputs.employmentBasis === v ? 'active' : ''} role="radio" aria-checked={inputs.employmentBasis === v} onClick={() => set('employmentBasis', v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Employer size</div>
            <div className="field">
              <label id={`${uid}-smallbiz-label`}>Small business employer (under 15 employees)</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-smallbiz-label`}>
                <button className={inputs.smallBusinessEmployer ? 'active' : ''} role="radio" aria-checked={inputs.smallBusinessEmployer} onClick={() => set('smallBusinessEmployer', true)}>Yes</button>
                <button className={!inputs.smallBusinessEmployer ? 'active' : ''} role="radio" aria-checked={!inputs.smallBusinessEmployer} onClick={() => set('smallBusinessEmployer', false)}>No</button>
              </div>
            </div>
            {inputs.smallBusinessEmployer && (
              <>
                <div className="field">
                  <label htmlFor={`${uid}-headcount`}>Employees by headcount</label>
                  <div className="input-wrap has-suffix">
                    <input id={`${uid}-headcount`} type="number" inputMode="numeric" aria-describedby={`${uid}-headcount-note`} value={inputs.employeeHeadcount || ''} onChange={setNum('employeeHeadcount')} min="1" max="500" step="1" />
                    <span className="input-suffix">ppl</span>
                  </div>
                  <div className="offset-note" id={`${uid}-headcount-note`} style={{ marginTop: 4, marginBottom: 0 }}>
                    Headcount, not full-time equivalent. Include regular and systematic casuals; associated entities count as one employer.
                  </div>
                </div>
                <div className="field">
                  <label id={`${uid}-insolvent-label`}>Employer bankrupt or in liquidation</label>
                  <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-insolvent-label`}>
                    <button className={inputs.employerInsolvent ? 'active' : ''} role="radio" aria-checked={inputs.employerInsolvent} onClick={() => set('employerInsolvent', true)}>Yes</button>
                    <button className={!inputs.employerInsolvent ? 'active' : ''} role="radio" aria-checked={!inputs.employerInsolvent} onClick={() => set('employerInsolvent', false)}>No</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title" id={`${uid}-reason-label`}>Termination reason</div>
            <div className="field">
              <select className="field-select" aria-labelledby={`${uid}-reason-label`} value={inputs.terminationReason} onChange={e => set('terminationReason', e.target.value)}>
                <option value="redundancy">Genuine redundancy (NES applies)</option>
                <option value="resignation">Resignation</option>
                <option value="dismissal">Dismissal</option>
                <option value="non-genuine">Redundancy (not genuine)</option>
              </select>
            </div>
            {inputs.terminationReason === 'dismissal' && (
              <div className="field">
                <label id={`${uid}-misconduct-label`}>Dismissed for serious misconduct</label>
                <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-misconduct-label`}>
                  <button className={inputs.seriousMisconduct ? 'active' : ''} role="radio" aria-checked={inputs.seriousMisconduct} onClick={() => set('seriousMisconduct', true)}>Yes</button>
                  <button className={!inputs.seriousMisconduct ? 'active' : ''} role="radio" aria-checked={!inputs.seriousMisconduct} onClick={() => set('seriousMisconduct', false)}>No</button>
                </div>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">Leave &amp; notice</div>
            <div className="field">
              <label htmlFor={`${uid}-annualleave`}>Unused annual leave (days)</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-annualleave`} type="number" inputMode="decimal" value={inputs.unusedAnnualLeaveDays || ''} onChange={setNum('unusedAnnualLeaveDays')} min="0" step="1" />
                <span className="input-suffix">days</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-lsldays`}>Unused long service leave (days)</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-lsldays`} type="number" inputMode="decimal" value={inputs.unusedLslDays || ''} onChange={setNum('unusedLslDays')} min="0" step="1" />
                <span className="input-suffix">days</span>
              </div>
            </div>
            {inputs.unusedLslDays > 0 && (
              <div className="field">
                <label id={`${uid}-lslsplit-label`}>LSL accrual periods</label>
                <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-lslsplit-label`} aria-describedby={`${uid}-lslsplit-note`}>
                  <button className={!inputs.splitLsl ? 'active' : ''} role="radio" aria-checked={!inputs.splitLsl} onClick={() => set('splitLsl', false)}>All post-Aug 1993</button>
                  <button className={inputs.splitLsl ? 'active' : ''} role="radio" aria-checked={inputs.splitLsl} onClick={() => set('splitLsl', true)}>Split by period</button>
                </div>
                <div className="offset-note" id={`${uid}-lslsplit-note`} style={{ marginTop: 4, marginBottom: 0 }}>
                  Apportion by days, not dollars. Leave already taken counts against the period it was used in.
                </div>
              </div>
            )}
            {inputs.unusedLslDays > 0 && inputs.splitLsl && (
              <>
                <div className="field">
                  <label htmlFor={`${uid}-lslpre1978`}>Accrued before 16 Aug 1978 (days)</label>
                  <div className="input-wrap has-suffix">
                    <input id={`${uid}-lslpre1978`} type="number" inputMode="decimal" value={inputs.lslPre1978Days || ''} onChange={setNum('lslPre1978Days')} min="0" step="1" />
                    <span className="input-suffix">days</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-lsl1978to1993`}>Accrued 16 Aug 1978 – 17 Aug 1993 (days)</label>
                  <div className="input-wrap has-suffix">
                    <input id={`${uid}-lsl1978to1993`} type="number" inputMode="decimal" aria-describedby={`${uid}-lslremainder-note`} value={inputs.lsl1978to1993Days || ''} onChange={setNum('lsl1978to1993Days')} min="0" step="1" />
                    <span className="input-suffix">days</span>
                  </div>
                </div>
                <div className="offset-note" id={`${uid}-lslremainder-note`}>
                  Remaining {Math.round((result.lslPost1993 / (result.baseRate / 5 || 1)))} days treated as post-17 Aug 1993 accrual.
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor={`${uid}-noticeweeks`}>Notice paid in lieu (weeks)</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-noticeweeks`} type="number" inputMode="decimal" value={inputs.noticePaidWeeks || ''} onChange={setNum('noticePaidWeeks')} min="0" step="0.5" />
                <span className="input-suffix">wks</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-exgratia`}>Ex gratia / severance on top of the NES</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-exgratia`} type="number" inputMode="decimal" value={inputs.otherEtpAmount || ''} onChange={setNum('otherEtpAmount')} min="0" step="1000" placeholder="0 if none" />
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">Net take-home</div>
            <div className="savings-amount" aria-live="polite" aria-atomic="true">{fmt(result.netTakeHome)}</div>
            <div className="savings-sub">from total payout of {fmt(result.totalGross)}</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Tax-free amount</div>
                <div className="savings-stat-value">{fmt(result.taxFreeAmount)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Total tax</div>
                <div className="savings-stat-value">{fmt(result.totalTax)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Effective rate</div>
                <div className="savings-stat-value">{fmtPct(result.effectiveTaxRate)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">ETP ceiling</div>
                <div className="savings-stat-value">{fmtPct(result.concessionalRate)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Redundancy pay ({result.redundancyWeeks} weeks)</div>
              <div className="stat-card-value">{fmt(result.redundancyPay)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Leave payout</div>
              <div className="stat-card-value">{fmt(result.annualLeavePay + result.lslPay)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Notice pay</div>
              <div className="stat-card-value">{fmt(result.noticePay)}</div>
            </div>
          </div>

          {isRedundancyReason && !result.nesEntitled && (
            <div className="rate-callout">
              <strong>No redundancy pay under the NES minimum</strong>
              {result.nes.reasons.join(' ')} Notice and unused leave are still owed.
            </div>
          )}

          {inputs.terminationReason === 'redundancy' && !result.underAgePensionAge && (
            <div className="rate-callout">
              <strong>Over Age Pension age ({result.agePensionAge}) — no tax-free amount</strong>
              Tax-free treatment of a genuine redundancy requires being under Age Pension age. The payment is taxed as an ordinary ETP and the whole-of-income cap applies.
            </div>
          )}

          {result.isGenuineRedundancy && (
            <div className="rate-callout">
              <strong>Tax-free limit: {fmt(result.taxFreeLimit)}</strong>
              {fmt(result.rates.termination.genuineRedundancy.baseLimit)} plus {fmt(result.rates.termination.genuineRedundancy.perYearOfService)} for each of {Math.floor(inputs.yearsService)} completed years. The excess is taxed at your marginal rate, capped at {fmtPct(result.concessionalRate)}{result.concessionalRate === result.rates.termination.etp.rateAtPreservationAge ? ' (at or above preservation age)' : ''}.
            </div>
          )}

          {result.wholeOfIncomeCapApplies && result.taxableETP > 0 && (
            <div className="rate-callout">
              <strong>Whole-of-income cap: {fmt(result.wholeOfIncomeCapRemaining)} remaining</strong>
              This payment is not an excluded ETP, so the {fmt(result.wholeOfIncomeCap)} whole-of-income cap applies as well as the {fmt(result.etpCap)} ETP cap. The cap is not indexed and is reduced by your other taxable income. {result.capBinding === 'wholeOfIncomeCap' ? 'It is the binding cap here.' : 'The ETP cap is the binding cap here.'}
            </div>
          )}

          {result.etpAboveCap > 0 && (
            <div className="rate-callout">
              <strong>{fmt(result.etpAboveCap)} above the cap</strong>
              Amounts over {fmt(result.applicableCap)} get no concessional offset and are taxed at the top rate of {fmtPct(result.rates.termination.etp.rateAboveCap)}, adding {fmt(result.etpTaxAboveCap)} of tax.
            </div>
          )}

          {(result.annualLeaveCapped || result.lslPost1993Capped) && (result.annualLeavePay + result.lslPay) > 0 && (
            <div className="rate-callout">
              <strong>Unused leave capped at 32%</strong>
              On a genuine redundancy, unused annual leave and post-17 Aug 1993 long service leave are taxed at your marginal rate but capped at 32%. On a resignation the post-1993 component would be taxed at marginal rates throughout.
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Payout waterfall</div>
            <div role="img" aria-label={chartAlt}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={waterfallData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'Plus Jakarta Sans' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  width={50}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label: barLabel }) => {
                    if (!active || !payload) return null;
                    const d = waterfallData.find(e => e.name === barLabel);
                    if (!d) return null;
                    const total = (d.s1 || 0) + (d.s2 || 0) + (d.s3 || 0);
                    const topColor = d.s3 > 0 ? d.c3 : d.s2 > 0 ? d.c2 : d.c1;
                    return (
                      <div style={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)', padding: '6px 10px', fontFamily: 'Plus Jakarta Sans' }}>
                        <div style={{ marginBottom: 2, fontWeight: 600 }}>{barLabel}</div>
                        <div style={{ color: topColor }}>{fmt(total)}</div>
                      </div>
                    );
                  }}
                />
                {/* spacer: transparent bar that lifts reduction bars to correct Y position */}
                <Bar dataKey="spacer" stackId="wf" fill="transparent" legendType="none" />
                {/* s1: redundancy + ETP (purple) / taxes (red) / net (green) */}
                <Bar dataKey="s1" stackId="wf" legendType="none">
                  {waterfallData.map(d => <Cell key={d.name} fill={d.c1} />)}
                </Bar>
                {/* s2: leave payout (orange), only non-zero on the first bar */}
                <Bar dataKey="s2" stackId="wf" legendType="none">
                  {waterfallData.map(d => <Cell key={d.name} fill={d.c2} />)}
                </Bar>
                {/* s3: notice pay (blue), only non-zero on the first bar */}
                <Bar dataKey="s3" stackId="wf" legendType="none">
                  {waterfallData.map(d => <Cell key={d.name} fill={d.c3} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
            <table className="visually-hidden">
              <caption>Payout waterfall — same figures as the chart</caption>
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col">Type</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {chartRows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">{r.label}</th>
                    <td>{r.kind}</td>
                    <td>{r.value < 0 ? `minus ${fmt(Math.abs(r.value))}` : fmt(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.caveats.length > 0 && (
            <div className="offset-note">
              {result.caveats.map((c, i) => <div key={i}>• {c}</div>)}
            </div>
          )}

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Based on {result.rates.__fy.replace('-', '–')} ATO rates and Fair Work Act NES minimums: ETP cap {fmt(result.etpCap)}, whole-of-income cap {fmt(result.wholeOfIncomeCap)} (not indexed), genuine redundancy tax-free limit {fmt(result.rates.termination.genuineRedundancy.baseLimit)} plus {fmt(result.rates.termination.genuineRedundancy.perYearOfService)} per completed year. Awards and enterprise agreements can improve on the NES minimum. Assumes Australian residency, no offsets other than the ETP and unused-leave offsets, and no other ETPs received this year. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
