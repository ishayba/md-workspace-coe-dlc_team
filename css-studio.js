/* css-studio.js — MD Workspace (v4.4.0)
 * Pure logic of the visual CSS editor ("CSS Studio"): the catalog of styleable
 * elements/properties, CSS <-> model conversion, sanitising and theme-file helpers.
 * No DOM access here, so it runs under `node --test` and in the browser alike.
 * (The DOM part lives in css-studio-ui.js.)
 *
 * Design rules:
 *  - Nothing is ever lost: CSS the studio does not understand (other selectors,
 *    @-rules, comments, unknown declarations) is kept verbatim and written back.
 *  - Every rule is scoped to ".template-<id>"; dark-mode overrides are written as
 *    '[data-theme="dark"] .template-<id> ...'.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CssStudio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ catalog */

  // selector = relative to the template root. aliases = other spellings accepted on import.
  // probe = regex source that must match the rendered sample document (enforced by tests).
  const ELEMENTS = [
    { key: 'root', label: 'המסמך כולו (רקע וגופן כלליים)', group: 'general', selector: '' },
    { key: 'h1', label: 'כותרת ראשית (H1)', group: 'headings', selector: 'h1', probe: '<h1>' },
    { key: 'h2', label: 'כותרת רמה 2 (H2)', group: 'headings', selector: 'h2', probe: '<h2>' },
    { key: 'h3', label: 'כותרת רמה 3 (H3)', group: 'headings', selector: 'h3', probe: '<h3>' },
    { key: 'h4', label: 'כותרת רמה 4 (H4)', group: 'headings', selector: 'h4', probe: '<h4>' },
    { key: 'h5', label: 'כותרת רמה 5 (H5)', group: 'headings', selector: 'h5', probe: '<h5>' },
    { key: 'h6', label: 'כותרת רמה 6 (H6)', group: 'headings', selector: 'h6', probe: '<h6>' },
    { key: 'p', label: 'פסקה', group: 'text', selector: 'p', probe: '<p>' },
    { key: 'strong', label: 'טקסט מודגש', group: 'text', selector: 'strong', probe: '<strong>' },
    { key: 'em', label: 'טקסט נטוי', group: 'text', selector: 'em', probe: '<em>' },
    { key: 'code', label: 'קוד בתוך שורה', group: 'code', selector: ':not(pre) > code', probe: '<code>' },
    { key: 'pre', label: 'בלוק קוד (המסגרת)', group: 'code', selector: 'pre', probe: '<pre>' },
    { key: 'pre-code', label: 'הטקסט בתוך בלוק קוד', group: 'code', selector: 'pre code', probe: '<pre><code' },
    { key: 'blockquote', label: 'ציטוט', group: 'blocks', selector: 'blockquote', probe: '<blockquote>' },
    { key: 'ul', label: 'רשימת תבליטים', group: 'lists', selector: 'ul', probe: '<ul>' },
    { key: 'ol', label: 'רשימה ממוספרת', group: 'lists', selector: 'ol', probe: '<ol>' },
    { key: 'li', label: 'פריט ברשימה', group: 'lists', selector: 'li', probe: '<li>' },
    { key: 'table', label: 'טבלה (מסגרת כללית)', group: 'tables', selector: 'table', probe: '<table>' },
    { key: 'th', label: 'כותרת עמודה בטבלה', group: 'tables', selector: 'th',
      aliases: ['table th', 'thead th', 'table thead th'], probe: '<th>' },
    { key: 'td', label: 'תא בטבלה', group: 'tables', selector: 'td',
      aliases: ['table td', 'tbody td', 'table tbody td'], probe: '<td>' },
    { key: 'zebra', label: 'שורות זוגיות בטבלה (פסים)', group: 'tables', selector: 'tr:nth-child(even) td',
      aliases: ['table tr:nth-child(even) td', 'tbody tr:nth-child(even) td'],
      probe: '<tr>[\\s\\S]*<tr>[\\s\\S]*<tr>', noClick: true },
    { key: 'mermaid', label: 'תרשים (המסגרת)', group: 'diagrams', selector: '.mermaid-diagram-container',
      probe: 'mermaid-diagram-container' },
    { key: 'mermaid-title', label: 'כיתוב מתחת לתרשים', group: 'diagrams', selector: '.mermaid-diagram-title',
      probe: 'mermaid-diagram-title' },
    { key: 'dir-rtl', label: 'אזור ימין-לשמאל (div dir=rtl)', group: 'direction', selector: 'div[dir="rtl"]',
      probe: '<div dir="rtl">' },
    { key: 'dir-ltr', label: 'אזור שמאל-לימין (div dir=ltr)', group: 'direction', selector: 'div[dir="ltr"]',
      probe: '<div dir="ltr">' },
    { key: 'footer', label: 'קרדיט תחתון', group: 'general', selector: '.mdw-attribution-footer',
      probe: 'mdw-attribution-footer' }
  ];

  const GROUP_LABELS = {
    general: 'כללי', headings: 'כותרות', text: 'טקסט', code: 'קוד', blocks: 'ציטוט',
    lists: 'רשימות', tables: 'טבלאות', diagrams: 'תרשימים', direction: 'כיווניות'
  };

  const FONT_OPTIONS = [
    ['', 'ברירת מחדל'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ["'Segoe UI', Tahoma, sans-serif", 'Segoe UI'],
    ['Tahoma, Geneva, sans-serif', 'Tahoma'],
    ["David, 'Times New Roman', serif", 'דוד (David)'],
    ["Georgia, 'Times New Roman', serif", 'Georgia'],
    ["'Times New Roman', Times, serif", 'Times New Roman'],
    ["ui-monospace, Consolas, 'Courier New', monospace", 'מונוספייס (קוד)']
  ];

  const PROPERTIES = [
    { key: 'color', label: 'צבע טקסט', type: 'color', group: 'text' },
    { key: 'font-family', label: 'גופן', type: 'select', group: 'text', options: FONT_OPTIONS },
    { key: 'font-size', label: 'גודל גופן', type: 'length', group: 'text', units: ['px', 'em', 'rem'], min: 8, max: 96 },
    { key: 'font-weight', label: 'עובי גופן', type: 'select', group: 'text',
      options: [['', 'ברירת מחדל'], ['normal', 'רגיל'], ['500', 'בינוני'], ['600', 'חצי-עבה'], ['bold', 'עבה'], ['800', 'עבה מאוד']] },
    { key: 'font-style', label: 'נטוי', type: 'select', group: 'text',
      options: [['', 'ברירת מחדל'], ['normal', 'רגיל'], ['italic', 'נטוי']] },
    { key: 'line-height', label: 'ריווח בין שורות', type: 'number', group: 'text', min: 1, max: 3, step: 0.05 },
    { key: 'text-align', label: 'יישור טקסט', type: 'select', group: 'text',
      options: [['', 'ברירת מחדל'], ['right', 'לימין'], ['left', 'לשמאל'], ['center', 'למרכז'], ['justify', 'מיושר']] },
    { key: 'direction', label: 'כיוון כתיבה', type: 'select', group: 'text',
      options: [['', 'ברירת מחדל'], ['rtl', 'מימין לשמאל'], ['ltr', 'משמאל לימין']] },
    { key: 'background-color', label: 'צבע רקע', type: 'color', group: 'box' },
    { key: 'border', label: 'מסגרת מלאה', type: 'border', group: 'border' },
    { key: 'border-top', label: 'קו עליון', type: 'border', group: 'border' },
    { key: 'border-right', label: 'קו ימני', type: 'border', group: 'border' },
    { key: 'border-bottom', label: 'קו תחתון', type: 'border', group: 'border' },
    { key: 'border-left', label: 'קו שמאלי', type: 'border', group: 'border' },
    { key: 'border-radius', label: 'עיגול פינות', type: 'length', group: 'border', units: ['px'], min: 0, max: 60 },
    { key: 'margin-top', label: 'רווח מעל', type: 'length', group: 'space', units: ['px', 'em'], min: 0, max: 120 },
    { key: 'margin-bottom', label: 'רווח מתחת', type: 'length', group: 'space', units: ['px', 'em'], min: 0, max: 120 },
    { key: 'padding', label: 'ריפוד פנימי', type: 'length', group: 'space', units: ['px', 'em'], min: 0, max: 120 },
    { key: 'max-width', label: 'רוחב מקסימלי', type: 'length', group: 'space', units: ['px'], min: 320, max: 1600, only: ['root'] }
  ];

  const PROPERTY_GROUP_LABELS = { text: 'טקסט', box: 'רקע', border: 'מסגרת וקווים', space: 'רווחים' };

  const ELEMENT_BY_KEY = {};
  ELEMENTS.forEach((e) => { ELEMENT_BY_KEY[e.key] = e; });
  const PROP_BY_KEY = {};
  PROPERTIES.forEach((p) => { PROP_BY_KEY[p.key] = p; });

  /* -------------------------------------------------------------- tiny helpers */

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Split on a separator that is not inside quotes / () / [].
  function splitTopLevel(str, sep) {
    const out = [];
    let cur = '';
    let depth = 0;
    let quote = null;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (quote) {
        cur += c;
        if (c === '\\') cur += str[++i] || '';
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; cur += c; continue; }
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
      if (c === sep && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }

  function normSel(s) {
    return String(s)
      .replace(/\s+/g, ' ')
      .replace(/\s*>\s*/g, ' > ')
      .replace(/\[\s*([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*\]/gi,
        (m, a, b, c, d) => `[${a.toLowerCase()}="${String(b !== undefined ? b : (c !== undefined ? c : d)).toLowerCase()}"]`)
      .trim()
      .toLowerCase();
  }

  function buildSelector(id, el, dark) {
    return (dark ? '[data-theme="dark"] ' : '') + '.template-' + id + (el.selector ? ' ' + el.selector : '');
  }

  function isSafeValue(v) {
    return typeof v === 'string' && v.length < 400 && /^[^;{}<>\n\r]*$/.test(v) && !/\/\*|\*\//.test(v);
  }

  /* ------------------------------------------------------------- value helpers */

  function splitImportant(v) {
    const m = String(v).match(/^(.*?)\s*!important\s*$/i);
    return m ? { value: m[1], important: true } : { value: String(v), important: false };
  }

  function parseLength(v) {
    const m = String(v).trim().match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|pt)$/i);
    return m ? { num: Number(m[1]), unit: m[2].toLowerCase() } : null;
  }

  function parseBorder(v) {
    const s = String(v).trim();
    if (/^none$/i.test(s)) return { width: '', style: 'none', color: '' };
    const m = s.match(/^(?:(\d*\.?\d+(?:px|em|rem)|thin|medium|thick)\s+)?(solid|dashed|dotted|double|groove|ridge|inset|outset|hidden)(?:\s+(.+))?$/i);
    if (!m) return null;
    return { width: m[1] || '', style: m[2].toLowerCase(), color: (m[3] || '').trim() };
  }

  function formatBorder(b) {
    if (!b || !b.style || b.style === 'none') return 'none';
    return [b.width, b.style, b.color].filter(Boolean).join(' ');
  }

  function rgbToHex(v) {
    const m = String(v).trim().match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
    if (!m) return null;
    if (m[4] !== undefined && Number(m[4]) === 0) return null; // fully transparent
    const hex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return '#' + hex(m[1]) + hex(m[2]) + hex(m[3]);
  }

  function slugifyId(str) {
    let s = String(str == null ? '' : str).toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 48);
    if (!s) s = 'theme-' + Date.now().toString(36).slice(-5);
    return s;
  }

  /* ----------------------------------------------------------- CSS tokenising */

  function tokenize(text) {
    const items = [];
    const n = text.length;
    let i = 0;
    while (i < n) {
      const c = text[i];
      if (/\s/.test(c)) { i++; continue; }
      if (text.startsWith('/*', i)) {
        const end = text.indexOf('*/', i + 2);
        const stop = end < 0 ? n : end + 2;
        items.push({ type: 'comment', raw: text.slice(i, stop) });
        i = stop;
        continue;
      }
      // prelude: up to "{" (rule / at-block) or ";" (at-statement)
      let j = i;
      let quote = null;
      let paren = 0;
      let kind = null;
      while (j < n) {
        const d = text[j];
        if (quote) { if (d === '\\') j++; else if (d === quote) quote = null; j++; continue; }
        if (d === '"' || d === "'") { quote = d; j++; continue; }
        if (d === '/' && text[j + 1] === '*') { const e = text.indexOf('*/', j + 2); j = e < 0 ? n : e + 2; continue; }
        if (d === '(') paren++;
        else if (d === ')') paren = Math.max(0, paren - 1);
        else if (paren === 0 && d === '{') { kind = 'block'; break; }
        else if (paren === 0 && d === ';' && text[i] === '@') { kind = 'stmt'; break; }
        j++;
      }
      if (kind === null) { items.push({ type: 'raw', raw: text.slice(i).trim() }); break; }
      if (kind === 'stmt') { items.push({ type: 'at', raw: text.slice(i, j + 1).trim() }); i = j + 1; continue; }
      const prelude = text.slice(i, j).trim();
      let depth = 0;
      let k = j;
      quote = null;
      for (; k < n; k++) {
        const d = text[k];
        if (quote) { if (d === '\\') k++; else if (d === quote) quote = null; continue; }
        if (d === '"' || d === "'") { quote = d; continue; }
        if (d === '/' && text[k + 1] === '*') { const e = text.indexOf('*/', k + 2); k = e < 0 ? n : e + 1; continue; }
        if (d === '{') depth++;
        else if (d === '}') { depth--; if (depth === 0) break; }
      }
      if (depth !== 0) { items.push({ type: 'raw', raw: text.slice(i).trim() }); break; }
      const raw = text.slice(i, k + 1).trim();
      items.push(prelude.startsWith('@')
        ? { type: 'at', raw }
        : { type: 'rule', selector: prelude, body: text.slice(j + 1, k), raw });
      i = k + 1;
    }
    return items;
  }

  function parseDecls(body) {
    const clean = body.replace(/\/\*[\s\S]*?\*\//g, '');
    return splitTopLevel(clean, ';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const idx = d.indexOf(':');
      if (idx < 0) return null;
      return { prop: d.slice(0, idx).trim().toLowerCase(), value: d.slice(idx + 1).trim() };
    }).filter(Boolean);
  }

  /* -------------------------------------------------------------------- model */

  function emptyModel(id) {
    return { id, light: {}, dark: {}, extraDecls: { light: {}, dark: {} }, extras: [] };
  }

  function classify(selector, id) {
    let s = normSel(selector);
    let mode = 'light';
    const darkPrefix = '[data-theme="dark"] ';
    if (s.startsWith(darkPrefix)) { mode = 'dark'; s = s.slice(darkPrefix.length); }
    const base = '.template-' + String(id).toLowerCase();
    if (s === base) return { mode, key: 'root' };
    if (!s.startsWith(base + ' ')) return null;
    const rest = s.slice(base.length + 1);
    for (const e of ELEMENTS) {
      if (!e.selector) continue;
      const all = [e.selector].concat(e.aliases || []).map(normSel);
      if (all.includes(rest)) return { mode, key: e.key };
    }
    return null;
  }

  function modelFromCss(css, id) {
    const model = emptyModel(id);
    const items = tokenize(String(css || ''));
    items.forEach((item) => {
      if (item.type === 'comment') {
        if (/^\/\*\s*mdw-theme\b/.test(item.raw)) return; // regenerated on export
        model.extras.push(item.raw);
        return;
      }
      if (item.type !== 'rule') { model.extras.push(item.raw); return; }
      const targets = splitTopLevel(item.selector, ',').map((s) => classify(s, id));
      if (!targets.length || targets.some((t) => t === null)) { model.extras.push(item.raw); return; }
      const decls = parseDecls(item.body);
      targets.forEach((t) => {
        decls.forEach((d) => {
          if (PROP_BY_KEY[d.prop]) {
            if (!model[t.mode][t.key]) model[t.mode][t.key] = {};
            model[t.mode][t.key][d.prop] = d.value;
          } else {
            const list = model.extraDecls[t.mode][t.key] || (model.extraDecls[t.mode][t.key] = []);
            const line = d.prop + ': ' + d.value;
            if (!list.includes(line)) list.push(line);
          }
        });
      });
    });
    return model;
  }

  function cssFromModel(model) {
    const blocks = [];
    ['light', 'dark'].forEach((mode) => {
      ELEMENTS.forEach((e) => {
        const props = model[mode][e.key] || {};
        const extra = model.extraDecls[mode][e.key] || [];
        const lines = [];
        PROPERTIES.forEach((p) => {
          if (props[p.key] !== undefined && props[p.key] !== '') lines.push(`  ${p.key}: ${props[p.key]};`);
        });
        extra.forEach((x) => lines.push('  ' + x.replace(/;\s*$/, '') + ';'));
        if (lines.length) blocks.push(`${buildSelector(model.id, e, mode === 'dark')} {\n${lines.join('\n')}\n}`);
      });
    });
    model.extras.forEach((x) => blocks.push(x));
    return blocks.length ? blocks.join('\n\n') + '\n' : '';
  }

  function getProp(model, mode, elKey, prop) {
    const el = model[mode] && model[mode][elKey];
    return el && el[prop] !== undefined ? el[prop] : undefined;
  }

  function clearProp(model, mode, elKey, prop) {
    const el = model[mode] && model[mode][elKey];
    if (!el) return;
    delete el[prop];
    if (!Object.keys(el).length) delete model[mode][elKey];
  }

  function setProp(model, mode, elKey, prop, value) {
    if ((mode !== 'light' && mode !== 'dark') || !ELEMENT_BY_KEY[elKey] || !PROP_BY_KEY[prop]) return false;
    const v = String(value == null ? '' : value).trim();
    if (v === '') { clearProp(model, mode, elKey, prop); return true; }
    if (!isSafeValue(v)) return false;
    if (!model[mode][elKey]) model[mode][elKey] = {};
    model[mode][elKey][prop] = v;
    return true;
  }

  /* ------------------------------------------------- scoping, files, sanitising */

  function rescope(css, oldId, newId) {
    if (!oldId || oldId === newId) return css;
    return String(css).replace(new RegExp('\\.template-' + escapeRe(oldId) + '(?![A-Za-z0-9_-])', 'gi'), '.template-' + newId);
  }

  const MAX_CSS_CHARS = 200 * 1024;

  // Conservative clean-up for CSS that comes from outside (imported file / library) or
  // is about to be embedded in exported HTML. Never throws; reports what it changed.
  function sanitizeCss(input) {
    const text = String(input == null ? '' : input);
    if (text.length > MAX_CSS_CHARS) return { css: '', warnings: ['too-large'], ok: false };
    const warnings = [];
    let css = text;
    css = css.replace(/@import\b[^;{}]*;?/gi, () => { warnings.push('import-removed'); return ''; });
    css = css.replace(/url\(\s*(['"]?)\s*(?:https?:|ftp:|javascript:|\/\/)[^)]*\)/gi,
      () => { warnings.push('external-url-removed'); return 'url("about:blank")'; });
    css = css.replace(/\bexpression\s*\(/gi, () => { warnings.push('legacy-script-removed'); return 'invalid('; });
    css = css.replace(/(-moz-binding|behavior)\s*:/gi, (m, p) => { warnings.push('legacy-script-removed'); return 'invalid-' + p.replace(/^-/, '') + ':'; });
    css = css.replace(/<\//g, () => { warnings.push('tag-sequence-escaped'); return '<\\/'; });
    css = css.replace(/<!--/g, () => { warnings.push('tag-sequence-escaped'); return '<\\!--'; });
    return { css, warnings, ok: true };
  }

  function cleanHeaderField(s) {
    return String(s == null ? '' : s).replace(/\*\//g, '').replace(/[\r\n|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  const HEADER_RE = /^\s*\/\*\s*mdw-theme\s+v1\s*\|\s*id:\s*([a-z0-9_-]+)\s*\|\s*name:\s*([\s\S]*?)\s*\*\/\s*/;

  function makeThemeFile(id, name, css) {
    const body = String(css || '').replace(HEADER_RE, '').replace(/^\s+/, '');
    return `/* mdw-theme v1 | id: ${slugifyId(id)} | name: ${cleanHeaderField(name)} */\n${body}${body.endsWith('\n') ? '' : '\n'}`;
  }

  function parseThemeFile(text) {
    const s = String(text || '');
    const m = s.match(HEADER_RE);
    if (!m) return { id: null, name: null, css: s };
    return { id: m[1], name: m[2], css: s.slice(m[0].length) };
  }

  /* ------------------------------------------------------------ sample document */

  // Uses only what the current parser renders, plus <div dir> blocks. Kept in sync with
  // samples/css-studio-sample.md by a test.
  const SAMPLE_MD = [
    '# כותרת ראשית — מדריך עיצוב (H1)',
    '',
    '> ציטוט: כך נראה בלוק ציטוט במסמך. אפשר לעצב צבע, רקע וקו צד.',
    '',
    '## כותרת רמה 2 (H2)',
    '',
    'זו פסקה רגילה עם **טקסט מודגש**, *טקסט נטוי* ו-`קוד בתוך שורה`. הפסקה ממשיכה בשורה הבאה',
    'כדי להדגים ריווח בין שורות ושבירת שורה.',
    '',
    '### כותרת רמה 3 (H3)',
    '#### כותרת רמה 4 (H4)',
    '##### כותרת רמה 5 (H5)',
    '###### כותרת רמה 6 (H6)',
    '',
    '## רשימות',
    '',
    '* פריט ראשון ברשימת תבליטים',
    '* פריט שני עם **הדגשה**',
    '* פריט שלישי',
    '',
    '1. שלב ראשון',
    '2. שלב שני',
    '3. שלב שלישי',
    '',
    '## טבלה',
    '',
    '| עמודה א | עמודה ב | עמודה ג |',
    '| --- | --- | --- |',
    '| שורה 1 | ערך | ערך |',
    '| שורה 2 | ערך | ערך |',
    '| שורה 3 | ערך | ערך |',
    '',
    '## בלוק קוד',
    '',
    '```js',
    'function hello(name) {',
    "  return 'שלום ' + name;",
    '}',
    '```',
    '',
    '## תרשים',
    '',
    '```mermaid',
    'flowchart LR',
    '    A[התחלה] --> B[עיבוד]',
    '    B --> C[סיום]',
    '```',
    '',
    '## אזורי כיוון',
    '',
    '<div dir="rtl">',
    'זו פסקה בתוך אזור ימין-לשמאל, עם `קוד` ו**הדגשה**.',
    '',
    '* פריט בתוך האזור',
    '</div>',
    '',
    '<div dir="ltr">',
    'This paragraph sits inside a left-to-right block, with `inline code` and **bold** text.',
    '',
    '* An item inside the block',
    '</div>',
    '',
    'פסקה אחרונה מחוץ לאזורי הכיוון.',
    ''
  ].join('\n');

  return {
    ELEMENTS, PROPERTIES, GROUP_LABELS, PROPERTY_GROUP_LABELS, FONT_OPTIONS, SAMPLE_MD, MAX_CSS_CHARS,
    elementByKey: (k) => ELEMENT_BY_KEY[k],
    propertyByKey: (k) => PROP_BY_KEY[k],
    buildSelector, classify, tokenize, parseDecls, splitTopLevel, normSel,
    modelFromCss, cssFromModel, getProp, setProp, clearProp, emptyModel, isSafeValue,
    rescope, sanitizeCss, makeThemeFile, parseThemeFile, slugifyId,
    parseBorder, formatBorder, parseLength, splitImportant, rgbToHex
  };
});
