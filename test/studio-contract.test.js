const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('studio scripts are loaded before the main script, in dependency order', () => {
  const core = index.indexOf('<script src="./css-studio.js"></script>');
  const ui = index.indexOf('<script src="./css-studio-ui.js"></script>');
  const main = index.indexOf("const APP_VERSION =");
  assert.ok(core > 0 && ui > core && main > ui);
});

test('the template manager exposes the studio mount point, tabs and library controls', () => {
  for (const id of ['studio-mount', 'studio-tab-visual', 'studio-tab-code', 'studio-pane-visual', 'studio-pane-code',
    'btn-theme-export', 'btn-theme-import', 'btn-theme-lib-save', 'theme-lib-select', 'btn-theme-lib-load', 'theme-import-input',
    'modal-template-css']) {
    assert.match(index, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test('all CSS that reaches a <style> element goes through sanitizeCss', () => {
  // live <style>, saved templates and the three exports
  assert.match(index, /CssStudio\.sanitizeCss\(css\)\.css/);
  assert.equal((index.match(/CssStudio\.sanitizeCss\(currentTmpl\.css \|\| ''\)\.css/g) || []).length, 3);
  assert.match(index, /CssStudio\.sanitizeCss\(modalTemplateCss\.value\.trim\(\)\)/);
});

test('the studio never loads anything from the network', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'css-studio-ui.js'), 'utf8');
  const urls = [...ui.matchAll(/fetch\(\s*['"`]([^'"`]+)/g)].map((m) => m[1]);
  assert.ok(urls.length > 0);
  for (const u of urls) assert.match(u, /^\/api\/themes/, `unexpected fetch target: ${u}`);
  assert.doesNotMatch(ui, /https?:\/\//);
});
