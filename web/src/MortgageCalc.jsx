import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CalcInstance from './CalcInstance.jsx';
import AdUnit from './AdUnit.jsx';
import './MortgageCalc.css';

const AD_SLOT_BANNER = 'XXXXXXXXXX';

const IconBubble = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H6l-3 2.5V11H3.5A1.5 1.5 0 0 1 2 9.5v-6Z"/>
  </svg>
);

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2.75"/>
    <line x1="8" y1="1.5" x2="8" y2="3"/>
    <line x1="8" y1="13" x2="8" y2="14.5"/>
    <line x1="1.5" y1="8" x2="3" y2="8"/>
    <line x1="13" y1="8" x2="14.5" y2="8"/>
    <line x1="3.4" y1="3.4" x2="4.5" y2="4.5"/>
    <line x1="11.5" y1="11.5" x2="12.6" y2="12.6"/>
    <line x1="12.6" y1="3.4" x2="11.5" y2="4.5"/>
    <line x1="4.5" y1="11.5" x2="3.4" y2="12.6"/>
  </svg>
);

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <line x1="7" y1="1.5" x2="7" y2="12.5"/>
    <line x1="1.5" y1="7" x2="12.5" y2="7"/>
  </svg>
);

const LABELS = { '': 'Scenario A', b: 'Scenario B', c: 'Scenario C' };
let _nextId = 1;

export default function MortgageCalc() {
  const [theme, setTheme] = useState('light');
  const [instances, setInstances] = useState(() => [{ id: _nextId++, key: '' }]);
  const instancesRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isMulti = instances.length > 1;

  const addInstance = () => {
    if (instances.length >= 3) return;
    const usedKeys = new Set(instances.map(i => i.key));
    const nextKey = ['b', 'c'].find(k => !usedKeys.has(k));
    if (!nextKey) return;
    setInstances(prev => [...prev, { id: _nextId++, key: nextKey }]);
    // Scroll right after render so the new instance is visible
    setTimeout(() => {
      if (instancesRef.current) {
        instancesRef.current.scrollTo({ left: instancesRef.current.scrollWidth, behavior: 'smooth' });
      }
    }, 50);
  };

  const removeInstance = (key) => {
    setInstances(prev => prev.filter(i => i.key !== key));
  };

  return (
    <div className="calc-page">
      <div className="calc-topbar">
        <Link to="/" className="calc-brand">2176 Studios<span className="brand-dot" /></Link>
        <div className="topbar-actions">
          {instances.length < 3 && (
            <button className="btn-compare" onClick={addInstance} title="Add a comparison scenario">
              <IconPlus />
              <span>Compare</span>
            </button>
          )}
          <a className="btn-icon" title="Feedback / Support" href="mailto:support@2176studios.com"><IconBubble /></a>
          <button className="btn-icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><IconSun /></button>
        </div>
      </div>

      <div className="calc-instances" data-count={instances.length} ref={instancesRef}>
        {instances.map((inst) => (
          <CalcInstance
            key={inst.id}
            instanceKey={inst.key}
            label={LABELS[inst.key]}
            onRemove={inst.key !== '' ? () => removeInstance(inst.key) : null}
            theme={theme}
            isComparison={isMulti}
          />
        ))}
      </div>

      <div className="ad-bar-float">
        <AdUnit slotId={AD_SLOT_BANNER} format="horizontal" />
      </div>
    </div>
  );
}
