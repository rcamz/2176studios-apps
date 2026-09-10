import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { calcNovatedLease } from './lib/novatedlease.js';
import { fmt, fmtShort, fmtPct } from './lib/format.js';
import { num, bool, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const isoToday = () => new Date().toISOString().slice(0, 10);

const VT_MAP = { b: 'bev', h: 'fcev', p: 'phev', i: 'ice' };
const codeFor = (map, value) =>
  Object.keys(map).find((k) => map[k] === value) ?? Object.keys(map)[0];

const VEHICLE_LABEL = {
  bev: 'Battery electric',
  fcev: 'Hydrogen fuel cell',
  phev: 'Plug-in hybrid',
  ice: 'Petrol or diesel',
};

const RFBA_LABEL = {
  medicareLevySurcharge: 'Medicare levy surcharge',
  helpRepaymentIncome: 'HELP repayment income',
  division293: 'Division 293',
  familyTaxBenefitAB: 'Family Tax Benefit A and B',
  childSupport: 'Child support',
  privateHealthInsuranceRebate: 'Private health rebate',
  superCoContribution: 'Super co-contribution',
};

const DEFAULTS = {
  vehicleType: 'bev',
  driveAwayPrice: 65000,
  onRoadCosts: 3500,
  termYears: 3,
  startDate: isoToday(),
  residualOverride: null,
  phevExemptUseBeforeCutoff: false,
  phevBindingCommitmentUnchanged: false,
  financeRate: 7.5,
  runningCosts: 5000,
  adminFee: 450,
  employerClaimsGstOnRunningCosts: true,
  useECM: true,
  grossSalary: 110000,
  sgRate: 12,
  sgOnPrePackagedSalary: false,
  helpBalance: 0,
  hasPrivateCover: false,
  workRelatedKms: 0,
  outrightFinanced: true,
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('vt', codeFor(VT_MAP, inp.vehicleType));
  p.set('dp', inp.driveAwayPrice);
  p.set('or', inp.onRoadCosts);
  p.set('ty', inp.termYears);
  p.set('sd', inp.startDate);
  p.set('fr', inp.financeRate);
  p.set('rc', inp.runningCosts);
  p.set('af', inp.adminFee);
  p.set('rg', inp.employerClaimsGstOnRunningCosts ? '1' : '0');
  p.set('ec', inp.useECM ? '1' : '0');
  p.set('gs', inp.grossSalary);
  p.set('sg', inp.sgRate);
  p.set('sb', inp.sgOnPrePackagedSalary ? '1' : '0');
  p.set('hb', inp.helpBalance);
  p.set('pv', inp.hasPrivateCover ? '1' : '0');
  p.set('wk', inp.workRelatedKms);
  p.set('of', inp.outrightFinanced ? '1' : '0');
  if (inp.vehicleType === 'phev') {
    p.set('pu', inp.phevExemptUseBeforeCutoff ? '1' : '0');
    p.set('pb', inp.phevBindingCommitmentUnchanged ? '1' : '0');
  }
  if (inp.residualOverride !== null) p.set('rv', inp.residualOverride);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('dp')) return {};
  return {
    vehicleType:   enumOf(p.get('vt'), VT_MAP, DEFAULTS.vehicleType),
    driveAwayPrice: num(p.get('dp'), DEFAULTS.driveAwayPrice),
    onRoadCosts:   num(p.get('or'), DEFAULTS.onRoadCosts),
    termYears:     num(p.get('ty'), DEFAULTS.termYears),
    startDate:     p.get('sd') || DEFAULTS.startDate,
    financeRate:   num(p.get('fr'), DEFAULTS.financeRate),
    runningCosts:  num(p.get('rc'), DEFAULTS.runningCosts),
    adminFee:      num(p.get('af'), DEFAULTS.adminFee),
    employerClaimsGstOnRunningCosts: bool(p.get('rg'), DEFAULTS.employerClaimsGstOnRunningCosts),
    useECM:        bool(p.get('ec'), DEFAULTS.useECM),
    grossSalary:   num(p.get('gs'), DEFAULTS.grossSalary),
    sgRate:        num(p.get('sg'), DEFAULTS.sgRate),
    sgOnPrePackagedSalary: bool(p.get('sb'), DEFAULTS.sgOnPrePackagedSalary),
    helpBalance:   num(p.get('hb'), DEFAULTS.helpBalance),
    hasPrivateCover: bool(p.get('pv'), DEFAULTS.hasPrivateCover),
    workRelatedKms: num(p.get('wk'), DEFAULTS.workRelatedKms),
    outrightFinanced: bool(p.get('of'), DEFAULTS.outrightFinanced),
    phevExemptUseBeforeCutoff: bool(p.get('pu'), DEFAULTS.phevExemptUseBeforeCutoff),
    phevBindingCommitmentUnchanged: bool(p.get('pb'), DEFAULTS.phevBindingCommitmentUnchanged),
    residualOverride: p.has('rv') ? num(p.get('rv'), null) : null,
  };
}

export default function NovatedLeaseInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );
  const [showResidualOverride, setShowResidualOverride] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(new URLSearchParams(encodeInputs(inputs)));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcNovatedLease(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const chartRed     = theme === 'dark' ? '#E87070' : '#D85A30';

  const isPhev = inputs.vehicleType === 'phev';
  const warnStyle = { borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' };

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
          <h1>Novated Lease Calculator<br /><span className="calc-heading-sub">FBT, GST and the Reportable Benefit Nobody Mentions</span></h1>
          <p>Model a novated lease properly: the electric vehicle FBT exemption and its 2027 phase-down, the employee contribution method, the GST your employer claims back, and the reportable fringe benefits amount that quietly raises your Medicare surcharge and HELP repayment. Plug-in hybrids lost the exemption on 1 April 2025 and are priced accordingly. Based on 2026–27 ATO rates.</p>
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
              <label>What kind of car</label>
              <div className="segmented">
                {[['bev','Electric'],['phev','Plug-in hybrid'],['ice','Petrol / diesel'],['fcev','Hydrogen']].map(([v,l]) => (
                  <button key={v} className={inputs.vehicleType === v ? 'active' : ''} onClick={() => set('vehicleType', v)}>{l}</button>
                ))}
              </div>
            </div>

            {isPhev && (
              <>
                <p className="offset-note">
                  Plug-in hybrids stopped being low-emissions vehicles for FBT on <strong>1 April 2025</strong>. A new
                  lease is taxed exactly like a petrol car. Grandfathering needs <strong>both</strong> of the following,
                  and both are strict.
                </p>
                <div className="field">
                  <label>Was the car in exempt use, or available for use, before 1 April 2025?</label>
                  <div className="segmented">
                    <button className={inputs.phevExemptUseBeforeCutoff ? 'active' : ''} onClick={() => set('phevExemptUseBeforeCutoff', true)}>Yes</button>
                    <button className={!inputs.phevExemptUseBeforeCutoff ? 'active' : ''} onClick={() => set('phevExemptUseBeforeCutoff', false)}>No</button>
                  </div>
                </div>
                <div className="field">
                  <label>Is a financially binding pre-existing commitment continuing, unchanged?</label>
                  <div className="segmented">
                    <button className={inputs.phevBindingCommitmentUnchanged ? 'active' : ''} onClick={() => set('phevBindingCommitmentUnchanged', true)}>Yes</button>
                    <button className={!inputs.phevBindingCommitmentUnchanged ? 'active' : ''} onClick={() => set('phevBindingCommitmentUnchanged', false)}>No</button>
                  </div>
                </div>
              </>
            )}

            <div className="field">
              <label>Drive-away price (including GST and on-road costs)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.driveAwayPrice || ''} onChange={setNum('driveAwayPrice')} min="0" step="1000" />
              </div>
            </div>
            <div className="field">
              <label>Of which stamp duty, registration and CTP</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.onRoadCosts || ''} onChange={setNum('onRoadCosts')} min="0" step="100" />
              </div>
              <p className="offset-note">
                Carries no claimable GST, sits outside the FBT base value, and is excluded from the residual —
                which is why the residual is smaller than a percentage of the drive-away price.
              </p>
            </div>
            <div className="field">
              <label>Lease term</label>
              <div className="segmented">
                {[1,2,3,4,5].map(t => (
                  <button key={t} className={inputs.termYears === t ? 'active' : ''} onClick={() => set('termYears', t)}>{t}yr</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Lease start date</label>
              <input type="date" className="field-input" value={inputs.startDate} onChange={e => set('startDate', e.target.value)} />
              <p className="offset-note">
                The FBT treatment is fixed at commencement, and the electric vehicle rate steps down on 1 April 2027
                and again on 1 April 2029.
              </p>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">The package</div>
            <div className="field">
              <label>Finance rate</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.financeRate || ''} onChange={setNum('financeRate')} min="0" max="20" step="0.25" />
                <span className="input-suffix">% p.a.</span>
              </div>
            </div>
            <div className="field">
              <label>Annual running costs, including GST (fuel or charging, rego, insurance, tyres, servicing)</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.runningCosts || ''} onChange={setNum('runningCosts')} min="0" step="500" />
              </div>
            </div>
            <div className="field">
              <label>Employer or provider administration fee</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.adminFee || ''} onChange={setNum('adminFee')} min="0" step="50" />
                <span className="input-suffix">$ / yr</span>
              </div>
              <p className="offset-note">Typically $300–800 a year. Charged whether or not you use the car.</p>
            </div>
            <div className="field">
              <label>Does the employer claim the GST credit on running costs?</label>
              <div className="segmented">
                <button className={inputs.employerClaimsGstOnRunningCosts ? 'active' : ''} onClick={() => set('employerClaimsGstOnRunningCosts', true)}>Yes</button>
                <button className={!inputs.employerClaimsGstOnRunningCosts ? 'active' : ''} onClick={() => set('employerClaimsGstOnRunningCosts', false)}>No</button>
              </div>
            </div>
            <div className="field">
              <label>How is FBT handled?</label>
              <div className="segmented">
                <button className={inputs.useECM ? 'active' : ''} onClick={() => set('useECM', true)}>Employee contribution</button>
                <button className={!inputs.useECM ? 'active' : ''} onClick={() => set('useECM', false)}>Pay the FBT</button>
              </div>
              <p className="offset-note">
                A post-tax contribution equal to the taxable value reduces FBT to nil — it must be paid before
                31 March. You cannot pay full FBT <em>and</em> claim the contribution reduction; the choice here is
                genuinely one or the other.
              </p>
            </div>
            <div className="field">
              <label>Residual value at end of term</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <button
                  onClick={() => { setShowResidualOverride(!showResidualOverride); if (showResidualOverride) set('residualOverride', null); }}
                  style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showResidualOverride
                    ? 'Use the ATO minimum'
                    : `ATO minimum ${fmtPct(result.residual.pct, 2)}: ${fmt(result.residual.minimumExGst)} ex GST — override`}
                </button>
              </div>
              {showResidualOverride && (
                <div className="input-wrap has-prefix">
                  <span className="input-prefix">$</span>
                  <input type="number" value={inputs.residualOverride ?? Math.round(result.residual.minimumExGst)} onChange={e => set('residualOverride', parseFloat(e.target.value) || 0)} min="0" step="1000" />
                </div>
              )}
              <p className="offset-note">
                A <strong>minimum</strong>, not a fixed figure — the ATO allows a lower percentage for high-kilometre
                drivers. GST is added on payout, so you will actually hand over {fmt(result.residual.includingGst)}.
              </p>
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
            <div className="field">
              <label>Is super calculated on your salary before packaging?</label>
              <div className="segmented">
                <button className={inputs.sgOnPrePackagedSalary ? 'active' : ''} onClick={() => set('sgOnPrePackagedSalary', true)}>Yes — full salary</button>
                <button className={!inputs.sgOnPrePackagedSalary ? 'active' : ''} onClick={() => set('sgOnPrePackagedSalary', false)}>No — reduced salary</button>
              </div>
              <p className="offset-note">
                Worth asking. Packaging on the reduced salary costs {fmt(result.superReduction)} of super a year here,
                and that is a real cost the headline saving never shows.
              </p>
            </div>
            <div className="field">
              <label>HELP / HECS balance</label>
              <div className="input-wrap has-prefix">
                <span className="input-prefix">$</span>
                <input type="number" value={inputs.helpBalance || ''} onChange={setNum('helpBalance')} min="0" step="1000" placeholder="0" />
              </div>
            </div>
            <div className="field">
              <label>Private hospital cover</label>
              <div className="segmented">
                <button className={inputs.hasPrivateCover ? 'active' : ''} onClick={() => set('hasPrivateCover', true)}>Yes</button>
                <button className={!inputs.hasPrivateCover ? 'active' : ''} onClick={() => set('hasPrivateCover', false)}>No</button>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">If you bought it outright instead</div>
            <div className="field">
              <label>Would you finance the purchase?</label>
              <div className="segmented">
                <button className={inputs.outrightFinanced ? 'active' : ''} onClick={() => set('outrightFinanced', true)}>Car loan</button>
                <button className={!inputs.outrightFinanced ? 'active' : ''} onClick={() => set('outrightFinanced', false)}>Pay cash</button>
              </div>
            </div>
            <div className="field">
              <label>Work-related kilometres a year</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.workRelatedKms || ''} onChange={setNum('workRelatedKms')} min="0" step="500" placeholder="0" />
                <span className="input-suffix">km</span>
              </div>
              <p className="offset-note">
                <strong>Not your odometer.</strong> The {(result.centsPerKmRate * 100).toFixed(0)}c/km method covers
                work travel only — driving between jobs or to a client. Home to work is private and does not count,
                so for most people this is zero. Capped at {result.centsPerKmCapKm.toLocaleString('en-AU')} km, or{' '}
                {fmt(result.centsPerKmMax)}.
              </p>
            </div>
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          <div className="rate-callout" style={result.isExempt ? undefined : warnStyle}>
            <strong>
              {VEHICLE_LABEL[result.vehicleType]} — statutory rate {fmtPct(result.statutoryRate, 0)}
              {result.isExempt ? ' (FBT-exempt)' : ''}
            </strong>
            {result.statutoryRateLabel}. Base value {fmt(result.basePriceIncGst)} including GST, excluding on-road
            costs. {result.isExempt
              ? 'No FBT is payable on the car benefit — but read the reportable amount below before you celebrate.'
              : `Taxable value ${fmt(result.fbtTaxableValue)} a year, grossed up at ${result.grossUpApplied} and taxed at ${fmtPct(result.fbtRates.rate, 0)}.`}
          </div>

          <div className="savings-card">
            <div className="savings-label">Annual tax saving, net of the reportable amount</div>
            <div className="savings-amount">{fmt(result.annualTaxSaving)}</div>
            <div className="savings-sub">
              From a pre-tax deduction of {fmt(result.preTaxDeduction)}
              {result.postTaxDeduction > 0 && <> plus {fmt(result.postTaxDeduction)} post-tax</>} at
              a {fmtPct(result.marginalRate)} marginal rate
              {result.rfbaCost > 0 && <>, less {fmt(result.rfbaCost)} of extra surcharge and repayments the
              reportable amount triggers</>}. On top of that, {fmt(result.gstSavingOnVehicle)} of GST comes off the
              vehicle and {fmt(result.gstSavingOnRunning)} a year off the running costs.
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">Total saving over {result.termYears}yr</div>
                <div className="savings-stat-value">{fmt(result.totalSavingOverTerm)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Net annual cost</div>
                <div className="savings-stat-value">{fmt(result.netAnnualCost)}</div>
              </div>
              <div className="savings-stat">
                <div className="savings-stat-label">Fortnightly out of pocket</div>
                <div className="savings-stat-value">{fmt(result.fortnightlyOutOfPocket)}</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Annual lease rental</div>
              <div className="stat-card-value">{fmt(result.annualLeaseRental)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Residual payout (incl. GST)</div>
              <div className="stat-card-value">{fmt(result.residualIncludingGst)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">{result.ecmApplied ? 'Post-tax contribution' : 'FBT payable'}</div>
              <div className="stat-card-value">{fmt(result.ecmApplied ? result.postTaxContribution : result.fbtPayable)}</div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">GST saved on the vehicle</div>
              <div className="stat-card-value">{fmt(result.gstSavingOnVehicle)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Reportable fringe benefit</div>
              <div className="stat-card-value">{fmt(result.rfba)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Super forgone a year</div>
              <div className="stat-card-value">{fmt(result.superReduction)}</div>
            </div>
          </div>

          {result.warnings.map((w, i) => (
            <div key={i} className="rate-callout" style={w.level === 'warn' ? warnStyle : undefined}>
              <strong>{w.title}</strong>
              {w.body}
            </div>
          ))}

          {result.rfbaApplies && (
            <div className="rate-callout">
              <strong>What the {fmt(result.rfba)} reportable amount touches</strong>
              {result.rfbaAffects.map((k) => RFBA_LABEL[k] ?? k).join(' · ')}. Modelled here: the Medicare levy
              surcharge ({fmt(result.rfbaMlsCost)}), HELP repayments ({fmt(result.rfbaHelpCost)}) and Division 293
              ({fmt(result.rfbaDivision293Cost)}). Family Tax Benefit and child support are not modelled and can cost
              a packaging family considerably more. A post-tax contribution reduces the reportable amount as well as
              the FBT.
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          <div className="chart-card">
            <div className="chart-title">Novated lease vs. buying the same car — cash out of pocket each year</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={52} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Novated (net)" fill={chartAccent} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Buy outright (net)" fill={chartRed} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 4px' }}>
              The final novated year includes the {fmt(result.residualIncludingGst)} residual payout.{' '}
              {result.outrightFinanced
                ? `Buying is modelled as a ${result.termYears}-year loan at ${inputs.financeRate}%, so both paths pay interest.`
                : 'Buying is modelled as cash in year one, which flatters it — no interest, and no return on the money either.'}
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">Novated over {result.termYears}yr</div>
              <div className="stat-card-value">{fmt(result.novatedTotalCost)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Buying over {result.termYears}yr</div>
              <div className="stat-card-value">{fmt(result.outrightTotalCost)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">{result.advantage >= 0 ? 'Novating is ahead by' : 'Buying is ahead by'}</div>
              <div className="stat-card-value" style={result.advantage < 0 ? { color: 'var(--red)' } : undefined}>
                {fmt(Math.abs(result.advantage))}
              </div>
            </div>
          </div>

          <div className="schedule-card">
            <div className="schedule-header" onClick={() => setShowExit((v) => !v)}>
              <span className="schedule-title">If you leave your employer — what you would owe</span>
              <span className="schedule-toggle">{showExit ? '▲ Hide' : '▼ Show'}</span>
            </div>
            {showExit && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>You leave at the end of</th>
                        <th>Lease balance (ex GST)</th>
                        <th>Payout with GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.leavingEmployer.balanceByYear.map((b) => (
                        <tr key={b.year}>
                          <td>Year {b.year}</td>
                          <td>{fmt(b.leaseBalanceExGst)}</td>
                          <td>{fmt(b.leaseBalanceExGst * 1.1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '10px 8px' }}>
                  {result.leavingEmployer.note} The balances above exclude the financier&rsquo;s break costs, which are
                  quoted at the time and are not standardised.
                </div>
              </>
            )}
          </div>

          <div className="disclaimer">
            Estimates only — not financial advice. Based on {result.financialYear} ATO rates resolved against the lease
            commencement date; the FBT year runs 1 April to 31 March, so it does not line up with the financial year.
            Assumes the car is available for the whole FBT year and that the statutory formula is used — the operating
            cost (logbook) method can give a lower taxable value for a genuinely high-business-use car. The GST credit
            on running costs is applied to the whole budget, though registration and CTP are GST-free, so the real
            saving is slightly smaller. Family Tax Benefit, child support, the private health rebate and the super
            co-contribution are affected by the reportable amount but are not modelled. Employer participation, lease
            approval, insurance and residual values are all set by your employer and financier, not by the ATO. For
            personal financial decisions, consult a licensed adviser or registered tax agent.
          </div>
        </div>
      </div>
    </div>
  );
}
