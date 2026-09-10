# Standalone Android apps

Each calculator ships twice: as a route on 2176studios.com, and as its own
Play listing. This directory holds the native wrapper for each app. The web
code is shared verbatim — there is no forked copy of a calculator.

```
node scripts/build-app.mjs health            # debug APK
node scripts/build-app.mjs health --release  # release, needs signing config
```

## How one app is carved out of the site

`web/vite-plugin-approutes.js` emits the route table as a virtual module. When
`VITE_APP_TARGET` is set it emits **only that calculator plus the About page**,
so the other twelve are never imported and Rollup never sees them.

This matters more than it sounds. The obvious approach — import all thirteen,
branch on a flag — leaves every calculator in every binary, because the route
table references them all and Rollup cannot prove the rest are dead. Measured
on the Health app:

| | bundle |
|---|---|
| Full site | 1,087 kB |
| Health, naive flag | ~1,080 kB (no saving at all) |
| Health, generated routes | **635 kB** |

Two other things are stripped for an app build:

- **The AdSense script** is removed from `index.html`, and `AdUnit` renders
  nothing. AdSense is a web product; using it inside an app violates the
  AdSense policy. App ads will be AdMob, drawn natively outside the WebView.
- **Play Store listing copy.** `appMeta.js` carries the full store description
  for all thirteen apps, ~40KB. The plugin emits just the head metadata for
  the ids in the build, so none of it reaches an app binary or a browser.

## The flags must be `define`, not `import.meta.env`

`IS_STANDALONE` is injected via Vite's `define` as a literal. Reading
`import.meta.env.VITE_APP_TARGET` and exporting a derived const does **not**
work: Rollup will not propagate an imported constant across module boundaries
well enough to prove a branch dead, and the AdSense markup and the Buy Me a
Coffee link both survived into the app bundle that way. There is a test for
each.

## Share links

Inside the app the origin is `http://localhost`, so `window.location.href` —
what every Share button used — produces a link that opens nothing. Every
shared link from the app would have been dead.

`canonicalShareUrl()` in `web/src/lib/appTarget.js` rewrites the origin to the
public site and maps the app's `/` back to the calculator's real route. The
query string, which is where the inputs actually live, is carried across
untouched. On the web it returns `window.location.href` unchanged.

## Per-app checklist

- [ ] `appId` — **permanent once published.** `com.studios2176.<app>`. No
      segment may start with a digit, which is why it is not `com.2176studios`
- [ ] `versionCode` — integer, must increase every upload
- [ ] `versionName` — the human version, e.g. `0.8.0`
- [ ] Icons: `python3 scripts/make-icons.py <app>` then copy `android-res/`
- [ ] `targetSdk 35` — Play requires it for new apps; Capacitor's template
      still generates 34
- [ ] Enrol in Play App Signing on first upload. The upload key is
      unrecoverable if lost

## Known gaps

- **The rate registry is not tree-shaken.** `ratesFor()` resolves every domain
  from one index, so the Health app still carries novated lease FBT scalars and
  Age Pension thresholds it will never read. Costs perhaps 40KB; fixing it
  means per-domain resolution.
- **Fonts load from Google.** First launch without a network falls back to the
  system sans stack. Bundling the two faces would make the app fully offline.
