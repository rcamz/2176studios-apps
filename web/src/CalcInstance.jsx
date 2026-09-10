import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { amortize, summarize, rateSensitivity, explainAmortisation, PERIODS_PER_YEAR } from './lib/amortize.js';
import { estimateLmi, LMI_DISCLOSURE } from './lib/lmi.js';
import Workings from './Workings.jsx';
import { fmt, fmtShort, monthsToLabel } from './lib/format.js';
import { num, bool, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const FREQ_LABEL = { monthly: 'Monthly', fortnightly: 'Fortnightly', weekly: 'Weekly' };

function payoffDate(months, startISO) {
  const d = startISO ? new Date(startISO) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULTS = {
  loanAmount: 650000,
  propertyValue: 0,
  termYears: 30,
  annualRatePercent: 6.2,
  paymentFrequency: 'monthly',
  interestOnlyYears: 0,
  loanStart: todayISO(),
  rateType: 'variable',
  fixedRatePercent: 5.8,
  fixedPeriodYears: 2,
  revertRatePercent: 6.5,
  splitMode: 'pct',
  splitFixedPct: 60,
  splitFixedAmt: 390000,
  splitVariableRatePercent: 6.2,
  offsetStart: 25000,
  offsetMonthly: 3500,
  offsetAppliesDuringFixed: false,
  offsetLumps: [],
  offsetWithdrawals: [],
  extraRecurring: 0,
  extraLumps: [],
};

const FREQ_CODE = { m: 'monthly', f: 'fortnightly', w: 'weekly' };

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('loan', inp.loanAmount);
  p.set('term', inp.termYears);
  p.set('rate', inp.annualRatePercent);
  p.set('pf',   inp.paymentFrequency[0]);
  p.set('rt',   inp.rateType[0]);
  if (inp.propertyValue)     p.set('pv', inp.propertyValue);
  if (inp.interestOnlyYears) p.set('io', inp.interestOnlyYears);
  if (inp.loanStart)         p.set('ls', inp.loanStart);
  if (inp.rateType !== 'variable') {
    p.set('fr', inp.fixedRatePercent);
    p.set('fp', inp.fixedPeriodYears);
    p.set('rr', inp.revertRatePercent);
    p.set('of', inp.offsetAppliesDuringFixed ? '1' : '0');
  }
  if (inp.rateType === 'split') {
    p.set('sm', inp.splitMode[0]);
    p.set('sp', inp.splitFixedPct);
    p.set('sa', inp.splitFixedAmt);
    p.set('vr', inp.splitVariableRatePercent);
  }
  p.set('os', inp.offsetStart);
  p.set('om', inp.offsetMonthly);
  if (inp.offsetLumps.length)       p.set('ol', JSON.stringify(inp.offsetLumps.map(l => [l.month, l.amount])));
  if (inp.offsetWithdrawals.length) p.set('ow', JSON.stringify(inp.offsetWithdrawals.map(l => [l.month, l.amount])));
  if (inp.extraRecurring)           p.set('xr', inp.extraRecurring);
  if (inp.extraLumps.length)        p.set('xl', JSON.stringify(inp.extraLumps.map(l => [l.month, l.amount])));
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('loan')) return {};
  const parseLumps = (key) => {
    try { return (JSON.parse(p.get(key)) ?? []).map(([month, amount]) => ({ month, amount })); }
    catch { return []; }
  };
  return {
    loanAmount:               num(p.get('loan'), DEFAULTS.loanAmount),
    propertyValue:            num(p.get('pv'),   0),
    termYears:                num(p.get('term'), DEFAULTS.termYears),
    annualRatePercent:        num(p.get('rate'), DEFAULTS.annualRatePercent),
    paymentFrequency:         enumOf(p.get('pf'), FREQ_CODE, 'monthly'),
    interestOnlyYears:        num(p.get('io'), 0),
    loanStart:                p.get('ls') || todayISO(),
    rateType:                 enumOf(p.get('rt'), { v: 'variable', f: 'fixed', s: 'split' }, 'variable'),
    fixedRatePercent:         num(p.get('fr'), DEFAULTS.fixedRatePercent),
    fixedPeriodYears:         num(p.get('fp'), DEFAULTS.fixedPeriodYears),
    revertRatePercent:        num(p.get('rr'), DEFAULTS.revertRatePercent),
    offsetAppliesDuringFixed: bool(p.get('of'), false),
    splitMode:                enumOf(p.get('sm'), { p: 'pct', d: 'dollar' }, 'pct'),
    splitFixedPct:            num(p.get('sp'), DEFAULTS.splitFixedPct),
    splitFixedAmt:            num(p.get('sa'), DEFAULTS.splitFixedAmt),
    splitVariableRatePercent: num(p.get('vr'), DEFAULTS.splitVariableRatePercent),
    offsetStart:              num(p.get('os'), DEFAULTS.offsetStart),
    offsetMonthly:            num(p.get('om'), DEFAULTS.offsetMonthly),
    offsetLumps:              p.has('ol') ? parseLumps('ol') : [],
    offsetWithdrawals:        p.has('ow') ? parseLumps('ow') : [],
    extraRecurring:           num(p.get('xr'), 0),
    extraLumps:               p.has('xl') ? parseLumps('xl') : [],
  };
}

export default function CalcInstance({
  instanceKey = '', label, onRemove, theme = 'light', isComparison = false,
  seed = null, onStateChange = null,
}) {
  const [inputs, setInputs] = useState(() => {
    if (seed) return { ...seed };
    return instanceKey === ''
      ? { ...DEFAULTS, ...decodeParams(window.location.search) }
      : { ...DEFAULTS };
  });
  const [showTable, setShowTable] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);

  const set = (key, val) => setInputs((s) => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  // Only the primary instance owns the URL.
  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(new URLSearchParams(encodeInputs(inputs)));
  }, [inputs, instanceKey]);

  // Report state up so the wrapper can duplicate this scenario.
  useEffect(() => { onStateChange?.(inputs); }, [inputs, onStateChange]);

  const addLump = (key, seedRow) => set(key, [...inputs[key], seedRow]);
  const updateLump = (key, i, field, val) =>
    set(key, inputs[key].map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'amount' ? parseFloat(val) || 0 : parseInt(val) || 0 } : l));
  const removeLump = (key, i) => set(key, inputs[key].filter((_, idx) => idx !== i));

  const perYear = PERIODS_PER_YEAR[inputs.paymentFrequency] ?? 12;

  const { withRows, withSummary, baseSummary, offsetOnlySummary, chartData, rateSwitchPeriod, sensitivity, lmi } =
    useMemo(() => {
      const isSplit = inputs.rateType === 'split';
      const fixedAmt = isSplit
        ? (inputs.splitMode === 'dollar' ? inputs.splitFixedAmt : inputs.loanAmount * (inputs.splitFixedPct / 100))
        : inputs.loanAmount;
      const varAmt = isSplit ? inputs.loanAmount - fixedAmt : 0;

      const shared = {
        termYears: inputs.termYears,
        paymentFrequency: inputs.paymentFrequency,
        interestOnlyYears: inputs.interestOnlyYears,
        offsetStart: inputs.offsetStart,
        offsetMonthly: inputs.offsetMonthly,
        offsetLumps: inputs.offsetLumps,
        offsetWithdrawals: inputs.offsetWithdrawals,
        extraRecurring: inputs.extraRecurring,
        extraLumps: inputs.extraLumps,
        offsetAppliesDuringFixed: inputs.offsetAppliesDuringFixed,
      };

      const baseCfg = {
        ...shared,
        loanAmount: inputs.loanAmount,
        annualRatePercent: inputs.annualRatePercent,
        fixedRatePercent: inputs.rateType === 'fixed' ? inputs.fixedRatePercent : 0,
        fixedPeriodYears: inputs.rateType === 'fixed' ? inputs.fixedPeriodYears : 0,
        revertRatePercent: inputs.rateType === 'fixed' ? inputs.revertRatePercent : 0,
        includeOffset: true,
        includeExtras: true,
      };

      const mergeRows = (a, b) => {
        const len = Math.max(a.length, b.length);
        const empty = { payment: 0, interest: 0, principal: 0, balance: 0, offset: 0, offsetBalance: 0, isRateSwitch: false };
        return Array.from({ length: len }, (_, i) => {
          const f = a[i] ?? empty;
          const v = b[i] ?? empty;
          return {
            period: i + 1,
            monthIndex: (i + 1) / (perYear / 12),
            payment: f.payment + v.payment,
            interest: f.interest + v.interest,
            principal: f.principal + v.principal,
            balance: f.balance + v.balance,
            offset: v.offset,
            offsetBalance: v.offsetBalance,
            isRateSwitch: f.isRateSwitch ?? false,
            isInterestOnly: f.isInterestOnly ?? v.isInterestOnly ?? false,
          };
        });
      };

      // Offset on, extras off. Without this third run the interest saved by the
      // offset cannot be told apart from the interest saved by extra
      // repayments, and the explanation has to lump them together.
      let withRows, baseRows, offsetOnlyRows;
      if (isSplit) {
        // Offset and extra repayments apply to the variable portion only —
        // standard for AU lenders on a split facility.
        const fixedRows = amortize({
          ...shared, loanAmount: fixedAmt, annualRatePercent: inputs.fixedRatePercent,
          fixedRatePercent: inputs.fixedRatePercent, fixedPeriodYears: inputs.fixedPeriodYears,
          revertRatePercent: inputs.revertRatePercent, includeOffset: false, includeExtras: false,
        });
        const varRows = amortize({
          ...shared, loanAmount: varAmt, annualRatePercent: inputs.splitVariableRatePercent,
          includeOffset: true, includeExtras: true,
        });
        withRows = mergeRows(fixedRows, varRows);

        const fixedBase = amortize({
          ...shared, loanAmount: fixedAmt, annualRatePercent: inputs.fixedRatePercent,
          fixedRatePercent: inputs.fixedRatePercent, fixedPeriodYears: inputs.fixedPeriodYears,
          revertRatePercent: inputs.revertRatePercent, includeOffset: false, includeExtras: false,
        });
        const varBase = amortize({
          ...shared, loanAmount: varAmt, annualRatePercent: inputs.splitVariableRatePercent,
          offsetStart: 0, offsetMonthly: 0, offsetLumps: [], offsetWithdrawals: [],
          extraRecurring: 0, extraLumps: [], includeOffset: false, includeExtras: false,
        });
        baseRows = mergeRows(fixedBase, varBase);

        const varOffsetOnly = amortize({
          ...shared, loanAmount: varAmt, annualRatePercent: inputs.splitVariableRatePercent,
          extraRecurring: 0, extraLumps: [], includeOffset: true, includeExtras: false,
        });
        offsetOnlyRows = mergeRows(fixedRows, varOffsetOnly);
      } else {
        withRows = amortize(baseCfg);
        baseRows = amortize({
          ...baseCfg,
          offsetStart: 0, offsetMonthly: 0, offsetLumps: [], offsetWithdrawals: [],
          extraRecurring: 0, extraLumps: [],
          includeOffset: false, includeExtras: false,
        });
        offsetOnlyRows = amortize({
          ...baseCfg,
          extraRecurring: 0, extraLumps: [], includeExtras: false,
        });
      }

      const withSummary = summarize(withRows, inputs.paymentFrequency);
      const baseSummary = summarize(baseRows, inputs.paymentFrequency);
      const offsetOnlySummary = summarize(offsetOnlyRows, inputs.paymentFrequency);

      // Rows are 1-indexed by period, so the balance at the end of year Y is
      // index (Y × periodsPerYear) − 1. Indexing by the period number directly
      // reads a month late.
      const balanceAtYear = (rows, year) => {
        if (year <= 0) return inputs.loanAmount;
        const idx = Math.round(year * perYear) - 1;
        return idx >= rows.length ? 0 : rows[idx].balance;
      };

      const chartData = [];
      const years = Math.ceil(Math.max(withRows.length, baseRows.length) / perYear);
      for (let y = 0; y <= years; y++) {
        chartData.push({
          year: y,
          'With offset': Math.round(balanceAtYear(withRows, y)),
          'No offset':   Math.round(balanceAtYear(baseRows, y)),
        });
      }

      const rateSwitchPeriod = withRows.find((r) => r.isRateSwitch)?.period ?? null;
      const sensitivity = rateSensitivity(baseCfg);
      const lmi = inputs.propertyValue > 0
        ? estimateLmi({ loanAmount: inputs.loanAmount, propertyValue: inputs.propertyValue })
        : null;

      return { withRows, withSummary, baseSummary, offsetOnlySummary, chartData, rateSwitchPeriod, sensitivity, lmi };
    }, [inputs, perYear]);

  const explanation = useMemo(
    () => explainAmortisation(
      { withRows, withSummary, baseSummary, offsetOnlySummary, rateSwitchPeriod, lmi },
      inputs
    ),
    [withRows, withSummary, baseSummary, offsetOnlySummary, rateSwitchPeriod, lmi, inputs]
  );

  const interestSaved = baseSummary.totalInterest - withSummary.totalInterest;
  const monthsSaved = baseSummary.payoffMonths - withSummary.payoffMonths;
  const tableRows = showAllRows ? withRows : withRows.slice(0, 24);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const chartRed     = theme === 'dark' ? '#E87070' : '#D85A30';
  const chartBlue    = theme === 'dark' ? '#9E98E8' : '#7F77DD';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const freqNoun = inputs.paymentFrequency === 'monthly' ? 'Monthly'
    : inputs.paymentFrequency === 'fortnightly' ? 'Fortnightly' : 'Weekly';

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
          <h1>Mortgage Repayments<br /><span className="calc-heading-sub">Offset + Split + Multi-Scenario</span></h1>
          <p>A free, ad-supported Australian home loan calculator which handles offsets, fixed and split loans, fortnightly repayments, extra repayments and lump sum deposits and withdrawals.</p>
          <a className="desktop-cta" href={window.location.href + (window.location.search ? '&vd=1' : '?vd=1')} target="_blank" rel="noreferrer">
            Open desktop site to compare up to 3 loans at once →
          </a>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Mortgage Calculator</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">

          <div className="panel-section">
            <div className="section-title">Loan basics</div>
            <div className="field">
              <label>Loan amount</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.loanAmount || ''} onChange={setNum('loanAmount')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Property value <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— optional, for LVR and LMI</span></label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.propertyValue || ''} onChange={setNum('propertyValue')} min="0" step="10000" placeholder="0 to skip" />
              </div>
              {lmi && lmi.lvr !== null && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  LVR {(lmi.lvr * 100).toFixed(1)}%
                  {lmi.payable
                    ? ` · LMI approx ${fmt(lmi.low)}–${fmt(lmi.high)}`
                    : ' · no LMI payable'}
                </div>
              )}
            </div>
            <div className="field">
              <label>Loan term</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.termYears || ''} onChange={setNum('termYears')} min="1" max="40" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Repayment frequency</label>
              <div className="segmented">
                {['monthly', 'fortnightly', 'weekly'].map((f) => (
                  <button key={f} className={inputs.paymentFrequency === f ? 'active' : ''} onClick={() => set('paymentFrequency', f)}>
                    {FREQ_LABEL[f]}
                  </button>
                ))}
              </div>
              {inputs.paymentFrequency !== 'monthly' && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {inputs.paymentFrequency === 'fortnightly'
                    ? 'Half the monthly repayment, 26 times a year — 13 months’ worth.'
                    : 'A quarter of the monthly repayment, 52 times a year — 13 months’ worth.'}
                </div>
              )}
            </div>
            <div className="field">
              <label>Interest-only period</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.interestOnlyYears || ''} onChange={setNum('interestOnlyYears')} min="0" max={Math.max(0, inputs.termYears - 1)} step="1" placeholder="0" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Loan start</label>
              <input className="field-select" type="date" value={inputs.loanStart} onChange={(e) => set('loanStart', e.target.value)} />
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Interest rate</div>
            <div className="field">
              <label>Rate type</label>
              <div className="segmented">
                {['variable', 'fixed', 'split'].map((t) => (
                  <button key={t} className={inputs.rateType === t ? 'active' : ''} onClick={() => set('rateType', t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {inputs.rateType === 'variable' && (
              <div className="field">
                <label>Interest rate</label>
                <div className="input-wrap has-suffix">
                  <input type="number" value={inputs.annualRatePercent || ''} onChange={setNum('annualRatePercent')} min="0" max="20" step="0.05" />
                  <span className="input-suffix">% p.a.</span>
                </div>
              </div>
            )}

            {inputs.rateType === 'split' && (
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ marginBottom: 0 }}>Split</label>
                  <div className="segmented" style={{ width: 'auto' }}>
                    {['pct', 'dollar'].map((m) => (
                      <button key={m} className={inputs.splitMode === m ? 'active' : ''} onClick={() => set('splitMode', m)}
                        style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                        {m === 'pct' ? '%' : '$'}
                      </button>
                    ))}
                  </div>
                </div>
                {inputs.splitMode === 'pct' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                      <div className="input-wrap has-suffix">
                        <input type="number" value={inputs.splitFixedPct || ''} onChange={(e) => {
                          const v = Math.min(99, parseFloat(e.target.value) || 0);
                          set('splitFixedPct', v);
                          set('splitFixedAmt', Math.round(inputs.loanAmount * v / 100));
                        }} onBlur={() => {
                          const v = Math.min(99, Math.max(1, inputs.splitFixedPct));
                          set('splitFixedPct', v);
                          set('splitFixedAmt', Math.round(inputs.loanAmount * v / 100));
                        }} max="99" step="1" />
                        <span className="input-suffix">% fixed</span>
                      </div>
                      <span style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>/</span>
                      <div className="input-wrap has-suffix">
                        <input type="number" value={100 - inputs.splitFixedPct} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
                        <span className="input-suffix">% variable</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>fixed ({fmt(inputs.splitFixedAmt)})</span>
                      <span>variable ({fmt(inputs.loanAmount - inputs.splitFixedAmt)})</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                      <div className="input-wrap has-prefix">
                        <span className="input-prefix">$</span>
                        <input type="number" value={inputs.splitFixedAmt || ''} onChange={(e) => {
                          const v = Math.min(inputs.loanAmount - 1, parseFloat(e.target.value) || 0);
                          set('splitFixedAmt', v);
                          set('splitFixedPct', Math.round(v / inputs.loanAmount * 100));
                        }} onBlur={() => {
                          const v = Math.min(inputs.loanAmount - 1, Math.max(1, inputs.splitFixedAmt));
                          set('splitFixedAmt', v);
                          set('splitFixedPct', Math.round(v / inputs.loanAmount * 100));
                        }} step="1000" />
                      </div>
                      <span style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>/</span>
                      <div className="input-wrap has-prefix">
                        <span className="input-prefix">$</span>
                        <input type="number" value={inputs.loanAmount - inputs.splitFixedAmt} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>fixed ({Math.round(inputs.splitFixedAmt / inputs.loanAmount * 100)}%)</span>
                      <span>variable ({Math.round((inputs.loanAmount - inputs.splitFixedAmt) / inputs.loanAmount * 100)}%)</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {(inputs.rateType === 'fixed' || inputs.rateType === 'split') && (
              <>
                <div className="field">
                  <label>Fixed rate</label>
                  <div className="input-wrap has-suffix">
                    <input type="number" value={inputs.fixedRatePercent || ''} onChange={setNum('fixedRatePercent')} min="0" max="20" step="0.05" />
                    <span className="input-suffix">% p.a.</span>
                  </div>
                </div>
                <div className="field">
                  <label>Fixed period</label>
                  <div className="input-wrap has-suffix">
                    <input type="number" value={inputs.fixedPeriodYears || ''} onChange={setNum('fixedPeriodYears')} min="1" max="10" step="1" />
                    <span className="input-suffix">yrs</span>
                  </div>
                </div>
                <div className="field">
                  <label>Revert rate (after fixed)</label>
                  <div className="input-wrap has-suffix">
                    <input type="number" value={inputs.revertRatePercent || ''} onChange={setNum('revertRatePercent')} min="0" max="20" step="0.05" />
                    <span className="input-suffix">% p.a.</span>
                  </div>
                </div>
                {inputs.rateType === 'fixed' && (
                  <div className="field">
                    <label>Offset applies during fixed period?</label>
                    <div className="segmented">
                      <button className={inputs.offsetAppliesDuringFixed ? 'active' : ''} onClick={() => set('offsetAppliesDuringFixed', true)}>Yes</button>
                      <button className={!inputs.offsetAppliesDuringFixed ? 'active' : ''} onClick={() => set('offsetAppliesDuringFixed', false)}>No</button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Varies by lender. Either way the balance keeps building and offsets once the loan reverts.
                    </div>
                  </div>
                )}
                {inputs.rateType === 'split' && (
                  <div className="field">
                    <label>Variable portion rate</label>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={inputs.splitVariableRatePercent || ''} onChange={setNum('splitVariableRatePercent')} min="0" max="20" step="0.05" />
                      <span className="input-suffix">% p.a.</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">Extra repayments</div>
            <div className="field">
              <label>Extra per month</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.extraRecurring || ''} onChange={setNum('extraRecurring')} min="0" step="100" />
              </div>
            </div>
            {inputs.extraLumps.length > 0 && (
              <div className="lump-list">
                {inputs.extraLumps.map((lump, i) => (
                  <div key={i} className="lump-row">
                    <div className="input-wrap has-prefix">
                      <span className="input-prefix">$</span>
                      <input type="number" value={lump.amount || ''} onChange={(e) => updateLump('extraLumps', i, 'amount', e.target.value)} min="0" step="1000" placeholder="Amount" />
                    </div>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={lump.month || ''} onChange={(e) => updateLump('extraLumps', i, 'month', e.target.value)} min="1" max={inputs.termYears * 12} placeholder="Month" />
                      <span className="input-suffix" style={{ fontSize: '0.75rem' }}>mo</span>
                    </div>
                    <button onClick={() => removeLump('extraLumps', i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-lump" onClick={() => addLump('extraLumps', { month: 12, amount: 5000 })}>+ Add lump sum repayment</button>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>

          <div className="panel-section">
            <div className="section-title">Offset account</div>
            <p className="offset-note">Offset applies to the variable portion only — standard for AU lenders.</p>
            <div className="field">
              <label>Starting balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.offsetStart || ''} onChange={setNum('offsetStart')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Monthly increase (e.g. salary)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.offsetMonthly || ''} onChange={setNum('offsetMonthly')} min="0" step="100" />
              </div>
            </div>
            {inputs.offsetLumps.length > 0 && (
              <div className="lump-list">
                {inputs.offsetLumps.map((lump, i) => (
                  <div key={i} className="lump-row">
                    <div className="input-wrap has-prefix">
                      <span className="input-prefix">$</span>
                      <input type="number" value={lump.amount || ''} onChange={(e) => updateLump('offsetLumps', i, 'amount', e.target.value)} min="0" step="1000" placeholder="Amount" />
                    </div>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={lump.month || ''} onChange={(e) => updateLump('offsetLumps', i, 'month', e.target.value)} min="1" max={inputs.termYears * 12} placeholder="Month" />
                      <span className="input-suffix" style={{ fontSize: '0.75rem' }}>mo</span>
                    </div>
                    <button onClick={() => removeLump('offsetLumps', i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-lump" onClick={() => addLump('offsetLumps', { month: 12, amount: 10000 })}>+ Add lump sum deposit</button>
            {inputs.offsetWithdrawals.length > 0 && (
              <div className="lump-list" style={{ marginTop: 8 }}>
                {inputs.offsetWithdrawals.map((lump, i) => (
                  <div key={i} className="lump-row">
                    <div className="input-wrap has-prefix">
                      <span className="input-prefix">$</span>
                      <input type="number" value={lump.amount || ''} onChange={(e) => updateLump('offsetWithdrawals', i, 'amount', e.target.value)} min="0" step="1000" placeholder="Amount" />
                    </div>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={lump.month || ''} onChange={(e) => updateLump('offsetWithdrawals', i, 'month', e.target.value)} min="1" max={inputs.termYears * 12} placeholder="Month" />
                      <span className="input-suffix" style={{ fontSize: '0.75rem' }}>mo</span>
                    </div>
                    <button onClick={() => removeLump('offsetWithdrawals', i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-lump" onClick={() => addLump('offsetWithdrawals', { month: 12, amount: 5000 })}>+ Add lump sum withdrawal</button>
          </div>

        </div>

        <div className="results-panel">

          <div className="savings-card">
            <div className="savings-label">You save</div>
            <div className="savings-amount">{fmt(interestSaved)}</div>
            <div className="savings-sub">in interest compared to no offset or extra repayments</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Time saved</div>
                <div className="savings-stat-value">{monthsSaved > 0 ? monthsToLabel(monthsSaved) : '—'}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Paid off</div>
                <div className="savings-stat-value">{payoffDate(withSummary.payoffMonths, inputs.loanStart)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Loan term</div>
                <div className="savings-stat-value">{monthsToLabel(withSummary.payoffMonths)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Total interest (with offset)</div>
              <div className="stat-card-value">{fmt(withSummary.totalInterest)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total interest (no offset)</div>
              <div className="stat-card-value">{fmt(baseSummary.totalInterest)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">{freqNoun} repayment</div>
              <div className="stat-card-value">{withRows[0] ? fmt(withRows[0].payment) : '—'}</div>
            </div>
          </div>

          {rateSwitchPeriod && (
            <div className="rate-callout">
              <strong>Fixed rate expires at month {Math.round(rateSwitchPeriod / (perYear / 12))}</strong>
              Your repayment changes from {fmt(withRows[rateSwitchPeriod - 2]?.payment ?? 0)} to{' '}
              {fmt(withRows[rateSwitchPeriod - 1]?.payment ?? 0)} per {inputs.paymentFrequency === 'monthly' ? 'month' : inputs.paymentFrequency === 'fortnightly' ? 'fortnight' : 'week'} when reverting to {inputs.revertRatePercent}% p.a.
            </div>
          )}

          {inputs.interestOnlyYears > 0 && (
            <div className="rate-callout">
              <strong>Interest-only for {inputs.interestOnlyYears} {inputs.interestOnlyYears === 1 ? 'year' : 'years'}</strong>
              No principal is repaid during this period, so the balance stays at {fmt(inputs.loanAmount)}. Repayments then rise to clear the loan over the remaining term.
            </div>
          )}

          {lmi && lmi.payable && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>LMI likely payable — approx {fmt(lmi.low)} to {fmt(lmi.high)}</strong>
              At {(lmi.lvr * 100).toFixed(1)}% LVR. {LMI_DISCLOSURE} Usually capitalised into the loan, which lifts the effective LVR and roughly doubles the cost over 30 years. A {fmt(inputs.propertyValue * 0.2)} deposit would avoid it.
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Loan balance over time</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: chartGrid }} tickLine={false} interval={4} />
                <YAxis tickFormatter={fmtShort}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  width={52} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [fmt(v), name]} labelFormatter={(l) => `Year ${l}`}
                  contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)', fontFamily: 'Plus Jakarta Sans' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="With offset" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="No offset" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="schedule-card">
            <div className="schedule-header" onClick={() => setShowSensitivity((v) => !v)}>
              <span className="schedule-title">What if rates change?</span>
              <span className="schedule-toggle">{showSensitivity ? '▲ Hide' : '▼ Show'}</span>
            </div>
            {showSensitivity && (
              <div style={{ padding: '12px 0' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sensitivity} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="delta" tickFormatter={(v) => v === 0 ? 'Now' : `${v > 0 ? '+' : ''}${v}%`}
                      tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                      width={52} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      labelFormatter={(l) => l === 0 ? 'Current rate' : `Rate ${l > 0 ? '+' : ''}${l}%`}
                      contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                    <Bar dataKey="payment" name={`${freqNoun} repayment`} radius={[3, 3, 0, 0]}>
                      {sensitivity.map((s, i) => (
                        <Cell key={i} fill={s.delta < 0 ? chartAccent : s.delta > 0 ? chartRed : chartBlue} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                  A {sensitivity[sensitivity.length - 1].delta}% rise takes your repayment to{' '}
                  {fmt(sensitivity[sensitivity.length - 1].payment)} — {fmt(sensitivity[sensitivity.length - 1].payment - (withRows[0]?.payment ?? 0))} more per {inputs.paymentFrequency === 'monthly' ? 'month' : inputs.paymentFrequency === 'fortnightly' ? 'fortnight' : 'week'}.
                </div>
              </div>
            )}
          </div>

          <div className="schedule-card">
            <div className="schedule-header" onClick={() => setShowTable((v) => !v)}>
              <span className="schedule-title">Repayment schedule</span>
              <span className="schedule-toggle">{showTable ? '▲ Hide' : '▼ Show'}</span>
            </div>
            {showTable && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>{inputs.paymentFrequency === 'monthly' ? 'Mo' : '#'}</th>
                        <th>Payment</th><th>Interest</th>
                        <th>Principal</th><th>Balance</th><th>Offset</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r) => (
                        <tr key={r.period} className={r.isRateSwitch ? 'rate-switch' : ''}>
                          <td>{r.period}{r.isRateSwitch ? ' ⚡' : ''}</td>
                          <td>{fmt(r.payment)}</td>
                          <td>{fmt(r.interest)}</td>
                          <td>{fmt(r.principal)}</td>
                          <td>{fmt(r.balance)}</td>
                          <td>{r.offset > 0 ? fmt(r.offset) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!showAllRows && withRows.length > 24 && (
                  <button className="show-all-btn" onClick={() => setShowAllRows(true)}>
                    Show all {withRows.length} payments
                  </button>
                )}
              </>
            )}
          </div>

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Interest calculated per repayment period (lenders use daily). Offset assumed 100% effective on the variable portion. Fortnightly and weekly repayments assume half or a quarter of the monthly amount, which is standard practice but confirm with your lender. Does not include lender fees or stamp duty.
          </div>

        </div>
      </div>
    </div>
  );
}

export { DEFAULTS as MORTGAGE_DEFAULTS };
