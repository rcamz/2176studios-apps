import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcRedundancy } from './lib/redundancy.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(0) + '%';

const DEFAULTS = {
  weeklyGross: 2000,
  yearsService: 5,
  terminationReason: 'redundancy',
  unusedAnnualLeaveDays: 10,
  unusedLslDays: 0,
  noticePaidWeeks: 4,
  age: 40,
  grossAnnualIncome: 104000,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('wg', inp.weeklyGross);
  p.set('ys', inp.yearsService);
  p.set('tr', inp.terminationReason[0]);
  p.set('al', inp.unusedAnnualLeaveDays);
  p.set('ls', inp.unusedLslDays);
  p.set('np', inp.noticePaidWeeks);
  p.set('ag', inp.age);
  p.set('gi', inp.grossAnnualIncome);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('wg')) return {};
  const trMap = { r: 'redundancy', g: 'resignation', d: 'dismissal', n: 'non-genuine' };
  return {
    weeklyGross:          parseFloat(p.get('wg')) || 2000,
    yearsService:         parseFloat(p.get('ys')) || 5,
    terminationReason:    trMap[p.get('tr')] ?? 'redundancy',
    unusedAnnualLeaveDays: parseFloat(p.get('al')) || 0,
    unusedLslDays:        parseFloat(p.get('ls')) || 0,
    noticePaidWeeks:      parseFloat(p.get('np')) || 0,
    age:                  parseFloat(p.get('ag')) || 40,
    grossAnnualIncome:    parseFloat(p.get('gi')) || 104000,
  };
}

export default function RedundancyInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcRedundancy(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const chartData = [
    { name: 'Redundancy pay', value: Math.round(result.redundancyPay) },
    ...(result.annualLeavePay > 0 ? [{ name: 'Annual leave', value: Math.round(result.annualLeavePay) }] : []),
    ...(result.lslPay > 0 ? [{ name: 'Long service', value: Math.round(result.lslPay) }] : []),
    ...(result.noticePay > 0 ? [{ name: 'Notice pay', value: Math.round(result.noticePay) }] : []),
    { name: 'Total tax', value: Math.round(result.totalTax) },
    { name: 'Net take-home', value: Math.round(result.netTakeHome) },
  ];

  const barColors = [
    theme === 'dark' ? '#9E98E8' : '#7F77DD',
    theme === 'dark' ? '#D9931E' : '#BA7517',
    theme === 'dark' ? '#5BA4E8' : '#378ADD',
    theme === 'dark' ? '#AAAAAA' : '#888780',
    theme === 'dark' ? '#E87070' : '#D85A30',
    chartAccent,
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
          <h1>Redundancy Pay Calculator<br /><span className="calc-heading-sub">Termination + Tax-Free Threshold</span></h1>
          <p>Estimate your redundancy payout including the tax-free component, leave payouts, notice pay and total tax. Based on 2026–27 ATO figures.</p>
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
              <label>Weekly gross pay</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.weeklyGross || ''} onChange={setNum('weeklyGross')} min="0" step="50" />
              </div>
            </div>
            <div className="field">
              <label>Annual gross income (for tax rates)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossAnnualIncome || ''} onChange={setNum('grossAnnualIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Years of continuous service</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.yearsService || ''} onChange={setNum('yearsService')} min="0" max="50" step="0.25" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Age at termination</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.age || ''} onChange={setNum('age')} min="16" max="80" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Termination reason</div>
            <div className="field">
              <select className="field-select" value={inputs.terminationReason} onChange={e => set('terminationReason', e.target.value)}>
                <option value="redundancy">Genuine redundancy (NES applies)</option>
                <option value="resignation">Resignation</option>
                <option value="dismissal">Dismissal</option>
                <option value="non-genuine">Redundancy (not genuine)</option>
              </select>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Leave &amp; notice</div>
            <div className="field">
              <label>Unused annual leave (days)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.unusedAnnualLeaveDays || ''} onChange={setNum('unusedAnnualLeaveDays')} min="0" step="1" />
                <span className="input-suffix">days</span>
              </div>
            </div>
            <div className="field">
              <label>Unused long service leave (days)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.unusedLslDays || ''} onChange={setNum('unusedLslDays')} min="0" step="1" />
                <span className="input-suffix">days</span>
              </div>
            </div>
            <div className="field">
              <label>Notice paid in lieu (weeks)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.noticePaidWeeks || ''} onChange={setNum('noticePaidWeeks')} min="0" step="0.5" />
                <span className="input-suffix">wks</span>
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">Net take-home</div>
            <div className="savings-amount">{fmt(result.netTakeHome)}</div>
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
                <div className="savings-stat-label">Concessional rate</div>
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

          {inputs.terminationReason === 'redundancy' && (
            <div className="rate-callout">
              <strong>Tax-free limit: {fmt(result.taxFreeLimit)}</strong>
              Based on {Math.floor(inputs.yearsService)} completed years of service. Amount above this is taxed at {fmtPct(result.concessionalRate)} (concessional ETP rate{inputs.age >= 60 ? ' for 60+' : ''}).
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Payout breakdown</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: chartTick, fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" interval={0} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={52} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO rates (estimated) and Fair Work Act NES minimums. ETP cap ($235,000) and age-based rates applied. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
