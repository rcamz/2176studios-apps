import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcCGT, explainCGT } from './lib/cgt.js';
import Workings from './Workings.jsx';
import { fmt, fmtPct } from './lib/format.js';
import { num, bool, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoMonthsAgo = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
};

const AT_MAP = { p: 'property', s: 'shares', c: 'crypto', o: 'other' };
const EN_MAP = { i: 'individual', s: 'super', c: 'company' };
const RE_MAP = { r: 'resident', f: 'foreign', h: 'holiday' };
const MR_MAP = { n: 'never', a: 'always', p: 'partial' };
const codeFor = (map, value) =>
  Object.keys(map).find((k) => map[k] === value) ?? Object.keys(map)[0];

const DEFAULTS = {
  assetType: 'property',
  entity: 'individual',
  purchasePrice: 600000,
  purchaseCosts: 28000,
  improvements: 0,
  salePrice: 900000,
  saleCosts: 22000,
  acquisitionDate: isoMonthsAgo(30),
  disposalDate: isoToday(),
  grossIncome: 110000,
  capitalLosses: 0,
  residency: 'resident',
  helpBalance: 0,
  hasPrivateCover: false,
  mainResidenceStatus: 'never',
  residencePeriods: [],
  incomeProducingDuringAbsence: true,
};

// Periods ride in one param as from_to pairs: 2010-01-01_2015-06-30,2018-01-01_
const encodePeriods = (periods) =>
  periods.map((p) => `${p.from || ''}_${p.to || ''}`).join(',');

const decodePeriods = (raw) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((pair) => {
      const [from = '', to = ''] = pair.split('_');
      return { from, to };
    })
    .filter((p) => p.from || p.to)
    .slice(0, 6);
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('at', codeFor(AT_MAP, inp.assetType));
  p.set('en', codeFor(EN_MAP, inp.entity));
  p.set('pp', inp.purchasePrice);
  p.set('pc', inp.purchaseCosts);
  p.set('im', inp.improvements);
  p.set('sp', inp.salePrice);
  p.set('sc', inp.saleCosts);
  p.set('ad', inp.acquisitionDate);
  p.set('dd', inp.disposalDate);
  p.set('gi', inp.grossIncome);
  p.set('cl', inp.capitalLosses);
  p.set('re', codeFor(RE_MAP, inp.residency));
  p.set('hb', inp.helpBalance);
  p.set('pv', inp.hasPrivateCover ? '1' : '0');
  p.set('mr', codeFor(MR_MAP, inp.mainResidenceStatus));
  p.set('ip', inp.incomeProducingDuringAbsence ? '1' : '0');
  if (inp.residencePeriods.length) p.set('rp', encodePeriods(inp.residencePeriods));
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('pp')) return {};
  return {
    assetType:      enumOf(p.get('at'), AT_MAP, DEFAULTS.assetType),
    entity:         enumOf(p.get('en'), EN_MAP, DEFAULTS.entity),
    purchasePrice:  num(p.get('pp'), DEFAULTS.purchasePrice),
    purchaseCosts:  num(p.get('pc'), DEFAULTS.purchaseCosts),
    improvements:   num(p.get('im'), DEFAULTS.improvements),
    salePrice:      num(p.get('sp'), DEFAULTS.salePrice),
    saleCosts:      num(p.get('sc'), DEFAULTS.saleCosts),
    acquisitionDate: p.get('ad') || DEFAULTS.acquisitionDate,
    disposalDate:   p.get('dd') || DEFAULTS.disposalDate,
    grossIncome:    num(p.get('gi'), DEFAULTS.grossIncome),
    capitalLosses:  num(p.get('cl'), DEFAULTS.capitalLosses),
    residency:      enumOf(p.get('re'), RE_MAP, DEFAULTS.residency),
    helpBalance:    num(p.get('hb'), DEFAULTS.helpBalance),
    hasPrivateCover: bool(p.get('pv'), DEFAULTS.hasPrivateCover),
    mainResidenceStatus: enumOf(p.get('mr'), MR_MAP, DEFAULTS.mainResidenceStatus),
    incomeProducingDuringAbsence: bool(p.get('ip'), DEFAULTS.incomeProducingDuringAbsence),
    residencePeriods: decodePeriods(p.get('rp')),
  };
}

// Calendar years and months between two ISO dates, for display only.
function spanLabel(from, to) {
  if (!from || !to) return '—';
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(+a) || Number.isNaN(+b) || b < a) return '—';
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y && m) return `${y}y ${m}m`;
  if (y) return `${y}y`;
  if (m) return `${m}m`;
  return '< 1 month';
}

export default function CGTInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  const isProperty = inputs.assetType === 'property';
  const isIndividual = inputs.entity === 'individual';

  const addPeriod = () => setInputs(s => ({
    ...s,
    residencePeriods: [...s.residencePeriods, { from: s.acquisitionDate, to: '' }],
  }));
  const updatePeriod = (i, key, val) => setInputs(s => ({
    ...s,
    residencePeriods: s.residencePeriods.map((p, j) => (j === i ? { ...p, [key]: val } : p)),
  }));
  const removePeriod = (i) => setInputs(s => ({
    ...s,
    residencePeriods: s.residencePeriods.filter((_, j) => j !== i),
  }));

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(new URLSearchParams(encodeInputs(inputs)));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcCGT({
    ...inputs,
    // The main residence exemption is a dwelling concession — never let a
    // stale setting leak across an asset-type switch.
    mainResidenceStatus: isProperty && isIndividual ? inputs.mainResidenceStatus : 'never',
  }), [inputs, isProperty, isIndividual]);

  const explanation = useMemo(() => explainCGT(result, inputs), [result, inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const violet = theme === 'dark' ? '#9E98E8' : '#7F77DD';
  const amber  = theme === 'dark' ? '#D9931E' : '#BA7517';
  const red    = theme === 'dark' ? '#E87070' : '#D85A30';

  const mr = result.mainResidence;
  const exemptShown = result.mainResidenceExemptAmount > 0;

  const chartData = [
    { name: 'Cost base',   value: Math.round(result.costBase),  fill: violet },
    { name: 'Gross gain',  value: Math.max(0, Math.round(result.grossGain)), fill: amber },
    ...(exemptShown
      ? [{ name: 'Exempt', value: Math.round(result.mainResidenceExemptAmount), fill: chartAccent }]
      : []),
    { name: 'CGT payable', value: Math.round(result.cgtPayable), fill: red },
    { name: 'Net proceeds', value: Math.round(result.afterTaxProceeds), fill: chartAccent },
  ];

  const isLoss = result.isCapitalLoss;
  const holdingStr = spanLabel(inputs.acquisitionDate, inputs.disposalDate);
  const discountLabel = result.discountRate > 0
    ? fmtPct(result.discountRate, result.discountRate === 0.5 ? 0 : 2)
    : 'Not eligible';

  const dayCount = result.holdingDays.toLocaleString('en-AU');

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
          <h1>Capital Gains Tax Calculator<br /><span className="calc-heading-sub">Discount, Main Residence + Marginal Rate</span></h1>
          <p>Calculate CGT on property, shares, crypto or other assets. Applies the 50% discount where the 12-month test is actually met, the main residence exemption including the six-year absence rule, and the Medicare levy the gain attracts. Based on 2026–27 ATO rates.</p>
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
              <label>Who owns it</label>
              <div className="segmented">
                {[['individual','Individual'],['super','Super fund'],['company','Company']].map(([v,l]) => (
                  <button key={v} className={inputs.entity === v ? 'active' : ''} onClick={() => set('entity', v)}>{l}</button>
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
            <div className="section-title">Contract dates</div>
            <p className="offset-note">
              The CGT event is the day you <strong>sign the contract</strong>, not the day it settles. Same on the way in.
              A December contract settling in July is taxed in the earlier financial year, and the 12-month test counts
              neither the acquisition day nor the event day — so exactly one year to the day is 364 days and gets nothing.
            </p>
            <div className="field">
              <label>Purchase contract date</label>
              <input type="date" className="field-input" value={inputs.acquisitionDate} onChange={e => set('acquisitionDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Sale contract date</label>
              <input type="date" className="field-input" value={inputs.disposalDate} onChange={e => set('disposalDate', e.target.value)} />
            </div>
          </div>

          {isProperty && isIndividual && (
            <div className="panel-section">
              <div className="section-title">Main residence</div>
              <div className="field">
                <label>Was this your home?</label>
                <div className="segmented">
                  {[['never','Never'],['always','Always'],['partial','Part of the time']].map(([v,l]) => (
                    <button key={v} className={inputs.mainResidenceStatus === v ? 'active' : ''} onClick={() => set('mainResidenceStatus', v)}>{l}</button>
                  ))}
                </div>
              </div>

              {inputs.mainResidenceStatus === 'partial' && (
                <>
                  <p className="offset-note">
                    Enter each period you <strong>actually lived there</strong>. The gaps after each of them are absences,
                    and each absence gets its own fresh six-year limit — moving back in resets the clock. Leave the end
                    date blank if you still live there.
                  </p>
                  {inputs.residencePeriods.length > 0 && (
                    <div className="lump-list">
                      {inputs.residencePeriods.map((p, i) => (
                        <div key={i} className="lump-row">
                          <input type="date" value={p.from || ''} onChange={(e) => updatePeriod(i, 'from', e.target.value)} />
                          <input type="date" value={p.to || ''} onChange={(e) => updatePeriod(i, 'to', e.target.value)} />
                          <button onClick={() => removePeriod(i)} title="Remove period">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="add-lump" onClick={addPeriod}>+ Add a period you lived there</button>

                  <div className="field" style={{ marginTop: 12 }}>
                    <label>While you were away, was it rented or otherwise earning income?</label>
                    <div className="segmented">
                      <button className={inputs.incomeProducingDuringAbsence ? 'active' : ''} onClick={() => set('incomeProducingDuringAbsence', true)}>Yes — six-year limit</button>
                      <button className={!inputs.incomeProducingDuringAbsence ? 'active' : ''} onClick={() => set('incomeProducingDuringAbsence', false)}>No — indefinite</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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
            {isIndividual && (
              <>
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
                <div className="field">
                  <label>Residency status when the sale contract is signed</label>
                  <select className="field-select" value={inputs.residency} onChange={e => set('residency', e.target.value)}>
                    <option value="resident">Australian resident</option>
                    <option value="foreign">Foreign resident</option>
                    <option value="holiday">Working holiday maker</option>
                  </select>
                </div>
              </>
            )}
            <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
          </div>
        </div>

        <div className="results-panel">
          {isLoss ? (
            <div className="savings-card">
              <div className="savings-label">Net capital loss</div>
              <div className="savings-amount" style={{ color: 'var(--red)' }}>{fmt(Math.abs(result.gainAfterExemption))}</div>
              <div className="savings-sub">
                No CGT payable. Carry {fmt(result.netCapitalLossCarriedForward)} forward — a capital loss offsets future
                capital gains only, never salary, and it carries forward indefinitely until it is used.
              </div>
              <div className="savings-meta">
                <div className="savings-stat">
                  <div className="savings-stat-label">Loss this year</div>
                  <div className="savings-stat-value">{fmt(Math.abs(result.gainAfterExemption))}</div>
                </div>
                <div className="savings-stat">
                  <div className="savings-stat-label">Already carried</div>
                  <div className="savings-stat-value">{fmt(result.capitalLosses)}</div>
                </div>
                <div className="savings-stat">
                  <div className="savings-stat-label">Total to carry forward</div>
                  <div className="savings-stat-value">{fmt(result.netCapitalLossCarriedForward)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="savings-card">
              <div className="savings-label">CGT payable</div>
              <div className="savings-amount">{fmt(result.cgtPayable)}</div>
              <div className="savings-sub">
                {result.grossGain > 0
                  ? <>Effective rate {fmtPct(result.effectiveCGTRate)} on a gross gain of {fmt(result.grossGain)}. Includes the Medicare levy the gain attracts.</>
                  : <>No capital gain on these figures.</>}
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
              <div className="stat-card-value">{discountLabel}</div>
            </div>
          </div>

          {!isLoss && result.assessableGain > 0 && (
            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-card-label">Income tax on gain</div>
                <div className="stat-card-value">{fmt(result.incomeTaxOnGain)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Medicare levy</div>
                <div className="stat-card-value">{fmt(result.medicareLevyOnGain)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">{result.helpRepaymentOnGain > 0 ? 'Extra HELP repayment' : 'Medicare surcharge'}</div>
                <div className="stat-card-value">
                  {fmt(result.helpRepaymentOnGain > 0 ? result.helpRepaymentOnGain : result.mlsOnGain)}
                </div>
              </div>
            </div>
          )}

          {result.mainResidenceExemptAmount > 0 && (
            <div className="rate-callout">
              <strong>
                {mr.exemptFraction >= 1
                  ? 'Main residence exemption — the whole gain is disregarded'
                  : `Partial main residence exemption — ${fmtPct(mr.exemptFraction)} of the gain is exempt`}
              </strong>
              {mr.exemptFraction >= 1 ? (
                <>No CGT and nothing to report. You cannot have two main residences at once, apart from a six-month
                overlap when moving.</>
              ) : (
                <>{mr.mainResidenceDays.toLocaleString('en-AU')} of {mr.ownershipDays.toLocaleString('en-AU')} ownership
                days are exempt, so {fmt(result.mainResidenceExemptAmount)} of the {fmt(result.grossGain)} gain drops out.
                The discount then applies to the {fmt(result.gainAfterExemption)} that remains.</>
              )}
            </div>
          )}

          {result.cgtDiscountEligible && !isLoss && (
            <div className="rate-callout">
              <strong>{discountLabel} CGT discount applied</strong>
              Held {dayCount} days on the test that excludes both the acquisition day and the CGT event day
              — {result.minimumOwnershipDays} or more qualifies. Losses come off first, so {fmt(result.gainAfterLosses)}
              is discounted down to {fmt(result.assessableGain)}.
            </div>
          )}

          {!result.cgtDiscountEligible && !isLoss && result.gainAfterExemption > 0 && result.discountIneligibleReason && (
            <div className="rate-callout" style={{ borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' }}>
              <strong>No CGT discount</strong>
              {result.discountIneligibleReason}
              {result.datesEntered && !result.heldLongEnough && result.entity !== 'company' && (
                <> Currently {dayCount} days — {Math.max(0, result.minimumOwnershipDays - result.holdingDays)} more
                and the assessable gain would halve.</>
              )}
            </div>
          )}

          {result.lossesApplied > 0 && !isLoss && (
            <div className="rate-callout">
              <strong>{fmt(result.lossesApplied)} of capital losses applied before the discount</strong>
              Order matters. Losses first then discount gives {fmt(result.assessableGain)}; discounting first would
              give {fmt(Math.max(0, result.gainAfterExemption * (1 - result.discountRate) - result.capitalLosses))},
              which is not how it works.
              {result.netCapitalLossCarriedForward > 0 && <> {fmt(result.netCapitalLossCarriedForward)} of loss remains to carry forward.</>}
            </div>
          )}

          {result.warnings.map((w, i) => (
            <div
              key={i}
              className="rate-callout"
              style={w.level === 'warn' ? { borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' } : undefined}
            >
              <strong>{w.title}</strong>
              {w.body}
            </div>
          ))}

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
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <Workings data={explanation} />

          <div className="disclaimer">
            Estimates only — not financial advice. Based on {result.financialYear} ATO rates, resolved against the sale
            contract date. The CGT event is the contract date, not settlement. Assumes a single owner — held jointly, the
            gain and the exemption are split by ownership share. Does not model cost base indexation for assets acquired
            before 21 September 1999, small business CGT concessions, the third cost base element, land over two
            hectares, a dwelling used to run a business, or state and territory taxes. For personal financial decisions,
            consult a licensed adviser or registered tax agent.
          </div>
        </div>
      </div>
    </div>
  );
}
