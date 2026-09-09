import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { calcSavings } from './lib/savings.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n/1000)}k` : `$${n}`;

const DEFAULTS = {
  initialDeposit: 10000,
  monthlyContribution: 500,
  annualRate: 5.0,
  termYears: 10,
  compoundFreq: 'monthly',
  inflationRate: 2.5,
  taxOnInterest: 0,
  goalAmount: 0,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('id', inp.initialDeposit);
  p.set('mc', inp.monthlyContribution);
  p.set('ar', inp.annualRate);
  p.set('ty', inp.termYears);
  p.set('cf', inp.compoundFreq[0]);
  p.set('ir', inp.inflationRate);
  p.set('tx', inp.taxOnInterest);
  p.set('ga', inp.goalAmount);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('id')) return {};
  const cfMap = { m: 'monthly', q: 'quarterly', a: 'annually' };
  return {
    initialDeposit:      parseFloat(p.get('id')) || 10000,
    monthlyContribution: parseFloat(p.get('mc')) || 500,
    annualRate:          parseFloat(p.get('ar')) || 5.0,
    termYears:           parseFloat(p.get('ty')) || 10,
    compoundFreq:        cfMap[p.get('cf')] ?? 'monthly',
    inflationRate:       parseFloat(p.get('ir')) || 2.5,
    taxOnInterest:       parseFloat(p.get('tx')) || 0,
    goalAmount:          parseFloat(p.get('ga')) || 0,
  };
}

export default function SavingsInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcSavings(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const goalMonths = inputs.goalAmount > 0 ? result.monthsToTarget(inputs.goalAmount) : null;
  const goalYrs = goalMonths !== null ? Math.floor(goalMonths / 12) : null;
  const goalMos = goalMonths !== null ? goalMonths % 12 : null;
  const goalStr = goalMonths !== null
    ? [goalYrs && `${goalYrs}yr`, goalMos && `${goalMos}mo`].filter(Boolean).join(' ') || '< 1 month'
    : null;

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
          <h1>Savings Calculator<br /><span className="calc-heading-sub">Compound Growth + Goal Tracker</span></h1>
          <p>Project your savings with compound interest. Set a goal amount to see how long it'll take to reach it.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Savings</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Your savings</div>
            <div className="field">
              <label>Starting balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.initialDeposit || ''} onChange={setNum('initialDeposit')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Monthly contribution</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.monthlyContribution || ''} onChange={setNum('monthlyContribution')} min="0" step="100" />
              </div>
            </div>
            <div className="field">
              <label>Annual interest rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.annualRate || ''} onChange={setNum('annualRate')} min="0" max="30" step="0.25" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Compounding frequency</label>
              <div className="segmented">
                {[['monthly','Monthly'],['quarterly','Quarterly'],['annually','Annually']].map(([v,l]) => (
                  <button key={v} className={inputs.compoundFreq === v ? 'active' : ''} onClick={() => set('compoundFreq', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Savings term</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.termYears || ''} onChange={setNum('termYears')} min="1" max="50" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Advanced settings</div>
            <div className="field">
              <label>Inflation rate (for real value)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.inflationRate || ''} onChange={setNum('inflationRate')} min="0" max="15" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Tax on interest earned</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.taxOnInterest || ''} onChange={setNum('taxOnInterest')} min="0" max="50" step="5" placeholder="e.g. 32.5 for marginal rate" />
                <span className="input-suffix">%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Savings goal (optional)</div>
            <div className="field">
              <label>Target amount</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.goalAmount || ''} onChange={setNum('goalAmount')} min="0" step="5000" placeholder="0 to skip" />
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {goalStr !== null && (
            <div className="rate-callout">
              <strong>Goal: {fmt(inputs.goalAmount)} reached in {goalStr}</strong>
              {goalMonths === null ? 'Goal cannot be reached at this rate and contribution level.' : ''}
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Balance after {inputs.termYears} years</div>
            <div className="savings-amount">{fmtShort(result.finalBalance)}</div>
            <div className="savings-sub">
              {fmt(result.realBalance)} in today's money (adjusted for {inputs.inflationRate}% inflation)
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Total contributed</div>
                <div className="savings-stat-value">{fmt(result.totalContributed)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Interest earned</div>
                <div className="savings-stat-value">{fmt(result.totalInterest)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Effective rate</div>
                <div className="savings-stat-value">{result.annualEffectiveRate.toFixed(2)}%</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Gross balance</div>
              <div className="stat-card-value">{fmt(result.grossFinalBalance)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Tax on interest</div>
              <div className="stat-card-value">{fmt(result.interestTax)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Net balance</div>
              <div className="stat-card-value">{fmt(result.finalBalance)}</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Balance growth over {inputs.termYears} years</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} interval={Math.max(1, Math.floor(inputs.termYears / 8))} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Year ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Balance" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Contributed" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only. Interest is calculated using compound interest formula. Inflation adjustment is illustrative. Tax on interest is a simplified estimate — actual tax depends on your marginal rate and income. Not financial advice.
          </div>
        </div>
      </div>
    </div>
  );
}
