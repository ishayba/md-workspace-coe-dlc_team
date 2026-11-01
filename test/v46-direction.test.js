// v4.6.0 — RTL acceptance criterion: every new Markdown feature must work in a Hebrew (right-to-left) document.
// applyAutoDirection() needs a DOM, so these tests check what can be checked in Node:
//  1. every tag the parser now emits is either covered by applyAutoDirection's selector or is inline/void
//     (so a Hebrew text container can never be left without a direction),
//  2. the Hebrew text of each feature is detected as rtl,
//  3. the visual editor's round trip stays stable with Hebrew content.
// The resulting `dir` attributes in a real DOM are covered by the browser e2e tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadParser, loadFunctions } = require('../test-support/load-app');
const V = require('../md-visual');

const { parseMarkdown } = loadParser();
const { detectTextDirection } = loadFunctions(['detectTextDirection']);
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();
const SELECTOR = index.match(/root\.querySelectorAll\('([^']+)'\)/)[1].split(',').map((s) => s.trim());
// inline/void tags, plus table row containers that hold only th/td (those cells are in the selector)
const INLINE_OR_VOID = new Set(['strong', 'em', 'code', 'del', 'a', 'img', 'input', 'br', 'hr', 'thead', 'tbody', 'tr']);
const textOf = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');

const FEATURES = {
  'SC-1 link': 'ראו את [המסמך המלא](https://example.com/doc) לפרטים נוספים',
  'SC-2 image': 'לפני התמונה ![לוגו החברה](icon.svg) ואחריה',
  'SC-3 hr': 'פסקה ראשונה בעברית\n\n---\n\nפסקה שנייה בעברית',
  'SC-4 bullets': '- פריט ראשון ברשימה\n+ פריט שני ברשימה\n* פריט שלישי ברשימה',
  'SC-5 tasks': '- [ ] לכתוב את הקוד\n- [x] לבדוק את התוצאה',
  'SC-6 strike': 'הטקסט הזה ~~נמחק מהמסמך~~ והטקסט הזה נשאר',
  'SC-7 nested': '* רמה ראשונה של הרשימה\n  * רמה שנייה של הרשימה\n    1. רמה שלישית ממוספרת',
  'SC-8 quote': '> שורה ראשונה של הציטוט\n> שורה שנייה של הציטוט',
  'SC-9 align': '| שם העמודה | כמות | מחיר |\n| :--- | :---: | ---: |\n| תפוחים | חמש | עשר |'
};

test('the direction pass covers the block tags that hold text (selector read from index.html)', () => {
  for (const tag of ['p', 'li', 'ul', 'ol', 'blockquote', 'td', 'th', 'table']) assert.ok(SELECTOR.includes(tag), tag);
});

for (const [name, md] of Object.entries(FEATURES)) {
  test(`RTL — ${name}: every emitted tag is direction-covered or inline, and the Hebrew text is rtl`, () => {
    const html = body(md);
    const tags = new Set((html.match(/<([a-z][a-z0-9]*)/g) || []).map((t) => t.slice(1)));
    assert.ok(tags.size > 0);
    for (const t of tags) assert.ok(SELECTOR.includes(t) || INLINE_OR_VOID.has(t), `<${t}> is neither in the direction selector nor inline`);
    assert.equal(detectTextDirection(textOf(html)), 'rtl');
  });

  test(`RTL — ${name}: the visual editor round trip is stable with Hebrew content`, () => {
    const out = V.htmlToMarkdown(body(md));
    assert.equal(body(out), body(md), `markdown after conversion:\n${out}`);
    assert.equal(V.htmlToMarkdown(body(out)), out, 'second conversion is stable');
  });
}

test('RTL — a Hebrew sentence with an English link label or image alt stays rtl', () => {
  assert.equal(detectTextDirection(textOf(body('ההוראות נמצאות ב-[README](docs/readme.md) של הפרויקט'))), 'rtl');
  assert.equal(detectTextDirection(textOf(body('- [x] לעדכן את ה-API ולבדוק JSON'))), 'rtl');
});

test('RTL — an English document with the new features is still ltr', () => {
  assert.equal(detectTextDirection(textOf(body('- [ ] write the code\n  - nested item here'))), 'ltr');
});
