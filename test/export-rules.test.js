// v4.7.0 — export-core.js: the export rules (LRM, file name, "as of" date, title) and the Markdown serializer.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../export-core');

const L = '\u200E';
const plain = (runs) => runs.map((r) => r.text).join('');

/* ------------------------------------------------------------------ LRM (BR4.3, Appendix A) */

const APPENDIX_A = [
  [1, 'השלב 3.5 Code Generation מייצר קוד', `השלב ${L}3.5 Code Generation${L} מייצר קוד`],
  [2, 'משתמשים ב-API.', `משתמשים ב-${L}API${L}.`],
  [3, 'גרסה v4.7.0 שוחררה', `גרסה ${L}v4.7.0${L} שוחררה`],
  [4, 'ראו (README.md) למעלה', `ראו (${L}README.md${L}) למעלה`],
  [5, 'Code Generation', 'Code Generation'],
  [6, `השלב ${L}3.5${L} פעיל`, `השלב ${L}3.5${L} פעיל`],
  [9, 'נכון ל-01.11.2026', `נכון ל-${L}01.11.2026${L}`]
];
for (const [n, input, expected] of APPENDIX_A) {
  test(`applyLrm — Appendix A case ${n}`, () => {
    assert.equal(E.applyLrm(input), expected);
  });
}

test('applyLrm — Appendix A case 7: the address of a link is never touched, the Hebrew link text needs no change', () => {
  const runs = E.parseRuns('קישור [מדריך](https://x.y/a)');
  const out = E.applyLrmToRuns(runs);
  assert.equal(out[1].href, 'https://x.y/a');
  assert.equal(plain(out), 'קישור מדריך');
});

test('applyLrm — Appendix A case 8: inline code is never touched', () => {
  const runs = E.parseRuns('הפקודה `npm test` רצה');
  const out = E.applyLrmToRuns(runs);
  assert.deepEqual(out, runs);
  assert.equal(out[1].text, 'npm test');
});

test('applyLrm: idempotent — a second pass changes nothing; one-sided marks are completed', () => {
  const once = E.applyLrm('השלב 3.5 Code Generation מייצר קוד');
  assert.equal(E.applyLrm(once), once);
  assert.equal(E.applyLrm(`א ${L}API ב`), `א ${L}API${L} ב`);
});

test('applyLrm: hyphens, slashes and colons join an expression; edge punctuation stays outside; a double space splits it', () => {
  assert.equal(E.applyLrm('שירות ב-API-Gateway/v2 עובד'), `שירות ב-${L}API-Gateway/v2${L} עובד`);
  assert.equal(E.applyLrm('ראו: src/a.b:c: סוף'), `ראו: ${L}src/a.b:c${L}: סוף`);
  // "://" is two separators in a row, so by the rule of BR4.3 a URL is wrapped as separate chunks
  assert.equal(E.applyLrm('ראו http://a.b/c כאן'), `ראו ${L}http${L}://${L}a.b/c${L} כאן`);
  assert.equal(E.applyLrm('א Foo  Bar ב'), `א ${L}Foo${L}  ${L}Bar${L} ב`);
  assert.equal(E.applyLrm('יש 5 פריטים'), `יש ${L}5${L} פריטים`);
});

test('hasHebrew: Hebrew letters only (Arabic, Latin and digits are not)', () => {
  assert.equal(E.hasHebrew('abc שלום'), true);
  assert.equal(E.hasHebrew('abc 123 مرحبا'), false);
  assert.equal(E.hasHebrew(''), false);
  assert.equal(E.hasHebrew(null), false);
});

test('applyLrmToRuns: the unit decides — Hebrew in one run marks the Latin in the others; code, images and addresses stay untouched', () => {
  const runs = E.parseRuns('Use **Code Generation** כאן, `a b`, ![alt text](x.png) [API docs](https://a.b)');
  const out = E.applyLrmToRuns(runs);
  assert.equal(out.find((r) => r.bold).text, `${L}Code Generation${L}`);
  assert.equal(out.find((r) => r.code).text, 'a b');
  assert.equal(out.find((r) => r.img).text, 'alt text');
  assert.equal(out.find((r) => r.href === 'https://a.b').text, `${L}API docs${L}`);
  assert.equal(out.find((r) => r.href === 'https://a.b').href, 'https://a.b');
  const latinOnly = E.parseRuns('Use **Code Generation** here');
  assert.deepEqual(E.applyLrmToRuns(latinOnly), latinOnly);
});

test('applyLrmToRuns does not mutate its input', () => {
  const runs = E.parseRuns('עברית API');
  const copy = JSON.parse(JSON.stringify(runs));
  E.applyLrmToRuns(runs);
  assert.deepEqual(runs, copy);
});

/* ------------------------------------------------------------------ date (BR4.2) */

test('asOfDate: DD.MM.YYYY by default and YYYY-MM-DD on request, zero-padded, from the LOCAL date', () => {
  const d = new Date(2026, 10, 2, 23, 59, 59);   // 2 Nov 2026, late evening local time
  assert.equal(E.asOfDate(d), '02.11.2026');
  assert.equal(E.asOfDate(d, 'iso'), '2026-11-02');
  assert.equal(E.asOfDate(new Date(2026, 0, 5), 'dmy'), '05.01.2026');
  assert.equal(E.asOfDate(new Date(2026, 0, 5), 'iso'), '2026-01-05');
});

test('asOfDate: a string already in ISO form is accepted; an invalid date throws', () => {
  assert.equal(E.asOfDate('2026-11-02'), '02.11.2026');
  assert.equal(E.asOfDate('2026-11-02', 'iso'), '2026-11-02');
  assert.throws(() => E.asOfDate(new Date('nope')), /date/i);
});

/* ------------------------------------------------------------------ file name (BR4.4) */

const D = new Date(2026, 10, 2);

test('fileName: <title>-<YYYY-MM-DD>.<ext>, Hebrew titles are kept, spaces become "-"', () => {
  assert.equal(E.fileName('מסמך אפיון מערכת', D, 'docx'), 'מסמך-אפיון-מערכת-2026-11-02.docx');
  assert.equal(E.fileName('My Spec', D, 'md'), 'My-Spec-2026-11-02.md');
  assert.equal(E.fileName('x', '2026-01-05', 'html'), 'x-2026-01-05.html');
});

test('fileName: removes \\ / : * ? " < > | and control characters, and bidi marks', () => {
  assert.equal(E.fileName('a\\b/c:d*e?f"g<h>i|j', D, 'md'), 'abcdefghij-2026-11-02.md');
  assert.equal(E.fileName('x\u0000y\u001Fz\u007F', D, 'md'), 'xyz-2026-11-02.md');
  assert.equal(E.fileName(`${L}שלום${L}\u202Eevil`, D, 'md'), 'שלוםevil-2026-11-02.md');
});

test('fileName: runs of spaces collapse; leading / trailing separators and dots are trimmed', () => {
  assert.equal(E.fileName('  a   b  ', D, 'md'), 'a-b-2026-11-02.md');
  assert.equal(E.fileName('..hidden.', D, 'md'), 'hidden-2026-11-02.md');
  assert.equal(E.fileName('--x--', D, 'md'), 'x-2026-11-02.md');
});

test('fileName: at most 80 characters, never splitting a surrogate pair', () => {
  const long = 'א'.repeat(200);
  const name = E.fileName(long, D, 'docx');
  assert.equal(name, 'א'.repeat(80) + '-2026-11-02.docx');
  const emoji = E.fileName('😀'.repeat(100), D, 'md');
  const base = emoji.replace('-2026-11-02.md', '');
  assert.equal(Array.from(base).length, 80);
  assert.ok(!/[\uD800-\uDBFF]$/.test(base));
});

test('fileName: nothing usable left falls back to md-workspace', () => {
  for (const t of ['', '   ', '\\/:*?"<>|', null, undefined, '...']) {
    assert.equal(E.fileName(t, D, 'md'), 'md-workspace-2026-11-02.md', String(t));
  }
});

/* ------------------------------------------------------------------ title (BR4.1) */

test('resolveTitle: #doc-title first, then the first h1, then md-workspace', () => {
  const blocks = E.parseBlocks('## sub\n\n# **כותרת** ראשית\n\n# שנייה');
  assert.equal(E.resolveTitle('  שם מהשדה ', blocks), 'שם מהשדה');
  assert.equal(E.resolveTitle('', blocks), 'כותרת ראשית');
  assert.equal(E.resolveTitle('   ', E.parseBlocks('טקסט בלבד')), 'md-workspace');
  assert.equal(E.resolveTitle(undefined, []), 'md-workspace');
  assert.equal(E.resolveTitle('', null), 'md-workspace');
});

test('resolveTitle: finds an h1 inside a <div dir> region', () => {
  assert.equal(E.resolveTitle('', E.parseBlocks('<div dir="rtl">\n# בתוך אזור\n</div>')), 'בתוך אזור');
});

/* ------------------------------------------------------------------ Markdown serializer (BR3.6) */

const ASOF = new Date(2026, 10, 2);

test('toMarkdown: wrapper, title, "as of" line and blocks, with LRM by the rule', () => {
  const blocks = E.parseBlocks('## מבוא\n\nהשלב 3.5 Code Generation מייצר קוד\n\n- פריט API\n- [x] משימה');
  const md = E.toMarkdown(blocks, { title: 'כותרת', asOf: ASOF });
  assert.equal(md, [
    '<div dir="rtl" lang="he">', '',
    '# כותרת', '',
    `נכון ל-${L}02.11.2026${L}`, '',
    '## מבוא', '',
    `השלב ${L}3.5 Code Generation${L} מייצר קוד`, '',
    `- פריט ${L}API${L}`,
    '- [x] משימה', '',
    '</div>', ''
  ].join('\n'));
});

test('toMarkdown: code and diagrams are written as they are (no LRM), addresses keep their text', () => {
  const src = 'טקסט\n\n```js\nconst API = "x y";\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\nראו [Docs API](https://a.b/c_d?x=1&y=2) ו-![Logo X](img/a b.png)';
  const md = E.toMarkdown(E.parseBlocks(src), { title: 'T', asOf: ASOF });
  assert.ok(md.includes('```js\nconst API = "x y";\n```'));
  assert.ok(md.includes('```mermaid\nflowchart LR\n  A --> B\n```'));
  assert.ok(md.includes('(https://a.b/c_d?x=1&y=2)'));
  assert.ok(!md.includes(`${L}https`) && !md.includes(`c_d?x=1&y=2${L}`));
});

test('toMarkdown: an empty document still has the wrapper, the title and the date', () => {
  assert.equal(E.toMarkdown([], { title: 'T', asOf: ASOF }), `<div dir="rtl" lang="he">\n\n# T\n\nנכון ל-${L}02.11.2026${L}\n\n</div>\n`);
});

test('toMarkdown: a title without Hebrew gets no LRM (explicit LTR unit)', () => {
  const md = E.toMarkdown([], { title: 'Release 4.7.0', asOf: ASOF });
  assert.ok(md.includes('# Release 4.7.0\n'));
});

const ROUND_TRIP = {
  headings: '# א\n\n## ב **ג**\n\n###### ו',
  inline: 'פסקה **מודגש** *נטוי* ~~מחוק~~ `קוד` [קישור](https://x.y/a_b) ***שניהם*** ![לוגו](icon.svg)\nשורה שנייה',
  lists: '* א\n  * ב\n    * ג\n  1. x\n  2. y\n* ד\n\n1. one\n2. two\n   * inner\n3. three',
  tasks: '- [ ] open\n- [x] done\n  - [x] inner',
  table: '| שם | ערך | הערה |\n| :--- | :---: | ---: |\n| א | 1 | **מודגש** |\n| ב | 2 | [k](a.md) |',
  tablePlain: '| a | b |\n| --- | --- |\n| 1 | 2 |',
  quote: '> שורה ראשונה\n> שורה *שנייה*\n\nפסקה',
  code: '```js\nlet a = 1;\n```\n\n```\nplain\n```',
  diagram: '```mermaid\nflowchart LR\n  A --> B\n```',
  hrImage: 'א\n\n---\n\n![alt](a.png)\n\nב',
  regions: '<div dir="rtl">\nעברית\n\n<div dir="ltr">\nEnglish\n</div>\n</div>'
};
for (const [name, md] of Object.entries(ROUND_TRIP)) {
  test(`blocksToMarkdown round trip — ${name}: parseBlocks(blocksToMarkdown(b)) equals b`, () => {
    const blocks = E.parseBlocks(md);
    const again = E.parseBlocks(E.blocksToMarkdown(blocks));
    assert.deepEqual(again, blocks);
  });
}

test('blocksToMarkdown: the real sample documents keep their block structure', () => {
  const S = require('../css-studio');
  const sample = fs.readFileSync(path.join(__dirname, '..', 'samples', 'css-studio-sample.md'), 'utf8');
  for (const md of [S.SAMPLE_MD, sample]) {
    const blocks = E.parseBlocks(md);
    assert.deepEqual(E.parseBlocks(E.blocksToMarkdown(blocks)), blocks);
  }
});

test('blocksToMarkdown: ordered lists are numbered 1., 2., ... per level and restart after a break; short table rows are padded', () => {
  const md = E.blocksToMarkdown(E.parseBlocks('1. a\n   1. b\n   2. c\n2. d\n\ntext\n\n| a | b | c |\n| --- | --- | --- |\n| 1 |'));
  assert.ok(md.startsWith('1. a\n  1. b\n  2. c\n2. d\n\ntext\n\n'));
  assert.ok(md.endsWith('| 1 |  |  |'));
});

test('blocksToMarkdown: the LRM option is off by default and on for toMarkdown', () => {
  const blocks = E.parseBlocks('עברית API');
  assert.equal(E.blocksToMarkdown(blocks), 'עברית API');
  assert.equal(E.blocksToMarkdown(blocks, { lrm: true }), `עברית ${L}API${L}`);
});
