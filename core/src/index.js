// Platform-agnostic calculation core.
//
// Everything here is pure JavaScript with no React, no DOM and no build-tool
// coupling, so it can be bundled unchanged into each standalone Android app
// as well as the web build. Anything that touches `window`, React or a Vite
// virtual module stays in the web package.

export * from './rates/index.js';
export * from './paytax.js';
export * from './amortize.js';
export * from './stampduty.js';
export * from './lmi.js';
export * from './cgt.js';
export * from './redundancy.js';
export * from './salarysacrifice.js';
export * from './fhsss.js';
export * from './retirement.js';
export * from './novatedlease.js';
export * from './savings.js';
export * from './health.js';
export * from './borrowingpower.js';
export * from './rentvbuy.js';
export * from './format.js';
export * from './workings.js';
