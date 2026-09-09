import { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { calcHealth, ACTIVITY_LEVELS } from './lib/health.js';
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
};

function encodeInputs(inp) {
  const p = new URLSearchParams();
  p.set('ht', inp.heightCm);
  p.set('wt', inp.weightKg);
  p.set('ag', inp.age);
  p.set('sx', inp.sex[0]);
  p.set('al', inp.activityLevel[0]);
  p.set('gt', inp.goalType[0]);
  p.set('gw', inp.goalWeightKg);
  p.set('gk', inp.goalWeeks);
  return p.toString();
}

function decodeParams(search) {
  const p = new URLSearchParams(search);
  if (!p.has('ht')) return {};
  const alMap = { s: 'sedentary', l: 'light', m: 'moderate', h: 'high' };
  const gtMap = { l: 'lose', m: 'maintain', g: 'gain' };
  return {
    heightCm:     parseFloat(p.get('ht')) || 175,
    weightKg:     parseFloat(p.get('wt')) || 80,
    age:          parseFloat(p.get('ag')) || 30,
    sex:          p.get('sx') === 'f' ? 'female' : 'male',
    activityLevel: alMap[p.get('al')] ?? 'moderate',
    goalType:     gtMap[p.get('gt')] ?? 'maintain',
    goalWeightKg: parseFloat(p.get('gw')) || 70,
    goalWeeks:    parseFloat(p.get('gk')) || 12,
  };
}

function MacroBar({ label, grams, calories, color }) {
  return (
    <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', marginTop: 3 }}>{grams}g</div>
      <div style={{ fontSize: '0.67rem', color, marginTop: 1 }}>{calories} kcal</div>
    </div>
  );
}

export default function HealthInstance({ instanceKey = '', label, onRemove, theme = 'light', isComparison = false }) {
  const [inputs, setInputs] = useState(() =>
    instanceKey === '' ? { ...DEFAULTS, ...decodeParams(window.location.search) } : { ...DEFAULTS }
  );

  const set = (key, val) => setInputs(s => ({ ...s, [key]: val }));
  const setNum = (key) => (e) => set(key, parseFloat(e.target.value) || 0);

  useEffect(() => {
    if (instanceKey !== '') return;
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeInputs(inputs)}`);
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
  const bmiColor = bmiColors[result.bmiCategory] ?? '#888';

  const hasGoal = inputs.goalType !== 'maintain';
  const macros = hasGoal ? result.goalMacros : result.maintenanceMacros;
  const calories = hasGoal ? result.goalCalories : result.maintenanceCalories;

  const weightDiff = hasGoal ? inputs.goalWeightKg - inputs.weightKg : 0;
  const isLosing = weightDiff < 0;
  const isGaining = weightDiff > 0;

  const projWeeksStr = result.projectedWeeks
    ? result.projectedWeeks < 52
      ? `${result.projectedWeeks} weeks`
      : `${(result.projectedWeeks / 52).toFixed(1)} years`
    : null;

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
          <h1>Health Calculator<br /><span className="calc-heading-sub">Calories, Macros &amp; Goal Planning</span></h1>
          <p>Calculate your daily calorie needs and macro targets. Set a weight goal and see the plan to get there at your chosen activity level.</p>
        </div>
      ) : (
        <div className="calc-heading calc-heading--compact">
          <h2>Health</h2>
        </div>
      )}

      <div className="calc-body">
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
                <input type="number" value={inputs.age || ''} onChange={setNum('age')} min="15" max="100" step="1" />
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
        </div>

        <div className="results-panel">
          <div className="savings-card">
            <div className="savings-label">
              {hasGoal ? (inputs.goalType === 'lose' ? 'Caloric deficit target' : 'Caloric surplus target') : 'Daily maintenance calories'}
            </div>
            <div className="savings-amount">{calories.toLocaleString()} <span style={{ fontSize: '1.2rem', fontWeight: 400 }}>kcal</span></div>
            <div className="savings-sub">
              {hasGoal
                ? `${Math.abs(result.calorieDeficitOrSurplus)} kcal/day ${isLosing ? 'below' : 'above'} maintenance (${result.maintenanceCalories.toLocaleString()} kcal)`
                : `BMR: ${result.bmr} kcal × ${result.activityMultiplier} activity multiplier`}
            </div>
            <div className="savings-meta">
              <div className="savings-stat">
                <div className="savings-stat-label">BMI</div>
                <div className="savings-stat-value" style={{ color: bmiColor }}>{result.bmi} — {result.bmiCategory}</div>
              </div>
              {hasGoal && result.projectedWeeks && (
                <div className="savings-stat">
                  <div className="savings-stat-label">Projected time</div>
                  <div className="savings-stat-value">{projWeeksStr}</div>
                </div>
              )}
              {hasGoal && (
                <div className="savings-stat">
                  <div className="savings-stat-label">Weekly change</div>
                  <div className="savings-stat-value">{result.weeklyWeightChange > 0 ? '+' : ''}{result.weeklyWeightChange} kg/wk</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {hasGoal ? 'Goal macros (daily)' : 'Maintenance macros (daily)'}
            </div>
            <div style={{ display: 'flex' }}>
              <MacroBar label="Protein" grams={macros.proteinG} calories={macros.proteinCal} color={proteinColor} />
              <MacroBar label="Carbs" grams={macros.carbG} calories={macros.carbCal} color={carbColor} />
              <div style={{ flex: 1, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Fat</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', marginTop: 3 }}>{macros.fatG}g</div>
                <div style={{ fontSize: '0.67rem', color: fatColor, marginTop: 1 }}>{macros.fatCal} kcal</div>
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-card-label">BMR (at rest)</div>
              <div className="stat-card-value">{result.bmr} kcal</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Maintenance</div>
              <div className="stat-card-value">{result.maintenanceCalories} kcal</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">{hasGoal ? 'Goal intake' : 'BMI'}</div>
              <div className="stat-card-value">{hasGoal ? `${calories} kcal` : result.bmi}</div>
            </div>
          </div>

          <div style={{ margin: '0 0 8px' }}>
            <AdUnit slotId={AD_SLOT_CHART} format="horizontal" />
          </div>

          {hasGoal && result.chartData.length > 1 && (
            <div className="chart-card">
              <div className="chart-title">Projected weight loss over time</div>
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
            Estimates only — not medical advice. Uses Mifflin-St Jeor equation. Individual results vary based on metabolism, hormones, activity accuracy and diet composition. Macro targets are guidelines. Consult a dietitian or GP before making significant dietary changes.
          </div>
        </div>
      </div>
    </div>
  );
}
