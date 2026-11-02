// v4.7.0 — export-core.js: Markdown -> blocks (parseBlocks) and inline runs (parseRuns).
// Includes the parity test against the real parser (parseMarkdown from index.html) over a corpus (WF6, BR3.8).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../export-core');
const { loadParser } = require('../test-support/load-app');

const plain = (runs) => runs.map((r) => r.text).join('');
// the preview shows an image, not its alt text: parity compares text without the alt runs
const noImg = (runs) => plain(runs.filter((r) => !r.img));
const types = (blocks) => blocks.map((b) => b.type);

/* ------------------------------------------------------------------ parseRuns */

test('parseRuns: plain text is one run with no flags', () => {
  assert.deepEqual(E.parseRuns('שלום עולם'), [{ text: 'שלום עולם' }]);
  assert.deepEqual(E.parseRuns(''), []);
});

test('parseRuns: inline code comes first and protects its content from any other markup', () => {
  assert.deepEqual(E.parseRuns('a `b` c'), [{ text: 'a ' }, { text: 'b', code: true }, { text: ' c' }]);
  assert.deepEqual(E.parseRuns('`**x** [l](http://a.b)`'), [{ text: '**x** [l](http://a.b)', code: true }]);
});

test('parseRuns: bold, italic and strike, alone and combined', () => {
  assert.deepEqual(E.parseRuns('**b**'), [{ text: 'b', bold: true }]);
  assert.deepEqual(E.parseRuns('*i*'), [{ text: 'i', italic: true }]);
  assert.deepEqual(E.parseRuns('~~s~~'), [{ text: 's', strike: true }]);
  assert.deepEqual(E.parseRuns('**a *b* c**'), [
    { text: 'a ', bold: true }, { text: 'b', bold: true, italic: true }, { text: ' c', bold: true }
  ]);
  assert.deepEqual(E.parseRuns('~~**x**~~'), [{ text: 'x', bold: true, strike: true }]);
});

test('parseRuns: a code span inside bold keeps both flags', () => {
  assert.deepEqual(E.parseRuns('**`x`**'), [{ text: 'x', bold: true, code: true }]);
});

test('parseRuns: links carry href; formatting inside the link text is kept', () => {
  assert.deepEqual(E.parseRuns('ראו [מדריך](https://x.y/a?b=1&c=2) כאן'), [
    { text: 'ראו ' }, { text: 'מדריך', href: 'https://x.y/a?b=1&c=2' }, { text: ' כאן' }
  ]);
  assert.deepEqual(E.parseRuns('[**t**](docs/p.md)'), [{ text: 't', bold: true, href: 'docs/p.md' }]);
  assert.deepEqual(E.parseRuns('[m](mailto:a@b.c)'), [{ text: 'm', href: 'mailto:a@b.c' }]);
});

test('parseRuns (security): an unsafe address leaves the whole source visible and creates no href (BR3.10)', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:x', 'data:text/html,x', 'vbscript:x', '//evil.example/x', 'file:///etc/passwd']) {
    const runs = E.parseRuns(`[t](${bad})`);
    assert.ok(runs.every((r) => !r.href), bad);
    assert.equal(plain(runs), `[t](${bad})`, bad);
  }
});

test('parseRuns: an image inside a paragraph is one run flagged img, with the alt as text', () => {
  assert.deepEqual(E.parseRuns('x ![לוגו](icon.svg) y'), [{ text: 'x ' }, { text: 'לוגו', img: true, href: 'icon.svg' }, { text: ' y' }]);
  assert.equal(plain(E.parseRuns('![a](javascript:x)')), '![a](javascript:x)');
});

test('parseRuns: * and _ inside an address are not emphasis; an underscore word is not italic (same as the preview)', () => {
  assert.deepEqual(E.parseRuns('[a](http://x/a_b*c)'), [{ text: 'a', href: 'http://x/a_b*c' }]);
  assert.deepEqual(E.parseRuns('snake_case_name'), [{ text: 'snake_case_name' }]);
});

test('parseRuns: unmatched markers stay literal text', () => {
  assert.equal(plain(E.parseRuns('a * b')), 'a * b');
  assert.equal(plain(E.parseRuns('~~x')), '~~x');
  assert.equal(plain(E.parseRuns('a ~ b')), 'a ~ b');
  assert.deepEqual(E.parseRuns('2 < 3 & 4 > 1'), [{ text: '2 < 3 & 4 > 1' }]);
});

/* ------------------------------------------------------------------ parseBlocks */

test('parseBlocks: empty or blank input gives no blocks; CRLF is normalised', () => {
  assert.deepEqual(E.parseBlocks(''), []);
  assert.deepEqual(E.parseBlocks('  \n \n'), []);
  assert.deepEqual(E.parseBlocks(null), []);
  assert.deepEqual(E.parseBlocks('# a\r\n\r\nb'), [
    { type: 'h1', runs: [{ text: 'a' }] }, { type: 'p', runs: [{ text: 'b' }] }
  ]);
});

test('parseBlocks: headings h1 to h6; seven hashes or no space is a paragraph', () => {
  const b = E.parseBlocks('# a\n## b\n### c\n#### d\n##### e\n###### f\n####### g\n#h');
  assert.deepEqual(types(b), ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']);
  assert.equal(plain(b[6].runs), '####### g\n#h');
  assert.deepEqual(b[0], { type: 'h1', runs: [{ text: 'a' }] });
});

test('parseBlocks: paragraphs are split by blank lines; consecutive lines are one paragraph with line breaks', () => {
  const b = E.parseBlocks('שורה א\nשורה ב\n\nפסקה שנייה');
  assert.deepEqual(types(b), ['p', 'p']);
  // a line break is a "\n" inside the text of the run (serializers turn it into <w:br/> / a newline)
  assert.deepEqual(b[0].runs, [{ text: 'שורה א\nשורה ב' }]);
});

test('parseBlocks: text right after a heading or a list (no blank line) is its own paragraph', () => {
  assert.deepEqual(types(E.parseBlocks('## h\ntext')), ['h2', 'p']);
  assert.deepEqual(types(E.parseBlocks('- a\ntext')), ['list', 'p']);
});

test('parseBlocks: bullet lists with -, + and *, one list; Hebrew items', () => {
  const [l, ...rest] = E.parseBlocks('- א\n+ ב\n* ג');
  assert.equal(rest.length, 0);
  assert.equal(l.type, 'list');
  assert.equal(l.ordered, false);
  assert.deepEqual(l.items.map((i) => [plain(i.runs), i.level, i.task, i.ordered]), [['א', 0, 'none', false], ['ב', 0, 'none', false], ['ג', 0, 'none', false]]);
});

test('parseBlocks: ordered lists, tasks (open / done / upper-case X) and nesting by two spaces', () => {
  const [ord] = E.parseBlocks('1. א\n2. ב');
  assert.equal(ord.ordered, true);
  assert.deepEqual(ord.items.map((i) => plain(i.runs)), ['א', 'ב']);
  const [tasks] = E.parseBlocks('- [ ] open\n- [x] done\n- [X] done2\n  - [ ] inner');
  assert.deepEqual(tasks.items.map((i) => [plain(i.runs), i.task, i.level]), [['open', 'open', 0], ['done', 'done', 0], ['done2', 'done', 0], ['inner', 'open', 1]]);
  const [nested] = E.parseBlocks('* a\n  * b\n    * c\n  1. x\n* d');
  assert.deepEqual(nested.items.map((i) => [plain(i.runs), i.level, i.ordered]), [['a', 0, false], ['b', 1, false], ['c', 2, false], ['x', 1, true], ['d', 0, false]]);
});

test('parseBlocks: a skipped nesting level is flattened like the preview; a list-type change at the top level starts a new list', () => {
  const [over] = E.parseBlocks('      * deep first');
  assert.equal(over.items[0].level, 0);
  const [skip] = E.parseBlocks('* a\n      * b');
  assert.deepEqual(skip.items.map((i) => i.level), [0, 1]);
  const b = E.parseBlocks('* a\n1. b');
  assert.deepEqual(types(b), ['list', 'list']);
  assert.deepEqual(b.map((x) => x.ordered), [false, true]);
});

test('parseBlocks: blank lines between items of one list keep it one list', () => {
  const b = E.parseBlocks('* a\n\n* b\n\ntext');
  assert.deepEqual(types(b), ['list', 'p']);
  assert.equal(b[0].items.length, 2);
});

test('parseBlocks: tables — header, alignment from the separator row, short rows, formatting in cells', () => {
  const [t] = E.parseBlocks('| a | **b** | c |\n| :--- | :---: | ---: |\n| 1 | 2 |\n| [l](x.md) | `c` | 3 |');
  assert.equal(t.type, 'table');
  assert.deepEqual(t.align, ['left', 'center', 'right']);
  assert.deepEqual(t.header.map(plain), ['a', 'b', 'c']);
  assert.equal(t.header[1][0].bold, true);
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[0].length, 2);
  assert.equal(t.rows[1][0][0].href, 'x.md');
  assert.equal(t.rows[1][1][0].code, true);
});

test('parseBlocks: a table without alignment colons has align "none"; a single pipe line is a paragraph', () => {
  const [t] = E.parseBlocks('| a | b |\n| --- | --- |\n| 1 | 2 |');
  assert.deepEqual(t.align, ['none', 'none']);
  assert.deepEqual(types(E.parseBlocks('| a | b |')), ['p']);
});

test('parseBlocks: a table at the very end of the document keeps its last row', () => {
  const [t] = E.parseBlocks('| a |\n| --- |\n| last |');
  assert.deepEqual(t.rows.map((r) => r.map(plain)), [['last']]);
});

test('parseBlocks: fenced code keeps its language and its text exactly; markup inside is not parsed', () => {
  const [c] = E.parseBlocks('```js\nconst a = **1**;\n# not a heading\n```');
  assert.deepEqual(c, { type: 'code', lang: 'js', text: 'const a = **1**;\n# not a heading' });
  assert.deepEqual(E.parseBlocks('```\nx\n```')[0], { type: 'code', lang: '', text: 'x' });
});

test('parseBlocks: mermaid fences are diagrams with their source', () => {
  const [d] = E.parseBlocks('```mermaid\nflowchart LR\n  A --> B\n```');
  assert.deepEqual(d, { type: 'diagram', text: 'flowchart LR\n  A --> B' });
});

test('parseBlocks: quotes — consecutive "> " lines are one quote with line breaks; a blank line separates quotes', () => {
  const b = E.parseBlocks('> שורה ראשונה\n> שורה *שנייה*\n\n> אחר\n\nטקסט');
  assert.deepEqual(types(b), ['quote', 'quote', 'p']);
  assert.deepEqual(b[0].runs, [{ text: 'שורה ראשונה\nשורה ' }, { text: 'שנייה', italic: true }]);
});

test('parseBlocks: horizontal rules (---, ***, ___) are hr; similar-looking lines are not', () => {
  assert.deepEqual(types(E.parseBlocks('a\n\n---\n\n***\n\n___\n\nb')), ['p', 'hr', 'hr', 'hr', 'p']);
  assert.deepEqual(types(E.parseBlocks('--\n\n----a')), ['p', 'p']);
});

test('parseBlocks: an image alone on its line is an image block; with other text it stays inside the paragraph', () => {
  assert.deepEqual(E.parseBlocks('![לוגו](icon.svg)'), [{ type: 'image', alt: 'לוגו', url: 'icon.svg' }]);
  const [p] = E.parseBlocks('טקסט ![x](a.png) עוד');
  assert.equal(p.type, 'p');
  assert.equal(p.runs[1].img, true);
  assert.equal(E.parseBlocks('![x](javascript:alert(1))')[0].type, 'p');
});

test('parseBlocks: <div dir> regions hold their blocks, nest, and an unclosed region is closed; a stray </div> is text', () => {
  const [r] = E.parseBlocks('<div dir="rtl">\n# כותרת\n\n<div dir=\'ltr\'>\ncode text\n</div>\n</div>');
  assert.equal(r.type, 'dirRegion');
  assert.equal(r.dir, 'rtl');
  assert.deepEqual(types(r.children), ['h1', 'dirRegion']);
  assert.equal(r.children[1].dir, 'ltr');
  const [open] = E.parseBlocks('<div dir=ltr>\ntext');
  assert.equal(open.type, 'dirRegion');
  assert.equal(open.children.length, 1);
  assert.equal(plain(E.parseBlocks('</div>')[0].runs), '</div>');
  assert.equal(E.parseBlocks('x <div dir="rtl"> y')[0].type, 'p');
});

test('parseBlocks (security): HTML in the text is kept as literal text, never as a block or a tag', () => {
  const b = E.parseBlocks('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
  assert.deepEqual(types(b), ['p', 'p']);
  assert.equal(plain(b[0].runs), '<script>alert(1)</script>');
});

test('parseBlocks: the result never shares state between calls', () => {
  const a = E.parseBlocks('# a');
  a[0].runs[0].text = 'changed';
  assert.equal(E.parseBlocks('# a')[0].runs[0].text, 'a');
});

/* ------------------------------------------------------------------ parity with the real parser (WF6 step 5, BR3.8) */

const { parseMarkdown } = loadParser();
const S = require('../css-studio');
const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function appCorpus() {
  const t = /const CONTENT_TEMPLATES = \{[\s\S]*?\n    \};/.exec(indexSrc);
  assert.ok(t, 'CONTENT_TEMPLATES not found');
  const templates = new Function(t[0] + '\nreturn CONTENT_TEMPLATES;')();
  const d = /const DEFAULT_MARKDOWN = (`(?:\\[\s\S]|[^`\\])*`);/.exec(indexSrc);
  assert.ok(d, 'DEFAULT_MARKDOWN not found');
  const docs = { DEFAULT_MARKDOWN: new Function('return ' + d[1])() };
  Object.keys(templates).forEach((k) => { docs['template:' + k] = templates[k].content; });
  return docs;
}

const EXTRA = {
  nestedLists: '* a\n  * b\n    * c\n  1. x\n  2. y\n* d\n\n1. one\n2. two\n   * inner\n3. three',
  tasks: '- [ ] open\n- [x] done\n  - [x] inner\n  - [ ] other\n\n* [ ] second list',
  quotes: '> שורה ראשונה\n> שורה *שנייה* עם `קוד`\n\n> ציטוט אחר\n\nפסקה',
  tables: '| שם | ערך | הערה |\n| :--- | :---: | ---: |\n| א | 1 | **מודגש** |\n| ב | 2 | [קישור](https://x.y) |\n\nטקסט אחרי\n\n| a | b |\n| --- | --- |\n| 1 | 2 |',
  inline: 'פסקה עם **מודגש**, *נטוי*, ~~מחוק~~, `קוד`, [קישור](docs/a.md) ו-![תמונה](icon.svg) ועוד.\nשורה שנייה באותה פסקה.\n\n## כותרת עם **הדגשה**\n3 * 4 * 5 וגם a_b_c',
  dirRegions: '<div dir="rtl">\nעברית בתוך אזור\n\n* פריט\n</div>\n\n<div dir="ltr">\nEnglish **bold**\n\n```js\nconst x = 1;\n```\n</div>',
  mixed: '# כותרת ראשית\n\nפסקה.\n\n---\n\n```mermaid\nflowchart LR\n  A[א] --> B[ב]\n```\n\n* א\n\n* ב\n\n```python\nprint("x")\n```\n\nסוף &amp; <b>לא תגית</b>',
  unsafe: '[a](javascript:alert(1)) ![b](data:image/png;base64,AA) [c](//evil.example) [d](https://ok.example/x_y)'
};

function corpus() {
  const docs = Object.assign({}, appCorpus(), EXTRA);
  docs['css-studio SAMPLE_MD'] = S.SAMPLE_MD;
  docs['samples/css-studio-sample.md'] = fs.readFileSync(path.join(__dirname, '..', 'samples', 'css-studio-sample.md'), 'utf8');
  return docs;
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
const squash = (s) => s.replace(/\s+/g, ' ').trim();
// inline tags vanish (no space); every other tag (li, td, br, input ...) is a word boundary
const textOfHtml = (html) => squash(decode(html
  .replace(/<\/?(?:strong|em|del|code|a|img)\b[^>]*>/g, '')
  .replace(/<[^>]*>/g, ' ')));

// top-level blocks of parseMarkdown's output as [{type, text}] (div wrappers become open / close markers)
function htmlBlocks(html) {
  const body = html.replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '');
  const out = [];
  const re = /<(h[1-6]|p|ul|ol|table|pre|blockquote)\b[^>]*>|<hr>|<div class="mermaid-diagram-container"|<div dir="(rtl|ltr)">|<\/div>/g;
  let m;
  while ((m = re.exec(body))) {
    const tag = m[1];
    if (tag === 'ul' || tag === 'ol') {
      // count only the same tag; nested lists of the other kind sit inside <li> and are part of the text
      let depth = 1; const start = re.lastIndex; const scan = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g');
      scan.lastIndex = start; let n = null;
      while (depth > 0) { n = scan.exec(body); assert.ok(n, 'unbalanced <' + tag + '>'); depth += n[0][1] === '/' ? -1 : 1; }
      out.push({ type: 'list', text: textOfHtml(body.slice(start, n.index)) });
      re.lastIndex = scan.lastIndex;
    } else if (tag) {
      const end = body.indexOf('</' + tag + '>', re.lastIndex);
      out.push({ type: /^h\d$/.test(tag) ? tag : tag === 'blockquote' ? 'quote' : tag, text: textOfHtml(body.slice(re.lastIndex, end)) });
      re.lastIndex = end + tag.length + 3;
    } else if (m[0] === '<hr>') out.push({ type: 'hr', text: '' });
    else if (m[0].startsWith('<div class="mermaid')) {
      const title = body.indexOf('mermaid-diagram-title', re.lastIndex);
      out.push({ type: 'diagram', text: '' });
      const titleEnd = body.indexOf('</div>', title);          // closes the title div
      re.lastIndex = body.indexOf('</div>', titleEnd + 6) + 6;   // closes the container
    } else if (m[2]) out.push({ type: 'div-open:' + m[2], text: '' });
    else out.push({ type: 'div-close', text: '' });
  }
  return out;
}

function ourBlocks(blocks) {
  const out = [];
  const walk = (list) => list.forEach((b) => {
    if (b.type === 'dirRegion') { out.push({ type: 'div-open:' + b.dir, text: '' }); walk(b.children); out.push({ type: 'div-close', text: '' }); return; }
    if (b.type === 'list') out.push({ type: 'list', text: squash(b.items.map((i) => noImg(i.runs)).join(' ')) });
    else if (b.type === 'table') out.push({ type: 'table', text: squash(b.header.concat(...b.rows).map(noImg).join(' ')) });
    else if (b.type === 'code') out.push({ type: 'pre', text: squash(b.text) });
    else if (b.type === 'diagram') out.push({ type: 'diagram', text: '' });
    else if (b.type === 'hr') out.push({ type: 'hr', text: '' });
    else if (b.type === 'image') out.push({ type: 'p', text: '' });
    else out.push({ type: b.type, text: squash(noImg(b.runs)) });
  });
  walk(blocks);
  return out;
}

for (const [name, md] of Object.entries(corpus())) {
  test(`parity with parseMarkdown — ${name}: same block sequence and same text`, () => {
    const mine = ourBlocks(E.parseBlocks(md));
    const theirs = htmlBlocks(parseMarkdown(md));
    assert.deepEqual(mine.map((b) => b.type), theirs.map((b) => b.type), 'block type sequence');
    for (let i = 0; i < mine.length; i++) assert.equal(mine[i].text, theirs[i].text, `block ${i} (${mine[i].type})`);
  });
}

test('parity corpus is real: it covers every block type the parser emits', () => {
  const seen = new Set();
  Object.values(corpus()).forEach((md) => htmlBlocks(parseMarkdown(md)).forEach((b) => seen.add(b.type)));
  for (const t of ['h1', 'h2', 'p', 'list', 'table', 'pre', 'quote', 'hr', 'diagram', 'div-open:rtl', 'div-open:ltr']) assert.ok(seen.has(t), t);
});
