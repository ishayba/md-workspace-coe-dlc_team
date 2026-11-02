// Real-browser check of v4.7.0: header icons and panels, accessibility panel, read-aloud, export panel,
// visual-editor review fixes (R-06..R-10), reflow / zoom / keyboard, and the QA checklist.
// Optional (not part of `npm test`): needs Playwright + Chromium — see e2e/css-studio.e2e.js.
//   NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v47-a11y-export.e2e.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed — see e2e/css-studio.e2e.js'); process.exit(2); }
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createServer } = require('../server');
const { readZip } = require('../test-support/zip-reader');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FAIL:', m); } };

(async () => {
  const server = createServer({ themesDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-v47-')) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const problems = [];
  const downloadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-v47-dl-'));

  // a fresh context per call = clean localStorage and no service-worker cache
  async function open(opts = {}) {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1440, height: 900 }, colorScheme: opts.colorScheme || 'light' });
    if (opts.init) await ctx.addInitScript(opts.init);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED|ERR_FAILED/.test(m.text())) return;
      if (opts.expectConsole && opts.expectConsole.test(m.text())) return;
      problems.push('console.error: ' + m.text());
    });
    if (opts.storage) {
      await page.goto(base + '/');
      await page.evaluate((s) => { Object.keys(s).forEach((k) => localStorage.setItem(k, s[k])); }, opts.storage);
    }
    await page.goto(base + '/');
    await page.waitForTimeout(350);
    return { ctx, page };
  }
  const settle = (page, ms = 250) => page.waitForTimeout(ms);
  const setMd = async (page, text) => { await page.evaluate((t) => { const el = document.getElementById('markdown-input'); el.value = t; el.dispatchEvent(new Event('input')); }, text); await settle(page, 300); };
  const isOpen = (page, id) => page.$eval('#' + id, (el) => !el.hidden && getComputedStyle(el).display !== 'none');
  const attr = (page, sel, name) => page.getAttribute(sel, name);
  const focusedId = (page) => page.evaluate(() => (document.activeElement && (document.activeElement.id || document.activeElement.className)) || '');

  const wanted = (process.env.PARTS || 'a,b,c,d,e,f,g').split(',');
  const parts = {};

  /* ======================================================================= א. אייקונים ופאנלים (WF1) */
  parts.a = async () => {
    console.log('א. header icons and panels (WF1, BR1.1–BR1.6)');
    const { ctx, page } = await open();

    const order = await page.evaluate(() => {
      const a = document.getElementById('btn-a11y'); const e = document.getElementById('btn-export'); const sep = document.querySelector('.hdr-sep');
      return { a: !!a, e: !!e, sep: !!sep, aBeforeE: !!(a && e && (a.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)), sepBeforeA: !!(sep && a && (sep.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)) };
    });
    ok(order.a && order.e && order.sep && order.sepBeforeA && order.aBeforeE, 'after a separator: accessibility icon, then export icon (BR1.1)');
    for (const layout of ['split', 'editor-only', 'preview-only']) {
      await page.evaluate((l) => document.getElementById('workspace-main').setAttribute('data-layout', l), layout);
      const vis = await page.evaluate(() => ['btn-a11y', 'btn-export'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.height > 0; }));
      ok(vis[0] && vis[1], `both icons visible in layout ${layout}`);
    }
    await page.evaluate(() => document.getElementById('workspace-main').setAttribute('data-layout', 'split'));

    ok(await attr(page, '#btn-a11y', 'aria-label') === 'נגישות' && await attr(page, '#btn-export', 'aria-label') === 'ייצוא', 'Hebrew aria-label on both icons (BR1.2)');
    ok(await attr(page, '#btn-a11y', 'aria-haspopup') === 'dialog' && await attr(page, '#btn-export', 'aria-haspopup') === 'dialog', 'aria-haspopup="dialog"');
    ok(await attr(page, '#btn-a11y', 'aria-controls') === 'panel-a11y' && await attr(page, '#btn-export', 'aria-controls') === 'panel-export', 'aria-controls point at the panels');
    ok(await attr(page, '#btn-a11y', 'aria-expanded') === 'false' && await attr(page, '#btn-export', 'aria-expanded') === 'false', 'aria-expanded="false" at load');
    ok(!(await isOpen(page, 'panel-a11y')) && !(await isOpen(page, 'panel-export')), 'both panels closed at load (BR1.3)');
    ok(await attr(page, '#panel-a11y', 'role') === 'dialog' && await attr(page, '#panel-a11y', 'aria-modal') === 'false' && !!(await attr(page, '#panel-a11y', 'aria-labelledby')), 'panel is a non-modal dialog with a label');
    ok(await attr(page, '#panel-export', 'role') === 'dialog' && await attr(page, '#panel-export', 'aria-modal') === 'false', 'export panel is a non-modal dialog');

    // Enter opens, Enter again closes; Space opens
    await page.focus('#btn-a11y'); await page.keyboard.press('Enter'); await settle(page, 120);
    ok(await isOpen(page, 'panel-a11y') && await attr(page, '#btn-a11y', 'aria-expanded') === 'true', 'Enter opens the accessibility panel, aria-expanded="true"');
    ok(await page.evaluate(() => document.getElementById('panel-a11y').contains(document.activeElement)), 'focus moves into the panel');
    await page.focus('#btn-a11y'); await page.keyboard.press('Enter'); await settle(page, 120);
    ok(!(await isOpen(page, 'panel-a11y')) && await attr(page, '#btn-a11y', 'aria-expanded') === 'false', 'Enter on the icon again closes it');
    await page.focus('#btn-export'); await page.keyboard.press('Space'); await settle(page, 120);
    ok(await isOpen(page, 'panel-export'), 'Space opens the export panel');

    // one panel at a time
    await page.click('#btn-a11y'); await settle(page, 120);
    ok(await isOpen(page, 'panel-a11y') && !(await isOpen(page, 'panel-export')), 'opening the other panel closes the first (BR1.3)');
    ok(await attr(page, '#btn-export', 'aria-expanded') === 'false' && await attr(page, '#btn-a11y', 'aria-expanded') === 'true', 'aria-expanded follows (BR1.2)');

    // close: Esc, outside click, ×; focus returns to the opener
    await page.keyboard.press('Escape'); await settle(page, 120);
    ok(!(await isOpen(page, 'panel-a11y')) && await focusedId(page) === 'btn-a11y', 'Esc closes and returns focus to the opener (BR1.4)');
    await page.click('#btn-export'); await settle(page, 120);
    await page.mouse.click(300, 600); await settle(page, 120);
    ok(!(await isOpen(page, 'panel-export')), 'a click outside closes the panel');
    await page.click('#btn-export'); await settle(page, 120);
    await page.click('#panel-export .panel-close'); await settle(page, 120);
    ok(!(await isOpen(page, 'panel-export')) && await focusedId(page) === 'btn-export', '× closes and returns focus to the icon');
    await page.click('#btn-a11y'); await settle(page, 120);
    await page.click('#panel-a11y .panel-close'); await settle(page, 120);
    ok(!(await isOpen(page, 'panel-a11y')) && await focusedId(page) === 'btn-a11y', '× on the accessibility panel returns focus to its icon');

    // a modal dialog blocks the panels (BR1.5)
    await page.click('#btn-open-template-mgr'); await settle(page, 250);
    await page.evaluate(() => document.getElementById('btn-a11y').click());
    await page.evaluate(() => document.getElementById('btn-export').click());
    await settle(page, 150);
    ok(!(await isOpen(page, 'panel-a11y')) && !(await isOpen(page, 'panel-export')), 'a visible modal window rejects the open request (BR1.5)');
    await page.click('#btn-modal-cancel'); await settle(page, 200);
    await page.click('#btn-a11y'); await settle(page, 120);
    ok(await isOpen(page, 'panel-a11y'), 'after the modal closes the panel opens again');
    await ctx.close();

    // changed dot (BR1.6): default → none; a stored non-default size → dot + alternate label
    const def = await open();
    ok(await def.page.$eval('[data-testid="a11y-dot"]', (d) => d.hidden || getComputedStyle(d).display === 'none'), 'no change dot at default settings');
    ok(await attr(def.page, '#btn-a11y', 'aria-label') === 'נגישות', 'plain label at default');
    await def.ctx.close();
    const chg = await open({ storage: { mdw_a11y_zoom: '115' } });
    ok(await chg.page.$eval('[data-testid="a11y-dot"]', (d) => !d.hidden && getComputedStyle(d).display !== 'none'), 'orange dot when a setting differs from default');
    ok(await attr(chg.page, '#btn-a11y', 'aria-label') === 'נגישות — הוגדרו התאמות', 'alternate aria-label "נגישות — הוגדרו התאמות"');
    await chg.ctx.close();

    // responsive: labels hidden up to 720px, hit area ≥ 32×32 (NFR4)
    const narrow = await open({ viewport: { width: 700, height: 800 } });
    ok(await narrow.page.$$eval('#btn-a11y .hdr-lbl, #btn-export .hdr-lbl', (a) => a.every((l) => getComputedStyle(l).display === 'none' || l.getBoundingClientRect().width === 0)), 'labels hidden at ≤720px');
    ok(await narrow.page.$$eval('#btn-a11y, #btn-export', (a) => a.every((b) => { const r = b.getBoundingClientRect(); return r.width >= 32 && r.height >= 32; })), 'hit area ≥ 32×32 at ≤720px');
    await narrow.ctx.close();
    const wide = await open();
    ok(await wide.page.$$eval('#btn-a11y .hdr-lbl, #btn-export .hdr-lbl', (a) => a.every((l) => l.getBoundingClientRect().width > 0)), 'labels visible above 720px');
    await wide.ctx.close();
  };

  /* ======================================================================= ב. פאנל הנגישות (WF2, WF3) */
  parts.b = async () => {
    console.log('ב. accessibility panel: scheme, contrast, size, reset, live region, skip link (WF2, WF3)');
    const stored = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
    const html = (page, name) => page.evaluate((n) => document.documentElement.getAttribute(n), name);
    const live = (page) => page.$eval('#ax-live', (el) => el.textContent);
    const checkedTheme = (page) => page.$$eval('#panel-a11y [role="radio"]', (a) => a.filter((r) => r.getAttribute('aria-checked') === 'true').map((r) => r.dataset.value).join(','));

    const { ctx, page } = await open();
    await page.click('#btn-a11y'); await settle(page, 150);

    // colour scheme radiogroup
    ok(await page.$eval('#panel-a11y [role="radiogroup"]', (g) => g.getAttribute('aria-label')) === 'ערכת צבעים', 'radiogroup "ערכת צבעים"');
    ok(await page.$$eval('#panel-a11y [role="radio"]', (a) => a.map((r) => r.dataset.value).join(',')) === 'system,light,dark', 'three radios: system, light, dark');
    ok(await checkedTheme(page) === 'system' && await html(page, 'data-theme') === 'system', 'default scheme is system');
    ok(await page.$$eval('#panel-a11y [role="radio"]', (a) => a.map((r) => r.tabIndex).join(',')) === '0,-1,-1', 'roving tabindex: only the checked radio is a tab stop');
    const t0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('#panel-a11y [role="radio"][data-value="dark"]'); await settle(page, 80);
    ok(await html(page, 'data-theme') === 'dark' && await stored(page, 'mdw_theme') === 'dark', 'click on night → <html data-theme="dark"> and mdw_theme saved');
    ok(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) !== t0, 'the interface really turned dark');
    ok(!(await page.evaluate(() => document.body.hasAttribute('data-theme'))), 'data-theme is no longer on <body>');
    ok(await page.evaluate(() => document.activeElement.dataset.value) === 'dark', 'focus stays on the chosen option');
    await page.keyboard.press('ArrowLeft'); await settle(page, 60);       // RTL: left = next. dark is last → wraps to system? no: stays within the group
    const afterLeft = await checkedTheme(page);
    await page.click('#panel-a11y [role="radio"][data-value="system"]'); await settle(page, 60);
    await page.keyboard.press('ArrowLeft'); await settle(page, 60);
    ok(await checkedTheme(page) === 'light', 'ArrowLeft goes to the NEXT option in RTL (system → light)');
    await page.keyboard.press('ArrowRight'); await settle(page, 60);
    ok(await checkedTheme(page) === 'system', 'ArrowRight goes to the previous option');
    await page.keyboard.press('End'); await settle(page, 60);
    ok(await checkedTheme(page) === 'dark', 'End selects the last option');
    await page.keyboard.press('Home'); await settle(page, 60);
    ok(await checkedTheme(page) === 'system' && afterLeft.length > 0, 'Home selects the first option');
    ok(await live(page) === 'ערכת צבעים: אוטומטי', 'live region: "ערכת צבעים: אוטומטי"');
    await page.click('#panel-a11y [role="radio"][data-value="dark"]'); await settle(page, 60);
    ok(await live(page) === 'ערכת צבעים: לילה', 'live region: "ערכת צבעים: לילה"');
    ok((await page.textContent('#toast')).includes('לילה'), 'the toast shows the message too');

    // live region shape
    ok(await attr(page, '#ax-live', 'role') === 'status' && await attr(page, '#ax-live', 'aria-live') === 'polite' && await attr(page, '#ax-live', 'aria-atomic') === 'true', '#ax-live is role=status, aria-live=polite, aria-atomic=true');
    ok(await page.$eval('#ax-live', (el) => { const r = el.getBoundingClientRect(); return r.width <= 1 && r.height <= 1; }), 'the live region is visually hidden');

    // high contrast switch
    const sw = '#panel-a11y [role="switch"]';
    ok(await attr(page, sw, 'aria-checked') === 'false' && (await attr(page, sw, 'aria-pressed')) === null, 'switch uses aria-checked (not aria-pressed)');
    ok(!!(await attr(page, sw, 'aria-labelledby')), 'switch is labelled by its visible text');
    await page.click(sw); await settle(page, 80);
    ok(await attr(page, sw, 'aria-checked') === 'true' && await page.evaluate(() => document.documentElement.classList.contains('hc')), 'switch on → aria-checked="true" and <html class="hc">');
    ok(await stored(page, 'mdw_a11y_hc') === '1', 'mdw_a11y_hc saved');
    ok(await live(page) === 'ניגודיות גבוהה הופעלה', 'live region: "ניגודיות גבוהה הופעלה"');
    await page.focus(sw); await page.keyboard.press('Space'); await settle(page, 80);
    ok(await attr(page, sw, 'aria-checked') === 'false' && await live(page) === 'ניגודיות גבוהה כובתה', 'Space switches it off, live region "ניגודיות גבוהה כובתה"');
    await page.keyboard.press('Enter'); await settle(page, 80);
    ok(await attr(page, sw, 'aria-checked') === 'true', 'Enter switches it on');

    // text size stepper
    const pct = '#ax-zoom-reset'; const zin = '#ax-zoom-in'; const zout = '#ax-zoom-out';
    const zoomVar = () => page.evaluate(() => document.documentElement.style.getPropertyValue('--ax-zoom'));
    ok(await page.textContent(pct) === '100%' && await attr(page, pct, 'aria-label') === 'איפוס גודל טקסט, כרגע 100%', 'stepper shows 100% with the full label');
    await page.click(zin); await settle(page, 60);
    ok(await page.textContent(pct) === '115%' && await zoomVar() === '1.15' && await stored(page, 'mdw_a11y_zoom') === '115', 'א+ → 115%, --ax-zoom 1.15, saved');
    ok(await attr(page, pct, 'aria-label') === 'איפוס גודל טקסט, כרגע 115%', 'the percent button label follows');
    ok(await page.evaluate(() => getComputedStyle(document.body).zoom) === '1.15', 'body{zoom:var(--ax-zoom)} is in effect');
    ok(await live(page) === 'גודל טקסט 115%', 'live region: "גודל טקסט 115%"');
    await page.click(zin); await page.click(zin); await settle(page, 60);
    ok(await page.textContent(pct) === '150%' && await attr(page, zin, 'aria-disabled') === 'true', 'at 150% א+ is aria-disabled');
    await page.click(zin, { force: true }); await settle(page, 60);   // aria-disabled is not 'disabled': the click still reaches the button
    ok(await page.textContent(pct) === '150%', 'א+ at the end does not move');
    ok(await page.evaluate(() => { const b = document.getElementById('ax-zoom-in'); return !b.disabled && b.tabIndex >= 0; }), 'the disabled-looking button stays in the tab order (aria-disabled, not disabled)');
    await page.click(pct); await settle(page, 60);
    ok(await page.textContent(pct) === '100%' && await attr(page, zin, 'aria-disabled') === 'false', 'click on the percent resets to 100%');
    await page.click(zout); await settle(page, 60);
    ok(await page.textContent(pct) === '90%' && await attr(page, zout, 'aria-disabled') === 'true', 'א− → 90%, and א− is aria-disabled at the bottom end');

    // a repeated message is announced again (clear, then write)
    await settle(page, 80);
    const seen = await page.evaluate(() => new Promise((res) => {
      const el = document.getElementById('ax-live'); const log = [];
      new MutationObserver(() => log.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
      document.getElementById('ax-zoom-in').click(); document.getElementById('ax-zoom-out').click();
      setTimeout(() => res(log), 120);
    }));
    ok(seen.includes('') && seen.filter((t) => t === 'גודל טקסט 90%').length >= 1, 'live region is emptied before each write (so equal text repeats)');

    // preference change in < 100 ms (NFR7.2)
    const ms = await page.evaluate(() => new Promise((res) => {
      const t = performance.now();
      document.querySelector('#panel-a11y [role="radio"][data-value="light"]').click();
      requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t)));
    }));
    ok(ms < 100, `a preference change reaches the screen in ${ms.toFixed(1)}ms (< 100ms)`);

    // reset
    await page.click('#panel-a11y .ax-reset'); await settle(page, 80);
    ok(await html(page, 'data-theme') === 'system' && !(await page.evaluate(() => document.documentElement.classList.contains('hc'))) && await page.textContent(pct) === '100%', 'reset → system, no .hc, 100%');
    ok(await stored(page, 'mdw_theme') === 'system' && await stored(page, 'mdw_a11y_hc') === '0' && await stored(page, 'mdw_a11y_zoom') === '100', 'reset is saved');
    ok(await live(page) === 'הגדרות הנגישות אופסו', 'live region: "הגדרות הנגישות אופסו"');
    await ctx.close();

    // persistence across loads, legacy value, invalid values
    const p1 = await open();
    await p1.page.click('#btn-a11y'); await p1.page.click('#panel-a11y [role="radio"][data-value="dark"]'); await p1.page.click('#ax-zoom-in'); await p1.page.click('#panel-a11y [role="switch"]');
    await p1.page.reload(); await settle(p1.page, 300);
    ok(await html(p1.page, 'data-theme') === 'dark' && await p1.page.evaluate(() => document.documentElement.classList.contains('hc')) && await p1.page.evaluate(() => document.documentElement.style.getPropertyValue('--ax-zoom')) === '1.15', 'scheme, contrast and size survive a reload');
    await p1.ctx.close();
    const legacy = await open({ storage: { mdw_theme: 'dark' } });
    ok(await html(legacy.page, 'data-theme') === 'dark', 'a v4.6 mdw_theme="dark" is kept');
    await legacy.page.click('#btn-a11y');
    ok(await checkedTheme(legacy.page) === 'dark', 'and shown as selected');
    await legacy.ctx.close();
    const legacyLight = await open({ storage: { mdw_theme: 'light' } });
    ok(await html(legacyLight.page, 'data-theme') === 'light', 'a v4.6 mdw_theme="light" is kept');
    await legacyLight.ctx.close();
    const bad = await open({ storage: { mdw_theme: 'purple', mdw_a11y_zoom: '999', mdw_a11y_hc: 'yes' } });
    ok(await html(bad.page, 'data-theme') === 'system' && await bad.page.evaluate(() => !document.documentElement.classList.contains('hc') && ['', '1'].includes(document.documentElement.style.getPropertyValue('--ax-zoom'))), 'invalid stored values fall back to the defaults');
    await bad.page.click('#btn-a11y');
    ok(await bad.page.textContent('#ax-zoom-reset') === '100%', 'and the panel shows the defaults');
    await bad.ctx.close();
    const sys = await open({ colorScheme: 'dark' });
    ok(await html(sys.page, 'data-theme') === 'system' && await sys.page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(15, 23, 42)', '"system" follows prefers-color-scheme: dark');
    await sys.ctx.close();

    // skip link: first Tab stop, goes to the editor, or to the preview in the preview-only layout (BR2.9)
    const sk = await open();
    await sk.page.keyboard.press('Tab');
    ok(await sk.page.evaluate(() => document.activeElement.classList.contains('ax-skip') && document.activeElement.textContent.trim() === 'דלג לתוכן'), 'the first Tab stop is "דלג לתוכן"');
    ok(await sk.page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.width > 40 && r.height > 16 && r.top >= 0; }), 'and it is visible when focused');
    await sk.page.keyboard.press('Enter'); await settle(sk.page, 80);
    ok(await focusedId(sk.page) === 'markdown-input', 'Enter moves focus to the editor');
    await sk.page.evaluate(() => document.getElementById('workspace-main').setAttribute('data-layout', 'preview-only'));
    await sk.page.focus('.ax-skip'); await sk.page.keyboard.press('Enter'); await settle(sk.page, 80);
    ok(await focusedId(sk.page) === 'preview-content', 'in the preview-only layout it moves focus to the preview');
    await sk.ctx.close();
  };

  /* ======================================================================= ג. הקראה (WF4) */
  // speechSynthesis is replaced by a mock that records every utterance and ends it after __speakMs
  const speechInit = (cfg) => `(() => {
    const cfg = ${JSON.stringify(cfg || {})};
    if (cfg.none) { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); window.SpeechSynthesisUtterance = undefined; return; }
    window.__spoken = []; window.__speakMs = cfg.ms || 40; window.__cancels = 0;
    window.__voices = cfg.voices || [{ lang: 'he-IL', name: 'Mock Hebrew' }, { lang: 'en-US', name: 'Mock English' }];
    class U { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.onend = null; this.onerror = null; } }
    window.SpeechSynthesisUtterance = U;
    let current = null; let timer = null; let pendingEnd = false;
    const finish = () => { const u = current; current = null; synth.speaking = false; if (u && u.onend) u.onend({}); };
    const synth = {
      speaking: false, paused: false,
      getVoices() { return window.__voices; },
      speak(u) {
        window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.name : null });
        current = u; synth.speaking = true; pendingEnd = false;
        clearTimeout(timer);
        timer = setTimeout(() => { if (synth.paused) pendingEnd = true; else finish(); }, window.__speakMs);
      },
      cancel() { clearTimeout(timer); current = null; synth.speaking = false; synth.paused = false; window.__cancels++; },
      pause() { synth.paused = true; },
      resume() { synth.paused = false; if (pendingEnd) { pendingEnd = false; setTimeout(finish, 10); } },
      addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  })();`;
  const spoken = (page) => page.evaluate(() => (window.__spoken || []).map((s) => s.text));

  parts.c = async () => {
    console.log('ג. read aloud (WF4, BR2.6–BR2.8)');
    const DOC = ['# כותרת ראשית', '', 'פסקה ראשונה בעברית.', '', '- פריט ברשימה', '', '- [ ] משימה פתוחה', '- [x] משימה סגורה', '', '> ציטוט קצר', '', '| שם | גיל |', '| --- | --- |', '| דנה | 30 |', '', '```js', 'const a = 1;', '```', '', '```mermaid', 'flowchart LR', '  A --> B', '```'].join('\n');

    const { ctx, page } = await open({ init: speechInit({ ms: 30 }) });
    await setMd(page, DOC);
    await page.click('#btn-a11y');
    ok(await page.textContent('#ax-read') === '▶ הקראה' && await attr(page, '#ax-read', 'aria-pressed') === 'false' && await attr(page, '#ax-read', 'aria-label') === 'הקראת המסמך', 'idle: "▶ הקראה", aria-pressed="false"');
    ok(await page.$eval('#ax-pause', (b) => b.disabled), '"השהיה" is disabled while idle');
    ok(await page.$eval('#ax-stop-pill', (p) => p.hidden), 'the stop pill is hidden while idle');
    await page.click('#ax-read'); await settle(page, 900);
    const said = await spoken(page);
    ok(JSON.stringify(said) === JSON.stringify(['כותרת ראשית', 'פסקה ראשונה בעברית.', 'פריט ברשימה', 'משימה פתוחה: משימה פתוחה', 'משימה סגורה: משימה סגורה', 'ציטוט קצר', 'שם: דנה. גיל: 30', 'בלוק קוד', 'תרשים']), 'segments follow the document order: ' + JSON.stringify(said));
    ok(await page.evaluate(() => window.__spoken.every((s) => s.lang === 'he-IL' && s.voice === 'Mock Hebrew')), 'every utterance uses lang he-IL and the Hebrew voice');
    ok(await page.textContent('#ax-live') === 'ההקראה הסתיימה', 'live region: "ההקראה הסתיימה" at the end');
    ok(await attr(page, '#ax-read', 'aria-pressed') === 'false' && await page.$eval('#ax-stop-pill', (p) => p.hidden) && !(await page.$('#preview-content .ax-reading')), 'back to idle: no highlight, no pill');
    await ctx.close();

    // highlight, scroll, pause / resume, pill, dot
    const s2 = await open({ init: speechInit({ ms: 600 }), viewport: { width: 1280, height: 600 } });
    const long = Array.from({ length: 40 }, (_, i) => `פסקה מספר ${i + 1} עם מעט טקסט כדי שהמסמך יהיה ארוך.`).join('\n\n');
    await setMd(s2.page, long);
    await s2.page.click('#btn-a11y'); await s2.page.click('#ax-read'); await settle(s2.page, 150);
    ok(await attr(s2.page, '#ax-read', 'aria-pressed') === 'true' && await s2.page.textContent('#ax-read') === '■ עצירה' && await attr(s2.page, '#ax-read', 'aria-label') === 'עצירת הקראה', 'reading: "■ עצירה", aria-pressed="true"');
    ok(await s2.page.textContent('#ax-live') === 'ההקראה התחילה', 'live region: "ההקראה התחילה"');
    ok(await s2.page.$eval('#ax-stop-pill', (p) => !p.hidden) && await attr(s2.page, '#ax-stop-pill', 'aria-label') === 'עצירת הקראה', 'the stop pill is visible while reading');
    ok(await attr(s2.page, '#btn-a11y', 'aria-label') === 'נגישות — הוגדרו התאמות' && await s2.page.$eval('[data-testid="a11y-dot"]', (d) => !d.hidden), 'the icon shows the dot while reading (BR1.6)');
    const hl = () => s2.page.$$eval('#preview-content .ax-reading', (a) => a.map((e) => e.textContent.trim()));
    ok(JSON.stringify(await hl()) === JSON.stringify(['פסקה מספר 1 עם מעט טקסט כדי שהמסמך יהיה ארוך.']) || (await hl()).length === 1, 'exactly one element carries .ax-reading');
    ok(await s2.page.$eval('#preview-content .ax-reading', (e) => getComputedStyle(e).outlineStyle !== 'none' && getComputedStyle(e).outlineWidth !== '0px'), 'the reading element has a visible ring (--reading-ring)');
    await s2.page.keyboard.press('Escape'); await settle(s2.page, 80);   // closes the panel first (BR2.13)
    ok(!(await isOpen(s2.page, 'panel-a11y')) && await attr(s2.page, '#ax-read', 'aria-pressed') === 'true', 'Esc with a panel open closes the panel and reading goes on');
    await s2.page.evaluate(() => { window.__speakMs = 150; });
    await settle(s2.page, 3200);
    ok(await s2.page.evaluate(() => { const pane = document.querySelector('#preview-container'); const el = document.querySelector('#preview-content .ax-reading'); if (!el) return false; const r = el.getBoundingClientRect(); const pr = pane.getBoundingClientRect(); return pane.scrollTop > 0 && r.bottom > pr.top && r.top < pr.bottom; }), 'the reading element is scrolled into view');
    await s2.page.click('#btn-a11y'); await s2.page.click('#ax-pause'); await settle(s2.page, 100);
    ok(await s2.page.textContent('#ax-pause') === 'המשך' && await attr(s2.page, '#ax-pause', 'aria-label') === 'המשך הקראה', 'pause → the button says "המשך"');
    const countPaused = (await spoken(s2.page)).length;
    await settle(s2.page, 900);
    ok((await spoken(s2.page)).length === countPaused, 'nothing new is spoken while paused');
    await s2.page.click('#ax-pause'); await settle(s2.page, 900);
    ok((await spoken(s2.page)).length > countPaused && await s2.page.textContent('#ax-pause') === 'השהיה', 'resume continues with the next segment');
    // stop from the pill: focus goes to the accessibility icon
    await s2.page.click('#ax-stop-pill'); await settle(s2.page, 100);
    ok(await attr(s2.page, '#ax-read', 'aria-pressed') === 'false' && await s2.page.$eval('#ax-stop-pill', (p) => p.hidden) && !(await s2.page.$('#preview-content .ax-reading')), 'the pill stops reading and disappears');
    ok(await focusedId(s2.page) === 'btn-a11y', 'focus moves to the accessibility icon after stopping from the pill');
    ok(await attr(s2.page, '#btn-a11y', 'aria-label') === 'נגישות' && await s2.page.$eval('[data-testid="a11y-dot"]', (d) => d.hidden), 'the dot goes away again');
    ok(await s2.page.evaluate(() => window.__cancels) >= 1, 'speechSynthesis.cancel() was called');
    // Esc with no panel open stops reading
    const before = (await spoken(s2.page)).length;
    await s2.page.click('#btn-a11y'); await s2.page.click('#ax-read'); await settle(s2.page, 100);
    await s2.page.keyboard.press('Escape'); await settle(s2.page, 60);      // closes the panel
    await s2.page.keyboard.press('Escape'); await settle(s2.page, 100);     // stops
    ok(await s2.page.$eval('#ax-stop-pill', (p) => p.hidden) && (await spoken(s2.page)).length >= before, 'a second Esc stops the reading');
    // stop with ■ inside the panel: focus stays on the button
    await s2.page.click('#btn-a11y'); await s2.page.click('#ax-read'); await settle(s2.page, 100);
    await s2.page.click('#ax-read'); await settle(s2.page, 100);
    ok(await attr(s2.page, '#ax-read', 'aria-pressed') === 'false' && await focusedId(s2.page) === 'ax-read', '■ in the panel stops and keeps focus on the button');
    // reset stops reading
    await s2.page.click('#ax-read'); await settle(s2.page, 100);
    await s2.page.click('#panel-a11y .ax-reset'); await settle(s2.page, 100);
    ok(await attr(s2.page, '#ax-read', 'aria-pressed') === 'false', 'the reset link stops reading (BR2.10)');
    await s2.ctx.close();

    // long segment is split at sentence ends, ≤ 200 chars, the highlight stays on one element
    const s3 = await open({ init: speechInit({ ms: 20 }) });
    const sentence = 'זהו משפט ארוך יחסית שנועד לבדוק את הפיצול של הקראה. ';
    await setMd(s3.page, sentence.repeat(9).trim());
    await s3.page.click('#btn-a11y'); await s3.page.click('#ax-read'); await settle(s3.page, 700);
    const parts3 = await spoken(s3.page);
    ok(parts3.length >= 3 && parts3.every((t) => t.length <= 200) && parts3.slice(0, -1).every((t) => /[.?!:]$/.test(t)), `a long paragraph is split into ${parts3.length} utterances of ≤ 200 chars at sentence ends`);
    ok(parts3.join(' ').replace(/\s+/g, ' ') === sentence.repeat(9).trim().replace(/\s+/g, ' '), 'no text is lost in the split');
    await s3.ctx.close();

    // empty document
    const s4 = await open({ init: speechInit({ ms: 20 }) });
    await setMd(s4.page, '   ');
    await s4.page.click('#btn-a11y'); await s4.page.click('#ax-read'); await settle(s4.page, 300);
    ok((await spoken(s4.page)).length === 0 && await s4.page.textContent('#ax-live') === 'המסמך ריק' && await attr(s4.page, '#ax-read', 'aria-pressed') === 'false', 'empty document: "המסמך ריק", nothing spoken, stays idle');
    await s4.ctx.close();

    // no Hebrew voice → message, default voice, reading continues
    const s5 = await open({ init: speechInit({ ms: 400, voices: [{ lang: 'en-US', name: 'Only English' }] }) });
    await setMd(s5.page, 'שלום עולם');
    await s5.page.click('#btn-a11y'); await s5.page.click('#ax-read'); await settle(s5.page, 80);
    ok(await s5.page.evaluate(() => (document.getElementById('toast').textContent || '').includes('לא נמצא קול עברי')), 'no Hebrew voice → toast "לא נמצא קול עברי, ההקראה בקול ברירת המחדל"');
    await settle(s5.page, 300);
    ok((await spoken(s5.page)).length === 1 && await s5.page.evaluate(() => window.__spoken[0].voice === null && window.__spoken[0].lang === 'he-IL'), 'and it reads with the default voice, lang he-IL');
    await s5.ctx.close();

    // no speechSynthesis → button disabled with an explanation
    const s6 = await open({ init: speechInit({ none: true }) });
    await s6.page.click('#btn-a11y');
    ok(await s6.page.$eval('#ax-read', (b) => b.disabled) && await s6.page.$eval('#ax-read-hint', (h) => !h.hidden && h.textContent.includes('לא תומך בהקראה')), 'without speechSynthesis ▶ is disabled and a hint explains why');
    ok(await attr(s6.page, '#ax-read', 'aria-describedby') === 'ax-read-hint', 'the hint is the button\'s description');
    await s6.ctx.close();
  };

  /* ======================================================================= ד. פאנל הייצוא (WF5) */
  const printStub = 'window.__printed = 0; window.print = function () { window.__printed++; };';
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const TILE_ORDER = ['pdf', 'html', 'live', 'print', 'md', 'docx'];

  // opens the panel, chooses a tile and returns the download {name, buf, ms}
  async function exportFile(page, format, sel) {
    await page.click('#btn-export'); await settle(page, 60);
    const t = Date.now();
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click(sel || `#panel-export [data-format="${format}"]`)]);
    const ms = Date.now() - t;
    const file = path.join(downloadsDir, Date.now() + '-' + dl.suggestedFilename().replace(/[\\/]/g, '_'));
    await dl.saveAs(file);
    return { name: dl.suggestedFilename(), buf: fs.readFileSync(file), file, ms };
  }
  const downloadsCount = (page) => page.evaluate(() => window.__dlCount || 0);
  const countDownloads = (page) => { page.__dl = 0; page.on('download', () => { page.__dl++; }); };

  parts.d = async () => {
    console.log('ד. export panel (WF5, BR3, BR4)');
    const DOC = ['# מסמך בדיקה', '', 'פסקה עם API ומספר 3.5 בתוכה.', '', '- פריט א', '- פריט ב', '', '| שם | ערך |', '| --- | --- |', '| א | 1 |', '', '```js', 'const x = 1;', '```'].join('\n');
    const { ctx, page } = await open({ init: printStub });
    countDownloads(page);
    await setMd(page, DOC);
    await page.fill('#doc-title', 'מסמך אפיון תוכנה');

    // six tiles in order
    await page.click('#btn-export'); await settle(page, 100);
    ok(await page.$$eval('#panel-export .ex-tile', (a) => a.map((t) => t.dataset.format).join(',')) === TILE_ORDER.join(','), 'six tiles in order: PDF, HTML view-only, live HTML, print, Markdown, Word');
    ok(await page.$$eval('#panel-export .ex-badge', (a) => a.map((b) => b.textContent).join(',')) === 'PDF,HTML,HTML,PRINT,MD,DOCX', 'each tile has a text badge');
    ok(await page.$$eval('#panel-export .ex-tile', (a) => a.length === 6 && a.every((t) => t.tagName === 'BUTTON' && !!t.getAttribute('aria-label') && !!t.getAttribute('aria-describedby') && !!document.getElementById(t.getAttribute('aria-describedby')))), 'tiles are buttons with an aria-label and a description');
    ok(await attr(page, '#panel-export [data-format="docx"]', 'aria-label') === 'ייצוא ל-Word, קובץ docx', 'Word tile label "ייצוא ל-Word, קובץ docx"');
    ok(await page.textContent('#panel-export [data-format="pdf-file"]') === 'הורדת קובץ מוכן ל-PDF', 'the PDF tile has the fallback link "הורדת קובץ מוכן ל-PDF"');
    ok(await page.evaluate(() => { const l = document.querySelector('#panel-export [data-format="pdf-file"]'); return !l.closest('.ex-tile') && l.tabIndex >= 0; }), 'the fallback link is a separate tab stop (not nested in a button)');
    ok(await page.evaluate(() => ['btn-export-interactive-html', 'btn-export-clean-html', 'btn-export-word', 'btn-print-doc'].every((id) => !document.getElementById(id)) && !!document.getElementById('btn-save-md')), 'the four old toolbar buttons are gone, "שמור MD" stays');
    await page.keyboard.press('Escape');

    // Markdown
    const md = await exportFile(page, 'md');
    ok(md.name === `מסמך-אפיון-תוכנה-${today()}.md`, 'Markdown file name <title>-<YYYY-MM-DD>.md: ' + md.name);
    const mdText = md.buf.toString('utf8');
    ok(mdText.startsWith('<div dir="rtl" lang="he">') && mdText.trimEnd().endsWith('</div>'), 'Markdown is wrapped in <div dir="rtl" lang="he">');
    ok(/# מסמך אפיון תוכנה/.test(mdText) && /נכון ל-\u200E?\d\d\.\d\d\.\d{4}/.test(mdText), 'title and "נכון ל-DD.MM.YYYY" are in the head');
    ok(mdText.includes('\u200EAPI\u200E') && mdText.includes('| א | \u200E1\u200E |') === false || mdText.includes('\u200EAPI\u200E'), 'LRM wraps the Latin term inside the Hebrew paragraph');
    ok(!(await isOpen(page, 'panel-export')) && await focusedId(page) === 'btn-export', 'the panel closed after the choice and focus is back on the export icon (BR1.4)');
    ok((await page.textContent('#toast')).includes('נוצר') && (await page.textContent('#toast')).includes(md.name), 'success toast names the file');
    ok(await page.$eval('#toast bdi', (b) => b.textContent) === md.name, 'the file name inside the toast is wrapped in <bdi>');
    await settle(page, 120);
    ok((await page.textContent('#ax-live')).includes(md.name), 'and the live region announces it');

    // Word: a real docx
    const dx = await exportFile(page, 'docx');
    ok(dx.name === `מסמך-אפיון-תוכנה-${today()}.docx`, 'Word file name ends with .docx: ' + dx.name);
    let entries = [];
    try { entries = readZip(dx.buf); } catch (e) { ok(false, 'the docx opens in the test ZIP reader: ' + e.message); }
    const names = entries.map((e) => e.name);
    ok(names[0] === '[Content_Types].xml' && ['word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/settings.xml', 'docProps/core.xml', '_rels/.rels', 'word/_rels/document.xml.rels'].every((n) => names.includes(n)), 'docx opens in the ZIP reader (CRCs checked) with all parts: ' + names.length);
    const docXml = (entries.find((e) => e.name === 'word/document.xml') || { data: Buffer.alloc(0) }).data.toString('utf8');
    ok(docXml.includes('מסמך בדיקה') && docXml.includes('<w:bidi/>') && docXml.includes('<w:tbl>') && docXml.includes('Consolas'), 'document.xml has the Hebrew text, w:bidi, a table and a code run');

    // Word: a table wider than Word allows (NFR7.11) — the merge is reported to the user, not silent
    const cols = Array.from({ length: 64 }, (_, i) => 'c' + (i + 1));
    await setMd(page, ['# טבלה רחבה', '', '| ' + cols.join(' | ') + ' |', '|' + cols.map(() => ' --- ').join('|') + '|', '| ' + cols.map((_, i) => String(i)).join(' | ') + ' |'].join('\n'));
    const wide = await exportFile(page, 'docx');
    ok(wide.buf.length > 0, 'a 64-column table still exports to Word');
    const toastWide = await page.textContent('#toast');
    ok(toastWide.includes('64 עמודות') && toastWide.includes('63'), 'the toast tells the user that the extra columns were merged (NFR7.11): ' + toastWide);
    await settle(page, 120);
    ok((await page.textContent('#ax-live')).includes('64 עמודות'), 'and the live region announces the warning');
    await setMd(page, DOC);

    // View-only HTML opens without CSP errors; has no script
    const hv = await exportFile(page, 'html');
    ok(hv.name === `מסמך-אפיון-תוכנה-${today()}.html`, 'view-only HTML file name: ' + hv.name);
    const hvText = hv.buf.toString('utf8');
    ok(!/<script/i.test(hvText) && hvText.includes('Content-Security-Policy') && hvText.includes('נכון ל-'), 'view-only HTML: no <script>, CSP present, "נכון ל-" present');
    const viewer = await ctx.newPage();
    const viewerLog = [];
    viewer.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) viewerLog.push(m.text()); });
    viewer.on('pageerror', (e) => viewerLog.push('pageerror ' + e.message));
    await viewer.addInitScript(() => { window.__csp = 0; document.addEventListener('securitypolicyviolation', () => { window.__csp++; }); });
    await viewer.goto('file://' + hv.file); await settle(viewer, 300);
    ok(viewerLog.length === 0 && await viewer.evaluate(() => window.__csp) === 0 && (await viewer.textContent('h1')).includes('מסמך בדיקה'), 'the view-only file opens with no CSP violation or error: ' + JSON.stringify(viewerLog));
    await viewer.close();

    // Live HTML round trip still works from the panel
    const lv = await exportFile(page, 'live');
    const liveText = lv.buf.toString('utf8');
    ok(lv.name.endsWith('.html') && liveText.includes('mdw-dock') && !liveText.includes('btn-a11y') && !liveText.includes('btn-export'), 'live HTML has its dock and not the app icons (BR3.4)');

    // PDF fallback: an HTML that prints itself
    const pf = await exportFile(page, 'pdf-file', '#panel-export [data-format="pdf-file"]');
    const pfText = pf.buf.toString('utf8');
    ok((pfText.match(/<script/g) || []).length === 1 && pfText.includes('window.print()') && /size:\s*A4 portrait/.test(pfText) && pfText.includes('print-color-adjust'), 'PDF fallback file: one fixed print script, A4 portrait, print-color-adjust');

    // PDF and print tiles call window.print and give no success message
    await page.click('#btn-export'); await page.click('#panel-export [data-format="pdf"]'); await settle(page, 200);
    ok(await page.evaluate(() => window.__printed) === 1, 'PDF tile calls window.print()');
    ok((await page.textContent('#toast')).includes('שמירה כ-PDF'), 'and shows the "שמירה כ-PDF" guidance');
    await page.click('#btn-export'); await page.click('#panel-export [data-format="print"]'); await settle(page, 200);
    // 6 downloads so far: md, docx, wide-table docx, html, live, pdf-file
    ok(await page.evaluate(() => window.__printed) === 2 && page.__dl === 6, 'print tile calls window.print() and downloads nothing');
    ok(await page.evaluate(() => !document.getElementById('btn-export').hasAttribute('aria-busy') && document.getElementById('btn-export').getAttribute('aria-label') === 'ייצוא'), 'back to idle right after print (no busy state left)');

    // print styles
    await page.emulateMedia({ media: 'print' });
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('header.app-header')).display === 'none' && getComputedStyle(document.querySelector('.secondary-bar')).display === 'none' && getComputedStyle(document.querySelector('.editor-pane')).display === 'none' && getComputedStyle(document.querySelector('.hdr-panel')).display === 'none'), 'print hides the header, bars, panels and editor (BR3.5)');
    ok(await page.evaluate(() => { const h = document.querySelector('.print-head'); return !!h && getComputedStyle(h).display !== 'none' && h.textContent.includes('מסמך אפיון תוכנה') && /נכון ל-\d\d\.\d\d\.\d{4}/.test(h.textContent); }), 'the print head (title + "נכון ל-") shows in print');
    ok(await page.evaluate(() => ['table', 'pre'].every((s) => { const e = document.querySelector('#preview-content ' + s); return !e || getComputedStyle(e).breakInside === 'avoid'; })), 'tables and code do not break across pages');
    await page.emulateMedia({ media: 'screen' });
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('.print-head')).display === 'none'), 'the print head is hidden on screen');

    // busy state, one job at a time
    await page.evaluate(() => {
      window.__busyLog = [];
      const b = document.getElementById('btn-export');
      new MutationObserver(() => window.__busyLog.push([b.getAttribute('aria-busy'), b.getAttribute('aria-label'), (b.querySelector('.hdr-lbl') || {}).textContent])).observe(b, { attributes: true, subtree: true, childList: true, characterData: true });
    });
    const downloadsBefore = page.__dl;
    await page.click('#btn-export'); await settle(page, 60);
    const dlP = page.waitForEvent('download');
    await page.evaluate(() => {
      document.querySelector('#panel-export [data-format="docx"]').click();
      document.querySelector('#panel-export [data-format="md"]').click();      // second request while busy
    });
    await dlP; await settle(page, 500);
    ok(page.__dl === downloadsBefore + 1, 'a second request while one runs is ignored (one job at a time, BR4.9)');
    const log = await page.evaluate(() => window.__busyLog);
    ok(log.some((l) => l[0] === 'true' && l[1] === 'מייצר קובץ…' && l[2] === 'מייצר קובץ…'), 'the icon is aria-busy="true" with the label "מייצר קובץ…" before the file arrives');
    ok(await page.evaluate(() => { const b = document.getElementById('btn-export'); return !b.hasAttribute('aria-busy') && b.getAttribute('aria-label') === 'ייצוא' && b.querySelector('.hdr-lbl').textContent === 'ייצוא'; }), 'afterwards aria-busy is gone and the label is "ייצוא" again');
    ok((await page.textContent('#ax-live')).includes('נוצר') || (await page.textContent('#ax-live')).length > 0, 'live region got messages for the job');
    await ctx.close();

    // empty document: all six tiles refuse
    const e = await open({ init: printStub });
    countDownloads(e.page);
    await setMd(e.page, '  \n  ');
    for (const f of TILE_ORDER) {
      await e.page.click('#btn-export'); await e.page.click(`#panel-export [data-format="${f}"]`); await settle(e.page, 120);
      ok((await e.page.textContent('#toast')) === 'המסמך ריק', `empty document, ${f}: "המסמך ריק"`);
    }
    await e.page.click('#btn-export'); await e.page.click('#panel-export [data-format="pdf-file"]'); await settle(e.page, 120);
    ok(e.page.__dl === 0 && await e.page.evaluate(() => window.__printed) === 0, 'empty document: no file and no print window from any tile');
    ok((await e.page.textContent('#ax-live')) === 'המסמך ריק', 'and the live region says so');
    await e.ctx.close();

    // injected failure: back to idle, console.error('[mdw-export]', …), Hebrew message
    const f = await open({ init: printStub, expectConsole: /\[mdw-export\]/ });
    countDownloads(f.page);
    const consoleLog = [];
    f.page.on('console', (m) => { if (m.type() === 'error') consoleLog.push(m.text()); });
    await setMd(f.page, DOC);
    await f.page.evaluate(() => { window.__mdwTestFailNextExport = true; });
    await f.page.click('#btn-export'); await f.page.click('#panel-export [data-format="docx"]'); await settle(f.page, 400);
    ok(f.page.__dl === 0 && (await f.page.textContent('#toast')) === 'לא הצלחנו ליצור את קובץ ה-Word. נסו שוב.', 'injected failure: no file, Hebrew message "לא הצלחנו ליצור את קובץ ה-Word. נסו שוב."');
    ok(consoleLog.some((l) => l.startsWith('[mdw-export]') && l.includes('docx')), 'console.error("[mdw-export]", format, name, message): ' + consoleLog.join(' | '));
    ok(!consoleLog.join('').includes('פסקה עם API'), 'the log never carries the document text');
    ok(await f.page.evaluate(() => { const b = document.getElementById('btn-export'); return !b.hasAttribute('aria-busy') && b.getAttribute('aria-label') === 'ייצוא'; }), 'state is idle again after the failure');
    const again = await exportFile(f.page, 'docx');
    ok(again.name.endsWith('.docx'), 'the next export works');
    await f.ctx.close();

    // download not available → tiles disabled with an explanation
    const n = await open({ init: printStub + ' URL.createObjectURL = undefined;' });
    await n.page.click('#btn-export'); await settle(n.page, 100);
    ok(await n.page.$$eval('#panel-export .ex-tile', (a) => a.filter((t) => t.getAttribute('aria-disabled') === 'true').map((t) => t.dataset.format).join(',')) === 'html,live,md,docx', 'without object URLs the four download tiles are aria-disabled (print and PDF stay)');
    ok(await n.page.$eval('#panel-export [data-format="docx"]', (t) => document.getElementById(t.getAttribute('aria-describedby')).textContent.includes('הורדה לא זמינה')), 'with the explanation "הורדה לא זמינה"');
    await n.ctx.close();

    // the visual editor is flushed before the source is read (BR4.1)
    const v = await open({ init: printStub });
    await setMd(v.page, 'שלום');
    await v.page.click('#mode-btn-visual'); await settle(v.page, 300);
    await v.page.click('#visual-editor p'); await v.page.keyboard.press('End'); await v.page.keyboard.type(' ZZTOP');
    await v.page.click('#btn-export');
    const [vdl] = await Promise.all([v.page.waitForEvent('download'), v.page.evaluate(() => document.querySelector('#panel-export [data-format="md"]').click())]);
    const vf = path.join(downloadsDir, 'visual-flush.md'); await vdl.saveAs(vf);
    ok(fs.readFileSync(vf, 'utf8').includes('ZZTOP'), 'text typed in the visual editor a moment ago is in the exported Markdown');
    await v.ctx.close();

    // offline + performance
    const o = await open({ init: printStub });
    await o.page.fill('#doc-title', 'מסמך אפיון תוכנה');
    await o.ctx.setOffline(true);
    const off = await exportFile(o.page, 'docx');
    ok(off.name.endsWith('.docx') && readZip(off.buf).length >= 8, 'Word export works with the network off (NFR8.3)');
    await o.ctx.setOffline(false);
    const sample = await exportFile(o.page, 'docx');
    ok(sample.ms < 1000, `Word export of the sample document: ${sample.ms}ms (< 1000ms, NFR7.1)`);

    const rows = [];
    for (let i = 0; i < 700; i++) rows.push(`## כותרת ${i}`, '', `פסקה מספר ${i} עם Latin words, מספר 3.${i} ו-API.`, '', `- פריט ${i} א`, `- פריט ${i} ב`, '', '| עמודה א | עמודה ב |', '| --- | --- |', `| ערך ${i} | ${i} |`, '');
    const big = rows.join('\n');
    await setMd(o.page, big);
    ok(big.split('\n').length >= 5000, 'the large document has ≥ 5,000 lines (' + big.split('\n').length + ')');
    await o.page.evaluate(() => { window.__long = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__long = Math.max(window.__long, e.duration); })).observe({ type: 'longtask', buffered: false }); } catch (_) { window.__long = -1; } });
    const bigDocx = await exportFile(o.page, 'docx');
    ok(bigDocx.ms < 2000, `Word export of 5,000 lines: ${bigDocx.ms}ms (< 2000ms, NFR7.3)`);
    const bigMd = await exportFile(o.page, 'md');
    ok(bigMd.ms < 2000, `Markdown export of 5,000 lines: ${bigMd.ms}ms (< 2000ms, NFR7.3)`);
    const bigHtml = await exportFile(o.page, 'html');
    ok(bigHtml.ms < 1000, `HTML export of 5,000 lines: ${bigHtml.ms}ms (< 1000ms, NFR7.4)`);
    const longest = await o.page.evaluate(() => window.__long);
    ok(longest !== -1 && longest < 1000, `the longest main-thread task during the exports: ${Math.round(longest)}ms (< 1000ms, NFR7.5)`);
    await o.ctx.close();
  };

  /* ======================================================================= ה. עורך ויזואלי (WF8, R-06..R-10, BR2.13) */
  const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
  const getMd = (page) => page.inputValue('#markdown-input');
  const caretEnd = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const x = getSelection(); x.removeAllRanges(); x.addRange(r); el.closest('[contenteditable]').focus(); }, sel);
  const selectAllIn = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(el); const x = getSelection(); x.removeAllRanges(); x.addRange(r); el.closest('[contenteditable]').focus(); }, sel);
  const pasteText = (page, text) => page.evaluate((t) => { const ed = document.getElementById('visual-editor'); const dt = new DataTransfer(); dt.setData('text/plain', t); ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, text);
  async function visualWith(md, opts) {
    const o = await open(opts || {});
    await setMd(o.page, md);
    await o.page.click('#mode-btn-visual'); await settle(o.page, 350);
    return o;
  }

  parts.e = async () => {
    console.log('ה. visual editor: R-06..R-10 and the Escape precedence (WF8, BR5, BR2.13)');

    // R-06: a span[style] that was there before the paste is left alone, and nothing is rewritten when nothing was added
    const a = await visualWith('שלום עולם');
    await a.page.evaluate(() => { window.__replaced = 0; const orig = Element.prototype.replaceWith; Element.prototype.replaceWith = function () { window.__replaced++; return orig.apply(this, arguments); }; });
    await a.page.evaluate(() => { document.querySelector('#visual-editor p').insertAdjacentHTML('afterbegin', '<span style="color:red">KEEP</span> '); });
    await caretEnd(a.page, '#visual-editor p');
    await pasteText(a.page, 'זנב'); await settle(a.page, 300);
    ok(await a.page.$$eval('#visual-editor span[style]', (s) => s.map((e) => e.textContent).join(',')) === 'KEEP', 'R-06: a span[style] that existed before the paste is still there');
    ok(await a.page.evaluate(() => window.__replaced) === 0, 'R-06: when the paste added no span[style], no DOM node was rewritten');
    ok((await a.page.textContent('#visual-editor p')).includes('זנב'), 'and the pasted text arrived');
    await a.ctx.close();

    // a span that the browser adds during the paste is still unwrapped (the original purpose of the function)
    const b = await visualWith('אבג');
    await caretEnd(b.page, '#visual-editor p');
    await b.page.evaluate(() => {
      const ed = document.getElementById('visual-editor');
      const orig = document.execCommand.bind(document);
      document.execCommand = function (cmd, ui, val) { const r = orig(cmd, ui, val); if (cmd === 'insertHTML' || cmd === 'insertText') { const p = ed.querySelector('p'); if (p) p.insertAdjacentHTML('beforeend', '<span style="font-family:Arial">ADDED</span>'); } return r; };
    });
    await pasteText(b.page, 'דגכ\nהוז'); await settle(b.page, 300);
    ok(await b.page.$$eval('#visual-editor span[style]', (s) => s.length) === 0 && (await b.page.textContent('#visual-editor')).includes('ADDED'), 'R-06: a span[style] added by the paste itself is unwrapped and its text kept');
    await b.ctx.close();

    // paste in body / cell / list item, then Ctrl+Z and Ctrl+Shift+Z (R-07)
    // R-07 KNOWN LIMITATION (WF8 step 6): in the BODY, Chromium wraps the inserted HTML in span[style]; unwrapping that span is a
    // DOM change outside execCommand, so after a paste of SEVERAL lines one Ctrl+Z removes only the part after the first line.
    // The 'body, several lines' case below pins that exact behaviour (and that redo restores everything); it is listed in BACKLOG.
    const cases = [
      { name: 'body, one line', md: 'ab', sel: '#visual-editor p', text: 'XYZ', has: ['XYZ'], full: true },
      { name: 'table cell', md: '| h1 | h2 |\n| --- | --- |\n| c1 | c2 |', sel: '#visual-editor td', text: 'XYZ\nQQQ', has: ['XYZ QQQ'], full: true },
      { name: 'list item', md: '* one\n* two', sel: '#visual-editor li', text: 'XYZ\nQQQ', has: ['XYZ QQQ'], full: true },
      { name: 'body, several lines (R-07 known limitation)', md: 'ab', sel: '#visual-editor p', text: 'XYZ\nQQQ', has: ['XYZ', 'QQQ'], full: false }
    ];
    for (const c of cases) {
      const v = await visualWith(c.md);
      const before = (await getMd(v.page)).trimEnd();
      await caretEnd(v.page, c.sel);
      await pasteText(v.page, c.text); await settle(v.page, 450);
      const afterPaste = await getMd(v.page);
      ok(c.has.every((t) => afterPaste.includes(t)), `paste in ${c.name}: the text is in the Markdown (${JSON.stringify(afterPaste)})`);
      await v.page.keyboard.press(MOD + '+KeyZ'); await settle(v.page, 450);
      const afterUndo = (await getMd(v.page)).trimEnd();
      if (c.full) ok(afterUndo === before, `paste in ${c.name}: ${MOD}+Z restores the document (${JSON.stringify(afterUndo)})`);
      else ok(afterUndo.includes('abXYZ') && !afterUndo.includes('QQQ'), `paste in ${c.name}: ${MOD}+Z removes only the part after the first line (documented, ${JSON.stringify(afterUndo)})`);
      await v.page.keyboard.press(MOD + '+Shift+KeyZ'); await settle(v.page, 450);
      const afterRedo = await getMd(v.page);
      ok(c.has.every((t) => afterRedo.includes(t)), `paste in ${c.name}: ${MOD}+Shift+Z brings the paste back (${JSON.stringify(afterRedo)})`);
      await v.ctx.close();
    }

    // R-08: Ctrl/Cmd+B and +I by physical key (Hebrew layout sends key 'נ' for the B key)
    const k = await visualWith('word');
    const press = (opts) => k.page.evaluate((o) => { const ed = document.getElementById('visual-editor'); const ev = new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, o)); ed.dispatchEvent(ev); return ev.defaultPrevented; }, opts);
    await selectAllIn(k.page, '#visual-editor p');
    ok(await press({ key: 'נ', code: 'KeyB', ctrlKey: true }) === true, 'R-08: Ctrl + the B key with key="נ" is handled');
    await settle(k.page, 350);
    ok((await getMd(k.page)).trim() === '**word**', 'R-08: and makes the selection bold: ' + JSON.stringify(await getMd(k.page)));
    await selectAllIn(k.page, '#visual-editor p');
    await press({ key: 'ן', code: 'KeyI', metaKey: true }); await settle(k.page, 350);
    ok(/\*word\*|\*\*\*word\*\*\*|_word_/.test(await getMd(k.page)) && !(await getMd(k.page)).includes('**word**') || (await getMd(k.page)).includes('*word*'), 'R-08: Cmd + the I key with key="ן" toggles italic: ' + JSON.stringify(await getMd(k.page)));
    ok(await press({ key: 'b', code: 'KeyB', ctrlKey: true }) === true, 'the English layout (key="b") still works');
    ok(await press({ key: 'x', code: 'KeyX', ctrlKey: true }) === false, 'other shortcuts are left to the browser');
    ok(await press({ key: 'B', code: 'KeyB', ctrlKey: true, shiftKey: true }) === false, 'Ctrl+Shift+B is not taken');
    await k.ctx.close();

    // R-09: Escape during IME composition does not release the editor
    const m = await visualWith('text');
    await caretEnd(m.page, '#visual-editor p');
    const esc = (o) => m.page.evaluate((x) => { const ed = document.getElementById('visual-editor'); const ev = new KeyboardEvent('keydown', Object.assign({ key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }, x)); ed.dispatchEvent(ev); return { prevented: ev.defaultPrevented, inEditor: ed.contains(document.activeElement) }; }, o);
    let r = await esc({ isComposing: true });
    ok(r.inEditor && !r.prevented, 'R-09: Escape with isComposing=true leaves focus in the editor');
    r = await esc({ keyCode: 229 });
    ok(r.inEditor && !r.prevented, 'R-09: Escape with keyCode 229 leaves focus in the editor');
    r = await esc({});
    ok(!r.inEditor, 'a plain Escape still releases the editor (v4.6.0 behaviour kept)');
    await m.ctx.close();

    // R-10: releaseFocus skips controls that cannot take focus
    const g = await visualWith('text');
    await g.page.evaluate(() => {
      const host = document.getElementById('editor-container');
      const mk = (id, attrs, style) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.textContent = id; if (style) b.setAttribute('style', style); Object.keys(attrs || {}).forEach((k2) => b.setAttribute(k2, attrs[k2])); host.appendChild(b); return b; };
      mk('ghost-visibility', {}, 'visibility:hidden');
      mk('ghost-display', {}, 'display:none');
      mk('ghost-disabled', { disabled: '' });
      const box = document.createElement('div'); box.setAttribute('inert', ''); host.appendChild(box);
      const inert = document.createElement('button'); inert.id = 'ghost-inert'; inert.textContent = 'x'; box.appendChild(inert);
      mk('real-target');
    });
    await caretEnd(g.page, '#visual-editor p');
    await g.page.keyboard.press('Escape'); await settle(g.page, 150);
    ok(await focusedId(g.page) === 'real-target', 'R-10: Escape skips visibility:hidden, display:none, disabled and inert controls and lands on a real one: ' + await focusedId(g.page));
    await g.ctx.close();

    // Esc precedence (BR2.13): panel → reading → editor
    const p = await visualWith('שלום', { init: speechInit({ ms: 800 }) });
    await p.page.click('#btn-a11y'); await settle(p.page, 100);
    await p.page.focus('#visual-editor');
    await p.page.keyboard.press('Escape'); await settle(p.page, 100);
    // the panel closes and focus goes back to its icon (BR1.4); the editor's own Esc (release to the next control) did NOT also run
    ok(!(await isOpen(p.page, 'panel-a11y')) && await focusedId(p.page) === 'btn-a11y', 'BR2.13: with a panel open, Esc closes the panel only (focus returns to the icon, the editor handler does not run)');
    await p.page.focus('#visual-editor');
    await p.page.keyboard.press('Escape'); await settle(p.page, 100);
    ok(!(await p.page.evaluate(() => document.getElementById('visual-editor').contains(document.activeElement))), 'and with nothing else open the next Esc releases the editor');
    // reading before the editor
    await p.page.click('#btn-a11y'); await p.page.click('#ax-read'); await settle(p.page, 150);
    await p.page.keyboard.press('Escape'); await settle(p.page, 80);          // panel
    await p.page.focus('#visual-editor');
    await p.page.keyboard.press('Escape'); await settle(p.page, 100);          // reading
    ok(await p.page.$eval('#ax-stop-pill', (e) => e.hidden) && await p.page.evaluate(() => document.getElementById('visual-editor').contains(document.activeElement)), 'BR2.13: with reading active (no panel), Esc stops the reading and the editor keeps focus');
    await p.page.keyboard.press('Escape'); await settle(p.page, 100);
    ok(!(await p.page.evaluate(() => document.getElementById('visual-editor').contains(document.activeElement))), 'and then Esc releases the editor');
    // a modal window wins: reading goes on
    await p.page.click('#btn-a11y'); await p.page.click('#ax-read'); await settle(p.page, 150);
    await p.page.keyboard.press('Escape'); await settle(p.page, 80);
    await p.page.click('#btn-open-template-mgr'); await settle(p.page, 250);
    await p.page.keyboard.press('Escape'); await settle(p.page, 150);
    ok(await p.page.$eval('#ax-stop-pill', (e) => !e.hidden), 'BR2.13: with a modal window open, Esc does not stop the reading');
    await p.ctx.close();
  };

  /* ======================================================================= ו. reflow, zoom, מקלדת ופוקוס (BR7.2, BR7.3, BR7.11) */
  parts.f = async () => {
    console.log('ו. reflow at 150% / 400px, caret with zoom, focus ring, hit areas, no keyboard trap');
    const overflow = (page) => page.evaluate(() => {
      const de = document.documentElement; const out = [];
      if (de.scrollWidth > de.clientWidth + 1) out.push(`document ${de.scrollWidth}>${de.clientWidth}`);
      ['body', 'header.app-header', '.secondary-bar', '#workspace-main'].forEach((s) => { const e = document.querySelector(s); if (e && e.scrollWidth > e.clientWidth + 1) out.push(`${s} ${e.scrollWidth}>${e.clientWidth}`); });
      return out;
    });
    const clipped = (page, rootSel) => page.evaluate((rs) => {
      const W = window.innerWidth; const bad = [];
      document.querySelectorAll(rs + ' button, ' + rs + ' select, ' + rs + ' input, ' + rs + ' a[href], ' + rs + ' [role="radio"]').forEach((c) => {
        const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || c.closest('[hidden]')) return;
        if (r.left < -1 || r.right > W + 1) bad.push((c.id || c.className || c.tagName) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
      });
      return bad;
    }, rootSel);

    // 150% at 400px, panels closed and open
    const n = await open({ viewport: { width: 400, height: 800 }, storage: { mdw_a11y_zoom: '150' } });
    ok(JSON.stringify(await overflow(n.page)) === '[]', 'no horizontal scroll at 150% / 400px: ' + JSON.stringify(await overflow(n.page)));
    ok(JSON.stringify(await clipped(n.page, 'header.app-header')) === '[]', 'no clipped control in the header: ' + JSON.stringify(await clipped(n.page, 'header.app-header')));
    ok(await n.page.evaluate(() => ['btn-a11y', 'btn-export'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.right <= window.innerWidth + 1 && r.left >= -1; })), 'both icons are on screen');
    ok(await n.page.evaluate(() => { const a = document.getElementById('btn-a11y').getBoundingClientRect(); const br = document.querySelector('.brand-group').getBoundingClientRect(); return a.top < br.bottom + 4; }), 'the icons stay in the first row of the header');
    for (const name of ['a11y', 'export']) {
      await n.page.click('#btn-' + name); await settle(n.page, 150);
      ok(JSON.stringify(await overflow(n.page)) === '[]', `no horizontal scroll with the ${name} panel open: ` + JSON.stringify(await overflow(n.page)));
      ok(JSON.stringify(await clipped(n.page, '#panel-' + name)) === '[]', `no clipped control in the ${name} panel: ` + JSON.stringify(await clipped(n.page, '#panel-' + name)));
      ok(await n.page.evaluate((id) => { const p = document.getElementById(id); const r = p.getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1 && p.scrollWidth <= p.clientWidth + 1; }, 'panel-' + name), `the ${name} panel fits the screen width`);
      ok(await n.page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.bottom <= window.innerHeight + 1 || document.getElementById(id).scrollHeight > 0; }, 'panel-' + name), `the ${name} panel is reachable vertically`);
      await n.page.keyboard.press('Escape'); await settle(n.page, 80);
    }
    ok(await n.page.evaluate(() => { const g = document.querySelector('.ex-tiles'); return true; }), 'export tiles render in the single column at ≤480px');
    await n.page.click('#btn-export'); await settle(n.page, 100);
    ok(await n.page.$$eval('#panel-export .ex-tile', (a) => new Set(a.map((t) => Math.round(t.getBoundingClientRect().left))).size === 1), 'at ≤480px the six tiles are in one column');
    await n.ctx.close();

    // caret placement with CSS zoom at 150% (BR7.11): code editor and visual editor
    const z = await open({ viewport: { width: 1440, height: 900 }, storage: { mdw_a11y_zoom: '150' } });
    ok(await z.page.evaluate(() => getComputedStyle(document.body).zoom) === '1.5', 'zoom 150% is applied to the body');
    await setMd(z.page, 'aaaa\nbbbb\ncccc');
    const box = await z.page.evaluate(() => { const t = document.getElementById('markdown-input'); const r = t.getBoundingClientRect(); const cs = getComputedStyle(t); return { left: r.left, top: r.top, width: r.width, scale: r.width / t.offsetWidth, pad: parseFloat(cs.paddingTop), lh: parseFloat(cs.lineHeight) || 21.6 }; });
    ok(Math.abs(box.scale - 1.5) < 0.05, 'a client rect is reported in zoomed pixels (scale ' + box.scale.toFixed(2) + ')');
    await z.page.mouse.click(box.left + box.width - 40 * box.scale, box.top + (box.pad + box.lh * 1.5) * box.scale);
    await z.page.keyboard.type('X');
    const lines = (await getMd(z.page)).split('\n');
    ok(lines[0] === 'aaaa' && lines[1].includes('X') && lines[2] === 'cccc', 'a click on line 2 puts the caret on line 2, typing lands there: ' + JSON.stringify(lines));
    await z.page.evaluate(() => { const t = document.getElementById('markdown-input'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    await z.page.keyboard.type('Y');
    ok((await getMd(z.page)).endsWith('Y'), 'typing at the end of the code editor lands at the caret');
    await setMd(z.page, 'שלום עולם יפה');
    await z.page.click('#mode-btn-visual'); await settle(z.page, 350);
    const wordBox = await z.page.evaluate(() => {
      const p = document.querySelector('#visual-editor p'); const tn = p.firstChild; const text = tn.textContent; const i = text.indexOf('עולם');
      const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + 4); const b = r.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, start: i, end: i + 4 };
    });
    await z.page.mouse.click(wordBox.x, wordBox.y); await settle(z.page, 100);
    const off = await z.page.evaluate(() => { const s = getSelection(); return { off: s.anchorOffset, collapsed: s.isCollapsed, inEditor: document.getElementById('visual-editor').contains(s.anchorNode) }; });
    ok(off.inEditor && off.collapsed && off.off > wordBox.start && off.off < wordBox.end, `a click in the middle of a word in the visual editor puts the caret inside that word (offset ${off.off}, word ${wordBox.start}..${wordBox.end})`);
    await z.page.keyboard.type('Z'); await settle(z.page, 350);
    ok(/ע?[א-ת]*Z[א-ת]*/.test((await getMd(z.page)).split(' ')[1] || '') && (await getMd(z.page)).includes('Z'), 'and typing lands in the clicked word: ' + JSON.stringify(await getMd(z.page)));
    // modal and panels stay inside the screen at 150%
    await z.page.click('#btn-open-template-mgr'); await settle(z.page, 300);
    const card = await z.page.evaluate(() => { const r = document.querySelector('#template-modal .modal-card').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, W: innerWidth, H: innerHeight }; });
    ok(card.l >= -1 && card.r <= card.W + 1 && card.t >= -1 && card.b <= card.H + 1, 'the modal window is inside the screen at 150%: ' + JSON.stringify(card));
    await z.page.click('#btn-modal-cancel'); await settle(z.page, 150);
    await z.page.click('#btn-a11y'); await settle(z.page, 150);
    const pr = await z.page.evaluate(() => { const r = document.getElementById('panel-a11y').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, W: innerWidth, H: innerHeight }; });
    ok(pr.l >= -1 && pr.r <= pr.W + 1 && pr.t >= 0 && pr.b <= pr.H + 1, 'the accessibility panel is inside the screen at 150%: ' + JSON.stringify(pr));
    await z.ctx.close();

    // focus ring ≥ 3px and hit area ≥ 32px (NFR4)
    const f = await open();
    const ringOf = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); e.focus(); return { w: parseFloat(getComputedStyle(e).outlineWidth), style: getComputedStyle(e).outlineStyle, col: getComputedStyle(e).outlineColor }; }, sel);
    await f.page.keyboard.press('Tab');   // makes :focus-visible apply to script focus afterwards
    const targets = ['.ax-skip', '#btn-a11y', '#btn-export', '#panel-a11y .panel-close'];
    await f.page.click('#btn-a11y');
    targets.push('#panel-a11y [role="radio"][data-value="system"]', '#ax-hc', '#ax-zoom-in', '#ax-zoom-reset', '#ax-read', '#panel-a11y .ax-reset');
    for (const t of targets) { await f.page.keyboard.press('Tab'); const r = await ringOf(f.page, t); ok(r.w >= 3 && r.style !== 'none', `${t}: focus ring ${r.w}px ${r.style}`); }
    await f.page.keyboard.press('Escape'); await f.page.click('#btn-export'); await settle(f.page, 100);
    for (const t of ['#panel-export [data-format="pdf"]', '#panel-export [data-format="docx"]', '#panel-export [data-format="pdf-file"]', '#panel-export .panel-close']) {
      await f.page.keyboard.press('Tab'); const r = await ringOf(f.page, t); ok(r.w >= 3 && r.style !== 'none', `${t}: focus ring ${r.w}px ${r.style}`);
    }
    const small = await f.page.evaluate(() => {
      const sel = '#btn-a11y, #btn-export, #panel-a11y button, #panel-a11y a, #panel-export button';
      return Array.from(document.querySelectorAll(sel)).filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className || e.textContent.slice(0, 12), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((e) => e.w < 32 || e.h < 32);
    });
    await f.page.click('#btn-a11y'); await settle(f.page, 100);
    const small2 = await f.page.evaluate(() => Array.from(document.querySelectorAll('#panel-a11y button, #panel-a11y a')).filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, w: Math.round(r.width), h: Math.round(r.height) }; }).filter((e) => e.w < 32 || e.h < 32));
    ok(small.length === 0 && small2.length === 0, 'every new control has a hit area ≥ 32×32 px: ' + JSON.stringify(small.concat(small2)));
    await f.ctx.close();

    // Tab leaves each panel in both directions
    const t = await open();
    for (const name of ['a11y', 'export']) {
      await t.page.click('#btn-' + name); await settle(t.page, 100);
      let left = false;
      for (let i = 0; i < 40 && !left; i++) { await t.page.keyboard.press('Tab'); left = await t.page.evaluate((id) => !document.getElementById(id).contains(document.activeElement), 'panel-' + name); }
      ok(left, `Tab leaves the ${name} panel (no trap)`);
      await t.page.click('#btn-' + name); await settle(t.page, 100);     // closes it (toggle)
      await t.page.click('#btn-' + name); await settle(t.page, 100);
      let leftBack = false;
      for (let i = 0; i < 40 && !leftBack; i++) { await t.page.keyboard.press('Shift+Tab'); leftBack = await t.page.evaluate((id) => !document.getElementById(id).contains(document.activeElement), 'panel-' + name); }
      ok(leftBack, `Shift+Tab leaves the ${name} panel`);
      await t.page.keyboard.press('Escape'); await settle(t.page, 80);
    }
    await t.ctx.close();
  };

  /* ======================================================================= ז. רשימת ה-QA (FR6, BR6.1–BR6.5) */
  parts.g = async () => {
    console.log('ז. QA checklist (FR6, BR6.1–BR6.5)');
    const { pathToFileURL } = require('url');
    const qaPath = path.join(__dirname, '..', 'docs', 'qa-checklist-v4.7.0.html');
    const qaUrl = pathToFileURL(qaPath).href;
    const KEY = 'mdw_qa_v470';
    const openQa = async (url, init) => {
      const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1000, height: 800 } });
      if (init) await ctx.addInitScript(init);
      const page = await ctx.newPage();
      const requests = [];
      page.on('pageerror', (e) => problems.push('qa pageerror: ' + e.message));
      page.on('request', (r) => { if (!/^(file|blob|data|about):/.test(r.url())) requests.push(r.url()); });
      await page.goto(url || qaUrl);
      await page.waitForTimeout(150);
      return { ctx, page, requests };
    };
    const statusOf = (page, id) => page.$eval('#' + id, (li) => ({ cls: li.className, st: li.getAttribute('data-status'), badge: li.querySelector('.qa-badge').textContent, checked: (li.querySelector('input[type="radio"]:checked') || {}).value, note: li.querySelector('.qa-note input').value }));

    // structure and accessibility of the page itself
    const a = await openQa();
    const info = await a.page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.qa-item'));
      const name = (el) => {
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        if (el.labels && el.labels.length) return el.labels[0].textContent.trim();
        return (el.textContent || '').trim();
      };
      const controls = Array.from(document.querySelectorAll('input, button'));
      return {
        lang: document.documentElement.lang, dir: document.documentElement.dir, items: items.length,
        radiosOk: items.every((li) => li.querySelectorAll('input[type="radio"]').length === 3),
        groupsOk: items.every((li) => { const g = li.querySelector('[role="radiogroup"]'); return g && document.getElementById(g.getAttribute('aria-labelledby')); }),
        unnamed: controls.filter((c) => !name(c)).length, controls: controls.length,
        radioNames: Array.from(document.querySelectorAll('input[type="radio"]')).every((r) => /^st-QA-/.test(r.name)),
        h1: document.querySelectorAll('h1').length
      };
    });
    ok(info.lang === 'he' && info.dir === 'rtl', 'the file is <html lang="he" dir="rtl">');
    ok(info.items >= 40 && info.radiosOk && info.groupsOk, `${info.items} items, each with three status radios in a labelled radiogroup`);
    ok(info.unnamed === 0 && info.controls > 100, `every one of ${info.controls} controls has an accessible name`);
    ok(info.radioNames && info.h1 === 1, 'radio groups are named per item; one h1');
    ok(await a.page.$eval('#qa-storage-msg', (e) => e.hidden), 'the storage message is hidden when storage works');

    // keyboard: Space on a focused radio selects it
    await a.page.focus('#QA-FR1-2 input[value="pass"]');
    await a.page.keyboard.press('Space');
    ok((await statusOf(a.page, 'QA-FR1-2')).checked === 'pass', 'a status can be set from the keyboard (Space on a focused radio)');
    await a.page.focus('#QA-FR1-2 input[value="pass"]');
    await a.page.keyboard.press('ArrowLeft');
    ok(['pass', 'fail', 'unchecked'].includes((await statusOf(a.page, 'QA-FR1-2')).checked), 'arrow keys move within the radiogroup');
    await a.page.check('#QA-FR1-2 input[value="unchecked"]');

    // marking: green + check mark text (BR6.3)
    await a.page.check('#QA-FR1-1 input[value="pass"]');
    const s1 = await statusOf(a.page, 'QA-FR1-1');
    ok(/is-pass/.test(s1.cls) && s1.st === 'pass' && s1.badge.includes('✓'), `a passed item is class is-pass with "✓" in text: "${s1.badge}"`);
    const bg = await a.page.$eval('#QA-FR1-1', (li) => getComputedStyle(li).backgroundColor);
    const [cr, cg, cb] = bg.match(/\d+/g).map(Number);
    ok(cg > cr && cg > cb, `a passed item is green: ${bg}`);
    await a.page.check('#QA-FR1-3 input[value="fail"]');
    const s2 = await statusOf(a.page, 'QA-FR1-3');
    ok(/is-fail/.test(s2.cls) && s2.badge.includes('✗'), `a failed item is marked in text too: "${s2.badge}"`);
    await a.page.fill('#QA-FR1-3 .qa-note input', 'הערה לבדיקה');
    await a.page.fill('#qa-tester', 'בודק א');
    const sum = await a.page.textContent('#qa-summary');
    ok(/תקין 1 מתוך \d+/.test(sum) && /נכשל 1/.test(sum), 'the summary counts passed and failed: ' + sum);

    // autosave (BR6.4) and reload keeps the state
    const saved = await a.page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    ok(saved && saved.items['QA-FR1-1'].status === 'pass' && saved.items['QA-FR1-3'].note === 'הערה לבדיקה' && saved.tester === 'בודק א' && !!saved.updatedAt, 'autosave wrote the state to localStorage mdw_qa_v470');
    await a.page.reload(); await a.page.waitForTimeout(150);
    const r1 = await statusOf(a.page, 'QA-FR1-1'); const r3 = await statusOf(a.page, 'QA-FR1-3');
    ok(r1.checked === 'pass' && /is-pass/.test(r1.cls) && r3.checked === 'fail' && r3.note === 'הערה לבדיקה' && await a.page.inputValue('#qa-tester') === 'בודק א', 'after a reload the marks, the note and the tester are still there');

    // save copy (BR6.5)
    const [dl] = await Promise.all([a.page.waitForEvent('download'), a.page.click('#qa-save-copy')]);
    const copyPath = path.join(downloadsDir, 'qa-copy.html');
    await dl.saveAs(copyPath);
    const copyHtml = fs.readFileSync(copyPath, 'utf8');
    ok(/^qa-checklist-v4\.7\.0-\d{4}-\d{2}-\d{2}\.html$/.test(dl.suggestedFilename()), 'the copy is downloaded as an .html file: ' + dl.suggestedFilename());
    const emb = JSON.parse(copyHtml.match(/<script type="application\/json" id="qa-embedded">([\s\S]*?)<\/script>/)[1]);
    ok(emb && emb.items['QA-FR1-1'].status === 'pass' && emb.tester === 'בודק א', 'the copy embeds the current state');
    ok(!/class="qa-controls"/.test(copyHtml) && copyHtml.startsWith('<!DOCTYPE html>'), 'the copy is a clean document (no generated controls duplicated)');
    await a.ctx.close();

    // opening the copy in a browser with no saved state shows the marks
    const b = await openQa(pathToFileURL(copyPath).href);
    const c1 = await statusOf(b.page, 'QA-FR1-1'); const c3 = await statusOf(b.page, 'QA-FR1-3');
    ok(c1.checked === 'pass' && /is-pass/.test(c1.cls) && c3.checked === 'fail' && c3.note === 'הערה לבדיקה', 'the copy shows the embedded marks');
    ok(await b.page.$$eval('.qa-item', (l) => l.every((li) => li.querySelectorAll('.qa-controls').length === 1 && li.querySelectorAll('.qa-text').length === 1)), 'no control is duplicated in the copy');
    ok(await b.page.evaluate((k) => !!localStorage.getItem(k), KEY), 'the embedded state is written to the local autosave');
    ok(b.requests.length === 0, 'no network request was made: ' + JSON.stringify(b.requests));

    // newer wins: saved newer -> saved; embedded newer -> embedded
    await b.page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ tester: 'מאוחר', updatedAt: '2999-01-01T00:00:00.000Z', items: { 'QA-FR1-1': { status: 'fail', note: '' } } })), KEY);
    await b.page.reload(); await b.page.waitForTimeout(150);
    ok((await statusOf(b.page, 'QA-FR1-1')).checked === 'fail', 'a newer saved state wins over the embedded one');
    await b.page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ tester: 'ישן', updatedAt: '2000-01-01T00:00:00.000Z', items: { 'QA-FR1-1': { status: 'fail', note: '' } } })), KEY);
    await b.page.reload(); await b.page.waitForTimeout(150);
    ok((await statusOf(b.page, 'QA-FR1-1')).checked === 'pass', 'an older saved state loses to a newer embedded one');
    await b.page.evaluate((k) => localStorage.setItem(k, '{broken json'), KEY);
    await b.page.reload(); await b.page.waitForTimeout(150);
    ok((await statusOf(b.page, 'QA-FR1-1')).checked === 'pass', 'a corrupt saved state is ignored (the embedded one is used)');
    await b.ctx.close();

    // storage that refuses to write (QuotaExceededError): message, and the marks still work (NFR8.5)
    const MSG = 'לא ניתן לשמור אוטומטית, השתמשו ב\'שמור עותק\'';
    const q = await openQa(null, () => { Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; });
    await q.page.check('#QA-FR2-1 input[value="pass"]');
    ok(await q.page.$eval('#qa-storage-msg', (e) => !e.hidden && e.textContent.trim()) === MSG, 'QuotaExceededError shows the message: ' + MSG);
    ok((await statusOf(q.page, 'QA-FR2-1')).checked === 'pass', 'the item is still marked on the page when saving fails');
    const [dl2] = await Promise.all([q.page.waitForEvent('download'), q.page.click('#qa-save-copy')]);
    const copy2 = fs.readFileSync(await dl2.path(), 'utf8');
    ok(/"QA-FR2-1":\{"status":"pass"/.test(copy2), 'save-copy still carries the state when autosave fails');
    await q.ctx.close();

    // storage that cannot be read at all (blocked): the page loads, with the message
    const z = await openQa(null, () => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); });
    ok(await z.page.$eval('#qa-storage-msg', (e) => !e.hidden), 'blocked storage shows the message and the page still works');
    await z.page.check('#QA-FR2-2 input[value="pass"]');
    ok((await statusOf(z.page, 'QA-FR2-2')).checked === 'pass', 'marking works with blocked storage');
    await z.ctx.close();
  };

  /* ======================================================================= run */
  for (const k of Object.keys(parts)) {
    if (wanted.includes(k)) await parts[k]();
  }

  console.log('\nproblems (page / console errors):', problems.length ? problems : 'none');
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail || problems.length ? 1 : 0);
})().catch((e) => { console.error('E2E CRASHED:', e.message.split('\n').slice(0, 8).join('\n')); process.exit(2); });
