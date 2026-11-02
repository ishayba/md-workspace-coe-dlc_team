// v4.7.0 — a11y.js: pure accessibility logic (preferences, storage adapter, speech segments, contrast).
const test = require('node:test');
const assert = require('node:assert/strict');

test('a11y.js loads in node without window/document and exports an object (NFR11.1)', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  const A = require('../a11y');
  assert.equal(typeof A, 'object');
});

const A = require('../a11y');

/* ------------------------------------------------------------------ A11yPrefs (data model) */

test('normalizePrefs: valid values are kept as they are (BR2.2)', () => {
  assert.deepEqual(A.normalizePrefs({ theme: 'dark', highContrast: true, zoom: 130 }), { theme: 'dark', highContrast: true, zoom: 130 });
  assert.deepEqual(A.normalizePrefs({ theme: 'light', highContrast: false, zoom: 90 }), { theme: 'light', highContrast: false, zoom: 90 });
});

test('normalizePrefs: an invalid value becomes the default of that field only (BR2.2)', () => {
  assert.deepEqual(A.normalizePrefs({ theme: 'purple', highContrast: 'yes', zoom: 999 }), { theme: 'system', highContrast: false, zoom: 100 });
  assert.deepEqual(A.normalizePrefs({ theme: 'dark', zoom: 999 }), { theme: 'dark', highContrast: false, zoom: 100 });
  assert.deepEqual(A.normalizePrefs(null), { theme: 'system', highContrast: false, zoom: 100 });
  assert.deepEqual(A.normalizePrefs(undefined), { theme: 'system', highContrast: false, zoom: 100 });
});

test('normalizePrefs: storage strings are converted ("1"/"0", "130") (BR2.12)', () => {
  assert.deepEqual(A.normalizePrefs({ theme: 'dark', highContrast: '1', zoom: '115' }), { theme: 'dark', highContrast: true, zoom: 115 });
  assert.equal(A.normalizePrefs({ highContrast: '0' }).highContrast, false);
  assert.equal(A.normalizePrefs({ zoom: '99' }).zoom, 100);
});

test('normalizePrefs: a theme saved by the previous version (mdw_theme light/dark) survives the upgrade (BR2.2, NFR10.3)', () => {
  assert.equal(A.normalizePrefs({ theme: 'light' }).theme, 'light');
  assert.equal(A.normalizePrefs({ theme: 'dark' }).theme, 'dark');
  assert.equal(A.normalizePrefs({ theme: 'Dark ' }).theme, 'system');
});

test('ZOOM_LEVELS: five levels, ascending, and 100 is among them (BR2.4)', () => {
  assert.deepEqual([...A.ZOOM_LEVELS], [90, 100, 115, 130, 150]);
  assert.ok(Object.isFrozen(A.ZOOM_LEVELS));
});

test('nextZoom: in / out move one level, and stop at the ends (BR2.4)', () => {
  assert.equal(A.nextZoom(100, 'in'), 115);
  assert.equal(A.nextZoom(115, 'out'), 100);
  assert.equal(A.nextZoom(150, 'in'), 150);
  assert.equal(A.nextZoom(90, 'out'), 90);
  assert.equal(A.nextZoom(130, 'in'), 150);
});

test('nextZoom: reset returns 100, and an unknown current level is treated as 100 (BR2.4)', () => {
  assert.equal(A.nextZoom(150, 'reset'), 100);
  assert.equal(A.nextZoom(90, 'reset'), 100);
  assert.equal(A.nextZoom(777, 'in'), 115);
  assert.equal(A.nextZoom(100, 'sideways'), 100);
});

test('canZoom: false at the ends so the buttons can be aria-disabled (BR2.4)', () => {
  assert.equal(A.canZoom(150, 'in'), false);
  assert.equal(A.canZoom(150, 'out'), true);
  assert.equal(A.canZoom(90, 'out'), false);
  assert.equal(A.canZoom(100, 'in'), true);
});

test('isDefault: true only for system / no high contrast / 100 (BR1.6)', () => {
  assert.equal(A.isDefault({ theme: 'system', highContrast: false, zoom: 100 }), true);
  assert.equal(A.isDefault({ theme: 'dark', highContrast: false, zoom: 100 }), false);
  assert.equal(A.isDefault({ theme: 'system', highContrast: true, zoom: 100 }), false);
  assert.equal(A.isDefault({ theme: 'system', highContrast: false, zoom: 115 }), false);
});

test('reset: returns fresh defaults every time (BR2.10)', () => {
  const a = A.reset();
  assert.deepEqual(a, { theme: 'system', highContrast: false, zoom: 100 });
  a.theme = 'dark';
  assert.equal(A.reset().theme, 'system');
  assert.equal(A.isDefault(A.reset()), true);
});

/* ------------------------------------------------------------------ prefs store (repository) */

function memoryStorage(initial, opts) {
  const data = Object.assign({}, initial);
  const o = opts || {};
  return {
    data,
    getItem(k) { if (o.failGet) throw new Error('blocked'); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { if (o.failSet) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } data[k] = String(v); }
  };
}

test('createPrefsStore: load reads the three storage keys (BR2.12)', () => {
  const st = memoryStorage({ mdw_theme: 'dark', mdw_a11y_hc: '1', mdw_a11y_zoom: '130' });
  assert.deepEqual(A.createPrefsStore(st).load(), { theme: 'dark', highContrast: true, zoom: 130 });
});

test('createPrefsStore: empty storage gives the defaults; garbage values give the defaults (BR2.2)', () => {
  assert.deepEqual(A.createPrefsStore(memoryStorage({})).load(), A.reset());
  assert.deepEqual(A.createPrefsStore(memoryStorage({ mdw_a11y_zoom: '999', mdw_theme: 'x', mdw_a11y_hc: 'maybe' })).load(), A.reset());
});

test('createPrefsStore: the key of the previous version (mdw_theme=light) is read as is (NFR10.3)', () => {
  assert.equal(A.createPrefsStore(memoryStorage({ mdw_theme: 'light' })).load().theme, 'light');
});

test('createPrefsStore: save writes exactly the three keys with storage-friendly values (NFR9.9)', () => {
  const st = memoryStorage({});
  A.createPrefsStore(st).save({ theme: 'dark', highContrast: true, zoom: 115 });
  assert.deepEqual(st.data, { mdw_theme: 'dark', mdw_a11y_hc: '1', mdw_a11y_zoom: '115' });
  A.createPrefsStore(st).save({ theme: 'system', highContrast: false, zoom: 100 });
  assert.deepEqual(st.data, { mdw_theme: 'system', mdw_a11y_hc: '0', mdw_a11y_zoom: '100' });
});

test('createPrefsStore: save normalises before writing and returns what it kept', () => {
  const st = memoryStorage({});
  const kept = A.createPrefsStore(st).save({ theme: 'neon', highContrast: true, zoom: 5 });
  assert.deepEqual(kept, { theme: 'system', highContrast: true, zoom: 100 });
  assert.equal(st.data.mdw_theme, 'system');
});

test('createPrefsStore: setItem that throws (QuotaExceededError) does not throw; the value lives in memory (NFR8.5)', () => {
  const warnings = [];
  const store = A.createPrefsStore(memoryStorage({ mdw_theme: 'light' }, { failSet: true }), { warn: (...a) => warnings.push(a) });
  assert.doesNotThrow(() => store.save({ theme: 'dark', highContrast: true, zoom: 150 }));
  assert.deepEqual(store.load(), { theme: 'dark', highContrast: true, zoom: 150 });   // not the stale "light"
  assert.equal(store.persistent, false);
  assert.ok(warnings.length >= 1);
  assert.equal(warnings[0][0], '[mdw-a11y]');
  assert.ok(warnings.every((w) => !/dark|150/.test(JSON.stringify(w))), 'no values in the log');
});

test('createPrefsStore: getItem that throws gives defaults, and later saves still work in memory (BR2.12)', () => {
  const store = A.createPrefsStore(memoryStorage({}, { failGet: true }));
  assert.deepEqual(store.load(), A.reset());
  store.save({ theme: 'light', highContrast: false, zoom: 90 });
  assert.equal(store.load().zoom, 90);
});

test('createPrefsStore: a null / undefined / foreign storage works as memory only (BR2.12)', () => {
  for (const st of [null, undefined, {}, { getItem: 5 }]) {
    const store = A.createPrefsStore(st);
    assert.deepEqual(store.load(), A.reset());
    assert.doesNotThrow(() => store.save({ theme: 'dark', highContrast: false, zoom: 100 }));
    assert.equal(store.load().theme, 'dark');
    assert.equal(store.persistent, false);
  }
});

test('createPrefsStore: a working storage is reported as persistent; one failed write does not poison later good ones', () => {
  const st = memoryStorage({});
  const store = A.createPrefsStore(st);
  assert.equal(store.persistent, true);
  let fail = true;
  const flaky = { getItem: (k) => st.getItem(k), setItem: (k, v) => { if (fail) throw new Error('x'); st.setItem(k, v); } };
  const s2 = A.createPrefsStore(flaky);
  s2.save({ theme: 'dark', highContrast: false, zoom: 100 });
  assert.equal(s2.persistent, false);
  fail = false;
  s2.save({ theme: 'light', highContrast: false, zoom: 100 });
  assert.equal(st.data.mdw_theme, 'light');
  assert.equal(s2.load().theme, 'light');
});

/* ------------------------------------------------------------------ contrast, speech segments (business logic) */

test('contrast: black on white is 21, white on white is 1, order does not matter (NFR2.1)', () => {
  assert.equal(A.contrast('#000000', '#ffffff'), 21);
  assert.equal(A.contrast('#ffffff', '#000000'), 21);
  assert.equal(A.contrast('#ffffff', '#ffffff'), 1);
});

test('contrast: #767676 on white is 4.54 — the smallest grey that passes AA (NFR2.1)', () => {
  assert.equal(A.contrast('#767676', '#ffffff').toFixed(2), '4.54');
  assert.ok(A.contrast('#777777', '#ffffff') < 4.5);
});

test('contrast: short hex (#fff), upper case and missing "#" are understood; garbage throws', () => {
  assert.equal(A.contrast('#fff', '#000'), 21);
  assert.equal(A.contrast('FFFFFF', '000000'), 21);
  assert.equal(A.contrast('#0F172A', '#F8FAFC').toFixed(2), A.contrast('#0f172a', '#f8fafc').toFixed(2));
  assert.throws(() => A.contrast('red', '#fff'), /colour/i);
  assert.throws(() => A.contrast('#12345', '#fff'), /colour/i);
});

const el = (name) => ({ name });

test('buildSegments: heading, paragraph, list item and quote use their text, in document order (BR2.6)', () => {
  const a = el('h'); const b = el('p'); const c = el('li'); const d = el('q');
  const segs = A.buildSegments([
    { kind: 'heading', text: ' כותרת ', element: a },
    { kind: 'paragraph', text: 'פסקה', element: b },
    { kind: 'listItem', text: 'פריט', element: c },
    { kind: 'quote', text: 'ציטוט', element: d }
  ]);
  assert.deepEqual(segs.map((s) => [s.kind, s.text]), [['heading', 'כותרת'], ['paragraph', 'פסקה'], ['listItem', 'פריט'], ['quote', 'ציטוט']]);
  assert.equal(segs[0].target, a);
  assert.equal(segs[3].target, d);
});

test('buildSegments: an aria-label wins over the visible text (BR2.6)', () => {
  const [s] = A.buildSegments([{ kind: 'paragraph', text: '★★★', label: 'דירוג שלושה מתוך חמישה', element: el('p') }]);
  assert.equal(s.text, 'דירוג שלושה מתוך חמישה');
});

test('buildSegments: tasks are announced as open / closed (BR2.6)', () => {
  const segs = A.buildSegments([
    { kind: 'task', checked: false, text: 'לכתוב בדיקות', element: el('a') },
    { kind: 'task', checked: true, text: 'לאשר', element: el('b') }
  ]);
  assert.equal(segs[0].text, 'משימה פתוחה: לכתוב בדיקות');
  assert.equal(segs[1].text, 'משימה סגורה: לאשר');
});

test('buildSegments: a table row is read as "header: value" pairs; empty cells are skipped (BR2.6)', () => {
  const [s] = A.buildSegments([{ kind: 'tableRow', headers: ['תצורה', 'רשת', 'עריכה'], cells: ['MD Workspace', '', 'נתמך'], element: el('tr') }]);
  assert.equal(s.kind, 'tableRow');
  assert.equal(s.text, 'תצורה: MD Workspace. עריכה: נתמך');
  const [noHead] = A.buildSegments([{ kind: 'tableRow', headers: [], cells: ['א', 'ב'], element: el('tr') }]);
  assert.equal(noHead.text, 'א. ב');
});

test('buildSegments: code and diagrams are only announced, never read out (BR2.6)', () => {
  const segs = A.buildSegments([
    { kind: 'codeNotice', text: 'const secret = 1;', element: el('pre') },
    { kind: 'diagramNotice', text: 'A --> B', element: el('d') }
  ]);
  assert.deepEqual(segs.map((s) => s.text), ['בלוק קוד', 'תרשים']);
});

test('buildSegments: an empty segment is skipped; unknown kinds are skipped; null input gives []', () => {
  const segs = A.buildSegments([
    { kind: 'paragraph', text: '   ', element: el('p') },
    { kind: 'heading', text: '', element: el('h') },
    { kind: 'nonsense', text: 'x', element: el('x') },
    null,
    { kind: 'paragraph', text: 'נשאר', element: el('p') }
  ]);
  assert.deepEqual(segs.map((s) => s.text), ['נשאר']);
  assert.deepEqual(A.buildSegments(null), []);
  assert.deepEqual(A.buildSegments([]), []);
});

test('splitForSpeech: a short text stays one piece; blank text gives none (NFR8.6)', () => {
  assert.deepEqual(A.splitForSpeech('שלום עולם', 200), ['שלום עולם']);
  assert.deepEqual(A.splitForSpeech('   ', 200), []);
  assert.deepEqual(A.splitForSpeech('', 200), []);
});

test('splitForSpeech: splits at the last sentence end (. ? ! :) inside the limit (NFR8.6)', () => {
  const text = 'המשפט הראשון הוא קצר. המשפט השני הוא ארוך יותר? המשפט השלישי! ואחרון: סוף';
  const parts = A.splitForSpeech(text, 50);
  assert.ok(parts.length >= 2);
  assert.ok(parts.every((p) => p.length <= 50), JSON.stringify(parts));
  // greedy: the last sentence end that still fits in 50 characters
  assert.equal(parts[0], 'המשפט הראשון הוא קצר. המשפט השני הוא ארוך יותר?');
  assert.ok(parts.slice(0, -1).every((p) => /[.?!:]$/.test(p)), JSON.stringify(parts));
  assert.equal(parts.join(' '), text);
});

test('splitForSpeech: without a sentence end it cuts at the last space before the limit (NFR8.6)', () => {
  const words = Array.from({ length: 60 }, (_, i) => 'מילה' + i).join(' ');
  const parts = A.splitForSpeech(words, 200);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= 200));
  assert.equal(parts.join(' '), words);
  assert.ok(parts.every((p) => !/^\s|\s$/.test(p)));
});

test('splitForSpeech: a single word longer than the limit is cut hard, never inside a surrogate pair (NFR8.6)', () => {
  const long = 'א'.repeat(450);
  const parts = A.splitForSpeech(long, 200);
  assert.deepEqual(parts.map((p) => p.length), [200, 200, 50]);
  const emoji = '😀'.repeat(150);   // 300 UTF-16 units
  const eparts = A.splitForSpeech(emoji, 201);
  assert.equal(eparts.join(''), emoji);
  assert.ok(eparts.every((p) => !/[\uD800-\uDBFF]$/.test(p) && !/^[\uDC00-\uDFFF]/.test(p)));
});

test('splitForSpeech: the default limit is 200 characters', () => {
  const parts = A.splitForSpeech(Array.from({ length: 80 }, () => 'word').join(' '));
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 200));
});
