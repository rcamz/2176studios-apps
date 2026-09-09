import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { calcSalarySacrifice } from './lib/salarysacrifice.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(1) + '%';

const DEFAULTS = {
  grossSalary: 100000,
  sgRate: 12,
  sacrificeAmount: 5000,
  otherSacrifice: 0,
  age: 40,
  superBalance: 80000,
  horizonYears: 20,
  investmentReturn: 7,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('gs', inp.grossSalary);
  p.set('sg', inp.sgRate);
  p.set('sa', inp.sacrificeAmount);
  p.set('os', inp.otherSacrifice);
  p.set('ag', inp.age);
  p.set('sb', inp.superBalance);
  p.set('hy', inp.horizonYears);
  p.set('ir', inp.investmentReturn);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('gs')) return {};
  return {
    grossSalary:      parseFloat(p.get('gs')) || 100000,
    sgRate:           parseFloat(p.get('sg')) || 12,
    sacrificeAmount:  parseFloat(p.get('sa')) || 5000,
    otherSacrifice:   parseFloat(p.get('os')) || 0,
    age:              parseFloat(p.get('ag')) || 40,
    superBalance:     parseFloat(p.get('sb')) || 80000,
    horizonYears:     parseFloat(p.get('hy')) || 20,
    investmentReturn: parseFloat(p.get('ir')) || 7,
  };
}

export default function SalarySacrificeInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcSalarySacrifice(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n/1000)}k` : `$${n}`;

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
          <h1>Salary Sacrifice Calculator<br /><span className="calc-heading-sub">Super + Pre-Tax Savings</span></h1>
          <p>See how much you save in tax by salary sacrificing to super, and the real cost to your take-home pay. Based on 2026–27 ATO rates.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Salary Sacrifice</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Salary &amp; super</div>
            <div className="field">
              <label>Gross annual salary</label>
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
            <div className="field">
              <label>Salary sacrifice to super (pre-tax)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.sacrificeAmount || ''} onChange={setNum('sacrificeAmount')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Other salary sacrifice (novated lease, etc.)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.otherSacrifice || ''} onChange={setNum('otherSacrifice')} min="0" step="500" />
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Projection settings</div>
            <div className="field">
              <label>Current super balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.superBalance || ''} onChange={setNum('superBalance')} min="0" step="5000" />
              </div>
            </div>
            <div className="field">
              <label>Projection horizon</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.horizonYears || ''} onChange={setNum('horizonYears')} min="1" max="40" step="5" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Expected investment return</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.investmentReturn || ''} onChange={setNum('investmentReturn')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {result.capExceeded && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)', marginBottom: 0 }}>
              <strong>Concessional cap exceeded: {fmt(result.totalConcessional)}</strong>
              Total concessional contributions (SG + sacrifice + other) exceed the ${result.CONCESSIONAL_CAP.toLocaleString()}/yr cap. Excess is taxed at your marginal rate.
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Annual tax saving</div>
            <div className="savings-amount">{fmt(result.annualTaxSaving)}</div>
            <div className="savings-sub">by paying 15% super tax instead of your marginal rate</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Net take-home cost</div>
                <div className="savings-stat-value">{fmt(result.netTakeHomeCost)}/yr</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Fortnightly cost</div>
                <div className="savings-stat-value">{fmt(result.fortnigthlyCost)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">SG contribution</div>
                <div className="savings-stat-value">{fmt(result.sgContribution)}/yr</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Take-home without sacrifice</div>
              <div className="stat-card-value">{fmt(result.withoutSacrifice.takeHome)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Take-home with sacrifice</div>
              <div className="stat-card-value">{fmt(result.withSacrifice.takeHome)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total concessional</div>
              <div className="stat-card-value" style={{ color: result.capExceeded ? 'var(--red)' : 'var(--text)' }}>
                {fmt(result.totalConcessional)}
              </div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Super balance projection ({inputs.horizonYears} years)</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.projectionData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} interval={Math.floor(inputs.horizonYears / 5)} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Year ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="With sacrifice" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without sacrifice" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO concessional cap ($30,000) and rates (estimated). Projection assumes constant salary, return and contributions. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
