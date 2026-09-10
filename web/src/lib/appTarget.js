// What this build is: the whole site, or one standalone app.
//
// VITE_APP_TARGET is set by the packaging script. Vite replaces it with a
// literal at build time, so IS_STANDALONE is a compile-time constant and the
// branches it guards are removed from the bundle rather than evaluated.

import { SITE_ORIGIN, routeFor } from '../../../core/src/appRoutes.js';

/* global __APP_TARGET__, __IS_STANDALONE__ */
// Both are replaced with literals at build time (see `define` in
// vite.config.js), so every branch guarded by IS_STANDALONE is removed from
// the bundle rather than evaluated. Reading import.meta.env here instead left
// the AdSense markup and the support link in the app build.
export const APP_TARGET = __APP_TARGET__;
export const IS_STANDALONE = __IS_STANDALONE__;

/**
 * The URL to hand someone when they tap Share.
 *
 * On the web that is simply the address bar. Inside the packaged app the
 * origin is the WebView's local host — `http://localhost`, or `capacitor://`
 * on iOS — which is meaningless to a recipient and opens nothing. Every
 * shared link from the app would be dead.
 *
 * So the app rewrites the origin to the public site, and maps its own "/"
 * back to the calculator's real route. The query string, which is where the
 * inputs actually live, is carried across untouched.
 */
export function canonicalShareUrl() {
  if (typeof window === 'undefined') return SITE_ORIGIN;

  const { pathname, search, href } = window.location;
  if (!IS_STANDALONE) return href;

  const route = routeFor(APP_TARGET);
  const onRoot = pathname === '/' || pathname === '' || pathname.endsWith('/index.html');
  const path = onRoot && route ? route.href : pathname;

  return SITE_ORIGIN + path + search;
}
