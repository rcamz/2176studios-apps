import { useState, useMemo, useEffect, useId, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { calcHealth, explainHealth, ACTIVITY_LEVELS } from './lib/health.js';
import Workings from './Workings.jsx';
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
};

const AL_CODE = { sedentary: 's', light: 'l', moderate: 'm', high: 'h', athlete: 'a' };
const AL_MAP  = { s: 'sedentary', l: 'light', m: 'moderate', h: 'high', a: 'athlete' };
const GT_MAP  = { l: 'lose', m: 'maintain', g: 'gain' };

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
  const uid = useId();
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, num(e.target.value, 0));

  // ── Activity cards are a real radio group. The markup carries the roles and
  //    the keyboard behaviour; the styling below is untouched.
  const activityRefs = useRef([]);
  const activeActivityIndex = Math.max(
    0, ACTIVITY_LEVELS.findIndex((a) => a.key === inputs.activityLevel)
  );
  const onActivityKeyDown = (e, i) => {
    const last = ACTIVITY_LEVELS.length - 1;
    let next = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      set('activityLevel', ACTIVITY_LEVELS[i].key);
      return;
    } else return;
    e.preventDefault();
    set('activityLevel', ACTIVITY_LEVELS[next].key);
    activityRefs.current[next]?.focus();
  };

  useEffect(() => {
    if (instanceKey !== '') return;
    writeUrl(encodeInputs(inputs));
  }, [inputs, instanceKey]);

  const result = useMemo(() => calcHealth(inputs), [inputs]);
  const explanation = useMemo(() => explainHealth(result, inputs), [result, inputs]);

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
          <label id={`${uid}-sex-label`}>Biological sex</label>
          <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-sex-label`}>
            <button type="button" role="radio" aria-checked={inputs.sex === 'male'} className={inputs.sex === 'male' ? 'active' : ''} onClick={() => set('sex', 'male')}>Male</button>
            <button type="button" role="radio" aria-checked={inputs.sex === 'female'} className={inputs.sex === 'female' ? 'active' : ''} onClick={() => set('sex', 'female')}>Female</button>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-age`}>Age</label>
          <div className="input-wrap has-suffix">
            <input id={`${uid}-age`} inputMode="numeric" type="number" value={inputs.age || ''} onChange={setNum('age')} min="18" max="100" step="1" />
            <span className="input-suffix">yrs</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-height`}>Height</label>
          <div className="input-wrap has-suffix">
            <input id={`${uid}-height`} inputMode="decimal" type="number" value={inputs.heightCm || ''} onChange={setNum('heightCm')} min="100" max="250" step="1" />
            <span className="input-suffix">cm</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-weight`}>Current weight</label>
          <div className="input-wrap has-suffix">
            <input id={`${uid}-weight`} inputMode="decimal" type="number" value={inputs.weightKg || ''} onChange={setNum('weightKg')} min="30" max="300" step="0.5" />
            <span className="input-suffix">kg</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-body-fat`}>Body fat (optional)</label>
          <div className="input-wrap has-suffix">
            <input id={`${uid}-body-fat`} inputMode="decimal" aria-describedby={`${uid}-body-fat-help`} type="number" value={inputs.bodyFatPercent || ''} onChange={setNum('bodyFatPercent')} min="0" max="70" step="0.5" placeholder="Leave blank if unknown" />
            <span className="input-suffix">%</span>
          </div>
          <div id={`${uid}-body-fat-help`} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Above 25% body fat, protein targets scale to lean body mass rather than total weight.
          </div>
        </div>
      </div>

      <div className="panel-section" role="radiogroup" aria-labelledby={`${uid}-activity-label`}>
        <div className="section-title" id={`${uid}-activity-label`}>Activity level</div>
        {ACTIVITY_LEVELS.map((a, i) => (
          <div key={a.key} className="field" style={{ marginBottom: 6 }}>
            <div
              ref={(el) => { activityRefs.current[i] = el; }}
              role="radio"
              aria-checked={inputs.activityLevel === a.key}
              tabIndex={i === activeActivityIndex ? 0 : -1}
              aria-describedby={`${uid}-activity-${a.key}-examples`}
              onKeyDown={(e) => onActivityKeyDown(e, i)}
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
              <div id={`${uid}-activity-${a.key}-examples`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.examples}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="section-title">Goal</div>
        <div className="field">
          <div className="segmented" role="radiogroup" aria-label="Goal">
            <button type="button" role="radio" aria-checked={inputs.goalType === 'lose'} className={inputs.goalType === 'lose' ? 'active' : ''} onClick={() => set('goalType', 'lose')}>Lose weight</button>
            <button type="button" role="radio" aria-checked={inputs.goalType === 'maintain'} className={inputs.goalType === 'maintain' ? 'active' : ''} onClick={() => set('goalType', 'maintain')}>Maintain</button>
            <button type="button" role="radio" aria-checked={inputs.goalType === 'gain'} className={inputs.goalType === 'gain' ? 'active' : ''} onClick={() => set('goalType', 'gain')}>Gain muscle</button>
          </div>
        </div>
        {inputs.goalType !== 'maintain' && (
          <>
            <div className="field">
              <label htmlFor={`${uid}-goal-weight`}>Goal weight</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-goal-weight`} inputMode="decimal" type="number" value={inputs.goalWeightKg || ''} onChange={setNum('goalWeightKg')} min="30" max="300" step="0.5" />
                <span className="input-suffix">kg</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-goal-weeks`}>Timeframe</label>
              <div className="input-wrap has-suffix">
                <input id={`${uid}-goal-weeks`} inputMode="numeric" type="number" value={inputs.goalWeeks || ''} onChange={setNum('goalWeeks')} min="1" max="104" step="1" />
                <span className="input-suffix">weeks</span>
              </div>
            </div>
          </>
        )}
        <AdUnit slotId={AD_SLOT_INLINE} format="horizontal" style={{ marginTop: 12 }} />
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
      <button type="button" className="instance-remove" onClick={onRemove || undefined} title="Remove scenario" aria-label={`Remove ${label || 'scenario'}`}
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
            <div className="rate-callout" role="alert" style={inputs.age > 0 ? BLOCK_STYLE : undefined}>
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

  const bmiColor = bmiColors[result.bmiCategory] ?? '#888';

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
            <div key={b.code} className="rate-callout" role="alert" style={BLOCK_STYLE}>
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
            <div className="savings-label" id={`${uid}-headline-label`}>
              {result.goalBlocked
                ? 'Daily maintenance calories'
                : goalShown
                  ? (isLosing ? 'Caloric deficit target' : 'Caloric surplus target')
                  : 'Daily maintenance calories'}
            </div>
            <div className="savings-amount" aria-live="polite" aria-atomic="true" aria-labelledby={`${uid}-headline-label`}>
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
                <div className="savings-stat-label">BMI</div>
                <div className="savings-stat-value" style={{ color: bmiColor }}>{result.bmi} — {result.bmiCategory}</div>
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
              <div role="img" aria-label={`Line chart of projected weight over ${result.chartData.length - 1} weeks, from ${inputs.weightKg} kg to a ${inputs.goalWeightKg} kg goal, with the rate of ${isLosing ? 'loss' : 'gain'} slowing as BMR moves with your weight.`}>
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
              <table className="visually-hidden">
                <caption>Projected weight by week</caption>
                <thead>
                  <tr><th scope="col">Week</th><th scope="col">Weight (kg)</th></tr>
                </thead>
                <tbody>
                  {result.chartData.map((d) => (
                    <tr key={d.week}>
                      <th scope="row">{d.week}</th>
                      <td>{d['Weight (kg)']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Workings data={explanation} />

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
