import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcPayTax, byFreq, toAnnual, grossFromNet } from './lib/paytax.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(1) + '%';

const FREQ_LABELS = { annual: 'Annual', monthly: 'Monthly', fortnightly: 'Fortnightly', weekly: 'Weekly' };

const DEFAULTS = {
  incomeAmount: 90000,
  entryFreq: 'annual',
  entryType: 'gross',
  bonusAmount: 0,
  bonusFreq: 'annual',
  freq: 'annual',
  residency: 'resident',
  hasPrivateCover: false,
  hecsBalance: 0,
  sgRate: 12,
  salarySacrifice: 0,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('ia', inp.incomeAmount);
  p.set('ef', inp.entryFreq[0]);
  p.set('et', inp.entryType[0]);
  p.set('ba', inp.bonusAmount);
  p.set('bf', inp.bonusFreq[0]);
  p.set('fr', inp.freq[0]);
  p.set('re', inp.residency[0]);
  p.set('pc', inp.hasPrivateCover ? '1' : '0');
  p.set('hb', inp.hecsBalance);
  p.set('sg', inp.sgRate);
  p.set('ss', inp.salarySacrifice);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  const frMap = { a: 'annual', m: 'monthly', f: 'fortnightly', w: 'weekly' };
  const reMap = { r: 'resident', f: 'foreign', h: 'holiday' };

  // Support legacy URLs that used 'gi' for annual gross income
  if (p.has('gi') && !p.has('ia')) {
    return {
      incomeAmount:    parseFloat(p.get('gi')) || DEFAULTS.incomeAmount,
      entryFreq:       'annual',
      entryType:       'gross',
      freq:            frMap[p.get('fr')] ?? 'annual',
      residency:       reMap[p.get('re')] ?? 'resident',
      hasPrivateCover: p.get('pc') === '1',
      hecsBalance:     parseFloat(p.get('hb')) || 0,
      sgRate:          parseFloat(p.get('sg')) || 12,
      salarySacrifice: parseFloat(p.get('ss')) || 0,
      bonusAmount:     0,
      bonusFreq:       'annual',
    };
  }

  if (!p.has('ia')) return {};
  return {
    incomeAmount:    parseFloat(p.get('ia')) || DEFAULTS.incomeAmount,
    entryFreq:       frMap[p.get('ef')] ?? 'annual',
    entryType:       p.get('et') === 'n' ? 'net' : 'gross',
    bonusAmount:     parseFloat(p.get('ba')) || 0,
    bonusFreq:       frMap[p.get('bf')] ?? 'annual',
    freq:            frMap[p.get('fr')] ?? 'annual',
    residency:       reMap[p.get('re')] ?? 'resident',
    hasPrivateCover: p.get('pc') === '1',
    hecsBalance:     parseFloat(p.get('hb')) || 0,
    sgRate:          parseFloat(p.get('sg')) || 12,
    salarySacrifice: parseFloat(p.get('ss')) || 0,
  };
}

export default function PayTaxInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  // Derive annual gross from what the user entered (base salary only, then add bonus)
  const annualBonus = toAnnual(inputs.bonusAmount || 0, inputs.bonusFreq);
  const annualGross = useMemo(() => {
    const annual = toAnnual(inputs.incomeAmount, inputs.entryFreq);
    const base = inputs.entryType === 'net' ? grossFromNet(annual, inputs) : annual;
    return base + toAnnual(inputs.bonusAmount || 0, inputs.bonusFreq);
  }, [inputs]);

  const result = useMemo(() => calcPayTax({ ...inputs, grossIncome: annualGross }), [inputs, annualGross]);

  const showFreq = inputs.freq;
  const fv = (annual) => fmt(byFreq(annual, showFreq));

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const colorBase  = theme === 'dark' ? '#E8E8E2' : '#1A1A1F';
  const colorSuper = theme === 'dark' ? '#A8D440' : '#7EAB30';
  const colorBonus = theme === 'dark' ? '#9E98E8' : '#7F77DD';
  const colorRed   = theme === 'dark' ? '#E87070' : '#D85A30';
  const colorNet   = chartAccent;

  // Build 3-segment stacked waterfall scaled to display frequency
  // Bar 1: base (dark) + bonus (purple) + super (light green) stacked
  // Bar 2: super reduction (light green, drops from total package)
  // Bar 3+: tax reductions (red)
  // Last: net pay (green)
  const wfBase     = Math.round(byFreq(annualGross - annualBonus, inputs.freq));
  const wfBonus    = Math.round(byFreq(annualBonus, inputs.freq));
  const wfSuper    = Math.round(byFreq(result.superAmount, inputs.freq));
  const wfTax      = Math.round(byFreq(result.incomeTax, inputs.freq));
  const wfMedicare = Math.round(byFreq(result.medicareLevy, inputs.freq));
  const wfMLS      = Math.round(byFreq(result.mls, inputs.freq));
  const wfHECS     = Math.round(byFreq(result.hecsRepayment, inputs.freq));
  const wfNet      = Math.round(byFreq(result.takeHome, inputs.freq));

  // Each entry: spacer (transparent), s1/s2/s3 (visible segments bottom→top), c1/c2/c3 (colours)
  const waterfallData = (() => {
    const T = 'transparent';
    const entries = [{
      name: 'Total package',
      spacer: 0,
      s1: wfBase,  c1: colorBase,
      s2: wfBonus, c2: colorBonus,
      s3: wfSuper, c3: colorSuper,
    }];
    let running = wfBase + wfBonus + wfSuper;
    if (wfSuper > 0) {
      running -= wfSuper;
      entries.push({ name: 'Super (fund)', spacer: running, s1: wfSuper, c1: colorSuper, s2: 0, c2: T, s3: 0, c3: T });
    }
    if (wfTax > 0)      { running -= wfTax;      entries.push({ name: 'Income tax', spacer: running, s1: wfTax,      c1: colorRed, s2: 0, c2: T, s3: 0, c3: T }); }
    if (wfMedicare > 0) { running -= wfMedicare;  entries.push({ name: 'Medicare',   spacer: running, s1: wfMedicare, c1: colorRed, s2: 0, c2: T, s3: 0, c3: T }); }
    if (wfMLS > 0)      { running -= wfMLS;       entries.push({ name: 'MLS',        spacer: running, s1: wfMLS,      c1: colorRed, s2: 0, c2: T, s3: 0, c3: T }); }
    if (wfHECS > 0)     { running -= wfHECS;      entries.push({ name: 'HECS',       spacer: running, s1: wfHECS,     c1: colorRed, s2: 0, c2: T, s3: 0, c3: T }); }
    entries.push({ name: 'Net pay', spacer: 0, s1: wfNet, c1: colorNet, s2: 0, c2: T, s3: 0, c3: T });
    return entries;
  })();

  const entryFreqLabel = FREQ_LABELS[inputs.entryFreq].toLowerCase();
  const isNet = inputs.entryType === 'net';
  const derivedGrossNote = isNet ? `≈ ${fmt(annualGross)} gross / year` : null;

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
          <h1>Pay / Tax Calculator<br /><span className="calc-heading-sub">Income Tax + Medicare + Super</span></h1>
          <p>Gross or net to take-home pay. Includes income tax (2026–27), Medicare levy, HECS/HELP repayment and employer super.</p>
          <a className="desktop-cta" href={window.location.href} target="_blank" rel="noreferrer">
            Open desktop site to compare up to 3 scenarios →
          </a>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Pay / Tax</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Income</div>

            <div className="field">
              <label>Pay period</label>
              <div className="segmented">
                {[['weekly','Weekly'],['fortnightly','Fortnight'],['monthly','Monthly'],['annual','Annual']].map(([v,l]) => (
                  <button key={v} className={inputs.entryFreq === v ? 'active' : ''} onClick={() => set('entryFreq', v)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Enter as</label>
              <div className="segmented">
                <button className={!isNet ? 'active' : ''} onClick={() => set('entryType', 'gross')}>Gross</button>
                <button className={isNet ? 'active' : ''} onClick={() => set('entryType', 'net')}>Net (take-home)</button>
              </div>
            </div>

            <div className="field">
              <label>{FREQ_LABELS[inputs.entryFreq]} {isNet ? 'net take-home' : 'gross income'}</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  value={inputs.incomeAmount || ''}
                  onChange={setNum('incomeAmount')}
                  min="0"
                  step={inputs.entryFreq === 'annual' ? 1000 : inputs.entryFreq === 'monthly' ? 100 : 50}
                />
              </div>
              {derivedGrossNote && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {derivedGrossNote}
                </div>
              )}
            </div>

            <div className="field">
              <label>Bonus / commission (gross)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  value={inputs.bonusAmount || ''}
                  onChange={setNum('bonusAmount')}
                  min="0"
                  step="100"
                  placeholder="0 if none"
                />
              </div>
            </div>
            {(inputs.bonusAmount > 0) && (
              <div className="field">
                <label>Bonus frequency</label>
                <div className="segmented">
                  {[['weekly','Weekly'],['fortnightly','Fortnight'],['monthly','Monthly'],['annual','Annual']].map(([v,l]) => (
                    <button key={v} className={inputs.bonusFreq === v ? 'active' : ''} onClick={() => set('bonusFreq', v)}>{l}</button>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  = {fmt(annualBonus)}/yr gross
                </div>
              </div>
            )}

          </div>

          <div className="panel-section">
            <div className="section-title">Residency &amp; Medicare</div>
            <div className="field">
              <label>Residency status</label>
              <select className="field-select" value={inputs.residency} onChange={e => set('residency', e.target.value)}>
                <option value="resident">Australian resident</option>
                <option value="foreign">Foreign resident</option>
                <option value="holiday">Working Holiday Maker</option>
              </select>
            </div>
            <div className="field">
              <label>Private hospital cover</label>
              <div className="segmented">
                <button className={inputs.hasPrivateCover ? 'active' : ''} onClick={() => set('hasPrivateCover', true)}>Yes</button>
                <button className={!inputs.hasPrivateCover ? 'active' : ''} onClick={() => set('hasPrivateCover', false)}>No</button>
              </div>
            </div>
            {!inputs.hasPrivateCover && (
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Medicare Levy Surcharge applies if income &gt; $100,000
              </p>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">HECS/HELP</div>
            <div className="field">
              <label>HECS/HELP debt balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.hecsBalance || ''} onChange={setNum('hecsBalance')} min="0" step="1000" placeholder="0 if none" />
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Super &amp; Salary Sacrifice</div>
            <div className="field">
              <label>Employer SG rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="30" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
            <div className="field">
              <label>Salary sacrifice to super (pre-tax, annual)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.salarySacrifice || ''} onChange={setNum('salarySacrifice')} min="0" step="500" placeholder="0" />
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <div className="segmented">
              {[['annual','Annual'],['monthly','Monthly'],['fortnightly','Fortnight'],['weekly','Weekly']].map(([v,l]) => (
                <button key={v} className={inputs.freq === v ? 'active' : ''} onClick={() => set('freq', v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="savings-card">
            <div className="savings-label">
              {FREQ_LABELS[inputs.freq]} take-home
            </div>
            <div className="savings-amount">{fv(result.takeHome)}</div>
            <div className="savings-sub">
              {isNet
                ? `from ${fmt(inputs.incomeAmount)} ${entryFreqLabel} net · ${fmt(annualGross)} gross / year`
                : `after income tax, Medicare${result.hecsRepayment > 0 ? ', HECS' : ''}${result.mls > 0 ? ' + MLS' : ''}`}
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Gross income</div>
                <div className="savings-stat-value">{fv(annualGross)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Effective rate</div>
                <div className="savings-stat-value">{fmtPct(result.effectiveTaxRate)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Marginal rate</div>
                <div className="savings-stat-value">{fmtPct(result.marginalRate)}</div>
              </div>
              {result.superAmount > 0 && (
                <div className="savings-stat">
                  <div className="savings-stat-label">Employer super</div>
                  <div className="savings-stat-value">{fmt(result.superAmount)}/yr</div>
                </div>
              )}
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Income tax</div>
              <div className="stat-card-value">{fv(result.incomeTax)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Medicare{result.mls > 0 ? ' + MLS' : ''}</div>
              <div className="stat-card-value">{fv(result.medicareLevy + result.mls)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">{result.hecsRepayment > 0 ? 'HECS repayment' : 'Total tax'}</div>
              <div className="stat-card-value">{fv(result.hecsRepayment > 0 ? result.hecsRepayment : result.totalTax)}</div>
            </div>
          </div>

          {result.lito > 0 && (
            <div className="rate-callout">
              <strong>Low Income Tax Offset applied: {fmt(result.lito)}</strong>
              Your gross income tax of {fmt(result.incomeTax + result.lito)} was reduced by your LITO entitlement.
            </div>
          )}

          {annualBonus > 0 && (
            <div className="rate-callout">
              <strong>Bonus / commission: {fmt(annualBonus)}/yr</strong>
              Taxed as ordinary income at your marginal rate ({fmtPct(result.marginalRate)}). After-tax bonus: {fmt(annualBonus * (1 - result.marginalRate))}/yr.
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Income waterfall ({FREQ_LABELS[inputs.freq].toLowerCase()})</div>
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
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const d = waterfallData.find(e => e.name === label);
                    if (!d) return null;
                    const total = (d.s1 || 0) + (d.s2 || 0) + (d.s3 || 0);
                    const topColor = d.s3 > 0 ? d.c3 : d.s2 > 0 ? d.c2 : d.c1;
                    return (
                      <div style={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)', padding: '6px 10px', fontFamily: 'Plus Jakarta Sans' }}>
                        <div style={{ marginBottom: 2, fontWeight: 600 }}>{label}</div>
                        <div style={{ color: topColor }}>{fmt(total)}</div>
                      </div>
                    );
                  }}
                />
                {/* spacer: transparent bar that lifts reduction bars to correct Y position */}
                <Bar dataKey="spacer" stackId="wf" fill="transparent" legendType="none" />
                {/* s1: base pay (dark) / super reduction (light green) / taxes (red) / net (green) */}
                <Bar dataKey="s1" stackId="wf" legendType="none">
                  {waterfallData.map(d => <Cell key={d.name} fill={d.c1} />)}
                </Bar>
                {/* s2: bonus (purple), only non-zero on the first bar */}
                <Bar dataKey="s2" stackId="wf" legendType="none">
                  {waterfallData.map(d => <Cell key={d.name} fill={d.c2} />)}
                </Bar>
                {/* s3: super (light green), only non-zero on the first bar */}
                <Bar dataKey="s3" stackId="wf" legendType="none">
                  {waterfallData.map(d => <Cell key={d.name} fill={d.c3} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {inputs.salarySacrifice > 0 && (
            <div className="rate-callout">
              <strong>Salary sacrifice: {fmt(inputs.salarySacrifice)}/yr pre-tax</strong>
              Reduces taxable income to {fmt(result.taxableIncome)}. Tax saving vs. taking as cash: {fmt(inputs.salarySacrifice * result.marginalRate - inputs.salarySacrifice * 0.15)}/yr at your marginal rate.
            </div>
          )}

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO rates (estimated). Net-to-gross uses iterative back-calculation — result may vary slightly from employer payroll. Does not include state taxes, FBT, or investment income. Consult a licensed adviser for personal decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
