import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHead from './PageHead.jsx';
import SiteFooter from './SiteFooter.jsx';
import { VersionFooter } from './VersionFooter.jsx';
import './About.css';

const SUPPORT_EMAIL = 'support@2176studios.com';

// Shown at the foot of the privacy section. Update it whenever the policy
// changes in substance, not when the page is merely restyled.
const POLICY_UPDATED = '10 September 2026';

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2.75"/>
    <line x1="8" y1="1.5" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="14.5"/>
    <line x1="1.5" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="14.5" y2="8"/>
    <line x1="3.4" y1="3.4" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="12.6" y2="12.6"/>
    <line x1="12.6" y1="3.4" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3.4" y2="12.6"/>
  </svg>
);

export default function About() {
  const [theme, setTheme] = useState('light');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  return (
    <div className="about-wrap">
      <PageHead calcId="about" />

      <div className="calc-topbar">
        <Link to="/" className="calc-brand">2176 Studios<span className="brand-dot" /></Link>
        <div className="topbar-actions">
          <button
            className="btn-icon"
            title="Toggle theme"
            aria-label="Toggle light and dark theme"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            <IconSun />
          </button>
        </div>
      </div>

      <div className="about-body">
        <h1 className="about-h1">About, contact and privacy</h1>

        {/* In-page nav, so the three footer links have somewhere to land and
            a reader arriving at the top can still reach all three. */}
        <nav className="about-jump" aria-label="On this page">
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#privacy">Privacy Policy</a>
        </nav>

        {/* ── About ─────────────────────────────────────────────────── */}
        <section id="about" className="about-section" aria-labelledby="about-h">
          <h2 className="about-h2" id="about-h">About</h2>

          <p>
            2176 Studios builds free calculators for the Australian tax and finance
            system. Twelve of them so far: take-home pay, mortgage repayments and
            offset, borrowing power, rent versus buy, capital gains, redundancy,
            salary sacrifice, First Home Super Saver, retirement and super, novated
            leasing, savings, and a health and energy calculator.
          </p>

          <p>
            They exist because most of the alternatives are either a lead-capture
            form with a number attached, or a generic overseas calculator that does
            not know what Medicare, HELP or stamp duty are. These ask for no email
            address, have no sign-up, and show the full working behind every figure
            so you can check it rather than trust it.
          </p>

          <h3 className="about-h3">How the numbers are kept current</h3>
          <p>
            Every rate, threshold, bracket and levy is stored with the date it takes
            effect and the source it came from, so a calculator answers with the
            figures that applied on the date you are asking about rather than
            whatever was true when the code was written. The suite currently runs
            on verified FY2026&#8209;27 figures, including the 15% second bracket,
            the reformed HELP repayment system and the $1,000 standard deduction.
          </p>
          <p>
            Around 800 automated tests check the arithmetic against published
            worked examples on every change. The version stamp at the bottom of
            each page tells you which build you are looking at and when it last
            changed.
          </p>

          <h3 className="about-h3">What these are not</h3>
          <p>
            These are estimates, not financial, tax, legal or medical advice. They
            are not affiliated with, endorsed by, or connected to the ATO, Services
            Australia, any state revenue office, any lender or any government
            agency. A calculator cannot know your full circumstances. Before acting
            on anything here, check it with a registered tax agent, a licensed
            financial adviser, your lender, or the relevant government body.
          </p>
          <p>
            The site carries advertising, which is how it stays free. Ads do not
            influence any calculation.
          </p>
        </section>

        {/* ── Contact ───────────────────────────────────────────────── */}
        <section id="contact" className="about-section" aria-labelledby="contact-h">
          <h2 className="about-h2" id="contact-h">Contact</h2>

          <p>
            One address for everything — support, bug reports, a figure that looks
            wrong, a feature request, privacy questions, or anything about the
            Android apps:
          </p>

          <p className="about-email">
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>

          <p>
            If you are reporting a number that looks wrong, the most useful thing
            you can send is the share link from the calculator — the Share button
            copies a link that reproduces exactly the inputs you were looking at.
            That saves a round of guessing.
          </p>

          <p className="about-note">
            This is a small operation, not a support desk. Expect a reply in days
            rather than minutes.
          </p>
        </section>

        {/* ── Privacy ───────────────────────────────────────────────── */}
        <section id="privacy" className="about-section" aria-labelledby="privacy-h">
          <h2 className="about-h2" id="privacy-h">Privacy Policy</h2>

          <p className="about-lede">
            There are no accounts, no logins and no sign-up. We do not ask who you
            are, and we do not keep the figures you enter.
          </p>

          <h3 className="about-h3">What we collect about you</h3>
          <p>
            Nothing. There is no account system, no contact form, no newsletter and
            no tracking or analytics of our own. We do not build a profile of you
            and we have no database of users, because there are no users to have a
            database of.
          </p>

          <h3 className="about-h3">The figures you enter</h3>
          <p>
            Every calculation runs in your browser, on your device. Your salary,
            loan balance, super, weight and everything else you type is never sent
            to us and never leaves your device on its way to a server of ours. We
            could not look at it if we wanted to.
          </p>
          <p>
            Nothing is written to your device either — no cookies of ours, no local
            storage, no saved sessions. Close the tab and the figures are gone.
          </p>

          <h3 className="about-h3">Save and Share links</h3>
          <p>
            The Save and Share buttons do not save anything anywhere. They build a
            link with your inputs encoded in the web address itself, and copy it to
            your clipboard. Opening that link later rebuilds the same calculation
            from the address.
          </p>
          <p>
            <strong>Worth knowing:</strong> because the figures are in the address,
            anyone you send the link to can see them, and the address may be kept
            in your browser history or in the chat app you send it through. Treat a
            share link the same way you would treat a screenshot of the numbers.
          </p>

          <h3 className="about-h3">Third parties on this site</h3>
          <p>
            We collect nothing ourselves, but the site loads a few things from other
            companies, and those requests reveal your IP address and browser to
            them. Being straight about it:
          </p>
          <ul className="about-list">
            <li>
              <strong>Google AdSense</strong> serves the advertising. Google may set
              cookies or similar identifiers to measure and personalise ads. This is
              governed by Google&rsquo;s own privacy policy, and you can control what
              it does at{' '}
              <a href="https://myadcenter.google.com" target="_blank" rel="noopener noreferrer">
                myadcenter.google.com
              </a>{' '}
              and{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
                google.com/settings/ads
              </a>. We never send Google the figures you enter.
            </li>
            <li>
              <strong>Google Fonts</strong> supplies the two typefaces. Loading them
              discloses your IP address to Google.
            </li>
            <li>
              <strong>Cloudflare Pages</strong> hosts the site. Like any web host it
              keeps standard server logs, which include IP addresses, for security
              and reliability. We do not use those logs to identify anyone.
            </li>
          </ul>
          <p>
            We have no control over what these companies do with that information,
            and we do not receive any of it back in a form that identifies you.
          </p>

          <h3 className="about-h3">The Android apps</h3>
          <p>
            The apps on Google Play are the same calculators in a wrapper. They have
            no login, request no device permissions beyond internet access for the
            advertising, and store nothing about you on your device. This policy
            covers them as well as the web site.
          </p>

          <h3 className="about-h3">Children</h3>
          <p>
            These are general-purpose financial tools, not aimed at children. Since
            we collect nothing from anyone, we do not knowingly collect anything
            from a child either.
          </p>

          <h3 className="about-h3">Selling your data</h3>
          <p>
            We do not sell, rent, trade or share personal information, for the
            simple reason that we do not have any to sell.
          </p>

          <h3 className="about-h3">Your rights</h3>
          <p>
            Australian privacy law gives you the right to access and correct the
            personal information an organisation holds about you. We hold none, so
            there is nothing to access, correct or delete. If you think that is
            wrong, or you have a privacy complaint, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will
            respond. If you are not satisfied with the response, you can complain to
            the Office of the Australian Information Commissioner at{' '}
            <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
          </p>

          <h3 className="about-h3">Changes to this policy</h3>
          <p>
            If this changes, the date below changes with it. There is no mailing
            list to notify, so the date is the honest signal.
          </p>

          <p className="about-updated">Last updated: {POLICY_UPDATED}</p>
        </section>

        <p className="about-back">
          <Link to="/">&larr; Back to the calculators</Link>
        </p>
      </div>

      <SiteFooter />
      <VersionFooter calcId="about" />
    </div>
  );
}
