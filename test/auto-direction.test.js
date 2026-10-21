const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadFunctions } = require('../test-support/load-app');
const S = require('../css-studio');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const { detectTextDirection } = loadFunctions(['detectTextDirection']);

/* ---------- the pure rule: direction follows the language that dominates the text ---------- */

test('Hebrew text is rtl, English text is ltr', () => {
  assert.equal(detectTextDirection('שלום עולם, זו פסקה בעברית.'), 'rtl');
  assert.equal(detectTextDirection('Hello world, this is English.'), 'ltr');
});

test('other scripts: Arabic is rtl; Cyrillic and Greek are ltr', () => {
  assert.equal(detectTextDirection('مرحبا بالعالم'), 'rtl');
  assert.equal(detectTextDirection('Привет мир'), 'ltr');
  assert.equal(detectTextDirection('Γειά σου κόσμε'), 'ltr');
});

test('a Hebrew sentence that merely contains English terms stays rtl (even if it starts with one)', () => {
  assert.equal(detectTextDirection('API זה ממשק לתכנות יישומים'), 'rtl');
  assert.equal(detectTextDirection('Docker מאפשר להריץ תוכנה בסביבה מבודדת'), 'rtl');
  assert.equal(detectTextDirection('ה-API מחזיר JSON בפורמט פשוט'), 'rtl');
});

test('an English sentence that merely contains a Hebrew word stays ltr', () => {
  assert.equal(detectTextDirection('This is a short note about the word שלום in a sentence'), 'ltr');
});

test('on a tie the first strong letter decides', () => {
  assert.equal(detectTextDirection('abc אבג'), 'ltr');
  assert.equal(detectTextDirection('אבג abc'), 'rtl');
});

test('text with no letters has no direction of its own (inherits)', () => {
  for (const t of ['', '   ', '12345', '!!! ... ---', '2026-10-21 (3.14)']) assert.equal(detectTextDirection(t), null, JSON.stringify(t));
});

test('digits, punctuation and markup symbols do not influence the result', () => {
  assert.equal(detectTextDirection('1. 2. 3) — שלום!!! (100%)'), 'rtl');
  assert.equal(detectTextDirection('## 123 ... Hello'), 'ltr');
});

/* ---------- wiring (the DOM part is exercised by e2e/auto-direction.e2e.js) ---------- */

test('the preview applies the direction after every render, and exports inherit it from previewContent', () => {
  const index = read('index.html');
  assert.match(index, /previewContent\.innerHTML = html;\s*\n\s*applyAutoDirection\(previewContent\);/);
  assert.equal((index.match(/const renderedBodyHtml = previewContent\.innerHTML;/g) || []).length, 3);
});

test('explicit <div dir> wrappers, diagrams and the footer are never re-directed', () => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').match(/function applyAutoDirection\([\s\S]*?\n    }\n/)[0];
  assert.match(body, /closest\('div\[dir\]/);
  assert.match(body, /mermaid-diagram-container/);
  assert.match(body, /mdw-attribution-footer/);
});

test('the editor lays out every line by its own language', () => {
  const index = read('index.html');
  const rule = index.match(/\.editor-textarea\s*\{[^}]*\}/)[0];
  assert.match(rule, /unicode-bidi:\s*plaintext/);
});

test('table headers follow the table direction (built-in themes hard-code text-align: right)', () => {
  const index = read('index.html');
  assert.match(index, /\.preview-document table\[dir="ltr"\] th\s*\{\s*text-align:\s*left/);
  // and the three exported documents carry the same rule
  assert.equal((index.match(/table\[dir="ltr"\] th\s*\{\s*text-align:\s*left/g) || []).length, 4);
});

test('the studio live preview runs the same direction pass', () => {
  assert.match(read('index.html'), /afterRender:\s*applyAutoDirection/);
  assert.match(read('css-studio-ui.js'), /deps\.afterRender/);
});

test('the sample document demonstrates automatic direction without any wrapper', () => {
  const lines = S.SAMPLE_MD.split('\n');
  const outside = []; let depth = 0;
  for (const l of lines) { if (/^<div dir=/.test(l)) depth++; else if (/^<\/div>/.test(l)) depth--; else if (!depth) outside.push(l); }
  assert.ok(outside.some((l) => /^[A-Za-z][A-Za-z ,.']{20,}$/.test(l)), 'a plain English paragraph outside any wrapper');
  assert.ok(outside.some((l) => /[\u0590-\u05FF]/.test(l) && /\bAPI\b/.test(l)), 'a Hebrew sentence with English terms');
});

test('service worker cache name changed with the assets', () => {
  assert.match(read('sw.js'), /build-20261021-02/);
});
