/* a11y-ui.js — MD Workspace (v4.7.0)
 * DOM part of the accessibility feature: the two header icons and their shared dropdown panels, the accessibility panel
 * (colour scheme, high contrast, text size, read aloud, reset), the live region with notify(), the skip link and the single
 * global Escape handler. Pure logic is in a11y.js (MdA11y). Started from the main script with MdA11yUI.init(deps).
 */
(function () {
  'use strict';

  /* All user-visible Hebrew text lives here (frontend-components.md §4). */
  const STR = {
    a11yLabel: 'נגישות',
    a11yLabelChanged: 'נגישות — הוגדרו התאמות',
    panelClose: 'סגירת הפאנל',
    themeGroup: 'ערכת צבעים',
    themes: { system: '◐ אוטומטי', light: '☀ יום', dark: '☾ לילה' },
    themeNames: { system: 'אוטומטי', light: 'יום', dark: 'לילה' },
    themeSet: 'ערכת צבעים: ',
    contrast: 'ניגודיות גבוהה',
    contrastOn: 'ניגודיות גבוהה הופעלה',
    contrastOff: 'ניגודיות גבוהה כובתה',
    textSize: 'גודל טקסט',
    zoomOut: 'הקטנת טקסט',
    zoomIn: 'הגדלת טקסט',
    zoomResetLabel: (pct) => 'איפוס גודל טקסט, כרגע ' + pct + '%',
    zoomSet: (pct) => 'גודל טקסט ' + pct + '%',
    reset: 'איפוס הגדרות נגישות',
    resetDone: 'הגדרות הנגישות אופסו',
    skip: 'דלג לתוכן',
    readTitle: 'הקראת המסמך',
    readLabel: 'הקראת המסמך',
    readStart: '▶ הקראה',
    readStop: '■ עצירה',
    readStopLabel: 'עצירת הקראה',
    readPause: 'השהיה',
    readPauseLabel: 'השהיית הקראה',
    readResume: 'המשך',
    readResumeLabel: 'המשך הקראה',
    readBegan: 'ההקראה התחילה',
    readEnd: 'ההקראה הסתיימה',
    readEmpty: 'המסמך ריק',
    noHebrewVoice: 'לא נמצא קול עברי, ההקראה בקול ברירת המחדל',
    readUnsupported: 'הדפדפן הזה לא תומך בהקראה בקול'
  };

  const A = window.MdA11y;
  const state = { open: 'none', opener: null, prefs: null, store: null, deps: {} };
  const ICONS = { a11y: 'btn-a11y', export: 'btn-export' };
  const PANELS = { a11y: 'panel-a11y', export: 'panel-export' };
  const byId = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ helpers */

  // Builds an element without innerHTML. attrs: {class, text, testid, on: {click}, ...any attribute}.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'testid') el.setAttribute('data-testid', v);
      else if (k === 'on') Object.keys(v).forEach((ev) => el.addEventListener(ev, v[ev]));
      else el.setAttribute(k, v === true ? '' : v);
    });
    children.forEach((c) => { if (c) el.append(c); });
    return el;
  }

  function modalIsOpen() {
    return !!document.querySelector('.modal-overlay.active, [role="dialog"][aria-modal="true"]:not([hidden])');
  }

  /* ------------------------------------------------------------------ preferences */

  function applyPrefs(p) {
    const root = document.documentElement;
    root.setAttribute('data-theme', p.theme);
    root.classList.toggle('hc', !!p.highContrast);
    root.style.setProperty('--ax-zoom', String(p.zoom / 100));
  }

  function setPrefs(next) {
    state.prefs = state.store.save(next);
    applyPrefs(state.prefs);
    refreshIcon();
    document.dispatchEvent(new CustomEvent('mdw:a11y-prefs', { detail: state.prefs }));
    return state.prefs;
  }

  function readingActive() {
    return !!(window.MdA11yUI && window.MdA11yUI.readingState && window.MdA11yUI.readingState() !== 'idle');
  }

  // BR1.6: the dot and the alternate label while a setting differs from the default or while reading runs
  function refreshIcon() {
    const icon = byId(ICONS.a11y);
    if (!icon) return;
    const changed = !A.isDefault(state.prefs) || readingActive();
    const dot = icon.querySelector('.hdr-dot');
    if (dot) dot.hidden = !changed;
    icon.setAttribute('aria-label', changed ? STR.a11yLabelChanged : STR.a11yLabel);
  }

  /* ------------------------------------------------------------------ shared dropdown panels (WF1) */

  function panelEl(name) { return byId(PANELS[name]); }

  function firstControl(panel) {
    const sel = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]';
    const body = panel.querySelector('.panel-body');
    return (body && body.querySelector(sel)) || panel.querySelector(sel);
  }

  function setExpanded(name, on) {
    const icon = byId(ICONS[name]);
    if (icon) icon.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  function closePanel(returnFocus) {
    if (state.open === 'none') return;
    const name = state.open;
    const opener = state.opener || byId(ICONS[name]);
    panelEl(name).hidden = true;
    setExpanded(name, false);
    state.open = 'none';
    state.opener = null;
    if (returnFocus !== false && opener) opener.focus();
    document.dispatchEvent(new CustomEvent('mdw:panel-closed', { detail: { name } }));
  }

  function openPanel(name) {
    if (modalIsOpen()) return false;                       // BR1.5: a modal window wins
    if (state.open === name) { closePanel(true); return false; }
    if (state.open !== 'none') closePanel(false);          // BR1.3: one panel at a time, no focus move
    const panel = panelEl(name);
    state.open = name;
    state.opener = byId(ICONS[name]);
    panel.hidden = false;
    setExpanded(name, true);
    document.dispatchEvent(new CustomEvent('mdw:panel-opened', { detail: { name } }));
    const first = firstControl(panel);
    if (first) first.focus();
    return true;
  }

  function bindPanels() {
    Object.keys(ICONS).forEach((name) => {
      byId(ICONS[name]).addEventListener('click', () => { openPanel(name); });
      panelEl(name).querySelector('.panel-close').addEventListener('click', () => closePanel(true));
    });
    // outside click: close, and make sure focus does not end up nowhere (BR1.4)
    document.addEventListener('mousedown', (e) => {
      if (state.open === 'none') return;
      const t = e.target;
      if (panelEl(state.open).contains(t) || Object.keys(ICONS).some((n) => byId(ICONS[n]).contains(t))) return;
      const opener = state.opener;
      closePanel(false);
      setTimeout(() => { if (opener && (!document.activeElement || document.activeElement === document.body)) opener.focus(); }, 0);
    }, true);
  }

  /* ------------------------------------------------------------------ live region and notify (BR2.11) */

  let announceTimer = null;

  // empties the region first, then writes, so that the same sentence twice in a row is announced twice
  function announce(text) {
    const live = byId('ax-live');
    if (!live) return;
    live.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { live.textContent = text; }, 40);
  }

  // The one function every message goes through: the app toast, plus the live region when the message matters.
  // opts: {announce: boolean, node: a DOM node shown in the toast instead of the plain text (e.g. a file name in <bdi>)}
  function notify(text, opts) {
    if (state.deps.showToast) state.deps.showToast(opts && opts.node ? opts.node : text);
    if (opts && opts.announce) announce(text);
  }

  /* ------------------------------------------------------------------ accessibility panel (WF3) */

  const ui = {};   // the controls that show the current preferences

  function reflectPrefs() {
    const p = state.prefs;
    ui.radios.forEach((r) => {
      const on = r.dataset.value === p.theme;
      r.setAttribute('aria-checked', on ? 'true' : 'false');
      r.tabIndex = on ? 0 : -1;
    });
    ui.hc.setAttribute('aria-checked', p.highContrast ? 'true' : 'false');
    ui.zoomReset.textContent = p.zoom + '%';
    ui.zoomReset.setAttribute('aria-label', STR.zoomResetLabel(p.zoom));
    ui.zoomIn.setAttribute('aria-disabled', A.canZoom(p.zoom, 'in') ? 'false' : 'true');
    ui.zoomOut.setAttribute('aria-disabled', A.canZoom(p.zoom, 'out') ? 'false' : 'true');
  }

  function change(patch, message) {
    setPrefs(Object.assign({}, state.prefs, patch));
    reflectPrefs();
    if (message) notify(message, { announce: true });
  }

  function chooseTheme(value, focus) {
    const radio = ui.radios.find((r) => r.dataset.value === value);
    change({ theme: value }, STR.themeSet + STR.themeNames[value]);
    if (focus && radio) radio.focus();
  }

  function onRadioKey(e) {
    const idx = ui.radios.indexOf(e.currentTarget);
    const last = ui.radios.length - 1;
    let to = -1;
    // RTL: the left arrow is the NEXT option, the right arrow the previous one
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = idx === last ? 0 : idx + 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = idx === 0 ? last : idx - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    if (to < 0) return;
    e.preventDefault();
    chooseTheme(ui.radios[to].dataset.value, true);
  }

  function zoomStep(dir) {
    if (!A.canZoom(state.prefs.zoom, dir)) return;
    const z = A.nextZoom(state.prefs.zoom, dir);
    change({ zoom: z }, STR.zoomSet(z));
  }

  function buildA11yPanel() {
    const body = byId('panel-a11y-body');
    ui.radios = ['system', 'light', 'dark'].map((v) => h('button', {
      type: 'button', role: 'radio', 'data-value': v, 'aria-checked': 'false', tabindex: '-1', testid: 'ax-theme-' + v,
      text: STR.themes[v], on: { click: () => chooseTheme(v, true), keydown: onRadioKey }
    }));
    const group = h('div', { class: 'ax-seg', role: 'radiogroup', 'aria-label': STR.themeGroup, testid: 'ax-theme-group' }, ...ui.radios);

    ui.hc = h('button', {
      type: 'button', id: 'ax-hc', class: 'ax-track', role: 'switch', 'aria-checked': 'false', 'aria-labelledby': 'ax-hc-l', testid: 'ax-contrast-switch',
      on: { click: () => change({ highContrast: !state.prefs.highContrast }, state.prefs.highContrast ? STR.contrastOff : STR.contrastOn) }
    });

    ui.zoomOut = h('button', { type: 'button', id: 'ax-zoom-out', class: 'ax-btn', 'aria-label': STR.zoomOut, 'aria-disabled': 'false', text: 'א−', testid: 'ax-zoom-out', on: { click: () => zoomStep('out') } });
    ui.zoomReset = h('button', { type: 'button', id: 'ax-zoom-reset', class: 'ax-btn ax-pct', testid: 'ax-zoom-reset', on: { click: () => change({ zoom: A.nextZoom(state.prefs.zoom, 'reset') }, STR.zoomSet(100)) } });
    ui.zoomIn = h('button', { type: 'button', id: 'ax-zoom-in', class: 'ax-btn', 'aria-label': STR.zoomIn, 'aria-disabled': 'false', text: 'א+', testid: 'ax-zoom-in', on: { click: () => zoomStep('in') } });

    ui.reset = h('a', {
      href: '#', class: 'ax-reset', testid: 'ax-reset', text: STR.reset,
      on: { click: (e) => { e.preventDefault(); resetAll(); } }
    });

    body.append(
      h('div', { class: 'ax-row' }, h('p', { class: 'ax-row-l', text: STR.themeGroup }), group),
      h('div', { class: 'ax-row ax-switch-row' }, h('span', { id: 'ax-hc-l', text: STR.contrast }), ui.hc),
      h('div', { class: 'ax-row' }, h('p', { class: 'ax-row-l', text: STR.textSize }), h('div', { class: 'ax-stepper' }, ui.zoomOut, ui.zoomReset, ui.zoomIn)),
      buildReadRow(),
      ui.reset
    );
    reflectPrefs();
  }

  /* ------------------------------------------------------------------ read aloud (WF4, SM2) */

  const reading = { state: 'idle', segments: [], index: -1, parts: [], part: 0, session: 0, voice: null, el: null };
  const READ_BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,tr,pre,.mermaid-diagram-container';
  const speechSupported = () => !!(window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function');

  function ownText(li) {
    const c = li.cloneNode(true);
    c.querySelectorAll('ul, ol, input').forEach((n) => n.remove());
    return c.textContent;
  }

  // Preview blocks, in document order, as the plain descriptors MdA11y.buildSegments understands (BR2.6).
  function describeBlocks(root) {
    const out = [];
    root.querySelectorAll(READ_BLOCKS).forEach((el) => {
      if (el.closest('.mdw-attribution-footer, [hidden]')) return;
      const diagram = el.closest('.mermaid-diagram-container');
      if (diagram && diagram !== el) return;
      const pre = el.closest('pre');
      if (pre && pre !== el) return;
      const tag = el.tagName.toLowerCase();
      const label = el.getAttribute('aria-label');
      if (el.classList.contains('mermaid-diagram-container')) out.push({ kind: 'diagramNotice', element: el });
      else if (tag === 'pre') out.push({ kind: 'codeNotice', element: el });
      else if (/^h[1-6]$/.test(tag)) out.push({ kind: 'heading', text: el.textContent, label, element: el });
      else if (tag === 'tr') {
        if (el.querySelector('th')) return;                                   // the header row is read as the "title:" of each cell
        const table = el.closest('table');
        const headRow = table && table.querySelector('tr');
        const headers = headRow ? Array.from(headRow.children).map((c) => c.textContent) : [];
        out.push({ kind: 'tableRow', headers, cells: Array.from(el.children).map((c) => c.textContent), element: el });
      } else if (tag === 'li') {
        const box = el.querySelector(':scope > input[type="checkbox"]');
        out.push({ kind: box ? 'task' : 'listItem', checked: !!(box && box.checked), text: ownText(el), label, element: el });
      } else if (tag === 'blockquote') {
        if (el.querySelector('p, li, h1, h2, h3, h4, h5, h6')) return;
        out.push({ kind: 'quote', text: el.textContent, label, element: el });
      } else if (tag === 'p') {
        if (el.closest('li')) return;
        out.push({ kind: 'paragraph', text: el.textContent, label, element: el });
      }
    });
    return out;
  }

  function setReadingState(s) {
    reading.state = s;
    const pill = byId('ax-stop-pill');
    if (pill) pill.hidden = s === 'idle';
    if (ui.read) {
      ui.read.textContent = s === 'idle' ? STR.readStart : STR.readStop;
      ui.read.setAttribute('aria-pressed', s === 'idle' ? 'false' : 'true');
      ui.read.setAttribute('aria-label', s === 'idle' ? STR.readLabel : STR.readStopLabel);
      ui.pause.disabled = s === 'idle';
      ui.pause.textContent = s === 'paused' ? STR.readResume : STR.readPause;
      ui.pause.setAttribute('aria-label', s === 'paused' ? STR.readResumeLabel : STR.readPauseLabel);
    }
    refreshIcon();
  }

  function clearHighlight() {
    if (reading.el) reading.el.classList.remove('ax-reading');
    reading.el = null;
  }

  function highlight(el) {
    clearHighlight();
    if (!el) return;
    el.classList.add('ax-reading');
    reading.el = el;
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }

  function finishReading() {
    clearHighlight();
    setReadingState('idle');
    notify(STR.readEnd, { announce: true });
  }

  function speakPart(sid) {
    if (sid !== reading.session) return;
    if (reading.part >= reading.parts.length) { nextSegment(sid); return; }
    const u = new window.SpeechSynthesisUtterance(reading.parts[reading.part]);
    u.lang = 'he-IL';
    if (reading.voice) u.voice = reading.voice;
    const advance = () => { if (sid !== reading.session) return; reading.part++; speakPart(sid); };
    u.onend = advance;
    u.onerror = (ev) => { if (ev && (ev.error === 'interrupted' || ev.error === 'canceled')) return; advance(); };
    window.speechSynthesis.speak(u);
  }

  function nextSegment(sid) {
    if (sid !== reading.session) return;
    reading.index++;
    if (reading.index >= reading.segments.length) { finishReading(); return; }
    const seg = reading.segments[reading.index];
    highlight(seg.target);
    reading.parts = A.splitForSpeech(seg.text, A.MAX_SPEECH_CHARS);
    reading.part = 0;
    speakPart(sid);
  }

  function hebrewVoice() {
    let voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (_) { voices = []; }
    return voices.find((v) => /^(he|iw)([-_]|$)/i.test(v.lang || '')) || null;
  }

  function startReading() {
    if (!speechSupported() || reading.state !== 'idle') return;
    const root = state.deps.previewRoot || byId('preview-content');
    const segments = A.buildSegments(describeBlocks(root));
    if (!segments.length) { notify(STR.readEmpty, { announce: true }); return; }
    reading.session++;
    reading.segments = segments;
    reading.index = -1;
    reading.voice = hebrewVoice();
    setReadingState('reading');
    notify(reading.voice ? STR.readBegan : STR.noHebrewVoice, { announce: true });
    nextSegment(reading.session);
  }

  // focusIcon: after stopping from the pill the pill disappears, so focus goes to the accessibility icon
  function stopReading(focusIcon) {
    if (reading.state === 'idle') return;
    const wasPaused = reading.state === 'paused';
    reading.session++;
    try { window.speechSynthesis.cancel(); if (wasPaused) window.speechSynthesis.resume(); } catch (_) { /* nothing to stop */ }
    clearHighlight();
    setReadingState('idle');
    if (focusIcon) byId(ICONS.a11y).focus();
  }

  function togglePause() {
    if (reading.state === 'reading') { window.speechSynthesis.pause(); setReadingState('paused'); }
    else if (reading.state === 'paused') { window.speechSynthesis.resume(); setReadingState('reading'); }
  }

  function buildReadRow() {
    ui.read = h('button', { type: 'button', id: 'ax-read', class: 'ax-btn ax-grow', 'aria-pressed': 'false', 'aria-label': STR.readLabel, text: STR.readStart, testid: 'ax-read', on: { click: () => (reading.state === 'idle' ? startReading() : stopReading(false)) } });
    ui.pause = h('button', { type: 'button', id: 'ax-pause', class: 'ax-btn', 'aria-label': STR.readPauseLabel, text: STR.readPause, disabled: true, testid: 'ax-pause', on: { click: togglePause } });
    ui.hint = h('p', { id: 'ax-read-hint', class: 'ax-hint', text: STR.readUnsupported, hidden: true, testid: 'ax-read-hint' });
    if (!speechSupported()) {
      ui.read.disabled = true;
      ui.hint.hidden = false;
      ui.read.setAttribute('aria-describedby', 'ax-read-hint');
    }
    return h('div', { class: 'ax-row' }, h('p', { class: 'ax-row-l', text: STR.readTitle }), h('div', { class: 'ax-read' }, ui.read, ui.pause), ui.hint);
  }

  function resetAll() {
    stopReading(false);
    setPrefs(A.reset());
    reflectPrefs();
    notify(STR.resetDone, { announce: true });
  }

  /* ------------------------------------------------------------------ skip link (BR2.9) */

  function skipTarget() {
    const ws = byId('workspace-main');
    if (ws && ws.getAttribute('data-layout') === 'preview-only') return byId('preview-content');
    if (ws && ws.getAttribute('data-editor-mode') === 'visual' && ws.getAttribute('data-layout') !== 'preview-only') return byId('visual-editor');
    return byId('markdown-input');
  }

  function bindSkip() {
    const link = document.querySelector('.ax-skip');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const t = skipTarget();
      if (!t) return;
      if (!t.hasAttribute('tabindex') && !/^(TEXTAREA|INPUT|BUTTON|SELECT|A)$/.test(t.tagName) && t.getAttribute('contenteditable') !== 'true') t.setAttribute('tabindex', '-1');
      t.focus();
    });
  }

  /* ------------------------------------------------------------------ the single Escape handler (BR2.13) */

  function onEscape(e) {
    if (e.key !== 'Escape' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.isComposing || e.keyCode === 229) return;        // IME composition: not ours
    if (modalIsOpen()) return;                             // the modal closes itself; reading goes on
    if (state.open !== 'none') { e.preventDefault(); e.stopPropagation(); closePanel(true); return; }
    if (reading.state !== 'idle') { e.preventDefault(); e.stopPropagation(); stopReading(false); }
    // otherwise: not ours, the visual editor's own Escape (release focus) runs
  }

  /* ------------------------------------------------------------------ init */

  function init(deps) {
    state.deps = deps || {};
    let storage = null;
    try { storage = window.localStorage; } catch (_) { storage = null; }
    state.store = A.createPrefsStore(storage, { warn: (...a) => console.warn(...a) });
    state.prefs = state.store.load();
    applyPrefs(state.prefs);
    buildA11yPanel();
    const pill = byId('ax-stop-pill');
    if (pill) pill.addEventListener('click', () => stopReading(true));
    bindPanels();
    bindSkip();
    document.addEventListener('keydown', onEscape, true);
    refreshIcon();
  }

  window.MdA11yUI = {
    init, STR, h, notify, announce,
    panels: { open: openPanel, close: closePanel, current: () => state.open, modalIsOpen },
    prefs: () => Object.assign({}, state.prefs),
    readingState: () => reading.state,
    refreshIcon
  };
})();
