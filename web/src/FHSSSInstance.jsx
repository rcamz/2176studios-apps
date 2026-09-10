import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { calcFHSSS, explainFHSSS, ELIGIBILITY_ITEMS } from './lib/fhsss.js';
import Workings from './Workings.jsx';
import { fmt, fmtPct } from './lib/format.js';
import { num, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const DEFAULTS = {
  grossIncome: 80000,
  annualConcessional: 10000,
  annualNonConcessional: 0,
  years: 3,
  sgRate: 12,
  eligibility: {},
};

// Seven yes/no answers ride in one parameter, in ELIGIBILITY_ITEMS order.
const encodeEligibility = (answers) =>
  ELIGIBILITY_ITEMS.map((i) => (answers[i.key] === false ? '0' : '1')).join('');

function decodeEligibility(raw) {
  if (typeof raw !== 'string' || raw.length !== ELIGIBILITY_ITEMS.length) return {};
  const out = {};
  ELIGIBILITY_ITEMS.forEach((item, i) => { out[item.key] = raw[i] !== '0'; });
  return out;
}

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('gi', inp.grossIncome);
  p.set('ac', inp.annualConcessional);
  p.set('nc', inp.annualNonConcessional);
  p.set('yr', inp.years);
  p.set('sg', inp.sgRate);
  p.set('el', encodeEligibility(inp.eligibility));
  return p;
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('gi')) return {};
  return {
    grossIncome:           num(p.get('gi'), DEFAULTS.grossIncome),
    annualConcessional:    num(p.get('ac'), DEFAULTS.annualConcessional),
    annualNonConcessional: num(p.get('nc'), DEFAULTS.annualNonConcessional),
    years:                 num(p.get('yr'), DEFAULTS.years),
    sgRate:                num(p.get('sg'), DEFAULTS.sgRate),
    eligibility:           decodeEligibility(p.get('el')),
  };
}

export default function FHSSSInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);
  const setEligible = (key, val) =>
    setInputs(s => ({ ...s, eligibility: { ...s.eligibility, [key]: val } }));

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(encodeInputs(inputs));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcFHSSS(inputs), [inputs]);

  const explanation = useMemo(() => explainFHSSS(result, inputs), [result, inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const { eligibility } = result;
  const sicHeadline = result.sicRatesUsed.length
    ? fmtPct(result.sicRatesUsed[result.sicRatesUsed.length - 1].annualRate, 2)
    : '—';

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
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                SG of {fmt(result.sgContribution)} uses {fmt(Math.min(result.sgContribution, result.concessionalCap))} of your {fmt(result.concessionalCap)} concessional cap. Compulsory SG is not releasable under FHSSS — voluntary contributions only.
              </p>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">FHSSS contributions (per year)</div>
            <div className="field">
              <label>Voluntary concessional (salary sacrifice, pre-tax)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.annualConcessional || ''} onChange={setNum('annualConcessional')} min="0" step="500" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {fmt(result.annualLimit)}/yr and {fmt(result.lifetimeLimit)} lifetime are limits on contributions counted. Only 85% of concessional contributions can be released.
              </p>
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
          </div>

          <div className="panel-section">
            <div className="section-title">Eligibility check</div>
            {ELIGIBILITY_ITEMS.map((item) => {
              const met = inputs.eligibility[item.key] !== false;
              return (
                <div className="field" key={item.key}>
                  <label style={item.critical ? { color: 'var(--text)' } : undefined}>
                    {item.critical ? '⚠ ' : ''}{item.label}
                  </label>
                  <div className="segmented">
                    <button className={met ? 'active' : ''} onClick={() => setEligible(item.key, true)}>Yes</button>
                    <button className={!met ? 'active' : ''} onClick={() => setEligible(item.key, false)}>No</button>
                  </div>
                  {(!met || item.critical) && (
                    <p style={{ fontSize: '0.72rem', color: met ? 'var(--text-muted)' : 'var(--red)', marginTop: 4 }}>
                      {item.detail}
                    </p>
                  )}
                </div>
              );
            })}
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {!eligibility.eligible && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>
                {eligibility.criticalFailure
                  ? 'You cannot use the FHSSS on this purchase'
                  : `Not eligible — ${eligibility.blocking.length} condition${eligibility.blocking.length > 1 ? 's' : ''} not met`}
              </strong>
              {eligibility.criticalFailure
                ? 'The determination must be requested before your interest in the land is registered. Once you hold that interest the request is invalid and the entire benefit is lost — there is no partial release and no second chance. The figures below are hypothetical.'
                : `Every condition must be met. Not met: ${eligibility.blocking.map((i) => i.label).join('; ')}. The figures below are hypothetical.`}
            </div>
          )}
          {result.concessionalCapExceeded && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Concessional cap exceeded</strong>
              SG plus your voluntary contributions exceed the {fmt(result.concessionalCap)}/yr concessional cap. Only {fmt(result.concessionalHeadroom)} of voluntary concessional contributions fits under the cap and is counted here; anything above it is taxed at your marginal rate with a 15% offset, plus an excess concessional contributions charge.
            </div>
          )}
          {result.lifetimeLimitReached && (
            <div className="rate-callout">
              <strong>Lifetime limit of {fmt(result.lifetimeLimit)} reached</strong>
              That is {fmt(result.lifetimeLimit)} of counted contributions, which releases as {fmt(result.totalReleasable)} after the 85% concessional rate. Further contributions can still go to super but won't be releasable.
            </div>
          )}
          {result.division293Applies && (
            <div className="rate-callout">
              <strong>Division 293 applies — {fmt(result.division293)}/yr</strong>
              Income plus concessional contributions exceed $250,000, so an extra 15% applies to the contribution. Your saving is marginal + 2% − 30%, not marginal − 15%.
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Net deposit amount</div>
            <div className="savings-amount">{fmt(result.netDeposit)}</div>
            <div className="savings-sub">
              after withdrawal tax of {fmt(result.withdrawalTax)} — {fmtPct(result.withholdingRate)} of the assessable {fmt(result.assessableAmount)} (marginal {fmtPct(result.marginalRate)} + {fmtPct(result.medicareRate)} Medicare − {fmtPct(result.withdrawalOffset)} offset)
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Releasable amount</div>
                <div className="savings-stat-value">{fmt(result.totalReleasable)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Associated earnings</div>
                <div className="savings-stat-value">{fmt(result.totalEarnings)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Tax saved contributing</div>
                <div className="savings-stat-value">{fmt(result.totalTaxSaving)}</div>
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

          <div className="rate-callout">
            <strong>Associated earnings at the shortfall interest charge — {sicHeadline} p.a.{result.sicProjected ? ' (part projected)' : ''}</strong>
            The SIC is the 90-day bank bill rate plus 3%, set quarterly and compounded daily, and it runs on each year's releasable amount from 1 July of the year you contributed. {result.sicProjected
              ? 'Quarters past the last published rate are projected by holding that rate flat — the actual figure will differ.'
              : 'Every quarter in this projection is a published rate.'} Determination modelled as requested {result.determinationDate}.
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
                <Bar dataKey="earnings" name="Associated earnings" fill={theme === 'dark' ? '#9E98E8' : '#7F77DD'} stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 ATO FHSSS rules: {fmt(result.annualLimit)}/yr and {fmt(result.lifetimeLimit)} lifetime limits on counted contributions, with 85% of concessional and 100% of non-concessional contributions releasable — the limits apply before the 85% rate, not after. Associated earnings use the shortfall interest charge, set quarterly and compounded daily. Released concessional amounts and earnings are assessable with a 30% offset and Medicare applies; released non-concessional contributions are tax-free. FHSS released amounts are excluded from both HELP repayment income and Medicare levy surcharge income. Assumes level contributions each year and a determination requested at the end of the final year. For personal decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
