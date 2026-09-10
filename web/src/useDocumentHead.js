import { useEffect } from 'react';
import { SITE_ORIGIN } from '../../core/src/appRoutes.js';

// Manages the document head for a client-rendered SPA.
//
// Every route previously shared the one <title> baked into index.html, which
// announced all thirteen pages as the mortgage calculator. Search engines saw
// thirteen duplicates, and every shared link — from a Share button that is a
// headline feature — previewed with no title, description or image.

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
  return el;
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} [opts.path]        Route path, for the canonical URL.
 * @param {string} [opts.ogTitle]
 * @param {string} [opts.ogDescription]
 * @param {string[]} [opts.keywords]
 * @param {object} [opts.structuredData]  JSON-LD, omitted when absent.
 */
export function useDocumentHead({
  title, description, path = '/', ogTitle, ogDescription, keywords, structuredData,
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const canonical = SITE_ORIGIN + (path === '/' ? '' : path);

    if (title) document.title = title;
    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
    }
    if (keywords?.length) {
      upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywords.join(', ') });
    }

    upsertLink('canonical', canonical);

    // Open Graph, so a shared link previews with something. Twitter falls back
    // to these when its own tags are absent, apart from the card type.
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: ogTitle || title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: ogDescription || description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: '2176 Studios' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });

    if (structuredData) upsertJsonLd('ld-app', structuredData);
  }, [title, description, path, ogTitle, ogDescription, structuredData, keywords?.join(',')]);
}
