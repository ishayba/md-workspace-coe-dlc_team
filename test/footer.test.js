const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const footer = index.match(/<footer class="app-footer">([\s\S]*?)<\/footer>/)[1];
const SENTENCE = 'הופק מקומית | Licensed under CC BY-NC 4.0';

test('the licence sentence sits in the middle slot of the app footer, between version and an empty end slot', () => {
  const slots = [...footer.matchAll(/<div class="(footer-(?:start|center|end))"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => [m[1], m[2].trim()]);
  assert.deepEqual(slots.map((s) => s[0]), ['footer-start', 'footer-center', 'footer-end']);
  assert.equal(slots[1][1], SENTENCE);
  assert.match(slots[0][1], /גרסה v\d+\.\d+\.\d+/);
  assert.equal(slots[2][1], '');
});

test('the sentence appears once in the whole page (moved to the middle, not duplicated)', () => {
  assert.equal(index.split(SENTENCE).length - 1, 1);
});

test('the footer is a three-column grid so the middle slot is truly centred', () => {
  const rule = index.match(/footer\.app-footer\s*\{[^}]*\}/)[0];
  assert.match(rule, /display:\s*grid/);
  assert.match(rule, /grid-template-columns:\s*1fr auto 1fr/);
  assert.match(index, /\.footer-center\s*\{[^}]*text-align:\s*center/);
});

test('on narrow screens the footer stacks instead of overflowing', () => {
  assert.match(index, /@media \(max-width: 720px\)\s*\{[^}]*footer\.app-footer\s*\{[^}]*grid-template-columns:\s*1fr/);
});
