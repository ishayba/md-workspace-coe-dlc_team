// Real-browser check of automatic text direction (preview, exports, editor, studio sample).
// Optional (not part of `npm test`): needs Playwright + Chromium — see e2e/css-studio.e2e.js.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed — see e2e/css-studio.e2e.js'); process.exit(2); }
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createServer } = require('../server');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FAIL:', m); } };

const MD = [
  '# כותרת בעברית', '',
  'פסקה בעברית ברירת מחדל, עם כמה מילים.', '',
  'This English paragraph is written without any wrapper.', '',
  'ה-API מחזיר JSON בפורמט פשוט ונוח.', '',
  '## English heading', '',
  '* English item A', '* English item B', '',
  'הפרדה', '',
  '* פריט עברי א', '* פריט עברי ב', '',
  '| Name | Value |', '| --- | --- |', '| Alpha | One |', '| Beta | Two |', '',
  '| שם | ערך |', '| --- | --- |', '| אלפא | אחד |', '',
  '2026 12345', '',
  '<div dir="rtl">', 'English text inside a forced rtl wrapper stays rtl.', '</div>', '',
  '```js', 'const x = 1;', '```', ''
].join('\n');

(async () => {
  const server = createServer({ themesDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-dir-')) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1640, height: 940 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  await page.goto(base + '/');
  await page.fill('#markdown-input', MD);
  await page.waitForTimeout(600);

  // which side the first line of text actually hugs, measured from real layout
  const info = (sel, text) => page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text));
    if (!el) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const tn = walker.nextNode();
    const rg = document.createRange(); rg.selectNodeContents(tn);
    const er = el.getBoundingClientRect(); const tr = rg.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { dirAttr: el.getAttribute('dir'), direction: cs.direction, side: (tr.left - er.left) < (er.right - tr.right) ? 'LEFT' : 'RIGHT' };
  }, [sel, text]);

  console.log('1. preview — each block follows its own language');
  let r = await info('#preview-content p', 'פסקה בעברית');           ok(r.direction === 'rtl' && r.side === 'RIGHT', 'Hebrew paragraph: rtl, text on the right');
  r = await info('#preview-content p', 'This English paragraph');    ok(r.direction === 'ltr' && r.side === 'LEFT' && r.dirAttr === 'ltr', 'English paragraph: ltr, text on the left');
  r = await info('#preview-content p', 'ה-API מחזיר');               ok(r.direction === 'rtl' && r.side === 'RIGHT', 'Hebrew sentence with English terms stays rtl');
  r = await info('#preview-content h2', 'English heading');          ok(r.direction === 'ltr' && r.side === 'LEFT', 'English heading: ltr, on the left');
  r = await info('#preview-content h1', 'כותרת בעברית');             ok(r.direction === 'rtl' && r.side === 'RIGHT', 'Hebrew heading: rtl, on the right');
  r = await info('#preview-content li', 'English item A');           ok(r.direction === 'ltr' && r.side === 'LEFT', 'English list item: ltr, on the left');
  r = await info('#preview-content li', 'פריט עברי א');              ok(r.direction === 'rtl' && r.side === 'RIGHT', 'Hebrew list item: rtl, on the right');
  ok(await page.$eval('#preview-content ul:first-of-type', (el) => el.getAttribute('dir')) === 'ltr', 'the English list itself is ltr (bullets + indent on the left)');
  r = await info('#preview-content th', 'Name');                     ok(r.direction === 'ltr' && r.side === 'LEFT', 'English table header: text-align left even with the theme\'s text-align:right');
  r = await info('#preview-content th', 'שם');                       ok(r.direction === 'rtl' && r.side === 'RIGHT', 'Hebrew table header: right');
  ok(await page.$$eval('#preview-content table', (t) => t.map((x) => x.getAttribute('dir')).join()) === 'ltr,rtl', 'English table is ltr, Hebrew table is rtl');
  ok(await page.$eval('#preview-content p:has(+ div), #preview-content p', (p) => p.getAttribute('dir')) === 'rtl', 'first paragraph kept rtl');
  r = await info('#preview-content p', '2026 12345');                ok(r.dirAttr === null && r.direction === 'rtl', 'digits-only paragraph gets no direction of its own (inherits rtl)');
  r = await info('#preview-content div[dir="rtl"] p', 'forced rtl wrapper'); ok(r.direction === 'rtl' && r.dirAttr === null && r.side === 'RIGHT', 'English inside an explicit <div dir="rtl"> stays rtl (wrapper wins)');
  ok(await page.$eval('#preview-content pre', (el) => el.getAttribute('dir')) === null, 'code blocks are never re-directed');

  console.log('2. re-render after typing');
  await page.fill('#markdown-input', 'שלום עולם');
  await page.waitForTimeout(500);
  ok((await info('#preview-content p', 'שלום')).direction === 'rtl', 'Hebrew → rtl');
  await page.fill('#markdown-input', 'Hello world');
  await page.waitForTimeout(500);
  r = await info('#preview-content p', 'Hello');                     ok(r.direction === 'ltr' && r.side === 'LEFT', 'same paragraph edited to English → flips to ltr/left');
  await page.fill('#markdown-input', MD); await page.waitForTimeout(500);

  console.log('3. exports carry the direction');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-clean-html')]);
  const clean = fs.readFileSync(await dl.path(), 'utf8');
  ok(/<p dir="ltr">This English paragraph/.test(clean), 'clean HTML export keeps dir="ltr" on the English paragraph');
  ok(/table\[dir="ltr"\] th \{ text-align: left; \}/.test(clean), 'exported CSS carries the table-header rule');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-interactive-html')]);
  const live = fs.readFileSync(await dl2.path(), 'utf8');
  ok(/<p dir="ltr">This English paragraph/.test(live), 'live HTML export keeps it too');
  const f = path.join(os.tmpdir(), 'dir-live.html'); fs.writeFileSync(f, live);
  const lp = await ctx.newPage(); await lp.goto('file://' + f);
  ok(await lp.$eval('.main-article p[dir="ltr"]', (el) => { const tn = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); const rg = document.createRange(); rg.selectNodeContents(tn); const a = el.getBoundingClientRect(), b = rg.getBoundingClientRect(); return (b.left - a.left) < (a.right - b.right); }), 'in the exported live document the English paragraph really sits on the left');

  console.log('4. editor: every line by its own language');
  ok(await page.$eval('#markdown-input', (el) => getComputedStyle(el).unicodeBidi) === 'plaintext', 'textarea uses unicode-bidi: plaintext');
  await page.fill('#markdown-input', 'שורה בעברית\nAn English line in the editor\n## English heading\n* פריט בעברית');
  await page.locator('#markdown-input').screenshot({ path: process.env.E2E_SHOTS ? path.join(process.env.E2E_SHOTS, 'editor-bidi.png') : os.tmpdir() + '/editor-bidi.png' });

  console.log('5. CSS Studio live preview uses the same rule');
  await page.fill('#markdown-input', MD);
  await page.click('#btn-open-template-mgr'); await page.waitForSelector('#template-modal.active .studio');
  ok(await page.$eval('#studio-preview', (el) => [...el.querySelectorAll('p[dir="ltr"]')].some((p) => p.textContent.startsWith('This plain English paragraph'))), 'the plain English sample paragraph is ltr in the studio preview');
  ok(await page.$eval('#studio-preview', (el) => [...el.querySelectorAll('p')].filter((p) => /API/.test(p.textContent) && !p.closest('div[dir]')).every((p) => p.getAttribute('dir') === 'rtl')), 'the Hebrew sample sentence with API/JSON is rtl');
  ok(await page.$eval('#studio-preview div[dir="rtl"] p', (p) => p.getAttribute('dir')) === null, 'paragraphs inside explicit wrappers get no override');

  console.log('\nproblems:', problems.length ? problems : 'none');
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail || problems.length ? 1 : 0);
})().catch((e) => { console.error('E2E CRASHED:', e.message); process.exit(2); });
