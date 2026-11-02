// v4.7.0 — export-core.js: buildDocx / xmlEscape (WF7, BR3.7, BR3.9–BR3.11, NFR9.1, NFR9.4, NFR9.6, NFR7.6, NFR7.8–NFR7.12).
// Every XML part is parsed by a strict mini reader (test-support/xml-mini.js) and the archive by an independent ZIP reader.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const E = require('../export-core');
const { parseXml, find, child, textOf } = require('../test-support/xml-mini');
const { readZip } = require('../test-support/zip-reader');

const L = '\u200E';
const ASOF = new Date(2026, 10, 2);
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function build(md, opts) {
  const blocks = typeof md === 'string' ? E.parseBlocks(md) : md;
  const result = E.buildDocx(blocks, Object.assign({ title: 'כותרת המסמך', asOf: ASOF }, opts));
  const files = {};
  result.parts.forEach((p) => { files[p.path] = Buffer.from(p.data).toString('utf8'); });
  return { result, files, doc: parseXml(files['word/document.xml']) };
}

const body = (doc) => child(doc, 'w:body');
const paras = (doc) => body(doc).children.filter((c) => c.name === 'w:p');
const pText = (p) => find(p, 'w:t').map((t) => t.text).join('');
const attr = (node, name) => (node ? node.attrs[name] : undefined);
// paragraphs of the document after the title and the "as of" line
const content = (doc) => body(doc).children.filter((c) => c.name !== 'w:sectPr').slice(2);
const pPrOf = (p) => child(p, 'w:pPr');
const jcOf = (p) => attr(child(pPrOf(p) || { children: [] }, 'w:jc'), 'w:val');
const bidiOf = (p) => { const b = child(pPrOf(p) || { children: [] }, 'w:bidi'); return b ? (b.attrs['w:val'] === undefined ? 'on' : b.attrs['w:val']) : 'absent'; };
const runsOf = (p) => find(p, 'w:r');
const rtlRun = (r) => !!child(child(r, 'w:rPr') || { children: [] }, 'w:rtl');

/* ------------------------------------------------------------------ xmlEscape (NFR9.1) */

test('xmlEscape: & < > " \' are escaped; "]]>" and markup-looking text become text', () => {
  assert.equal(E.xmlEscape('a & b < c > d "e" \'f\''), 'a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;');
  assert.equal(E.xmlEscape('<w:p>]]></w:p>'), '&lt;w:p&gt;]]&gt;&lt;/w:p&gt;');
});

test('xmlEscape: control characters that XML 1.0 forbids are removed; tab, LF, CR and Hebrew stay', () => {
  assert.equal(E.xmlEscape('a\u0000b\u0001c\u0008d\u000Be\u000Cf\u000Eg\u001Fh\uFFFEi\uFFFFj'), 'abcdefghij');
  assert.equal(E.xmlEscape('x\ty\nz\rשלום'), 'x\ty\nz\rשלום');
  assert.equal(E.xmlEscape(null), '');
});

/* ------------------------------------------------------------------ package (WF7.1) */

test('package: all parts exist, in the documented order, and there is no app.xml (NFR9.6)', () => {
  const { result } = build('# א');
  assert.deepEqual(result.parts.map((p) => p.path), [
    '[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml',
    'word/settings.xml', 'word/_rels/document.xml.rels', 'docProps/core.xml'
  ]);
  assert.ok(result.parts.every((p) => p.data instanceof Uint8Array));
  assert.ok(!result.parts.some((p) => /app\.xml/.test(p.path)));
  assert.ok(Array.isArray(result.warnings));
});

test('package: every XML part is well-formed (balanced, escaped) and starts with the XML declaration', () => {
  const { files } = build('# א\n\nטקסט **מודגש** `code` [l](https://a.b)\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n- x\n1. y');
  Object.keys(files).forEach((name) => {
    assert.ok(files[name].startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), name);
    assert.doesNotThrow(() => parseXml(files[name]), name);
  });
});

test('package: Content_Types has Defaults for rels and xml and an Override for every other part', () => {
  const { files, result } = build('# א');
  const ct = parseXml(files['[Content_Types].xml']);
  const defaults = Object.fromEntries(find(ct, 'Default').map((d) => [d.attrs.Extension, d.attrs.ContentType]));
  assert.equal(defaults.rels, 'application/vnd.openxmlformats-package.relationships+xml');
  assert.equal(defaults.xml, 'application/xml');
  const overrides = Object.fromEntries(find(ct, 'Override').map((o) => [o.attrs.PartName, o.attrs.ContentType]));
  assert.equal(overrides['/word/document.xml'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml');
  assert.equal(overrides['/word/styles.xml'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml');
  assert.equal(overrides['/word/numbering.xml'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml');
  assert.equal(overrides['/word/settings.xml'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml');
  assert.equal(overrides['/docProps/core.xml'], 'application/vnd.openxmlformats-package.core-properties+xml');
  result.parts.filter((p) => p.path.endsWith('.xml') && p.path !== '[Content_Types].xml').forEach((p) => {
    assert.ok(overrides['/' + p.path], 'Override for ' + p.path);
  });
});

test('package: every relationship Target exists, and every r:id used in document.xml is declared (WF7.1)', () => {
  const { files, result, doc } = build('ראו [א](https://a.b/x) ו-[ב](mailto:a@b.c)');
  const have = new Set(result.parts.map((p) => p.path));
  const check = (relsPath, baseDir) => {
    const rels = parseXml(files[relsPath]);
    const ids = new Set();
    find(rels, 'Relationship').forEach((r) => {
      ids.add(r.attrs.Id);
      if (r.attrs.TargetMode === 'External') return;
      const target = r.attrs.Target.startsWith('/') ? r.attrs.Target.slice(1) : (baseDir + r.attrs.Target);
      assert.ok(have.has(target), `${relsPath}: missing target ${target}`);
    });
    return ids;
  };
  const rootIds = check('_rels/.rels', '');
  assert.deepEqual([...rootIds].sort(), ['rId1', 'rId2']);
  const docIds = check('word/_rels/document.xml.rels', 'word/');
  ['rId1', 'rId2', 'rId3'].forEach((id) => assert.ok(docIds.has(id)));
  find(doc, 'w:hyperlink').forEach((h) => assert.ok(docIds.has(h.attrs['r:id']), 'r:id ' + h.attrs['r:id']));
  assert.equal(find(doc, 'w:hyperlink').length, 2);
});

test('package: the archive of the parts opens with an independent reader, [Content_Types].xml first (WF7.6)', () => {
  const { result } = build('# א\n\nטקסט');
  const entries = readZip(E.zipStore(result.parts));
  assert.equal(entries[0].name, '[Content_Types].xml');
  assert.equal(entries.length, result.parts.length);
  assert.ok(entries.every((e) => e.method === 0 && (e.flags & 0x0800)));
});

test('package: deterministic — the same blocks, title and date give the same bytes (NFR8.8)', () => {
  const md = '# א\n\nהשלב 3.5 Code **מודגש**\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n1. x\n2. y\n\n[l](https://a.b)';
  const a = E.zipStore(build(md).result.parts);
  const b = E.zipStore(build(md).result.parts);
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
});

/* ------------------------------------------------------------------ page, title, headings (WF7.2) */

test('section: A4 portrait, 2 cm margins and a bidi section (BR3.7)', () => {
  const { doc } = build('א');
  const sect = child(body(doc), 'w:sectPr');
  assert.equal(attr(child(sect, 'w:pgSz'), 'w:w'), '11906');
  assert.equal(attr(child(sect, 'w:pgSz'), 'w:h'), '16838');
  assert.equal(attr(child(sect, 'w:pgSz'), 'w:orient'), undefined, 'portrait: no landscape orientation');
  const mar = child(sect, 'w:pgMar');
  ['w:top', 'w:right', 'w:bottom', 'w:left'].forEach((a) => assert.equal(attr(mar, a), '1134'));
  assert.ok(child(sect, 'w:bidi'));
  assert.equal(body(doc).children[body(doc).children.length - 1].name, 'w:sectPr', 'sectPr is last');
  assert.equal(doc.attrs['xmlns:w'], W);
});

test('title and date: the Title paragraph and a "נכון ל-" line with the LRM date (BR4.2)', () => {
  const { doc } = build('# א', { title: 'מסמך API' });
  const [title, asOf] = paras(doc);
  assert.equal(attr(child(pPrOf(title), 'w:pStyle'), 'w:val'), 'Title');
  assert.equal(pText(title), `מסמך ${L}API${L}`);
  assert.equal(pText(asOf), `נכון ל-${L}02.11.2026${L}`);
  assert.equal(bidiOf(title), 'on');
});

test('headings: h1–h3 map to Heading1–3 and h4–h6 to Heading3', () => {
  const { doc } = build('# א\n\n## ב\n\n### ג\n\n#### ד\n\n##### ה\n\n###### ו');
  const styles = content(doc).map((p) => attr(child(pPrOf(p), 'w:pStyle'), 'w:val'));
  assert.deepEqual(styles, ['Heading1', 'Heading2', 'Heading3', 'Heading3', 'Heading3', 'Heading3']);
});

/* ------------------------------------------------------------------ direction, runs, alignment (WF7.3) */

test('direction: a Hebrew paragraph is bidi; a paragraph without Hebrew is explicit LTR with jc=left (FR4.3)', () => {
  const { doc } = build('פסקה בעברית\n\nAn English paragraph with 3.5 numbers');
  const [he, en] = content(doc);
  assert.equal(bidiOf(he), 'on');
  assert.equal(jcOf(he), undefined);
  assert.equal(bidiOf(en), '0');
  assert.equal(jcOf(en), 'left');
  assert.ok(!pText(en).includes(L), 'no LRM in a unit without Hebrew');
});

test('runs: split by script — Hebrew runs carry w:rtl, the Latin expression sits between its two LRM marks (WF7.3)', () => {
  const { doc } = build('השלב 3.5 Code Generation מייצר קוד');
  const [p] = content(doc);
  const runs = runsOf(p);
  assert.equal(runs.length, 3);
  assert.deepEqual(runs.map(rtlRun), [true, false, true]);
  const texts = runs.map((r) => find(r, 'w:t').map((t) => t.text).join(''));
  assert.equal(texts.join(''), `השלב ${L}3.5 Code Generation${L} מייצר קוד`);
  assert.ok(texts[1].startsWith(`${L}3.5 Code Generation${L}`), JSON.stringify(texts));
  runs.forEach((r) => find(r, 'w:t').forEach((t) => assert.equal(t.attrs['xml:space'], 'preserve')));
});

test('runs: bold + italic Hebrew writes w:b, w:bCs, w:i, w:iCs and w:rtl; Latin bold writes only w:b (WF7.3.3)', () => {
  const { doc } = build('***עברית*** ו-**English**');
  const [p] = content(doc);
  const props = runsOf(p).map((r) => ({ rtl: rtlRun(r), names: child(r, 'w:rPr').children.map((c) => c.name) }));
  const he = props.find((x) => x.rtl);
  ['w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:rtl'].forEach((n) => assert.ok(he.names.includes(n), n));
  const en = props.find((x) => !x.rtl && x.names.includes('w:b') && !x.names.includes('w:i'));
  assert.ok(en && !en.names.includes('w:bCs') && !en.names.includes('w:rtl'));
});

test('runs: w:rFonts always names ascii, hAnsi and cs; strike and inline code are carried', () => {
  const { doc } = build('~~מחוק~~ `code`');
  const [p] = content(doc);
  runsOf(p).forEach((r) => {
    const f = child(child(r, 'w:rPr'), 'w:rFonts');
    ['w:ascii', 'w:hAnsi', 'w:cs'].forEach((a) => assert.ok(f.attrs[a], a));
  });
  const names = runsOf(p).map((r) => child(r, 'w:rPr').children.map((c) => c.name));
  assert.ok(names.some((n) => n.includes('w:strike')));
  const codeRun = runsOf(p).find((r) => attr(child(child(r, 'w:rPr'), 'w:rFonts'), 'w:ascii') === 'Consolas');
  assert.ok(codeRun && !rtlRun(codeRun));
});

test('runs: a line break inside a paragraph becomes <w:br/> and a tab <w:tab/>', () => {
  const { doc } = build('שורה א\nשורה ב');
  const [p] = content(doc);
  assert.equal(find(p, 'w:br').length, 1);
  assert.equal(pText(p), 'שורה אשורה ב');
});

const jcFor = (md, row) => {
  const { doc } = build(md);
  const tbl = find(doc, 'w:tbl')[0];
  return find(tbl, 'w:tr')[row].children.filter((c) => c.name === 'w:tc').map((tc) => jcOf(find(tc, 'w:p')[0]));
};

test('alignment: Markdown left / center / right map to logical start / end values in all four combinations (WF7.3.4)', () => {
  const he = '| א | ב | ג |\n| :--- | :---: | ---: |\n| א | ב | ג |';
  assert.deepEqual(jcFor(he, 1), ['end', 'center', 'start'], 'RTL cells: left→end, right→start');
  const en = '| a | b | c |\n| :--- | :---: | ---: |\n| a | b | c |';
  assert.deepEqual(jcFor(en, 1), ['start', 'center', 'end'], 'LTR cells: left→start, right→end');
  const none = '| א | ב |\n| --- | --- |\n| א | ב |';
  assert.deepEqual(jcFor(none, 1), [undefined, undefined], 'no alignment: no w:jc for RTL');
});

test('<div dir> regions force the direction of everything inside (WF7.2)', () => {
  const { doc } = build('<div dir="ltr">\nעברית בתוך אזור שמאלי\n</div>\n\n<div dir="rtl">\nEnglish inside\n</div>');
  const [a, b] = content(doc);
  assert.equal(bidiOf(a), '0');
  assert.equal(bidiOf(b), 'on');
});

/* ------------------------------------------------------------------ tables (WF7.2) */

test('table: bidiVisual, tblGrid, tcW, a repeating header row, pad-to-width and an empty paragraph after it (BR3.7)', () => {
  const { doc } = build('| א | ב | ג |\n| --- | --- | --- |\n| 1 | 2 |\n| x | y | z |');
  const tbl = find(doc, 'w:tbl')[0];
  assert.ok(child(child(tbl, 'w:tblPr'), 'w:bidiVisual'));
  assert.equal(attr(child(child(tbl, 'w:tblPr'), 'w:tblW'), 'w:type'), 'pct');
  assert.equal(attr(child(child(tbl, 'w:tblPr'), 'w:tblW'), 'w:w'), '5000');
  const grid = find(tbl, 'w:gridCol');
  assert.equal(grid.length, 3);
  assert.equal(grid.map((g) => Number(g.attrs['w:w'])).reduce((a, b) => a + b, 0) <= 9638, true);
  const rows = find(tbl, 'w:tr');
  assert.equal(rows.length, 3);
  assert.ok(child(child(rows[0], 'w:trPr'), 'w:tblHeader'));
  assert.ok(!child(rows[1], 'w:trPr'));
  rows.forEach((tr) => {
    const cells = tr.children.filter((c) => c.name === 'w:tc');
    assert.equal(cells.length, 3, 'short rows are padded');
    cells.forEach((tc, i) => {
      assert.equal(attr(child(child(tc, 'w:tcPr'), 'w:tcW'), 'w:w'), grid[i].attrs['w:w']);
      assert.ok(find(tc, 'w:p').length >= 1, 'a cell always has a paragraph');
    });
  });
  const after = body(doc).children[body(doc).children.indexOf(tbl) + 1];
  assert.equal(after.name, 'w:p');
});

test('table: an English table is not bidiVisual; header cells are bold', () => {
  const { doc } = build('| a | b |\n| --- | --- |\n| 1 | 2 |');
  const tbl = find(doc, 'w:tbl')[0];
  assert.ok(!child(child(tbl, 'w:tblPr'), 'w:bidiVisual'));
  const headCell = find(find(tbl, 'w:tr')[0], 'w:tc')[0];
  assert.ok(find(headCell, 'w:b').length >= 1);
});

test('table: 64 columns are merged to the 63 Word allows, the extra cell text is joined with " | " and a warning is returned (NFR7.11)', () => {
  const cells = (prefix) => Array.from({ length: 64 }, (_, i) => [{ text: `${prefix}${i}` }]);
  const blocks = [{ type: 'table', header: cells('h'), rows: [cells('c')], align: Array(64).fill('none') }];
  const { result, doc } = build(blocks);
  const tbl = find(doc, 'w:tbl')[0];
  assert.equal(find(tbl, 'w:gridCol').length, 63);
  const lastHeader = find(find(tbl, 'w:tr')[0], 'w:tc').pop();
  assert.equal(pText(find(lastHeader, 'w:p')[0]), 'h62 | h63');
  assert.ok(result.warnings.some((w) => /63/.test(w)));
});

/* ------------------------------------------------------------------ lists (WF7.2, NFR7.9, NFR7.10) */

const numPrOf = (p) => { const n = child(pPrOf(p) || { children: [] }, 'w:numPr'); return n ? { ilvl: Number(attr(child(n, 'w:ilvl'), 'w:val')), numId: Number(attr(child(n, 'w:numId'), 'w:val')) } : null; };

test('lists: bullets share numId 1; each ordered list gets its own w:num that restarts at 1 on all 9 levels (BR3.7)', () => {
  const { doc, files } = build('- a\n- b\n\nטקסט\n\n1. x\n2. y\n\nמעבר\n\n1. p\n2. q');
  const items = content(doc).filter((p) => numPrOf(p));
  assert.deepEqual(items.map((p) => numPrOf(p).numId), [1, 1, 2, 2, 3, 3]);
  const numbering = parseXml(files['word/numbering.xml']);
  const nums = find(numbering, 'w:num');
  assert.deepEqual(nums.map((n) => n.attrs['w:numId']), ['1', '2', '3']);
  const ordered = nums[1];
  assert.equal(find(ordered, 'w:startOverride').length, 9);
  assert.deepEqual(find(ordered, 'w:lvlOverride').map((o) => o.attrs['w:ilvl']), ['0', '1', '2', '3', '4', '5', '6', '7', '8']);
  assert.ok(find(ordered, 'w:startOverride').every((s) => s.attrs['w:val'] === '1'));
  assert.equal(attr(child(nums[0], 'w:abstractNumId'), 'w:val'), '0');
  assert.equal(attr(child(ordered, 'w:abstractNumId'), 'w:val'), '1');
});

test('numbering.xml: two abstract numberings (bullet, decimal) with 9 levels, logical indents and lvlJc start (WF7.3.5)', () => {
  const { files } = build('- a');
  const numbering = parseXml(files['word/numbering.xml']);
  const abstracts = find(numbering, 'w:abstractNum');
  assert.equal(abstracts.length, 2);
  assert.equal(attr(child(child(abstracts[0], 'w:lvl'), 'w:numFmt'), 'w:val'), 'bullet');
  assert.equal(attr(child(child(abstracts[1], 'w:lvl'), 'w:numFmt'), 'w:val'), 'decimal');
  abstracts.forEach((a) => {
    const lvls = find(a, 'w:lvl');
    assert.equal(lvls.length, 9);
    lvls.forEach((lvl, i) => {
      assert.equal(attr(child(lvl, 'w:lvlJc'), 'w:val'), 'start');
      const ind = child(child(lvl, 'w:pPr'), 'w:ind');
      assert.equal(ind.attrs['w:start'], String(720 * (i + 1)));
      assert.equal(ind.attrs['w:hanging'], '360');
    });
  });
  const order = Array.from(find(numbering, 'w:numbering')[0].children).map((c) => c.name);
  assert.ok(order.lastIndexOf('w:abstractNum') < order.indexOf('w:num'), 'abstractNum elements come before num elements');
});

test('lists: nesting sets ilvl; depth beyond 9 levels maps to level 8 (NFR7.10)', () => {
  const { doc } = build('* a\n  * b\n    * c');
  assert.deepEqual(content(doc).map((p) => numPrOf(p).ilvl), [0, 1, 2]);
  const deep = [{ type: 'list', ordered: false, items: [{ runs: [{ text: 'x' }], task: 'none', level: 12, ordered: false }] }];
  assert.equal(numPrOf(content(build(deep).doc)[0]).ilvl, 8);
});

test('lists: task items start with ☐ / ☑ and use an indent instead of a bullet', () => {
  const { doc } = build('- [ ] פתוחה\n- [x] סגורה\n  - [ ] פנימית');
  const ps = content(doc);
  assert.deepEqual(ps.map((p) => pText(p).slice(0, 2)), ['☐ ', '☑ ', '☐ ']);
  ps.forEach((p) => assert.equal(numPrOf(p), null));
  assert.deepEqual(ps.map((p) => attr(child(pPrOf(p), 'w:ind'), 'w:start')), ['720', '720', '1440']);
});

test('lists: 200 ordered lists each get their own numId 2..201 and restart at 1 (NFR7.9)', () => {
  const md = Array.from({ length: 200 }, (_, i) => `1. שורה ${i}\n2. שנייה\n\nפסקה ${i}`).join('\n\n');
  const { doc, files } = build(md);
  const ids = new Set(content(doc).map(numPrOf).filter(Boolean).map((n) => n.numId));
  assert.equal(ids.size, 200);
  assert.equal(Math.min(...ids), 2);
  assert.equal(Math.max(...ids), 201);
  const nums = find(parseXml(files['word/numbering.xml']), 'w:num');
  assert.equal(nums.length, 201);
  nums.slice(1).forEach((n) => assert.equal(find(n, 'w:startOverride').length, 9));
});

/* ------------------------------------------------------------------ code, diagram, quote, hr, image (BR3.9, BR3.10) */

test('code: one paragraph per line in Consolas, LTR, jc left, no LRM, tabs kept (WF7.2)', () => {
  const { doc } = build('```js\nconst API = "עברית";\n\tindent\n\nend\n```');
  const ps = content(doc);
  assert.equal(ps.length, 4);
  ps.forEach((p) => {
    assert.equal(attr(child(pPrOf(p), 'w:pStyle'), 'w:val'), 'Code');
    assert.equal(bidiOf(p), '0');
    assert.equal(jcOf(p), 'left');
    runsOf(p).forEach((r) => {
      const f = child(child(r, 'w:rPr'), 'w:rFonts');
      ['w:ascii', 'w:hAnsi', 'w:cs'].forEach((a) => assert.equal(f.attrs[a], 'Consolas'));
      assert.ok(!rtlRun(r));
    });
  });
  assert.equal(pText(ps[0]), 'const API = "עברית";');
  assert.equal(find(ps[1], 'w:tab').length, 1);
  assert.equal(find(ps[2], 'w:r').length, 0, 'an empty line is an empty paragraph');
  assert.ok(!ps.map(pText).join('').includes(L));
});

test('diagram: a caption paragraph "תרשים (Mermaid), קוד המקור" followed by the source as code (BR3.9)', () => {
  const { doc } = build('```mermaid\nflowchart LR\n  A --> B\n```');
  const ps = content(doc);
  assert.equal(pText(ps[0]), `תרשים (${L}Mermaid${L}), קוד המקור`);   // a Hebrew unit: the LRM rule applies to "Mermaid"
  assert.equal(attr(child(pPrOf(ps[1]), 'w:pStyle'), 'w:val'), 'Code');
  assert.equal(pText(ps[1]), 'flowchart LR');
  assert.equal(pText(ps[2]).trim(), 'A --> B');
  assert.equal(pText(ps[2]), '  A --> B', 'indentation is kept');
});

test('quote and rule: Quote style paragraph; hr is an empty paragraph with a bottom border', () => {
  const { doc } = build('> ציטוט\n\n---');
  const [q, hr] = content(doc);
  assert.equal(attr(child(pPrOf(q), 'w:pStyle'), 'w:val'), 'Quote');
  assert.equal(pText(q), 'ציטוט');
  assert.ok(child(child(pPrOf(hr), 'w:pBdr'), 'w:bottom'));
  assert.equal(pText(hr), '');
});

test('image: "[תמונה: alt]" as text; an external address becomes a link, a relative path stays text — nothing is fetched or embedded (BR3.10)', () => {
  const { doc, files, result } = build('![לוגו](https://a.b/logo.png)\n\n![אייקון](icon.svg)\n\nטקסט ![x](mailto:a@b.c) עוד');
  const [a, b, c] = content(doc);
  assert.equal(pText(a), '[תמונה: לוגו]');
  assert.equal(find(a, 'w:hyperlink').length, 1);
  assert.equal(pText(b), '[תמונה: אייקון]');
  assert.equal(find(b, 'w:hyperlink').length, 0);
  assert.ok(pText(c).includes('[תמונה: x]'));
  assert.ok(!result.parts.some((p) => /media|\.png|\.svg/.test(p.path)), 'no embedded media');
  const rels = find(parseXml(files['word/_rels/document.xml.rels']), 'Relationship');
  assert.ok(rels.every((r) => !/icon\.svg/.test(r.attrs.Target)));
});

/* ------------------------------------------------------------------ links (NFR9.4, BR3.10, NFR7.12) */

test('links (security): none of the 7 hostile addresses ever reaches a relationship or a w:hyperlink (NFR9.4)', () => {
  const bad = ['javascript:alert(1)', 'JaVaScRiPt:x', 'java\tscript:x', ' javascript:x', 'data:text/html,x', 'file:///etc/passwd', 'vbscript:x'];
  // through the Markdown parser
  const md = bad.map((u, i) => `קישור ${i} [טקסט${i}](${u})`).join('\n\n') + '\n\n[רלטיבי](docs/a.md) [עוגן](#sec)';
  const viaParser = build(md);
  assert.equal(find(viaParser.doc, 'w:hyperlink').length, 0);
  // and with hand-built runs that skipped the parser (defence in depth)
  const direct = build(bad.map((u) => ({ type: 'p', runs: [{ text: 'x', href: u }] })).concat([{ type: 'p', runs: [{ text: 'rel', href: 'docs/a.md' }, { text: 'anc', href: '#s' }] }]));
  assert.equal(find(direct.doc, 'w:hyperlink').length, 0);
  [viaParser, direct].forEach((r) => {
    const rels = find(parseXml(r.files['word/_rels/document.xml.rels']), 'Relationship');
    assert.ok(rels.every((x) => x.attrs.TargetMode !== 'External'), 'no external relationship');
    assert.ok(!/javascript|vbscript|data:|file:/i.test(r.files['word/_rels/document.xml.rels']));
  });
  const visible = pText(paras(viaParser.doc)[2]);
  assert.ok(visible.includes('טקסט') && visible.includes('javascript'), 'the visible source text stays: ' + visible);
});

test('links (positive): https with & and mailto become external hyperlinks; the Target is escaped (NFR9.4)', () => {
  const { doc, files } = build('ראו [א](https://a.b/c?d=1&e=2) ו-[ב](mailto:a@b.c)');
  const links = find(doc, 'w:hyperlink');
  assert.equal(links.length, 2);
  const rels = find(parseXml(files['word/_rels/document.xml.rels']), 'Relationship').filter((r) => r.attrs.TargetMode === 'External');
  assert.deepEqual(rels.map((r) => r.attrs.Target), ['https://a.b/c?d=1&amp;e=2', 'mailto:a@b.c']);
  assert.ok(files['word/_rels/document.xml.rels'].includes('https://a.b/c?d=1&amp;e=2'));
  assert.equal(attr(child(child(find(links[0], 'w:r')[0], 'w:rPr'), 'w:rStyle'), 'w:val'), 'Hyperlink');
  assert.ok(!files['word/_rels/document.xml.rels'].includes(L), 'no LRM inside an address');
});

test('links: 500 links get 500 distinct, sequential rIds starting at rId10 (NFR7.12)', () => {
  const md = Array.from({ length: 500 }, (_, i) => `[קישור ${i}](https://example.com/p${i})`).join('\n\n');
  const { doc, files } = build(md);
  const ids = find(doc, 'w:hyperlink').map((h) => h.attrs['r:id']);
  assert.equal(new Set(ids).size, 500);
  assert.equal(ids[0], 'rId10');
  assert.equal(ids[499], 'rId509');
  const external = find(parseXml(files['word/_rels/document.xml.rels']), 'Relationship').filter((r) => r.attrs.TargetMode === 'External');
  assert.equal(external.length, 500);
});

/* ------------------------------------------------------------------ schema order, escaping, styles */

const ORDER = {
  'w:pPr': ['w:pStyle', 'w:keepNext', 'w:numPr', 'w:pBdr', 'w:shd', 'w:bidi', 'w:spacing', 'w:ind', 'w:contextualSpacing', 'w:jc', 'w:outlineLvl'],
  'w:rPr': ['w:rStyle', 'w:rFonts', 'w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:strike', 'w:color', 'w:sz', 'w:szCs', 'w:u', 'w:shd', 'w:rtl', 'w:lang'],
  'w:tblPr': ['w:tblStyle', 'w:bidiVisual', 'w:tblW', 'w:tblInd', 'w:tblBorders', 'w:tblCellMar', 'w:tblLook'],
  'w:tcPr': ['w:tcW', 'w:shd']
};

test('schema order: children of pPr, rPr, tblPr and tcPr follow the OOXML sequence everywhere (WF7.4)', () => {
  const md = [
    '# **כותרת** `c`', '> ציטוט ***מודגש*** ~~מחוק~~ [l](https://a.b)', '- [x] משימה', '1. מספרי', '* תבליט', '---',
    '| א | ב |\n| :--- | ---: |\n| **1** | 2 |', '```js\nx\n```', 'English only'
  ].join('\n\n');
  const { doc, files } = build(md);
  const styles = parseXml(files['word/styles.xml']);
  const numbering = parseXml(files['word/numbering.xml']);
  let checked = 0;
  [doc, styles, numbering].forEach((root) => {
    Object.keys(ORDER).forEach((tag) => {
      find(root, tag).forEach((node) => {
        const idx = node.children.map((c) => ORDER[tag].indexOf(c.name));
        assert.ok(idx.every((i) => i >= 0), `${tag}: unexpected child in ${node.children.map((c) => c.name)}`);
        assert.deepEqual(idx, idx.slice().sort((a, b) => a - b), `${tag} order: ${node.children.map((c) => c.name)}`);
        checked++;
      });
    });
  });
  assert.ok(checked > 40, 'the order check really ran on many elements: ' + checked);
});

test('escaping (security): hostile text becomes text, the XML stays balanced, control characters vanish (NFR9.1)', () => {
  const evil = '<w:p>]]></w:p> & "q" \'s\' \u0001\u0008 </w:body>';
  const { doc, files } = build([{ type: 'p', runs: [{ text: evil }] }], { title: evil });
  assert.doesNotThrow(() => parseXml(files['word/document.xml']));
  const p = content(doc)[0];
  assert.equal(pText(p), '<w:p>]]></w:p> & "q" \'s\'  </w:body>');
  assert.ok(files['word/document.xml'].includes('&lt;w:p&gt;]]&gt;&lt;/w:p&gt;'));
  assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(files['word/document.xml']));
  assert.doesNotThrow(() => parseXml(files['docProps/core.xml']));
});

test('styles.xml: every style the document references is defined; docDefaults use Arial for ascii, hAnsi and cs; Code uses Consolas', () => {
  const { doc, files } = build('# א\n\n> ב\n\n- ג\n\n```\nx\n```\n\n[l](https://a.b)\n\n| a |\n| --- |\n| 1 |');
  const styles = parseXml(files['word/styles.xml']);
  const defined = new Set(find(styles, 'w:style').map((s) => s.attrs['w:styleId']));
  const used = new Set([...find(doc, 'w:pStyle'), ...find(doc, 'w:rStyle'), ...find(doc, 'w:tblStyle')].map((n) => n.attrs['w:val']));
  used.forEach((id) => assert.ok(defined.has(id), 'style not defined: ' + id));
  ['Normal', 'Title', 'Heading1', 'Heading2', 'Heading3', 'Quote', 'Code', 'ListParagraph', 'Hyperlink', 'TableGrid'].forEach((id) => assert.ok(defined.has(id), id));
  const defaults = child(child(styles, 'w:docDefaults'), 'w:rPrDefault');
  const f = child(child(defaults, 'w:rPr'), 'w:rFonts');
  ['w:ascii', 'w:hAnsi', 'w:cs'].forEach((a) => assert.equal(f.attrs[a], 'Arial'));
  const code = find(styles, 'w:style').find((s) => s.attrs['w:styleId'] === 'Code');
  assert.equal(attr(child(child(code, 'w:rPr'), 'w:rFonts'), 'w:cs'), 'Consolas');
  const h1 = find(styles, 'w:style').find((s) => s.attrs['w:styleId'] === 'Heading1');
  assert.equal(attr(child(child(h1, 'w:rPr'), 'w:sz'), 'w:val'), attr(child(child(h1, 'w:rPr'), 'w:szCs'), 'w:val'), 'sz is paired with szCs');
});

test('settings.xml: Hebrew as the complex-script language (WF7.1)', () => {
  const { files } = build('א');
  const settings = parseXml(files['word/settings.xml']);
  assert.equal(attr(child(settings, 'w:themeFontLang'), 'w:bidi'), 'he-IL');
  assert.ok(child(settings, 'w:defaultTabStop'));
});

/* ------------------------------------------------------------------ core.xml privacy (NFR9.6) */

test('core.xml: title (escaped, max 255 characters), dates from asOf, empty creator and lastModifiedBy, no user or path (NFR9.6)', () => {
  const { files, result } = build('א', { title: 'א'.repeat(300) + '<&>' });
  const core = parseXml(files['docProps/core.xml']);
  assert.equal(Array.from(textOf(child(core, 'dc:title'))).length, 255);
  assert.equal(textOf(child(core, 'dc:creator')), '');
  assert.equal(textOf(child(core, 'cp:lastModifiedBy')), '');
  assert.equal(textOf(child(core, 'dcterms:created')), '2026-11-02T00:00:00Z');
  assert.equal(textOf(child(core, 'dcterms:modified')), '2026-11-02T00:00:00Z');
  const user = os.userInfo().username;
  result.parts.forEach((p) => {
    const text = Buffer.from(p.data).toString('utf8');
    if (user && user.length > 2) assert.ok(!text.includes(user), `${p.path} leaks the user name`);
    assert.ok(!text.includes('/Users/') && !text.includes('C:\\'), `${p.path} leaks a path`);
  });
  const esc = build('א', { title: 'a<b&c' }).files['docProps/core.xml'];
  assert.ok(esc.includes('a&lt;b&amp;c'));
});

/* ------------------------------------------------------------------ scale (NFR7.6, NFR7.8) */

test('scale: a 1 MB document builds without error, as bytes, and the package opens (NFR7.6, NFR7.8)', () => {
  const unit = '## כותרת\n\nשורה עברית עם English 3.5 ו-**מודגש** וקישור [x](https://a.b/c)\n\n| א | ב |\n| --- | --- |\n| 1 | 2 |\n\n- פריט\n\n';
  let md = '';
  while (md.length < 1024 * 1024) md += unit;
  const t0 = Date.now();
  const { result } = build(md);
  const entries = readZip(E.zipStore(result.parts));
  assert.equal(entries.length, 8);
  assert.ok(entries[2].size > 1024 * 1024, 'document.xml is larger than the input');
  assert.ok(Date.now() - t0 < 60000, 'sanity bound only; the real targets are measured in e2e');
});

test('buildDocx: an empty document is valid; an unknown block type is skipped, not fatal', () => {
  const { doc } = build([]);
  assert.equal(content(doc).length, 0);
  const odd = build([{ type: 'mystery' }, { type: 'p', runs: [{ text: 'ok' }] }]);
  assert.equal(pText(content(odd.doc)[0]), 'ok');
});
