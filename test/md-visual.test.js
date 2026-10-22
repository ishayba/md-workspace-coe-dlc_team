const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../md-visual');
const S = require('../css-studio');
const { loadParser } = require('../test-support/load-app');

const { parseMarkdown } = loadParser();
const ZW = '\u200B';
const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();
const md = (html) => V.htmlToMarkdown(html);

/* ---------- parseHtml ---------- */

test('parseHtml: tags, attributes, entities, void elements and comments', () => {
  const t = V.parseHtml('<p class="a" data-x=\'y\'>1 &lt; 2 &amp; &quot;q&quot; &#39;s&#039; &nbsp;<br><!-- c -->z</p>');
  const p = t.children[0];
  assert.equal(p.tag, 'p');
  assert.equal(p.attrs.class, 'a');
  assert.equal(p.attrs['data-x'], 'y');
  assert.equal(p.children[0].text, '1 < 2 & "q" \'s\' \u00A0');
  assert.equal(p.children[1].tag, 'br');
  assert.equal(p.children[2].text, 'z');
});

test('parseHtml: unclosed and stray tags do not throw', () => {
  assert.doesNotThrow(() => V.parseHtml('<ul><li>a<li>b</ul></p><b>x'));
});

/* ---------- block serialisation ---------- */

test('headings, paragraphs, lists, quotes', () => {
  assert.equal(md('<h1>Title</h1>'), '# Title\n');
  assert.equal(md('<h6>Six</h6>'), '###### Six\n');
  assert.equal(md('<p>a</p><p>b</p>'), 'a\n\nb\n');
  assert.equal(md('<ul><li>a</li><li>b</li></ul>'), '* a\n* b\n');
  assert.equal(md('<ol><li>a</li><li>b</li></ol>'), '1. a\n2. b\n');
  assert.equal(md('<blockquote>q</blockquote>'), '> q\n');
  assert.equal(md('<blockquote>a</blockquote><blockquote>b</blockquote>'), '> a\n\n> b\n');
  assert.equal(md(''), '');
  assert.equal(md('<p><br></p><p>  </p>'), '');
});

test('tables: header row, separator, body rows; pipes and line breaks in cells are neutralised', () => {
  assert.equal(md('<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'),
    '| a | b |\n| --- | --- |\n| 1 | 2 |\n');
  assert.equal(md('<table><tr><td>x</td><td>y</td></tr><tr><td>1</td><td>2</td></tr></table>'), '| x | y |\n| --- | --- |\n| 1 | 2 |\n');
  assert.equal(md('<table><tr><th>a|b</th><th>c<br>d</th></tr></table>'), '| a¦b | c d |\n| --- | --- |\n');
  assert.equal(md('<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>'), '| a | b |\n| --- | --- |\n| 1 |  |\n');
});

test('code blocks and mermaid diagrams are rebuilt from their source', () => {
  assert.equal(md('<pre><code class="language-js">let x = 1 &lt; 2;</code></pre>'), '```js\nlet x = 1 < 2;\n```\n');
  assert.equal(md('<pre><code class="language-">a\nb</code></pre>'), '```\na\nb\n```\n');
  assert.equal(md('<pre><code>plain</code></pre>'), '```\nplain\n```\n');
  assert.equal(md('<pre><code class="language-x">a ``` b</code></pre>'), '```x\na ˋˋˋ b\n```\n');
  assert.equal(md('<div class="mermaid-diagram-container" data-mermaid-source="flowchart LR\nA[x] --&gt; B[y]"><svg></svg><div class="mermaid-diagram-title">t</div></div>'),
    '```mermaid\nflowchart LR\nA[x] --> B[y]\n```\n');
});

test('direction wrappers keep their content; other divs are plain containers', () => {
  assert.equal(md('<div dir="rtl"><p>x</p></div>'), '<div dir="rtl">\nx\n</div>\n');
  assert.equal(md('<div dir="rtl"><p>א</p><div dir="ltr"><p>B</p></div></div>'), '<div dir="rtl">\nא\n\n<div dir="ltr">\nB\n</div>\n</div>\n');
  assert.equal(md('<div dir="auto"><p>x</p></div>'), 'x\n');
  assert.equal(md('<div>text</div><div>more</div>'), 'text\n\nmore\n');
  assert.equal(md('<div>a<br>b</div>'), 'a\nb\n');
  assert.equal(md('<div>t<p>p</p></div>'), 't\n\np\n');
  assert.equal(md('plain text'), 'plain text\n');
});

test('lists: nested lists are flattened, wrapped paragraphs unwrapped, empty items dropped', () => {
  assert.equal(md('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'), '* a\n* b\n* c\n');
  assert.equal(md('<ul><li><p>x</p></li></ul>'), '* x\n');
  assert.equal(md('<ul><li></li><li>a<br>b</li></ul>'), '* a b\n');
});

test('things that cannot be represented are reduced to their text; app chrome is ignored', () => {
  assert.equal(md('<p><a href="http://x">link</a> <u>u</u> <img src="x" alt="y"> end</p>'), 'link u end\n');
  assert.equal(md('<p>a</p><hr><p>b</p>'), 'a\n\nb\n');
  assert.equal(md('<p>a</p><div class="mdw-attribution-footer">credit</div>'), 'a\n');
  assert.equal(md('<pre><code class="language-js">x</code><button data-md-ignore>edit</button></pre>'), '```js\nx\n```\n');
  assert.equal(md('<p>a</p><script>alert(1)</script><style>p{}</style>'), 'a\n');
  assert.equal(md('<h2 dir="rtl" contenteditable="true">Hi</h2>'), '## Hi\n');
});

/* ---------- inline marks ---------- */

test('bold, italic, code (also as browsers write them)', () => {
  assert.equal(md('<p><b>a</b> b</p>'), '**a** b\n');
  assert.equal(md('<p><strong>a </strong>b</p>'), '**a** b\n');
  assert.equal(md('<p><strong>a</strong><b>b</b></p>'), '**ab**\n');
  assert.equal(md('<p><i>a</i> <em>b</em></p>'), '*a* *b*\n');
  assert.equal(md('<p><b><i>a</i></b></p>'), '***a***\n');
  assert.equal(md('<p><span style="font-weight: 700;">x</span> <span style="font-style: italic">y</span></p>'), '**x** *y*\n');
  assert.equal(md('<p>a<code>b * c</code>d</p>'), 'a`b * c`d\n');
  assert.equal(md('<p><b></b>x</p>'), 'x\n');
  assert.equal(md('<p><b>a</b><i>b</i></p>'), '**a***b*\n'.replace('***b*', '**' + ZW + '*b*'));
});

test('whitespace is collapsed like HTML does', () => {
  assert.equal(md('<p>a   b\n c\u00A0d</p>'), 'a b c d\n');
  assert.equal(md('<p>a<br>b</p>'), 'a\nb\n');
});

/* ---------- escaping: text must never turn into markup ---------- */

test('a lone asterisk stays; two or more become the look-alike ∗ so they cannot pair into italic', () => {
  assert.equal(md('<p>2 * 3</p>'), '2 * 3\n');
  assert.equal(md('<p>a * b * c</p>'), 'a ∗ b ∗ c\n');
  assert.equal(md('<p>**x**</p>'), '∗∗x∗∗\n');
  assert.equal(md('<p><b>b</b> and 2 * 3</p>'), '**b** and 2 ∗ 3\n');
  assert.doesNotMatch(body(md('<p>a * b * c</p>')), /<em>/);
});

test('backticks in text are replaced (an inline-code pair can span paragraphs)', () => {
  assert.equal(md('<p>x ` y</p><p>z ` w</p>'), 'x ˋ y\n\nz ˋ w\n');
});

test('line-start markers get a zero-width guard so text is not re-read as headings, lists, quotes, tables or wrappers', () => {
  const cases = ['# x', '## x', '1. x', '> q', '| a |', '<div dir="rtl">', '* x'];
  for (const text of cases) {
    const out = md('<p>' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>');
    assert.equal(out, ZW + text + '\n', text);
    assert.doesNotMatch(body(out), /<h[1-6]>|<ul>|<ol>|<blockquote>|<table>|<div dir/, `re-read as markup: ${text}`);
  }
  assert.equal(md('<p>a<br># b</p>'), 'a\n' + ZW + '# b\n');
  assert.equal(md('<p>' + ZW + '# x</p>'), ZW + '# x\n', 'an existing guard is not doubled');
});

/* ---------- plain-text paste ---------- */

test('plainTextToHtml turns pasted text into safe paragraphs', () => {
  assert.equal(V.plainTextToHtml('a & b'), 'a &amp; b');
  assert.equal(V.plainTextToHtml('a\nb'), 'a<br>b');
  assert.equal(V.plainTextToHtml('x\n\ny'), '<p>x</p><p>y</p>');
  assert.equal(V.plainTextToHtml('x\r\n\r\ny\r\nz'), '<p>x</p><p>y<br>z</p>');
  assert.equal(V.plainTextToHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(V.plainTextToHtml(''), '');
});

/* ---------- round trip: the rendered result must not change ---------- */

const CORPUS = {
  headings: '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6',
  paragraph: 'Hello world',
  inline: 'text **bold** and *italic* and `code` end',
  bothMarks: 'a ***both*** b',
  multiline: 'line one\nline two\nline three',
  ul: '* a\n* b\n* c',
  ol: '1. a\n2. b\n3. c',
  ulInline: '* a *b* c\n* **d** e\n* `f` g\n* *start* x',
  quote: '> quote one\n\n> quote two',
  table: '| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |',
  tableFmt: '| **a** | `b` |\n| --- | --- |\n| *1* | 2 |',
  tableEmpty: '| a | b |\n| --- | --- |\n|  | 2 |',
  code: '```js\nlet x = 1 < 2 && "q" || \'s\';\n```',
  codeNoLang: '```\nplain\ntext\n```',
  mermaid: '```mermaid\nflowchart LR\nA[x] --> B[y]\n```',
  divRtl: '<div dir="rtl">\nשלום עולם\n</div>',
  divLtr: '<div dir="ltr">\nHello **there**\n\n* item\n</div>',
  nested: '<div dir="rtl">\nא\n\n<div dir="ltr">\nB\n</div>\n</div>',
  mixed: 'ה-API מחזיר JSON.\n\nThis is English.',
  specials: 'a < b & c "q" \'x\'',
  loneStar: '2 * 3 = 6',
  hebrewList: '* פריט ראשון\n* פריט **שני**\n\n1. אחד\n2. שניים',
  sample: S.SAMPLE_MD
};

for (const [name, src] of Object.entries(CORPUS)) {
  test(`round trip keeps the rendering — ${name}`, () => {
    const out = md(body(src));
    assert.equal(body(out), body(src), `markdown after conversion:\n${out}`);
    assert.equal(md(body(out)), out, 'second conversion is stable (idempotent)');
  });
}

test('round trip — 300 random documents built from the corpus', () => {
  let seed = 20261022;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pool = Object.entries(CORPUS).filter(([k]) => k !== 'sample').map(([, v]) => v);
  for (let i = 0; i < 300; i++) {
    const n = 1 + Math.floor(rnd() * 6);
    const doc = Array.from({ length: n }, () => pool[Math.floor(rnd() * pool.length)]).join('\n\n');
    const out = md(body(doc));
    assert.equal(body(out), body(doc), `doc #${i}:\n${doc}\n--- became ---\n${out}`);
  }
});
