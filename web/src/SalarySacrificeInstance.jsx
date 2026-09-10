import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { calcSalarySacrifice } from './lib/salarysacrifice.js';
import { fmt, fmtShort, fmtPct } from './lib/format.js';
import { num, bool, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const DEFAULTS = {
  grossSalary: 100000,
  sgRate: 12,
  sacrificeAmount: 5000,
  otherSacrifice: 0,
  age: 40,
  superBalance: 80000,
  priorUnusedCap: 0,
  useCarryForward: true,
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
  p.set('cf', inp.priorUnusedCap);
  p.set('uc', inp.useCarryForward ? '1' : '0');
  p.set('hy', inp.horizonYears);
  p.set('ir', inp.investmentReturn);
  return p;
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('gs')) return {};
  return {
    grossSalary:      num(p.get('gs'), DEFAULTS.grossSalary),
    sgRate:           num(p.get('sg'), DEFAULTS.sgRate),
    sacrificeAmount:  num(p.get('sa'), DEFAULTS.sacrificeAmount),
    otherSacrifice:   num(p.get('os'), DEFAULTS.otherSacrifice),
    age:              num(p.get('ag'), DEFAULTS.age),
    superBalance:     num(p.get('sb'), DEFAULTS.superBalance),
    priorUnusedCap:   num(p.get('cf'), DEFAULTS.priorUnusedCap),
    useCarryForward:  bool(p.get('uc'), DEFAULTS.useCarryForward),
    horizonYears:     num(p.get('hy'), DEFAULTS.horizonYears),
    investmentReturn: num(p.get('ir'), DEFAULTS.investmentReturn),
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
    writeUrl(encodeInputs(inputs));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcSalarySacrifice(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const savingHeadline = result.division293Applies
    ? `by paying 15% + 15% Division 293 super tax instead of your ${fmtPct(result.withSacrifice.marginalRate)} marginal rate`
    : `by paying 15% super tax instead of your ${fmtPct(result.withSacrifice.marginalRate)} marginal rate`;

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
              <label>Age</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.age || ''} onChange={setNum('age')} min="15" max="75" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Employer SG rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="30" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                SG of {fmt(result.sgContribution)} leaves {fmt(result.capHeadroom)} of room under your {fmt(result.effectiveCap)} cap.
              </p>
            </div>
            <div className="field">
              <label>Salary sacrifice to super (pre-tax)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.sacrificeAmount || ''} onChange={setNum('sacrificeAmount')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Other concessional contributions (second employer, personal deductible)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.otherSacrifice || ''} onChange={setNum('otherSacrifice')} min="0" step="500" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Counts toward the cap and is taxed the same way. A novated lease is not a concessional contribution — use the novated lease calculator for that.
              </p>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Carry-forward cap</div>
            <div className="field">
              <label>Total super balance at 30 June last year</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.superBalance || ''} onChange={setNum('superBalance')} min="0" step="5000" />
              </div>
            </div>
            <div className="field">
              <label>Unused concessional cap from the last 5 years</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.priorUnusedCap || ''} onChange={setNum('priorUnusedCap')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Use carry-forward this year</label>
              <div className="segmented">
                <button className={inputs.useCarryForward ? 'active' : ''} onClick={() => set('useCarryForward', true)}>Yes</button>
                <button className={!inputs.useCarryForward ? 'active' : ''} onClick={() => set('useCarryForward', false)}>No</button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {result.carryForward.eligible
                  ? `Available: ${fmt(result.carryForward.available)}. Unused cap expires after ${result.carryForward.lookbackYears} years.`
                  : `Not available — your total super balance was ${fmt(result.carryForward.totalSuperBalance)} at 30 June, and carry-forward requires under ${fmt(result.carryForward.balanceTest)}.`}
              </p>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Projection settings</div>
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
          {result.division293Applies && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Division 293 applies — {fmt(result.division293)} this year</strong>
              Your income plus concessional contributions exceed {fmt(result.division293Threshold)}, so an extra 15% applies to the contribution — {fmt(result.division293Extra)} of it caused by the sacrifice. Your saving is your marginal rate less 30%, not less 15%.
            </div>
          )}
          {result.capExceeded && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Concessional cap exceeded by {fmt(result.excessAmount)}</strong>
              Total concessional contributions of {fmt(result.totalConcessional)} exceed your {fmt(result.effectiveCap)} cap. The excess is added back to your assessable income and taxed at your marginal rate, but you get a 15% offset for the tax the fund already paid — roughly {fmt(result.excessTaxEstimate)}. An excess concessional contributions charge also applies and is not included here.
            </div>
          )}
          {result.lockedUntilPreservation && (
            <div className="rate-callout">
              <strong>Locked away for {result.yearsToPreservation} years</strong>
              Preservation age is {result.preservationAge}. Money sacrificed to super cannot be accessed until then except in narrow hardship and compassionate circumstances — the tax saving is real, but so is the lock. The First Home Super Saver Scheme is the one common exception.
            </div>
          )}
          {result.division296Flag.triggered && (
            <div className="rate-callout">
              <strong>Projected balance crosses {fmt(result.division296Flag.threshold)}</strong>
              {result.division296Flag.note}
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Annual tax saving</div>
            <div className="savings-amount">{fmt(result.annualTaxSaving)}</div>
            <div className="savings-sub">{savingHeadline} — an effective {fmtPct(result.savingRate)} on {fmt(result.totalSacrifice)} sacrificed</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Net take-home cost</div>
                <div className="savings-stat-value">{fmt(result.netTakeHomeCost)}/yr</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Fortnightly cost</div>
                <div className="savings-stat-value">{fmt(result.fortnightlyCost)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Lands in super</div>
                <div className="savings-stat-value">{fmt(result.superTaxedSacrifice)}/yr</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Take-home without sacrifice</div>
              <div className="stat-card-value">{fmt(result.withoutSacrifice.takeHome - result.division293Without)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Take-home with sacrifice</div>
              <div className="stat-card-value">{fmt(result.withSacrifice.takeHome - result.division293)}</div>
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
            <div className="chart-title">Projected wealth after {inputs.horizonYears} years</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.projectionData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} interval={Math.max(0, Math.floor(inputs.horizonYears / 5))} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Year ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {result.division296Flag.triggered && (
                  <ReferenceLine y={result.division296Flag.threshold} stroke={chartGhost} strokeDasharray="3 3"
                    label={{ value: 'Div 296 $3m', position: 'insideTopRight', fontSize: 10, fill: chartTick }} />
                )}
                <Line type="monotone" dataKey="With sacrifice" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without sacrifice" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              Apples to apples: &ldquo;without sacrifice&rdquo; is your super plus the {fmt(result.netTakeHomeCost)}/yr of extra take-home pay invested outside super. Super earnings are taxed at 15% ({fmtPct(result.superReturn)} net), outside earnings at your marginal rate ({fmtPct(result.outsideReturn)} net). Difference after {inputs.horizonYears} years: {fmt(result.projectionDelta)}.
            </p>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on the 2026–27 concessional cap of {fmt(result.concessionalCap)}, 15% contributions tax, and Division 293 at 15% above {fmt(result.division293Threshold)}. Compulsory SG is capped at the maximum contribution base. Carry-forward assumes unused cap from the last {result.carryForward.lookbackYears} years and a total super balance under {fmt(result.carryForward.balanceTest)} at 30 June of the prior year. Projection assumes constant salary, return and contributions, and ignores insurance premiums and administration fees. Super is preserved until age {result.preservationAge}. Division 296 is flagged, not modelled. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
