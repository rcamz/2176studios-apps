import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import buildInfo from './vite-plugin-buildinfo.js';
import appRoutes from './vite-plugin-approutes.js';
import { TRACKED_PATHS } from '../scripts/tracked-paths.mjs';
import { APP_ROUTES } from '../core/src/appRoutes.js';
import { APP_META } from '../core/src/appMeta.js';

// Set by scripts/build-app.mjs. Unset for the full web site.
const APP_TARGET = process.env.VITE_APP_TARGET || null;

export default defineConfig({
  // Injected as literals rather than read from import.meta.env at runtime.
  // Rollup does not propagate an imported const across module boundaries well
  // enough to prove a branch dead, so `IS_STANDALONE` left the AdSense markup
  // and the support link sitting in every app bundle. A define folds.
  define: {
    __IS_STANDALONE__: JSON.stringify(Boolean(APP_TARGET)),
    __APP_TARGET__: JSON.stringify(APP_TARGET),
  },
  plugins: [
    react(),
    buildInfo({ paths: TRACKED_PATHS, root: '..' }),
    appRoutes({ routes: APP_ROUTES, meta: APP_META, target: APP_TARGET }),
  ],
  test: {
    // The calculation tests moved to the core package with the code they
    // cover; vitest is installed here, so it reaches across to find them.
    include: [
      'src/**/*.test.{js,jsx}',
      '../core/src/**/*.test.{js,jsx}',
      './*.test.js',
      '../scripts/**/*.test.mjs',
      '../scripts/**/*.test.js',
    ],
  },
});
