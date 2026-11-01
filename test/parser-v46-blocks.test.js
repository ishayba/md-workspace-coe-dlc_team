// v4.6.0 — block-level Markdown features of parseMarkdown():
// horizontal rule, "-"/"+" bullets, task lists, nested lists, multi-line quotes, table alignment.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadParser } = require('../test-support/load-app');

const { parseMarkdown } = loadParser();
// the app's own attribution footer is generated markup, not document content
const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();

/* ---------- SC-3: horizontal rule ---------- */

test('hr: ---, *** and ___ (three or more) become <hr> outside a paragraph', () => {
  for (const rule of ['---', '***', '___', '-----', '******', '_____']) {
    assert.equal(body('a\n\n' + rule + '\n\nb'), '<p>a</p>\n<hr>\n<p>b</p>', rule);
  }
  assert.equal(body('---'), '<hr>');
  assert.equal(body('text\n---\nmore'), '<p>text</p>\n<hr>\n<p>more</p>');
});

test('hr: lines that only look similar do not become <hr>', () => {
  assert.doesNotMatch(body('--'), /<hr>/);
  assert.doesNotMatch(body('- - -'), /<hr>/);
  assert.doesNotMatch(body('* * *'), /<hr>/);
  assert.doesNotMatch(body('a --- b'), /<hr>/);
  assert.doesNotMatch(body('| a | b |\n| --- | --- |\n| 1 | 2 |'), /<hr>/);
});

test('hr: Hebrew text around a rule keeps both paragraphs', () => {
  assert.equal(body('שלום\n\n---\n\nעולם'), '<p>שלום</p>\n<hr>\n<p>עולם</p>');
});

/* ---------- SC-4: "-" and "+" bullets ---------- */

test('bullets: "-" and "+" render exactly like "*"', () => {
  assert.equal(body('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(body('+ a\n+ b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(body('* a\n* b'), '<ul><li>a</li><li>b</li></ul>');
});

test('bullets: a list that mixes the three markers is one list', () => {
  assert.equal(body('* a\n- b\n+ c'), '<ul><li>a</li><li>b</li><li>c</li></ul>');
});

test('bullets: Hebrew items and inline formatting inside "-" items', () => {
  assert.equal(body('- שלום *עולם*\n- **שני**'), '<ul><li>שלום <em>עולם</em></li><li><strong>שני</strong></li></ul>');
  assert.doesNotMatch(parseMarkdown('- a\n+ b'), /MDWLI|\u0000/);
});

test('bullets: a dash that is not followed by a space stays text', () => {
  assert.equal(body('-a'), '<p>-a</p>');
  assert.equal(body('a - b'), '<p>a - b</p>');
});

/* ---------- SC-5: task lists ---------- */

// Revision 1: the checkbox carries a Hebrew state label for screen readers
const TASK_OFF = '<li class="task-list-item"><input type="checkbox" disabled aria-label="משימה פתוחה">';
const TASK_ON = '<li class="task-list-item"><input type="checkbox" disabled checked aria-label="משימה שהושלמה">';

test('tasks: "[ ]" and "[x]" items become disabled checkboxes (checked only for x)', () => {
  assert.equal(body('- [ ] a\n- [x] b'), `<ul>${TASK_OFF} a</li>${TASK_ON} b</li></ul>`);
});

test('tasks: all three bullet markers and an upper-case X work', () => {
  assert.equal(body('* [X] c'), `<ul>${TASK_ON} c</li></ul>`);
  assert.equal(body('+ [ ] d'), `<ul>${TASK_OFF} d</li></ul>`);
});

test('tasks: Hebrew text and inline formatting inside a task', () => {
  assert.equal(body('- [x] לבדוק **קישור**'), `<ul>${TASK_ON} לבדוק <strong>קישור</strong></li></ul>`);
});

test('tasks: brackets that are not a task marker stay text', () => {
  assert.equal(body('- [] a'), '<ul><li>[] a</li></ul>');
  assert.equal(body('- [y] a'), '<ul><li>[y] a</li></ul>');
  assert.equal(body('- [ ]a'), '<ul><li>[ ]a</li></ul>');
  assert.equal(body('[ ] not in a list'), '<p>[ ] not in a list</p>');
});

/* ---------- SC-7: nested lists (two spaces per level, any depth) ---------- */

test('nesting: three levels build one tree inside the parent <li>', () => {
  assert.equal(body('* a\n  * b\n    * c'), '<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>');
});

test('nesting: an ordered list inside a bullet list, and back to the top level', () => {
  assert.equal(body('* a\n  1. b\n  2. c\n* d'), '<ul><li>a<ol><li>b</li><li>c</li></ol></li><li>d</li></ul>');
});

test('nesting: no depth limit (five levels)', () => {
  assert.equal(body('* 1\n  * 2\n    * 3\n      * 4\n        * 5'),
    '<ul><li>1<ul><li>2<ul><li>3<ul><li>4<ul><li>5</li></ul></li></ul></li></ul></li></ul></li></ul>');
});

test('nesting: siblings after a deeper level close the open levels', () => {
  assert.equal(body('* a\n  * b\n    * c\n  * d\n* e'),
    '<ul><li>a<ul><li>b<ul><li>c</li></ul></li><li>d</li></ul></li><li>e</li></ul>');
});

test('nesting: changing the list type on the same level starts a new list', () => {
  assert.equal(body('* a\n1. b'), '<ul><li>a</li></ul>\n<ol><li>b</li></ol>');
});

test('nesting: Hebrew items, tasks and "-" markers can be nested', () => {
  assert.equal(body('- פריט\n  - [x] תת פריט'),
    `<ul><li>פריט<ul>${TASK_ON} תת פריט</li></ul></li></ul>`);
});

test('nesting: an over-indented first item or a skipped level does not break the structure', () => {
  assert.equal(body('    * a'), '<ul><li>a</li></ul>');
  assert.equal(body('* a\n      * b'), '<ul><li>a<ul><li>b</li></ul></li></ul>');
});

test('nesting: flat lists and blank-line merging behave as before', () => {
  assert.equal(body('* a\n* b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(body('* a\n\n* b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(body('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
  assert.equal(body('* a\n\ntext'), '<ul><li>a</li></ul>\n<p>text</p>');
});

/* ---------- SC-8: multi-line quotes ---------- */

test('quote: consecutive "> " lines are one blockquote with <br> between the lines', () => {
  assert.equal(body('> a\n> b'), '<blockquote>a<br>b</blockquote>');
  assert.equal(body('> a\n> b\n> c'), '<blockquote>a<br>b<br>c</blockquote>');
});

test('quote: a blank line separates blockquotes; text after a quote is its own paragraph', () => {
  assert.equal(body('> a\n\n> b'), '<blockquote>a</blockquote>\n<blockquote>b</blockquote>');
  assert.equal(body('> a\n> b\n\ntext'), '<blockquote>a<br>b</blockquote>\n<p>text</p>');
});

test('quote: Hebrew lines and inline formatting inside a multi-line quote', () => {
  assert.equal(body('> שורה **ראשונה**\n> שורה *שנייה*'), '<blockquote>שורה <strong>ראשונה</strong><br>שורה <em>שנייה</em></blockquote>');
});

test('quote: a single-line quote is unchanged', () => {
  assert.equal(body('> q'), '<blockquote>q</blockquote>');
});

/* ---------- SC-9: table column alignment ---------- */

test('table: :--- / :---: / ---: align every th and td of the column', () => {
  const html = body('| a | b | c |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |');
  assert.equal(html,
    '<table><thead><tr><th style="text-align:left">a</th><th style="text-align:center">b</th><th style="text-align:right">c</th></tr></thead>' +
    '<tbody><tr><td style="text-align:left">1</td><td style="text-align:center">2</td><td style="text-align:right">3</td></tr>' +
    '<tr><td style="text-align:left">4</td><td style="text-align:center">5</td><td style="text-align:right">6</td></tr></tbody></table>');
});

test('table: columns without colons keep plain th/td, and alignment can be mixed with plain columns', () => {
  const html = body('| a | b |\n| --- | ---: |\n| 1 | 2 |');
  assert.equal(html, '<table><thead><tr><th>a</th><th style="text-align:right">b</th></tr></thead><tbody><tr><td>1</td><td style="text-align:right">2</td></tr></tbody></table>');
});

test('table: alignment works for Hebrew cells and the last row at the end of the document', () => {
  const html = body('| שם | ערך |\n|:---:|---:|\n| א | ב |');
  assert.match(html, /<th style="text-align:center">שם<\/th><th style="text-align:right">ערך<\/th>/);
  assert.match(html, /<td style="text-align:center">א<\/td><td style="text-align:right">ב<\/td>/);
});
