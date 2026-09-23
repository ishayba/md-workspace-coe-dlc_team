const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('the application keeps Markdown parsing logic in the offline document', () => {
  assert.match(index, /function\s+parseMarkdown\s*\(/);
  assert.match(index, /function\s+escapeHtml\s*\(/);
});

test('user-supplied HTML is escaped before preview rendering', () => {
  const parserStart = index.indexOf('function parseMarkdown');
  const parser = index.slice(parserStart, parserStart + 12000);
  assert.match(parser, /escapeHtml\(src\)/);
  assert.match(parser, /escapeHtml\(code\)/);
});

test('the document exposes the core editor controls', () => {
  for (const id of ['markdown-input', 'preview-content', 'btn-save-md', 'btn-export-clean-html']) {
    assert.match(index, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});
