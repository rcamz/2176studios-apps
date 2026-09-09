import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcBorrowingPower } from './lib/borrowingpower.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : `$${Math.round(n/1000)}k`;

const DEFAULTS = {
  grossIncome1: 90000,
  grossIncome2: 0,
  applicantType: 'single',
  employmentType: 'payg',
  otherIncome: 0,
  monthlyExpenses: 3000,
  creditCardLimits: 10000,
  personalLoanMonthly: 0,
  carLoanMonthly: 0,
  dependants: 0,
  interestRate: 6.0,
  termYears: 30,
  repaymentType: 'pi',
  hecsBalance1: 0,
  hecsBalance2: 0,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('gi1', inp.grossIncome1);
  p.set('gi2', inp.grossIncome2);
  p.set('at', inp.applicantType[0]);
  p.set('et', inp.employmentType[0]);
  p.set('oi', inp.otherIncome);
  p.set('me', inp.monthlyExpenses);
  p.set('cc', inp.creditCardLimits);
  p.set('pl', inp.personalLoanMonthly);
  p.set('cl', inp.carLoanMonthly);
  p.set('dp', inp.dependants);
  p.set('ir', inp.interestRate);
  p.set('ty', inp.termYears);
  p.set('hb1', inp.hecsBalance1);
  p.set('hb2', inp.hecsBalance2);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('gi1')) return {};
  return {
    grossIncome1:       parseFloat(p.get('gi1')) || 90000,
    grossIncome2:       parseFloat(p.get('gi2')) || 0,
    applicantType:      p.get('at') === 'j' ? 'joint' : 'single',
    employmentType:     p.get('et') === 's' ? 'self-employed' : p.get('et') === 'c' ? 'casual' : 'payg',
    otherIncome:        parseFloat(p.get('oi')) || 0,
    monthlyExpenses:    parseFloat(p.get('me')) || 3000,
    creditCardLimits:   parseFloat(p.get('cc')) || 0,
    personalLoanMonthly: parseFloat(p.get('pl')) || 0,
    carLoanMonthly:     parseFloat(p.get('cl')) || 0,
    dependants:         parseFloat(p.get('dp')) || 0,
    interestRate:       parseFloat(p.get('ir')) || 6.0,
    termYears:          parseFloat(p.get('ty')) || 30,
    hecsBalance1:       parseFloat(p.get('hb1')) || 0,
    hecsBalance2:       parseFloat(p.get('hb2')) || 0,
  };
}

export default function BorrowingPowerInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcBorrowingPower(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const sensitivityColors = result.sensitivity.map((s) =>
    s.rateDelta < 0 ? chartAccent : s.rateDelta > 0 ? (theme === 'dark' ? '#E87070' : '#D85A30') : (theme === 'dark' ? '#9E98E8' : '#7F77DD')
  );

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
          <h1>Borrowing Power Calculator<br /><span className="calc-heading-sub">Income, Debts &amp; HECS Impact</span></h1>
          <p>Estimate your maximum borrowing capacity using APRA's 3% serviceability buffer. Factors in income, expenses, debts and HECS.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Borrowing Power</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Applicants</div>
            <div className="field">
              <label>Applicant type</label>
              <div className="segmented">
                <button className={inputs.applicantType === 'single' ? 'active' : ''} onClick={() => set('applicantType', 'single')}>Single</button>
                <button className={inputs.applicantType === 'joint' ? 'active' : ''} onClick={() => set('applicantType', 'joint')}>Joint</button>
              </div>
            </div>
            <div className="field">
              <label>Gross annual income {inputs.applicantType === 'joint' ? '— Applicant 1' : ''}</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossIncome1 || ''} onChange={setNum('grossIncome1')} min="0" step="1000" />
              </div>
            </div>
            {inputs.applicantType === 'joint' && (
              <div className="field">
                <label>Gross annual income — Applicant 2</label>
                <div className="input-wrap has-prefix">
                  <span className="input-prefix">$</span>
                  <input type="number" value={inputs.grossIncome2 || ''} onChange={setNum('grossIncome2')} min="0" step="1000" />
                </div>
              </div>
            )}
            <div className="field">
              <label>Employment type</label>
              <div className="segmented">
                {[['payg','PAYG'],['self-employed','Self-employed'],['casual','Casual']].map(([v,l]) => (
                  <button key={v} className={inputs.employmentType === v ? 'active' : ''} onClick={() => set('employmentType', v)}>{l}</button>
                ))}
              </div>
            </div>
            {inputs.employmentType === 'self-employed' && (
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>Self-employed income shaded at 80% per lender policy</p>
            )}
            <div className="field">
              <label>Other income (rental, dividends, etc.)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.otherIncome || ''} onChange={setNum('otherIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Dependants</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.dependants || ''} onChange={setNum('dependants')} min="0" max="10" step="1" />
                <span className="input-suffix">children</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Existing debts</div>
            <div className="field">
              <label>Credit card limits (total)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.creditCardLimits || ''} onChange={setNum('creditCardLimits')} min="0" step="1000" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Lenders use 3% of limit as monthly commitment</p>
            </div>
            <div className="field">
              <label>Personal loan (monthly repayment)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.personalLoanMonthly || ''} onChange={setNum('personalLoanMonthly')} min="0" step="50" />
              </div>
            </div>
            <div className="field">
              <label>Car loan (monthly repayment)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.carLoanMonthly || ''} onChange={setNum('carLoanMonthly')} min="0" step="50" />
              </div>
            </div>
            <div className="field">
              <label>HECS/HELP balance (Applicant 1)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.hecsBalance1 || ''} onChange={setNum('hecsBalance1')} min="0" step="1000" />
              </div>
            </div>
            {inputs.applicantType === 'joint' && (
              <div className="field">
                <label>HECS/HELP balance (Applicant 2)</label>
                <div className="input-wrap has-prefix">
                  <span className="input-prefix">$</span>
                  <input type="number" value={inputs.hecsBalance2 || ''} onChange={setNum('hecsBalance2')} min="0" step="1000" />
                </div>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">Loan &amp; expenses</div>
            <div className="field">
              <label>Interest rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.interestRate || ''} onChange={setNum('interestRate')} min="0" max="20" step="0.1" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Loan term</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.termYears || ''} onChange={setNum('termYears')} min="5" max="30" step="5" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Monthly living expenses</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.monthlyExpenses || ''} onChange={setNum('monthlyExpenses')} min="0" step="100" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>HEM floor: {fmt(result.hem)}/mo — lenders use the higher of your expenses or HEM</p>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">Estimated borrowing power</div>
            <div className="savings-amount">{fmtShort(result.maxBorrowing)}</div>
            <div className="savings-sub">assessed at {result.bufferedRate.toFixed(1)}% (your rate + 3% APRA buffer)</div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Monthly surplus</div>
                <div className="savings-stat-value">{fmt(Math.max(0, result.monthlySurplus))}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Monthly repayment</div>
                <div className="savings-stat-value">{fmt(result.monthlyRepayment)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Net income/mo</div>
                <div className="savings-stat-value">{fmt(result.netMonthlyIncome)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Living expenses (effective)</div>
              <div className="stat-card-value">{fmt(result.effectiveExpenses)}/mo</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Debt commitments</div>
              <div className="stat-card-value">{fmt(result.existingDebts)}/mo</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">HECS repayment</div>
              <div className="stat-card-value">{fmt(result.hecsMonthly)}/mo</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Borrowing power sensitivity to rate changes</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={result.sensitivity} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="rateDelta" tickFormatter={(v) => v === 0 ? 'Current' : `${v > 0 ? '+' : ''}${v}%`} tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmtShort(v)} labelFormatter={(l) => l === 0 ? 'Current rate' : `Rate ${l > 0 ? '+' : ''}${l}%`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Bar dataKey="borrowing" radius={[3, 3, 0, 0]}>
                  {result.sensitivity.map((_, i) => <Cell key={i} fill={sensitivityColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on APRA 3% serviceability buffer and simplified HEM floor. Actual borrowing capacity depends on individual lender policy, credit history, and full assessment. For personal financial decisions, consult a licensed mortgage broker.
          </div>
        </div>
      </div>
    </div>
  );
}
