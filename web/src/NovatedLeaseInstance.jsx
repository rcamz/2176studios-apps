import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { calcNovatedLease } from './lib/novatedlease.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(1) + '%';

const DEFAULTS = {
  vehiclePrice: 65000,
  isEVExempt: true,
  termYears: 3,
  annualKms: 15000,
  grossSalary: 110000,
  sgRate: 12,
  runningCosts: 5000,
  financeRate: 7.5,
  residualOverride: null,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('vp', inp.vehiclePrice);
  p.set('ev', inp.isEVExempt ? '1' : '0');
  p.set('ty', inp.termYears);
  p.set('km', inp.annualKms);
  p.set('gs', inp.grossSalary);
  p.set('sg', inp.sgRate);
  p.set('rc', inp.runningCosts);
  p.set('fr', inp.financeRate);
  if (inp.residualOverride !== null) p.set('rv', inp.residualOverride);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('vp')) return {};
  return {
    vehiclePrice:     parseFloat(p.get('vp')) || 65000,
    isEVExempt:       p.get('ev') !== '0',
    termYears:        parseFloat(p.get('ty')) || 3,
    annualKms:        parseFloat(p.get('km')) || 15000,
    grossSalary:      parseFloat(p.get('gs')) || 110000,
    sgRate:           parseFloat(p.get('sg')) || 12,
    runningCosts:     parseFloat(p.get('rc')) || 5000,
    financeRate:      parseFloat(p.get('fr')) || 7.5,
    residualOverride: p.has('rv') ? parseFloat(p.get('rv')) : null,
  };
}

export default function NovatedLeaseInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );
  const [showResidualOverride, setShowResidualOverride] = useState(false);

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcNovatedLease(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
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
          <h1>Novated Lease Calculator<br /><span className="calc-heading-sub">EV &amp; ICE Tax Savings vs. Buying Outright</span></h1>
          <p>Calculate your EV or ICE vehicle novated lease tax savings vs. buying outright. FBT-exempt EV rules apply under 2026–27 ATO legislation.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Novated Lease</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Vehicle</div>
            <div className="field">
              <label>Vehicle price (drive-away)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.vehiclePrice || ''} onChange={setNum('vehiclePrice')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>EV/PHEV eligible for FBT exemption?</label>
              <div className="segmented">
                <button className={inputs.isEVExempt ? 'active' : ''} onClick={() => set('isEVExempt', true)}>Yes — EV/PHEV</button>
                <button className={!inputs.isEVExempt ? 'active' : ''} onClick={() => set('isEVExempt', false)}>No — ICE</button>
              </div>
            </div>
            {inputs.isEVExempt && inputs.vehiclePrice >= 91000 && (
              <p style={{ fontSize: '0.73rem', color: 'var(--red)', marginTop: 4 }}>Vehicle price exceeds LCT threshold (~$91,000) — FBT exemption may not apply. Confirm with your employer.</p>
            )}
            <div className="field">
              <label>Lease term</label>
              <div className="segmented">
                {[1,2,3,4,5].map(t => (
                  <button key={t} className={inputs.termYears === t ? 'active' : ''} onClick={() => set('termYears', t)}>{t}yr</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Annual kilometres driven</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.annualKms || ''} onChange={setNum('annualKms')} min="0" step="1000" />
                <span className="input-suffix">km</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Your salary</div>
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
                <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="20" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Lease costs</div>
            <div className="field">
              <label>Annual running costs (fuel/charging, rego, insurance, servicing)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.runningCosts || ''} onChange={setNum('runningCosts')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Finance rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.financeRate || ''} onChange={setNum('financeRate')} min="0" max="20" step="0.25" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Residual value</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <button
                  onClick={() => { setShowResidualOverride(!showResidualOverride); if (showResidualOverride) set('residualOverride', null); }}
                  style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showResidualOverride ? 'Use ATO guideline' : `ATO guideline: ${fmt(result.residualValue)} — override`}
                </button>
              </div>
              {showResidualOverride && (
                <div className="input-wrap has-prefix">
                  <span className="input-prefix">$</span>
                  <input type="number" value={inputs.residualOverride ?? result.residualValue} onChange={e => set('residualOverride', parseFloat(e.target.value) || 0)} min="0" step="1000" />
                </div>
              )}
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {result.isExempt ? (
            <div className="rate-callout">
              <strong>FBT-exempt EV/PHEV</strong>
              Full lease + running costs ({fmt(result.totalLeaseAndRunning)}/yr) paid from pre-tax salary. No FBT liability.
            </div>
          ) : (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Non-exempt ICE vehicle — FBT applies</strong>
              FBT liability: {fmt(result.fbtLiability)}/yr (statutory method). Pre-tax salary reduction reduced accordingly.
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Annual tax saving</div>
            <div className="savings-amount">{fmt(result.annualTaxSaving)}</div>
            <div className="savings-sub">from pre-tax salary reduction of {fmt(result.preTaxSalaryReduction)}/yr at {fmtPct(result.marginalRate)} marginal rate</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Total saving over {inputs.termYears}yr</div>
                <div className="savings-stat-value">{fmt(result.totalSavingOverTerm)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Net annual cost</div>
                <div className="savings-stat-value">{fmt(result.netAnnualCost)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Fortnightly cost</div>
                <div className="savings-stat-value">{fmt(result.forthnightlyOutOfPocket)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Annual lease payment</div>
              <div className="stat-card-value">{fmt(result.annualLeasePayment)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Residual value</div>
              <div className="stat-card-value">{fmt(result.residualValue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Outright annual cost</div>
              <div className="stat-card-value">{fmt(result.outright_annualCost)}</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Novated vs. buying outright — annual net cost</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={52} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Novated (net)" fill={chartAccent} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Buy outright (net)" fill={theme === 'dark' ? '#E87070' : '#D85A30'} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO novated lease and FBT rules (estimated). EV FBT exemption subject to LCT threshold (~$91,000) and employer participation. Residual values per ATO guidelines. For personal decisions, consult a licensed financial adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
