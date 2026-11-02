/* a11y.js — MD Workspace (v4.7.0)
 * Pure logic of the accessibility panel (preferences, zoom levels, speech segments, WCAG contrast).
 * No DOM access here, so it runs under `node --test` and in the browser alike (BR7.9).
 * The DOM part lives in a11y-ui.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MdA11y = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ A11yPrefs */

  const THEMES = Object.freeze(['system', 'light', 'dark']);
  const ZOOM_LEVELS = Object.freeze([90, 100, 115, 130, 150]);
  const DEFAULT_THEME = 'system';
  const DEFAULT_ZOOM = 100;

  function reset() {
    return { theme: DEFAULT_THEME, highContrast: false, zoom: DEFAULT_ZOOM };
  }

  // Any invalid field falls back to its own default (BR2.2). Values read from storage are strings.
  function normalizePrefs(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const prefs = reset();
    if (THEMES.includes(src.theme)) prefs.theme = src.theme;
    if (src.highContrast === true || src.highContrast === '1') prefs.highContrast = true;
    const zoom = Number(src.zoom);
    if (ZOOM_LEVELS.includes(zoom)) prefs.zoom = zoom;
    return prefs;
  }

  function isDefault(prefs) {
    const p = normalizePrefs(prefs);
    return p.theme === DEFAULT_THEME && !p.highContrast && p.zoom === DEFAULT_ZOOM;
  }

  function zoomIndex(zoom) {
    const i = ZOOM_LEVELS.indexOf(Number(zoom));
    return i < 0 ? ZOOM_LEVELS.indexOf(DEFAULT_ZOOM) : i;
  }

  // dir: 'in' (larger), 'out' (smaller) or 'reset'. Stops at the ends (BR2.4).
  function nextZoom(zoom, dir) {
    const i = zoomIndex(zoom);
    if (dir === 'in') return ZOOM_LEVELS[Math.min(i + 1, ZOOM_LEVELS.length - 1)];
    if (dir === 'out') return ZOOM_LEVELS[Math.max(i - 1, 0)];
    return DEFAULT_ZOOM;
  }

  function canZoom(zoom, dir) {
    const i = zoomIndex(zoom);
    if (dir === 'in') return i < ZOOM_LEVELS.length - 1;
    if (dir === 'out') return i > 0;
    return true;
  }

  /* ------------------------------------------------------------------ storage adapter */

  const STORAGE_KEYS = Object.freeze({ theme: 'mdw_theme', highContrast: 'mdw_a11y_hc', zoom: 'mdw_a11y_zoom' });
  const toStored = {
    theme: (p) => p.theme,
    highContrast: (p) => (p.highContrast ? '1' : '0'),
    zoom: (p) => String(p.zoom)
  };

  // storage: anything with getItem / setItem (localStorage), or null. Nothing here throws (BR2.12, NFR8.5):
  // a blocked or full storage degrades to memory only. The log never contains preference values (NFR9.7).
  function createPrefsStore(storage, opts) {
    const warn = opts && typeof opts.warn === 'function' ? opts.warn : function () {};
    const usable = !!storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
    const memOnly = new Set();   // fields whose last write failed: memory is newer than storage
    let memory = null;
    const store = { persistent: usable, load, save };

    function logFailure(what, err) {
      store.persistent = false;
      warn('[mdw-a11y]', what, err && err.name, err && err.message);
    }

    function readField(field) {
      if (memory && (!usable || memOnly.has(field))) return memory[field];
      if (!usable) return undefined;
      try { return storage.getItem(STORAGE_KEYS[field]); } catch (err) { logFailure('storage-read', err); return memory ? memory[field] : undefined; }
    }

    function load() {
      const raw = {};
      Object.keys(STORAGE_KEYS).forEach((field) => { raw[field] = readField(field); });
      return normalizePrefs(raw);
    }

    function save(prefs) {
      const kept = normalizePrefs(prefs);
      memory = kept;
      if (!usable) return kept;
      let allWritten = true;
      Object.keys(STORAGE_KEYS).forEach((field) => {
        try {
          storage.setItem(STORAGE_KEYS[field], toStored[field](kept));
          memOnly.delete(field);
        } catch (err) {
          allWritten = false;
          memOnly.add(field);
          logFailure('storage-write', err);
        }
      });
      if (allWritten) store.persistent = true;
      return kept;
    }

    return store;
  }

  /* ------------------------------------------------------------------ WCAG contrast */

  function parseHex(colour) {
    let h = String(colour == null ? '' : colour).trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/(.)/g, '$1$1');
    if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error('Invalid colour: ' + colour);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }

  // Relative luminance of an sRGB colour (WCAG 2.1 definition).
  function luminance(colour) {
    const [r, g, b] = parseHex(colour).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(fg, bg) {
    const a = luminance(fg);
    const b = luminance(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /* ------------------------------------------------------------------ speech */

  const SEGMENT_KINDS = Object.freeze(['heading', 'paragraph', 'listItem', 'task', 'quote', 'tableRow', 'codeNotice', 'diagramNotice']);
  const SPEECH_TEXT = Object.freeze({
    taskOpen: 'משימה פתוחה: ',
    taskDone: 'משימה סגורה: ',
    code: 'בלוק קוד',
    diagram: 'תרשים'
  });
  const MAX_SPEECH_CHARS = 200;

  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  function tableRowText(d) {
    const headers = Array.isArray(d.headers) ? d.headers : [];
    const cells = Array.isArray(d.cells) ? d.cells : [];
    return cells.map((cell, i) => {
      const value = clean(cell);
      const head = clean(headers[i]);
      if (!value) return '';
      return head ? head + ': ' + value : value;
    }).filter(Boolean).join('. ');
  }

  function segmentText(d) {
    if (d.kind === 'codeNotice') return SPEECH_TEXT.code;
    if (d.kind === 'diagramNotice') return SPEECH_TEXT.diagram;
    if (d.kind === 'tableRow') return tableRowText(d);
    const text = clean(d.label) || clean(d.text);
    if (!text) return '';
    if (d.kind === 'task') return (d.checked ? SPEECH_TEXT.taskDone : SPEECH_TEXT.taskOpen) + text;
    return text;
  }

  // descriptors: [{kind, text, label?, checked?, headers?, cells?, element}] in document order -> [{kind, text, target}]
  function buildSegments(descriptors) {
    if (!Array.isArray(descriptors)) return [];
    const out = [];
    descriptors.forEach((d) => {
      if (!d || !SEGMENT_KINDS.includes(d.kind)) return;
      const text = segmentText(d);
      if (text) out.push({ kind: d.kind, text, target: d.element });
    });
    return out;
  }

  // Last sentence end (. ? ! :) followed by whitespace that fits in max; else last whitespace; else a hard cut.
  function cutPoint(rest, max) {
    for (let i = max - 1; i >= 1; i--) {
      if (/[.?!:]/.test(rest[i]) && /\s/.test(rest[i + 1])) return i + 1;
    }
    for (let i = max; i >= 1; i--) {
      if (/\s/.test(rest[i])) return i;
    }
    const code = rest.charCodeAt(max - 1);
    return code >= 0xD800 && code <= 0xDBFF ? max - 1 : max;
  }

  function splitForSpeech(text, max) {
    const limit = max > 1 ? max : MAX_SPEECH_CHARS;
    const parts = [];
    let rest = clean(text);
    while (rest.length > limit) {
      const at = cutPoint(rest, limit);
      parts.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  return {
    THEMES, ZOOM_LEVELS, STORAGE_KEYS, SEGMENT_KINDS, MAX_SPEECH_CHARS,
    normalizePrefs, isDefault, nextZoom, canZoom, reset, createPrefsStore,
    contrast, buildSegments, splitForSpeech
  };
});
