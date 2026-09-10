import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CalcInstance from './CalcInstance.jsx';
import AdUnit from './AdUnit.jsx';
import './MortgageCalc.css';

const AD_SLOT_BANNER  = 'XXXXXXXXXX';
const AD_SLOT_SIDEBAR = 'XXXXXXXXXX';

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

const IconDisk = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/>
    <rect x="4.5" y="1.5" width="7" height="4.5" rx="0.5"/>
    <rect x="3.5" y="8.5" width="9" height="5.5" rx="0.5"/>
  </svg>
);

const IconShare = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="3" cy="8" r="1.75"/>
    <circle cx="13" cy="3" r="1.75"/>
    <circle cx="13" cy="13" r="1.75"/>
    <line x1="4.7" y1="7.1" x2="11.3" y2="3.9"/>
    <line x1="4.7" y1="8.9" x2="11.3" y2="12.1"/>
  </svg>
);

const LABELS = { '': 'Scenario A', b: 'Scenario B', c: 'Scenario C' };
let _nextId = 1;

export default function MortgageCalc() {
  const [theme, setTheme] = useState('light');
  const [instances, setInstances] = useState(() => [{ id: _nextId++, key: '', seed: null }]);
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const instancesRef = useRef(null);
  // Latest inputs per instance, so a new scenario can start from an existing
  // one instead of from defaults.
  const stateRef = useRef({});

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const copyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Mortgage Repayments — Offset + Split + Multi-Scenario', url: window.location.href });
    } else {
      setModal('share');
    }
  }, []);

  const isMulti = instances.length > 1;

  // `copyFrom` seeds the new scenario from an existing one. Comparison is
  // almost always "the same loan with one thing changed", so starting from
  // defaults made every comparison a re-entry job.
  const addInstance = (copyFrom = null) => {
    if (instances.length >= 3) return;
    const usedKeys = new Set(instances.map(i => i.key));
    const nextKey = ['b', 'c'].find(k => !usedKeys.has(k));
    if (!nextKey) return;
    const seed = copyFrom !== null ? stateRef.current[copyFrom] ?? null : null;
    setInstances(prev => [...prev, { id: _nextId++, key: nextKey, seed }]);
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
          <a className="btn-icon" title="Feedback / Support" href="mailto:support@2176studios.com"><IconBubble /></a>
          <button className="btn-icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><IconSun /></button>
          <button className="btn-icon" title="Save calculation" onClick={() => { setCopied(false); setModal('save'); }}><IconDisk /></button>
          <button className="btn-icon" title="Share calculation" onClick={handleShare}><IconShare /></button>
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
            seed={inst.seed}
            onStateChange={(s) => { stateRef.current[inst.key] = s; }}
          />
        ))}

        {/* Ghosted compare card — desktop only, hidden on mobile.
            Duplicates the last scenario rather than starting blank: a
            comparison is almost always the same loan with one thing changed. */}
        {instances.length < 3 && (
          <button className="compare-card" onClick={() => addInstance(instances[instances.length - 1].key)}>
            <span className="compare-card-plus">+</span>
            <span className="compare-card-title">Compare</span>
            <span className="compare-card-sub">Copies {LABELS[instances[instances.length - 1].key]} so you can change one thing</span>
          </button>
        )}
      </div>

      {/* Left sidebar — desktop single mode only (hidden on mobile and comparison) */}
      {!isMulti && (
        <div className="ad-sidebar">
          <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
          <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
          <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
        </div>
      )}

      {/* Bottom bar — always on mobile; on desktop only in comparison mode */}
      <div className={`ad-bar-float${!isMulti ? ' ad-bar-desktop-hide' : ''}`}>
        <AdUnit slotId={AD_SLOT_BANNER} format="horizontal" />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            {modal === 'share' && <div className="modal-icon">⤴</div>}
            <h2 className="modal-title">
              {modal === 'save' ? 'Save your calculation' : 'Share your calculation'}
            </h2>
            <p className="modal-desc">
              {modal === 'save'
                ? 'Copy this link. Open it any time to return to exactly these inputs and results.'
                : 'Copy this link and send it. Anyone who opens it will see the same inputs and results instantly.'}
            </p>
            <div className="modal-url-wrap">
              <input className="modal-url" readOnly value={window.location.href} onFocus={(e) => e.target.select()} />
            </div>
            <button className="modal-copy" onClick={copyUrl}>
              {copied ? '✓ Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
