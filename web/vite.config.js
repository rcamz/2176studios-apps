import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import buildInfo from './vite-plugin-buildinfo.js';
import { TRACKED_PATHS } from '../scripts/tracked-paths.mjs';


export default defineConfig({
  plugins: [
    react(),
    buildInfo({ paths: TRACKED_PATHS, root: '..' }),
  ],
  test: {
    // The calculation tests moved to the core package with the code they
    // cover; vitest is installed here, so it reaches across to find them.
    include: ['src/**/*.test.{js,jsx}', '../core/src/**/*.test.{js,jsx}'],
  },
});
