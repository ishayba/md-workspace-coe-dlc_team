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
    'codeblock', 'mermaid', 'dir-rtl', 'dir-ltr', 'dir-none', 'undo', 'redo',
    // v4.6.0
    'strike', 'link', 'image', 'hr', 'task']) {
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

test('v4.6.0 toolbar commands are wired: every data-vcmd button has a COMMANDS entry', () => {
  const ui = read('md-visual-ui.js');
  const buttons = Array.from(index.matchAll(/data-vcmd="([a-z-]+)"/g)).map((m) => m[1]);
  const commands = ui.match(/const COMMANDS = \{[\s\S]*?\n    \};/)[0];
  for (const cmd of new Set(buttons)) assert.match(commands, new RegExp(`(^|[\\s,{])'?${cmd}'?:`), `no COMMANDS entry for ${cmd}`);
  assert.match(commands, /strike:[^\n]*strikeThrough/);
});

test('v4.6.0 link and image commands validate the address with the shared rule before inserting it', () => {
  const ui = read('md-visual-ui.js');
  assert.match(ui, /prompt\(/);
  assert.match(ui, /V\.safeUrl\(/);
  const V = require('../md-visual');
  assert.equal(typeof V.safeUrl, 'function');
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:x', 'data:text/html,x', 'vbscript:x', '//evil.example']) assert.equal(V.safeUrl(bad), null, bad);
  for (const ok of ['https://x.y', 'http://x.y/a?b=c', 'mailto:a@b.co', 'docs/p.md', '#sec', 'icon.svg']) assert.equal(V.safeUrl(ok), ok, ok);
});

test('v4.6.0 Tab / Shift+Tab inside a list indent / outdent (they are no longer blocked), and <hr> is lifted out of a <p>', () => {
  const ui = read('md-visual-ui.js');
  assert.doesNotMatch(ui, /else if \(inList\) e\.preventDefault\(\);/);
  assert.match(ui, /exec\(e\.shiftKey \? 'outdent' : 'indent'\)/);
  assert.match(ui, /:scope > hr/);
});

test('v4.6.0 Tab still moves between table cells', () => {
  const ui = read('md-visual-ui.js');
  assert.match(ui, /if \(cell\) \{ e\.preventDefault\(\); moveCell\(cell, e\.shiftKey\);/);
});

test('Loop-back 1: Cmd/Ctrl+B and Cmd/Ctrl+I are handled by the editor itself (no shift/alt), via run()', () => {
  const ui = read('md-visual-ui.js');
  const kd = ui.match(/editor\.addEventListener\('keydown'[\s\S]*?\n      \}\);/)[0];
  assert.match(kd, /metaKey \|\| e\.ctrlKey/);
  assert.match(kd, /!e\.shiftKey && !e\.altKey/);
  assert.match(kd, /preventDefault\(\)[\s\S]*?run\(\(\) => exec\(/);
  assert.match(kd, /'bold'/);
  assert.match(kd, /'italic'/);
});

test('Loop-back 1: paste unwraps styled <span> elements the browser adds, keeping their text', () => {
  const ui = read('md-visual-ui.js');
  const paste = ui.match(/editor\.addEventListener\('paste'[\s\S]*?\n      \}\);/)[0];
  assert.match(paste, /unwrapPastedSpans\(\)/);
  assert.match(ui, /function unwrapPastedSpans\(\)[\s\S]*?span\[style\][\s\S]*?replaceWith/);
});

test('service worker precaches the visual editor files', () => {
  const sw = read('sw.js');
  assert.match(sw, /'\.\/md-visual\.js'/);
  assert.match(sw, /'\.\/md-visual-ui\.js'/);
});

/* ---------- Revision 1: accessibility of the v4.6.0 changes (cross-cutting guidelines, WCAG 2.1 AA / IS 5568) ---------- */

test('Revision 1: every new v4.6.0 toolbar button has a Hebrew aria-label without emoji', () => {
  for (const cmd of ['strike', 'link', 'image', 'hr', 'task']) {
    const tag = index.match(new RegExp(`<button[^>]*data-vcmd="${cmd}"[^>]*>`))[0];
    const label = tag.match(/aria-label="([^"]+)"/);
    assert.ok(label, `${cmd} has no aria-label`);
    assert.match(label[1], /[\u0590-\u05FF]/, `${cmd} label is not Hebrew: ${label[1]}`);
    assert.doesNotMatch(label[1], /[^\u0000-\u024F\u0590-\u05FF\s]/u, `${cmd} label contains a symbol or emoji: ${label[1]}`);
  }
});

test('Revision 1: the task checkbox built by the parser and by the editor carries a Hebrew state aria-label', () => {
  const task = index.match(/return `<li class="task-list-item"><input type="checkbox"[^`]*`/)[0];
  assert.match(task, /aria-label=/);
  assert.match(index, /משימה פתוחה/);
  assert.match(index, /משימה שהושלמה/);
  const ui = read('md-visual-ui.js');
  assert.match(ui, /משימה פתוחה/);
  assert.match(ui, /משימה שהושלמה/);
  assert.match(ui, /setAttribute\('aria-label'/);
});

test('Revision 1: Escape inside the editor releases focus to the next focusable control (no keyboard trap, WCAG 2.1.2)', () => {
  const ui = read('md-visual-ui.js');
  const kd = ui.match(/editor\.addEventListener\('keydown'[\s\S]*?\n      \}\);/)[0];
  assert.match(kd, /e\.key === 'Escape'/);
  assert.match(kd, /releaseFocus\(\)/);
  // the island editor keeps its own Escape: the early return for it comes first
  assert.ok(kd.indexOf(".island-editor") < kd.indexOf("'Escape'"));
  const fn = ui.match(/function releaseFocus\(\)[\s\S]*?\n    \}/)[0];
  assert.match(fn, /compareDocumentPosition/);
  assert.match(fn, /\.focus\(\)/);
  assert.match(fn, /blur\(\)/);
});
