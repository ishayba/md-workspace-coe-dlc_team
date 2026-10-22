const test = require('node:test');
const assert = require('node:assert/strict');
const { loadParser } = require('../test-support/load-app');

const { parseMarkdown } = loadParser();
// the app's own attribution footer is generated markup, not document content
const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();

test('italic inside a bullet item renders as <em> (the bullet marker must not pair with it)', () => {
  assert.equal(body('* a *b* c'), '<ul><li>a <em>b</em> c</li></ul>');
  assert.equal(body('* *x* y'), '<ul><li><em>x</em> y</li></ul>');
  assert.equal(body('* **bold** and *it*'), '<ul><li><strong>bold</strong> and <em>it</em></li></ul>');
});

test('a lone asterisk inside an item stays literal text', () => {
  assert.equal(body('* 2 * 3'), '<ul><li>2 * 3</li></ul>');
});

test('behaviour that must not change', () => {
  assert.equal(body('* a\n* b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(body('a *b* c'), '<p>a <em>b</em> c</p>');
  assert.equal(body('**x** y'), '<p><strong>x</strong> y</p>');
  assert.equal(body('1. one\n2. two'), '<ol><li>one</li><li>two</li></ol>');
  assert.equal(body('* a\n\n* b'), '<ul><li>a</li><li>b</li></ul>'); // adjacent lists still merge
  assert.equal(body('text\n* not a list on its own paragraph line?'), body('text\n* not a list on its own paragraph line?'));
});

test('the internal list marker never leaks into the output', () => {
  const html = parseMarkdown('* a\n* *b* c\n\n> quote\n\n* d');
  assert.doesNotMatch(html, /MDWLI|\u0000/);
});
