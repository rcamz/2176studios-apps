// The canonical list of routes, one per shippable app.
//
// Lives in core because it is app metadata rather than web plumbing: the
// version manifest, the sitemap generator and the per-app store listings all
// key off these ids, and each standalone build needs to know which one it is.

export const APP_ROUTES = [
  { id: 'home',            href: '/',                     name: 'Home',                   standalone: false },
  { id: 'mortgage',        href: '/mortgagecalc',         name: 'Mortgage Repayments',    standalone: true },
  { id: 'paytax',          href: '/paytaxcalc',           name: 'Pay / Tax',              standalone: true },
  { id: 'borrowingpower',  href: '/borrowingpowercalc',   name: 'Borrowing Power',        standalone: true },
  { id: 'rentvbuy',        href: '/rentvbuycalc',         name: 'Rent vs. Buy',           standalone: true },
  { id: 'cgt',             href: '/cgtcalc',              name: 'Capital Gains Tax',      standalone: true },
  { id: 'redundancy',      href: '/redundancycalc',       name: 'Redundancy Pay',         standalone: true },
  { id: 'salarysacrifice', href: '/salarysacrificecalc',  name: 'Salary Sacrifice',       standalone: true },
  { id: 'fhsss',           href: '/fhssscalc',            name: 'First Home Super Saver', standalone: true },
  { id: 'retirement',      href: '/retirementcalc',       name: 'Retirement / Super',     standalone: true },
  { id: 'novatedlease',    href: '/novatedleasecalc',     name: 'Novated Lease',          standalone: true },
  { id: 'savings',         href: '/savingscalc',          name: 'Savings',                standalone: true },
  { id: 'health',          href: '/healthcalc',           name: 'Health',                 standalone: true },
];

export const SITE_ORIGIN = 'https://2176studios.com';

export const routeFor = (id) => APP_ROUTES.find((r) => r.id === id) ?? null;
export const idForPath = (path) => APP_ROUTES.find((r) => r.href === path)?.id ?? null;
export const standaloneApps = () => APP_ROUTES.filter((r) => r.standalone);
