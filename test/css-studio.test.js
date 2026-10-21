const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../css-studio');
const { loadParser } = require('../test-support/load-app');

const byKey = (k) => S.ELEMENTS.find((e) => e.key === k);

/* ---------- catalog ---------- */

test('catalog: elements have unique keys + selectors and Hebrew labels', () => {
  const keys = S.ELEMENTS.map((e) => e.key);
  const sels = S.ELEMENTS.map((e) => e.selector);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(sels).size, sels.length);
  for (const e of S.ELEMENTS) assert.match(e.label, /[\u0590-\u05FF]/, `label of ${e.key} should be Hebrew`);
  assert.ok(byKey('root') && byKey('root').selector === '');
});

test('catalog: properties have unique CSS names, Hebrew labels and a known type', () => {
  const keys = S.PROPERTIES.map((p) => p.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const p of S.PROPERTIES) {
    assert.match(p.label, /[\u0590-\u05FF]/, p.key);
    assert.ok(['color', 'length', 'number', 'select', 'border'].includes(p.type), p.key);
  }
});

test('catalog covers every element the current parser can emit', () => {
  const needed = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'table', 'th', 'td', 'mermaid', 'footer', 'dir-rtl', 'dir-ltr'];
  for (const k of needed) assert.ok(byKey(k), `missing element: ${k}`);
});

test('buildSelector scopes to the template class, with optional dark prefix', () => {
  assert.equal(S.buildSelector('x', byKey('root'), false), '.template-x');
  assert.equal(S.buildSelector('x', byKey('h1'), false), '.template-x h1');
  assert.equal(S.buildSelector('x', byKey('h1'), true), '[data-theme="dark"] .template-x h1');
  assert.equal(S.buildSelector('x', byKey('dir-rtl'), false), '.template-x div[dir="rtl"]');
});

/* ---------- CSS <-> model ---------- */

test('serialises a model to deterministic, readable CSS', () => {
  const m = S.modelFromCss('', 'demo');
  S.setProp(m, 'light', 'h1', 'color', '#112233');
  S.setProp(m, 'light', 'h1', 'font-size', '30px');
  S.setProp(m, 'light', 'root', 'font-family', 'Arial, Helvetica, sans-serif');
  S.setProp(m, 'dark', 'h1', 'color', '#ddeeff');
  assert.equal(S.cssFromModel(m), [
    '.template-demo {',
    '  font-family: Arial, Helvetica, sans-serif;',
    '}',
    '',
    '.template-demo h1 {',
    '  color: #112233;',
    '  font-size: 30px;',
    '}',
    '',
    '[data-theme="dark"] .template-demo h1 {',
    '  color: #ddeeff;',
    '}',
    ''
  ].join('\n'));
});

test('parses existing CSS into the model (incl. dark rules) and is a fixed point after one pass', () => {
  const css = `.template-a h1 { color: #111; font-size: 28px }
.template-a table th { background-color: #eee; }
[data-theme="dark"] .template-a h1 { color: #fff; }`;
  const m = S.modelFromCss(css, 'a');
  assert.equal(S.getProp(m, 'light', 'h1', 'color'), '#111');
  assert.equal(S.getProp(m, 'light', 'th', 'background-color'), '#eee'); // alias "table th"
  assert.equal(S.getProp(m, 'dark', 'h1', 'color'), '#fff');
  const once = S.cssFromModel(m);
  assert.equal(S.cssFromModel(S.modelFromCss(once, 'a')), once);
});

test('comma selector lists are applied to each element', () => {
  const m = S.modelFromCss('.template-a p, .template-a li { font-size: 14px; }', 'a');
  assert.equal(S.getProp(m, 'light', 'p', 'font-size'), '14px');
  assert.equal(S.getProp(m, 'light', 'li', 'font-size'), '14px');
});

test('nothing is lost: unknown declarations, !important, foreign rules, @-rules and comments survive', () => {
  const css = `/* my note */
.template-a pre { background: #0f172a !important; color: #38bdf8 !important; padding-bottom: 8px; }
.template-other h1 { color: red; }
.template-a .custom-thing { margin: 0 }
@media print { .template-a h1 { color: #000; } }`;
  const out = S.cssFromModel(S.modelFromCss(css, 'a'));
  for (const frag of ['background: #0f172a !important', 'color: #38bdf8 !important', 'padding-bottom: 8px',
    '.template-other h1', 'color: red', '.template-a .custom-thing', '@media print', '/* my note */']) {
    assert.ok(out.includes(frag), `lost: ${frag}\n---\n${out}`);
  }
  // known property with !important is editable and keeps the flag
  const m = S.modelFromCss('.template-a pre { color: #38bdf8 !important; }', 'a');
  assert.equal(S.getProp(m, 'light', 'pre', 'color'), '#38bdf8 !important');
});

test('declaration splitter is not fooled by semicolons inside url(...) or strings', () => {
  const css = `.template-a { background-image: url(data:image/png;base64,AAAA); font-family: "A;B", serif; color: #111; }`;
  const m = S.modelFromCss(css, 'a');
  assert.equal(S.getProp(m, 'light', 'root', 'color'), '#111');
  assert.equal(S.getProp(m, 'light', 'root', 'font-family'), '"A;B", serif');
  assert.ok(S.cssFromModel(m).includes('background-image: url(data:image/png;base64,AAAA)'));
});

test('clearing the last property removes the whole rule; clearing is per mode', () => {
  const m = S.modelFromCss('.template-a h1 { color: #111; }\n[data-theme="dark"] .template-a h1 { color: #fff; }', 'a');
  S.clearProp(m, 'dark', 'h1', 'color');
  const css = S.cssFromModel(m);
  assert.ok(css.includes('.template-a h1'));
  assert.ok(!css.includes('data-theme'));
  S.clearProp(m, 'light', 'h1', 'color');
  assert.equal(S.cssFromModel(m).trim(), '');
});

test('setProp refuses values that could break out of a declaration', () => {
  const m = S.modelFromCss('', 'a');
  for (const bad of ['red; background: url(x)', '#fff } body { x', 'a</style><script>', 'x /* y */']) {
    assert.equal(S.setProp(m, 'light', 'h1', 'color', bad), false, bad);
  }
  assert.equal(S.setProp(m, 'light', 'h1', 'no-such-prop', '1px'), false);
  assert.equal(S.setProp(m, 'light', 'nope', 'color', '#fff'), false);
  assert.equal(S.cssFromModel(m).trim(), '');
});

test('the built-in "enterprise" theme survives a round trip without losing a declaration', () => {
  const css = `/* תבנית אפיון ארגוני מובנית */
.template-enterprise h1 { font-size: 26px; color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
.template-enterprise h2 { font-size: 20px; color: #1e3a8a; margin-top: 24px; border-bottom: 1px solid #e2e8f0; }
.template-enterprise table th { background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; }
.template-enterprise blockquote { border-right: 4px solid #2563eb; background: #f0f7ff; color: #1e40af; }`;
  const out = S.cssFromModel(S.modelFromCss(css, 'enterprise'));
  for (const frag of ['font-size: 26px', 'color: #0f172a', 'border-bottom: 2px solid #2563eb', 'padding-bottom: 8px',
    'margin-top: 24px', 'background: #eff6ff', 'border: 1px solid #bfdbfe', 'border-right: 4px solid #2563eb', 'background: #f0f7ff']) {
    assert.ok(out.includes(frag), `lost: ${frag}`);
  }
});

/* ---------- scoping / files / sanitising ---------- */

test('rescope renames the template class everywhere but not longer ids', () => {
  const css = '.template-a h1 {}\n[data-theme="dark"] .template-a p {}\n.template-ab h1 {}';
  assert.equal(S.rescope(css, 'a', 'z'), '.template-z h1 {}\n[data-theme="dark"] .template-z p {}\n.template-ab h1 {}');
});

test('slugifyId keeps only a-z 0-9 _ - and never returns empty', () => {
  assert.equal(S.slugifyId('My Theme!_1'), 'my-theme-_1');
  assert.match(S.slugifyId('עברית בלבד'), /^[a-z0-9][a-z0-9_-]*$/);
  assert.match(S.slugifyId(''), /^[a-z0-9][a-z0-9_-]*$/);
});

test('theme file: header round-trips id + name; name cannot break the comment', () => {
  const file = S.makeThemeFile('exec-spec', 'מסמך */ הנהלה\nשורה | שנייה', '.template-exec-spec h1 { color: red; }');
  assert.ok(!/\*\/[^\n]*\*\//.test(file.split('\n')[0]), 'header comment must close once');
  const parsed = S.parseThemeFile(file);
  assert.equal(parsed.id, 'exec-spec');
  assert.ok(parsed.name.includes('הנהלה'));
  assert.ok(!parsed.css.includes('mdw-theme'));
  assert.ok(parsed.css.includes('.template-exec-spec h1'));
  const plain = S.parseThemeFile('.template-q h1 { color: red; }');
  assert.equal(plain.id, null);
});

test('sanitizeCss neutralises style-breakout, external fetches and legacy script hooks', () => {
  const evil = `.template-a h1 { color: red }
</style><script>alert(1)</script>
@import url(https://evil.example/x.css);
.template-a p { background: url(https://evil.example/t.png); width: expression(alert(1)); }
.template-a a { background: url("//evil.example/t.png") }
.template-a b { background: url(data:image/png;base64,AAAA) }`;
  const { css, warnings } = S.sanitizeCss(evil);
  assert.ok(!/<\//.test(css), 'no closing tag sequence');
  assert.ok(!/@import/i.test(css));
  assert.ok(!/evil\.example/.test(css));
  assert.ok(!/expression\(/i.test(css));
  assert.ok(css.includes('url(data:image/png;base64,AAAA)'), 'data: urls stay');
  assert.ok(css.includes('.template-a h1 { color: red }'));
  assert.ok(warnings.length >= 3);
});

test('sanitizeCss leaves ordinary CSS untouched and rejects oversized input', () => {
  const ok = '.template-a h1 { color: #111; }\n.template-a p { margin-top: 4px; }';
  assert.deepEqual(S.sanitizeCss(ok), { css: ok, warnings: [], ok: true });
  const big = S.sanitizeCss('a{}'.repeat(100000));
  assert.equal(big.ok, false);
});

/* ---------- value helpers ---------- */

test('border helpers parse and format shorthand', () => {
  assert.deepEqual(S.parseBorder('2px solid #2563eb'), { width: '2px', style: 'solid', color: '#2563eb' });
  assert.deepEqual(S.parseBorder('none'), { width: '', style: 'none', color: '' });
  assert.equal(S.parseBorder('weird thing here now'), null);
  assert.equal(S.formatBorder({ width: '1px', style: 'dashed', color: '#000' }), '1px dashed #000');
  assert.equal(S.formatBorder({ width: '', style: 'none', color: '' }), 'none');
});

test('colour + length helpers', () => {
  assert.equal(S.rgbToHex('rgb(37, 99, 235)'), '#2563eb');
  assert.equal(S.rgbToHex('rgba(0, 0, 0, 0)'), null);
  assert.deepEqual(S.parseLength('12.5px'), { num: 12.5, unit: 'px' });
  assert.equal(S.parseLength('8px 12px'), null);
  assert.deepEqual(S.splitImportant('#fff !important'), { value: '#fff', important: true });
  assert.deepEqual(S.splitImportant('#fff'), { value: '#fff', important: false });
});

/* ---------- sample document ---------- */

test('samples/css-studio-sample.md is exactly SAMPLE_MD (no drift)', () => {
  const file = fs.readFileSync(path.join(__dirname, '..', 'samples', 'css-studio-sample.md'), 'utf8');
  assert.equal(file, S.SAMPLE_MD);
});

test('the sample renders every element of the catalog (via the real parser)', () => {
  const { parseMarkdown } = loadParser();
  const html = parseMarkdown(S.SAMPLE_MD);
  for (const e of S.ELEMENTS) {
    if (!e.probe) continue;
    assert.match(html, new RegExp(e.probe), `sample does not exercise "${e.key}" (${e.probe})`);
  }
});
