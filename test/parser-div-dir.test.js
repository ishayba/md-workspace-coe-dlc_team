const test = require('node:test');
const assert = require('node:assert/strict');
const { loadParser } = require('../test-support/load-app');

const { parseMarkdown } = loadParser();

// Count only the <div> elements that come from user markdown (dir="rtl|ltr"),
// plus total balance of <div ...> / </div> in the whole output.
const count = (html, re) => (html.match(re) || []).length;
const balanced = (html) => count(html, /<div\b/g) === count(html, /<\/div>/g);

test('sanity: the parser extracted from index.html still renders headings and paragraphs', () => {
  const html = parseMarkdown('# Title\n\nHello');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<p>Hello<\/p>/);
});

test('<div dir="rtl"> and <div dir="ltr"> on their own lines become real wrappers', () => {
  const html = parseMarkdown('<div dir="ltr">\nHello world\n</div>');
  assert.match(html, /<div dir="ltr">/);
  assert.match(html, /<p>Hello world<\/p>/);
  assert.ok(balanced(html));
});

test('accepts unquoted, single-quoted, upper-case and spaced variants', () => {
  for (const open of ['<div dir=rtl>', "<div dir='rtl'>", '<DIV DIR="RTL">', '<div  dir = "rtl" >']) {
    const html = parseMarkdown(`${open}\nטקסט\n</div>`);
    assert.match(html, /<div dir="rtl">/, `failed for: ${open}`);
    assert.ok(balanced(html), `unbalanced for: ${open}`);
  }
});

test('markdown inside the wrapper is still parsed', () => {
  const html = parseMarkdown('<div dir="ltr">\n## Heading\n\n**bold** text\n\n* item\n</div>');
  assert.match(html, /<div dir="ltr">/);
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<ul><li>item<\/li><\/ul>/);
  assert.ok(balanced(html));
});

test('wrappers can nest and stay balanced', () => {
  const html = parseMarkdown('<div dir="rtl">\nא\n<div dir="ltr">\nB\n</div>\nג\n</div>');
  assert.equal(count(html, /<div dir="(rtl|ltr)">/g), 2);
  assert.ok(balanced(html));
});

test('everything else stays escaped (security): other tags, attributes, values', () => {
  const bad = [
    '<div class="x">', '<div dir="rtl" onclick="alert(1)">', '<div dir="javascript:alert(1)">',
    '<div style="x:y">', '<script>alert(1)</script>', '<div dir="rtl"><img src=x onerror=alert(1)>',
    '<span dir="rtl">'
  ];
  for (const line of bad) {
    // the app's own attribution footer is generated markup, not user content
    const html = parseMarkdown(`${line}\ntext\n</div>`).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '');
    assert.doesNotMatch(html, /<div dir=/, `converted: ${line}`);
    // no real (unescaped) tag other than our own dir-wrappers may appear
    assert.doesNotMatch(html, /<(script|img|span|div\s+(class|style))/i, `raw tag leaked: ${line}`);
    assert.doesNotMatch(html, /<[^>]*\son\w+=/i, `event handler inside a real tag: ${line}`);
  }
});

test('inline use (not alone on its line) is not converted', () => {
  const html = parseMarkdown('text <div dir="rtl"> more </div>');
  assert.doesNotMatch(html, /<div dir=/);
  assert.ok(balanced(html));
});

test('a stray closing </div> never produces a real closing tag', () => {
  const html = parseMarkdown('hello\n\n</div>\n\nworld');
  assert.equal(count(html, /<\/div>/g), count(html, /<div\b/g));
  assert.match(html, /&lt;\/div&gt;/);
});

test('an unclosed wrapper is closed automatically', () => {
  const html = parseMarkdown('<div dir="rtl">\nשלום');
  assert.ok(balanced(html));
});

test('inside a fenced code block the markers stay literal code', () => {
  const html = parseMarkdown('```\n<div dir="rtl">\nx\n</div>\n```');
  assert.doesNotMatch(html, /<div dir=/);
  assert.match(html, /<pre><code[^>]*>[\s\S]*&lt;div dir=&quot;rtl&quot;&gt;/);
});

test('closing markers are not wrapped in a paragraph', () => {
  const html = parseMarkdown('<div dir="rtl">\nטקסט\n</div>');
  assert.doesNotMatch(html, /<p><\/div><\/p>/);
  assert.doesNotMatch(html, /<p><div/);
});

test('mermaid blocks and the attribution footer keep working next to wrappers', () => {
  const html = parseMarkdown('<div dir="ltr">\n```mermaid\nflowchart LR\nA[x] --> B[y]\n```\n</div>');
  assert.match(html, /mermaid-diagram-container/);
  assert.match(html, /mdw-attribution-footer/);
  assert.ok(balanced(html));
});

test('live-HTML → Markdown export recurses into dir wrappers (no silent content loss)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(index, /const convertChild = \(child\) =>/);
  assert.match(index, /tag === 'div' && \/\^\(rtl\|ltr\)\$\/\.test\(child\.getAttribute\('dir'\)/);
  assert.match(index, /article\.childNodes\.forEach\(convertChild\)/);
});
