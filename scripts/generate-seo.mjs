#!/usr/bin/env node
//
// Emits robots.txt and sitemap.xml from the canonical route list, so they
// cannot drift from the routes that actually exist.
//
// Run:  npm run seo:generate

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ROUTES, SITE_ORIGIN } from '../core/src/appRoutes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'web/public');
const today = new Date().toISOString().slice(0, 10);

const urls = APP_ROUTES.map((r) => {
  const loc = SITE_ORIGIN + (r.href === '/' ? '/' : r.href);
  // The index is the entry point; the calculators are the content; the
  // about/privacy page is neither, and should not compete with them.
  const priority = r.href === '/' ? '1.0' : r.standalone ? '0.8' : '0.3';
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}).join('\n');

writeFileSync(resolve(PUBLIC, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

writeFileSync(resolve(PUBLIC, 'robots.txt'),
`User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`);

console.log(`Wrote sitemap.xml (${APP_ROUTES.length} routes) and robots.txt`);
