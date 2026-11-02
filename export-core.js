/* export-core.js — MD Workspace (v4.7.0)
 * Pure logic of the export panel: Markdown -> blocks, Markdown / Word (docx) serializers, ZIP, CRC32,
 * file names, the LRM rule and the shared constants of the exported HTML.
 * No DOM access here, so it runs under `node --test` and in the browser alike (BR7.9).
 * The DOM part lives in export-ui.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MdExport = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ inline runs (WF6 step 4) */

  // Private-use markers: they never occur in real text (stripped from the input first).
  const M = {
    codeOpen: '\uE010', codeClose: '\uE011',
    imgOpen: '\uE012', imgClose: '\uE013',
    linkOpen: '\uE014', linkMid: '\uE015', linkClose: '\uE016',
    bold: '\uE020', italic: '\uE021', strike: '\uE022',
    fenceOpen: '\uE030', fenceClose: '\uE031'
  };
  const MARKER_RE = /[\uE010-\uE03F]/g;

  // The same rule as parseMarkdown / MdVisual.safeUrl: http, https, mailto or a relative path.
  function isSafeUrl(u) {
    const s = String(u == null ? '' : u);
    if (!s) return false;
    if (/^(?:https?:|mailto:)/i.test(s)) return true;
    if (/^[\/\\]{2}/.test(s)) return false;
    if (/^[^\/?#]*:/.test(s)) return false;
    return true;
  }

  function makeRun(text, f) {
    const run = { text };
    if (f.bold) run.bold = true;
    if (f.italic) run.italic = true;
    if (f.strike) run.strike = true;
    if (f.code) run.code = true;
    if (f.img) run.img = true;
    if (f.href) run.href = f.href;
    return run;
  }

  const sameFormat = (a, b) => !a.img && !b.img
    && !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.strike === !!b.strike
    && !!a.code === !!b.code && a.href === b.href;

  function mergeRuns(runs) {
    const out = [];
    runs.forEach((r) => {
      const last = out[out.length - 1];
      if (last && sameFormat(last, r)) last.text += r.text;
      else out.push(r);
    });
    return out;
  }

  // Walks the marked-up string and emits runs; the markers toggle or set the formatting state.
  function walkRuns(s, codes, imgs, links) {
    const runs = [];
    const st = { bold: false, italic: false, strike: false, href: null };
    let buf = '';
    const flush = () => { if (buf) { runs.push(makeRun(buf, st)); buf = ''; } };
    const readIndex = (from, closer) => {
      const end = s.indexOf(closer, from);
      return { n: Number(s.slice(from + 1, end)), end };
    };
    for (let p = 0; p < s.length; p++) {
      const ch = s[p];
      if (ch === M.bold) { flush(); st.bold = !st.bold; }
      else if (ch === M.italic) { flush(); st.italic = !st.italic; }
      else if (ch === M.strike) { flush(); st.strike = !st.strike; }
      else if (ch === M.codeOpen) {
        flush();
        const r = readIndex(p, M.codeClose);
        runs.push(makeRun(codes[r.n], Object.assign({ code: true }, st)));
        p = r.end;
      } else if (ch === M.imgOpen) {
        flush();
        const r = readIndex(p, M.imgClose);
        runs.push(makeRun(imgs[r.n].alt, Object.assign({}, st, { img: true, href: imgs[r.n].url })));
        p = r.end;
      } else if (ch === M.linkOpen) {
        flush();
        const r = readIndex(p, M.linkMid);
        st.href = links[r.n];
        p = r.end;
      } else if (ch === M.linkClose) { flush(); st.href = null; }
      else buf += ch;
    }
    flush();
    return runs;
  }

  // Same order as parseMarkdown: code, images, links, then ** and * and ~~. "_" is NOT emphasis (the preview
  // does not render it either, and snake_case words must survive).
  function parseRuns(input) {
    let s = String(input == null ? '' : input).replace(MARKER_RE, '');
    if (!s) return [];
    const codes = []; const imgs = []; const links = [];
    s = s.replace(/`([^`]+)`/g, (m, code) => { codes.push(code); return M.codeOpen + (codes.length - 1) + M.codeClose; });
    s = s.replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
      if (!isSafeUrl(url)) return m;
      imgs.push({ alt, url });
      return M.imgOpen + (imgs.length - 1) + M.imgClose;
    });
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
      if (!isSafeUrl(url)) return m;
      links.push(url);
      return M.linkOpen + (links.length - 1) + M.linkMid + text + M.linkClose;
    });
    s = s.replace(/\*\*(.*?)\*\*/g, M.bold + '$1' + M.bold);
    s = s.replace(/\*(.*?)\*/g, M.italic + '$1' + M.italic);
    s = s.replace(/~~(.+?)~~/g, M.strike + '$1' + M.strike);
    return mergeRuns(walkRuns(s, codes, imgs, links));
  }

  /* ------------------------------------------------------------------ blocks (WF6) */

  const RE = {
    dirOpen: /^\s*<div\s+dir\s*=\s*(?:"(rtl|ltr)"|'(rtl|ltr)'|(rtl|ltr))\s*>\s*$/i,
    dirClose: /^\s*<\/div\s*>\s*$/i,
    hr: /^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/,
    heading: /^(#{1,6}) (.*)$/,
    quote: /^> (.*)$/,
    bullet: /^( *)[*+-] (.*)$/,
    ordered: /^( *)\d+\. (.*)$/,
    task: /^\[( |x|X)\] (.*)$/,
    fenceLine: new RegExp('^' + M.fenceOpen + '(\\d+)' + M.fenceClose + '$')
  };

  const BREAK = () => ({ text: '\n' });

  function linesToRuns(lines) {
    const runs = [];
    lines.forEach((line, i) => {
      if (i) runs.push(BREAK());
      parseRuns(line).forEach((r) => runs.push(r));
    });
    return mergeRuns(runs);
  }

  function paragraphBlock(lines) {
    const runs = linesToRuns(lines);
    if (lines.length === 1 && runs.length === 1 && runs[0].img && isSafeUrl(runs[0].href)) {
      return { type: 'image', alt: runs[0].text, url: runs[0].href };
    }
    return { type: 'p', runs };
  }

  function listItemOf(line) {
    let m = RE.bullet.exec(line);
    if (m) return { depth: Math.floor(m[1].length / 2), ordered: false, text: m[2] };
    m = RE.ordered.exec(line);
    if (m) return { depth: Math.floor(m[1].length / 2), ordered: true, text: m[2] };
    return null;
  }

  // Mirrors the nesting rules of the preview: one level deeper at a time; a type change closes the list at that level.
  function buildLists(rawItems) {
    const blocks = [];
    const open = [];
    let current = null;
    rawItems.forEach((it) => {
      const depth = Math.min(it.depth, open.length);
      while (open.length > depth + 1) open.pop();
      if (open.length === depth + 1 && open[depth] !== it.ordered) {
        open.pop();
        if (depth === 0) current = null;
      }
      if (open.length === depth) open.push(it.ordered);
      if (!current) { current = { type: 'list', ordered: it.ordered, items: [] }; blocks.push(current); }
      let task = 'none';
      let text = it.text;
      const t = !it.ordered && RE.task.exec(text);
      if (t) { task = t[1] === ' ' ? 'open' : 'done'; text = t[2]; }
      current.items.push({ runs: parseRuns(text.trim()), task, level: depth, ordered: it.ordered });
    });
    return blocks;
  }

  const cellsOf = (line) => line.split('|').slice(1, -1);

  function alignOf(sep) {
    const s = sep.trim();
    if (!/^:?-+:?$/.test(s)) return 'none';
    const l = s.startsWith(':');
    const r = s.endsWith(':');
    if (l && r) return 'center';
    return l ? 'left' : (r ? 'right' : 'none');
  }

  function tableBlock(lines) {
    const header = cellsOf(lines[0]).map((c) => parseRuns(c.trim()));
    const seps = cellsOf(lines[1]).map(alignOf);
    return {
      type: 'table',
      header,
      rows: lines.slice(2).map((l) => cellsOf(l).map((c) => parseRuns(c.trim()))),
      align: header.map((h, i) => seps[i] || 'none')
    };
  }

  const isTableLine = (t) => t.length >= 3 && t[0] === '|' && t[t.length - 1] === '|';

  function extractFences(src) {
    const fences = [];
    const token = (block) => { fences.push(block); return '\n' + M.fenceOpen + (fences.length - 1) + M.fenceClose + '\n'; };
    let s = src.replace(/```mermaid([\s\S]*?)```/g, (m, code) => token({ type: 'diagram', text: code.trim() }));
    s = s.replace(/```(\w*)([\s\S]*?)```/g, (m, lang, code) => token({ type: 'code', lang: (lang || '').trim(), text: code.trim() }));
    return { s, fences };
  }

  function parseBlocks(md) {
    const src = String(md == null ? '' : md).replace(/\r\n?/g, '\n').replace(MARKER_RE, '');
    if (!src.trim()) return [];
    const { s, fences } = extractFences(src);
    const lines = s.split('\n');
    const rootBlocks = [];
    const stack = [];
    let target = rootBlocks;
    let para = [];
    const flushPara = () => { if (para.length) { target.push(paragraphBlock(para)); para = []; } };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      let m;
      if (!trimmed) { flushPara(); i++; continue; }
      if ((m = RE.fenceLine.exec(trimmed))) { flushPara(); target.push(Object.assign({}, fences[Number(m[1])])); i++; continue; }
      if ((m = RE.dirOpen.exec(line))) {
        flushPara();
        const region = { type: 'dirRegion', dir: (m[1] || m[2] || m[3]).toLowerCase(), children: [] };
        target.push(region);
        stack.push(target);
        target = region.children;
        i++; continue;
      }
      if (stack.length && RE.dirClose.test(line)) { flushPara(); target = stack.pop(); i++; continue; }
      if (RE.hr.test(line)) { flushPara(); target.push({ type: 'hr' }); i++; continue; }
      if ((m = RE.heading.exec(line))) {
        flushPara();
        target.push({ type: 'h' + m[1].length, runs: parseRuns(m[2].trim()) });
        i++; continue;
      }
      if (RE.quote.test(line)) {
        flushPara();
        const quoted = [];
        while (i < lines.length && (m = RE.quote.exec(lines[i]))) { quoted.push(m[1]); i++; }
        target.push({ type: 'quote', runs: linesToRuns(quoted) });
        continue;
      }
      if (listItemOf(line)) {
        flushPara();
        const items = [];
        while (i < lines.length) {
          const item = listItemOf(lines[i]);
          if (item) { items.push(item); i++; continue; }
          let next = i;
          while (next < lines.length && !lines[next].trim()) next++;
          if (next > i && next < lines.length && listItemOf(lines[next])) { i = next; continue; }
          break;
        }
        buildLists(items).forEach((b) => target.push(b));
        continue;
      }
      if (isTableLine(trimmed)) {
        const rows = [];
        let j = i;
        while (j < lines.length && isTableLine(lines[j].trim())) { rows.push(lines[j].trim()); j++; }
        if (rows.length >= 2) { flushPara(); target.push(tableBlock(rows)); i = j; continue; }
      }
      para.push(trimmed);
      i++;
    }
    flushPara();
    return rootBlocks;
  }

  /* ------------------------------------------------------------------ LRM (BR4.3) */

  const LRM = '\u200E';
  const HEBREW_RE = /[\u0590-\u05FF]/;
  // An expression is a Latin / numeric word, optionally joined to further words by one of . _ / : + # - or a single space.
  const LATIN_EXPR_RE = /[A-Za-z0-9]+(?:[._\/:+#\- ][A-Za-z0-9]+)*/g;

  const hasHebrew = (text) => HEBREW_RE.test(String(text == null ? '' : text));

  // Wraps every expression in LRM; a mark that is already there is not doubled (idempotent).
  function wrapLatin(s) {
    return s.replace(LATIN_EXPR_RE, (m, at) => (s[at - 1] === LRM ? '' : LRM) + m + (s[at + m.length] === LRM ? '' : LRM));
  }

  // text is one unit (paragraph, heading, item, cell): the rule applies only when the unit has Hebrew.
  function applyLrm(text) {
    const s = String(text == null ? '' : text);
    return hasHebrew(s) ? wrapLatin(s) : s;
  }

  // The unit is the whole list of runs. Code, image alt and addresses are never changed.
  function applyLrmToRuns(runs) {
    const list = Array.isArray(runs) ? runs : [];
    const unitHasHebrew = list.some((r) => !r.code && !r.img && hasHebrew(r.text));
    return list.map((r) => (unitHasHebrew && !r.code && !r.img ? Object.assign({}, r, { text: wrapLatin(r.text) }) : Object.assign({}, r)));
  }

  /* ------------------------------------------------------------------ date, file name, title (BR4.1, BR4.2, BR4.4) */

  const pad2 = (n) => String(n).padStart(2, '0');

  // date: a Date (local calendar day) or 'YYYY-MM-DD'. format: 'dmy' (DD.MM.YYYY, default) or 'iso' (YYYY-MM-DD).
  function asOfDate(date, format) {
    let y; let mo; let d;
    const iso = typeof date === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (iso) { y = iso[1]; mo = iso[2]; d = iso[3]; }
    else {
      const dt = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(dt.getTime())) throw new Error('Invalid date');
      y = String(dt.getFullYear()).padStart(4, '0'); mo = pad2(dt.getMonth() + 1); d = pad2(dt.getDate());
    }
    return format === 'iso' ? `${y}-${mo}-${d}` : `${d}.${mo}.${y}`;
  }

  const FILE_NAME_MAX = 80;
  const DEFAULT_TITLE = 'md-workspace';

  function fileName(title, asOf, ext) {
    let base = String(title == null ? '' : title)
      .replace(/[\\\/:*?"<>|\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .trim().replace(/\s+/g, '-');
    base = Array.from(base).slice(0, FILE_NAME_MAX).join('').replace(/^[-.]+|[-.]+$/g, '');
    return `${base || DEFAULT_TITLE}-${asOfDate(asOf, 'iso')}.${ext}`;
  }

  const runsText = (runs) => (runs || []).map((r) => r.text).join('');

  function firstH1(blocks) {
    for (const b of blocks || []) {
      if (b.type === 'h1') { const t = runsText(b.runs).trim(); if (t) return t; }
      if (b.type === 'dirRegion') { const t = firstH1(b.children); if (t) return t; }
    }
    return '';
  }

  // #doc-title, then the first h1, then md-workspace
  function resolveTitle(docTitle, blocks) {
    return String(docTitle == null ? '' : docTitle).trim() || firstH1(blocks) || DEFAULT_TITLE;
  }

  /* ------------------------------------------------------------------ Markdown serializer (BR3.6) */

  function formatRun(r) {
    if (r.img) return `![${r.text}](${r.href})`;
    let t = r.text;
    if (r.code) t = '`' + t + '`';
    if (r.bold && r.italic) t = '***' + t + '***';
    else if (r.bold) t = '**' + t + '**';
    else if (r.italic) t = '*' + t + '*';
    if (r.strike) t = '~~' + t + '~~';
    return t;
  }

  function runsToMd(runs, lrm) {
    const rs = (lrm ? applyLrmToRuns(runs) : (runs || [])).filter((r) => r.img || r.text !== '');
    let out = '';
    for (let i = 0; i < rs.length;) {
      const href = !rs[i].img && rs[i].href;
      if (!href) { out += formatRun(rs[i]); i++; continue; }
      let inner = '';
      while (i < rs.length && !rs[i].img && rs[i].href === href) { inner += formatRun(rs[i]); i++; }
      out += `[${inner}](${href})`;
    }
    return out;
  }

  const ALIGN_MD = { left: ':---', center: ':---:', right: '---:' };

  function listToMd(b, lrm) {
    const counters = [];
    return b.items.map((it) => {
      counters.length = it.level + 1;
      counters[it.level] = it.ordered ? (counters[it.level] || 0) + 1 : 0;
      const marker = it.ordered ? `${counters[it.level]}. ` : '- ';
      const task = it.task === 'open' ? '[ ] ' : (it.task === 'done' ? '[x] ' : '');
      return '  '.repeat(it.level) + marker + task + runsToMd(it.runs, lrm);
    }).join('\n');
  }

  function tableToMd(b, lrm) {
    const cols = b.header.length;
    const row = (cells) => {
      const padded = cells.slice();
      while (padded.length < cols) padded.push([]);
      return '| ' + padded.map((c) => runsToMd(c, lrm)).join(' | ') + ' |';
    };
    const sep = '| ' + b.header.map((h, i) => ALIGN_MD[b.align[i]] || '---').join(' | ') + ' |';
    return [row(b.header), sep].concat(b.rows.map(row)).join('\n');
  }

  function blockToMd(b, lrm) {
    switch (b.type) {
      case 'p': return runsToMd(b.runs, lrm);
      case 'quote': return runsToMd(b.runs, lrm).split('\n').map((l) => '> ' + l).join('\n');
      case 'list': return listToMd(b, lrm);
      case 'table': return tableToMd(b, lrm);
      case 'code': return '```' + (b.lang || '') + '\n' + b.text + '\n```';
      case 'diagram': return '```mermaid\n' + b.text + '\n```';
      case 'hr': return '---';
      case 'image': return `![${b.alt}](${b.url})`;
      case 'dirRegion': return `<div dir="${b.dir}">\n\n` + blocksToMarkdown(b.children, { lrm }) + (b.children.length ? '\n\n' : '') + '</div>';
      default: return /^h[1-6]$/.test(b.type) ? '#'.repeat(Number(b.type[1])) + ' ' + runsToMd(b.runs, lrm) : '';
    }
  }

  // opts.lrm: apply the LRM rule (BR4.3). Off by default so the structure round-trips exactly.
  function blocksToMarkdown(blocks, opts) {
    const lrm = !!(opts && opts.lrm);
    return (blocks || []).map((b) => blockToMd(b, lrm)).join('\n\n');
  }

  function toMarkdown(blocks, opts) {
    const o = opts || {};
    const title = String(o.title == null ? DEFAULT_TITLE : o.title).replace(/\s+/g, ' ').trim() || DEFAULT_TITLE;
    const body = blocksToMarkdown(blocks, { lrm: true });
    return [
      '<div dir="rtl" lang="he">',
      '',
      '# ' + applyLrm(title),
      '',
      applyLrm('נכון ל-' + asOfDate(o.asOf, 'dmy')),
      '',
      body ? body + '\n' : null,
      '</div>',
      ''
    ].filter((x) => x !== null).join('\n');
  }

  /* ------------------------------------------------------------------ CRC32, UTF-8, ZIP (WF7.6) */

  // 256-entry lookup table, computed once (NFR7.7), polynomial 0xEDB88320
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  let encoder = null;
  function utf8(str) {
    if (!encoder) encoder = new TextEncoder();
    return encoder.encode(String(str == null ? '' : str));
  }

  function crc32(input) {
    const bytes = typeof input === 'string' ? utf8(input) : input;
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  const ZIP = { localSig: 0x04034b50, centralSig: 0x02014b50, endSig: 0x06054b50, version: 20, utf8Flag: 0x0800, dosDate: 0x0021 };
  const CONTENT_TYPES = '[Content_Types].xml';

  function zipEntries(parts) {
    const seen = new Set();
    const entries = parts.map((p) => {
      if (!p || typeof p.path !== 'string' || !p.path) throw new Error('Invalid zip part path');
      if (seen.has(p.path)) throw new Error('Duplicate zip part: ' + p.path);
      seen.add(p.path);
      let data = p.data;
      if (typeof data === 'string') data = utf8(data);
      else if (!(data instanceof Uint8Array)) throw new Error('Invalid zip part data: ' + p.path);
      return { name: utf8(p.path), data, crc: crc32(data) };
    });
    // the package's [Content_Types].xml goes first, the rest keeps its order
    return entries.filter((e, i) => parts[i].path === CONTENT_TYPES).concat(entries.filter((e, i) => parts[i].path !== CONTENT_TYPES));
  }

  // STORE-only archive (no compression) of [{path, data: string | Uint8Array}] -> Uint8Array. Deterministic.
  function zipStore(parts) {
    const entries = zipEntries(parts || []);
    let size = 22;
    entries.forEach((e) => { size += 30 + e.name.length + e.data.length + 46 + e.name.length; });
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer);
    let p = 0;
    const u16 = (v) => { view.setUint16(p, v, true); p += 2; };
    const u32 = (v) => { view.setUint32(p, v >>> 0, true); p += 4; };
    const bytes = (b) => { out.set(b, p); p += b.length; };

    entries.forEach((e) => {
      e.offset = p;
      u32(ZIP.localSig); u16(ZIP.version); u16(ZIP.utf8Flag); u16(0); u16(0); u16(ZIP.dosDate);
      u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0);
      bytes(e.name); bytes(e.data);
    });
    const cdStart = p;
    entries.forEach((e) => {
      u32(ZIP.centralSig); u16(ZIP.version); u16(ZIP.version); u16(ZIP.utf8Flag); u16(0); u16(0); u16(ZIP.dosDate);
      u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0); u16(0);
      u16(0); u16(0); u32(0); u32(e.offset);
      bytes(e.name);
    });
    const cdSize = p - cdStart;
    u32(ZIP.endSig); u16(0); u16(0); u16(entries.length); u16(entries.length); u32(cdSize); u32(cdStart); u16(0);
    return out;
  }

  /* ------------------------------------------------------------------ docx: XML helpers (WF7.4) */

  const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';

  // Escapes & < > " ' and removes the control characters XML 1.0 forbids (BR3.11, NFR9.1).
  function xmlEscape(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  const DOCX = {
    pageW: 11906, pageH: 16838, margin: 1134, contentW: 9638,   // A4 portrait, 2 cm margins (twips)
    maxCols: 63, maxLevel: 8, linkIdStart: 10, firstOrderedNum: 2, titleMax: 255,
    labels: { diagram: 'תרשים (Mermaid), קוד המקור', image: 'תמונה', asOf: 'נכון ל-', open: '☐ ', done: '☑ ' }
  };

  // Strong direction of one UTF-16 unit: 'R' (Hebrew / Arabic), 'L' (letters and digits of other scripts) or 'N' (neutral).
  function charDir(c) {
    if ((c >= 0x590 && c <= 0x8FF) || (c >= 0xFB1D && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF)) return 'R';
    if ((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) return 'L';
    if ((c >= 0xC0 && c < 0x590 && c !== 0xD7 && c !== 0xF7) || (c >= 0x900 && c < 0x2000)) return 'L';
    if ((c >= 0x3040 && c < 0xD800) || (c >= 0xF900 && c < 0xFB1D)) return 'L';
    return 'N';
  }

  // Splits text into [{text, rtl}] by script. Neutral characters (spaces, punctuation) join the segment before
  // them (the first segment takes the first strong direction); an LRM that precedes a Latin character joins it (WF7.3.2).
  function splitScripts(text) {
    const n = text.length;
    const dirs = new Array(n);
    let last = null;
    for (let i = 0; i < n; i++) {
      const code = text.charCodeAt(i);
      let d = charDir(code);
      if (d === 'N') d = (code === 0x200E && i + 1 < n && charDir(text.charCodeAt(i + 1)) === 'L') ? 'L' : last;
      dirs[i] = d;
      if (d) last = d;
    }
    const first = dirs.find(Boolean) || 'L';
    const segments = [];
    for (let i = 0; i < n; i++) {
      const d = dirs[i] || first;
      const seg = segments[segments.length - 1];
      if (seg && seg.dir === d) seg.text += text[i];
      else segments.push({ dir: d, text: text[i] });
    }
    return segments.map((s) => ({ text: s.text, rtl: s.dir === 'R' }));
  }

  const FONT = { text: 'Arial', code: 'Consolas' };
  const fontsXml = (name) => `<w:rFonts w:ascii="${name}" w:hAnsi="${name}" w:cs="${name}"/>`;

  // w:rPr in schema order: rStyle, rFonts, b, bCs, i, iCs, strike, shd, rtl
  function rPrXml(f) {
    let x = '';
    if (f.rStyle) x += `<w:rStyle w:val="${f.rStyle}"/>`;
    x += fontsXml(f.code ? FONT.code : FONT.text);
    if (f.bold) x += f.rtl ? '<w:b/><w:bCs/>' : '<w:b/>';
    if (f.italic) x += f.rtl ? '<w:i/><w:iCs/>' : '<w:i/>';
    if (f.strike) x += '<w:strike/>';
    if (f.code) x += '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>';
    if (f.rtl) x += '<w:rtl/>';
    return `<w:rPr>${x}</w:rPr>`;
  }

  // w:pPr in schema order: pStyle, keepNext, numPr, pBdr, shd, bidi, ind, jc
  function pPrXml(o) {
    let x = '';
    if (o.style) x += `<w:pStyle w:val="${o.style}"/>`;
    if (o.keepNext) x += '<w:keepNext/>';
    if (o.numId != null) x += `<w:numPr><w:ilvl w:val="${o.ilvl}"/><w:numId w:val="${o.numId}"/></w:numPr>`;
    if (o.pBdr) x += `<w:pBdr>${o.pBdr}</w:pBdr>`;
    if (o.shd) x += '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>';
    x += o.rtl ? '<w:bidi/>' : '<w:bidi w:val="0"/>';
    if (o.indStart != null) x += `<w:ind w:start="${o.indStart}" w:hanging="360"/>`;
    if (o.jc) x += `<w:jc w:val="${o.jc}"/>`;
    return `<w:pPr>${x}</w:pPr>`;
  }

  // OOXML paragraph alignment is relative to the paragraph direction, so Markdown's left / right become start / end (WF7.3.4)
  function logicalJc(align, rtl) {
    if (align === 'center') return 'center';
    if (align === 'left') return rtl ? 'end' : 'start';
    if (align === 'right') return rtl ? 'start' : 'end';
    return rtl ? undefined : 'left';
  }

  function textXml(text) {
    let out = '';
    text.split(/(\n|\t)/).forEach((part) => {
      if (part === '\n') out += '<w:br/>';
      else if (part === '\t') out += '<w:tab/>';
      else if (part) out += `<w:t xml:space="preserve">${xmlEscape(part)}</w:t>`;
    });
    return out;
  }

  const runXml = (text, fmt) => { const t = textXml(text); return t ? `<w:r>${rPrXml(fmt)}${t}</w:r>` : ''; };

  // Only http, https and mailto addresses that pass the shared rule become hyperlinks (BR3.10, NFR9.4).
  function linkTarget(r) {
    const h = r.href;
    return typeof h === 'string' && /^(?:https?:|mailto:)/i.test(h) && !/[\s\u0000-\u001F]/.test(h) && isSafeUrl(h) ? h : null;
  }

  function runPieces(r, base) {
    const text = r.img ? (r.text ? `[${DOCX.labels.image}: ${r.text}]` : `[${DOCX.labels.image}]`) : r.text;
    const fmt = { rStyle: base.rStyle, bold: r.bold || base.bold, italic: r.italic, strike: r.strike, code: r.code };
    const segments = r.code ? [{ text, rtl: false }] : splitScripts(text);
    return segments.map((s) => runXml(s.text, Object.assign({}, fmt, { rtl: s.rtl }))).join('');
  }

  function inlineXml(runs, ctx, base) {
    let out = '';
    for (let i = 0; i < runs.length;) {
      const url = linkTarget(runs[i]);
      if (!url) { out += runPieces(runs[i], base); i++; continue; }
      let inner = '';
      while (i < runs.length && linkTarget(runs[i]) === url) { inner += runPieces(runs[i], Object.assign({}, base, { rStyle: 'Hyperlink' })); i++; }
      out += `<w:hyperlink r:id="${ctx.addLink(url)}" w:history="1">${inner}</w:hyperlink>`;
    }
    return out;
  }

  const unitIsHebrew = (runs) => runs.some((r) => r.img || (!r.code && hasHebrew(r.text)));

  // o: {style, dir ('rtl'|'ltr'|undefined: by content), align, numId, ilvl, indStart, bold, keepNext, ltr (force LTR + left)}
  function paragraphXml(runs, o, ctx) {
    const list = (runs || []).filter((r) => r.img || r.text !== '');
    const rtl = !o.ltr && (o.dir === 'rtl' || (o.dir !== 'ltr' && unitIsHebrew(list)));
    const jc = o.ltr ? 'left' : logicalJc(o.align, rtl);
    const pPr = pPrXml(Object.assign({}, o, { rtl, jc }));
    return `<w:p>${pPr}${inlineXml(applyLrmToRuns(list), ctx, { bold: o.bold })}</w:p>`;
  }

  /* ------------------------------------------------------------------ docx: body (WF7.2) */

  const HR_BORDER = '<w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/>';
  const CELL_BORDER = (side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`;
  const TABLE_BORDERS = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(CELL_BORDER).join('');

  function codeXml(text, ctx) {
    return String(text).split('\n').map((line) => {
      const runs = line ? `<w:r>${rPrXml({ code: true })}${textXml(line)}</w:r>` : '';
      return `<w:p>${pPrXml({ style: 'Code', rtl: false, jc: 'left' })}${runs}</w:p>`;
    }).join('');
  }

  function listXml(b, ctx, dir) {
    const decimal = b.items.some((it) => it.ordered) ? ctx.nextNum++ : null;
    return b.items.map((it) => {
      const ilvl = Math.min(it.level, DOCX.maxLevel);
      if (it.task !== 'none') {
        const mark = it.task === 'done' ? DOCX.labels.done : DOCX.labels.open;
        return paragraphXml([{ text: mark }].concat(it.runs), { style: 'ListParagraph', dir, indStart: 720 * (ilvl + 1) }, ctx);
      }
      return paragraphXml(it.runs, { style: 'ListParagraph', dir, numId: it.ordered ? decimal : 1, ilvl }, ctx);
    }).join('');
  }

  function fitCells(cells, cols) {
    let row = cells.slice();
    if (row.length > cols) {
      const merged = [];
      row.slice(cols - 1).forEach((cell, i) => { if (i) merged.push({ text: ' | ' }); cell.forEach((r) => merged.push(r)); });
      row = row.slice(0, cols - 1).concat([merged]);
    }
    while (row.length < cols) row.push([]);
    return row;
  }

  function tableXml(b, ctx, dir) {
    const rawCols = Math.max(1, b.header.length, ...b.rows.map((r) => r.length));
    const cols = Math.min(rawCols, DOCX.maxCols);
    if (rawCols > cols) ctx.warnings.push(`טבלה עם ${rawCols} עמודות: Word תומך עד ${DOCX.maxCols}, ולכן העמודות העודפות מוזגו לעמודה האחרונה`);
    const width = Math.floor(DOCX.contentW / cols);
    const rtl = dir === 'rtl' || (dir !== 'ltr' && [b.header].concat(b.rows).some((row) => row.some((cell) => unitIsHebrew(cell))));
    const row = (cells, header) => {
      const tcs = fitCells(cells, cols).map((cell, i) => {
        const shd = header ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : '';
        const p = paragraphXml(cell, { dir, align: b.align[i], bold: header }, ctx);
        return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shd}</w:tcPr>${p}</w:tc>`;
      }).join('');
      return `<w:tr>${header ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${tcs}</w:tr>`;
    };
    const tblPr = '<w:tblPr><w:tblStyle w:val="TableGrid"/>' + (rtl ? '<w:bidiVisual/>' : '')
      + `<w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${TABLE_BORDERS}</w:tblBorders>`
      + '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>';
    const grid = '<w:tblGrid>' + `<w:gridCol w:w="${width}"/>`.repeat(cols) + '</w:tblGrid>';
    // Word needs a paragraph after a table
    return `<w:tbl>${tblPr}${grid}${row(b.header, true)}${b.rows.map((r) => row(r, false)).join('')}</w:tbl><w:p>${pPrXml({ rtl: false })}</w:p>`;
  }

  function blockXml(b, ctx, dir) {
    switch (b.type) {
      case 'p': return paragraphXml(b.runs, { dir }, ctx);
      case 'quote': return paragraphXml(b.runs, { style: 'Quote', dir }, ctx);
      case 'list': return listXml(b, ctx, dir);
      case 'table': return tableXml(b, ctx, dir);
      case 'code': return codeXml(b.text, ctx);
      case 'diagram': return paragraphXml([{ text: DOCX.labels.diagram, italic: true }], { dir }, ctx) + codeXml(b.text, ctx);
      case 'hr': return `<w:p>${pPrXml({ pBdr: HR_BORDER, rtl: false })}</w:p>`;
      case 'image': return paragraphXml([{ text: b.alt || '', img: true, href: b.url }], { dir }, ctx);
      case 'dirRegion': return b.children.map((c) => blockXml(c, ctx, b.dir)).join('');
      default:
        if (/^h[1-6]$/.test(b.type)) return paragraphXml(b.runs, { style: 'Heading' + Math.min(Number(b.type[1]), 3), keepNext: true, dir }, ctx);
        return '';
    }
  }

  /* ------------------------------------------------------------------ docx: fixed parts (WF7.1) */

  const SECT_PR = `<w:sectPr><w:pgSz w:w="${DOCX.pageW}" w:h="${DOCX.pageH}"/><w:pgMar w:top="${DOCX.margin}" w:right="${DOCX.margin}" w:bottom="${DOCX.margin}" w:left="${DOCX.margin}" w:header="708" w:footer="708" w:gutter="0"/><w:bidi/></w:sectPr>`;

  const CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml.';
  const CONTENT_TYPES_XML = `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + `<Override PartName="/word/document.xml" ContentType="${CT}document.main+xml"/>`
    + `<Override PartName="/word/styles.xml" ContentType="${CT}styles+xml"/>`
    + `<Override PartName="/word/numbering.xml" ContentType="${CT}numbering+xml"/>`
    + `<Override PartName="/word/settings.xml" ContentType="${CT}settings+xml"/>`
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '</Types>';

  const ROOT_RELS_XML = `${XML_DECL}<Relationships xmlns="${REL_NS}">`
    + `<Relationship Id="rId1" Type="${REL_TYPE}officeDocument" Target="word/document.xml"/>`
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + '</Relationships>';

  const SETTINGS_XML = `${XML_DECL}<w:settings xmlns:w="${NS_W}"><w:defaultTabStop w:val="720"/><w:themeFontLang w:val="en-US" w:bidi="he-IL"/></w:settings>`;

  const heading = (id, name, size, color, before) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>`
    + `<w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${Number(id.slice(-1)) - 1}"/></w:pPr>`
    + `<w:rPr><w:b/><w:bCs/><w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;

  const STYLES_XML = `${XML_DECL}<w:styles xmlns:w="${NS_W}">`
    + `<w:docDefaults><w:rPrDefault><w:rPr>${fontsXml(FONT.text)}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="he-IL"/></w:rPr></w:rPrDefault>`
    + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>'
    + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>'
    + '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="10"/><w:qFormat/>'
    + '<w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>'
    + heading('Heading1', 'heading 1', 40, '0F172A', 360) + heading('Heading2', 'heading 2', 32, '1E3A8A', 280) + heading('Heading3', 'heading 3', 26, '1E40AF', 200)
    + '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="29"/><w:qFormat/>'
    + '<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="2563EB"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/><w:ind w:start="360"/></w:pPr>'
    + '<w:rPr><w:i/><w:iCs/><w:color w:val="1E40AF"/></w:rPr></w:style>'
    + `<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="30"/><w:qFormat/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:spacing w:after="0"/></w:pPr><w:rPr>${fontsXml(FONT.code)}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>`
    + '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/><w:pPr><w:ind w:start="720"/><w:contextualSpacing/></w:pPr></w:style>'
    + '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="1D4ED8"/><w:u w:val="single"/></w:rPr></w:style>'
    + `<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/><w:tblPr><w:tblBorders>${TABLE_BORDERS}</w:tblBorders></w:tblPr></w:style>`
    + '</w:styles>';

  function abstractNumXml(id, bullet) {
    let lvls = '';
    for (let i = 0; i < 9; i++) {
      lvls += `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${bullet ? 'bullet' : 'decimal'}"/><w:lvlText w:val="${bullet ? '•' : '%' + (i + 1) + '.'}"/><w:lvlJc w:val="start"/>`
        + `<w:pPr><w:ind w:start="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>`;
    }
    return `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/>${lvls}</w:abstractNum>`;
  }

  function numberingXml(orderedNums) {
    const overrides = Array.from({ length: 9 }, (_, i) => `<w:lvlOverride w:ilvl="${i}"><w:startOverride w:val="1"/></w:lvlOverride>`).join('');
    return `${XML_DECL}<w:numbering xmlns:w="${NS_W}">${abstractNumXml(0, true)}${abstractNumXml(1, false)}`
      + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
      + orderedNums.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/>${overrides}</w:num>`).join('')
      + '</w:numbering>';
  }

  function relsXml(links) {
    return `${XML_DECL}<Relationships xmlns="${REL_NS}">`
      + `<Relationship Id="rId1" Type="${REL_TYPE}styles" Target="styles.xml"/>`
      + `<Relationship Id="rId2" Type="${REL_TYPE}numbering" Target="numbering.xml"/>`
      + `<Relationship Id="rId3" Type="${REL_TYPE}settings" Target="settings.xml"/>`
      + links.map((l) => `<Relationship Id="${l.id}" Type="${REL_TYPE}hyperlink" Target="${xmlEscape(l.url)}" TargetMode="External"/>`).join('')
      + '</Relationships>';
  }

  // Only the title and the dates (from asOf, not from the clock). No creator, no application, no machine data (NFR9.6).
  function coreXml(title, isoDate) {
    const stamp = `${isoDate}T00:00:00Z`;
    return `${XML_DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
      + `<dc:title>${xmlEscape(Array.from(title).slice(0, DOCX.titleMax).join(''))}</dc:title><dc:creator></dc:creator><cp:lastModifiedBy></cp:lastModifiedBy>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>`;
  }

  // blocks + {title, asOf (Date | 'YYYY-MM-DD')} -> {parts: [{path, data: Uint8Array}], warnings: [string]}
  function buildDocx(blocks, opts) {
    const o = opts || {};
    const title = String(o.title == null ? DEFAULT_TITLE : o.title).replace(/\s+/g, ' ').trim() || DEFAULT_TITLE;
    const links = [];
    const ordered = [];
    const ctx = {
      warnings: [],
      nextNum: DOCX.firstOrderedNum,
      addLink(url) { const id = 'rId' + (DOCX.linkIdStart + links.length); links.push({ id, url }); return id; }
    };
    let bodyXml = paragraphXml([{ text: title }], { style: 'Title' }, ctx)
      + paragraphXml([{ text: DOCX.labels.asOf + asOfDate(o.asOf, 'dmy') }], {}, ctx);
    (blocks || []).forEach((b) => { bodyXml += blockXml(b, ctx); });
    for (let id = DOCX.firstOrderedNum; id < ctx.nextNum; id++) ordered.push(id);
    const documentXml = `${XML_DECL}<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}"><w:body>${bodyXml}${SECT_PR}</w:body></w:document>`;
    const parts = [
      ['[Content_Types].xml', CONTENT_TYPES_XML],
      ['_rels/.rels', ROOT_RELS_XML],
      ['word/document.xml', documentXml],
      ['word/styles.xml', STYLES_XML],
      ['word/numbering.xml', numberingXml(ordered)],
      ['word/settings.xml', SETTINGS_XML],
      ['word/_rels/document.xml.rels', relsXml(links)],
      ['docProps/core.xml', coreXml(title, asOfDate(o.asOf, 'iso'))]
    ].map(([path, xml]) => ({ path, data: utf8(xml) }));
    return { parts, warnings: ctx.warnings };
  }

  /* ------------------------------------------------------------------ print fallback script (NFR9.3) */

  // The one script the PDF-fallback HTML carries. A constant: nothing from the document ever enters it.
  // PRINT_SCRIPT_SHA256 is its SHA-256 (base64), hard-coded for the CSP; export-html.test.js recomputes it with node:crypto.
  const PRINT_SCRIPT = "window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});";
  const PRINT_SCRIPT_SHA256 = 'LhKMjJwxfDgK+39YrahyMMtyPejlO8EWd5H10c4yQJs=';

  /* ------------------------------------------------------------------ environment and empty document (NFR8.4, BR4.8) */

  // env: {Blob, URL, anchorProto}; with no argument the real globals are inspected.
  // -> {ok, reason}, reason: null | 'no-blob' | 'no-object-url' | 'no-download-attr'. Never throws.
  function canDownload(env) {
    let e = env;
    if (!e) {
      e = {
        Blob: typeof Blob === 'function' ? Blob : undefined,
        URL: typeof URL === 'function' || typeof URL === 'object' ? URL : undefined,
        anchorProto: typeof HTMLAnchorElement === 'function' ? HTMLAnchorElement.prototype : undefined
      };
    }
    if (typeof e.Blob !== 'function') return { ok: false, reason: 'no-blob' };
    if (!e.URL || typeof e.URL.createObjectURL !== 'function') return { ok: false, reason: 'no-object-url' };
    if (!e.anchorProto || typeof e.anchorProto !== 'object' || !('download' in e.anchorProto)) return { ok: false, reason: 'no-download-attr' };
    return { ok: true, reason: null };
  }

  // A document that is nothing or only white space is empty: no file, no print window (BR4.8).
  const isEmptyDoc = (text) => String(text == null ? '' : text).trim() === '';

  return {
    canDownload, isEmptyDoc,
    PRINT_SCRIPT, PRINT_SCRIPT_SHA256,
    LRM, isSafeUrl, parseRuns, parseBlocks,
    xmlEscape, buildDocx,
    crc32, utf8, zipStore,
    hasHebrew, applyLrm, applyLrmToRuns, asOfDate, fileName, resolveTitle,
    blocksToMarkdown, toMarkdown
  };
});
