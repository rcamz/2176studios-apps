import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { calcRetirement } from './lib/retirement.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n/1000)}k` : `$${n}`;

const DEFAULTS = {
  currentAge: 35,
  retirementAge: 65,
  currentBalance: 80000,
  grossSalary: 90000,
  sgRate: 12,
  extraContributions: 5000,
  extraIsPreTax: true,
  investmentReturn: 7,
  inflationRate: 2.5,
  fees: 0.5,
  drawdownRate: 4,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('ca', inp.currentAge);
  p.set('ra', inp.retirementAge);
  p.set('cb', inp.currentBalance);
  p.set('gs', inp.grossSalary);
  p.set('sg', inp.sgRate);
  p.set('ec', inp.extraContributions);
  p.set('ep', inp.extraIsPreTax ? '1' : '0');
  p.set('ir', inp.investmentReturn);
  p.set('if', inp.inflationRate);
  p.set('fe', inp.fees);
  p.set('dr', inp.drawdownRate);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('ca')) return {};
  return {
    currentAge:       parseFloat(p.get('ca')) || 35,
    retirementAge:    parseFloat(p.get('ra')) || 65,
    currentBalance:   parseFloat(p.get('cb')) || 80000,
    grossSalary:      parseFloat(p.get('gs')) || 90000,
    sgRate:           parseFloat(p.get('sg')) || 12,
    extraContributions: parseFloat(p.get('ec')) || 5000,
    extraIsPreTax:    p.get('ep') !== '0',
    investmentReturn: parseFloat(p.get('ir')) || 7,
    inflationRate:    parseFloat(p.get('if')) || 2.5,
    fees:             parseFloat(p.get('fe')) || 0.5,
    drawdownRate:     parseFloat(p.get('dr')) || 4,
  };
}

export default function RetirementInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcRetirement(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

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
          <h1>Retirement Calculator<br /><span className="calc-heading-sub">Super Balance Projection to {inputs.retirementAge}</span></h1>
          <p>Project your super balance to retirement including employer SG, extra contributions and compound growth. Based on 2026–27 super rules.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Retirement</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Your details</div>
            <div className="field">
              <label>Current age</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.currentAge || ''} onChange={setNum('currentAge')} min="18" max="80" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Retirement age</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.retirementAge || ''} onChange={setNum('retirementAge')} min="55" max="80" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Current super balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.currentBalance || ''} onChange={setNum('currentBalance')} min="0" step="5000" />
              </div>
            </div>
            <div className="field">
              <label>Annual gross salary</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossSalary || ''} onChange={setNum('grossSalary')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Employer SG rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="30" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Extra contributions</div>
            <div className="field">
              <label>Additional personal contributions (per year)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.extraContributions || ''} onChange={setNum('extraContributions')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Contribution type</label>
              <div className="segmented">
                <button className={inputs.extraIsPreTax ? 'active' : ''} onClick={() => set('extraIsPreTax', true)}>Pre-tax (concessional)</button>
                <button className={!inputs.extraIsPreTax ? 'active' : ''} onClick={() => set('extraIsPreTax', false)}>After-tax</button>
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>

          <div className="panel-section">
            <div className="section-title">Assumptions</div>
            <div className="field">
              <label>Expected investment return</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.investmentReturn || ''} onChange={setNum('investmentReturn')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Inflation rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.inflationRate || ''} onChange={setNum('inflationRate')} min="0" max="10" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Annual account fees</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.fees || ''} onChange={setNum('fees')} min="0" max="5" step="0.1" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Drawdown rate (retirement)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.drawdownRate || ''} onChange={setNum('drawdownRate')} min="1" max="10" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">Projected balance at age {inputs.retirementAge}</div>
            <div className="savings-amount">{fmtShort(result.projectedBalance)}</div>
            <div className="savings-sub">
              {fmt(result.realBalance)} in today's dollars · sustainable {fmt(result.annualDrawdown)}/yr
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Extra contributions boost</div>
                <div className="savings-stat-value">{fmtShort(result.extraSuperBoost)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Without extra contribs</div>
                <div className="savings-stat-value">{fmtShort(result.projectedBalanceNoExtra)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Years to retire</div>
                <div className="savings-stat-value">{result.yearsToRetire} yrs</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Annual drawdown ({inputs.drawdownRate}% rule)</div>
              <div className="stat-card-value">{fmt(result.annualDrawdown)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Monthly income</div>
              <div className="stat-card-value">{fmt(result.annualDrawdown / 12)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Age Pension</div>
              <div className="stat-card-value">{result.fullPension ? 'Full' : result.pensionEligible ? 'Partial' : 'Likely nil'}</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Super balance projection by age</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="age" tickFormatter={(v) => `${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10, fill: chartTick }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Age ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {[50, 55, 60].filter(a => a >= inputs.currentAge && a < inputs.retirementAge).map(a => (
                  <ReferenceLine key={a} x={a} stroke={chartTick} strokeDasharray="3 3" label={{ value: `${a}`, position: 'insideTop', fontSize: 9, fill: chartTick }} />
                ))}
                <Line type="monotone" dataKey="With contributions" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without extra" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 super rules (estimated). Assumes constant salary and contributions. Age Pension eligibility based on simplified assets test estimates. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
