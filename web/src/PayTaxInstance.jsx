import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcPayTax, byFreq } from './lib/paytax.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(1) + '%';

const DEFAULTS = {
  grossIncome: 90000,
  incomeType: 'employee',
  freq: 'annual',
  residency: 'resident',
  hasPrivateCover: false,
  hecsBalance: 0,
  sgRate: 12,
  salarySacrifice: 0,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('gi', inp.grossIncome);
  p.set('it', inp.incomeType[0]);
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
  if (!p.has('gi')) return {};
  const itMap = { e: 'employee', s: 'self-employed', t: 'sole-trader' };
  const frMap = { a: 'annual', m: 'monthly', f: 'fortnightly', w: 'weekly' };
  const reMap = { r: 'resident', f: 'foreign', h: 'holiday' };
  return {
    grossIncome:     parseFloat(p.get('gi')) || DEFAULTS.grossIncome,
    incomeType:      itMap[p.get('it')] ?? 'employee',
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

  const result = useMemo(() => calcPayTax(inputs), [inputs]);

  const showFreq = inputs.freq;
  const fv = (annual) => fmt(byFreq(annual, showFreq));

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const pieColors = {
    'Income tax':   theme === 'dark' ? '#E87070' : '#D85A30',
    'Medicare':     theme === 'dark' ? '#9E98E8' : '#7F77DD',
    'HECS':         theme === 'dark' ? '#D9931E' : '#BA7517',
    'MLS':          theme === 'dark' ? '#E87099' : '#D4537E',
    'Take-home':    chartAccent,
  };

  const chartData = [
    { name: 'Income tax', value: Math.round(result.incomeTax) },
    ...(result.medicareLevy > 0 ? [{ name: 'Medicare', value: Math.round(result.medicareLevy) }] : []),
    ...(result.mls > 0 ? [{ name: 'MLS', value: Math.round(result.mls) }] : []),
    ...(result.hecsRepayment > 0 ? [{ name: 'HECS', value: Math.round(result.hecsRepayment) }] : []),
    { name: 'Take-home', value: Math.round(result.takeHome) },
  ];

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
          <p>Gross to net take-home pay. Includes income tax (2026–27), Medicare levy, HECS/HELP repayment and employer super.</p>
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
              <label>Annual gross income</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossIncome || ''} onChange={setNum('grossIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Income type</label>
              <div className="segmented">
                {[['employee','Employee'],['self-employed','Self-employed'],['sole-trader','Sole trader']].map(([v,l]) => (
                  <button key={v} className={inputs.incomeType === v ? 'active' : ''} onClick={() => set('incomeType', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Display frequency</label>
              <div className="segmented">
                {[['annual','Annual'],['monthly','Monthly'],['fortnightly','Fortnight'],['weekly','Weekly']].map(([v,l]) => (
                  <button key={v} className={inputs.freq === v ? 'active' : ''} onClick={() => set('freq', v)}>{l}</button>
                ))}
              </div>
            </div>
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
                Medicare Levy Surcharge applies if income {'>'} $100,000
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
            {inputs.incomeType === 'employee' && (
              <div className="field">
                <label>Employer SG rate</label>
                <div className="input-wrap has-suffix">
                  <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="30" step="0.5" />
                  <span className="input-suffix">%</span>
                </div>
              </div>
            )}
            <div className="field">
              <label>Salary sacrifice to super (pre-tax)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.salarySacrifice || ''} onChange={setNum('salarySacrifice')} min="0" step="500" placeholder="0" />
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">
              {inputs.freq === 'annual' ? 'Annual' : inputs.freq.charAt(0).toUpperCase() + inputs.freq.slice(1)} take-home
            </div>
            <div className="savings-amount">{fv(result.takeHome)}</div>
            <div className="savings-sub">
              after income tax, Medicare{result.hecsRepayment > 0 ? ', HECS' : ''}{result.mls > 0 ? ' + MLS' : ''}
            </div>
            <div className="savings-meta">
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

          <div className="stat-row" style={{ gridTemplateColumns: result.hecsRepayment > 0 || result.mls > 0 ? '1fr 1fr 1fr' : '1fr 1fr 1fr' }}>
            <div className="stat-card">
              <div className="stat-card-label">Income tax</div>
              <div className="stat-card-value">{fv(result.incomeTax)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Medicare levy{result.mls > 0 ? ' + MLS' : ''}</div>
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

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Income breakdown</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
                  formatter={(v, name) => [fmt(v), name]}
                  contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)', fontFamily: 'Plus Jakarta Sans' }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={pieColors[entry.name] ?? chartAccent} />
                  ))}
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
            Estimates only — not financial advice. Based on 2026–27 ATO rates (estimated). Figures are annual unless otherwise shown. Does not include state taxes, FBT, or investment income. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
