'use strict';
// Step 53: the interactive QA checklist (docs/qa-checklist-v4.7.0.html). BR6.1 to BR6.6, NFR1.3, NFR8.5, FR6.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../a11y.js');

const root = path.join(__dirname, '..');
const file = path.join(root, 'docs', 'qa-checklist-v4.7.0.html');
const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const items = [...html.matchAll(/<li class="qa-item" id="([^"]+)" data-req="([^"]+)">/g)].map((m) => ({ id: m[1], req: m[2].split(/\s+/) }));
const covered = new Set(items.flatMap((i) => i.req));
const script = (html.match(/<script>\n([\s\S]*?)<\/script>/) || [])[1] || '';

function tokens() {
  const block = (html.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
  const map = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) map[m[1]] = m[2];
  return map;
}

test('BR6.1: the file exists, is RTL Hebrew and has a title and one h1', () => {
  assert.ok(fs.existsSync(file), 'docs/qa-checklist-v4.7.0.html is missing');
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
});

test('BR6.1: standalone, no network and no dependencies', () => {
  assert.ok(html.length > 0);
  assert.ok(!/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|importScripts|eval)\s*\(/.test(script), 'the script talks to the network or evaluates code');
  assert.ok(!/\bnew Function\b/.test(script));
  assert.ok(!/<script[^>]+\ssrc=/.test(html), 'external script');
  assert.ok(!/<link\b/.test(html), 'external stylesheet');
  assert.ok(!/@import|url\(/.test(html), 'external CSS resource');
  assert.ok(!/(?:src|href)="https?:/.test(html), 'external URL');
});

test('BR6.1: every static control has an accessible name', () => {
  const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(inputs.length >= 1);
  for (const tag of inputs) {
    const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
    const labelled = /aria-label="[^"]+"/.test(tag) || (id && new RegExp(`<label[^>]*\\bfor="${id}"`).test(html));
    assert.ok(labelled, `no label for ${tag}`);
  }
  for (const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) {
    assert.ok(m[1].replace(/<[^>]+>/g, '').trim().length > 0, 'a button has no text');
  }
  assert.match(html, /<a class="skip" href="#qa-list">/);
});

test('BR6.1: the controls the script builds are labelled and grouped', () => {
  assert.match(script, /createElement\('label'\)/);
  assert.match(script, /setAttribute\('role', 'radiogroup'\)/);
  assert.match(script, /aria-labelledby/);
  assert.match(script, /setAttribute\('aria-label', STR\.noteFor \+ id\)/);
  assert.match(html, /id="qa-summary" role="status"/);
});

test('BR6.2: every item has a unique id and a data-req, and the ids are well formed', () => {
  assert.ok(items.length >= 40, `only ${items.length} items`);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  for (const i of items) assert.match(i.id, /^QA-[A-Z0-9]+-\d+$/);
  assert.equal((html.match(/class="qa-item"/g) || []).length, items.length, 'an item lacks data-req');
});

test('BR6.2: FR1 to FR6 and NFR1 to NFR4 are all covered', () => {
  for (const r of ['FR1', 'FR2', 'FR3', 'FR4', 'FR5', 'FR6', 'NFR1', 'NFR2', 'NFR3', 'NFR4']) assert.ok(covered.has(r), `${r} is not covered`);
});

test('BR6.2: the six export tiles, the PDF fallback, R-06 to R-10, NVDA and VoiceOver are covered', () => {
  for (const r of ['tile-pdf', 'tile-html', 'tile-live', 'tile-print', 'tile-md', 'tile-docx', 'pdf-fallback', 'R-06', 'R-07', 'R-08', 'R-09', 'R-10', 'NVDA', 'VoiceOver']) {
    assert.ok(covered.has(r), `${r} is not covered`);
  }
});

test('BR6.2: the R-07 item states the known limitation', () => {
  const r07 = html.match(/id="QA-FR5-2"[^>]*>([^<]*(?:<code>[^<]*<\/code>[^<]*)*)<\/li>/);
  assert.ok(r07, 'R-07 item not found');
  assert.match(r07[1], /מגבלה ידועה/);
  assert.match(r07[1], /BACKLOG/);
});

test('BR6.3: a passed item is green and is marked with a check mark in text', () => {
  assert.match(html, /\.qa-item\.is-pass\s*\{[^}]*var\(--pass-bg\)/);
  assert.match(script, /' is-pass'/);
  assert.match(script, /pass: '✓ תקין'/);
  assert.match(script, /fail: '✗ נכשל'/);
  assert.match(script, /unchecked: 'טרם נבדק'/);
});

test('BR6.4: autosave to localStorage under the key mdw_qa_v470, with a message when it fails', () => {
  assert.match(script, /var KEY = 'mdw_qa_v470'/);
  assert.match(script, /localStorage\.setItem\(KEY/);
  assert.match(script, /localStorage\.getItem\(KEY/);
  assert.match(script, /catch \(e\) \{ showStorageMsg\(true\); \}/);
  assert.ok(html.includes(`id="qa-storage-msg" role="status" hidden>לא ניתן לשמור אוטומטית, השתמשו ב'שמור עותק'</p>`));
});

test('BR6.5: the "שמור עותק" button downloads a copy with the state embedded, the embedded state wins only if newer', () => {
  assert.match(html, /<button type="button" id="qa-save-copy">שמור עותק<\/button>/);
  assert.match(html, /<script type="application\/json" id="qa-embedded">null<\/script>/);
  assert.match(script, /a\.download = /);
  assert.match(script, /emb\.textContent = JSON\.stringify\(state\)/);
  assert.match(script, /ts\(saved\) >= ts\(embedded\)/);
  assert.match(script, /updatedAt/);
});

test('NFR1.3: all text pairs in the file reach WCAG AA (computed with MdA11y.contrast on the file\'s own tokens)', () => {
  const t = tokens();
  for (const k of ['bg', 'bg-subtle', 'text', 'text-muted', 'border', 'accent', 'accent-fg', 'focus', 'pass-bg', 'pass-fg', 'pass-border', 'fail-bg', 'fail-fg', 'fail-border', 'warn-bg', 'warn-fg', 'warn-border']) {
    assert.ok(t[k], `token --${k} missing`);
  }
  const text = [['text', 'bg'], ['text', 'bg-subtle'], ['text-muted', 'bg'], ['text-muted', 'bg-subtle'], ['accent-fg', 'accent'], ['pass-fg', 'pass-bg'], ['fail-fg', 'fail-bg'], ['warn-fg', 'warn-bg']];
  for (const [fg, bg] of text) {
    const r = A.contrast(t[fg], t[bg]);
    assert.ok(r >= 4.5, `--${fg} on --${bg} = ${r.toFixed(2)} < 4.5`);
  }
  const nonText = [['border', 'bg'], ['border', 'bg-subtle'], ['focus', 'bg'], ['focus', 'bg-subtle'], ['focus', 'pass-bg'], ['focus', 'fail-bg'], ['pass-border', 'bg'], ['fail-border', 'bg'], ['warn-border', 'bg']];
  for (const [fg, bg] of nonText) {
    const r = A.contrast(t[fg], t[bg]);
    assert.ok(r >= 3, `--${fg} on --${bg} = ${r.toFixed(2)} < 3`);
  }
});

test('NFR1.3: colours are used only through tokens, and the focus ring is at least 3px', () => {
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  const outside = css.replace(/:root\s*\{[\s\S]*?\}/, '');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(outside), 'a hex colour outside :root');
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*3px solid var\(--focus\)/);
});

test('BR6.6: the checklist is not shipped in dist/ and not precached', () => {
  assert.ok(!/qa-checklist/.test(read('scripts/build-dist.js')));
  assert.ok(!/qa-checklist/.test(read('sw.js')));
});
