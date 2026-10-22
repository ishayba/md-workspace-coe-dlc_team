const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const index = read('index.html');

test('visual-editor scripts load before the main script, in dependency order', () => {
  const pos = ['css-studio-ui.js', 'md-visual.js', 'md-visual-ui.js'].map((f) => index.indexOf(`<script src="./${f}"></script>`));
  const main = index.indexOf('const APP_VERSION =');
  assert.ok(pos[0] > 0 && pos[1] > pos[0] && pos[2] > pos[1] && main > pos[2], JSON.stringify(pos));
});

test('the editor offers a code/visual mode switch, a visual toolbar, the editing surface and the preview/code switch', () => {
  for (const id of ['mode-btn-code', 'mode-btn-visual', 'visual-toolbar', 'visual-scroll', 'visual-editor', 'visual-block-select',
    'preview-switch', 'pv-btn-rendered', 'pv-btn-code', 'md-code-view', 'markdown-input']) {
    assert.match(index, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  for (const cmd of ['bold', 'italic', 'code', 'ul', 'ol', 'quote', 'table', 'row-add', 'row-del', 'col-add', 'col-del',
    'codeblock', 'mermaid', 'dir-rtl', 'dir-ltr', 'dir-none', 'undo', 'redo']) {
    assert.match(index, new RegExp(`data-vcmd="${cmd}"`), `missing toolbar command ${cmd}`);
  }
});

test('the app still opens in code mode, with the existing code toolbar and textarea', () => {
  assert.match(index, /<main class="workspace-main" id="workspace-main" data-layout="split" data-editor-mode="code">/);
  assert.match(index, /<div class="preview-pane" id="preview-container" data-preview-mode="rendered">/);
});

test('visual toolbar buttons never use the code-mode class (its handler would insert markdown)', () => {
  const bar = index.match(/<div class="editor-toolbar visual-toolbar"[\s\S]*?<\/div>\s*<div class="visual-scroll"/)[0];
  assert.doesNotMatch(bar, /toolbar-tool/);
});

test('mode and preview state are driven by CSS attributes', () => {
  assert.match(index, /\.workspace-main\[data-editor-mode="visual"\]/);
  assert.match(index, /\.preview-pane\[data-preview-mode="code"\]/);
});

test('updatePreview tells the visual editor, and init restores the saved mode after the first render', () => {
  const up = index.match(/function updatePreview\(\) \{[\s\S]*?\n    \}/)[0];
  assert.match(up, /visualEditor\.onMarkdownChanged\(\)/);
  assert.match(index, /updatePreview\(\);\s*\n\s*visualEditor\.init\(\);/);
});

test('the visual editor UI stays offline and only ever pastes plain text', () => {
  const ui = read('md-visual-ui.js');
  assert.doesNotMatch(ui, /fetch\(|XMLHttpRequest|https?:\/\//);
  assert.match(ui, /addEventListener\('paste'[\s\S]*?preventDefault\(\)[\s\S]*?plainTextToHtml/);
  assert.match(ui, /addEventListener\('drop'[\s\S]*?preventDefault\(\)/);
});

test('service worker precaches the visual editor files', () => {
  const sw = read('sw.js');
  assert.match(sw, /'\.\/md-visual\.js'/);
  assert.match(sw, /'\.\/md-visual-ui\.js'/);
});
