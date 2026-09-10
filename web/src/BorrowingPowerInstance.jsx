import { useState, useMemo, useEffect, useId } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcBorrowingPower, explainBorrowingPower } from './lib/borrowingpower.js';
import Workings from './Workings.jsx';
import { LMI_DISCLOSURE } from './lib/lmi.js';
import { fmt, fmtShort } from './lib/format.js';
import { num, bool, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const EMPLOYMENT = {
  payg: 'PAYG',
  contract: 'Contract',
  casual: 'Casual',
  'self-employed': 'Self-employed',
};

const DEFAULTS = {
  grossIncome1: 120000,
  grossIncome2: 0,
  applicantType: 'single',
  employmentType1: 'payg',
  employmentType2: 'payg',
  rentalIncome: 0,
  otherIncome: 0,
  monthlyExpenses: 3000,
  dependants: 0,
  creditCardLimits: 10000,
  personalLoanMonthly: 0,
  carLoanMonthly: 0,
  otherDebtBalance: 0,
  helpBalance1: 0,
  helpBalance2: 0,
  interestRate: 6.0,
  termYears: 30,
  repaymentType: 'pi',
  interestOnlyYears: 5,
  deposit: 120000,
  firstHomeGuarantee: false,
};

function encodeInputs(i) {
  const p = new URLSearchParams();
  p.set('gi1', i.grossIncome1);  p.set('gi2', i.grossIncome2);
  p.set('at', i.applicantType[0]);
  p.set('e1', i.employmentType1); p.set('e2', i.employmentType2);
  p.set('rn', i.rentalIncome);   p.set('oi', i.otherIncome);
  p.set('me', i.monthlyExpenses); p.set('dp', i.dependants);
  p.set('cc', i.creditCardLimits);
  p.set('pl', i.personalLoanMonthly); p.set('cl', i.carLoanMonthly);
  p.set('od', i.otherDebtBalance);
  p.set('h1', i.helpBalance1);   p.set('h2', i.helpBalance2);
  p.set('ir', i.interestRate);   p.set('ty', i.termYears);
  p.set('rt', i.repaymentType);  p.set('io', i.interestOnlyYears);
  p.set('dep', i.deposit);       p.set('fg', i.firstHomeGuarantee ? '1' : '0');
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('gi1')) return {};
  const empMap = Object.fromEntries(Object.keys(EMPLOYMENT).map(k => [k, k]));
  return {
    grossIncome1:        num(p.get('gi1'), DEFAULTS.grossIncome1),
    grossIncome2:        num(p.get('gi2'), 0),
    applicantType:       p.get('at') === 'j' ? 'joint' : 'single',
    employmentType1:     enumOf(p.get('e1'), empMap, 'payg'),
    employmentType2:     enumOf(p.get('e2'), empMap, 'payg'),
    rentalIncome:        num(p.get('rn'), 0),
    otherIncome:         num(p.get('oi'), 0),
    monthlyExpenses:     num(p.get('me'), DEFAULTS.monthlyExpenses),
    dependants:          num(p.get('dp'), 0),
    creditCardLimits:    num(p.get('cc'), DEFAULTS.creditCardLimits),
    personalLoanMonthly: num(p.get('pl'), 0),
    carLoanMonthly:      num(p.get('cl'), 0),
    otherDebtBalance:    num(p.get('od'), 0),
    helpBalance1:        num(p.get('h1'), 0),
    helpBalance2:        num(p.get('h2'), 0),
    interestRate:        num(p.get('ir'), DEFAULTS.interestRate),
    termYears:           num(p.get('ty'), DEFAULTS.termYears),
    repaymentType:       p.get('rt') === 'io' ? 'io' : 'pi',
    interestOnlyYears:   num(p.get('io'), DEFAULTS.interestOnlyYears),
    deposit:             num(p.get('dep'), DEFAULTS.deposit),
    firstHomeGuarantee:  bool(p.get('fg'), false),
  };
}

export default function BorrowingPowerInstance({
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

  const result = useMemo(() => calcBorrowingPower(inputs), [inputs]);
  const explanation = useMemo(() => explainBorrowingPower(result, inputs), [result, inputs]);

  const chartAccent = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartRed    = theme === 'dark' ? '#E87070' : '#D85A30';
  const chartBlue   = theme === 'dark' ? '#9E98E8' : '#7F77DD';
  const chartGrid   = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick   = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg   = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const isJoint = inputs.applicantType === 'joint';
  const depositBinds = result.bindingConstraint === 'deposit';

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
          <h1>Borrowing Power Calculator<br /><span className="calc-heading-sub">Serviceability, Deposit &amp; LMI</span></h1>
          <p>Estimate your maximum borrowing using APRA's 3% serviceability buffer — and how much your deposit actually lets you buy, which is often the real limit.</p>
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
              <label id={`${uid}-applicant-label`}>Applicant type</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-applicant-label`}>
                <button role="radio" aria-checked={!isJoint} className={!isJoint ? 'active' : ''} onClick={() => set('applicantType', 'single')}>Single</button>
                <button role="radio" aria-checked={isJoint} className={isJoint ? 'active' : ''} onClick={() => set('applicantType', 'joint')}>Joint</button>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-income1`}>Gross annual income{isJoint ? ' — Applicant 1' : ''}</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-income1`} type="number" inputMode="decimal" value={inputs.grossIncome1 || ''} onChange={setNum('grossIncome1')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-emp1`}>Employment type{isJoint ? ' — Applicant 1' : ''}</label>
              <select id={`${uid}-emp1`} className="field-select" aria-describedby={inputs.employmentType1 !== 'payg' ? `${uid}-emp1-help` : undefined} value={inputs.employmentType1} onChange={e => set('employmentType1', e.target.value)}>
                {Object.entries(EMPLOYMENT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {inputs.employmentType1 !== 'payg' && (
                <div id={`${uid}-emp1-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Lenders shade this income before assessing it.
                </div>
              )}
            </div>
            {isJoint && (
              <>
                <div className="field">
                  <label htmlFor={`${uid}-income2`}>Gross annual income — Applicant 2</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input id={`${uid}-income2`} type="number" inputMode="decimal" value={inputs.grossIncome2 || ''} onChange={setNum('grossIncome2')} min="0" step="1000" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-emp2`}>Employment type — Applicant 2</label>
                  <select id={`${uid}-emp2`} className="field-select" value={inputs.employmentType2} onChange={e => set('employmentType2', e.target.value)}>
                    {Object.entries(EMPLOYMENT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor={`${uid}-rental`}>Rental income (annual)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-rental`} type="number" inputMode="decimal" aria-describedby={`${uid}-rental-help`} value={inputs.rentalIncome || ''} onChange={setNum('rentalIncome')} min="0" step="1000" />
              </div>
              <div id={`${uid}-rental-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Shaded to 80% and taxed, per APRA guidance.
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-other-income`}>Other taxable income (annual)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-other-income`} type="number" inputMode="decimal" value={inputs.otherIncome || ''} onChange={setNum('otherIncome')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-dependants`}>Dependants</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-dependants`} type="number" inputMode="numeric" value={inputs.dependants || ''} onChange={setNum('dependants')} min="0" max="10" step="1" />
                <span className="input-suffix">children</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Deposit</div>
            <div className="field">
              <label htmlFor={`${uid}-deposit`}>Deposit saved</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-deposit`} type="number" inputMode="decimal" value={inputs.deposit || ''} onChange={setNum('deposit')} min="0" step="10000" />
              </div>
            </div>
            <div className="field">
              <label id={`${uid}-fhg-label`}>Using the First Home Guarantee?</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-fhg-label`}>
                <button role="radio" aria-checked={inputs.firstHomeGuarantee} className={inputs.firstHomeGuarantee ? 'active' : ''} onClick={() => set('firstHomeGuarantee', true)}>Yes</button>
                <button role="radio" aria-checked={!inputs.firstHomeGuarantee} className={!inputs.firstHomeGuarantee ? 'active' : ''} onClick={() => set('firstHomeGuarantee', false)}>No</button>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Existing debts</div>
            <div className="field">
              <label htmlFor={`${uid}-cards`}>Credit card limits (total)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-cards`} type="number" inputMode="decimal" aria-describedby={`${uid}-cards-help`} value={inputs.creditCardLimits || ''} onChange={setNum('creditCardLimits')} min="0" step="1000" />
              </div>
              <div id={`${uid}-cards-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Assessed on the full limit at 3.8% a month, whether or not you owe anything.
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-personal-loan`}>Personal loan (monthly repayment)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-personal-loan`} type="number" inputMode="decimal" value={inputs.personalLoanMonthly || ''} onChange={setNum('personalLoanMonthly')} min="0" step="50" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-car-loan`}>Car loan (monthly repayment)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-car-loan`} type="number" inputMode="decimal" value={inputs.carLoanMonthly || ''} onChange={setNum('carLoanMonthly')} min="0" step="50" />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-help1`}>HELP/HECS balance{isJoint ? ' — Applicant 1' : ''}</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-help1`} type="number" inputMode="decimal" value={inputs.helpBalance1 || ''} onChange={setNum('helpBalance1')} min="0" step="1000" />
              </div>
            </div>
            {isJoint && (
              <div className="field">
                <label htmlFor={`${uid}-help2`}>HELP/HECS balance — Applicant 2</label>
                <div className="input-wrap has-prefix">
                  <span className="input-prefix">$</span>
                  <input id={`${uid}-help2`} type="number" inputMode="decimal" value={inputs.helpBalance2 || ''} onChange={setNum('helpBalance2')} min="0" step="1000" />
                </div>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">Loan &amp; expenses</div>
            <div className="field">
              <label htmlFor={`${uid}-rate`}>Interest rate</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-rate`} type="number" inputMode="decimal" value={inputs.interestRate || ''} onChange={setNum('interestRate')} min="0" max="20" step="0.1" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-term`}>Loan term</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-term`} type="number" inputMode="numeric" value={inputs.termYears || ''} onChange={setNum('termYears')} min="5" max="40" step="5" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label id={`${uid}-repayment-label`}>Repayment type</label>
              <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-repayment-label`} aria-describedby={inputs.repaymentType === 'io' ? `${uid}-repayment-help` : undefined}>
                <button role="radio" aria-checked={inputs.repaymentType === 'pi'} className={inputs.repaymentType === 'pi' ? 'active' : ''} onClick={() => set('repaymentType', 'pi')}>Principal &amp; interest</button>
                <button role="radio" aria-checked={inputs.repaymentType === 'io'} className={inputs.repaymentType === 'io' ? 'active' : ''} onClick={() => set('repaymentType', 'io')}>Interest only</button>
              </div>
              {inputs.repaymentType === 'io' && (
                <div id={`${uid}-repayment-help`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Assessed on the higher repayment that applies once the interest-only period ends.
                </div>
              )}
            </div>
            {inputs.repaymentType === 'io' && (
              <div className="field">
                <label htmlFor={`${uid}-io-years`}>Interest-only period</label>
                <div className="input-wrap has-suffix">
                  <input id={`${uid}-io-years`} type="number" inputMode="numeric" value={inputs.interestOnlyYears || ''} onChange={setNum('interestOnlyYears')} min="1" max="10" step="1" />
                  <span className="input-suffix">yrs</span>
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor={`${uid}-expenses`}>Monthly living expenses</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input id={`${uid}-expenses`} type="number" inputMode="decimal" aria-describedby={`${uid}-expenses-help`} value={inputs.monthlyExpenses || ''} onChange={setNum('monthlyExpenses')} min="0" step="100" />
              </div>
              <div id={`${uid}-expenses-help`} style={{ fontSize: '0.72rem', color: result.benchmarkApplied ? 'var(--red)' : 'var(--text-muted)', marginTop: 4 }}>
                {result.benchmarkApplied
                  ? `Below our benchmark of ${fmt(result.expenseBenchmark)}/mo for your household — the higher figure is used.`
                  : `Above our benchmark of ${fmt(result.expenseBenchmark)}/mo, so your figure is used.`}
              </div>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">
              Estimated borrowing power{depositBinds ? ' — limited by your deposit' : ''}
            </div>
            <div className="savings-amount" aria-live="polite" aria-atomic="true">{fmtShort(result.maxBorrowing)}</div>
            <div className="savings-sub">
              {depositBinds
                ? `You could service ${fmtShort(result.maxByServiceability)}, but your deposit caps you here`
                : `assessed at ${result.bufferedRate.toFixed(1)}% — your rate plus the 3% APRA buffer`}
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Property price</div>
                <div className="savings-stat-value">{fmtShort(result.maxPropertyPrice)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Monthly surplus</div>
                <div className="savings-stat-value">{fmt(Math.max(0, result.monthlySurplus))}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Repayment</div>
                <div className="savings-stat-value">{fmt(result.monthlyRepayment)}/mo</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Net income</div>
              <div className="stat-card-value">{fmt(result.netMonthlyIncome)}/mo</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Living expenses used</div>
              <div className="stat-card-value">{fmt(result.effectiveExpenses)}/mo</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">HELP repayment</div>
              <div className="stat-card-value">{fmt(result.helpMonthly)}/mo</div>
            </div>
          </div>

          {result.maxPropertyPriceNoLmi && (
            <div className="rate-callout">
              <strong>Without LMI you could buy up to {fmt(result.maxPropertyPriceNoLmi)}</strong>
              That is the price your {fmt(inputs.deposit)} deposit reaches at 80% LVR. Going above it means paying mortgage insurance{result.lmi && result.lmi.payable ? ` — around ${fmt(result.lmi.low)} to ${fmt(result.lmi.high)} at the figure shown above` : ''}. {LMI_DISCLOSURE}
            </div>
          )}

          {result.warnings.map((w, i) => (
            <div key={i} className="rate-callout"
              style={w.level === 'warn' ? { borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' } : undefined}>
              <strong>{w.title}</strong>
              {w.body}
            </div>
          ))}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">How much rate changes move your limit</div>
            <div role="img" aria-label={`Bar chart of borrowing power against interest rate changes. At today's rate of ${inputs.interestRate}% you could borrow ${fmt(result.maxBorrowing)}; a 2% rise takes that to ${fmt(result.sensitivity[result.sensitivity.length - 1].borrowing)}.`}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={result.sensitivity} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="delta" tickFormatter={(v) => v === 0 ? 'Now' : `${v > 0 ? '+' : ''}${v}%`}
                  tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }}
                  width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmtShort(v)}
                  labelFormatter={(l) => l === 0 ? 'Current rate' : `Rate ${l > 0 ? '+' : ''}${l}%`}
                  contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Bar dataKey="borrowing" radius={[3, 3, 0, 0]}>
                  {result.sensitivity.map((s, i) => (
                    <Cell key={i} fill={s.delta < 0 ? chartAccent : s.delta > 0 ? chartRed : chartBlue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
            <table className="visually-hidden">
              <caption>Maximum borrowing at each interest rate change</caption>
              <thead>
                <tr><th scope="col">Rate change</th><th scope="col">Interest rate</th><th scope="col">Maximum borrowing</th></tr>
              </thead>
              <tbody>
                {result.sensitivity.map((s) => (
                  <tr key={s.delta}>
                    <th scope="row">{s.delta === 0 ? 'Today’s rate' : `${s.delta > 0 ? '+' : ''}${s.delta}%`}</th>
                    <td>{s.rate.toFixed(2)}%</td>
                    <td>{fmt(s.borrowing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Uses the APRA 3% serviceability buffer. The living expense figure is our own indicative benchmark: lenders use a licensed dataset that is not published, and apply the higher of it or your declared expenses. Actual capacity varies by lender by $30,000 to $80,000 for the same household, and depends on credit history and full assessment. Speak to a licensed mortgage broker.
          </div>
        </div>
      </div>
    </div>
  );
}
