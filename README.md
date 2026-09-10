# 2176 Studios — Australian calculators

Twelve calculators, deployed as a web app at `2176studios.com` and packaged
individually for the Play Store. Correctness is the product: every figure is
verified against a primary source and pinned by a regression test.

## Layout

```
core/          Portable calculation layer. No React, no DOM, no build tooling.
  src/rates/     Date-keyed rate registry (see below)
  src/*.js       One module per calculator, plus the tax engine and formatters
  src/vectors/   111 regression vectors transcribed from the rate audit
  src/appRoutes  Canonical route and app id list
  src/appMeta    Web <head> and Play Store listing content, one source for both
web/           The web app: React components, URL state, build config
scripts/       Version snapshot, SEO generation, shared path list
```

`core/` is what each standalone app bundles. Anything touching `window`,
React or a Vite virtual module stays in `web/`.

## Commands

```
npm test                  808 tests
npm run build             Production build
npm run dev               Dev server
npm run version:snapshot  Refresh per-file git history — run before committing
npm run seo:generate      Regenerate robots.txt and sitemap.xml
```

## Rates are keyed to dates, not financial years

Several figures change *within* a financial year — Age Pension on 20 September,
WA duty on 7 May, TAS on 30 June, ACT on 1 July, QLD on 1 August, FBT on
1 April. A single per-year constants object gives wrong answers for part of
the year, so every rate is a dated series resolved against a specific date:

```js
import { ratesFor } from '@2176studios/core';
const r = ratesFor('2026-09-10');
```

Each entry carries `effective_from`, `effective_to`, a confidence flag
(`P` primary, `S` secondary, `D` derived, `I` inferred, `UNVERIFIED`) and a
source reference back to `FY2026-27-rates-audit-v2.md`.

## Updating rates

1. Re-verify against the primary source. `DEFERRED.md` has the calendar and the
   list of figures still carrying a caveat.
2. Add a **new dated entry** rather than editing the existing one. Old entries
   keep past dates resolving correctly and back the financial-year selector.
3. Update `RATES_VERIFIED` in `web/src/lib/version.js`.
4. Run the tests. The vectors in `core/src/vectors/` are the safety net —
   55 of them are marked `[trap]` because they catch errors that produce
   plausible-looking wrong numbers rather than obvious failures.

## Versioning

`web/src/lib/version.js` carries a hand-curated semver per calculator; git
supplies the dates and commits at build time. A hand-maintained "last updated"
date is worse than none, because it eventually goes stale and then confidently
asserts something false.

CI clones shallow, so per-file history comes from a snapshot committed
alongside the code. **Run `npm run version:snapshot` before committing.**

## Things that will bite you

- **Never commit `package-lock.json` from a machine behind a private npm
  mirror.** A lockfile with internal `resolved` URLs broke every Cloudflare
  build for two hours. It is gitignored for that reason.
- `git rev-list` silently rejects `--follow`. Count log entries instead.
- Ad slots are placeholders (`XXXXXXXXXX`) pending AdSense approval. They
  render as visible grey boxes.
- The expense benchmark in Borrowing Power is **not** HEM. Those tables are
  proprietary and unpublished; the name must not be used.
- Division 296 is flagged, never computed — realised earnings is a fund-level
  figure that cannot be derived from a projection's inputs.
- Health hard blocks must **withhold** the number, not display it with a
  warning beside it.

## Reference documents

| File | What it is |
|---|---|
| `FY2026-27-rates-audit-v2.md` | Verified rates, source-by-source, with test vectors |
| `calc-suite-audit.md` | The original defect audit this work addressed |
| `DEFERRED.md` | Deferred features, unverified figures, re-verification calendar |
| `rates-verification-prompt.md` | Prompt for re-running the rate verification |
