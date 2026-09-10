import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_URL } from '../../core/src/appRoutes.js';

// About, contact and privacy, on every page just above the version stamp.
//
// One destination, three anchors. Three separate routes would be three
// near-empty pages, and Google Play wants a single stable privacy URL per
// listing — /about#privacy is that URL for all twelve apps.
const LINKS = [
  { to: '/about#about',   label: 'About' },
  { to: '/about#contact', label: 'Contact' },
  { to: '/about#privacy', label: 'Privacy' },
];

// Google Play treats a link out to an external payment page as a policy
// question, and the answer differs for donations, digital goods and charities.
// Rather than find out at review time, the Android builds set
// VITE_HIDE_SUPPORT=1 and ship without it. The web site always shows it.
const SHOW_SUPPORT = import.meta.env?.VITE_HIDE_SUPPORT !== '1';

export default function SiteFooter() {
  return (
    <nav className="site-footer" aria-label="Site information">
      {LINKS.map((l, i) => (
        <Fragment key={l.to}>
          {/* Decorative: a screen reader already hears separate links. */}
          {i > 0 && <span className="site-footer-sep" aria-hidden="true">|</span>}
          <Link className="site-footer-link" to={l.to}>{l.label}</Link>
        </Fragment>
      ))}

      {SHOW_SUPPORT && (
        <>
          <span className="site-footer-sep" aria-hidden="true">|</span>
          <a
            className="site-footer-link site-footer-link--support"
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buy me a coffee
            {/* The icon is decoration; the link text already says where it goes. */}
            <span className="site-footer-ext" aria-hidden="true">&#8599;</span>
          </a>
        </>
      )}
    </nav>
  );
}
