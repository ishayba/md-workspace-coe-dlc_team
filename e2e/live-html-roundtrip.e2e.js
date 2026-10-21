// Real-browser check: live HTML export -> edit mode -> export MD must keep <div dir> wrappers.
// Optional (not part of `npm test`): needs Playwright + Chromium — see e2e/css-studio.e2e.js.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed — see e2e/css-studio.e2e.js'); process.exit(2); }
const path = require('path'); const fs = require('fs'); const os = require('os');
const { createServer } = require('../server');

(async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(base + '/');
  const md = '# כותרת\n\nפסקה עברית\n\n<div dir="ltr">\nEnglish paragraph\n\n## Sub\n</div>\n\nסוף';
  await page.fill('#markdown-input', md);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-interactive-html')]);
  const file = path.join(os.tmpdir(), 'live.html'); await dl.saveAs(file);
  const live = await ctx.newPage();
  live.on('pageerror', e => errors.push('live pageerror: ' + e.message));
  await live.goto('file://' + file);
  await live.click('#mdw-btn-mode').catch(async () => { console.log('mode button id differs'); });
  const [dl2] = await Promise.all([live.waitForEvent('download'), live.click('#mdw-export-md')]);
  const out = fs.readFileSync(await dl2.path(), 'utf8');
  console.log('--- exported md ---\n' + out + '\n-------------------');
  console.log('has ltr wrapper:', /<div dir="ltr">/.test(out), '| has English text:', out.includes('English paragraph'), '| has Sub heading:', /## Sub/.test(out));
  console.log('errors:', errors.length ? errors : 'none');
  const good = /<div dir="ltr">/.test(out) && out.includes('English paragraph') && /## Sub/.test(out) && !errors.length;
  await browser.close(); server.close();
  if (!good) { console.error('ROUNDTRIP FAILED'); process.exit(1); }
  console.log('ROUNDTRIP OK');
})().catch(e => { console.error('E2E FAILED', e.message); process.exit(1); });
