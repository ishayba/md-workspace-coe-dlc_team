// Static guards for the v4.7.0 code (Step 35): no code path that could leak or execute content,
// no hard-coded colours or un-gated motion in the new CSS, and the shape of the header in index.html.
// Pure text checks, no DOM: runs under `node --test`.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NEW_FILES = ['a11y.js', 'a11y-ui.js', 'export-core.js', 'export-ui.js'];
const index = read('index.html');

// the source with comments removed (line numbers kept), so that a word in a comment is not a finding
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n')
    .map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, (all, pre) => (/innerHTML-allowed:/.test(all) ? all : pre))).join('\n');
}

test('NFR9.5: innerHTML appears only on lines marked "// innerHTML-allowed: <reason>"', () => {
  NEW_FILES.forEach((f) => {
    read(f).split('\n').forEach((line, i) => {
      if (/\/\/ innerHTML-allowed:/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML/.test(line)) {
        assert.fail(`${f}:${i + 1} uses innerHTML without an "innerHTML-allowed" mark: ${line.trim()}`);
      }
    });
  });
});

test('NFR9.5: every "innerHTML-allowed" mark states a reason', () => {
  NEW_FILES.forEach((f) => {
    read(f).split('\n').forEach((line, i) => {
      const m = /innerHTML-allowed:(.*)$/.exec(line);
      if (m) assert.ok(m[1].trim().length >= 8, `${f}:${i + 1} needs a reason`);
    });
  });
});

test('NFR9.7: no eval, new Function, network API or beacon in the new files', () => {
  const banned = [/\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bsendBeacon\b/, /\bWebSocket\b/, /\bimportScripts\b/];
  NEW_FILES.forEach((f) => {
    const src = code(read(f));
    banned.forEach((re) => assert.ok(!re.test(src), `${f} contains ${re}`));
  });
});

test('NFR9.7: no console call in the new files can print the document text (mdInput.value)', () => {
  NEW_FILES.forEach((f) => {
    const src = code(read(f));
    assert.ok(!/console\.\w+\([^;]*mdInput/.test(src), `${f} logs mdInput`);
    assert.ok(!/console\.\w+\([^;]*\.value\b/.test(src), `${f} logs a .value`);
  });
});

test('NFR6.1 / BR7.5: the new JS files contain no hex colour', () => {
  NEW_FILES.forEach((f) => {
    const found = code(read(f)).match(/(?<![\w&])#[0-9a-fA-F]{3,8}\b/g);
    assert.ok(!found, `${f}: ${found}`);
  });
});

function v47Css() {
  const m = /\/\* v4\.7 begin \*\/([\s\S]*?)\/\* v4\.7 end \*\//.exec(index);
  assert.ok(m, 'the new CSS is wrapped in /* v4.7 begin */ … /* v4.7 end */');
  return m[1];
}

test('NFR6.1 / BR7.5: the new CSS rules (between the v4.7 markers) hold no hex colour', () => {
  const css = v47Css().replace(/\/\*[\s\S]*?\*\//g, '');
  const found = css.match(/#[0-9a-fA-F]{3,8}\b/g);
  assert.ok(!found, String(found));
  assert.ok(css.length > 1500, 'the section is not empty');
});

// returns the text of the block that starts at the "{" found at index `open`
function blockAt(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open, i + 1);
  }
  return css.slice(open);
}

test('NFR5.1 / BR7.4: every animation and transition in the new CSS sits inside prefers-reduced-motion: no-preference', () => {
  const css = v47Css().replace(/\/\*[\s\S]*?\*\//g, '');
  let gated = '';
  const re = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g;
  let m;
  while ((m = re.exec(css))) gated += blockAt(css, m.index + m[0].length - 1);
  const outside = css.split(gated).join('');
  assert.ok(!/\banimation(-name)?\s*:/.test(outside), 'animation outside the media query');
  assert.ok(!/\btransition(-property)?\s*:/.test(outside), 'transition outside the media query');
  assert.ok(/\banimation\s*:|\btransition\s*:/.test(gated), 'the busy icon / panel do animate, inside the query');
});

test('FR3.1 / FR2.1: the toolbar has btn-a11y and btn-export, and none of the removed controls is left', () => {
  assert.match(index, /id="btn-a11y"/);
  assert.match(index, /id="btn-export"/);
  assert.ok(!/btn-export-/.test(index), 'btn-export-* removed (markup and handlers)');
  assert.ok(!/btn-print-doc/.test(index), 'btn-print-doc removed');
  assert.ok(!/btn-theme-toggle/.test(index), 'btn-theme-toggle removed');
  assert.ok(/id="btn-save-md"/.test(index), '"שמור MD" stays');
});

test('FR1.1: the a11y icon comes before the export icon, both after a separator', () => {
  const sep = index.indexOf('hdr-sep');
  const a = index.indexOf('id="btn-a11y"');
  const e = index.indexOf('id="btn-export"');
  assert.ok(sep > 0 && a > sep && e > a);
  ['btn-a11y', 'btn-export'].forEach((id) => {
    const tag = new RegExp(`<button[^>]*id="${id}"[^>]*>`).exec(index)[0];
    assert.match(tag, /aria-haspopup="dialog"/);
    assert.match(tag, /aria-expanded="false"/);
    assert.match(tag, /aria-controls="panel-/);
    assert.match(tag, /aria-label="[^"]+"/);
  });
});

test('FR2.1: <html lang="he" dir="rtl"> and data-theme moved from <body>', () => {
  assert.match(index, /<html lang="he" dir="rtl"/);
  assert.ok(!/<body[^>]*data-theme/.test(index), 'no data-theme on <body>');
});

test('WF2: an early script in <head> applies the saved preferences before the first paint', () => {
  const head = /<head>([\s\S]*?)<\/head>/.exec(index)[1];
  assert.match(head, /<script id="mdw-early-prefs">/);
  assert.match(head, /mdw_theme/);
  assert.match(head, /mdw_a11y_hc/);
  assert.match(head, /mdw_a11y_zoom/);
});

test('BR7.11: body zoom comes from --ax-zoom', () => {
  assert.match(v47Css(), /body\s*\{[^}]*zoom:\s*var\(--ax-zoom/);
});

test('BR7.9 / NFR8.1: the four new scripts load in order after md-visual-ui.js and before the main script', () => {
  const order = ['md-visual-ui.js', 'a11y.js', 'a11y-ui.js', 'export-core.js', 'export-ui.js'].map((f) => index.indexOf(`<script src="./${f}"></script>`));
  assert.ok(order.every((p, i) => p > 0 && (i === 0 || p > order[i - 1])), JSON.stringify(order));
  assert.ok(index.indexOf('const APP_VERSION =') > order[4]);
});

test('NFR4 / FR1: every new control has a data-testid (static markup and the two UI modules)', () => {
  ['btn-a11y', 'btn-export'].forEach((id) => assert.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`).exec(index)[0], /data-testid="/));
  ['a11y-ui.js', 'export-ui.js'].forEach((f) => {
    const src = read(f);
    assert.match(src, /\bconst STR\s*=/, `${f} keeps its Hebrew strings in STR`);
    // every h('button' | 'a' | 'input' | 'select', {...}) call carries a testid in its attribute object
    const re = /\bh\('(button|a|input|select)',\s*\{/g;
    let m; let n = 0;
    while ((m = re.exec(src))) {
      n++;
      const open = m.index + m[0].length - 1;
      const obj = blockAt(src, open);
      assert.match(obj, /\btestid:/, `${f}: a ${m[1]} created at offset ${m.index} has no testid`);
    }
    assert.ok(n >= (f === 'a11y-ui.js' ? 8 : 2), `${f}: found only ${n} controls`);
  });
});
