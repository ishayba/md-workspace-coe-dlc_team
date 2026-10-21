// End-to-end check of the CSS Studio in a real Chromium.
// Optional (not part of `npm test`): requires Playwright + a Chromium to be installed on your machine:
//   npm i -D playwright && npx playwright install chromium   (or use a global install + NODE_PATH)
// Run:  npm run e2e        Screenshots (optional):  E2E_SHOTS=./shots npm run e2e
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed — see the header of this file.'); process.exit(2); }
const fs = require('fs'); const os = require('os'); const path = require('path');
const APP = path.join(__dirname, '..');
const { createServer } = require(path.join(APP, 'server'));
const SHOTS = process.env.E2E_SHOTS ? path.resolve(process.env.E2E_SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => SHOTS ? page.screenshot({ path: path.join(SHOTS, name) }) : Promise.resolve();

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✔', msg); } else { fail++; console.log('  ✘ FAIL:', msg); } };

(async () => {
  const themesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-e2e-themes-'));
  const server = createServer({ themesDir });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1640, height: 940 } });
  const page = await ctx.newPage();
  const problems = []; const externalReqs = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED/.test(m.text())) problems.push('console.error: ' + m.text()); }); // a failed /api/ fetch while offline is expected and handled
  page.on('request', (rq) => { if (!rq.url().startsWith(base) && !rq.url().startsWith('data:') && !rq.url().startsWith('blob:')) externalReqs.push(rq.url()); });

  const row = (label) => page.locator(`.studio-row:has(.studio-label:text-is("${label}"))`);
  const css = () => page.inputValue('#modal-template-css');
  const color = (sel) => page.$eval(sel, (el) => getComputedStyle(el).color);
  const openMgr = async () => { await page.click('#btn-open-template-mgr'); await page.waitForSelector('#template-modal.active .studio'); };

  console.log('1. open the template manager');
  await page.goto(base + '/');
  await openMgr();
  ok(await page.isVisible('#studio-pane-visual') && !(await page.isVisible('#studio-pane-code')), 'visual tab is the default, code tab hidden');
  ok((await page.$$('#studio-preview h1, #studio-preview table, #studio-preview blockquote, #studio-preview pre, #studio-preview .mermaid-diagram-container, #studio-preview div[dir="ltr"]')).length >= 6, 'sample document renders all main elements in the live preview');
  await shot(page, '1-open.png');

  console.log('2. new template + id rescoping');
  await page.click('#btn-modal-new-template');
  await page.fill('#modal-template-name', 'בדיקת E2E');
  await page.fill('#modal-template-id', 'e2e-theme');
  ok((await css()).includes('.template-e2e-theme h1'), 'typing the id re-scopes the CSS to .template-e2e-theme');
  ok(await page.$eval('#studio-preview', (el) => el.classList.contains('template-e2e-theme')), 'live preview uses the new class');

  console.log('3. visual edit → CSS + live preview');
  await page.selectOption('#studio-element-select', 'h1');
  const hText = row('צבע טקסט').locator('input.studio-text');
  await hText.fill('#aa0000'); await hText.press('Enter'); await hText.blur();
  ok((await css()).includes('color: #aa0000'), 'textarea CSS contains the new h1 colour');
  ok(await color('#studio-preview h1') === 'rgb(170, 0, 0)', 'live preview h1 is rgb(170,0,0)');

  console.log('4. click-to-select on the preview');
  await page.click('#studio-preview th');
  ok(await page.inputValue('#studio-element-select') === 'th', 'clicking a table header selects "th"');
  await page.click('#studio-preview blockquote');
  ok(await page.inputValue('#studio-element-select') === 'blockquote', 'clicking a quote selects "blockquote"');
  await page.click('#studio-preview div[dir="ltr"] p');
  ok(await page.inputValue('#studio-element-select') === 'p', 'clicking a paragraph inside a dir-block selects "p"');
  await page.dispatchEvent('#studio-preview div[dir="ltr"]', 'click'); // event target = the wrapper itself
  ok(await page.inputValue('#studio-element-select') === 'dir-ltr', 'clicking the dir-block itself selects "dir-ltr"');

  console.log('5. numeric + border controls');
  await page.selectOption('#studio-element-select', 'th');
  const fs1 = row('גודל גופן').locator('input.studio-num');
  await fs1.fill('19');
  ok((await css()).includes('font-size: 19px'), 'font-size 19px written');
  ok(await page.$eval('#studio-preview th', (el) => getComputedStyle(el).fontSize) === '19px', 'preview th font-size is 19px');
  await page.selectOption('#studio-element-select', 'blockquote');
  await page.locator('details.studio-group:has(summary:text-is("מסגרת וקווים")) > summary').click(); // groups with no values start collapsed
  const bRow = row('קו ימני');
  await bRow.locator('select').selectOption('solid');
  await bRow.locator('input.studio-num').fill('5');
  await bRow.locator('input.studio-text').fill('#2563eb'); await bRow.locator('input.studio-text').press('Enter'); await bRow.locator('input.studio-text').blur();
  ok((await css()).includes('border-right: 5px solid #2563eb'), 'border-right shorthand composed correctly');

  console.log('6. dark mode editing');
  await page.selectOption('#studio-element-select', 'h1');
  await page.click('.studio-seg[data-mode="dark"]');
  ok(await page.getAttribute('.studio-preview-wrap', 'data-theme') === 'dark', 'preview wrapper switches to dark');
  const hDark = row('צבע טקסט').locator('input.studio-text');
  await hDark.fill('#ffee00'); await hDark.press('Enter'); await hDark.blur();
  ok((await css()).includes('[data-theme="dark"] .template-e2e-theme h1'), 'dark override is written with the data-theme prefix');
  ok(await color('#studio-preview h1') === 'rgb(255, 238, 0)', 'dark preview h1 is yellow');
  await shot(page, '2-dark.png');
  await page.click('.studio-seg[data-mode="light"]');
  ok(await color('#studio-preview h1') === 'rgb(170, 0, 0)', 'back in light mode h1 is red again');

  console.log('7. two-way sync with the code tab');
  await page.click('#studio-tab-code');
  ok(await page.isVisible('#modal-template-css'), 'code tab shows the textarea');
  await page.evaluate(() => { const t = document.getElementById('modal-template-css'); t.value += '\n.template-e2e-theme p { color: #00aa00; }\n/* my note */\n'; t.dispatchEvent(new Event('input')); });
  await page.click('#studio-tab-visual');
  await page.selectOption('#studio-element-select', 'p');
  ok(await row('צבע טקסט').locator('input.studio-text').inputValue() === '#00aa00', 'a manual CSS edit appears in the visual panel');
  ok(await color('#studio-preview > p') === 'rgb(0, 170, 0)', 'and in the live preview');
  await page.selectOption('#studio-element-select', 'h2');
  const h2t = row('צבע טקסט').locator('input.studio-text'); await h2t.fill('#334455'); await h2t.press('Enter'); await h2t.blur();
  ok((await css()).includes('/* my note */'), 'a visual edit keeps the user\'s comment in the CSS');

  console.log('8. save → applied to the real document, persisted');
  await page.click('#btn-modal-save');
  await page.waitForSelector('#template-modal:not(.active)');
  ok(await page.$eval('#preview-content', (el) => el.className.includes('template-e2e-theme')), 'document uses the saved theme');
  ok(await color('#preview-content h1') === 'rgb(170, 0, 0)', 'main preview h1 is red');
  ok(await page.$eval('#custom-dynamic-styles', (el) => !el.textContent.includes('Template (draft)')), 'no leftover draft style after closing');
  await page.waitForTimeout(1700); // the app's own autosave (1.2s debounce) remembers which template is selected
  await page.reload();
  ok(await color('#preview-content h1') === 'rgb(170, 0, 0)', 'theme survives a reload');
  ok(Object.keys(JSON.parse(await page.evaluate(() => localStorage.getItem('mdw_user_templates')))).includes('e2e-theme'), 'stored in localStorage');

  console.log('9. live draft is applied to the document behind the modal, and discarded on cancel');
  await openMgr();
  await page.selectOption('#studio-element-select', 'h1');
  const h1t = row('צבע טקסט').locator('input.studio-text'); await h1t.fill('#0000ff'); await h1t.press('Enter'); await h1t.blur();
  ok(await color('#preview-content h1') === 'rgb(0, 0, 255)', 'main document updates live while editing');
  await page.click('#btn-modal-cancel');
  ok(await color('#preview-content h1') === 'rgb(170, 0, 0)', 'cancel discards the draft (back to the saved colour)');

  console.log('10. export a theme file, re-import it');
  await openMgr();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-theme-export')]);
  const exported = fs.readFileSync(await dl.path(), 'utf8');
  ok(/^\/\* mdw-theme v1 \| id: e2e-theme \| name: בדיקת E2E \*\//.test(exported), 'exported file starts with the theme header');
  ok(exported.includes('.template-e2e-theme h1') && exported.includes('/* my note */'), 'exported file contains the CSS');
  const f2 = path.join(os.tmpdir(), 'copy-theme.css');
  fs.writeFileSync(f2, exported.replace('id: e2e-theme', 'id: imported-copy').replace(/\.template-e2e-theme/g, '.template-e2e-theme'));
  await page.setInputFiles('#theme-import-input', f2);
  await page.waitForFunction(() => document.getElementById('modal-template-id').value === 'imported-copy');
  ok((await css()).includes('.template-imported-copy h1') && !(await css()).includes('.template-e2e-theme'), 'import re-scopes CSS to the file\'s id');
  ok(await page.inputValue('#modal-template-name') === 'בדיקת E2E', 'import restores the name');

  console.log('11. hostile CSS file is neutralised (no script, no external request)');
  const evil = path.join(os.tmpdir(), 'evil.css');
  fs.writeFileSync(evil, '/* mdw-theme v1 | id: evil-theme | name: evil */\n.template-evil-theme h1{color:#0000ff}\n</style><script>window.__pwned=1</script>\n@import url(https://evil.example/x.css);\n.template-evil-theme p{background:url(https://evil.example/t.png)}\n');
  await page.setInputFiles('#theme-import-input', evil);
  await page.waitForFunction(() => document.getElementById('modal-template-id').value === 'evil-theme');
  const c = await css();
  ok(!c.includes('</') && !c.includes('evil.example') && !/@import/i.test(c), 'dangerous parts removed from the CSS');
  await page.click('#btn-modal-save'); await page.waitForSelector('#template-modal:not(.active)');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__pwned) === undefined, 'no script executed');
  ok(externalReqs.length === 0, 'no request left the app: ' + JSON.stringify(externalReqs));
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-clean-html')]);
  const clean = fs.readFileSync(await dl2.path(), 'utf8');
  ok(!clean.includes('evil.example') && !/<\/style><script>window/.test(clean), 'exported HTML contains no hostile CSS');

  console.log('12. project library (server API)');
  await openMgr();
  await page.selectOption('#studio-element-select', 'h1');
  ok(!(await page.isDisabled('#btn-theme-lib-save')), 'library save is enabled when running through the server');
  await page.click('#btn-theme-lib-save');
  await page.waitForFunction(() => document.getElementById('toast') && /themes\//.test(document.getElementById('toast').textContent));
  const files = fs.readdirSync(themesDir);
  ok(files.includes('evil-theme.css'), 'file written to themes/: ' + files.join(','));
  ok(!fs.readFileSync(path.join(themesDir, 'evil-theme.css'), 'utf8').includes('evil.example'), 'saved library file is sanitised');
  await page.waitForFunction(() => [...document.querySelectorAll('#theme-lib-select option')].some((o) => o.value === 'evil-theme'));
  await page.selectOption('#theme-lib-select', 'evil-theme'); await page.click('#btn-theme-lib-load');
  await page.waitForFunction(() => document.getElementById('modal-template-id').value === 'evil-theme');
  ok(true, 'library item can be loaded back');
  await shot(page, '3-library.png');
  await page.click('#btn-modal-cancel');

  console.log('13. offline: the studio works from the service-worker cache');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForTimeout(500);
  await ctx.setOffline(true);
  await page.reload();
  await openMgr();
  ok(await page.isVisible('#studio-preview h1'), 'studio opens offline');
  ok(await page.isDisabled('#btn-theme-lib-save'), 'library controls degrade gracefully offline');
  await ctx.setOffline(false);

  console.log('\nproblems (page errors / console errors):', problems.length ? problems : 'none');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  fs.rmSync(themesDir, { recursive: true, force: true });
  process.exit(fail || problems.length ? 1 : 0);
})().catch((e) => { console.error('E2E CRASHED:', e.message); process.exit(2); });
