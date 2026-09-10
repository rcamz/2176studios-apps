// Emits the route table as a virtual module, so a standalone app build
// contains only its own calculator.
//
// The alternative — importing all thirteen and branching on a flag — leaves
// every calculator in the bundle, because the route table references them all
// and Rollup cannot prove the others are dead. Generating the import list is
// the only way the Health app does not ship the mortgage engine.

import { resolve } from 'node:path';

const VIRTUAL = 'virtual:app-routes';
const RESOLVED = '\0' + VIRTUAL;

// id -> the component file that owns the route.
const COMPONENT = {
  home:            'Home',
  mortgage:        'MortgageCalc',
  paytax:          'PayTaxCalc',
  cgt:             'CGTCalc',
  redundancy:      'RedundancyCalc',
  salarysacrifice: 'SalarySacrificeCalc',
  fhsss:           'FHSSSCalc',
  retirement:      'RetirementCalc',
  borrowingpower:  'BorrowingPowerCalc',
  novatedlease:    'NovatedLeaseCalc',
  rentvbuy:        'RentVBuyCalc',
  savings:         'SavingsCalc',
  health:          'HealthCalc',
  about:           'About',
};

export default function appRoutes({ routes, meta, target = null }) {
  // A virtual module has no location on disk, so a relative import from it
  // resolves against nothing. Imports have to be absolute paths.
  let srcDir = '';

  return {
    name: '2176-app-routes',

    configResolved(config) {
      srcDir = resolve(config.root, 'src');
    },

    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),

    load(id) {
      if (id !== RESOLVED) return null;

      // A standalone app is one calculator plus the About page, which carries
      // the privacy policy the Play listing points at and the footer links to.
      const ids = target
        ? [target, 'about']
        : routes.map((r) => r.id);

      const imports = ids
        .map((i) => `import ${COMPONENT[i]} from ${JSON.stringify(resolve(srcDir, COMPONENT[i] + '.jsx'))};`)
        .join('\n');

      const entries = [];
      for (const i of ids) {
        const route = routes.find((r) => r.id === i);
        if (!route) throw new Error(`[app-routes] unknown id "${i}"`);
        // In a standalone build the calculator also answers "/", so a cold
        // launch lands on it rather than a 404, while its real path keeps
        // working for share links opened in the app.
        if (target && i === target) entries.push(`  { path: '/', Component: ${COMPONENT[i]} },`);
        entries.push(`  { path: '${route.href}', Component: ${COMPONENT[i]} },`);
      }

      // Head metadata comes through here rather than being imported from
      // appMeta.js, because that file also carries every Play Store listing —
      // roughly 40KB of store copy that no browser and no app needs. Emitting
      // just the fields for the ids in this build keeps it out of both.
      const head = {};
      for (const i of ids) {
        const m = meta[i];
        if (!m) throw new Error(`[app-routes] no metadata for id "${i}"`);
        head[i] = {
          title: m.title,
          description: m.description,
          ogTitle: m.ogTitle,
          ogDescription: m.ogDescription,
          keywords: m.keywords,
        };
      }

      return `${imports}

export const TARGET = ${target ? `'${target}'` : 'null'};
export const HEAD_META = ${JSON.stringify(head, null, 2)};
export const ROUTES = [
${entries.join('\n')}
];
`;
    },

    // AdSense is a web product and its script has no business in a packaged
    // app. Strip it rather than rely on the ad units rendering nothing.
    transformIndexHtml(html) {
      if (!target) return html;
      return html
        .replace(/\s*<script[^>]*adsbygoogle\.js[^>]*><\/script>/g, '')
        .replace(/\s*<meta name="commission-factory-verification"[^>]*\/?>/g, '');
    },
  };
}
