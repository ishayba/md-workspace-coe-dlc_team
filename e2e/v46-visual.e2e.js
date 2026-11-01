// Real-browser check of the v4.6.0 syntax: rendering, auto direction, the new toolbar commands,
// Tab nesting in lists and the live-HTML → Markdown export.
// Optional (not part of `npm test`): needs Playwright + Chromium — see e2e/css-studio.e2e.js.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed — see e2e/css-studio.e2e.js'); process.exit(2); }
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createServer } = require('../server');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FAIL:', m); } };

(async () => {
  const server = createServer({ themesDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-v46-')) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1640, height: 940 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED/.test(m.text())) problems.push('console.error: ' + m.text()); });

  // window.prompt answers, consumed in order by the next dialogs
  const answers = [];
  page.on('dialog', (d) => { const a = answers.shift(); if (a === undefined) d.dismiss(); else d.accept(a); });

  const settle = (ms = 450) => page.waitForTimeout(ms);
  const getMd = () => page.inputValue('#markdown-input');
  const setMd = async (text) => { await page.evaluate((t) => { const el = document.getElementById('markdown-input'); el.value = t; el.dispatchEvent(new Event('input')); }, text); await settle(350); };
  const html = (sel) => page.$eval(sel, (el) => el.innerHTML);
  const mode = (m) => page.click(`#mode-btn-${m}`);
  const selectFirst = (sel, n) => page.evaluate(([s, n]) => { const el = document.querySelector(s); const tn = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, n); const x = getSelection(); x.removeAllRanges(); x.addRange(r); el.closest('[contenteditable]').focus(); }, [sel, n]);
  const caretEnd = (sel) => page.evaluate((s) => { const el = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const x = getSelection(); x.removeAllRanges(); x.addRange(r); el.closest('[contenteditable]').focus(); }, sel);
  const vc = (cmd) => page.click(`[data-vcmd="${cmd}"]`);

  const DOC = [
    'קישור ל-[אתר](https://example.com) ותמונה ![סמל](icon.svg) ו-~~מחוק~~.',
    '',
    '---',
    '',
    '- פריט מקף',
    '+ פריט פלוס',
    '',
    '* [ ] משימה פתוחה',
    '* [x] משימה סגורה',
    '',
    '* רמה 1',
    '  * רמה 2',
    '    * רמה 3',
    '',
    '> שורה ראשונה',
    '> שורה שנייה',
    '',
    '| שמאל | מרכז | ימין |',
    '| :--- | :---: | ---: |',
    '| א | ב | ג |',
    ''
  ].join('\n');

  console.log('1. the new syntax renders in the preview and in the visual editor');
  await page.goto(base + '/');
  await settle();
  await setMd(DOC);
  const pv = '#preview-content';
  ok(await page.$eval(`${pv} a`, (a) => a.getAttribute('href')) === 'https://example.com', 'link rendered');
  ok(await page.$eval(`${pv} img`, (i) => i.getAttribute('src') + '|' + i.getAttribute('alt')) === 'icon.svg|סמל', 'image rendered');
  ok(await page.$(`${pv} del`) !== null && await page.$(`${pv} hr`) !== null, 'strikethrough + horizontal rule rendered');
  ok(await page.$$eval(`${pv} li.task-list-item input[type=checkbox][disabled]`, (a) => a.length) === 2, 'two disabled task checkboxes');
  ok(await page.$$eval(`${pv} li.task-list-item input[checked]`, (a) => a.length) === 1, 'one of them checked');
  ok(await page.$(`${pv} li ul li ul li`) !== null, 'three-level nested list');
  ok(await page.$$eval(`${pv} blockquote`, (a) => a.length) === 1, 'consecutive quote lines are one blockquote');
  ok(await page.$$eval(`${pv} th`, (a) => a.map((c) => c.style.textAlign).join(',')) === 'left,center,right', 'table column alignment');
  await mode('visual'); await settle();
  ok(await page.$('#visual-editor a') !== null && await page.$('#visual-editor img') !== null && await page.$('#visual-editor hr') !== null, 'visual editor shows link, image and rule');
  ok(await getMd() === DOC, 'entering visual mode does not touch the Markdown');

  console.log('2. automatic direction on the new blocks (Hebrew → rtl)');
  ok(await page.$eval(`${pv} li.task-list-item`, (e) => e.getAttribute('dir')) === 'rtl', 'task item is rtl');
  ok(await page.$eval(`${pv} li ul li ul li`, (e) => e.getAttribute('dir')) === 'rtl', 'third-level nested item is rtl');
  ok(await page.$eval(`${pv} blockquote`, (e) => e.getAttribute('dir')) === 'rtl', 'multi-line quote is rtl');
  ok(await page.$eval(`${pv} td`, (e) => e.getAttribute('dir')) === 'rtl', 'aligned table cell is rtl');

  console.log('3. strikethrough button');
  await setMd('hello');
  await selectFirst('#visual-editor p', 5); await vc('strike'); await settle();
  ok(await getMd() === '~~hello~~\n', 'strike → ~~hello~~');

  console.log('4. link button validates the address');
  await setMd('hello');
  await selectFirst('#visual-editor p', 5); answers.push('https://example.com'); await vc('link'); await settle();
  ok(await getMd() === '[hello](https://example.com)\n', 'allowed address → [hello](https://example.com)');
  await setMd('hello');
  await selectFirst('#visual-editor p', 5); answers.push('javascript:alert(1)'); await vc('link'); await settle();
  ok(await getMd() === 'hello\n' || await getMd() === 'hello', 'javascript: address is refused, text unchanged');
  ok(!/<a /.test(await html('#visual-editor')), 'no <a> element was created for the refused address');

  console.log('5. image button');
  await setMd('start');
  await page.click('#visual-editor p'); await caretEnd('#visual-editor p');
  answers.push('icon.svg', 'לוגו'); await vc('image'); await settle();
  ok((await getMd()).includes('![לוגו](icon.svg)'), 'image → ![לוגו](icon.svg)');
  await setMd('start');
  await caretEnd('#visual-editor p');
  answers.push('data:image/png;base64,AAAA'); await vc('image'); await settle();
  ok(!(await getMd()).includes('!['), 'data: image address is refused');

  console.log('6. horizontal rule button');
  await setMd('above');
  await caretEnd('#visual-editor p'); await vc('hr'); await settle();
  ok(/(^|\n)---(\n|$)/.test(await getMd()), 'rule → ---');

  console.log('7. task button cycles: task → checked → plain item');
  await setMd('* a');
  await caretEnd('#visual-editor li'); await vc('task'); await settle();
  ok(await getMd() === '* [ ] a\n', 'first click → * [ ] a');
  await caretEnd('#visual-editor li'); await vc('task'); await settle();
  ok(await getMd() === '* [x] a\n', 'second click → * [x] a');
  await caretEnd('#visual-editor li'); await vc('task'); await settle();
  ok(await getMd() === '* a\n', 'third click → * a');

  console.log('8. Tab / Shift+Tab nest and un-nest list items');
  await setMd('* a\n* b');
  await caretEnd('#visual-editor li:nth-child(2)'); await page.keyboard.press('Tab'); await settle();
  ok(await getMd() === '* a\n  * b\n', 'Tab → * a\\n  * b');
  // Chromium nests as ul > ul > li (a sibling of the parent li), so match either shape
  await caretEnd('#visual-editor ul ul li'); await page.keyboard.press('Shift+Tab'); await settle();
  ok(await getMd() === '* a\n* b\n', 'Shift+Tab → back to one level');

  console.log('8b. accessibility: Escape releases the keyboard from the editor; task checkboxes are labelled');
  await setMd('* a\n* b\n\n| x | y |\n| --- | --- |\n| 1 | 2 |');
  await caretEnd('#visual-editor li:nth-child(2)');
  await page.keyboard.press('Escape'); await settle(150);
  ok(await page.evaluate(() => !document.getElementById('visual-editor').contains(document.activeElement) && document.activeElement !== document.body), 'Escape in a list item moves focus out of the editor to another control');
  await caretEnd('#visual-editor td');
  await page.keyboard.press('Escape'); await settle(150);
  ok(await page.evaluate(() => !document.getElementById('visual-editor').contains(document.activeElement)), 'Escape in a table cell leaves the editor too');
  await setMd('* a');
  await caretEnd('#visual-editor li'); await vc('task'); await vc('task'); await settle();
  ok(await page.$eval('#visual-editor input[type=checkbox]', (c) => c.getAttribute('aria-label')) === 'משימה שהושלמה', 'checkbox made in the editor carries its state label');
  await setMd('- [ ] a\n- [x] b');
  ok(await page.$$eval('#preview-content li.task-list-item input', (a) => a.map((c) => c.getAttribute('aria-label')).join('|')) === 'משימה פתוחה|משימה שהושלמה', 'preview checkboxes carry Hebrew state labels');
  ok(await page.$$eval('.visual-toolbar [data-vcmd]', (a) => a.filter((b) => !b.getAttribute('aria-label')).map((b) => b.dataset.vcmd).join(',')).then((s) => s.split(',').filter((x) => ['strike', 'link', 'image', 'hr', 'task'].includes(x)).length === 0), 'the five new toolbar buttons have an aria-label');

  console.log('9. live HTML → Markdown export keeps the new syntax');
  await mode('code'); await settle(200);
  await setMd(DOC);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-interactive-html')]);
  const file = path.join(os.tmpdir(), 'mdw-v46-live.html'); await dl.saveAs(file);
  const live = await ctx.newPage();
  live.on('pageerror', (e) => problems.push('live pageerror: ' + e.message));
  await live.goto('file://' + file);
  await live.click('#mdw-btn-mode').catch(() => {});
  const [dl2] = await Promise.all([live.waitForEvent('download'), live.click('#mdw-export-md')]);
  const out = fs.readFileSync(await dl2.path(), 'utf8');
  ok(out.includes('[אתר](https://example.com)'), 'export keeps the link');
  ok(out.includes('![סמל](icon.svg)'), 'export keeps the image');
  ok(out.includes('~~מחוק~~'), 'export keeps the strikethrough');
  ok(/(^|\n)---(\n|$)/.test(out), 'export keeps the rule');
  ok(/\[ \] משימה פתוחה/.test(out) && /\[x\] משימה סגורה/.test(out), 'export keeps both task states');
  ok(/\n {2}[*-] רמה 2/.test(out) && /\n {4}[*-] רמה 3/.test(out), 'export keeps the nesting');
  ok(/\|\s*:---\s*\|\s*:---:\s*\|\s*---:\s*\|/.test(out), 'export keeps the column alignment');
  await live.close();

  console.log('\nproblems (page / console errors):', problems.length ? problems : 'none');
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail || problems.length ? 1 : 0);
})().catch((e) => { console.error('E2E CRASHED:', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
