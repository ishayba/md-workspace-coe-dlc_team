/* md-visual-ui.js — MD Workspace (v4.5.0)
 * DOM layer of the visual (Word-like) editor. All conversion logic lives in md-visual.js.
 *
 * The Markdown text in #markdown-input stays the single source of truth:
 *   visual edit  -> HTML -> Markdown (MdVisual.htmlToMarkdown) -> #markdown-input -> normal preview/autosave
 *   Markdown edit (code editor, code view, file open, template) -> updatePreview() -> onMarkdownChanged()
 *                -> the visual surface is re-rendered from the Markdown.
 * The visual surface is never re-rendered from its own edits, so the caret never jumps.
 */
(function () {
  'use strict';

  const V = window.MdVisual;
  if (!V) { console.error('md-visual.js must be loaded before md-visual-ui.js'); return; }

  const $ = (id) => document.getElementById(id);
  const MODE_KEY = 'mdw_editor_mode';
  const CONTAINERS = 'div[dir], ul, ol, table, thead, tbody, tfoot, tr';

  function create(deps) {
    const workspace = $('workspace-main');
    const previewPane = $('preview-container');
    const editor = $('visual-editor');
    const scroll = $('visual-scroll');
    const toolbar = $('visual-toolbar');
    const blockSelect = $('visual-block-select');
    const codeView = $('md-code-view');
    const modeBtns = { code: $('mode-btn-code'), visual: $('mode-btn-visual') };
    const pvBtns = { rendered: $('pv-btn-rendered'), code: $('pv-btn-code') };

    let mode = 'code';
    let previewMode = 'rendered';
    let syncing = false;
    let toMdTimer = 0;
    let fromMdTimer = 0;
    let savedRange = null;
    let dirty = false;      // true only while there are visual edits not yet written to the Markdown

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const elOf = (n) => (n && n.nodeType === 3 ? n.parentElement : n);

    /* ------------------------------------------------------------ rendering from Markdown */

    function cleanWhitespace(rootEl) {
      const targets = [rootEl].concat(Array.from(rootEl.querySelectorAll(CONTAINERS)));
      targets.forEach((c) => Array.from(c.childNodes).forEach((n) => { if (n.nodeType === 3 && !n.nodeValue.trim()) n.remove(); }));
      rootEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote').forEach((el) => { if (!el.firstChild) el.innerHTML = '<br>'; });
    }

    function ensureTrailingParagraph() {
      const last = editor.lastElementChild;
      if (!last || !/^(P|H[1-6])$/.test(last.tagName)) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        editor.appendChild(p);
      }
    }

    function actionsFor(kind) {
      const box = document.createElement('span');
      box.className = 'island-actions';
      box.setAttribute('data-md-ignore', '');
      box.setAttribute('contenteditable', 'false');
      const mk = (cls, text, title, fn) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'island-btn ' + cls; b.textContent = text; b.title = title;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(b.closest('[data-island]')); });
        return b;
      };
      box.append(mk('island-edit', '✎ עריכה', kind === 'mermaid' ? 'עריכת קוד התרשים' : 'עריכת בלוק הקוד', editIsland),
        mk('island-del', '✕', 'מחיקה', deleteIsland));
      return box;
    }

    function prepareIslands(rootEl) {
      rootEl.querySelectorAll('pre, .mermaid-diagram-container').forEach((el) => {
        if (el.dataset.island) return;
        el.dataset.island = el.matches('pre') ? 'code' : 'mermaid';
        el.setAttribute('contenteditable', 'false');
        el.appendChild(actionsFor(el.dataset.island));
      });
    }

    function renderFromMarkdown() {
      const keep = scroll.scrollTop;
      dirty = false;
      editor.innerHTML = deps.parseMarkdown(deps.mdInput.value);
      const footer = editor.querySelector('.mdw-attribution-footer');
      if (footer) footer.remove();
      cleanWhitespace(editor);
      prepareIslands(editor);
      ensureTrailingParagraph();
      deps.afterRender(editor);
      scroll.scrollTop = keep;
    }

    /* ------------------------------------------------------------ syncing */

    function syncCodeView() {
      if (previewMode === 'code' && document.activeElement !== codeView) codeView.value = deps.mdInput.value;
    }

    function flushToMarkdown() {
      clearTimeout(toMdTimer);
      if (mode !== 'visual' || !dirty) return;
      dirty = false;
      const md = V.htmlToMarkdown(editor.innerHTML);
      if (md !== deps.mdInput.value) {
        syncing = true;
        try { deps.mdInput.value = md; deps.updatePreview(); } finally { syncing = false; }
        syncCodeView();
      }
      deps.afterRender(editor);
    }

    function scheduleToMd() { dirty = true; clearTimeout(toMdTimer); toMdTimer = setTimeout(flushToMarkdown, 200); }

    // called by updatePreview() whenever the Markdown text changed
    function onMarkdownChanged() {
      if (mode !== 'visual' || syncing) return;
      clearTimeout(fromMdTimer);
      fromMdTimer = setTimeout(() => { if (mode === 'visual' && !syncing) renderFromMarkdown(); }, 120);
    }

    function syncClass() { editor.className = deps.previewContent.className + ' visual-editor'; }

    /* ------------------------------------------------------------ modes */

    function setPreviewMode(next) {
      previewMode = next;
      previewPane.dataset.previewMode = next;
      pvBtns.rendered.setAttribute('aria-pressed', String(next === 'rendered'));
      pvBtns.code.setAttribute('aria-pressed', String(next === 'code'));
      pvBtns.rendered.classList.toggle('active', next === 'rendered');
      pvBtns.code.classList.toggle('active', next === 'code');
      if (next === 'code') codeView.value = deps.mdInput.value;
    }

    function setMode(next, silent) {
      if (next !== 'code' && next !== 'visual') return;
      if (next === mode) return;
      if (mode === 'visual') flushToMarkdown();
      mode = next;
      workspace.dataset.editorMode = mode;
      Object.keys(modeBtns).forEach((k) => {
        modeBtns[k].classList.toggle('active', k === mode);
        modeBtns[k].setAttribute('aria-selected', String(k === mode));
      });
      if (mode === 'visual') { renderFromMarkdown(); editor.focus({ preventScroll: true }); }
      else { setPreviewMode('rendered'); deps.mdInput.focus(); }
      if (!silent) { try { localStorage.setItem(MODE_KEY, mode); } catch (_) { /* private mode */ } }
    }

    /* ------------------------------------------------------------ selection helpers */

    const selection = () => window.getSelection();

    function rememberSelection() {
      const s = selection();
      if (s.rangeCount && editor.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange();
    }

    function restoreSelection() {
      if (!savedRange) return;
      const s = selection();
      s.removeAllRanges();
      s.addRange(savedRange);
    }

    // moving nodes collapses a live selection; remember its boundaries and put it back afterwards
    function keepSelection(fn) {
      const s = selection();
      let sc, so, ec, eo;
      let had = false;
      if (s.rangeCount && editor.contains(s.anchorNode)) {
        const r = s.getRangeAt(0);
        sc = r.startContainer; so = r.startOffset; ec = r.endContainer; eo = r.endOffset; had = true;
      }
      fn();
      if (had && editor.contains(sc) && editor.contains(ec)) {
        try {
          const r = document.createRange();
          r.setStart(sc, so); r.setEnd(ec, eo);
          s.removeAllRanges(); s.addRange(r);
        } catch (_) { /* boundary no longer valid */ }
      }
    }

    // Chrome can leave block children inside a <p> (e.g. <p><ul>…</ul></p>); lift them out
    function normalizeDom() {
      const blocky = ':scope > ul, :scope > ol, :scope > table, :scope > pre, :scope > div, :scope > blockquote, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6';
      keepSelection(() => {
        editor.querySelectorAll('p').forEach((p) => {
          if (!p.querySelector(blocky)) return;
          const parent = p.parentNode;
          while (p.firstChild) parent.insertBefore(p.firstChild, p);
          p.remove();
        });
      });
    }

    function run(fn) {
      if (mode !== 'visual') return;
      editor.focus({ preventScroll: true });
      restoreSelection();
      fn();
      normalizeDom();
      rememberSelection();
      scheduleToMd();
      reflectState();
    }

    function placeCaret(el, atEnd) {
      if (!el) return;
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(!atEnd);
      const s = selection();
      s.removeAllRanges();
      s.addRange(r);
    }

    function anchorEl() { const s = selection(); return s.rangeCount ? elOf(s.anchorNode) : null; }

    // the block (child of the editor or of a direction wrapper) that holds the caret
    function topBlock(node) {
      let n = elOf(node);
      while (n && n !== editor) {
        const p = n.parentNode;
        if (p === editor || (p && p.nodeType === 1 && p.matches('div[dir]') && editor.contains(p))) return n;
        n = p;
      }
      return null;
    }

    function rootBlock(node) {
      let n = elOf(node);
      while (n && n.parentNode !== editor) n = n.parentNode;
      return n && n !== editor ? n : null;
    }

    function insertBlock(node) {
      const s = selection();
      const ref = s.rangeCount && editor.contains(s.anchorNode) ? topBlock(s.anchorNode) : null;
      if (ref && ref.tagName === 'P' && !ref.textContent.trim() && !ref.querySelector('img,table,pre')) ref.replaceWith(node);
      else if (ref) ref.after(node);
      else editor.appendChild(node);
      ensureTrailingParagraph();
    }

    /* ------------------------------------------------------------ commands */

    const exec = (cmd, arg) => document.execCommand(cmd, false, arg);

    function toggleInlineCode() {
      const s = selection();
      const el = anchorEl();
      const code = el && el.closest('code');
      if (code && editor.contains(code)) {
        keepSelection(() => {
          const frag = document.createDocumentFragment();
          while (code.firstChild) frag.appendChild(code.firstChild);
          code.replaceWith(frag);
        });
      } else if (s.rangeCount && !s.isCollapsed) {
        // (insertHTML is not used: Chrome drops the <code> tag and keeps a styled <span>)
        const range = s.getRangeAt(0);
        const a = topBlock(range.startContainer);
        const b = topBlock(range.endContainer);
        if (a !== b) { deps.toast('סמן טקסט בתוך פסקה אחת'); return; }
        const node = document.createElement('code');
        node.appendChild(range.extractContents());
        range.insertNode(node);
        const r = document.createRange();
        r.selectNodeContents(node);
        s.removeAllRanges();
        s.addRange(r);
      } else deps.toast('סמן טקסט כדי להפוך אותו לקוד');
    }

    // Chrome only converts the item under the caret; switching bullets <-> numbers should convert the whole list
    function listCommand(tag) {
      const el = anchorEl();
      const list = el && el.closest('ul, ol');
      if (list && editor.contains(list) && list.tagName !== tag) {
        keepSelection(() => {
          const next = document.createElement(tag.toLowerCase());
          while (list.firstChild) next.appendChild(list.firstChild);
          list.replaceWith(next);
        });
        return;
      }
      exec(tag === 'UL' ? 'insertUnorderedList' : 'insertOrderedList');
    }

    function toggleQuote() {
      const el = anchorEl();
      if (el && el.closest('blockquote')) exec('outdent'); else exec('formatBlock', '<blockquote>');
    }

    function insertTable() {
      const t = document.createElement('table');
      const head = ['כותרת 1', 'כותרת 2', 'כותרת 3'];
      t.innerHTML = '<thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
        '<tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody>';
      insertBlock(t);
      const first = t.querySelector('th');
      const r = document.createRange();
      r.selectNodeContents(first);
      selection().removeAllRanges();
      selection().addRange(r);
    }

    function cellOf(node) { const el = elOf(node); const c = el && el.closest('td, th'); return c && editor.contains(c) ? c : null; }

    function tableOp(op) {
      const cell = cellOf(selection().anchorNode);
      if (!cell) { deps.toast('הצב את הסמן בתוך טבלה'); return; }
      const row = cell.parentElement;
      const table = row.closest('table');
      const idx = Array.prototype.indexOf.call(row.children, cell);
      const mk = (tag) => { const c = document.createElement(tag); c.innerHTML = '<br>'; return c; };
      const rows = Array.from(table.querySelectorAll('tr'));
      if (op === 'row-add') {
        const nr = document.createElement('tr');
        Array.from(row.children).forEach(() => nr.appendChild(mk('td')));
        if (row.parentElement.tagName === 'THEAD') {
          let tb = table.querySelector('tbody');
          if (!tb) { tb = document.createElement('tbody'); table.appendChild(tb); }
          tb.insertBefore(nr, tb.firstChild);
        } else row.after(nr);
        placeCaret(nr.firstChild);
      } else if (op === 'row-del') {
        if (row.parentElement.tagName === 'THEAD' || rows.indexOf(row) === 0) { deps.toast('אי אפשר למחוק את שורת הכותרת'); return; }
        const next = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        placeCaret(next && (next.children[idx] || next.lastElementChild));
      } else if (op === 'col-add') {
        rows.forEach((r) => {
          const ref = r.children[idx];
          const c = mk(ref && ref.tagName === 'TH' ? 'th' : 'td');
          if (ref) ref.after(c); else r.appendChild(c);
        });
        placeCaret(row.children[idx + 1]);
      } else if (op === 'col-del') {
        if (row.children.length <= 1) { deps.toast('אי אפשר למחוק את העמודה היחידה'); return; }
        rows.forEach((r) => { if (r.children[idx]) r.children[idx].remove(); });
        placeCaret(row.children[Math.min(idx, row.children.length - 1)]);
      }
    }

    function selectCell(cell) {
      const r = document.createRange();
      r.selectNodeContents(cell);
      const s = selection();
      s.removeAllRanges();
      s.addRange(r);
    }

    function moveCell(cell, back) {
      const cells = Array.from(cell.closest('table').querySelectorAll('th, td'));
      const i = cells.indexOf(cell) + (back ? -1 : 1);
      if (i >= cells.length) { tableOp('row-add'); return; }
      selectCell(cells[Math.max(0, i)]);
    }

    /* ---- direction regions (<div dir="rtl|ltr">) ---- */

    function setDirRegion(dir) {
      const s = selection();
      if (!s.rangeCount || !editor.contains(s.anchorNode)) return;
      const existing = elOf(s.anchorNode).closest('div[dir]');
      if (dir === 'none') {
        if (existing && editor.contains(existing)) {
          keepSelection(() => {
            const frag = document.createDocumentFragment();
            while (existing.firstChild) frag.appendChild(existing.firstChild);
            existing.replaceWith(frag);
          });
          deps.afterRender(editor);
        }
        return;
      }
      if (existing && editor.contains(existing)) { existing.setAttribute('dir', dir); return; }
      const range = s.getRangeAt(0);
      const a = rootBlock(range.startContainer);
      const b = rootBlock(range.endContainer);
      if (!a || !b) return;
      const wrap = document.createElement('div');
      wrap.setAttribute('dir', dir);
      keepSelection(() => {
        a.before(wrap);
        let n = a;
        while (n) { const next = n.nextSibling; wrap.appendChild(n); if (n === b) break; n = next; }
      });
      wrap.querySelectorAll('[dir]').forEach((x) => { if (!x.matches('div[dir]')) x.removeAttribute('dir'); });   // auto directions no longer apply inside
      ensureTrailingParagraph();
    }

    /* ---- code / diagram islands ---- */

    function insertIsland(kind) {
      const md = kind === 'mermaid' ? '```mermaid\nflowchart LR\n    A[התחלה] --> B[סיום]\n```' : '```\n\n```';
      const tmp = document.createElement('div');
      tmp.innerHTML = deps.parseMarkdown(md);
      const node = tmp.querySelector(kind === 'mermaid' ? '.mermaid-diagram-container' : 'pre');
      if (!node) return;
      insertBlock(node);
      prepareIslands(editor);
      editIsland(node);
    }

    function deleteIsland(island) {
      if (!island) return;
      const next = island.nextElementSibling || island.previousElementSibling;
      island.remove();
      ensureTrailingParagraph();
      if (next) placeCaret(next);
      scheduleToMd();
    }

    function editIsland(island) {
      if (!island || island.querySelector('.island-editor')) return;
      const kind = island.dataset.island;
      const code = kind === 'code' ? island.querySelector('code') : null;
      const langMatch = code && /language-(\w*)/.exec(code.className);
      const source = kind === 'code' ? (code ? code.textContent : '') : (island.getAttribute('data-mermaid-source') || '');

      const box = document.createElement('div');
      box.className = 'island-editor';
      box.setAttribute('data-md-ignore', '');
      box.setAttribute('contenteditable', 'false');
      const label = document.createElement('div');
      label.className = 'island-editor-title';
      label.textContent = kind === 'mermaid' ? 'קוד התרשים (Mermaid)' : 'קוד';
      const ta = document.createElement('textarea');
      ta.value = source; ta.dir = 'ltr'; ta.spellcheck = false;
      ta.rows = Math.min(16, Math.max(4, source.split('\n').length + 1));
      ta.setAttribute('aria-label', label.textContent);
      let lang = null;
      if (kind === 'code') {
        lang = document.createElement('input');
        lang.type = 'text'; lang.dir = 'ltr'; lang.className = 'island-lang';
        lang.placeholder = 'שפה (למשל js)'; lang.value = langMatch ? langMatch[1] : '';
        lang.setAttribute('aria-label', 'שפת הקוד');
      }
      const bar = document.createElement('div');
      bar.className = 'island-editor-bar';
      const save = document.createElement('button');
      save.type = 'button'; save.className = 'island-btn island-save'; save.textContent = 'שמור';
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'island-btn island-cancel'; cancel.textContent = 'ביטול';
      bar.append(save, cancel);
      box.append(label);
      if (lang) box.append(lang);
      box.append(ta, bar);
      island.classList.add('is-editing');
      island.appendChild(box);
      ta.focus();

      const close = () => { box.remove(); island.classList.remove('is-editing'); };
      const commit = () => {
        const src = ta.value.replace(/```/g, '\u02CB\u02CB\u02CB');
        const tag = kind === 'mermaid' ? 'mermaid' : (lang.value.replace(/[^A-Za-z0-9_]/g, ''));
        const tmp = document.createElement('div');
        tmp.innerHTML = deps.parseMarkdown('```' + tag + '\n' + src + '\n```');
        const fresh = tmp.querySelector(kind === 'mermaid' ? '.mermaid-diagram-container' : 'pre');
        if (!fresh) { close(); return; }
        island.replaceWith(fresh);
        prepareIslands(editor);
        scheduleToMd();
      };
      save.addEventListener('click', commit);
      cancel.addEventListener('click', close);
      box.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      });
    }

    const COMMANDS = {
      bold: () => exec('bold'),
      italic: () => exec('italic'),
      code: toggleInlineCode,
      ul: () => listCommand('UL'),
      ol: () => listCommand('OL'),
      quote: toggleQuote,
      table: insertTable,
      'row-add': () => tableOp('row-add'),
      'row-del': () => tableOp('row-del'),
      'col-add': () => tableOp('col-add'),
      'col-del': () => tableOp('col-del'),
      codeblock: () => insertIsland('code'),
      mermaid: () => insertIsland('mermaid'),
      'dir-rtl': () => setDirRegion('rtl'),
      'dir-ltr': () => setDirRegion('ltr'),
      'dir-none': () => setDirRegion('none'),
      undo: () => exec('undo'),
      redo: () => exec('redo')
    };

    /* ------------------------------------------------------------ toolbar state */

    function reflectState() {
      const s = selection();
      if (!s.anchorNode || !editor.contains(s.anchorNode)) return;
      ['bold', 'italic'].forEach((c) => {
        const b = toolbar.querySelector('[data-vcmd="' + c + '"]');
        let on = false;
        try { on = document.queryCommandState(c); } catch (_) { /* ignore */ }
        if (b) b.setAttribute('aria-pressed', String(on));
      });
      const el = elOf(s.anchorNode);
      const inCell = !!cellOf(s.anchorNode);
      ['row-add', 'row-del', 'col-add', 'col-del'].forEach((c) => {
        const b = toolbar.querySelector('[data-vcmd="' + c + '"]');
        if (b) b.disabled = !inCell;
      });
      const blockEl = el.closest('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre');
      const simple = !!blockEl && /^(P|H[1-6])$/.test(blockEl.tagName) && !el.closest('li, td, th, blockquote, pre');
      blockSelect.disabled = !simple;
      if (simple) blockSelect.value = blockEl.tagName.toLowerCase();
    }

    /* ------------------------------------------------------------ events */

    function bind() {
      modeBtns.code.addEventListener('click', () => setMode('code'));
      modeBtns.visual.addEventListener('click', () => setMode('visual'));
      pvBtns.rendered.addEventListener('click', () => setPreviewMode('rendered'));
      pvBtns.code.addEventListener('click', () => setPreviewMode('code'));

      codeView.addEventListener('input', () => { deps.mdInput.value = codeView.value; deps.updatePreview(); });

      toolbar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
      toolbar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-vcmd]');
        if (!b || b.disabled) return;
        const fn = COMMANDS[b.dataset.vcmd];
        if (fn) run(fn);
      });
      blockSelect.addEventListener('change', () => run(() => exec('formatBlock', '<' + blockSelect.value + '>')));

      editor.addEventListener('input', (e) => {
        if (e.target.closest && e.target.closest('.island-editor')) return;
        scheduleToMd();
      });
      editor.addEventListener('blur', () => flushToMarkdown());
      editor.addEventListener('dblclick', (e) => { const i = e.target.closest && e.target.closest('[data-island]'); if (i) editIsland(i); });

      editor.addEventListener('keydown', (e) => {
        if (e.target.closest && e.target.closest('.island-editor')) return;
        if (e.key === 'Tab') {
          const cell = cellOf(selection().anchorNode);
          const inList = !!(anchorEl() && anchorEl().closest('li'));
          if (cell) { e.preventDefault(); moveCell(cell, e.shiftKey); scheduleToMd(); }
          else if (inList) e.preventDefault();    // nested lists are not part of the supported Markdown
        }
      });

      // plain text only: no foreign HTML, styles or files ever enter the document
      editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        const el = anchorEl();
        const flat = el && el.closest('td, th, li, h1, h2, h3, h4, h5, h6');
        if (flat) exec('insertText', text.replace(/\s*\n\s*/g, ' ').trim());
        else { const html = V.plainTextToHtml(text); if (html) exec('insertHTML', html); }
        scheduleToMd();
      });
      editor.addEventListener('drop', (e) => { e.preventDefault(); });
      editor.addEventListener('beforeinput', (e) => { if (e.inputType === 'insertFromDrop') e.preventDefault(); });

      document.addEventListener('selectionchange', () => {
        if (mode === 'visual' && editor.contains(selection().anchorNode)) { rememberSelection(); reflectState(); }
      });
    }

    function init() {
      syncClass();
      new MutationObserver(syncClass).observe(deps.previewContent, { attributes: true, attributeFilter: ['class'] });
      try { exec('defaultParagraphSeparator', 'p'); exec('styleWithCSS', false); } catch (_) { /* older engines */ }
      bind();
      let saved = null;
      try { saved = localStorage.getItem(MODE_KEY); } catch (_) { /* ignore */ }
      if (saved === 'visual') setMode('visual', true);
    }

    return { init, setMode, setPreviewMode, onMarkdownChanged, flush: flushToMarkdown, getMode: () => mode };
  }

  window.MdVisualUI = { create };
})();
