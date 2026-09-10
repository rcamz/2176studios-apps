import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NovatedLeaseInstance from './NovatedLeaseInstance.jsx';
import AdUnit from './AdUnit.jsx';
import { VersionFooter } from './VersionFooter.jsx';
import SiteFooter from './SiteFooter.jsx';
import PageHead from './PageHead.jsx';
import ShareModal from './ShareModal.jsx';
import './NovatedLeaseCalc.css';

const AD_SLOT_BANNER  = 'XXXXXXXXXX';
const AD_SLOT_SIDEBAR = 'XXXXXXXXXX';

const IconBubble = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H6l-3 2.5V11H3.5A1.5 1.5 0 0 1 2 9.5v-6Z"/></svg>;
const IconSun = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2.75"/><line x1="8" y1="1.5" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="14.5"/><line x1="1.5" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="14.5" y2="8"/><line x1="3.4" y1="3.4" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="12.6" y2="12.6"/><line x1="12.6" y1="3.4" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3.4" y2="12.6"/></svg>;
const IconDisk = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/><rect x="4.5" y="1.5" width="7" height="4.5" rx="0.5"/><rect x="3.5" y="8.5" width="9" height="5.5" rx="0.5"/></svg>;
const IconShare = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="3" cy="8" r="1.75"/><circle cx="13" cy="3" r="1.75"/><circle cx="13" cy="13" r="1.75"/><line x1="4.7" y1="7.1" x2="11.3" y2="3.9"/><line x1="4.7" y1="8.9" x2="11.3" y2="12.1"/></svg>;

export default function NovatedLeaseCalc() {
  const [theme, setTheme] = useState('light');
  const [modal, setModal] = useState(null);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);


  const handleShare = useCallback(async () => {
    if (navigator.share) await navigator.share({ title: 'Novated Lease Calculator — 2176 Studios', url: window.location.href });
    else setModal('share');
  }, []);

  return (
    <div className="calc-page">
      <PageHead calcId="novatedlease" />
      <div className="calc-topbar">
        <Link to="/" className="calc-brand">2176 Studios<span className="brand-dot" /></Link>
        <div className="topbar-actions">
          <a className="btn-icon" title="Feedback" href="mailto:support@2176studios.com"><IconBubble /></a>
          <button className="btn-icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><IconSun /></button>
          <button className="btn-icon" title="Save" onClick={() => setModal('save')}><IconDisk /></button>
          <button className="btn-icon" title="Share" onClick={handleShare}><IconShare /></button>
        </div>
      </div>
      <div className="calc-instances" data-count="1">
        <NovatedLeaseInstance instanceKey="" theme={theme} isComparison={false} />
      </div>
      <div className="ad-sidebar">
        <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
        <AdUnit slotId={AD_SLOT_SIDEBAR} format="skyscraper" />
      </div>
      <div className="ad-bar-float ad-bar-desktop-hide">
        <AdUnit slotId={AD_SLOT_BANNER} format="horizontal" />
      </div>
      <SiteFooter />
      <VersionFooter calcId="novatedlease" />

      <ShareModal mode={modal} onClose={() => setModal(null)} />
    </div>
  );
}
