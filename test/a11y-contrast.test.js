// v4.7.0 — NFR2.2 / NFR2.3 / BR7.1: contrast of the design tokens, computed from the CSS in index.html
// (the values are read from the real token blocks, never copied into this test).
// Thresholds: text 4.5:1 (7:1 in .hc); borders, focus rings and graphic parts 3:1.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../a11y');

const css = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function block(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp('(?:^|\\n)\\s*' + esc + '\\s*\\{([^}]*)\\}').exec(css);
  return m ? m[1] : null;
}

function declarations(body) {
  const out = {};
  if (!body) return out;
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const blocks = {
  root: declarations(block(':root')),
  dark: declarations(block('[data-theme="dark"]')),
  hc: declarations(block('.hc')),
  hcDark: declarations(block('.hc[data-theme="dark"]'))
};

const MODES = {
  day: Object.assign({}, blocks.root),
  night: Object.assign({}, blocks.root, blocks.dark),
  'hc-day': Object.assign({}, blocks.root, blocks.hc),
  'hc-night': Object.assign({}, blocks.root, blocks.dark, blocks.hc, blocks.hcDark)
};

function resolve(map, name, depth) {
  if ((depth || 0) > 8) throw new Error('token cycle at ' + name);
  const raw = map[name];
  if (raw === undefined) throw new Error('token not defined: ' + name);
  const v = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw);
  return v ? resolve(map, v[1], (depth || 0) + 1) : raw;
}

const colour = (map, ref) => (ref.startsWith('#') ? ref : resolve(map, ref));

// [foreground, background, kind] — kind "text" needs 4.5 (7 in .hc), kind "ui" needs 3 (NFR2.3)
const TEXT_ON_SURFACES = [];
for (const fg of ['--text-main', '--text-muted']) {
  for (const bg of ['--bg-app', '--bg-surface', '--bg-surface-subtle']) TEXT_ON_SURFACES.push([fg, bg, 'text']);
}
const PAIRS = TEXT_ON_SURFACES.concat([
  ['--focus-ring', '--bg-app', 'ui'],
  ['--focus-ring', '--bg-surface', 'ui'],
  ['--focus-ring-fg', '--focus-ring', 'text'],
  ['--text-main', '--highlight-bg', 'text'],
  ['#ffffff', '--selected-bg', 'text'],
  ['#ffffff', '--accent-warning-strong', 'text'],
  ['--badge-fg', '--badge-pdf', 'text'],
  ['--badge-fg', '--badge-html', 'text'],
  ['--badge-fg', '--badge-live', 'text'],
  ['--badge-fg', '--badge-print', 'text'],
  ['--badge-fg', '--badge-md', 'text'],
  ['--badge-fg', '--badge-docx', 'text'],
  ['--border-control', '--bg-surface', 'ui'],
  ['--dot-changed', '--bg-surface', 'ui'],
  ['--reading-ring', '#ffffff', 'ui'],
  ['#1f2937', '--reading-bg', 'text']      // the preview stays light in every mode (BR2.5)
]);

function failures(modeName) {
  const map = MODES[modeName];
  const bad = [];
  for (const [fg, bg, kind] of PAIRS) {
    const min = kind === 'ui' ? 3 : (modeName.startsWith('hc') ? 7 : 4.5);
    let ratio;
    try { ratio = A.contrast(colour(map, fg), colour(map, bg)); } catch (e) { bad.push(`${fg} on ${bg}: ${e.message}`); continue; }
    if (ratio < min) bad.push(`${fg} (${colour(map, fg)}) on ${bg} (${colour(map, bg)}) = ${ratio.toFixed(2)} < ${min}`);
  }
  return bad;
}

test('the four token blocks exist in index.html: :root, [data-theme="dark"], .hc and .hc[data-theme="dark"]', () => {
  assert.ok(Object.keys(blocks.root).length > 10, ':root');
  assert.ok(Object.keys(blocks.dark).length > 5, '[data-theme="dark"]');
  assert.ok(Object.keys(blocks.hc).length > 5, '.hc');
  assert.ok(blocks.hcDark['--focus-ring'], '.hc[data-theme="dark"] --focus-ring');
});

test('every token used by the pairs is defined (design-system-mapping.md §3)', () => {
  const needed = new Set(PAIRS.flatMap(([a, b]) => [a, b]).filter((t) => t.startsWith('--')));
  ['--border-w', '--focus-w'].forEach((t) => needed.add(t));
  for (const name of Object.keys(MODES)) {
    for (const t of needed) assert.ok(MODES[name][t] !== undefined, `${t} missing in ${name}`);
  }
});

test('contrast (day): all pairs pass 4.5:1 for text and 3:1 for borders and graphics', () => {
  assert.deepEqual(failures('day'), []);
});

test('contrast (night): all pairs pass 4.5:1 for text and 3:1 for borders and graphics', () => {
  assert.deepEqual(failures('night'), []);
});

test('contrast (.hc day): text reaches 7:1, borders and focus rings 3:1', () => {
  assert.deepEqual(failures('hc-day'), []);
});

test('contrast (.hc night): text reaches 7:1, borders and focus rings 3:1', () => {
  assert.deepEqual(failures('hc-night'), []);
});

test('--text-muted was raised to a safe margin in both themes (day #475569, night #cbd5e1)', () => {
  assert.equal(MODES.day['--text-muted'].toLowerCase(), '#475569');
  assert.equal(MODES.night['--text-muted'].toLowerCase(), '#cbd5e1');
  assert.equal(MODES.night['--border-strong'].toLowerCase(), '#64748b');
});

test('the day --border-strong was NOT changed (decorative borders keep their look); controls use --border-control', () => {
  assert.equal(MODES.day['--border-strong'].toLowerCase(), '#cbd5e1');
  assert.equal(MODES.day['--border-control'].toLowerCase(), '#64748b');
  assert.ok(A.contrast(MODES.day['--border-control'], MODES.day['--bg-surface']) >= 3);
});

test('.hc redefines tokens only (no selectors for single components) and raises border / focus weights', () => {
  const body = block('.hc');
  assert.ok(body && !/[{]/.test(body));
  assert.equal(MODES['hc-day']['--border-w'], '2px');
  assert.equal(MODES.day['--border-w'], '1px');
  assert.equal(MODES.day['--focus-w'], '3px');
  assert.equal(MODES['hc-day']['--text-muted'], 'var(--text-main)');
});

test('.hc night uses the yellow focus ring with dark text on it (13.5:1)', () => {
  const m = MODES['hc-night'];
  assert.equal(colour(m, '--focus-ring').toLowerCase(), '#fde047');
  assert.ok(A.contrast(colour(m, '--focus-ring-fg'), colour(m, '--focus-ring')) > 13);
});

test('the pair list is a real check: a deliberately weak token is detected (sanity)', () => {
  const weak = Object.assign({}, MODES.day, { '--text-muted': '#999999' });
  assert.ok(A.contrast(colour(weak, '--text-muted'), colour(weak, '--bg-surface')) < 4.5);
});

test('the reading highlight and the new badges do not depend on the UI theme (fixed in every mode)', () => {
  for (const name of Object.keys(MODES)) {
    const m = MODES[name];
    assert.equal(colour(m, '--reading-ring').toLowerCase(), '#1d4ed8', name);
    assert.equal(colour(m, '--reading-bg').toLowerCase(), '#dbeafe', name);
  }
});
