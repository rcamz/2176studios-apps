#!/usr/bin/env node
//
// Builds one standalone Android app end to end.
//
//   node scripts/build-app.mjs health [--release]
//
// Steps: build a web bundle containing only that calculator, strip the files
// that only make sense on a web server, sync it into the Capacitor project,
// and run Gradle.

import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = process.argv[2];
const release = process.argv.includes('--release');

if (!app) {
  console.error('usage: build-app.mjs <app-id> [--release]');
  process.exit(1);
}

const APP_DIR = resolve(ROOT, 'apps', app);
if (!existsSync(APP_DIR)) {
  console.error(`No app at apps/${app}. Run "npx cap add android" there first.`);
  process.exit(1);
}

// Gradle 8 does not run on JDK 25, and the Android Gradle Plugin is only
// tested against 17 and 21. Pick a supported one rather than whatever `java`
// happens to be on PATH.
const JDK = ['/usr/lib/jvm/temurin-21-jdk-amd64', '/usr/lib/jvm/temurin-17-jdk-amd64']
  .find(existsSync);
const SDK = process.env.ANDROID_HOME
  ?? process.env.ANDROID_SDK_ROOT
  ?? join(process.env.HOME, 'Android/Sdk');

if (!JDK)          fail('No JDK 17 or 21 found. The Android Gradle Plugin does not support 25.');
if (!existsSync(SDK)) fail(`No Android SDK at ${SDK}. Set ANDROID_HOME.`);

const env = { ...process.env, JAVA_HOME: JDK, ANDROID_HOME: SDK, ANDROID_SDK_ROOT: SDK };

function fail(msg) { console.error(`\n✗ ${msg}`); process.exit(1); }
function run(cmd, cwd, extraEnv = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { cwd, env: { ...env, ...extraEnv }, stdio: 'inherit' });
  } catch {
    // execSync throws a Node stack trace, which buries whatever the tool
    // actually said — and if this script's own output is piped through
    // `tail`, the exit code you see belongs to `tail`, not to the build.
    fail(`Command failed: ${cmd}\n  in ${cwd}\n  Scroll up for the tool's own error.`);
  }
}

// ── 1. Version, from the app's package.json ────────────────────────────
// One place to bump. Play rejects an upload whose versionCode has not
// increased, and doing it by hand across twelve apps is the easiest mistake
// in the whole pipeline to make.
const pkg = JSON.parse(readFileSync(join(APP_DIR, 'package.json'), 'utf8'));
const versionName = pkg.version;
const versionCode = pkg.androidVersionCode;
if (!Number.isInteger(versionCode)) {
  fail(`apps/${app}/package.json needs an integer "androidVersionCode".`);
}

const gradlePath = join(APP_DIR, 'android/app/build.gradle');
const gradle = readFileSync(gradlePath, 'utf8')
  .replace(/versionCode \d+/, `versionCode ${versionCode}`)
  .replace(/versionName "[^"]*"/, `versionName "${versionName}"`);
writeFileSync(gradlePath, gradle);
console.log(`\n${app} ${versionName} (versionCode ${versionCode})`);

// ── 2. Web bundle, this calculator only ─────────────────────────────────
const dist = resolve(ROOT, 'web', `dist-${app}`);
rmSync(dist, { recursive: true, force: true });
run(`npx vite build --outDir dist-${app}`, resolve(ROOT, 'web'), { VITE_APP_TARGET: app });

// ── 3. Strip what only a web server needs ───────────────────────────────
// Vite copies everything in public/. Shipping robots.txt, a sitemap and two
// ads.txt files inside an APK is dead weight, and ads.txt in an app is
// meaningless — it authorises sellers for a *website*.
const WEB_ONLY = ['_headers', '_redirects', 'robots.txt', 'sitemap.xml', 'ads.txt', 'app-ads.txt'];
let stripped = 0;
for (const f of WEB_ONLY) {
  const p = join(dist, f);
  if (existsSync(p)) { rmSync(p); stripped += 1; }
}
console.log(`\nStripped ${stripped} web-only file(s) from the app bundle.`);

// Gradle needs the SDK location, and this file is machine-specific.
writeFileSync(join(APP_DIR, 'android/local.properties'), `sdk.dir=${SDK}\n`);

// ── 4. Into the native project ──────────────────────────────────────────
run('npx cap sync android', APP_DIR);

// ── 5. Gradle ───────────────────────────────────────────────────────────
const task = release ? 'assembleRelease' : 'assembleDebug';
run(`./gradlew ${task} --no-daemon`, join(APP_DIR, 'android'));

// ── 6. Report ───────────────────────────────────────────────────────────
const outDir = join(APP_DIR, 'android/app/build/outputs/apk', release ? 'release' : 'debug');
const apks = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.apk')) : [];
if (!apks.length) fail(`Gradle finished but no APK appeared in ${outDir}`);

console.log('\n─────────────────────────────────────────────');
for (const a of apks) {
  const p = join(outDir, a);
  console.log(`  ${p}`);
  console.log(`  ${(statSync(p).size / 1048576).toFixed(1)} MB`);
}
console.log('\nInstall on a connected device:');
console.log(`  ${SDK}/platform-tools/adb install -r "${join(outDir, apks[0])}"`);
