// v4.6.0 — the "HTML live → MD" export (convertChild, written inside a template literal in index.html).
//  1. contract: the code must survive the template literal (v4.3.2 bug class: a raw backtick or "${"
//     inside the literal, or a single backslash escape that the literal swallows) and must compile;
//  2. behaviour: the block is evaluated against a tiny fake DOM built from the real parser's output, and the
//     exported Markdown must render the same as the original (hr, nesting, tasks, strike, links, images, alignment).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadParser } = require('../test-support/load-app');
const V = require('../md-visual');

const { parseMarkdown } = loadParser();
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();

/* ---------- extract the block exactly as it sits in index.html ---------- */

// everything the handler of #mdw-export-md defines after `let md = '';` up to the forEach over the article
const HANDLER = "document.getElementById('mdw-export-md').addEventListener('click'";
const START_MARK = "      let md = '';\n";
const END = '      article.childNodes.forEach(convertChild);';
const sourceBlock = (() => {
  const h = index.indexOf(HANDLER);
  assert.ok(h > 0, 'export handler not found');
  const s = index.indexOf(START_MARK, h) + START_MARK.length;
  const e = index.indexOf(END, s);
  assert.ok(s > 0 && e > s, 'convertChild block not found');
  return index.slice(s, e + END.length);
})();

// the same processing the browser applies to the template literal that holds the exported script
const exportedCode = new Function('return `' + sourceBlock + '`')();

/* ---------- a tiny fake DOM over md-visual's HTML parser ---------- */

function wrap(n, parent) {
  if (n.type === 'text') return { nodeType: 3, nodeValue: n.text, textContent: n.text, innerText: n.text, parentNode: parent };
  const attrs = n.attrs || {};
  const el = { nodeType: 1, tagName: String(n.tag).toUpperCase(), parentNode: parent };
  el.getAttribute = (k) => (k in attrs ? attrs[k] : null);
  el.hasAttribute = (k) => k in attrs;
  el.className = attrs.class || '';
  el.classList = { contains: (c) => el.className.split(/\s+/).includes(c) };
  el.style = { textAlign: ((/text-align\s*:\s*(\w+)/.exec(attrs.style || '') || [])[1]) || '' };
  el.checked = 'checked' in attrs;
  el.childNodes = n.children.map((c) => wrap(c, el));
  el.children = el.childNodes.filter((c) => c.nodeType === 1);
  const text = (node, br) => (node.nodeType === 3 ? node.nodeValue : (node.tagName === 'BR' ? (br ? '\n' : '') : node.childNodes.map((c) => text(c, br)).join('')));
  Object.defineProperty(el, 'textContent', { get: () => text(el, false) });
  Object.defineProperty(el, 'innerText', { get: () => text(el, true) });
  const descendants = (node, out) => { node.children.forEach((c) => { out.push(c); descendants(c, out); }); return out; };
  el.querySelectorAll = (sel) => {
    const scope = /^:scope\s*>\s*([a-z0-9]+)$/i.exec(sel.trim());
    if (scope) return el.children.filter((c) => c.tagName.toLowerCase() === scope[1].toLowerCase());
    const tags = sel.split(',').map((s) => s.trim().toLowerCase());
    return descendants(el, []).filter((c) => tags.includes(c.tagName.toLowerCase()));
  };
  el.querySelector = (sel) => el.querySelectorAll(sel)[0] || null;
  return el;
}

function exportMarkdown(html) {
  const article = wrap({ type: 'el', tag: 'article', attrs: {}, children: V.parseHtml(html).children });
  const run = new Function('Node', 'article', `let md = '';\n${exportedCode}\nreturn md;`);
  return run({ ELEMENT_NODE: 1 }, article).trim();
}

const roundTrip = (md) => exportMarkdown(parseMarkdown(md));
// the export separates blocks with extra blank lines, which the parser renders as blank lines between
// blocks; they carry no meaning, so rendered output is compared with runs of blank lines collapsed
const norm = (html) => html.replace(/\n{2,}/g, '\n');
const same = (exportedMd, originalMd, msg) => assert.equal(norm(body(exportedMd)), norm(body(originalMd)), msg || `exported markdown:\n${exportedMd}`);

/* ---------- contract ---------- */

test('export block: survives the template literal and compiles (node --check equivalent)', () => {
  assert.doesNotThrow(() => new vm.Script(exportedCode));
  assert.doesNotMatch(sourceBlock, /`/, 'no raw backtick inside the template literal (use \\\\x60)');
  assert.doesNotMatch(sourceBlock, /\$\{/, 'no ${ inside the template literal');
  assert.doesNotMatch(sourceBlock, /(^|[^\\])\\[nrtsdwb.\/(){}\[\]*+?|^$-]/m, 'every backslash escape must be doubled inside the template literal');
});

test('export block: handles each new construct (hr, nesting, tasks, strike, links, images, alignment)', () => {
  for (const frag of ["tag === 'hr'", "'---'", 'del', '~~', '![', '](', '[ ] ', '[x] ', 'textAlign']) {
    assert.ok(sourceBlock.includes(frag), `missing in the export code: ${frag}`);
  }
});

/* ---------- behaviour ---------- */

test('export: a horizontal rule comes back as ---', () => {
  assert.match(roundTrip('a\n\n---\n\nb'), /\n---\n/);
  same(roundTrip('a\n\n---\n\nb'), 'a\n\n---\n\nb');
});

test('export: nested lists keep their levels and numbering; tasks keep their state', () => {
  const md = '* a\n  * b\n    * c\n  1. x\n  2. y\n* d';
  same(roundTrip(md), md);
  const tasks = '- [ ] open\n- [x] done\n  - [x] inner';
  same(roundTrip(tasks), tasks);
  assert.match(roundTrip(tasks), /\* \[ \] open/);
  assert.match(roundTrip(tasks), /\* \[x\] done/);
});

test('export: bold, italic, code, strike, links and images are kept inside paragraphs, lists, headings, cells and quotes', () => {
  const docs = [
    'text **b** *i* `c` ~~s~~ [l](https://x.y) ![alt](icon.svg) end',
    '* **b** and [l](docs/p.md)',
    '## כותרת **מודגשת** ~~ישנה~~',
    '| **h** | ~~x~~ |\n| --- | --- |\n| [l](a.md) | `c` |',
    '> *quoted* [l](#s)\n> שורה שנייה'
  ];
  for (const md of docs) same(roundTrip(md), md, md);
});

test('export: multi-line quotes and column alignment survive', () => {
  const quote = '> שורה ראשונה\n> שורה שנייה';
  same(roundTrip(quote), quote);
  const table = '| a | b | c |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |';
  same(roundTrip(table), table);
});

test('export: the Hebrew sample document of the CSS studio comes back unchanged', () => {
  const S = require('../css-studio');
  same(roundTrip(S.SAMPLE_MD), S.SAMPLE_MD);
});

test('export (security): an unsafe address in the live document is not written back as a link or image', () => {
  assert.doesNotMatch(exportMarkdown('<p><a href="javascript:alert(1)">t</a> <img src="data:image/png;base64,AA" alt="x"></p>'), /\]\(/);
});
