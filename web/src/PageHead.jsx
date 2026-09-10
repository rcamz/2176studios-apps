import { useMemo } from 'react';
import { useDocumentHead } from './useDocumentHead.js';
import { APP_META } from '../../core/src/appMeta.js';
import { routeFor, SITE_ORIGIN } from '../../core/src/appRoutes.js';

// Applies one route's metadata to the document head. Renders nothing.
//
// The same APP_META entry drives the Play Store listing, so the web title and
// the store title cannot drift apart.
export default function PageHead({ calcId }) {
  const meta = APP_META[calcId];
  const route = routeFor(calcId);

  const structuredData = useMemo(() => {
    if (!meta || !route) return null;
    // WebApplication is what Google expects for a tool like this, and it is
    // what makes a calculator eligible for a rich result.
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: meta.ogTitle || meta.title,
      description: meta.description,
      url: SITE_ORIGIN + (route.href === '/' ? '' : route.href),
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
      inLanguage: 'en-AU',
      isAccessibleForFree: true,
    };
  }, [meta, route]);

  useDocumentHead({
    title: meta?.title,
    description: meta?.description,
    path: route?.href ?? '/',
    ogTitle: meta?.ogTitle,
    ogDescription: meta?.ogDescription,
    keywords: meta?.keywords,
    structuredData,
  });

  return null;
}
