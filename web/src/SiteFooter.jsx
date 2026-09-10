import { Fragment } from 'react';
import { Link } from 'react-router-dom';

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

export default function SiteFooter() {
  return (
    <nav className="site-footer" aria-label="Site information">
      {LINKS.map((l, i) => (
        <Fragment key={l.to}>
          {/* Decorative: a screen reader already hears three separate links. */}
          {i > 0 && <span className="site-footer-sep" aria-hidden="true">|</span>}
          <Link className="site-footer-link" to={l.to}>{l.label}</Link>
        </Fragment>
      ))}
    </nav>
  );
}
