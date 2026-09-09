import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { calcFHSSS } from './lib/fhsss.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(1) + '%';

const DEFAULTS = {
  grossIncome: 80000,
  annualConcessional: 10000,
  annualNonConcessional: 0,
  years: 3,
  superBalance: 30000,
  sgRate: 12,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('gi', inp.grossIncome);
  p.set('ac', inp.annualConcessional);
  p.set('nc', inp.annualNonConcessional);
  p.set('yr', inp.years);
  p.set('sb', inp.superBalance);
  p.set('sg', inp.sgRate);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('gi')) return {};
  return {
    grossIncome:          parseFloat(p.get('gi')) || 80000,
    annualConcessional:   parseFloat(p.get('ac')) || 10000,
    annualNonConcessional: parseFloat(p.get('nc')) || 0,
    years:                parseFloat(p.get('yr')) || 3,
    superBalance:         parseFloat(p.get('sb')) || 30000,
    sgRate:               parseFloat(p.get('sg')) || 12,
  };
}

export default function FHSSSInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcFHSSS(inputs), [inputs]);

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
          <h1>First Home Super Saver<br /><span className="calc-heading-sub">FHSSS Scheme Calculator</span></h1>
          <p>Calculate how much you can save for your first home deposit inside super using the FHSSS scheme. Based on 2026–27 ATO rules.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>FHSSS</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Income &amp; super</div>
            <div className="field">
              <label>Annual gross income</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossIncome || ''} onChange={setNum('grossIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Employer SG rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="20" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
            <div className="field">
              <label>Current super balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.superBalance || ''} onChange={setNum('superBalance')} min="0" step="5000" />
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">FHSSS contributions (per year)</div>
            <div className="field">
              <label>Voluntary concessional (salary sacrifice, pre-tax)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.annualConcessional || ''} onChange={setNum('annualConcessional')} min="0" max="15000" step="500" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Max $15,000/yr, $50,000 lifetime under FHSSS</p>
            </div>
            <div className="field">
              <label>Non-concessional (after-tax, optional)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.annualNonConcessional || ''} onChange={setNum('annualNonConcessional')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Years contributing</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.years || ''} onChange={setNum('years')} min="1" max="10" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {result.annualCapWarning && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Concessional cap warning</strong>
              Total concessional contributions (SG + voluntary) exceed $30,000/yr. Only contributions within the cap can be released under FHSSS.
            </div>
          )}
          {result.lifetimeLimitReached && (
            <div className="rate-callout">
              <strong>Lifetime limit of $50,000 reached</strong>
              Further contributions can still go to super but won't be releasable under FHSSS.
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Net deposit amount</div>
            <div className="savings-amount">{fmt(result.netDeposit)}</div>
            <div className="savings-sub">after withdrawal tax of {fmt(result.withdrawalTax)} ({fmtPct(result.withholdingRate)} withholding)</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Releasable amount</div>
                <div className="savings-stat-value">{fmt(result.totalReleasable)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Notional earnings</div>
                <div className="savings-stat-value">{fmt(result.totalWithEarnings - result.totalReleasable)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Annual tax saving</div>
                <div className="savings-stat-value">{fmt(result.annualTaxSaving)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Releasable per year</div>
              <div className="stat-card-value">{fmt(result.annualReleasable)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Marginal rate</div>
              <div className="stat-card-value">{fmtPct(result.marginalRate)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total with earnings</div>
              <div className="stat-card-value">{fmt(result.totalWithEarnings)}</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Year-by-year accumulation</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={result.yearData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={52} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="releasable" name="Releasable" fill={chartAccent} stackId="a" />
                <Bar dataKey="earnings" name="Notional earnings" fill={theme === 'dark' ? '#9E98E8' : '#7F77DD'} stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO FHSSS rules. Notional earnings rate approx. 7.14% p.a. (ATO shortfall interest charge). Withdrawal tax = (marginal rate − 30%) applied to releasable amount + earnings. For personal decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
