import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { calcRentVsBuy } from './lib/rentvbuy.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : `$${Math.round(n/1000)}k`;

const STATES = ['NSW','VIC','QLD','SA','WA','TAS','ACT','NT'];

const DEFAULTS = {
  purchasePrice: 800000,
  state: 'NSW',
  firstHome: false,
  deposit: 160000,
  mortgageRate: 6.0,
  loanTerm: 30,
  propertyGrowth: 4,
  annualRent: 36000,
  rentIncrease: 3,
  depositReturn: 7,
  ongoingCosts: 8000,
  sellingCosts: 2,
  comparisonYears: 10,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('pp', inp.purchasePrice);
  p.set('st', inp.state);
  p.set('fh', inp.firstHome ? '1' : '0');
  p.set('dp', inp.deposit);
  p.set('mr', inp.mortgageRate);
  p.set('lt', inp.loanTerm);
  p.set('pg', inp.propertyGrowth);
  p.set('ar', inp.annualRent);
  p.set('ri', inp.rentIncrease);
  p.set('dr', inp.depositReturn);
  p.set('oc', inp.ongoingCosts);
  p.set('sc', inp.sellingCosts);
  p.set('cy', inp.comparisonYears);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('pp')) return {};
  return {
    purchasePrice:    parseFloat(p.get('pp')) || 800000,
    state:            p.get('st') || 'NSW',
    firstHome:        p.get('fh') === '1',
    deposit:          parseFloat(p.get('dp')) || 160000,
    mortgageRate:     parseFloat(p.get('mr')) || 6.0,
    loanTerm:         parseFloat(p.get('lt')) || 30,
    propertyGrowth:   parseFloat(p.get('pg')) || 4,
    annualRent:       parseFloat(p.get('ar')) || 36000,
    rentIncrease:     parseFloat(p.get('ri')) || 3,
    depositReturn:    parseFloat(p.get('dr')) || 7,
    ongoingCosts:     parseFloat(p.get('oc')) || 8000,
    sellingCosts:     parseFloat(p.get('sc')) || 2,
    comparisonYears:  parseFloat(p.get('cy')) || 10,
  };
}

export default function RentVBuyInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcRentVsBuy(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const buyerWins = result.wealthGap > 0;

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
          <h1>Rent vs. Buy Calculator<br /><span className="calc-heading-sub">True Cost Comparison</span></h1>
          <p>Compare the real financial outcome of renting vs. buying. Factors in stamp duty, opportunity cost of the deposit, property growth and rent inflation.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Rent vs. Buy</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Purchase</div>
            <div className="field">
              <label>Property purchase price</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.purchasePrice || ''} onChange={setNum('purchasePrice')} min="0" step="10000" />
              </div>
            </div>
            <div className="field">
              <label>State / territory</label>
              <select className="field-select" value={inputs.state} onChange={e => set('state', e.target.value)}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>First home buyer?</label>
              <div className="segmented">
                <button className={inputs.firstHome ? 'active' : ''} onClick={() => set('firstHome', true)}>Yes</button>
                <button className={!inputs.firstHome ? 'active' : ''} onClick={() => set('firstHome', false)}>No</button>
              </div>
            </div>
            <div className="field">
              <label>Deposit</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.deposit || ''} onChange={setNum('deposit')} min="0" step="10000" />
              </div>
            </div>
            <div className="field">
              <label>Mortgage rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.mortgageRate || ''} onChange={setNum('mortgageRate')} min="0" max="20" step="0.1" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Loan term</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.loanTerm || ''} onChange={setNum('loanTerm')} min="5" max="30" step="5" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Annual property growth</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.propertyGrowth || ''} onChange={setNum('propertyGrowth')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Annual ongoing costs (rates, strata, maintenance)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.ongoingCosts || ''} onChange={setNum('ongoingCosts')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Selling costs</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.sellingCosts || ''} onChange={setNum('sellingCosts')} min="0" max="10" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Renting</div>
            <div className="field">
              <label>Annual rent</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.annualRent || ''} onChange={setNum('annualRent')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Annual rent increase</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.rentIncrease || ''} onChange={setNum('rentIncrease')} min="0" max="15" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Investment return on deposit (if renting)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.depositReturn || ''} onChange={setNum('depositReturn')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Comparison period</div>
            <div className="field">
              <div className="segmented">
                {[5,10,15,20,25,30].map(y => (
                  <button key={y} className={inputs.comparisonYears === y ? 'active' : ''} onClick={() => set('comparisonYears', y)}>{y}yr</button>
                ))}
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">
              {buyerWins ? 'Buyer is ahead after' : 'Renter is ahead after'} {inputs.comparisonYears} years
            </div>
            <div className="savings-amount" style={{ color: buyerWins ? 'var(--accent)' : 'var(--red)' }}>
              {fmt(Math.abs(result.wealthGap))}
            </div>
            <div className="savings-sub">
              {buyerWins ? 'buyer equity exceeds renter wealth' : 'renter wealth exceeds buyer equity'}
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Break-even year</div>
                <div className="savings-stat-value">{result.breakEvenYear ? `Year ${result.breakEvenYear}` : 'Beyond horizon'}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Stamp duty</div>
                <div className="savings-stat-value">{fmt(result.stampDuty)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Projected value</div>
                <div className="savings-stat-value">{fmtShort(result.projectedPropertyValue)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Monthly mortgage</div>
              <div className="stat-card-value">{fmt(result.monthlyMortgage)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total interest paid</div>
              <div className="stat-card-value">{fmt(result.cumulativeInterest)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total rent paid</div>
              <div className="stat-card-value">{fmt(result.cumulativeRent)}</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Buyer equity vs. renter wealth over {inputs.comparisonYears} years</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Year ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {result.breakEvenYear && <ReferenceLine x={result.breakEvenYear} stroke={chartTick} strokeDasharray="4 4" label={{ value: 'Break-even', position: 'insideTopRight', fontSize: 9, fill: chartTick }} />}
                <Line type="monotone" dataKey="Buyer equity" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Renter wealth" stroke={theme === 'dark' ? '#5BA4E8' : '#378ADD'} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Stamp duty rates are approximate 2026–27 estimates. Renter's investment return is post-tax estimated. Does not include land tax, building insurance, or CGT on sale. For personal decisions, consult a licensed financial adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
