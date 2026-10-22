// Real-browser check of the visual (Word-like) editor.
// Optional (not part of `npm test`): needs Playwright + Chromium — see e2e/css-studio.e2e.js.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed — see e2e/css-studio.e2e.js'); process.exit(2); }
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createServer } = require('../server');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FAIL:', m); } };

(async () => {
  const server = createServer({ themesDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-vis-')) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1640, height: 940 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base }).catch(() => {});
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED/.test(m.text())) problems.push('console.error: ' + m.text()); });

  const settle = (ms = 450) => page.waitForTimeout(ms);
  const getMd = () => page.inputValue('#markdown-input');
  // set the Markdown from "outside" (like opening a file / loading a template would): value + input event
  const setMd = async (text) => { await page.evaluate((t) => { const el = document.getElementById('markdown-input'); el.value = t; el.dispatchEvent(new Event('input')); }, text); await settle(350); };
  const html = (sel) => page.$eval(sel, (el) => el.innerHTML);
  const mode = (m) => page.click(`#mode-btn-${m}`);
  const selectAllIn = (sel) => page.evaluate((s) => { const el = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(el); const x = getSelection(); x.removeAllRanges(); x.addRange(r); }, sel);
  const selectFirst = (sel, n) => page.evaluate(([s, n]) => { const el = document.querySelector(s); const tn = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, n); const x = getSelection(); x.removeAllRanges(); x.addRange(r); el.closest('[contenteditable]').focus(); }, [sel, n]);
  const caretEnd = (sel) => page.evaluate((s) => { const el = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const x = getSelection(); x.removeAllRanges(); x.addRange(r); el.closest('[contenteditable]').focus(); }, sel);
  const vc = (cmd) => page.click(`[data-vcmd="${cmd}"]`);

  const DOC = '# כותרת\n\nפסקה עם **מודגש** ו*נטוי*\n\n* א\n* ב\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n```js\nlet x = 1;\n```\n';

  console.log('1. defaults: code mode, nothing visual visible');
  await page.goto(base + '/');
  await settle();
  ok(await page.getAttribute('#workspace-main', 'data-editor-mode') === 'code', 'starts in code mode');
  ok(await page.isVisible('#markdown-input') && !(await page.isVisible('#visual-editor')) && !(await page.isVisible('#visual-toolbar')), 'textarea visible, visual surface hidden');
  ok(!(await page.isVisible('#preview-switch')), 'preview/code switch hidden in code mode');

  console.log('2. switching to visual mode renders the Markdown as editable content');
  await setMd(DOC);
  await mode('visual'); await settle();
  ok(await page.isVisible('#visual-editor') && await page.isVisible('#visual-toolbar') && !(await page.isVisible('#markdown-input')), 'visual surface + toolbar shown, textarea hidden');
  ok(await page.isVisible('#preview-switch'), 'preview/code switch shown');
  ok(await page.$eval('#visual-editor h1', (e) => e.textContent) === 'כותרת', 'heading rendered');
  ok(await page.$$eval('#visual-editor strong, #visual-editor em', (a) => a.length) === 2, 'bold + italic rendered');
  ok(await page.$$eval('#visual-editor ul li', (a) => a.length) === 2, 'list rendered');
  ok(await page.$('#visual-editor table') !== null, 'table rendered');
  ok(await page.$eval('#visual-editor pre', (e) => e.getAttribute('contenteditable')) === 'false', 'code block is a protected island');
  ok(await page.$('#visual-editor .mdw-attribution-footer') === null, 'the attribution footer is not part of the editable surface');
  ok(await getMd() === DOC, 'merely entering visual mode does not touch the Markdown');

  console.log('3. typing in the visual editor updates the Markdown, the preview and autosave');
  await caretEnd('#visual-editor p'); await page.keyboard.type(' תוספת'); await settle();
  ok((await getMd()).includes('פסקה עם **מודגש** ו*נטוי תוספת*'), 'Markdown contains the typed text (typing after an italic word continues the italic, as in Word)');
  ok((await page.$eval('#preview-content', (e) => e.textContent)).includes('תוספת'), 'rendered preview shows it');
  await page.waitForTimeout(1500);
  ok((await page.evaluate(() => localStorage.getItem('mdw_draft_content'))).includes('תוספת'), 'autosave stored it');

  console.log('4. bold / italic / inline code');
  await setMd('hello world today');
  await selectFirst('#visual-editor p', 5);
  await vc('bold'); await settle();
  ok(/\*\*hello\*\*/.test(await getMd()), 'toolbar bold → **hello**');
  await selectFirst('#visual-editor p', 5);
  await page.keyboard.press('Control+b'); await settle();
  ok(!/\*\*/.test(await getMd()) && (await getMd()).startsWith('hello world'), 'Ctrl+B toggles it off again');
  await setMd('hello world today');
  await selectFirst('#visual-editor p', 5);
  await vc('italic'); await settle();
  ok(/\*hello\* world/.test(await getMd()), 'italic → *hello*');
  await setMd('hello world today');
  await selectFirst('#visual-editor p', 5);
  await vc('code'); await settle();
  ok(/`hello` world/.test(await getMd()), 'inline code → `hello`');

  console.log('5. block type select + quote');
  await setMd('first paragraph\n\nsecond');
  await caretEnd('#visual-editor p'); await settle(100);
  await page.selectOption('#visual-block-select', 'h2'); await settle();
  ok((await getMd()).startsWith('## first paragraph'), 'paragraph → heading 2');
  await page.selectOption('#visual-block-select', 'p'); await settle();
  ok((await getMd()).startsWith('first paragraph'), 'and back to a paragraph');
  await vc('quote'); await settle();
  ok(/^> first paragraph/m.test(await getMd()), 'quote → "> first paragraph"');
  await vc('quote'); await settle();
  ok(!/^>/m.test(await getMd()), 'quote toggles off');

  console.log('5b. Enter behaves like a word processor');
  await setMd('# Title');
  await caretEnd('#visual-editor h1'); await page.keyboard.press('Enter'); await page.keyboard.type('body'); await settle();
  ok((await getMd()) === '# Title\n\nbody\n', 'Enter after a heading starts a normal paragraph');
  await setMd('> first quote');
  await caretEnd('#visual-editor blockquote'); await page.keyboard.press('Enter'); await page.keyboard.type('second'); await settle();
  ok((await getMd()) === '> first quote\n\n> second\n', 'Enter inside a quote starts another quote (each quote line is its own block)');
  await setMd('* a');
  await caretEnd('#visual-editor li'); await page.keyboard.press('Enter'); await page.keyboard.type('b'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.type('after'); await settle();
  ok((await getMd()) === '* a\n* b\n\nafter\n', 'Enter twice leaves the list');

  console.log('6. lists (typing items with Enter)');
  await setMd('intro');
  await caretEnd('#visual-editor p'); await page.keyboard.press('Enter'); await vc('ul');
  await page.keyboard.type('one'); await page.keyboard.press('Enter'); await page.keyboard.type('two'); await settle();
  ok(/\* one\n\* two/.test(await getMd()), 'bullet list typed → "* one\\n* two"');
  await vc('ol'); await settle();
  ok(/1\. one\n2\. two/.test(await getMd()), 'switched to a numbered list');

  console.log('7. tables: insert, Tab navigation, add/remove rows and columns');
  await setMd('before');
  await caretEnd('#visual-editor p'); await page.keyboard.press('Enter');
  await vc('table'); await settle();
  ok(await page.$('#visual-editor table thead th') !== null, 'table inserted with a header row');
  await page.keyboard.type('H1'); await page.keyboard.press('Tab'); await page.keyboard.type('H2'); await page.keyboard.press('Tab'); await page.keyboard.type('H3');
  await page.keyboard.press('Tab'); await page.keyboard.type('a1'); await settle();
  ok(/\| H1 \| H2 \| H3 \|\n\| --- \| --- \| --- \|\n\| a1 \|  \|  \|/.test(await getMd()), 'Tab moves between cells; Markdown table is correct');
  ok(!(await page.isDisabled('[data-vcmd="row-add"]')), 'row buttons enabled inside a table');
  await vc('row-add'); await vc('col-add'); await settle();
  ok(await page.$$eval('#visual-editor table tr', (a) => a.length) === 4 && await page.$$eval('#visual-editor table thead tr > *', (a) => a.length) === 4, 'row + column added (4×4)');
  await vc('col-del'); await vc('row-del'); await settle();
  ok(await page.$$eval('#visual-editor table tr', (a) => a.length) === 3 && await page.$$eval('#visual-editor table thead tr > *', (a) => a.length) === 3, 'row + column removed again');
  await page.click('#visual-editor thead th'); await vc('row-del');
  ok(await page.$$eval('#visual-editor table tr', (a) => a.length) === 3, 'the header row cannot be deleted');
  await caretEnd('#visual-editor > p:first-child'); await settle(150);
  ok(await page.isDisabled('[data-vcmd="row-add"]'), 'row buttons disabled outside tables');

  console.log('8. code block island');
  await setMd('text');
  await caretEnd('#visual-editor p'); await page.keyboard.press('Enter'); await vc('codeblock'); await settle(200);
  ok(await page.isVisible('.island-editor'), 'inserting a code block opens its editor');
  await page.fill('.island-lang', 'js'); await page.fill('.island-editor textarea', 'let a = 1 < 2;\nlet b = "x";');
  await page.click('.island-save'); await settle();
  ok(await page.$eval('#visual-editor pre code', (e) => e.className + '|' + e.textContent) === 'language-js|let a = 1 < 2;\nlet b = "x";', 'island re-rendered with language and code');
  ok((await getMd()).includes('```js\nlet a = 1 < 2;\nlet b = "x";\n```'), 'Markdown has the fenced block');
  await page.hover('#visual-editor pre'); await page.click('#visual-editor pre .island-edit'); await settle(100);
  await page.fill('.island-editor textarea', 'CHANGED'); await page.click('.island-cancel'); await settle();
  ok((await getMd()).includes('let a = 1 < 2;') && !(await getMd()).includes('CHANGED'), 'cancel keeps the original');
  await page.hover('#visual-editor pre'); await page.click('#visual-editor pre .island-del'); await settle();
  ok(await page.$('#visual-editor pre') === null && !(await getMd()).includes('```'), 'island can be deleted');

  console.log('9. diagram island');
  await setMd('text');
  await caretEnd('#visual-editor p'); await page.keyboard.press('Enter'); await vc('mermaid'); await settle(200);
  await page.fill('.island-editor textarea', 'flowchart LR\nX[Start] --> Y[Finish]'); await page.click('.island-save'); await settle();
  ok(await page.$('#visual-editor .mermaid-diagram-container svg') !== null, 'diagram rendered as SVG in the editor');
  ok((await getMd()).includes('```mermaid\nflowchart LR\nX[Start] --> Y[Finish]\n```'), 'Markdown has the mermaid fence');
  ok((await page.$eval('#preview-content', (e) => e.innerHTML)).includes('Finish'), 'and the preview draws it');

  console.log('10. direction regions');
  await setMd('English paragraph here\n\nשלום');
  await page.click('#visual-editor p'); await vc('dir-ltr'); await settle();
  ok(await page.$('#visual-editor div[dir="ltr"] p') !== null, 'paragraph wrapped in div[dir=ltr]');
  ok((await getMd()).includes('<div dir="ltr">\nEnglish paragraph here\n</div>'), 'Markdown has the wrapper');
  await vc('dir-rtl'); await settle();
  ok(await page.$('#visual-editor div[dir="rtl"]') !== null, 'wrapper switched to rtl');
  await vc('dir-none'); await settle();
  ok(await page.$('#visual-editor div[dir]') === null && !(await getMd()).includes('<div'), 'wrapper removed');

  console.log('11. automatic direction follows what is typed');
  await setMd('');
  await page.click('#visual-editor p'); await page.keyboard.type('This is English'); await settle();
  ok(await page.$eval('#visual-editor p', (e) => e.getAttribute('dir')) === 'ltr', 'English paragraph → dir=ltr');
  await page.keyboard.press('Enter'); await page.keyboard.type('וזו עברית'); await settle();
  ok(await page.$$eval('#visual-editor p', (a) => a.map((p) => p.getAttribute('dir')).join()) === 'ltr,rtl', 'Hebrew paragraph → dir=rtl');

  console.log('12. plain-text paste only');
  await setMd('start');
  await caretEnd('#visual-editor p');
  await page.evaluate(() => {
    const dt = new DataTransfer(); dt.setData('text/html', '<h1 style="color:red">PASTED <b>bold</b> <a href="http://x">link</a></h1>'); dt.setData('text/plain', 'plain one\n\nplain two');
    document.getElementById('visual-editor').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await settle();
  const ved = await html('#visual-editor');
  ok(!/<h1|style=|<a |<b>/.test(ved) && ved.includes('plain one') && ved.includes('plain two'), 'only the plain-text flavour is inserted (no h1/style/link/bold)');
  ok(/start.*plain one|plain one/.test(await getMd()) && /plain two/.test(await getMd()), 'Markdown contains the pasted paragraphs');

  console.log('13. undo / redo');
  await setMd('abc');
  await caretEnd('#visual-editor p'); await page.keyboard.type('XYZ'); await settle(100);
  await vc('undo'); await settle();
  ok(!(await getMd()).includes('XYZ'), 'undo removes the typing');
  await vc('redo'); await settle();
  ok((await getMd()).includes('XYZ'), 'redo brings it back');

  console.log('14. text that looks like Markdown stays text');
  await setMd('');
  await page.click('#visual-editor p');
  await page.keyboard.type('# not a heading'); await page.keyboard.press('Enter');
  await page.keyboard.type('2 * 3'); await page.keyboard.press('Enter');
  await page.keyboard.type('a * b * c'); await settle();
  const md14 = await getMd();
  ok(md14.includes('\u200B# not a heading') && md14.includes('\n2 * 3\n') && md14.includes('a \u2217 b \u2217 c'), 'guards and look-alikes are written');
  await mode('code'); await mode('visual'); await settle();
  ok(await page.$('#visual-editor h1') === null && await page.$('#visual-editor em') === null, 'after a mode round trip nothing turned into a heading or italic');

  console.log('15. the code view next to the visual editor (editable, two-way)');
  await setMd('# Original\n\ntext');
  await page.click('#pv-btn-code'); await settle(100);
  ok(await page.isVisible('#md-code-view') && !(await page.isVisible('#preview-content')), 'code view replaces the rendered preview');
  ok(await page.inputValue('#md-code-view') === '# Original\n\ntext', 'code view shows the Markdown');
  await page.fill('#md-code-view', '# Changed in code\n\ntext'); await settle();
  ok(await page.$eval('#visual-editor h1', (e) => e.textContent) === 'Changed in code', 'editing the code view updates the visual editor');
  await caretEnd('#visual-editor p'); await page.keyboard.type(' more'); await settle();
  ok((await page.inputValue('#md-code-view')).includes('text more'), 'typing in the visual editor updates the code view live');
  await page.click('#pv-btn-rendered'); await settle(100);
  ok(await page.isVisible('#preview-content') && !(await page.isVisible('#md-code-view')), 'switch back to the rendered preview');

  console.log('16. mode persistence + back to code mode');
  await settle(1500);
  await page.reload(); await settle(700);
  ok(await page.getAttribute('#workspace-main', 'data-editor-mode') === 'visual' && await page.isVisible('#visual-editor'), 'visual mode is restored after a reload');
  ok((await page.$eval('#visual-editor h1', (e) => e.textContent)) === 'Changed in code', 'with the saved content');
  await mode('code'); await settle(100);
  ok(await page.isVisible('#markdown-input') && !(await page.isVisible('#visual-toolbar')) && !(await page.isVisible('#preview-switch')), 'code mode restored');
  ok((await getMd()).includes('Changed in code') && (await getMd()).includes('text more'), 'Markdown is intact');
  await page.reload(); await settle(500);
  ok(await page.getAttribute('#workspace-main', 'data-editor-mode') === 'code', 'code mode is remembered too');

  console.log('17. template class is mirrored; layout toggle and exports still work');
  await mode('visual'); await settle(200);
  await page.selectOption('#template-selector', 'technical'); await settle(200);
  ok(await page.$eval('#visual-editor', (e) => e.classList.contains('template-technical')), 'the editing surface follows the selected template');
  await page.click('#btn-toggle-layout'); await page.click('#btn-toggle-layout'); await settle(100);
  ok(await page.getAttribute('#workspace-main', 'data-layout') === 'preview-only' && !(await page.isVisible('#visual-editor')), 'layout toggle works in visual mode');
  await page.click('#btn-toggle-layout'); await settle(100);
  await setMd('English text\n\nעברית');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-clean-html')]);
  const exported = fs.readFileSync(await dl.path(), 'utf8');
  ok(/<p dir="ltr">English text<\/p>/.test(exported) && !/island|contenteditable|data-md-ignore/.test(exported), 'exported HTML carries directions and none of the editor chrome');

  console.log('18. offline: the visual editor comes from the service-worker cache');
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await settle(600);
  await ctx.setOffline(true); await page.reload(); await settle(600);
  ok(await page.isVisible('#visual-editor'), 'visual editor works offline');
  await ctx.setOffline(false);

  console.log('\nproblems (page / console errors):', problems.length ? problems : 'none');
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail || problems.length ? 1 : 0);
})().catch((e) => { console.error('E2E CRASHED:', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
