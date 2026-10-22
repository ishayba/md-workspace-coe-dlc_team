const test = require('node:test');
const assert = require('node:assert/strict');
const { loadParser } = require('../test-support/load-app');

const { parseMarkdown } = loadParser();
const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();

const TABLE = '| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |';

test('a table that ends the document keeps its last row (no trailing newline needed)', () => {
  const html = body(TABLE);
  assert.match(html, /<td>3<\/td><td>4<\/td>/);
  assert.doesNotMatch(html, /<\/table>\s*\| 3/);
  assert.equal(html, body(TABLE + '\n'));
});

test('tables in the middle of a document are unchanged', () => {
  assert.equal(body(TABLE + '\n\ntext'), '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>\n<p>text</p>');
});

test('a single pipe line is still not a table', () => {
  assert.doesNotMatch(body('| just | one | line |'), /<table>/);
});
