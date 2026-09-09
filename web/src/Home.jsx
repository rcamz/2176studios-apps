import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

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

const APPS = [
  {
    name: 'Mortgage Repayment + Offset Calculator',
    desc: 'Variable, fixed & split loans, offset account, extra repayments, lump sums.',
    href: '/mortgagecalc',
    live: true,
    color: '#378ADD',
    bg: '#E6F1FB',
    darkColor: '#5BA4E8',
  },
  {
    name: 'Pay / Tax Calculator',
    desc: 'Gross to net take-home pay, Medicare levy, HECS/HELP, super guarantee.',
    live: false,
    color: '#639922',
    bg: '#EAF3DE',
    darkColor: '#7DBB2A',
  },
  {
    name: 'Novated Lease Calculator',
    desc: 'EV and car novated lease tax savings vs. buying outright and claiming KMs.',
    live: false,
    color: '#BA7517',
    bg: '#FAEEDA',
    darkColor: '#D9931E',
  },
  {
    name: 'Borrowing Power Calculator',
    desc: 'Income, expenses, existing debts and HECS impact on your max loan estimate.',
    live: false,
    color: '#D85A30',
    bg: '#FAECE7',
    darkColor: '#E8754F',
  },
  {
    name: 'First Home Super Saver (FHSSS) Calculator',
    desc: 'Extra withdrawable super amount for a first home deposit via voluntary contributions.',
    live: false,
    color: '#378ADD',
    bg: '#E6F1FB',
    darkColor: '#5BA4E8',
  },
  {
    name: 'Retirement / Super Projection Calculator',
    desc: 'Current balance, contributions, employer match and compound growth to 65.',
    live: false,
    color: '#7F77DD',
    bg: '#EEEDFE',
    darkColor: '#9E98E8',
  },
  {
    name: 'Rent vs. Buy Calculator',
    desc: 'Stamp duty, opportunity cost of deposit, rent vs. property growth assumptions.',
    live: false,
    color: '#1D9E75',
    bg: '#E1F5EE',
    darkColor: '#27C491',
  },
  {
    name: 'Capital Gains Tax Calculator',
    desc: 'Purchase price, holding period, 50% CGT discount and marginal tax rate.',
    live: false,
    color: '#D4537E',
    bg: '#FBEAF0',
    darkColor: '#E87099',
  },
  {
    name: 'Redundancy / Termination Pay Calculator',
    desc: 'Base pay, years of service, notice period, leave payout and tax-free threshold.',
    live: false,
    color: '#E24B4A',
    bg: '#FCEBEB',
    darkColor: '#E86665',
  },
  {
    name: 'Salary Sacrifice Calculator',
    desc: 'Tax saved vs. take-home hit, modelled against the $30k concessional cap.',
    live: false,
    color: '#888780',
    bg: '#F1EFE8',
    darkColor: '#AAAAAA',
  },
];

export default function Home() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="home-wrap">
      <div className="calc-topbar">
        <span className="calc-brand">2176 Studios<span className="brand-dot" /></span>
        <div className="topbar-actions">
          <a className="btn-icon" title="Feedback / Support" href="mailto:support@2176studios.com"><IconBubble /></a>
          <button className="btn-icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><IconSun /></button>
        </div>
      </div>

      <div className="home-hero">
        <h1 className="home-title">Australian Financial Calculators</h1>
        <p className="home-subtitle">Free, no-account tools built for the Australian tax and finance system.</p>
      </div>

      <div className="app-list">
        {APPS.map((app) => {
          const card = (
            <div
              className={`app-card ${app.live ? 'app-card--live' : 'app-card--soon'}`}
              style={{ '--app-color': app.color, '--app-color-dark': app.darkColor, '--app-bg': app.bg }}
            >
              <div className="app-card-dot" />
              <div className="app-card-body">
                <div className="app-card-name">{app.name}</div>
                <div className="app-card-desc">{app.desc}</div>
              </div>
              <div className="app-card-status">
                {app.live ? 'Open →' : 'Coming soon'}
              </div>
            </div>
          );

          return app.live
            ? <Link key={app.name} to={app.href} className="app-card-link">{card}</Link>
            : <div key={app.name} className="app-card-link app-card-link--disabled">{card}</div>;
        })}
      </div>
    </div>
  );
}
