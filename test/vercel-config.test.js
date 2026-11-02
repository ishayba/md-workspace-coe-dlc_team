// Vercel must serve MD Workspace as a static site.
// Without vercel.json, Vercel's zero-config detection picks the root server.js as a Node backend entry and runs it
// as a function; server.js only exports { createServer } and listens on 127.0.0.1, so every request fails with
// 500 FUNCTION_INVOCATION_FAILED. The fix: no framework preset, build with `npm run dist`, serve dist/ as static files.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('vercel.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(path.join(root, 'vercel.json')), 'vercel.json is missing');
  assert.doesNotThrow(() => JSON.parse(read('vercel.json')));
});

test('vercel.json turns off framework detection (no backend from server.js)', () => {
  const cfg = JSON.parse(read('vercel.json'));
  assert.ok('framework' in cfg && cfg.framework === null, 'framework must be null (static, "Other")');
  assert.ok(!cfg.functions && !cfg.builds && !cfg.rewrites, 'no functions, builds or rewrites to a server');
});

test('vercel.json builds with npm run dist and serves the dist/ folder', () => {
  const cfg = JSON.parse(read('vercel.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(cfg.buildCommand, 'npm run dist');
  assert.ok(pkg.scripts && pkg.scripts.dist, 'package.json has a dist script');
  assert.strictEqual(cfg.outputDirectory, 'dist');
  assert.match(read('scripts/build-dist.js'), /path\.join\(root, 'dist'\)/, 'build-dist.js writes to dist/');
});

test('dist/ (the static output) contains index.html and the service worker', () => {
  assert.match(read('scripts/build-dist.js'), /'index\.html'/);
  assert.match(read('scripts/build-dist.js'), /'sw\.js'/);
});

test('the service worker and index.html are not cached long by the CDN (updates reach users)', () => {
  const cfg = JSON.parse(read('vercel.json'));
  const rules = (cfg.headers || []).filter((h) => h.source === '/sw.js' || h.source === '/' || h.source === '/index.html');
  assert.ok(rules.length >= 2, 'headers for /sw.js and the page');
  for (const r of rules) {
    const cc = (r.headers || []).find((h) => h.key.toLowerCase() === 'cache-control');
    assert.ok(cc && /no-cache/.test(cc.value), `Cache-Control no-cache on ${r.source}`);
  }
});
