const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

test('service worker precaches the studio files so the editor works offline', () => {
  assert.match(sw, /'\.\/css-studio\.js'/);
  assert.match(sw, /'\.\/css-studio-ui\.js'/);
});

test('v4.7.0: service worker precaches the four accessibility and export modules (NFR8.1)', () => {
  for (const f of ['a11y.js', 'a11y-ui.js', 'export-core.js', 'export-ui.js']) {
    assert.ok(sw.includes(`'./${f}'`), `sw.js does not precache ${f}`);
  }
});

test('v4.7.0: the cache name carries the version and a build date (NFR8.2)', () => {
  assert.match(sw, /const CACHE = 'md-workspace-offline-v4\.7\.0-build-\d{8}-\d{2}'/);
});

test('v4.7.0: build-dist lists every new module and leaves the QA checklist out (BR6.6)', () => {
  const build = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-dist.js'), 'utf8');
  for (const f of ['a11y.js', 'a11y-ui.js', 'export-core.js', 'export-ui.js']) {
    assert.ok(build.includes(`'${f}'`), `build-dist.js FILES lacks ${f}`);
  }
  assert.ok(!/qa-checklist/.test(build), 'the QA checklist must not be shipped in dist/');
});

test('service worker never caches the project-library API (stale theme lists)', () => {
  assert.match(sw, /pathname\.startsWith\('\/api\/'\)/);
});

test('every precached file really exists', () => {
  const assets = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((f) => f && !f.endsWith('/'));
  for (const f of assets) assert.ok(fs.existsSync(path.join(__dirname, '..', f)), `missing precached file: ${f}`);
});
