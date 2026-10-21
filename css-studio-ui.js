/* css-studio-ui.js — MD Workspace (v4.4.0)
 * DOM layer of the visual CSS editor. All CSS logic lives in css-studio.js (window.CssStudio).
 *
 * The "source of truth" stays the existing CSS textarea of the template manager:
 * every visual change re-serialises the model into that textarea, and every manual edit
 * of the textarea re-parses into the model — so both views are always in sync and the
 * existing save / delete flow keeps working unchanged.
 */
(function () {
  'use strict';

  const S = window.CssStudio;
  if (!S) { console.error('css-studio.js must be loaded before css-studio-ui.js'); return; }

  const BORDER_STYLES = [['', 'לא מוגדר'], ['none', 'ללא קו'], ['solid', 'רציף'], ['dashed', 'מקווקו'], ['dotted', 'נקודות'], ['double', 'כפול']];

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }

  function toHex(v) {
    const s = String(v || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(s)) return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
    return S.rgbToHex(s) || '';
  }

  function downloadText(text, filename, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function create(deps) {
    const state = { model: null, id: '', key: 'h1', mode: 'light', built: false };
    const els = {};

    /* ------------------------------------------------------------ build (once) */

    function build() {
      els.select = h('select', { id: 'studio-element-select', class: 'form-input', 'aria-label': 'בחירת אלמנט לעיצוב',
        onchange: (e) => selectElement(e.target.value) });
      const groups = {};
      S.ELEMENTS.forEach((e) => { (groups[e.group] = groups[e.group] || []).push(e); });
      Object.keys(groups).forEach((g) => {
        const og = h('optgroup', { label: S.GROUP_LABELS[g] });
        groups[g].forEach((e) => og.append(h('option', { value: e.key, text: e.label })));
        els.select.append(og);
      });

      els.modeLight = h('button', { type: 'button', class: 'studio-seg', 'data-mode': 'light', onclick: () => setMode('light'), text: '☀ מצב בהיר' });
      els.modeDark = h('button', { type: 'button', class: 'studio-seg', 'data-mode': 'dark', onclick: () => setMode('dark'), text: '☾ מצב כהה' });
      els.modeNote = h('p', { class: 'studio-hint', id: 'studio-mode-note' });
      els.props = h('div', { class: 'studio-props', id: 'studio-props' });
      els.reset = h('button', { type: 'button', class: 'btn btn-secondary studio-reset', onclick: resetElement, text: 'אפס את העיצוב של אלמנט זה' });

      const left = h('div', { class: 'studio-controls' },
        h('div', { class: 'studio-field' }, h('label', { for: 'studio-element-select', text: 'אלמנט לעיצוב' }), els.select),
        h('div', { class: 'studio-modes', role: 'group', 'aria-label': 'מצב תצוגה לעריכה' }, els.modeLight, els.modeDark),
        els.modeNote,
        h('p', { class: 'studio-hint', text: 'טיפ: אפשר ללחוץ ישירות על אלמנט בתצוגה כדי לבחור אותו.' }),
        els.props,
        els.reset);

      els.wrap = h('div', { class: 'studio-preview-wrap', 'data-theme': 'light' });
      els.preview = h('article', { id: 'studio-preview', class: 'preview-document', 'aria-label': 'תצוגה מקדימה חיה של מסמך הדוגמה' });
      els.preview.addEventListener('click', onPreviewClick);
      els.wrap.append(els.preview);
      els.hl = h('style', { id: 'studio-highlight' });

      const right = h('div', { class: 'studio-preview-col' },
        h('div', { class: 'studio-preview-title', text: 'תצוגה חיה — מסמך הדוגמה' }), els.wrap, els.hl);

      deps.mount.innerHTML = '';
      deps.mount.append(h('div', { class: 'studio' }, left, right));
      bindTabs();
      bindLibrary();
      state.built = true;
    }

    /* ------------------------------------------------------------------- tabs */

    function showTab(which) {
      const t = deps.tabs;
      const visual = which === 'visual';
      t.visualPane.hidden = !visual;
      t.codePane.hidden = visual;
      t.visual.setAttribute('aria-selected', String(visual));
      t.code.setAttribute('aria-selected', String(!visual));
      t.visual.classList.toggle('active', visual);
      t.code.classList.toggle('active', !visual);
    }

    function bindTabs() {
      deps.tabs.visual.addEventListener('click', () => showTab('visual'));
      deps.tabs.code.addEventListener('click', () => showTab('code'));
    }

    /* ----------------------------------------------------------------- state */

    function commit() {
      const css = S.cssFromModel(state.model);
      deps.setCss(css);
      deps.setDraft(state.id, css);
    }

    function refresh() {
      if (!state.built) build();
      state.id = deps.getId();
      state.model = S.modelFromCss(deps.getCss(), state.id);
      els.preview.className = 'preview-document template-' + state.id;
      if (els.preview.dataset.rendered !== '1') {
        els.preview.innerHTML = deps.parseMarkdown(S.SAMPLE_MD); // parser output is escaped by design
        if (deps.afterRender) deps.afterRender(els.preview);
        els.preview.dataset.rendered = '1';
      }
      els.select.value = state.key;
      renderMode();
      renderProps();
      renderHighlight();
      deps.setDraft(state.id, deps.getCss());
      refreshLibrary();
    }

    function open() { showTab('visual'); refresh(); }
    function close() { deps.setDraft(null, ''); }

    function onCssInput() {
      if (!state.built) return;
      state.model = S.modelFromCss(deps.getCss(), state.id);
      deps.setDraft(state.id, deps.getCss());
      renderProps();
    }

    function onIdInput() {
      if (!state.built) return;
      const next = deps.getId();
      if (!next) return; // keep the last valid id while the field is being retyped
      if (state.id && next !== state.id) deps.setCss(S.rescope(deps.getCss(), state.id, next));
      refresh();
    }

    function setMode(mode) {
      state.mode = mode;
      els.wrap.dataset.theme = mode;
      renderMode();
      renderProps();
    }

    function selectElement(key) {
      if (!S.elementByKey(key)) return;
      state.key = key;
      els.select.value = key;
      renderProps();
      renderHighlight();
    }

    function resetElement() {
      delete state.model[state.mode][state.key];
      commit();
      renderProps();
    }

    function renderMode() {
      els.modeLight.setAttribute('aria-pressed', String(state.mode === 'light'));
      els.modeDark.setAttribute('aria-pressed', String(state.mode === 'dark'));
      els.modeNote.textContent = state.mode === 'dark'
        ? 'עורכים את העיצוב של מצב כהה. ערך שלא הוגדר כאן יורש מהמצב הבהיר.'
        : 'עורכים את העיצוב הרגיל (מצב בהיר).';
    }

    function renderHighlight() {
      const el = S.elementByKey(state.key);
      const sel = el.selector ? '#studio-preview ' + el.selector : '#studio-preview';
      els.hl.textContent = sel + ' { outline: 2px dashed #f59e0b !important; outline-offset: 2px; }';
    }

    /* ---------------------------------------------------- click to select */

    function keyFromNode(node) {
      while (node && node !== els.wrap) {
        if (node.nodeType === 1) {
          if (node === els.preview) return 'root';
          for (let i = 0; i < S.ELEMENTS.length; i++) {
            const e = S.ELEMENTS[i];
            if (!e.selector || e.noClick) continue;
            try { if (node.matches(e.selector)) return e.key; } catch (_) { /* ignore */ }
          }
        }
        node = node.parentNode;
      }
      return null;
    }

    function onPreviewClick(ev) {
      const key = keyFromNode(ev.target);
      if (key) selectElement(key);
    }

    /* ----------------------------------------------------------- properties */

    function sampleEl() {
      const e = S.elementByKey(state.key);
      if (!e.selector) return els.preview;
      try { return els.preview.querySelector(e.selector); } catch (_) { return null; }
    }

    function computed(prop) {
      const el = sampleEl();
      return el ? getComputedStyle(el).getPropertyValue(prop).trim() : '';
    }

    function stored(p) {
      const own = S.getProp(state.model, state.mode, state.key, p.key);
      if (own !== undefined) return { raw: own, own: true };
      if (state.mode === 'dark') {
        const base = S.getProp(state.model, 'light', state.key, p.key);
        if (base !== undefined) return { raw: base, own: false };
      }
      return { raw: undefined, own: false };
    }

    function renderProps() {
      const el = S.elementByKey(state.key);
      els.props.innerHTML = '';
      const byGroup = {};
      S.PROPERTIES.forEach((p) => {
        if (p.only && p.only.indexOf(el.key) < 0) return;
        (byGroup[p.group] = byGroup[p.group] || []).push(p);
      });
      ['text', 'box', 'border', 'space'].forEach((g) => {
        if (!byGroup[g]) return;
        const anySet = byGroup[g].some((p) => stored(p).raw !== undefined);
        const det = h('details', { class: 'studio-group', open: g === 'text' || g === 'box' || anySet },
          h('summary', { text: S.PROPERTY_GROUP_LABELS[g] }));
        byGroup[g].forEach((p) => det.append(renderRow(p)));
        els.props.append(det);
      });
    }

    function renderRow(p) {
      const st = stored(p);
      const row = h('div', { class: 'studio-row' + (st.own ? ' is-set' : '') + (!st.own && st.raw !== undefined ? ' is-inherited' : '') });
      const apply = (value) => {
        const prev = S.getProp(state.model, state.mode, state.key, p.key);
        let v = value;
        if (v && prev && S.splitImportant(prev).important) v += ' !important';
        if (!S.setProp(state.model, state.mode, state.key, p.key, v)) { deps.toast('ערך לא חוקי'); return false; }
        commit();
        row.classList.toggle('is-set', S.getProp(state.model, state.mode, state.key, p.key) !== undefined);
        row.classList.remove('is-inherited');
        return true;
      };
      const builder = { color: colorControl, select: selectControl, length: lengthControl, number: numberControl, border: borderControl }[p.type];
      const clear = h('button', { type: 'button', class: 'studio-clear', title: 'נקה ערך', 'aria-label': 'נקה: ' + p.label, text: '✕',
        onclick: () => { S.clearProp(state.model, state.mode, state.key, p.key); commit(); renderProps(); } });
      row.append(h('div', { class: 'studio-label', text: p.label }), builder(p, st, apply), clear);
      return row;
    }

    function rawText(p, value, apply) {
      const input = h('input', { type: 'text', class: 'form-input studio-text', dir: 'ltr', 'aria-label': p.label + ' (ערך מותאם)' });
      input.value = value;
      input.addEventListener('change', () => apply(input.value.trim()));
      return h('div', { class: 'studio-ctl' }, input);
    }

    function colorControl(p, st, apply) {
      const sv = st.raw !== undefined ? S.splitImportant(st.raw).value : '';
      const effective = sv ? '' : (S.rgbToHex(computed(p.key)) || '');
      const picker = h('input', { type: 'color', class: 'studio-color', 'aria-label': p.label });
      picker.value = toHex(sv) || effective || '#000000';
      const text = h('input', { type: 'text', class: 'form-input studio-text', dir: 'ltr', placeholder: effective || 'ברירת מחדל',
        'aria-label': p.label + ' (קוד צבע)' });
      text.value = sv;
      picker.addEventListener('input', () => { text.value = picker.value; apply(picker.value); });
      text.addEventListener('change', () => {
        if (apply(text.value.trim())) { const hx = toHex(text.value); if (hx) picker.value = hx; }
      });
      return h('div', { class: 'studio-ctl' }, picker, text);
    }

    function selectControl(p, st, apply) {
      const sv = st.raw !== undefined ? S.splitImportant(st.raw).value : '';
      const sel = h('select', { class: 'form-input', 'aria-label': p.label });
      let found = false;
      p.options.forEach((o) => { if (o[0] === sv) found = true; sel.append(h('option', { value: o[0], text: o[1] })); });
      if (!found && sv) sel.append(h('option', { value: sv, text: 'מותאם: ' + sv }));
      sel.value = sv;
      sel.addEventListener('change', () => apply(sel.value));
      return h('div', { class: 'studio-ctl' }, sel);
    }

    function lengthControl(p, st, apply) {
      const sv = st.raw !== undefined ? S.splitImportant(st.raw).value : '';
      const parsed = sv ? S.parseLength(sv) : null;
      if (sv && !parsed) return rawText(p, sv, apply);
      const num = h('input', { type: 'number', class: 'form-input studio-num', step: 'any', min: p.min, max: p.max, 'aria-label': p.label });
      const unit = h('select', { class: 'form-input studio-unit', 'aria-label': p.label + ' — יחידה' },
        p.units.map((u) => h('option', { value: u, text: u })));
      const range = h('input', { type: 'range', class: 'studio-range', min: p.min, max: p.max, step: p.units[0] === 'px' ? 1 : 0.05, tabindex: '-1', 'aria-hidden': 'true' });
      if (parsed) {
        if (p.units.indexOf(parsed.unit) < 0) unit.append(h('option', { value: parsed.unit, text: parsed.unit }));
        num.value = parsed.num; unit.value = parsed.unit; range.value = parsed.num;
      } else {
        const eff = S.parseLength(computed(p.key));
        if (eff) { num.placeholder = String(Math.round(eff.num * 100) / 100); range.value = eff.num; }
      }
      const push = () => apply(num.value === '' ? '' : num.value + unit.value);
      num.addEventListener('input', () => { range.value = num.value; push(); });
      range.addEventListener('input', () => { num.value = range.value; push(); });
      unit.addEventListener('change', () => { if (num.value !== '') push(); });
      return h('div', { class: 'studio-ctl' }, num, unit, range);
    }

    function numberControl(p, st, apply) {
      const sv = st.raw !== undefined ? S.splitImportant(st.raw).value : '';
      const num = h('input', { type: 'number', class: 'form-input studio-num', step: p.step || 'any', min: p.min, max: p.max, 'aria-label': p.label });
      const range = h('input', { type: 'range', class: 'studio-range', min: p.min, max: p.max, step: p.step || 0.05, tabindex: '-1', 'aria-hidden': 'true' });
      if (sv && isNaN(Number(sv))) return rawText(p, sv, apply);
      if (sv) { num.value = sv; range.value = sv; }
      num.addEventListener('input', () => { range.value = num.value; apply(num.value); });
      range.addEventListener('input', () => { num.value = range.value; apply(num.value); });
      return h('div', { class: 'studio-ctl' }, num, range);
    }

    function borderControl(p, st, apply) {
      const sv = st.raw !== undefined ? S.splitImportant(st.raw).value : '';
      let b = sv ? S.parseBorder(sv) : null;
      if (sv && !b) return rawText(p, sv, apply);
      b = b || { style: '', width: '', color: '' };
      const style = h('select', { class: 'form-input', 'aria-label': p.label + ' — סגנון' }, BORDER_STYLES.map((o) => h('option', { value: o[0], text: o[1] })));
      style.value = b.style;
      const wMatch = b.width.match(/^(\d*\.?\d+)px$/);
      const width = h('input', { type: 'number', class: 'form-input studio-num', min: 0, max: 20, step: 1, placeholder: '1', 'aria-label': p.label + ' — עובי (px)' });
      width.value = wMatch ? wMatch[1] : '';
      const picker = h('input', { type: 'color', class: 'studio-color', 'aria-label': p.label + ' — צבע' });
      picker.value = toHex(b.color) || '#94a3b8';
      const color = h('input', { type: 'text', class: 'form-input studio-text', dir: 'ltr', placeholder: 'צבע', 'aria-label': p.label + ' — קוד צבע' });
      color.value = b.color;
      const push = () => {
        if (!style.value) { apply(''); return; }
        if (style.value === 'none') { apply('none'); return; }
        if (!width.value) width.value = '1';
        apply(S.formatBorder({ width: width.value + 'px', style: style.value, color: color.value.trim() }));
      };
      style.addEventListener('change', push);
      width.addEventListener('input', () => { if (style.value && style.value !== 'none') push(); });
      picker.addEventListener('input', () => { color.value = picker.value; if (style.value && style.value !== 'none') push(); });
      color.addEventListener('change', () => { const hx = toHex(color.value); if (hx) picker.value = hx; if (style.value && style.value !== 'none') push(); });
      return h('div', { class: 'studio-ctl studio-ctl-wrap' }, style, width, picker, color);
    }

    /* ------------------------------------------ files + project theme library */

    function bindLibrary() {
      const L = deps.lib;
      L.exportBtn.addEventListener('click', exportFile);
      L.importBtn.addEventListener('click', () => L.importInput.click());
      L.importInput.addEventListener('change', () => {
        if (L.importInput.files && L.importInput.files[0]) importFile(L.importInput.files[0]);
        L.importInput.value = '';
      });
      L.saveBtn.addEventListener('click', saveToLibrary);
      L.loadBtn.addEventListener('click', loadFromLibrary);
    }

    function currentFileText() {
      const clean = S.sanitizeCss(deps.getCss());
      return S.makeThemeFile(state.id, deps.getName() || state.id, clean.css);
    }

    function exportFile() {
      if (!state.id) { deps.toast('נא להזין מזהה תבנית באנגלית לפני הייצוא'); return; }
      downloadText(currentFileText(), state.id + '.css', 'text/css;charset=utf-8');
      deps.toast('הקובץ ' + state.id + '.css הורד');
    }

    function importFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = S.parseThemeFile(String(reader.result || ''));
        const clean = S.sanitizeCss(parsed.css);
        if (!clean.ok) { deps.toast('הקובץ גדול מדי (מעל 200KB) — לא יובא'); return; }
        const id = parsed.id || S.slugifyId(file.name.replace(/\.css$/i, ''));
        let css = clean.css;
        const scope = css.match(/\.template-([a-z0-9_-]+)/i);
        if (scope && scope[1].toLowerCase() !== id) css = S.rescope(css, scope[1], id);
        deps.loadIntoForm({ id, name: parsed.name || id, css });
        refresh();
        deps.toast(clean.warnings.length
          ? 'יובא. הוסרו רכיבים לא בטוחים (@import / כתובות חיצוניות). לחץ "שמור" כדי לשמור.'
          : 'הקובץ יובא. לחץ "שמור תבנית" כדי לשמור אותו באפליקציה.');
      };
      reader.onerror = () => deps.toast('קריאת הקובץ נכשלה');
      reader.readAsText(file, 'utf-8');
    }

    const NO_SERVER = 'ספריית הפרויקט זמינה רק כשהאפליקציה רצה דרך START (שרת מקומי)';

    async function refreshLibrary() {
      const L = deps.lib;
      try {
        const r = await fetch('/api/themes');
        if (!r.ok) throw new Error(String(r.status));
        const list = (await r.json()).themes || [];
        L.select.innerHTML = '';
        L.select.append(h('option', { value: '', text: list.length ? 'בחר עיצוב מהספרייה…' : 'הספרייה ריקה' }));
        list.forEach((t) => L.select.append(h('option', { value: t.id, text: t.name + ' (' + t.id + ')' })));
        L.select.disabled = L.loadBtn.disabled = !list.length;
        L.saveBtn.disabled = false;
        L.saveBtn.title = 'שומר את הקובץ בתיקיית themes/ בפרויקט (ואז אפשר להעלות ל-Git)';
      } catch (_) {
        L.select.innerHTML = '';
        L.select.append(h('option', { value: '', text: 'ספרייה לא זמינה' }));
        L.select.disabled = L.loadBtn.disabled = L.saveBtn.disabled = true;
        L.saveBtn.title = NO_SERVER;
      }
    }

    async function saveToLibrary() {
      if (!state.id) { deps.toast('נא להזין מזהה תבנית באנגלית לפני השמירה'); return; }
      try {
        const r = await fetch('/api/themes/' + encodeURIComponent(state.id), {
          method: 'PUT',
          headers: { 'X-MDW-Request': '1', 'Content-Type': 'text/css; charset=utf-8' },
          body: currentFileText()
        });
        if (!r.ok) throw new Error(String(r.status));
        deps.toast('נשמר בספרייה: themes/' + state.id + '.css — לשיתוף עם הצוות: git add themes && git commit');
        refreshLibrary();
      } catch (_) { deps.toast(NO_SERVER); }
    }

    async function loadFromLibrary() {
      const id = deps.lib.select.value;
      if (!id) return;
      try {
        const r = await fetch('/api/themes/' + encodeURIComponent(id));
        if (!r.ok) throw new Error(String(r.status));
        const parsed = S.parseThemeFile(await r.text());
        const clean = S.sanitizeCss(parsed.css);
        if (!clean.ok) { deps.toast('הקובץ גדול מדי'); return; }
        deps.loadIntoForm({ id, name: parsed.name || id, css: clean.css });
        refresh();
        deps.toast('נטען מהספרייה. לחץ "שמור תבנית" כדי להחיל אותו באפליקציה.');
      } catch (_) { deps.toast(NO_SERVER); }
    }

    return { open, close, refresh, onCssInput, onIdInput, selectElement, setMode, _state: state };
  }

  window.CssStudioUI = { create };
})();
