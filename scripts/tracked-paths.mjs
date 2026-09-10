// Single list of the paths the version manifest reports on.
//
// Previously duplicated between the Vite plugin config and the snapshot
// script, which meant adding a file to one and forgetting the other would
// silently drop it from the stocktake.

export const CALC_PATHS = [
  'web/src/Home.jsx', 'web/src/Home.css',
  'web/src/CalcInstance.jsx', 'web/src/MortgageCalc.jsx',
  'web/src/PayTaxInstance.jsx', 'web/src/PayTaxCalc.jsx',
  'web/src/BorrowingPowerInstance.jsx', 'web/src/BorrowingPowerCalc.jsx', 'core/src/borrowingpower.js',
  'web/src/RentVBuyInstance.jsx', 'web/src/RentVBuyCalc.jsx', 'core/src/rentvbuy.js',
  'web/src/CGTInstance.jsx', 'web/src/CGTCalc.jsx', 'core/src/cgt.js',
  'web/src/RedundancyInstance.jsx', 'web/src/RedundancyCalc.jsx', 'core/src/redundancy.js',
  'web/src/SalarySacrificeInstance.jsx', 'web/src/SalarySacrificeCalc.jsx', 'core/src/salarysacrifice.js',
  'web/src/FHSSSInstance.jsx', 'web/src/FHSSSCalc.jsx', 'core/src/fhsss.js',
  'web/src/RetirementInstance.jsx', 'web/src/RetirementCalc.jsx', 'core/src/retirement.js',
  'web/src/NovatedLeaseInstance.jsx', 'web/src/NovatedLeaseCalc.jsx', 'core/src/novatedlease.js',
  'web/src/SavingsInstance.jsx', 'web/src/SavingsCalc.jsx', 'core/src/savings.js',
  'web/src/HealthInstance.jsx', 'web/src/HealthCalc.jsx', 'core/src/health.js',
];

export const SHARED_PATHS = [
  'core/src/rates', 'core/src/paytax.js', 'core/src/amortize.js',
  'core/src/stampduty.js', 'core/src/lmi.js', 'core/src/format.js',
  'core/src/workings.js', 'core/src/vectors',
  'web/src/lib/urlState.js',
  'web/src/calc-shared.css', 'web/src/base.css',
];

export const TRACKED_PATHS = [...CALC_PATHS, ...SHARED_PATHS];
