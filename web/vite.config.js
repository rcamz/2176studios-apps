import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import buildInfo from './vite-plugin-buildinfo.js';

// Every path the version manifest reports on. Kept here rather than imported
// from src so the plugin has no dependency on application code.
const TRACKED = [
  'web/src/Home.jsx', 'web/src/Home.css',
  'web/src/CalcInstance.jsx', 'web/src/MortgageCalc.jsx',
  'web/src/PayTaxInstance.jsx', 'web/src/PayTaxCalc.jsx',
  'web/src/BorrowingPowerInstance.jsx', 'web/src/BorrowingPowerCalc.jsx', 'web/src/lib/borrowingpower.js',
  'web/src/RentVBuyInstance.jsx', 'web/src/RentVBuyCalc.jsx', 'web/src/lib/rentvbuy.js',
  'web/src/CGTInstance.jsx', 'web/src/CGTCalc.jsx', 'web/src/lib/cgt.js',
  'web/src/RedundancyInstance.jsx', 'web/src/RedundancyCalc.jsx', 'web/src/lib/redundancy.js',
  'web/src/SalarySacrificeInstance.jsx', 'web/src/SalarySacrificeCalc.jsx', 'web/src/lib/salarysacrifice.js',
  'web/src/FHSSSInstance.jsx', 'web/src/FHSSSCalc.jsx', 'web/src/lib/fhsss.js',
  'web/src/RetirementInstance.jsx', 'web/src/RetirementCalc.jsx', 'web/src/lib/retirement.js',
  'web/src/NovatedLeaseInstance.jsx', 'web/src/NovatedLeaseCalc.jsx', 'web/src/lib/novatedlease.js',
  'web/src/SavingsInstance.jsx', 'web/src/SavingsCalc.jsx', 'web/src/lib/savings.js',
  'web/src/HealthInstance.jsx', 'web/src/HealthCalc.jsx', 'web/src/lib/health.js',
  'web/src/lib/rates', 'web/src/lib/paytax.js', 'web/src/lib/amortize.js',
  'web/src/lib/stampduty.js', 'web/src/lib/lmi.js', 'web/src/lib/format.js',
  'web/src/lib/urlState.js', 'web/src/lib/vectors',
  'web/src/calc-shared.css', 'web/src/base.css',
];

export default defineConfig({
  plugins: [
    react(),
    buildInfo({ paths: TRACKED, root: '..' }),
  ],
});
