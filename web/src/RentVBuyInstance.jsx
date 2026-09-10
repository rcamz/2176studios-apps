import { useState, useMemo, useEffect, useId } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { calcRentVsBuy, explainRentVsBuy } from './lib/rentvbuy.js';
import Workings from './Workings.jsx';
import { JURISDICTIONS } from './lib/stampduty.js';
import { LMI_DISCLOSURE } from './lib/lmi.js';
import { fmt, fmtShort, fmtPct } from './lib/format.js';
import { num, bool, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const PROPERTY_TYPES = {
  established: 'Established',
  new: 'New build',
  offThePlan: 'Off the plan',
  vacantLand: 'Vacant land',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULTS = {
  purchasePrice: 800000,
  state: 'NSW',
  firstHomeBuyer: false,
  propertyType: 'established',
  contractDate: todayISO(),
  firstHomeGuarantee: false,
  deposit: 160000,
  mortgageRate: 6.0,
  loanTerm: 30,
  capitaliseStampDuty: false,
  propertyGrowth: 4,
  ongoingCosts: 8000,
  purchaseCosts: 3000,
  sellingCosts: 2,
  annualRent: 36000,
  rentIncrease: 3,
  investmentReturn: 7,
  grossIncome: 120000,
  comparisonYears: 10,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('pp', inp.purchasePrice);
  p.set('st', inp.state);
  p.set('fh', inp.firstHomeBuyer ? '1' : '0');
  p.set('pt', inp.propertyType);
  p.set('cd', inp.contractDate);
  p.set('fg', inp.firstHomeGuarantee ? '1' : '0');
  p.set('dp', inp.deposit);
  p.set('mr', inp.mortgageRate);
  p.set('lt', inp.loanTerm);
  p.set('cs', inp.capitaliseStampDuty ? '1' : '0');
  p.set('pg', inp.propertyGrowth);
  p.set('oc', inp.ongoingCosts);
  p.set('uc', inp.purchaseCosts);
  p.set('sc', inp.sellingCosts);
  p.set('ar', inp.annualRent);
  p.set('ri', inp.rentIncrease);
  p.set('ir', inp.investmentReturn);
  p.set('gi', inp.grossIncome);
  p.set('cy', inp.comparisonYears);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('pp')) return {};
  return {
    purchasePrice:       num(p.get('pp'), DEFAULTS.purchasePrice),
    state:               JURISDICTIONS.includes(p.get('st')) ? p.get('st') : 'NSW',
    firstHomeBuyer:      bool(p.get('fh'), false),
    propertyType:        enumOf(p.get('pt'), Object.fromEntries(Object.keys(PROPERTY_TYPES).map(k => [k, k])), 'established'),
    contractDate:        p.get('cd') || todayISO(),
    firstHomeGuarantee:  bool(p.get('fg'), false),
    deposit:             num(p.get('dp'), DEFAULTS.deposit),
    mortgageRate:        num(p.get('mr'), DEFAULTS.mortgageRate),
    loanTerm:            num(p.get('lt'), DEFAULTS.loanTerm),
    capitaliseStampDuty: bool(p.get('cs'), false),
    propertyGrowth:      num(p.get('pg'), DEFAULTS.propertyGrowth),
    ongoingCosts:        num(p.get('oc'), DEFAULTS.ongoingCosts),
    purchaseCosts:       num(p.get('uc'), DEFAULTS.purchaseCosts),
    sellingCosts:        num(p.get('sc'), DEFAULTS.sellingCosts),
    annualRent:          num(p.get('ar'), DEFAULTS.annualRent),
    rentIncrease:        num(p.get('ri'), DEFAULTS.rentIncrease),
    investmentReturn:    num(p.get('ir'), DEFAULTS.investmentReturn),
    grossIncome:         num(p.get('gi'), DEFAULTS.grossIncome),
    comparisonYears:     num(p.get('cy'), DEFAULTS.comparisonYears),
  };
}

export default function RentVBuyInstance({
  instanceKey = '', label, onRemove, theme = 'light', isComparison = false,
  seed = null, onStateChange = null,
}) {
  const [inputs, setInputs] = useState(() => {
    if (seed) return { ...seed };
    return instanceKey === ''
      ? { ...DEFAULTS, ...decodeParams(window.location.search) }
      : { ...DEFAULTS };
  });

  const uid = useId();

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(new URLSearchParams(encodeInputs(inputs)));
  }, [inputs, instanceKey]);

  useEffect(() => { onStateChange?.(inputs); }, [inputs, onStateChange]);

  const result = useMemo(() => calcRentVsBuy(inputs), [inputs]);
  const explanation = useMemo(() => explainRentVsBuy(result, inputs), [result, inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartBlue    = theme === 'dark' ? '#5BA4E8' : '#378ADD';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const buyerWins = result.wealthGap > 0;
  const lvrPct = result.lvr !== null ? (result.lvr * 100).toFixed(1) : null;

  return (
    <div className="calc-instance">
      {isComparison && (
        <div className="instance-header">
          <span className="instance-label">{label}</span>
          <button className="instance-remove" onClick={onRemove || undefined} title="Remove scenario" aria-label={`Remove scenario ${label ?? ''}`.trim()}
            style={!onRemove ? { visibility: 'hidden', pointerEvents: 'none' } : {}}>×</button>
        </div>
      )}

      {!isComparison ? (
        <div className="calc-heading">
          <h1>Rent vs. Buy Calculator<br /><span className="calc-heading-sub">True Cost Comparison</span></h1>
          <p>Compare the real financial outcome of renting against buying a home to live in. Includes stamp duty for your state, LMI, the opportunity cost of your deposit, and the capital gains tax a renter pays on their investments but an owner-occupier does not.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Rent vs. Buy</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">The property</div>
            <div className="field">
              <label htmlFor={`${uid}-price`}>Purchase price</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-price`} type="number" inputMode="decimal" value={inputs.purchasePrice || ''} onChange={setNum('purchasePrice')} min="0" step="10000" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-state`}>State or territory</label>
              <select id={`${uid}-state`} className="field-select" value={inputs.state} onChange={e => set('state', e.target.value)}>
                {JURISDICTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-property-type`}>Property type</label>
              <select id={`${uid}-property-type`} className="field-select" value={inputs.propertyType} onChange={e => set('propertyType', e.target.value)}>
                {Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-contract-date`}>Contract date</label>
              <input id={`${uid}-contract-date`} className="field-select" type="date" aria-describedby={`${uid}-contract-date-help`} value={inputs.contractDate} onChange={e => set('contractDate', e.target.value)} />
              <div id={`${uid}-contract-date-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Several states changed their concessions during 2026, so duty depends on when you sign.
              </div>
            </div>
            <div className="field">
              <label id={`${uid}-fhb-label`}>First home buyer?</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-fhb-label`}>
                <button role="radio" aria-checked={inputs.firstHomeBuyer} className={inputs.firstHomeBuyer ? 'active' : ''} onClick={() => set('firstHomeBuyer', true)}>Yes</button>
                <button role="radio" aria-checked={!inputs.firstHomeBuyer} className={!inputs.firstHomeBuyer ? 'active' : ''} onClick={() => set('firstHomeBuyer', false)}>No</button>
              </div>
            </div>
            {inputs.firstHomeBuyer && (
              <div className="field">
                <label id={`${uid}-fhg-label`}>Using the First Home Guarantee?</label>
                <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-fhg-label`} aria-describedby={`${uid}-fhg-help`}>
                  <button role="radio" aria-checked={inputs.firstHomeGuarantee} className={inputs.firstHomeGuarantee ? 'active' : ''} onClick={() => set('firstHomeGuarantee', true)}>Yes</button>
                  <button role="radio" aria-checked={!inputs.firstHomeGuarantee} className={!inputs.firstHomeGuarantee ? 'active' : ''} onClick={() => set('firstHomeGuarantee', false)}>No</button>
                </div>
                <div id={`${uid}-fhg-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Removes LMI entirely. Price caps vary by postcode — check firsthomebuyers.gov.au.
                </div>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">Your loan</div>
            <div className="field">
              <label htmlFor={`${uid}-deposit`}>Deposit</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-deposit`} type="number" inputMode="decimal" aria-describedby={lvrPct ? `${uid}-deposit-help` : undefined} value={inputs.deposit || ''} onChange={setNum('deposit')} min="0" step="10000" />
              </div>
              {lvrPct && (
                <div id={`${uid}-deposit-help`} style={{ fontSize: '0.72rem', color: result.lmiPayable ? 'var(--red)' : 'var(--text-muted)', marginTop: 4 }}>
                  {lvrPct}% LVR{result.lmiPayable ? ` · LMI approx ${fmt(result.lmiPremium)}` : ' · no LMI'}
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor={`${uid}-mortgage-rate`}>Mortgage rate</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-mortgage-rate`} type="number" inputMode="decimal" value={inputs.mortgageRate || ''} onChange={setNum('mortgageRate')} min="0" max="20" step="0.1" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-loan-term`}>Loan term</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-loan-term`} type="number" inputMode="numeric" value={inputs.loanTerm || ''} onChange={setNum('loanTerm')} min="5" max="40" step="5" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label id={`${uid}-capitalise-label`}>Capitalise stamp duty into the loan?</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-capitalise-label`} aria-describedby={`${uid}-capitalise-help`}>
                <button role="radio" aria-checked={inputs.capitaliseStampDuty} className={inputs.capitaliseStampDuty ? 'active' : ''} onClick={() => set('capitaliseStampDuty', true)}>Yes</button>
                <button role="radio" aria-checked={!inputs.capitaliseStampDuty} className={!inputs.capitaliseStampDuty ? 'active' : ''} onClick={() => set('capitaliseStampDuty', false)}>No</button>
              </div>
              <div id={`${uid}-capitalise-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Most lenders require duty to be paid in cash.
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Owning costs</div>
            <div className="field">
              <label htmlFor={`${uid}-upfront`}>Upfront costs (conveyancing, inspections, loan fees)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-upfront`} type="number" inputMode="decimal" value={inputs.purchaseCosts || ''} onChange={setNum('purchaseCosts')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-ongoing`}>Annual ongoing costs (rates, strata, maintenance, insurance)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-ongoing`} type="number" inputMode="decimal" value={inputs.ongoingCosts || ''} onChange={setNum('ongoingCosts')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-growth`}>Annual property growth</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-growth`} type="number" inputMode="decimal" value={inputs.propertyGrowth || ''} onChange={setNum('propertyGrowth')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-selling`}>Selling costs</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-selling`} type="number" inputMode="decimal" value={inputs.sellingCosts || ''} onChange={setNum('sellingCosts')} min="0" max="10" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Renting instead</div>
            <div className="field">
              <label htmlFor={`${uid}-rent`}>Annual rent</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-rent`} type="number" inputMode="decimal" value={inputs.annualRent || ''} onChange={setNum('annualRent')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-rent-increase`}>Annual rent increase</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-rent-increase`} type="number" inputMode="decimal" value={inputs.rentIncrease || ''} onChange={setNum('rentIncrease')} min="0" max="15" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-return`}>Return on invested savings</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-return`} type="number" inputMode="decimal" value={inputs.investmentReturn || ''} onChange={setNum('investmentReturn')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-income`}>Your gross income (for CGT on those investments)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-income`} type="number" inputMode="decimal" value={inputs.grossIncome || ''} onChange={setNum('grossIncome')} min="0" step="5000" />
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Comparison period</div>
            <div className="field">
              <div className="segmented" role="radiogroup" aria-label="Comparison period in years">
                {[5, 10, 15, 20, 25, 30].map(y => (
                  <button key={y} role="radio" aria-checked={inputs.comparisonYears === y} className={inputs.comparisonYears === y ? 'active' : ''} onClick={() => set('comparisonYears', y)}>{y}yr</button>
                ))}
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">
              {buyerWins ? 'Buying is ahead after' : 'Renting is ahead after'} {inputs.comparisonYears} years
            </div>
            <div className="savings-amount" aria-live="polite" aria-atomic="true" style={{ color: buyerWins ? 'var(--accent)' : 'var(--red)' }}>
              {fmt(Math.abs(result.wealthGap))}
            </div>
            <div className="savings-sub">
              {buyerWins
                ? 'more wealth as an owner, after selling costs'
                : 'more wealth as a renter, after tax on investments'}
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Break-even</div>
                <div className="savings-stat-value">{result.breakEvenYear ? `Year ${result.breakEvenYear}` : 'Beyond horizon'}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Stamp duty</div>
                <div className="savings-stat-value">{fmt(result.stampDuty)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Cash needed upfront</div>
                <div className="savings-stat-value">{fmt(result.buyerUpfrontCash)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Monthly mortgage</div>
              <div className="stat-card-value">{fmt(result.monthlyMortgage)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Interest paid</div>
              <div className="stat-card-value">{fmt(result.cumulativeInterest)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Rent paid</div>
              <div className="stat-card-value">{fmt(result.cumulativeRent)}</div>
            </div>
          </div>

          <div className="rate-callout">
            <strong>Your home is exempt from capital gains tax — your investments are not</strong>
            The owner keeps the full {fmt(result.projectedPropertyValue - inputs.purchasePrice)} of growth. The renter pays about {fmt(result.renterCgt)} in CGT on their portfolio at {fmtPct(result.marginalRate)} plus Medicare, after the 50% discount. This is a structural advantage of buying that is easy to miss.
          </div>

          {result.lmiPayable && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>LMI of about {fmt(result.lmiPremium)} at {lvrPct}% LVR</strong>
              {LMI_DISCLOSURE} It is capitalised into the loan here, so you pay interest on it too. A {fmt(inputs.purchasePrice * 0.2)} deposit would avoid it.
            </div>
          )}

          {result.warnings.map((w, i) => (
            <div key={i} className="rate-callout">
              <strong>{w.title}</strong>
              {w.body}
            </div>
          ))}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Wealth after {inputs.comparisonYears} years — owning vs renting and investing</div>
            <div role="img" aria-label={`Line chart comparing buyer equity with renter wealth over ${inputs.comparisonYears} years. ${buyerWins ? 'Buying' : 'Renting'} ends ahead by ${fmt(Math.abs(result.wealthGap))}${result.breakEvenYear ? `, with buying overtaking renting in year ${result.breakEvenYear}` : ', with no break-even inside the period'}.`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: chartGrid }} tickLine={false} />
                <YAxis tickFormatter={fmtShort}
                  tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Year ${l}`}
                  contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {result.breakEvenYear && (
                  <ReferenceLine x={result.breakEvenYear} stroke={chartTick} strokeDasharray="4 4"
                    label={{ value: 'Break-even', position: 'insideTopRight', fontSize: 9, fill: chartTick }} />
                )}
                <Line type="monotone" dataKey="Buyer equity" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Renter wealth" stroke={chartBlue} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            </div>
            <table className="visually-hidden">
              <caption>Buyer equity and renter wealth at the end of each year</caption>
              <thead>
                <tr><th scope="col">Year</th><th scope="col">Buyer equity</th><th scope="col">Renter wealth</th></tr>
              </thead>
              <tbody>
                {result.chartData.map((d) => (
                  <tr key={d.year}>
                    <th scope="row">{d.year}{result.breakEvenYear === d.year ? ' (break-even)' : ''}</th>
                    <td>{fmt(d['Buyer equity'])}</td>
                    <td>{fmt(d['Renter wealth'])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Stamp duty verified 10 September 2026 and keyed to your contract date. Assumes the renter invests the cash the buyer spends upfront plus any difference in running costs, and draws down when rent exceeds the cost of owning. The owner-occupier main residence CGT exemption is applied; the renter's portfolio is taxed on realisation with the 50% discount. Does not include land tax, lender fees beyond LMI, or any change to your borrowing capacity.
          </div>
        </div>
      </div>
    </div>
  );
}
