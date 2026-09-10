import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { calcHealth, ACTIVITY_LEVELS } from './lib/health.js';
import { fmtKcal, fmtKg } from './lib/format.js';
import { num, enumOf, writeUrl } from './lib/urlState.js';
import AdUnit from './AdUnit.jsx';

const AD_SLOT_INLINE = 'XXXXXXXXXX';
const AD_SLOT_CHART  = 'XXXXXXXXXX';

const DEFAULTS = {
  heightCm: 175,
  weightKg: 80,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
  goalType: 'maintain',
  goalWeightKg: 70,
  goalWeeks: 12,
  bodyFatPercent: 0,   // 0 = not supplied
  bmiView: 'standard', // 'standard' | 'who-asian'
};

const AL_CODE = { sedentary: 's', light: 'l', moderate: 'm', high: 'h', athlete: 'a' };
const AL_MAP  = { s: 'sedentary', l: 'light', m: 'moderate', h: 'high', a: 'athlete' };
const GT_MAP  = { l: 'lose', m: 'maintain', g: 'gain' };
const BV_MAP  = { s: 'standard', a: 'who-asian' };

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('ht', inp.heightCm);
  p.set('wt', inp.weightKg);
  p.set('ag', inp.age);
  p.set('sx', inp.sex[0]);
  p.set('al', AL_CODE[inp.activityLevel] ?? 'm');
  p.set('gt', inp.goalType[0]);
  p.set('gw', inp.goalWeightKg);
  p.set('gk', inp.goalWeeks);
  p.set('bf', inp.bodyFatPercent);
  p.set('bv', inp.bmiView === 'who-asian' ? 'a' : 's');
  return p;
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('ht')) return {};
  return {
    heightCm:       num(p.get('ht'), DEFAULTS.heightCm),
    weightKg:       num(p.get('wt'), DEFAULTS.weightKg),
    age:            num(p.get('ag'), DEFAULTS.age),
    sex:            p.get('sx') === 'f' ? 'female' : 'male',
    activityLevel:  enumOf(p.get('al'), AL_MAP, DEFAULTS.activityLevel),
    goalType:       enumOf(p.get('gt'), GT_MAP, DEFAULTS.goalType),
    goalWeightKg:   num(p.get('gw'), DEFAULTS.goalWeightKg),
    goalWeeks:      num(p.get('gk'), DEFAULTS.goalWeeks),
    bodyFatPercent: num(p.get('bf'), 0),
    bmiView:        enumOf(p.get('bv'), BV_MAP, DEFAULTS.bmiView),
  };
}

function MacroBar({ label, grams, calories, color, last = false }) {
  return (
    <div style={{ flex: 1, padding: '10px 12px', borderRight: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', marginTop: 3 }}>{grams}g</div>
      <div style={{ fontSize: '0.67rem', color, marginTop: 1 }}>{calories} kcal</div>
    </div>
  );
}

const BLOCK_STYLE = { borderColor: 'var(--red)', background: 'rgba(224,82,82,0.06)' };

export default function HealthInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, num(e.target.value, 0));

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(encodeInputs(inputs));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcHealth(inputs), [inputs]);

  const chartAccent  = theme === 'dark' ? '#C9F23A' : '#4B7B00';
  const chartGrid    = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const chartTick    = theme === 'dark' ? 'rgba(240,239,233,0.35)' : 'rgba(13,13,16,0.4)';
  const tooltipBg    = theme === 'dark' ? '#1D1D22' : '#FAFAF6';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const proteinColor = theme === 'dark' ? '#5BA4E8' : '#378ADD';
  const carbColor    = theme === 'dark' ? '#D9931E' : '#BA7517';
  const fatColor     = theme === 'dark' ? '#E87099' : '#D4537E';

  const bmiColors = { 'Underweight': '#378ADD', 'Healthy weight': '#4B7B00', 'Overweight': '#D9931E', 'Obese': '#E05252' };

  // ── Inputs panel is rendered in every state; only the results change.
  const inputPanel = (
    <div className="panel">
      <div className="panel-section">
        <div className="section-title">Your stats</div>
        <div className="field">
          <label>Biological sex</label>
          <div className="segmented">
            <button className={inputs.sex === 'male' ? 'active' : ''} onClick={() => set('sex', 'male')}>Male</button>
            <button className={inputs.sex === 'female' ? 'active' : ''} onClick={() => set('sex', 'female')}>Female</button>
          </div>
        </div>
        <div className="field">
          <label>Age</label>
          <div className="input-wrap has-suffix">
            <input type="number" value={inputs.age || ''} onChange={setNum('age')} min="18" max="100" step="1" />
            <span className="input-suffix">yrs</span>
          </div>
        </div>
        <div className="field">
          <label>Height</label>
          <div className="input-wrap has-suffix">
            <input type="number" value={inputs.heightCm || ''} onChange={setNum('heightCm')} min="100" max="250" step="1" />
            <span className="input-suffix">cm</span>
          </div>
        </div>
        <div className="field">
          <label>Current weight</label>
          <div className="input-wrap has-suffix">
            <input type="number" value={inputs.weightKg || ''} onChange={setNum('weightKg')} min="30" max="300" step="0.5" />
            <span className="input-suffix">kg</span>
          </div>
        </div>
        <div className="field">
          <label>Body fat (optional)</label>
          <div className="input-wrap has-suffix">
            <input type="number" value={inputs.bodyFatPercent || ''} onChange={setNum('bodyFatPercent')} min="0" max="70" step="0.5" placeholder="Leave blank if unknown" />
            <span className="input-suffix">%</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Above 25% body fat, protein targets scale to lean body mass rather than total weight.
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Activity level</div>
        {ACTIVITY_LEVELS.map((a) => (
          <div key={a.key} className="field" style={{ marginBottom: 6 }}>
            <div
              onClick={() => set('activityLevel', a.key)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${inputs.activityLevel === a.key ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                background: inputs.activityLevel === a.key ? 'var(--accent-dim)' : 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: inputs.activityLevel === a.key ? 'var(--accent)' : 'var(--text)' }}>
                {a.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.examples}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="section-title">Goal</div>
        <div className="field">
          <div className="segmented">
            <button className={inputs.goalType === 'lose' ? 'active' : ''} onClick={() => set('goalType', 'lose')}>Lose weight</button>
            <button className={inputs.goalType === 'maintain' ? 'active' : ''} onClick={() => set('goalType', 'maintain')}>Maintain</button>
            <button className={inputs.goalType === 'gain' ? 'active' : ''} onClick={() => set('goalType', 'gain')}>Gain muscle</button>
          </div>
        </div>
        {inputs.goalType !== 'maintain' && (
          <>
            <div className="field">
              <label>Goal weight</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.goalWeightKg || ''} onChange={setNum('goalWeightKg')} min="30" max="300" step="0.5" />
                <span className="input-suffix">kg</span>
              </div>
            </div>
            <div className="field">
              <label>Timeframe</label>
              <div className="input-wrap has-suffix">
                <input type="number" value={inputs.goalWeeks || ''} onChange={setNum('goalWeeks')} min="1" max="104" step="1" />
                <span className="input-suffix">weeks</span>
              </div>
            </div>
          </>
        )}
        <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
      </div>

      <div className="panel-section">
        <div className="section-title">BMI reference</div>
        <div className="field">
          <div className="segmented">
            <button className={inputs.bmiView === 'standard' ? 'active' : ''} onClick={() => set('bmiView', 'standard')}>Standard</button>
            <button className={inputs.bmiView === 'who-asian' ? 'active' : ''} onClick={() => set('bmiView', 'who-asian')}>WHO Asian-adjusted</button>
          </div>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          Standard WHO cut-offs are the default. The Asian-adjusted view shows the 2004 WHO Expert
          Consultation's public health action points — not an Australian recommendation.
        </div>
      </div>
    </div>
  );

  const heading = !isComparison ? (
    <div className="calc-heading">
      <h1>Health Calculator<br /><span className="calc-heading-sub">Calories, Macros &amp; Goal Planning</span></h1>
      <p>Calculate your daily calorie needs and macro targets. Set a weight goal and see the plan to get there at your chosen activity level.</p>
    </div>
  ) : (
    <div className="calc-heading calc-heading--compact">
      <h2>Health</h2>
    </div>
  );

  const instanceHeader = isComparison && (
    <div className="instance-header">
      <span className="instance-label">{label}</span>
      <button className="instance-remove" onClick={onRemove || undefined} title="Remove scenario"
        style={!onRemove ? { visibility: 'hidden', pointerEvents: 'none' } : {}}>×</button>
    </div>
  );

  // ── Under-18 gate. No BMR, no BMI, no calorie target — an explanation only.
  if (result.ageBlocked) {
    return (
      <div className="calc-instance">
        {instanceHeader}
        {heading}
        <div className="calc-body">
          {inputPanel}
          <div className="results-panel">
            <div className="rate-callout" style={inputs.age > 0 ? BLOCK_STYLE : undefined}>
              <strong>{inputs.age > 0 ? 'No results shown — this calculator is for adults' : 'Enter your age'}</strong>
              {result.ageBlockMessage}
            </div>
            <div className="disclaimer">
              Estimates only — not medical advice. Consult a GP or an Accredited Practising Dietitian.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasGoal = inputs.goalType !== 'maintain';
  const goalShown = hasGoal && !result.goalBlocked && result.goalCalories !== null;
  const macros = goalShown ? result.goalMacros : result.maintenanceMacros;
  const protein = goalShown ? result.goalProtein : result.maintenanceProtein;
  const calories = goalShown ? result.goalCalories : result.maintenanceCalories;
  const isLosing = inputs.goalType === 'lose';

  const asianView = inputs.bmiView === 'who-asian';
  const bmiLabel = asianView ? result.bmiAsianCategory : result.bmiCategory;
  const bmiColor = asianView ? 'var(--text)' : (bmiColors[result.bmiCategory] ?? '#888');

  const projWeeksStr = result.projectedWeeks
    ? result.projectedWeeks < 52
      ? `${result.projectedWeeks} weeks`
      : `${(result.projectedWeeks / 52).toFixed(1)} years`
    : null;

  const weeklyStr = result.weeklyWeightChange === null
    ? null
    : `${result.weeklyWeightChange > 0 ? '+' : ''}${result.weeklyWeightChange.toFixed(2)} kg/wk`;

  return (
    <div className="calc-instance">
      {instanceHeader}
      {heading}

      <div className="calc-body">
        {inputPanel}

        <div className="results-panel">
          {/* HARD BLOCK. The target is not rendered anywhere on this screen —
              §7.4 records this as a block, not a warning beside a figure. */}
          {result.goalBlocked && result.blockReasons.map((b) => (
            <div key={b.code} className="rate-callout" style={BLOCK_STYLE}>
              <strong>{b.title}</strong>
              {b.message}
            </div>
          ))}

          {result.warnings.map((w) => (
            <div key={w.key} className="rate-callout" style={w.level === 'warn' ? BLOCK_STYLE : undefined}>
              <strong>{w.title}</strong>
              {w.message}
            </div>
          ))}

          <div className="savings-card">
            <div className="savings-label">
              {result.goalBlocked
                ? 'Daily maintenance calories'
                : goalShown
                  ? (isLosing ? 'Caloric deficit target' : 'Caloric surplus target')
                  : 'Daily maintenance calories'}
            </div>
            <div className="savings-amount">
              {(result.goalBlocked ? result.maintenanceCalories : calories).toLocaleString()}{' '}
              <span style={{ fontSize: '1.2rem', fontWeight: 400 }}>kcal</span>
            </div>
            <div className="savings-sub">
              {result.goalBlocked
                ? 'No goal target is shown for the plan you entered — see above.'
                : goalShown
                  ? `${Math.abs(result.calorieDeficitOrSurplus)} kcal/day ${isLosing ? 'below' : 'above'} maintenance (${result.maintenanceCalories.toLocaleString()} kcal)`
                  : `BMR: ${result.bmr} kcal × ${result.activityMultiplier} activity multiplier`}
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">BMI{asianView ? ' (WHO Asian view)' : ''}</div>
                <div className="savings-stat-value" style={{ color: bmiColor }}>{result.bmi} — {bmiLabel}</div>
              </div>
              {goalShown && projWeeksStr && (
                <div className="savings-stat">
                  <div className="savings-stat-label">Projected time</div>
                  <div className="savings-stat-value">{projWeeksStr}</div>
                </div>
              )}
              {goalShown && weeklyStr && (
                <div className="savings-stat">
                  <div className="savings-stat-label">Weekly change (week 1)</div>
                  <div className="savings-stat-value">{weeklyStr}</div>
                </div>
              )}
            </div>
          </div>

          {asianView && (
            <div className="rate-callout">
              <strong>WHO Asian-adjusted action points — optional view</strong>
              {result.bmiAsian.note} Attribution: {result.bmiAsian.attribution}. BMI is a screening
              tool; waist circumference adds information it cannot capture. If you are of mixed
              ancestry, talk to a clinician rather than self-selecting a threshold.
            </div>
          )}

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {goalShown ? 'Goal macros (daily)' : 'Maintenance macros (daily)'}
            </div>
            <div style={{ display: 'flex' }}>
              <MacroBar label="Protein" grams={macros.proteinG} calories={macros.proteinCal} color={proteinColor} />
              <MacroBar label="Carbs" grams={macros.carbG} calories={macros.carbCal} color={carbColor} />
              <MacroBar label="Fat" grams={macros.fatG} calories={macros.fatCal} color={fatColor} last />
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Protein {protein.gramsLow}–{protein.gramsHigh} g/day — {protein.perKgLow}–{protein.perKgHigh} g
              per kg of {protein.basisLabel}.
              {' '}{protein.morton.note}
              {protein.helms && <> {protein.helms.note} On your figures that is {protein.helms.gramsLow}–{protein.helms.gramsHigh} g/day.</>}
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">BMR (at rest)</div>
              <div className="stat-card-value">{fmtKcal(result.bmr)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Maintenance</div>
              <div className="stat-card-value">{fmtKcal(result.maintenanceCalories)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">{result.leanMassKg !== null ? 'Lean body mass' : 'BMI'}</div>
              <div className="stat-card-value">
                {result.leanMassKg !== null ? fmtKg(result.leanMassKg) : result.bmi}
              </div>
            </div>
          </div>

          {goalShown && result.projection && (
            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-card-label">BMR now</div>
                <div className="stat-card-value">{fmtKcal(result.projection.startBmr)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">BMR at {fmtKg(result.projection.endWeightKg)}</div>
                <div className="stat-card-value">{fmtKcal(result.projection.endBmr)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Change in BMR</div>
                <div className="stat-card-value">
                  {result.projection.bmrDrop > 0 ? '−' : '+'}{Math.abs(result.projection.bmrDrop)} kcal
                </div>
              </div>
            </div>
          )}

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          {goalShown && result.chartData.length > 1 && (
            <div className="chart-card">
              <div className="chart-title">
                Projected weight — {isLosing ? 'loss' : 'gain'} slows as BMR moves with your weight
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="week" tickFormatter={(v) => `Wk ${v}`} tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: chartGrid }} tickLine={false} interval={Math.max(1, Math.floor(result.chartData.length / 8))} />
                  <YAxis tick={{ fontSize: 10, fill: chartTick, fontFamily: 'JetBrains Mono' }} width={42} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip formatter={(v) => `${v} kg`} labelFormatter={(l) => `Week ${l}`} contentStyle={{ fontSize: 11, borderRadius: 3, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: 'var(--text)' }} />
                  <ReferenceLine y={inputs.goalWeightKg} stroke={theme === 'dark' ? '#D9931E' : '#BA7517'} strokeDasharray="4 4" label={{ value: `Goal: ${inputs.goalWeightKg}kg`, position: 'insideTopRight', fontSize: 9, fill: chartTick }} />
                  <Line type="monotone" dataKey="Weight (kg)" stroke={chartAccent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="disclaimer">
            Estimates only — not medical advice.{' '}
            {result.notes.map((n) => n.text).join(' ')}{' '}
            Minimum intakes of {result.minIntake.toLocaleString()} kcal/day and the{' '}
            {(result.maxSafeLossRate * 100).toFixed(1)}% of bodyweight per week ceiling are applied as hard
            limits: where a plan breaches them no target is shown. Not suitable during pregnancy or
            breastfeeding, or with a history of disordered eating — speak to your GP or an Accredited
            Practising Dietitian.
          </div>
        </div>
      </div>
    </div>
  );
}
