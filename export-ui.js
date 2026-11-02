/* export-ui.js — MD Workspace (v4.7.0)
 * DOM part of the export feature: the export panel with six tiles, the ExportJob (one file at a time, busy state with a
 * yield so it can be painted and announced) and the print head. The pure parts (blocks, Markdown, docx, ZIP, names) are in
 * export-core.js (MdExport); the two HTML builders stay in index.html and arrive through deps. Started from the main
 * script with MdExportUI.init(deps). The panel itself (open, close, Esc, focus) is the shared one from a11y-ui.js.
 */
(function () {
  'use strict';

  /* All user-visible Hebrew text lives here (frontend-components.md §4). */
  const STR = {
    iconLabel: 'ייצוא',
    busyLabel: 'מייצר קובץ…',
    empty: 'המסמך ריק',
    pdfGuide: 'בחרו "שמירה כ-PDF" בחלון ההדפסה',
    busyDesc: 'ייצוא אחר בתהליך',
    noDownloadDesc: 'הורדה לא זמינה',
    pdfFile: 'הורדת קובץ מוכן ל-PDF',
    kind: { pdf: 'PDF', 'pdf-file': 'PDF', html: 'HTML', live: 'HTML חי', md: 'Markdown', docx: 'Word', print: 'הדפסה' },
    done: (kind, name) => '✓ קובץ ' + kind + ' נוצר: ' + name,
    failed: (kind) => 'לא הצלחנו ליצור את קובץ ה-' + kind + '. נסו שוב.',
    failedPrint: 'לא הצלחנו לפתוח את חלון ההדפסה. נסו שוב.',
    asOf: 'נכון ל-'
  };

  // order = the order of the tiles (BR3.1)
  const TILES = [
    { format: 'pdf', badge: 'PDF', badgeClass: 'b-pdf', name: 'PDF', desc: 'חלון הדפסה ← "שמירה כ-PDF"', aria: 'ייצוא ל-PDF, דרך חלון ההדפסה', download: false },
    { format: 'html', badge: 'HTML', badgeClass: 'b-html', name: 'HTML לצפייה בלבד', desc: 'קובץ אחד, בלי סקריפטים', aria: 'ייצוא HTML לצפייה בלבד, קובץ html', download: true },
    { format: 'live', badge: 'HTML', badgeClass: 'b-live', name: 'HTML חי', desc: 'עם סרגל צף ומצב עריכה', aria: 'ייצוא HTML חי, קובץ html עם מצב עריכה', download: true },
    { format: 'print', badge: 'PRINT', badgeClass: 'b-print', name: 'הדפסה', desc: 'המסמך בלבד, בלי סרגלים', aria: 'הדפסת המסמך', download: false },
    { format: 'md', badge: 'MD', badgeClass: 'b-md', name: 'Markdown', desc: 'עטוף RTL, עם כותרת ותאריך', aria: 'ייצוא ל-Markdown, קובץ md', download: true },
    { format: 'docx', badge: 'DOCX', badgeClass: 'b-docx', name: 'Word', desc: 'קובץ docx אמיתי, טבלאות מימין לשמאל', aria: 'ייצוא ל-Word, קובץ docx', download: true }
  ];

  const MIME = {
    md: 'text/markdown;charset=utf-8',
    html: 'text/html;charset=utf-8',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  const E = window.MdExport;
  const byId = (id) => document.getElementById(id);
  const job = { state: 'idle' };      // SM3: idle | busy | done | failed (done and failed fall back to idle at once)
  let deps = {};
  let tiles = [];                      // [{def, button, desc}]
  let pdfFileLink = null;
  let printHead = null;
  let downloadOk = true;

  /* ------------------------------------------------------------------ DOM */

  // the Word tile shows ".docx" in its own LTR <bdi>, so the dot and the Latin letters keep their place inside Hebrew text
  function fillDescription(el, def) {
    if (def.format !== 'docx') { el.textContent = def.desc; return; }
    const bdi = document.createElement('bdi');
    bdi.setAttribute('dir', 'ltr');
    bdi.textContent = '.docx';
    el.replaceChildren('קובץ ', bdi, ' אמיתי, טבלאות מימין לשמאל');
  }

  function buildPanel() {
    const h = window.MdA11yUI.h;
    const body = byId('panel-export-body');
    const grid = h('div', { class: 'ex-tiles', testid: 'export-tiles' });
    TILES.forEach((def) => {
      const descId = 'ex-desc-' + def.format;
      const descEl = h('small', { id: descId });
      fillDescription(descEl, def);
      const button = h('button', {
        type: 'button', class: 'ex-tile', 'data-format': def.format, 'aria-label': def.aria, 'aria-describedby': descId, 'aria-disabled': 'false', testid: 'export-tile-' + def.format,
        on: { click: () => choose(def.format) }
      }, h('span', { class: 'ex-badge ' + def.badgeClass, text: def.badge }), h('b', { text: def.name }), descEl);
      tiles.push({ def, button, desc: descEl });
      const cell = h('div', { class: 'ex-cell' }, button);
      if (def.format === 'pdf') {
        pdfFileLink = h('button', { type: 'button', class: 'ex-sub', 'data-format': 'pdf-file', 'aria-disabled': 'false', text: STR.pdfFile, testid: 'export-pdf-file', on: { click: () => choose('pdf-file') } });
        cell.append(pdfFileLink);
      }
      grid.append(cell);
    });
    body.append(grid);

    // the head that only shows in print (BR4.2): title and "as of" date
    printHead = h('div', { class: 'print-head', 'aria-hidden': 'true', testid: 'print-head' }, h('span', { class: 'print-head-title' }), h('span', { class: 'print-head-asof' }));
    const pane = byId('preview-container');
    if (pane) pane.insertBefore(printHead, pane.firstChild);
  }

  // tiles are not usable while a job runs, and the download tiles need the browser to support downloads (NFR8.4)
  function refreshTiles() {
    downloadOk = E.canDownload().ok;
    tiles.forEach(({ def, button, desc }) => {
      const why = job.state === 'busy' ? STR.busyDesc : (def.download && !downloadOk ? STR.noDownloadDesc : null);
      button.setAttribute('aria-disabled', why ? 'true' : 'false');
      if (why) desc.textContent = why; else fillDescription(desc, def);
    });
    const linkOff = job.state === 'busy' || !downloadOk;
    pdfFileLink.setAttribute('aria-disabled', linkOff ? 'true' : 'false');
  }

  function setBusy(on) {
    const icon = byId('btn-export');
    const label = icon.querySelector('.hdr-lbl');
    if (on) {
      icon.setAttribute('aria-busy', 'true');
      icon.setAttribute('aria-label', STR.busyLabel);
      if (label) label.textContent = STR.busyLabel;
    } else {
      icon.removeAttribute('aria-busy');
      icon.setAttribute('aria-label', STR.iconLabel);
      if (label) label.textContent = STR.iconLabel;
    }
    refreshTiles();
  }

  /* ------------------------------------------------------------------ job */

  // two animation frames: the busy state gets painted and announced before the synchronous build starts (BR4.6).
  // A timer backs each frame up, because a hidden tab does not run animation frames.
  function frame() {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(); } };
      requestAnimationFrame(fin);
      setTimeout(fin, 120);
    });
  }

  function updatePrintHead(title, asOf) {
    printHead.querySelector('.print-head-title').textContent = title;
    printHead.querySelector('.print-head-asof').textContent = STR.asOf + asOf;
  }

  function htmlOptions(title, asOf) {
    return { title, templateClass: deps.getTemplateClass(), css: deps.getTemplateCss(), asOf };
  }

  // -> {name, data, type} for the formats that make a file; null for the print formats
  function build(format, src, title, now) {
    const asOf = E.asOfDate(now, 'dmy');
    const ext = format === 'docx' ? 'docx' : (format === 'md' ? 'md' : 'html');
    const name = E.fileName(title, now, ext);
    if (format === 'md') return { name, data: E.toMarkdown(E.parseBlocks(src), { title, asOf: now }), type: MIME.md };
    if (format === 'docx') {
      const pkg = E.buildDocx(E.parseBlocks(src), { title, asOf: now });
      return { name, data: E.zipStore(pkg.parts), type: MIME.docx, warnings: pkg.warnings };
    }
    if (format === 'html') return { name, data: deps.buildCleanHtml(Object.assign(htmlOptions(title, asOf), { bodyHtml: deps.getPreviewHtml() })), type: MIME.html };
    if (format === 'live') return { name, data: deps.buildLiveHtml(Object.assign(htmlOptions(title, asOf), { bodyHtml: deps.getPreviewHtml() })), type: MIME.html };
    if (format === 'pdf-file') return { name, data: deps.buildCleanHtml(Object.assign(htmlOptions(title, asOf), { bodyHtml: deps.getPreviewHtml(), autoPrint: true })), type: MIME.html };
    return null;
  }

  // the toast shows the file name inside <bdi> so that the Latin date and extension keep their order in RTL text
  // warnings (e.g. a table wider than Word allows, NFR7.11) are added to the same message, so the user is told
  function reportSuccess(format, name, warnings) {
    const notes = (warnings || []).filter(Boolean);
    const tail = notes.length ? '. ' + notes.join('. ') : '';
    const bdi = document.createElement('bdi');
    bdi.textContent = name;
    const node = document.createDocumentFragment();
    node.append(STR.done(STR.kind[format], ''), bdi, tail);
    window.MdA11yUI.notify(STR.done(STR.kind[format], name) + tail, { announce: true, node });
  }

  async function run(format) {
    if (job.state !== 'idle') return;                       // BR4.9: one job at a time
    window.MdA11yUI.panels.close(true);                     // BR1.4: the panel closes, focus returns to the icon
    deps.flush();                                           // BR4.1: the visual editor writes its text back first
    const src = deps.getMarkdown();
    if (E.isEmptyDoc(src)) { window.MdA11yUI.notify(STR.empty, { announce: true }); return; }   // BR4.8
    job.state = 'busy';
    setBusy(true);
    const printing = format === 'pdf' || format === 'print';
    try {
      await frame(); await frame();
      // test-only hook: the e2e suite sets it to force one failure and check the error path (BR4.7). The app never sets it.
      if (window.__mdwTestFailNextExport) { window.__mdwTestFailNextExport = false; throw new Error('injected export failure'); }
      const now = new Date();
      const title = E.resolveTitle(deps.getDocTitle(), E.parseBlocks(src));
      if (printing) {
        updatePrintHead(title, E.asOfDate(now, 'dmy'));
        if (format === 'pdf') window.MdA11yUI.notify(STR.pdfGuide, { announce: true });
        window.print();
      } else {
        const out = build(format, src, title, now);
        deps.downloadFile(out.data, out.name, out.type);
        job.state = 'done';
        reportSuccess(format, out.name, out.warnings);
      }
    } catch (err) {
      job.state = 'failed';
      // name and message of the error only, never the document (NFR9.7)
      console.error('[mdw-export]', format, err && err.name, err && err.message);
      window.MdA11yUI.notify(printing ? STR.failedPrint : STR.failed(STR.kind[format]), { announce: true });
    } finally {
      job.state = 'idle';
      setBusy(false);
    }
  }

  function choose(format) {
    const tile = format === 'pdf-file' ? pdfFileLink : (tiles.find((t) => t.def.format === format) || {}).button;
    if (!tile || tile.getAttribute('aria-disabled') === 'true') return;
    run(format);
  }

  /* ------------------------------------------------------------------ init */

  // deps: getMarkdown, getDocTitle, getPreviewHtml, getTemplateClass, getTemplateCss, buildCleanHtml, buildLiveHtml,
  //       downloadFile, flush
  function init(d) {
    deps = d;
    buildPanel();
    refreshTiles();
    document.addEventListener('mdw:panel-opened', (e) => { if (e.detail && e.detail.name === 'export') refreshTiles(); });
  }

  window.MdExportUI = { init, STR, state: () => job.state };
})();
