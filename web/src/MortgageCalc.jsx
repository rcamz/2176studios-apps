import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { amortize, summarize } from './lib/amortize.js';
import AdUnit from './AdUnit.jsx';
import './MortgageCalc.css';

const IconBubble = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H6l-3 2.5V11H3.5A1.5 1.5 0 0 1 2 9.5v-6Z"/>
  </svg>
);

const IconDisk = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/>
    <rect x="4.5" y="1.5" width="7" height="4.5" rx="0.5"/>
    <rect x="3.5" y="8.5" width="9" height="5.5" rx="0.5"/>
  </svg>
);

const IconShare = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="3" cy="8" r="1.75"/>
    <circle cx="13" cy="3" r="1.75"/>
    <circle cx="13" cy="13" r="1.75"/>
    <line x1="4.7" y1="7.1" x2="11.3" y2="3.9"/>
    <line x1="4.7" y1="8.9" x2="11.3" y2="12.1"/>
  </svg>
);

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2.75"/>
    <line x1="8" y1="1.5" x2="8" y2="3"/>
    <line x1="8" y1="13" x2="8" y2="14.5"/>
    <line x1="1.5" y1="8" x2="3" y2="8"/>
    <line x1="13" y1="8" x2="14.5" y2="8"/>
    <line x1="3.4" y1="3.4" x2="4.5" y2="4.5"/>
    <line x1="11.5" y1="11.5" x2="12.6" y2="12.6"/>
    <line x1="12.6" y1="3.4" x2="11.5" y2="4.5"/>
    <line x1="4.5" y1="11.5" x2="3.4" y2="12.6"/>
  </svg>
);

// Paste your AdSense slot IDs here once you create ad units in AdSense > Ads > Ad units
const AD_SLOT_BANNER = 'XXXXXXXXXX';   // horizontal banner — floating bottom bar
const AD_SLOT_INLINE = 'XXXXXXXXXX';   // inline unit — below extra repayments
const AD_SLOT_CHART  = 'XXXXXXXXXX';   // inline unit — above chart

const fmt = (n) =>
  '$' + Math.round(n).toLocaleString('en-AU');

const fmtShort = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n);
};

function monthsToLabel(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y}y`, m && `${m}m`].filter(Boolean).join(' ');
}

function payoffDate(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

const DEFAULTS = {
  loanAmount: 650000,
  termYears: 30,
  annualRatePercent: 6.2,
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
  offsetLumps: [],
  offsetWithdrawals: [],
  extraRecurring: 0,
  extraLumps: [],
};

// Short param names keep shared URLs compact
function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('loan', inp.loanAmount);
  p.set('term', inp.termYears);
  p.set('rate', inp.annualRatePercent);
  p.set('rt',   inp.rateType[0]);                   // v / f / s
  if (inp.rateType !== 'variable') {
    p.set('fr', inp.fixedRatePercent);
    p.set('fp', inp.fixedPeriodYears);
    p.set('rr', inp.revertRatePercent);
  }
  if (inp.rateType === 'split') {
    p.set('sm', inp.splitMode[0]);                   // p / d
    p.set('sp', inp.splitFixedPct);
    p.set('sa', inp.splitFixedAmt);
    p.set('vr', inp.splitVariableRatePercent);
  }
  p.set('os', inp.offsetStart);
  p.set('om', inp.offsetMonthly);
  if (inp.offsetLumps.length)       p.set('ol', JSON.stringify(inp.offsetLumps.map(l => [l.month, l.amount])));
  if (inp.offsetWithdrawals.length) p.set('ow', JSON.stringify(inp.offsetWithdrawals.map(l => [l.month, l.amount])));
  if (inp.extraRecurring)           p.set('xr', inp.extraRecurring);
  if (inp.extraLumps.length)   p.set('xl', JSON.stringify(inp.extraLumps.map(l => [l.month, l.amount])));
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('loan')) return {};
  const rt = { v: 'variable', f: 'fixed', s: 'split' }[p.get('rt')] ?? 'variable';
  const sm = { p: 'pct', d: 'dollar' }[p.get('sm')] ?? 'pct';
  const parseLumps = (key) => {
    try { return (JSON.parse(p.get(key)) ?? []).map(([month, amount]) => ({ month, amount })); }
    catch { return []; }
  };
  return {
    loanAmount:             parseFloat(p.get('loan')) || DEFAULTS.loanAmount,
    termYears:              parseFloat(p.get('term')) || DEFAULTS.termYears,
    annualRatePercent:      parseFloat(p.get('rate')) || DEFAULTS.annualRatePercent,
    rateType:               rt,
    fixedRatePercent:       parseFloat(p.get('fr'))   || DEFAULTS.fixedRatePercent,
    fixedPeriodYears:       parseFloat(p.get('fp'))   || DEFAULTS.fixedPeriodYears,
    revertRatePercent:      parseFloat(p.get('rr'))   || DEFAULTS.revertRatePercent,
    splitMode:              sm,
    splitFixedPct:          parseFloat(p.get('sp'))   || DEFAULTS.splitFixedPct,
    splitFixedAmt:          parseFloat(p.get('sa'))   || DEFAULTS.splitFixedAmt,
    splitVariableRatePercent: parseFloat(p.get('vr')) || DEFAULTS.splitVariableRatePercent,
    offsetStart:            parseFloat(p.get('os'))   ?? DEFAULTS.offsetStart,
    offsetMonthly:          parseFloat(p.get('om'))   ?? DEFAULTS.offsetMonthly,
    offsetLumps:            p.has('ol') ? parseLumps('ol') : [],
    offsetWithdrawals:      p.has('ow') ? parseLumps('ow') : [],
    extraRecurring:         parseFloat(p.get('xr'))   || 0,
    extraLumps:             p.has('xl') ? parseLumps('xl') : [],
  };
}

export default function MortgageCalc() {
  const [inputs, setInputs] = useState(() => ({ ...DEFAULTS, ...decodeParams(window.location.search) }));
  const [showTable, setShowTable] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [theme, setTheme] = useState('light');
  const [modal, setModal] = useState(null); // null | 'save' | 'share'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const set = (key, val) => setInputs((s) => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  // Keep URL in sync with inputs so the page is always shareable
  useEffect(() => {
    const qs = encodeInputs(inputs);
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}`);
  }, [inputs]);

  const copyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Mortgage Repayment + Offset Calculator', url: window.location.href });
    } else {
      // Fallback for desktop — open save modal instead
      setModal('share');
    }
  }, []);

  // Offset lump sum helpers
  const addOffsetLump = () =>
    set('offsetLumps', [...inputs.offsetLumps, { month: 12, amount: 10000 }]);
  const updateOffsetLump = (i, field, val) =>
    set('offsetLumps', inputs.offsetLumps.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'amount' ? parseFloat(val) || 0 : parseInt(val) || 0 } : l));
  const removeOffsetLump = (i) =>
    set('offsetLumps', inputs.offsetLumps.filter((_, idx) => idx !== i));

  // Offset withdrawal helpers
  const addOffsetWithdrawal = () =>
    set('offsetWithdrawals', [...inputs.offsetWithdrawals, { month: 12, amount: 5000 }]);
  const updateOffsetWithdrawal = (i, field, val) =>
    set('offsetWithdrawals', inputs.offsetWithdrawals.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'amount' ? parseFloat(val) || 0 : parseInt(val) || 0 } : l));
  const removeOffsetWithdrawal = (i) =>
    set('offsetWithdrawals', inputs.offsetWithdrawals.filter((_, idx) => idx !== i));

  // Extra lump sum helpers
  const addExtraLump = () =>
    set('extraLumps', [...inputs.extraLumps, { month: 12, amount: 5000 }]);
  const updateExtraLump = (i, field, val) =>
    set('extraLumps', inputs.extraLumps.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'amount' ? parseFloat(val) || 0 : parseInt(val) || 0 } : l));
  const removeExtraLump = (i) =>
    set('extraLumps', inputs.extraLumps.filter((_, idx) => idx !== i));

  const { withRows, baseRows, withSummary, baseSummary, chartData, rateSwitchMonth } =
    useMemo(() => {
      const isSplit = inputs.rateType === 'split';
      const fixedAmt = isSplit
        ? (inputs.splitMode === 'dollar' ? inputs.splitFixedAmt : inputs.loanAmount * (inputs.splitFixedPct / 100))
        : inputs.loanAmount;
      const varAmt = isSplit ? inputs.loanAmount - fixedAmt : 0;

      const baseCfg = {
        loanAmount: inputs.loanAmount,
        annualRatePercent: inputs.annualRatePercent,
        termYears: inputs.termYears,
        fixedRatePercent: inputs.rateType === 'fixed' ? inputs.fixedRatePercent : 0,
        fixedPeriodYears: inputs.rateType === 'fixed' ? inputs.fixedPeriodYears : 0,
        revertRatePercent: inputs.rateType === 'fixed' ? inputs.revertRatePercent : 0,
        offsetStart: inputs.offsetStart,
        offsetMonthly: inputs.offsetMonthly,
        offsetLumps: inputs.offsetLumps,
        offsetWithdrawals: inputs.offsetWithdrawals,
        extraRecurring: inputs.extraRecurring,
        extraLumps: inputs.extraLumps,
        includeOffset: true,
      };

      let withRows, baseRows;

      if (isSplit) {
        // Fixed portion — no offset (per AU lender standard)
        const fixedRows = amortize({
          loanAmount: fixedAmt,
          annualRatePercent: inputs.fixedRatePercent,
          termYears: inputs.termYears,
          fixedRatePercent: inputs.fixedRatePercent,
          fixedPeriodYears: inputs.fixedPeriodYears,
          revertRatePercent: inputs.revertRatePercent,
          includeOffset: false,
        });
        // Variable portion — offset applies here
        const varRows = amortize({
          loanAmount: varAmt,
          annualRatePercent: inputs.splitVariableRatePercent,
          termYears: inputs.termYears,
          offsetStart: inputs.offsetStart,
          offsetMonthly: inputs.offsetMonthly,
          offsetLumps: inputs.offsetLumps,
          offsetWithdrawals: inputs.offsetWithdrawals,
          extraRecurring: inputs.extraRecurring,
          extraLumps: inputs.extraLumps,
          includeOffset: true,
        });
        // Merge the two schedules
        const maxLen = Math.max(fixedRows.length, varRows.length);
        withRows = Array.from({ length: maxLen }, (_, i) => {
          const f = fixedRows[i] ?? { payment: 0, interest: 0, principal: 0, balance: 0, offset: 0, isRateSwitch: false };
          const v = varRows[i]   ?? { payment: 0, interest: 0, principal: 0, balance: 0, offset: 0 };
          return {
            month: i + 1,
            payment: f.payment + v.payment,
            interest: f.interest + v.interest,
            principal: f.principal + v.principal,
            balance: f.balance + v.balance,
            offset: v.offset,
            isRateSwitch: f.isRateSwitch ?? false,
          };
        });
        // Baseline: same split but no offset/extras on variable portion
        const fixedBase = amortize({ loanAmount: fixedAmt, annualRatePercent: inputs.fixedRatePercent, termYears: inputs.termYears, fixedRatePercent: inputs.fixedRatePercent, fixedPeriodYears: inputs.fixedPeriodYears, revertRatePercent: inputs.revertRatePercent, includeOffset: false });
        const varBase   = amortize({ loanAmount: varAmt, annualRatePercent: inputs.splitVariableRatePercent, termYears: inputs.termYears, includeOffset: false });
        const baseLen = Math.max(fixedBase.length, varBase.length);
        baseRows = Array.from({ length: baseLen }, (_, i) => {
          const f = fixedBase[i] ?? { payment: 0, interest: 0, principal: 0, balance: 0 };
          const v = varBase[i]   ?? { payment: 0, interest: 0, principal: 0, balance: 0 };
          return { month: i + 1, payment: f.payment + v.payment, interest: f.interest + v.interest, principal: f.principal + v.principal, balance: f.balance + v.balance, offset: 0 };
        });
      } else {
        withRows = amortize(baseCfg);
        baseRows = amortize({ ...baseCfg, offsetStart: 0, offsetMonthly: 0, offsetLumps: [], extraRecurring: 0, extraLumps: [], includeOffset: false });
      }
      const withSummary = summarize(withRows);
      const baseSummary = summarize(baseRows);

      // Downsample chart to yearly points
      const chartData = [];
      const maxMonths = Math.max(withRows.length, baseRows.length);
      for (let m = 0; m <= maxMonths; m += 12) {
        const yr = m / 12;
        chartData.push({
          year: yr,
          'With offset': Math.round(withRows[m] ? withRows[m].balance : 0),
          'No offset': Math.round(baseRows[m] ? baseRows[m].balance : 0),
        });
      }
      // Always include final data points
      const lastWith = withRows[withRows.length - 1];
      const lastBase = baseRows[baseRows.length - 1];
      if (lastWith && lastWith.month % 12 !== 0) {
        chartData.push({ year: +(lastWith.month / 12).toFixed(1), 'With offset': 0, 'No offset': Math.round(lastBase ? lastBase.balance : 0) });
      }

      const rateSwitchMonth = withRows.find((r) => r.isRateSwitch)?.month ?? null;

      return { withRows, baseRows, withSummary, baseSummary, chartData, rateSwitchMonth };
    }, [inputs]);

  const interestSaved = baseSummary.totalInterest - withSummary.totalInterest;
  const monthsSaved = baseSummary.payoffMonths - withSummary.payoffMonths;

  const tableRows = showAllRows ? withRows : withRows.slice(0, 24);

  const chartAccent = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost  = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid   = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick   = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg   = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <div className="calc-wrap">
      <div className="calc-topbar">
        <Link to="/" className="calc-brand">2176 Studios<span className="brand-dot" /></Link>
        <div className="topbar-actions">
          <a className="btn-icon" title="Feedback / Support" href="mailto:support@2176studios.com"><IconBubble /></a>
          <button className="btn-icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><IconSun /></button>
          <button className="btn-icon" title="Save" onClick={() => { setCopied(false); setModal('save'); }}><IconDisk /></button>
          <button className="btn-icon" title="Share" onClick={handleShare}><IconShare /></button>
        </div>
      </div>

      <div className="calc-heading">
        <h1>Mortgage Repayment<br />+ Offset Calculator</h1>
        <p>A free, ad-supported Australian home loan calculator which handles offsets, fixed and split loans, extra repayments and lump sum deposits and withdrawals.</p>
      </div>

      <div className="calc-body">
        {/* ── INPUTS ── */}
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
              <label>Loan term</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.termYears || ''} onChange={setNum('termYears')} min="1" max="30" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
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
                        <input type="number" value={inputs.loanAmount - inputs.splitFixedAmt} readOnly style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)' }} />
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
                      <input type="number" value={lump.amount || ''} onChange={(e) => updateExtraLump(i, 'amount', e.target.value)} min="0" step="1000" placeholder="Amount" />
                    </div>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={lump.month || ''} onChange={(e) => updateExtraLump(i, 'month', e.target.value)} min="1" max={inputs.termYears * 12} placeholder="Month" />
                      <span className="input-suffix" style={{ fontSize: '0.75rem' }}>mo</span>
                    </div>
                    <button onClick={() => removeExtraLump(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-lump" onClick={addExtraLump}>+ Add lump sum repayment</button>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>

          <div className="panel-section">
            <div className="section-title">Offset account</div>
            <p className="offset-note">
              Offset applies to variable portion only — standard for AU lenders.
            </p>

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
                      <input type="number" value={lump.amount || ''} onChange={(e) => updateOffsetLump(i, 'amount', e.target.value)} min="0" step="1000" placeholder="Amount" />
                    </div>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={lump.month || ''} onChange={(e) => updateOffsetLump(i, 'month', e.target.value)} min="1" max={inputs.termYears * 12} placeholder="Month" />
                      <span className="input-suffix" style={{ fontSize: '0.75rem' }}>mo</span>
                    </div>
                    <button onClick={() => removeOffsetLump(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-lump" onClick={addOffsetLump}>+ Add lump sum deposit</button>

            {inputs.offsetWithdrawals.length > 0 && (
              <div className="lump-list" style={{ marginTop: 8 }}>
                {inputs.offsetWithdrawals.map((lump, i) => (
                  <div key={i} className="lump-row">
                    <div className="input-wrap has-prefix">
                      <span className="input-prefix">$</span>
                      <input type="number" value={lump.amount || ''} onChange={(e) => updateOffsetWithdrawal(i, 'amount', e.target.value)} min="0" step="1000" placeholder="Amount" />
                    </div>
                    <div className="input-wrap has-suffix">
                      <input type="number" value={lump.month || ''} onChange={(e) => updateOffsetWithdrawal(i, 'month', e.target.value)} min="1" max={inputs.termYears * 12} placeholder="Month" />
                      <span className="input-suffix" style={{ fontSize: '0.75rem' }}>mo</span>
                    </div>
                    <button onClick={() => removeOffsetWithdrawal(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="add-lump" onClick={addOffsetWithdrawal}>+ Add lump sum withdrawal</button>
          </div>

        </div>

        {/* ── RESULTS ── */}
        <div className="results-panel">

          {/* Savings headline */}
          <div className="savings-card">
            <div className="savings-label">You save</div>
            <div className="savings-amount">{fmt(interestSaved)}</div>
            <div className="savings-sub">in interest compared to no offset or extra repayments</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Time saved</div>
                <div className="savings-stat-value">
                  {monthsSaved > 0 ? monthsToLabel(monthsSaved) : '—'}
                </div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Paid off</div>
                <div className="savings-stat-value">{payoffDate(withSummary.payoffMonths)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Loan term</div>
                <div className="savings-stat-value">{monthsToLabel(withSummary.payoffMonths)}</div>
              </div>
            </div>
          </div>

          {/* Stat row */}
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
              <div className="stat-card-label">Monthly repayment</div>
              <div className="stat-card-value">{withRows[0] ? fmt(withRows[0].payment) : '—'}</div>
            </div>
          </div>

          {/* Fixed rate callout */}
          {rateSwitchMonth && (
            <div className="rate-callout">
              <strong>Fixed rate expires at month {rateSwitchMonth}</strong>
              Your repayment changes from {fmt(withRows[rateSwitchMonth - 2]?.payment ?? 0)}/mo to{' '}
              {fmt(withRows[rateSwitchMonth]?.payment ?? 0)}/mo when reverting to {inputs.revertRatePercent}% p.a.
            </div>
          )}

          {/* Ad above chart */}
          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          {/* Chart */}
          <div className="chart-card">
            <div className="chart-title">Loan balance over time</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis
                  dataKey="year"
                  tickFormatter={(v) => `Yr ${v}`}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: chartGrid }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  width={52}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  labelFormatter={(l) => `Year ${l}`}
                  contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)', fontFamily: 'Plus Jakarta Sans' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="With offset"
                  stroke={chartAccent}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="No offset"
                  stroke={chartGhost}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Save / Share below chart */}
          <div className="chart-actions">
            <button className="btn-action" onClick={() => { setCopied(false); setModal('save'); }}>
              <IconDisk /> Save
            </button>
            <button className="btn-action" onClick={handleShare}>
              <IconShare /> Share
            </button>
          </div>

          {/* Repayment schedule */}
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
                        <th>Mo</th>
                        <th>Payment</th>
                        <th>Interest</th>
                        <th>Principal</th>
                        <th>Balance</th>
                        <th>Offset</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r) => (
                        <tr key={r.month} className={r.isRateSwitch ? 'rate-switch' : ''}>
                          <td>{r.month}{r.isRateSwitch ? ' ⚡' : ''}</td>
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
                    Show all {withRows.length} months
                  </button>
                )}
              </>
            )}
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Interest calculated monthly (lenders use daily). Offset assumed 100% effective on variable portion only. Does not include lender fees, LMI, or rate changes beyond fixed-period revert.
          </div>
        </div>
      </div>

      {/* ── Floating bottom ad bar ── */}
      <div className="ad-bar-float">
        <AdUnit slotId={AD_SLOT_BANNER} format="horizontal" />
      </div>

      {/* ── Save / Share modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            {modal === 'share' && <div className="modal-icon">⤴</div>}
            <h2 className="modal-title">
              {modal === 'save' ? 'Save your calculation' : 'Share your calculation'}
            </h2>
            <p className="modal-desc">
              {modal === 'save'
                ? 'Copy this link. Open it any time to return to exactly these inputs and results.'
                : 'Copy this link and send it. Anyone who opens it will see the same inputs and results instantly.'}
            </p>
            <div className="modal-url-wrap">
              <input
                className="modal-url"
                readOnly
                value={window.location.href}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <button className="modal-copy" onClick={copyUrl}>
              {copied ? '✓ Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
