import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { calcRetirement, explainRetirement } from './lib/retirement.js';
import Workings from './Workings.jsx';
import { fmt, fmtShort, fmtPct } from './lib/format.js';
import { num, bool, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const DEFAULTS = {
  currentAge: 35,
  retirementAge: 65,
  currentBalance: 80000,
  grossSalary: 90000,
  salaryGrowth: 3,
  sgRate: 12,
  extraContributions: 5000,
  extraIsPreTax: true,
  indexExtraContributions: true,
  priorUnusedCap: 0,
  useCarryForward: false,
  division293FromSuper: false,
  investmentReturn: 7,
  inflationRate: 2.5,
  feePercent: 0.5,
  feeFlat: 100,
  insurancePremium: 0,
  drawdownMode: 'minimum',
  targetIncome: 60000,
  planToAge: 95,
  includeAgePension: true,
  relationshipStatus: 'single',
  homeowner: true,
  partnerSuperBalance: 0,
  otherFinancialAssets: 0,
  otherNonFinancialAssets: 0,
  otherIncomeAnnual: 0,
  // Display only. The projection returns both bases; real leads.
  basis: 'real',
};

const MODES = { m: 'minimum', t: 'target' };
const MODE_CODES = { minimum: 'm', target: 't' };
const STATUSES = { s: 'single', c: 'couple' };
const STATUS_CODES = { single: 's', couple: 'c' };
const BASES = { r: 'real', n: 'nominal' };
const BASIS_CODES = { real: 'r', nominal: 'n' };

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('ca', inp.currentAge);
  p.set('ra', inp.retirementAge);
  p.set('cb', inp.currentBalance);
  p.set('gs', inp.grossSalary);
  p.set('sw', inp.salaryGrowth);
  p.set('sg', inp.sgRate);
  p.set('ec', inp.extraContributions);
  p.set('ep', inp.extraIsPreTax ? '1' : '0');
  p.set('xi', inp.indexExtraContributions ? '1' : '0');
  p.set('cf', inp.priorUnusedCap);
  p.set('uc', inp.useCarryForward ? '1' : '0');
  p.set('ds', inp.division293FromSuper ? '1' : '0');
  p.set('ir', inp.investmentReturn);
  p.set('if', inp.inflationRate);
  p.set('fp', inp.feePercent);
  p.set('ff', inp.feeFlat);
  p.set('in', inp.insurancePremium);
  p.set('dm', MODE_CODES[inp.drawdownMode] ?? 'm');
  p.set('ti', inp.targetIncome);
  p.set('pa', inp.planToAge);
  p.set('ap', inp.includeAgePension ? '1' : '0');
  p.set('rs', STATUS_CODES[inp.relationshipStatus] ?? 's');
  p.set('ho', inp.homeowner ? '1' : '0');
  p.set('ps', inp.partnerSuperBalance);
  p.set('fa', inp.otherFinancialAssets);
  p.set('na', inp.otherNonFinancialAssets);
  p.set('oi', inp.otherIncomeAnnual);
  p.set('vw', BASIS_CODES[inp.basis] ?? 'r');
  return p;
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('ca')) return {};
  return {
    currentAge:              num(p.get('ca'), DEFAULTS.currentAge),
    retirementAge:           num(p.get('ra'), DEFAULTS.retirementAge),
    currentBalance:          num(p.get('cb'), DEFAULTS.currentBalance),
    grossSalary:             num(p.get('gs'), DEFAULTS.grossSalary),
    salaryGrowth:            num(p.get('sw'), DEFAULTS.salaryGrowth),
    sgRate:                  num(p.get('sg'), DEFAULTS.sgRate),
    extraContributions:      num(p.get('ec'), DEFAULTS.extraContributions),
    extraIsPreTax:           bool(p.get('ep'), DEFAULTS.extraIsPreTax),
    indexExtraContributions: bool(p.get('xi'), DEFAULTS.indexExtraContributions),
    priorUnusedCap:          num(p.get('cf'), DEFAULTS.priorUnusedCap),
    useCarryForward:         bool(p.get('uc'), DEFAULTS.useCarryForward),
    division293FromSuper:    bool(p.get('ds'), DEFAULTS.division293FromSuper),
    investmentReturn:        num(p.get('ir'), DEFAULTS.investmentReturn),
    inflationRate:           num(p.get('if'), DEFAULTS.inflationRate),
    feePercent:              num(p.get('fp'), DEFAULTS.feePercent),
    feeFlat:                 num(p.get('ff'), DEFAULTS.feeFlat),
    insurancePremium:        num(p.get('in'), DEFAULTS.insurancePremium),
    drawdownMode:            enumOf(p.get('dm'), MODES, DEFAULTS.drawdownMode),
    targetIncome:            num(p.get('ti'), DEFAULTS.targetIncome),
    planToAge:               num(p.get('pa'), DEFAULTS.planToAge),
    includeAgePension:       bool(p.get('ap'), DEFAULTS.includeAgePension),
    relationshipStatus:      enumOf(p.get('rs'), STATUSES, DEFAULTS.relationshipStatus),
    homeowner:               bool(p.get('ho'), DEFAULTS.homeowner),
    partnerSuperBalance:     num(p.get('ps'), DEFAULTS.partnerSuperBalance),
    otherFinancialAssets:    num(p.get('fa'), DEFAULTS.otherFinancialAssets),
    otherNonFinancialAssets: num(p.get('na'), DEFAULTS.otherNonFinancialAssets),
    otherIncomeAnnual:       num(p.get('oi'), DEFAULTS.otherIncomeAnnual),
    basis:                   enumOf(p.get('vw'), BASES, DEFAULTS.basis),
  };
}

export default function RetirementInstance({
  instanceKey = '', label, onRemove, theme = 'light', isComparison = false,
  seed = null, onStateChange = null,
}) {
  const [inputs, setInputs] = useState(() => {
    if (seed) return { ...seed };
    return instanceKey === ''
      ? { ...DEFAULTS, ...decodeParams(window.location.search) }
      : { ...DEFAULTS };
  });

  const set = (key, val) => setInputs((s) => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(encodeInputs(inputs));
  }, [inputs, instanceKey]);

  useEffect(() => { onStateChange?.(inputs); }, [inputs, onStateChange]);

  const result = useMemo(() => calcRetirement(inputs), [inputs]);
  const explanation = useMemo(() => explainRetirement(result, inputs), [result, inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGhost   = theme === 'dark' ? 'rgba(240,239,233,0.18)' : 'rgba(13,13,16,0.18)';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // ── Real vs nominal. The projection returns both; this only picks. ──
  const real = inputs.basis === 'real';
  const headline   = real ? result.realBalance : result.projectedBalance;
  const secondary  = real ? result.projectedBalance : result.realBalance;
  const noExtra    = real ? result.realBalanceNoExtra : result.projectedBalanceNoExtra;
  const boost      = real ? result.realExtraSuperBoost : result.extraSuperBoost;
  const chartData  = real ? result.chartDataReal : result.chartDataNominal;
  const asfaComfortable = real ? result.asfa.comfortableLumpSum : result.asfa.comfortableLumpSumNominal;
  const asfaModest      = real ? result.asfa.modestLumpSum : result.asfa.modestLumpSumNominal;

  const pension = result.agePension;
  const pensionLabel = !result.includeAgePension ? 'Not included'
    : pension?.estimateUnavailable ? 'Unavailable'
    : pension?.full ? 'Full'
    : pension?.nil ? 'Nil'
    : 'Part';

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
          <h1>Retirement Calculator<br /><span className="calc-heading-sub">Super Projection and Drawdown to {result.planToAge}</span></h1>
          <p>Project your super to retirement with salary growth, then draw it down year by year at the legislated minimum alongside an Age Pension estimate that runs both means tests. Based on 2026–27 super and Age Pension rules.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Retirement</h2>
        </div>
      )}

      <div className="calc-body">
        <div className="panel">
          <div className="panel-section">
            <div className="section-title">Your details</div>
            <div className="field">
              <label>Current age</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.currentAge || ''} onChange={setNum('currentAge')} min="18" max="80" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
            <div className="field">
              <label>Retirement age</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.retirementAge || ''} onChange={setNum('retirementAge')} min="60" max="80" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Preservation age is {result.preservationAge} — super cannot be drawn before then, so a lower retirement age
                is modelled as a gap with no salary and no access.
              </p>
            </div>
            <div className="field">
              <label>Current super balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.currentBalance || ''} onChange={setNum('currentBalance')} min="0" step="5000" />
              </div>
            </div>
            <div className="field">
              <label>Annual gross salary</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.grossSalary || ''} onChange={setNum('grossSalary')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Salary growth</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.salaryGrowth ?? ''} onChange={setNum('salaryGrowth')} min="0" max="10" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                SG is a percentage of salary, so a flat salary understates every contribution after the first.
                At {fmtPct(inputs.salaryGrowth / 100)} your salary reaches {fmt(result.finalSalary)} by {result.retirementAge}.
              </p>
            </div>
            <div className="field">
              <label>Employer SG rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.sgRate || ''} onChange={setNum('sgRate')} min="0" max="30" step="0.5" />
                <span className="input-suffix">%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Extra contributions</div>
            <div className="field">
              <label>Additional personal contributions (per year)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.extraContributions || ''} onChange={setNum('extraContributions')} min="0" step="500" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                SG of {fmt(result.sgContributionYearOne)} leaves {fmt(result.contributionCap.headroom)} under your {fmt(result.contributionCap.effectiveCap)} concessional cap.
              </p>
            </div>
            <div className="field">
              <label>Contribution type</label>
              <div className="segmented">
                <button className={inputs.extraIsPreTax ? 'active' : ''} onClick={() => set('extraIsPreTax', true)}>Pre-tax (concessional)</button>
                <button className={!inputs.extraIsPreTax ? 'active' : ''} onClick={() => set('extraIsPreTax', false)}>After-tax</button>
              </div>
            </div>
            <div className="field">
              <label>Grow contributions with salary</label>
              <div className="segmented">
                <button className={inputs.indexExtraContributions ? 'active' : ''} onClick={() => set('indexExtraContributions', true)}>Yes</button>
                <button className={!inputs.indexExtraContributions ? 'active' : ''} onClick={() => set('indexExtraContributions', false)}>Hold flat</button>
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
                {result.contributionCap.carryForward.eligible
                  ? `Available: ${fmt(result.contributionCap.carryForward.available)}. Unused cap expires after ${result.contributionCap.carryForward.lookbackYears} years.`
                  : `Not available — carry-forward needs a total super balance under ${fmt(result.contributionCap.carryForward.balanceTest)} at 30 June of the prior year.`}
              </p>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>

          <div className="panel-section">
            <div className="section-title">Retirement income</div>
            <div className="field">
              <label>Drawdown</label>
              <div className="segmented">
                <button className={inputs.drawdownMode === 'minimum' ? 'active' : ''} onClick={() => set('drawdownMode', 'minimum')}>Legislated minimum</button>
                <button className={inputs.drawdownMode === 'target' ? 'active' : ''} onClick={() => set('drawdownMode', 'target')}>Target income</button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                The minimum is legislated and rises with age — {fmtPct(0.04, 0)} under 65, {fmtPct(0.05, 0)} at 65–74, {fmtPct(0.07, 0)} at 80–84, {fmtPct(0.14, 0)} at 95+.
                Drawing only the minimum never empties the account; it just shrinks the income.
              </p>
            </div>
            {inputs.drawdownMode === 'target' && (
              <div className="field">
                <label>Target retirement income (today&rsquo;s dollars, including Age Pension)</label>
                <div className="input-wrap has-prefix">
                  <span className="input-prefix">$</span>
                  <input type="number" value={inputs.targetIncome || ''} onChange={setNum('targetIncome')} min="0" step="1000" />
                </div>
              </div>
            )}
            <div className="field">
              <label>Plan to age</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.planToAge || ''} onChange={setNum('planToAge')} min="70" max="105" step="1" />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">Age Pension</div>
            <div className="field">
              <label>Include an Age Pension estimate</label>
              <div className="segmented">
                <button className={inputs.includeAgePension ? 'active' : ''} onClick={() => set('includeAgePension', true)}>Yes</button>
                <button className={!inputs.includeAgePension ? 'active' : ''} onClick={() => set('includeAgePension', false)}>No</button>
              </div>
            </div>
            {inputs.includeAgePension && (
              <>
                <div className="field">
                  <label>Relationship status</label>
                  <div className="segmented">
                    <button className={inputs.relationshipStatus === 'single' ? 'active' : ''} onClick={() => set('relationshipStatus', 'single')}>Single</button>
                    <button className={inputs.relationshipStatus === 'couple' ? 'active' : ''} onClick={() => set('relationshipStatus', 'couple')}>Couple</button>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Couples are assessed on combined income and combined assets, against much higher thresholds. Figures shown are the combined rate.
                  </p>
                </div>
                <div className="field">
                  <label>Homeowner</label>
                  <div className="segmented">
                    <button className={inputs.homeowner ? 'active' : ''} onClick={() => set('homeowner', true)}>Yes</button>
                    <button className={!inputs.homeowner ? 'active' : ''} onClick={() => set('homeowner', false)}>No</button>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    The family home is exempt, but non-homeowners get a much higher assets free area.
                  </p>
                </div>
                {inputs.relationshipStatus === 'couple' && (
                  <div className="field">
                    <label>Partner&rsquo;s super balance</label>
                    <div className="input-wrap has-prefix">
                      <span className="input-prefix">$</span>
                      <input type="number" value={inputs.partnerSuperBalance || ''} onChange={setNum('partnerSuperBalance')} min="0" step="5000" />
                    </div>
                  </div>
                )}
                <div className="field">
                  <label>Other financial assets (bank, shares — deemed)</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" value={inputs.otherFinancialAssets || ''} onChange={setNum('otherFinancialAssets')} min="0" step="5000" />
                  </div>
                </div>
                <div className="field">
                  <label>Other assessable assets (car, contents, investment property)</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" value={inputs.otherNonFinancialAssets || ''} onChange={setNum('otherNonFinancialAssets')} min="0" step="5000" />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Exclude the family home. These count in the assets test but are not deemed.
                  </p>
                </div>
                <div className="field">
                  <label>Other assessable income (per year)</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" value={inputs.otherIncomeAnnual || ''} onChange={setNum('otherIncomeAnnual')} min="0" step="1000" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">Assumptions &amp; fees</div>
            <div className="field">
              <label>Expected investment return (before fees)</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.investmentReturn || ''} onChange={setNum('investmentReturn')} min="0" max="20" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Inflation rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.inflationRate ?? ''} onChange={setNum('inflationRate')} min="0" max="10" step="0.5" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Percentage fee</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.feePercent ?? ''} onChange={setNum('feePercent')} min="0" max="5" step="0.1" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Flat administration fee</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.feeFlat ?? ''} onChange={setNum('feeFlat')} min="0" step="10" />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Most funds charge a flat dollar admin fee as well as a percentage. A percentage-only model understates the drag on smaller balances.
              </p>
            </div>
            <div className="field">
              <label>Insurance premiums inside super (per year)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.insurancePremium ?? ''} onChange={setNum('insurancePremium')} min="0" step="50" />
              </div>
            </div>
            {result.division293Applies && (
              <div className="field">
                <label>Division 293 paid from</label>
                <div className="segmented">
                  <button className={!inputs.division293FromSuper ? 'active' : ''} onClick={() => set('division293FromSuper', false)}>Personally</button>
                  <button className={inputs.division293FromSuper ? 'active' : ''} onClick={() => set('division293FromSuper', true)}>Released from super</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="results-panel">
          {result.preservationWarning && (
            <div className="rate-callout">
              <strong>Retiring before preservation age</strong>
              {result.preservationWarning}
            </div>
          )}
          {result.contributionCap.exceeded && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Concessional cap exceeded by {fmt(result.contributionCap.excess)}</strong>
              SG of {fmt(result.sgContributionYearOne)} plus your extra contributions come to {fmt(result.contributionCap.totalConcessional)},
              over the {fmt(result.contributionCap.effectiveCap)} cap. The excess is added back to your assessable income and taxed at your
              marginal rate with a 15% offset, plus an excess concessional contributions charge that is not modelled here.
            </div>
          )}
          {result.contributionCap.nonConcessionalExceeded && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Non-concessional cap exceeded by {fmt(result.contributionCap.nonConcessionalExcess)}</strong>
              After-tax contributions of {fmt(inputs.extraContributions)} exceed the {fmt(result.contributionCap.nonConcessionalCap)} annual cap.
              The bring-forward rule may let you use up to three years&rsquo; worth at once — it is not modelled here.
            </div>
          )}
          {result.contributionCap.firstBreachAge != null && !result.contributionCap.exceeded && (
            <div className="rate-callout">
              <strong>Contributions pass the cap at age {result.contributionCap.firstBreachAge}</strong>
              Salary growth pushes SG plus your extra contributions over the concessional cap partway through the projection.
              The cap is indexed here in {fmt(result.contributionCap.capIndexationIncrement)} increments at your salary growth rate, which is an assumption.
            </div>
          )}
          {result.division293Applies && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Division 293 applies — {fmt(result.division293)} this year</strong>
              Your income plus concessional contributions exceed {fmt(result.division293Threshold)}, so an extra 15% applies to the
              contributions. Over the projection that is {fmt(result.division293Total)},
              {result.division293FromSuper ? ' released from super and deducted from the balance below.' : ' paid personally and not deducted from the balance below.'}
            </div>
          )}
          {result.division296Flag.triggered && (
            <div className="rate-callout">
              <strong>Projected balance crosses {fmt(result.division296Flag.threshold)}{result.division296Flag.ageAtCrossing ? ` at age ${result.division296Flag.ageAtCrossing}` : ''}</strong>
              {result.division296Flag.note} The {fmt(result.division296Flag.threshold)} threshold is indexed in {fmt(result.division296Flag.indexationIncrement)} increments —
              on this projection&rsquo;s inflation it would be around {fmt(result.division296Flag.thresholdIndexed)} by retirement, so a nominal comparison overstates the chance of crossing it.
            </div>
          )}
          {result.runsOut && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>Super runs out at age {result.depletionAge}</strong>
              At this drawdown the balance is exhausted {result.depletionAge - result.accessAge} years into retirement.
              {result.includeAgePension ? ' The Age Pension continues after that, subject to the means tests.' : ''}
            </div>
          )}

          <div className="savings-card">
            <div className="savings-label">Projected balance at age {result.accessAge}</div>
            <div className="savings-amount">{fmtShort(headline)}</div>
            <div className="savings-sub">
              {real
                ? <>in today&rsquo;s dollars · {fmt(secondary)} nominal at {fmtPct(inputs.inflationRate / 100)} inflation</>
                : <>nominal · {fmt(secondary)} in today&rsquo;s dollars at {fmtPct(inputs.inflationRate / 100)} inflation</>}
            </div>
            <div className="field" style={{ margin: '10px 0 0' }}>
              <div className="segmented">
                <button className={real ? 'active' : ''} onClick={() => set('basis', 'real')}>Today&rsquo;s dollars</button>
                <button className={!real ? 'active' : ''} onClick={() => set('basis', 'nominal')}>Nominal</button>
              </div>
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Extra contributions boost</div>
                <div className="savings-stat-value">{fmtShort(boost)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Without extra contribs</div>
                <div className="savings-stat-value">{fmtShort(noExtra)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Years to access</div>
                <div className="savings-stat-value">{result.yearsToAccess} yrs</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">First-year income {real ? "(today's $)" : '(nominal)'}</div>
              <div className="stat-card-value">{fmt(real ? result.firstYearIncomeReal : result.firstYearIncome)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Age Pension at {result.accessAge < result.pensionAge ? result.pensionAge : result.accessAge}</div>
              <div className="stat-card-value">{pensionLabel}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Money lasts to</div>
              <div className="stat-card-value" style={result.runsOut ? { color: 'var(--red)' } : undefined}>
                {result.runsOut ? `age ${result.depletionAge}` : `age ${result.planToAge}+`}
              </div>
            </div>
          </div>

          {result.includeAgePension && pension && !pension.estimateUnavailable && (
            <div className="rate-callout">
              <strong>
                Age Pension {fmt(pension.fortnightly)} per fortnight ({fmt(pension.annual)}/yr){pension.status === 'couple' ? ' combined' : ''}
                {pension.bindingTest === 'income' || pension.bindingTest === 'assets' ? ` — the ${pension.bindingTest} test binds` : ''}
              </strong>
              Both tests are calculated and the lower is paid. Income test: {fmt(pension.incomeTest.assessableIncome)}/ft assessable
              ({fmt(pension.deemed.perFortnight)}/ft of it deemed) against a {fmt(pension.incomeTest.freeArea)} free area
              → {fmt(pension.incomeTest.result)}/ft. Assets test: {fmt(pension.assetsTest.assets)} against a {fmt(pension.assetsTest.freeArea)} free
              area at {fmt(pension.assetsTest.taperPerThousand)}/ft per $1,000 → {fmt(pension.assetsTest.result)}/ft.
              Both tests are run in today&rsquo;s dollars against rates as at {pension.effectiveFrom}. The Work Bonus is not modelled.
            </div>
          )}
          {result.includeAgePension && pension?.estimateUnavailable && (
            <div className="rate-callout">
              <strong>Age Pension estimate unavailable</strong>
              {pension.reason}
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">
              Super balance by age — accumulation then drawdown ({real ? "today's dollars" : 'nominal'})
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="age" tickFormatter={(v) => `${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10, fill: chartTick }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Age ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {result.milestones.map((m) => (
                  <ReferenceLine key={m.age} x={m.age} stroke={chartTick} strokeDasharray="3 3"
                    label={{ value: m.label, position: 'insideTop', fontSize: 9, fill: chartTick }} />
                ))}
                <ReferenceLine y={asfaComfortable} stroke={chartGhost} strokeDasharray="6 4"
                  label={{ value: `ASFA comfortable ${fmtShort(asfaComfortable)}`, position: 'insideTopRight', fontSize: 9, fill: chartTick }} />
                <ReferenceLine y={asfaModest} stroke={chartGhost} strokeDasharray="2 4"
                  label={{ value: `ASFA modest ${fmtShort(asfaModest)}`, position: 'insideBottomRight', fontSize: 9, fill: chartTick }} />
                <Line type="monotone" dataKey="Balance" stroke={chartAccent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without extra" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              Reference lines are the ASFA Retirement Standard lump sums for a {result.asfa.status} — {fmt(result.asfa.comfortableLumpSum)} comfortable
              and {fmt(result.asfa.modestLumpSum)} modest, in today&rsquo;s dollars, assuming you own your home outright and draw a part Age Pension.
              Indicative ASFA figures, not part of the 2026–27 rates set. On this projection you are
              {result.asfa.meetsComfortable ? ' above' : result.asfa.meetsModest ? ' between modest and comfortable, at' : ' below'} {fmt(result.realBalance)} in today&rsquo;s dollars.
              &ldquo;Without extra&rdquo; draws its own legislated minimum in retirement so the two lines stay comparable.
            </p>
          </div>

          {result.incomeData.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Retirement income by age — super drawdown and Age Pension (nominal)</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={result.incomeData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="age" tickFormatter={(v) => `${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10, fill: chartTick }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={58} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Age ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Super drawdown" stroke={chartAccent} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Age Pension" stroke={chartGhost} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
                Drawdown at the legislated minimum falls as the balance falls, even though the percentage rises with age.
                The Age Pension moves the other way — as assets are spent down, the means tests bite less.
              </p>
            </div>
          )}

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Based on 2026–27 super rules: {fmtPct(result.rates.superannuation.sgRate)} SG,
            15% contributions tax, a {fmt(result.contributionCap.concessionalCap)} concessional cap, Division 293 above {fmt(result.division293Threshold)},
            and a {fmt(result.transferBalanceCap)} transfer balance cap above which retirement-phase earnings stay taxable.
            Compulsory SG is capped at the annual maximum contribution base. Under Payday Super, SG is paid each payday on qualifying
            earnings rather than quarterly on ordinary time earnings; annual salary × SG% is used here, which is right in aggregate but
            not for timing. Drawdown uses the legislated minimum factors, which are indicative — the SIS Regulations govern pro-rating
            and rounding. Age Pension figures are as at {result.agePensionEffectiveFrom} and calculate both the income and
            assets tests, paying the lower — assessed against the rates in force when the pension starts, not today. Deeming applies to
            financial assets, the family home is exempt, and the Work Bonus is not
            modelled. The means tests are applied in today&rsquo;s dollars and the entitlement converted back, on the assumption that
            free areas, thresholds and cut-offs keep indexing — testing a nominal future balance against today&rsquo;s thresholds would
            show almost everybody as ineligible. Division 296 is flagged, not modelled —
            it is levied on realised earnings, which a projection like this cannot know. ASFA Retirement Standard figures are indicative
            and are not part of the 2026–27 rates set. For personal financial decisions, consult a licensed adviser.
          </div>
        </div>
      </div>
    </div>
  );
}
