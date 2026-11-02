// v4.7 — HTML export builders (view-only, PDF fallback, live) extracted from index.html.
// BR3.2, BR3.3, BR3.4, NFR9.2, NFR9.3, NFR9.8, FR3.3–FR3.5.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loadFunctions } = require('../test-support/load-app.js');

const MdExport = require('../export-core.js');
const CssStudio = require('../css-studio.js');

// The extracted functions see these as globals, exactly like in the browser.
globalThis.MdExport = MdExport;
globalThis.CssStudio = CssStudio;
const { buildCleanHtml, buildLiveHtml } = loadFunctions(['escapeHtml', 'buildCleanHtml', 'buildLiveHtml']);

const BODY = '<h1>כותרת</h1><p>טקסט עם <strong>הדגשה</strong></p>'
  + '<pre><code>&lt;img src=x onerror=alert(1)&gt;</code></pre>';
const BASE = { title: 'מסמך בדיקה', bodyHtml: BODY, templateClass: 'template-enterprise', css: '', asOf: '14.03.2026' };

// NFR9.2: tags only, outside <pre> and <code>.
const EVENT_ATTR = /<[a-z][^>]*\son[a-z]+\s*=/i;
const outsideCode = (html) => html.replace(/<pre[\s\S]*?<\/pre>/gi, '').replace(/<code[\s\S]*?<\/code>/gi, '');

const headOf = (html) => /<head>([\s\S]*?)<\/head>/.exec(html)[1];

test('buildCleanHtml: no <script> and no event attributes outside pre/code (NFR9.2)', () => {
  const html = buildCleanHtml(BASE);
  assert.ok(!/<script/i.test(html), 'no script element');
  assert.ok(!EVENT_ATTR.test(outsideCode(html)), 'no on*= attribute');
  assert.ok(html.includes(BODY), 'the rendered body is carried over unchanged');
});

test('buildCleanHtml: the CSP meta is the first element of <head> and img-src has no http: (NFR9.2, T7)', () => {
  const head = headOf(buildCleanHtml(BASE));
  assert.match(head.trimStart(), /^<meta http-equiv="Content-Security-Policy" content="/);
  const csp = /content="([^"]*)"/.exec(head)[1];
  assert.equal(csp, "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data:");
  assert.ok(!/(^|[\s;])http:/.test(csp), 'http: is not allowed');
  assert.ok(!/script-src/.test(csp), 'no script-src without autoPrint');
});

test('buildCleanHtml: RTL document with the title and the "נכון ל-" line in a header (BR4.2)', () => {
  const html = buildCleanHtml(Object.assign({}, BASE, { title: 'A <b>&</b> "q"' }));
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.match(html, /<header class="mdw-doc-head">[\s\S]*נכון ל-14\.03\.2026[\s\S]*<\/header>/);
  assert.ok(html.includes('A &lt;b&gt;&amp;&lt;/b&gt; &quot;q&quot;'), 'title is escaped');
  assert.ok(!html.includes('A <b>'), 'no raw markup from the title');
  assert.ok(html.includes('<main class="main-article template-enterprise">'));
});

test('buildCleanHtml: without asOf the date of today is used', () => {
  const html = buildCleanHtml({ title: 't', bodyHtml: '<p>x</p>', templateClass: 'template-x' });
  assert.ok(html.includes('נכון ל-' + MdExport.asOfDate(new Date(), 'dmy')));
});

test('PRINT_SCRIPT_SHA256 is the SHA-256 (base64) of PRINT_SCRIPT, computed here with node:crypto (NFR9.3)', () => {
  assert.equal(typeof MdExport.PRINT_SCRIPT, 'string');
  const digest = crypto.createHash('sha256').update(MdExport.PRINT_SCRIPT, 'utf8').digest('base64');
  assert.equal(MdExport.PRINT_SCRIPT_SHA256, digest);
  assert.match(MdExport.PRINT_SCRIPT, /window\.print\(\)/);
  assert.ok(!/\$\{|<\/script/i.test(MdExport.PRINT_SCRIPT), 'a constant with nothing from the user');
});

test('autoPrint: exactly one script, equal to PRINT_SCRIPT, preceded by a CSP that allows only its hash (BR3.3, NFR9.3)', () => {
  const html = buildCleanHtml(Object.assign({}, BASE, { autoPrint: true }));
  const scripts = html.match(/<script[\s>]/gi) || [];
  assert.equal(scripts.length, 1);
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  assert.equal(m[1], MdExport.PRINT_SCRIPT);
  const csp = /content="([^"]*)"/.exec(headOf(html))[1];
  assert.ok(csp.endsWith(`; script-src 'sha256-${MdExport.PRINT_SCRIPT_SHA256}'`), csp);
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script>'), 'CSP before the script');
  assert.ok(!EVENT_ATTR.test(outsideCode(html)), 'still no event attributes');
});

test('autoPrint: A4 portrait with exact colours; the plain view-only file has no @page rule (BR3.2)', () => {
  const printed = buildCleanHtml(Object.assign({}, BASE, { autoPrint: true }));
  assert.match(printed, /@page\s*\{[^}]*size:\s*A4 portrait/);
  assert.match(printed, /print-color-adjust:\s*exact/);
  assert.ok(!/@page/.test(buildCleanHtml(BASE)));
});

test('hostile template CSS: @import and url(javascript:) never reach the file (NFR9.8, T6)', () => {
  const css = '@import url(https://evil.example/x.css);\n.x{background:url(javascript:alert(1))}\n.ok{color:#123456}';
  for (const html of [buildCleanHtml(Object.assign({}, BASE, { css })), buildLiveHtml(Object.assign({}, BASE, { css }))]) {
    assert.ok(!/@import/i.test(html), '@import removed');
    assert.ok(!/url\(\s*['"]?\s*javascript:/i.test(html), 'url(javascript:) removed');
    assert.ok(html.includes('.ok{color:#123456}'), 'harmless rules are kept');
  }
});

test('buildLiveHtml: keeps the live toolbar, has no app header buttons, and carries the title and date (BR3.4, FR3.5)', () => {
  const html = buildLiveHtml(BASE);
  assert.ok(!html.includes('btn-a11y') && !html.includes('btn-export'));
  for (const id of ['mdw-dock', 'mdw-btn-mode', 'mdw-export-md', 'mdw-print-pdf', 'mdw-export-clean-html', 'mdw-runtime-script']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /<header class="mdw-doc-head">[\s\S]*מסמך בדיקה[\s\S]*נכון ל-14\.03\.2026[\s\S]*<\/header>/);
  assert.ok(html.includes(BODY));
  assert.match(html, /<html lang="he" dir="rtl">/);
});

test('buildLiveHtml: a hostile title cannot close the runtime script or add markup', () => {
  const title = '</script><img src=x onerror=alert(1)>';
  const html = buildLiveHtml(Object.assign({}, BASE, { title }));
  assert.equal((html.match(/<\/script>/gi) || []).length, 1, 'only the runtime script is closed');
  assert.ok(!html.includes('<img src=x onerror'), 'title is escaped in markup and in the script');
  const m = /const docName = (".*?");/.exec(html);
  assert.equal(JSON.parse(m[1]), title, 'the script still receives the exact title');
});

test('index.html: the main inline script is not cut short by a raw "</script>" inside a string, and it compiles', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m, 'an inline script exists');
  assert.doesNotThrow(() => new Function(m[1]));
  assert.ok(m[1].includes('buildCleanHtml') && m[1].includes('buildLiveHtml'), 'the builders live inside that script');
});

/* ---------------------------------------------------------------- canDownload / isEmptyDoc (NFR8.4, BR4.8) */

const FULL_ENV = () => ({
  Blob: class {},
  URL: { createObjectURL() {}, revokeObjectURL() {} },
  anchorProto: { download: '' }
});

test('canDownload: all three capabilities present -> ok', () => {
  assert.deepEqual(MdExport.canDownload(FULL_ENV()), { ok: true, reason: null });
});

test('canDownload: a missing Blob, createObjectURL or download attribute disables it, each with its own reason', () => {
  const noBlob = Object.assign(FULL_ENV(), { Blob: undefined });
  const noUrl = Object.assign(FULL_ENV(), { URL: {} });
  const noUrlObject = Object.assign(FULL_ENV(), { URL: undefined });
  const noDownload = Object.assign(FULL_ENV(), { anchorProto: {} });
  assert.deepEqual(MdExport.canDownload(noBlob), { ok: false, reason: 'no-blob' });
  assert.deepEqual(MdExport.canDownload(noUrl), { ok: false, reason: 'no-object-url' });
  assert.deepEqual(MdExport.canDownload(noUrlObject), { ok: false, reason: 'no-object-url' });
  assert.deepEqual(MdExport.canDownload(noDownload), { ok: false, reason: 'no-download-attr' });
});

test('canDownload: never throws on a hostile or empty environment', () => {
  assert.equal(MdExport.canDownload({ Blob: 1, URL: null, anchorProto: null }).ok, false);
  assert.equal(MdExport.canDownload({ Blob: function () {}, URL: { createObjectURL: 1 }, anchorProto: {} }).ok, false);
  assert.equal(typeof MdExport.canDownload().ok, 'boolean', 'no argument: the real globals are inspected');
});

test('isEmptyDoc: nothing, empty and whitespace-only documents are empty; any text is not (BR4.8)', () => {
  for (const v of [undefined, null, '', '   ', '\n\n\t', '\u00a0 \r\n']) assert.equal(MdExport.isEmptyDoc(v), true, JSON.stringify(v));
  for (const v of ['a', ' # ', '\u05d0', '0']) assert.equal(MdExport.isEmptyDoc(v), false, JSON.stringify(v));
});
