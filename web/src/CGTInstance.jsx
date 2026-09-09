import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcCGT } from './lib/cgt.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtPct = (n) => (n * 100).toFixed(1) + '%';

// Generate a year-month string for the current date
function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function prevYM(months = 24) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULTS = {
  assetType: 'shares',
  purchasePrice: 50000,
  purchaseCosts: 500,
  salePrice: 90000,
  saleCosts: 500,
  improvements: 0,
  purchaseDate: prevYM(30),
  saleDate: currentYM(),
  grossIncome: 90000,
  capitalLosses: 0,
  residency: 'resident',
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('at', inp.assetType[0]);
  p.set('pp', inp.purchasePrice);
  p.set('pc', inp.purchaseCosts);
  p.set('sp', inp.salePrice);
  p.set('sc', inp.saleCosts);
  p.set('im', inp.improvements);
  p.set('pd', inp.purchaseDate);
  p.set('sd', inp.saleDate);
  p.set('gi', inp.grossIncome);
  p.set('cl', inp.capitalLosses);
  p.set('re', inp.residency[0]);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('pp')) return {};
  const atMap = { p: 'property', s: 'shares', c: 'crypto', o: 'other' };
  const reMap = { r: 'resident', f: 'foreign', h: 'holiday' };
  return {
    assetType:     atMap[p.get('at')] ?? 'shares',
    purchasePrice: parseFloat(p.get('pp')) || 50000,
    purchaseCosts: parseFloat(p.get('pc')) || 0,
    salePrice:     parseFloat(p.get('sp')) || 90000,
    saleCosts:     parseFloat(p.get('sc')) || 0,
    improvements:  parseFloat(p.get('im')) || 0,
    purchaseDate:  p.get('pd') || prevYM(30),
    saleDate:      p.get('sd') || currentYM(),
    grossIncome:   parseFloat(p.get('gi')) || 90000,
    capitalLosses: parseFloat(p.get('cl')) || 0,
    residency:     reMap[p.get('re')] ?? 'resident',
  };
}

export default function CGTInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcCGT(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const holdingYrs = Math.floor(result.holdingMonths / 12);
  const holdingMos = result.holdingMonths % 12;
  const holdingStr = [holdingYrs && `${holdingYrs}y`, holdingMos && `${holdingMos}m`].filter(Boolean).join(' ') || '< 1 month';

  const chartData = [
    { name: 'Cost base', value: Math.round(result.costBase) },
    { name: 'Gross gain', value: Math.max(0, Math.round(result.grossGain)) },
    { name: 'CGT payable', value: Math.round(result.cgtPayable) },
    { name: 'Net proceeds', value: Math.round(result.afterTaxProceeds) },
  ];

  const barColors = [
    theme === 'dark' ? '#9E98E8' : '#7F77DD',
    theme === 'dark' ? '#D9931E' : '#BA7517',
    theme === 'dark' ? '#E87070' : '#D85A30',
    chartAccent,
  ];

  const isLoss = result.grossGain < 0;

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
          <h1>Capital Gains Tax Calculator<br /><span className="calc-heading-sub">CGT Discount + Marginal Rate</span></h1>
          <p>Calculate CGT on property, shares, crypto or other assets. Applies 50% CGT discount where eligible. Based on 2026–27 ATO rates.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>CGT Calculator</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Asset details</div>
            <div className="field">
              <label>Asset type</label>
              <div className="segmented">
                {[['property','Property'],['shares','Shares'],['crypto','Crypto'],['other','Other']].map(([v,l]) => (
                  <button key={v} className={inputs.assetType === v ? 'active' : ''} onClick={() => set('assetType', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Purchase price</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.purchasePrice || ''} onChange={setNum('purchasePrice')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Purchase costs (stamp duty, brokerage, legal)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.purchaseCosts || ''} onChange={setNum('purchaseCosts')} min="0" step="100" />
              </div>
            </div>
            <div className="field">
              <label>Capital improvements</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.improvements || ''} onChange={setNum('improvements')} min="0" step="1000" />
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Sale details</div>
            <div className="field">
              <label>Sale price</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.salePrice || ''} onChange={setNum('salePrice')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Sale costs (agent fees, brokerage)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.saleCosts || ''} onChange={setNum('saleCosts')} min="0" step="100" />
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Holding period</div>
            <div className="field">
              <label>Purchase date (month/year)</label>
              <input type="month" className="field-input" value={inputs.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Sale date (month/year)</label>
              <input type="month" className="field-input" value={inputs.saleDate} onChange={e => set('saleDate', e.target.value)} />
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Your tax situation</div>
            <div className="field">
              <label>Gross annual income (excl. this gain)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossIncome || ''} onChange={setNum('grossIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Carry-forward capital losses</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.capitalLosses || ''} onChange={setNum('capitalLosses')} min="0" step="1000" placeholder="0" />
              </div>
            </div>
            <div className="field">
              <label>Residency status</label>
              <select className="field-select" value={inputs.residency} onChange={e => set('residency', e.target.value)}>
                <option value="resident">Australian resident</option>
                <option value="foreign">Foreign resident (no CGT discount)</option>
              </select>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {isLoss ? (
            <div className="savings-card">
              <div className="savings-label">Capital loss</div>
              <div className="savings-amount" style={{ color: 'var(--red)' }}>{fmt(Math.abs(result.grossGain))}</div>
              <div className="savings-sub">This is a capital loss — no CGT payable. Carry the loss forward to offset future gains.</div>
            </div>
          ) : (
            <div className="savings-card">
              <div className="savings-label">CGT payable</div>
              <div className="savings-amount">{fmt(result.cgtPayable)}</div>
              <div className="savings-sub">
                Effective CGT rate: {fmtPct(result.effectiveCGTRate)} on gross gain of {fmt(result.grossGain)}
              </div>
              <div className="savings-meta">
                <div className="savings-stat">
                  <div className="savings-stat-label">Assessable gain</div>
                  <div className="savings-stat-value">{fmt(result.assessableGain)}</div>
                </div>
                <div className="savings-stat">
                  <div className="savings-stat-label">Marginal rate</div>
                  <div className="savings-stat-value">{fmtPct(result.marginalRate)}</div>
                </div>
                <div className="savings-stat">
                  <div className="savings-stat-label">Net proceeds</div>
                  <div className="savings-stat-value">{fmt(result.afterTaxProceeds)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Gross gain (before discount)</div>
              <div className="stat-card-value">{fmt(Math.max(0, result.grossGain))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Holding period</div>
              <div className="stat-card-value">{holdingStr}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">CGT discount</div>
              <div className="stat-card-value">{result.cgtDiscountEligible ? '50%' : 'Not eligible'}</div>
            </div>
          </div>

          {result.cgtDiscountEligible && !isLoss && (
            <div className="rate-callout">
              <strong>50% CGT discount applied</strong>
              Held {'>'} 12 months as an Australian resident. Assessable gain reduced from {fmt(result.gainAfterLosses)} to {fmt(result.assessableGain)}.
            </div>
          )}
          {!result.cgtDiscountEligible && !isLoss && result.holdingMonths < 12 && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>No CGT discount — held less than 12 months</strong>
              Full gain of {fmt(result.grossGain)} is assessable. Hold for 12+ months to qualify for 50% discount.
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          {!isLoss && (
            <div className="chart-card">
              <div className="chart-title">CGT breakdown</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartTick, fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={52} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, name) => [fmt(v), name]} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO rates (estimated). Does not account for main residence exemption, small business CGT concessions, or state/territory taxes. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
