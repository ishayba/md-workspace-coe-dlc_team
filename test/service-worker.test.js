const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

test('service worker precaches the studio files so the editor works offline', () => {
  assert.match(sw, /'\.\/css-studio\.js'/);
  assert.match(sw, /'\.\/css-studio-ui\.js'/);
});

test('service worker never caches the project-library API (stale theme lists)', () => {
  assert.match(sw, /pathname\.startsWith\('\/api\/'\)/);
});

test('every precached file really exists', () => {
  const assets = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((f) => f && !f.endsWith('/'));
  for (const f of assets) assert.ok(fs.existsSync(path.join(__dirname, '..', f)), `missing precached file: ${f}`);
});
