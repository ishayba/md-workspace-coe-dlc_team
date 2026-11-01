/* md-visual.js — MD Workspace (v4.6.0)
 * Pure logic of the visual (Word-like) editor: converts the HTML that a contenteditable
 * produces back into the Markdown dialect that parseMarkdown() understands.
 * No DOM access here, so it runs under `node --test` and in the browser alike.
 * (The DOM part lives in md-visual-ui.js.)
 *
 * Design rules:
 *  - The output may only use constructs the parser renders: headings, paragraphs (with line
 *    breaks), bold / italic / ~~strike~~ / inline code, [links](url) and ![images](src) (http, https,
 *    mailto or relative addresses only), "*" bullets and "[ ] / [x]" tasks, "1." lists, nested lists
 *    (two spaces per level), "---" rules, quotes (one "> " line per line), tables (with :--- / :---: /
 *    ---: column alignment), fenced code, mermaid fences and <div dir="rtl|ltr"> wrappers.
 *  - Text must never turn into markup on the way back: the parser has no backslash escapes, so
 *    "markdown-looking" text is neutralised with look-alike characters / a zero-width guard.
 *  - Rendering must be stable: parse(convert(parse(md))) === parse(md)  (enforced by tests).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MdVisual = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ZW = '\u200B';          // zero-width space: guard in front of text that looks like markup
  const STAR = '\uE000';        // private-use placeholder for a literal "*" (resolved per output line)
  const LOOKALIKE_STAR = '\u2217';
  const LOOKALIKE_TICK = '\u02CB';
  const LOOKALIKE_PIPE = '\u00A6';

  /* ------------------------------------------------------------------ tiny HTML parser */

  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'param', 'track']);
  const RAW_TEXT = new Set(['script', 'style']);
  const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' };

  function decodeEntities(s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = (e[1] === 'x' || e[1] === 'X') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        try { return String.fromCodePoint(code); } catch (_) { return m; }
      }
      const k = e.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED, k) ? NAMED[k] : m;
    });
  }

  function parseHtml(html) {
    const src = String(html == null ? '' : html);
    const n = src.length;
    const rootNode = { type: 'el', tag: '#root', attrs: {}, children: [] };
    const stack = [rootNode];
    const top = () => stack[stack.length - 1];
    const addText = (text) => { if (text) top().children.push({ type: 'text', text }); };
    const nameRe = /[^\s"'>\/=]+/y;
    const tagRe = /<([a-zA-Z][\w:-]*)/y;
    let lower = null;

    const BLOCKISH = new Set(['p', 'div', 'ul', 'ol', 'table', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    function open(tag, attrs, selfClose) {
      if (tag === 'li') { for (let k = stack.length - 1; k > 0 && stack[k].tag !== 'ul' && stack[k].tag !== 'ol'; k--) if (stack[k].tag === 'li') { stack.length = k; break; } }
      else if (tag === 'td' || tag === 'th') { for (let k = stack.length - 1; k > 0 && stack[k].tag !== 'tr'; k--) if (stack[k].tag === 'td' || stack[k].tag === 'th') { stack.length = k; break; } }
      else if (tag === 'tr') { for (let k = stack.length - 1; k > 0 && stack[k].tag !== 'table' && stack[k].tag !== 'tbody' && stack[k].tag !== 'thead'; k--) if (stack[k].tag === 'tr') { stack.length = k; break; } }
      if (BLOCKISH.has(tag) && top().tag === 'p') stack.pop();
      const node = { type: 'el', tag, attrs, children: [] };
      top().children.push(node);
      if (!VOID.has(tag) && !selfClose) stack.push(node);
      return node;
    }
    function close(tag) {
      for (let k = stack.length - 1; k > 0; k--) if (stack[k].tag === tag) { stack.length = k; return; }
    }

    let i = 0;
    while (i < n) {
      if (src[i] !== '<') {
        const j = src.indexOf('<', i);
        const end = j < 0 ? n : j;
        addText(decodeEntities(src.slice(i, end)));
        i = end;
        continue;
      }
      if (src.startsWith('<!--', i)) { const j = src.indexOf('-->', i + 4); i = j < 0 ? n : j + 3; continue; }
      if (src[i + 1] === '/') {
        const j = src.indexOf('>', i);
        if (j < 0) break;
        close(src.slice(i + 2, j).trim().toLowerCase());
        i = j + 1;
        continue;
      }
      tagRe.lastIndex = i;
      const m = tagRe.exec(src);
      if (!m) { addText('<'); i++; continue; }
      const tag = m[1].toLowerCase();
      let j = i + m[0].length;
      const attrs = {};
      let selfClose = false;
      while (j < n && src[j] !== '>') {
        const c = src[j];
        if (c === '/') { selfClose = true; j++; continue; }
        if (/\s/.test(c)) { j++; continue; }
        selfClose = false;
        nameRe.lastIndex = j;
        const nm = nameRe.exec(src);
        if (!nm) { j++; continue; }
        j += nm[0].length;
        let val = '';
        while (j < n && /\s/.test(src[j])) j++;
        if (src[j] === '=') {
          j++;
          while (j < n && /\s/.test(src[j])) j++;
          if (src[j] === '"' || src[j] === "'") {
            const q = src[j];
            const k = src.indexOf(q, j + 1);
            const e = k < 0 ? n : k;
            val = src.slice(j + 1, e);
            j = e + 1;
          } else {
            const s0 = j;
            while (j < n && !/[\s>]/.test(src[j])) j++;
            val = src.slice(s0, j);
          }
        }
        attrs[nm[0].toLowerCase()] = decodeEntities(val);
      }
      i = j + 1;
      open(tag, attrs, selfClose);
      if (RAW_TEXT.has(tag)) {
        if (lower === null) lower = src.toLowerCase();
        const k = lower.indexOf('</' + tag, i);
        const e = k < 0 ? n : k;
        i = e;                       // the content is skipped; the closing tag is handled by the loop
      }
    }
    return { type: 'root', tag: '#root', attrs: {}, children: rootNode.children };
  }

  /* ------------------------------------------------------------------ node helpers */

  const HEADING = /^h([1-6])$/;
  const BLOCK_TAGS = new Set(['p', 'div', 'ul', 'ol', 'li', 'blockquote', 'pre', 'table', 'thead', 'tbody', 'tfoot', 'tr',
    'section', 'article', 'main', 'header', 'footer', 'aside', 'nav', 'figure', 'figcaption', 'details', 'summary', 'hr',
    'form', 'fieldset', 'dl', 'dt', 'dd', 'address']);
  const SKIP_TAGS = new Set(['script', 'style', 'template', 'head', 'noscript', 'button', 'svg', 'textarea', 'select']);

  const isEl = (n) => n.type === 'el';
  const hasClass = (n, c) => (' ' + (n.attrs.class || '') + ' ').indexOf(' ' + c + ' ') >= 0;
  const isBlock = (n) => isEl(n) && (BLOCK_TAGS.has(n.tag) || HEADING.test(n.tag));

  function shouldSkip(n) {
    if (!isEl(n)) return false;
    if (SKIP_TAGS.has(n.tag)) return true;
    if (n.attrs['data-md-ignore'] !== undefined) return true;
    if (hasClass(n, 'mdw-attribution-footer')) return true;
    return false;
  }

  function textContent(n) {
    if (!isEl(n)) return n.text;
    if (shouldSkip(n)) return '';
    if (n.tag === 'br') return '\n';
    return n.children.map(textContent).join('');
  }

  /* ------------------------------------------------------------------ inline content */

  // Links and images: only http(s), mailto and relative addresses are allowed (the same rule as
  // parseMarkdown). Characters that would end the "(...)" part of the syntax are percent-encoded first.
  function encodeUrl(u) {
    return String(u == null ? '' : u).trim().replace(/[\s()`|\u0000-\u001F\u007F]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
  }

  function safeUrl(u) {
    const s = encodeUrl(u);
    if (!s) return null;
    if (/^(?:https?:|mailto:)/i.test(s)) return s;
    if (/^[\/\\]{2}/.test(s)) return null;      // "//host" is an external address in disguise
    if (/^[^\/?#]*:/.test(s)) return null;      // any other scheme (javascript:, data:, vbscript: ...)
    return s;
  }

  function collectRuns(nodes, st, out) {
    for (const n of nodes) {
      if (!isEl(n)) { out.push({ k: 't', text: n.text, strong: !!st.strong, em: !!st.em, code: !!st.code, del: !!st.del, href: st.href || null }); continue; }
      if (shouldSkip(n)) continue;
      const tag = n.tag;
      if (tag === 'br') { out.push({ k: 'br' }); continue; }
      if (tag === 'img') {
        const src = safeUrl(n.attrs.src);
        const alt = n.attrs.alt || '';
        if (src) out.push({ k: 'img', src, alt, del: !!st.del, href: st.href || null });
        else if (alt) out.push({ k: 't', text: alt, strong: !!st.strong, em: !!st.em, code: false, del: !!st.del, href: st.href || null });
        continue;
      }
      let next = st;
      if (tag === 'a') { const href = safeUrl(n.attrs.href); if (href) next = Object.assign({}, st, { href }); }
      if (tag === 'strong' || tag === 'b') next = Object.assign({}, st, { strong: true });
      else if (tag === 'em' || tag === 'i') next = Object.assign({}, st, { em: true });
      else if (tag === 'del' || tag === 's' || tag === 'strike') next = Object.assign({}, st, { del: true });
      else if (tag === 'code' || tag === 'kbd' || tag === 'samp' || tag === 'tt') next = Object.assign({}, st, { code: true });
      else if (tag === 'span' || tag === 'font') {
        const style = n.attrs.style || '';
        const add = {};
        if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) add.strong = true;
        if (/font-style\s*:\s*italic/i.test(style)) add.em = true;
        if (/text-decoration[^;]*line-through/i.test(style)) add.del = true;
        if (add.strong || add.em || add.del) next = Object.assign({}, st, add);
      }
      collectRuns(n.children, next, out);
    }
  }

  function renderRun(r) {
    if (r.k === 'img') return '![' + String(r.alt).replace(/[\[\]]/g, '').replace(/\*/g, LOOKALIKE_STAR).replace(/\s+/g, ' ') + '](' + r.src + ')';
    const m = /^( *)([\s\S]*?)( *)$/.exec(r.text);
    const lead = m[1], core = m[2], trail = m[3];
    if (!core) return lead + trail;
    let safe = core.replace(/`/g, LOOKALIKE_TICK).replace(/\*/g, STAR);
    if (r.code) return lead + '`' + safe + '`' + trail;
    // "~~" would pair into <del>, "](" would close a link: a zero-width space keeps them apart
    safe = safe.replace(/~(?=~)/g, '~' + ZW).replace(/\]\(/g, ']' + ZW + '(');
    if (r.inLink) safe = safe.replace(/\[/g, '\uFF3B').replace(/\]/g, '\uFF3D');   // a bracket would end the link text
    let t = safe;
    if (r.strong && r.em) t = '***' + t + '***';
    else if (r.strong) t = '**' + t + '**';
    else if (r.em) t = '*' + t + '*';
    return lead + t + trail;
  }

  // keep neighbouring delimiters apart (a "*" or "~" run followed by another one would pair up)
  function joinParts(parts) {
    let out = '';
    parts.forEach((s) => {
      if (!s) return;
      if ((out.endsWith('*') && s.startsWith('*')) || (out.endsWith('~') && s.startsWith('~'))) out += ZW;
      out += s;
    });
    return out;
  }

  function wrapEdges(inner, open, close) {
    const m = /^( *)([\s\S]*?)( *)$/.exec(inner);
    return m[2] ? m[1] + open + m[2] + close + m[3] : inner;
  }

  // Links ([text](url)) and strike (~~text~~) wrap a whole stretch of neighbouring runs, so the
  // marks inside them (bold, italic, code ...) stay inside one pair of delimiters.
  const WRAPPERS = ['href', 'del'];

  function renderGroup(runs, level) {
    if (level >= WRAPPERS.length) return joinParts(runs.map(renderRun));
    const key = WRAPPERS[level];
    const parts = [];
    let i = 0;
    while (i < runs.length) {
      const v = runs[i][key];
      let j = i + 1;
      while (j < runs.length && runs[j][key] === v) j++;
      const seg = runs.slice(i, j);
      if (!v) parts.push(renderGroup(seg, level + 1));
      else {
        const inner = renderGroup(seg.map((r) => Object.assign({}, r, { [key]: null }, key === 'href' ? { inLink: true } : {})), level + 1);
        parts.push(key === 'href' ? wrapEdges(inner, '[', '](' + v + ')') : wrapEdges(inner, '~~', '~~'));
      }
      i = j;
    }
    return joinParts(parts);
  }

  function renderRuns(runs) {
    const rs = runs.map((r) => (r.k === 'img' ? Object.assign({}, r) : Object.assign({}, r, { text: r.text.replace(/[ \t\r\n\f\u00A0]+/g, ' ') })));
    const merged = [];
    rs.forEach((r) => {
      const p = merged[merged.length - 1];
      if (p && p.k === 't' && r.k === 't' && p.strong === r.strong && p.em === r.em && p.code === r.code && p.del === r.del && p.href === r.href) p.text += r.text; else merged.push(r);
    });
    for (const r of merged) { if (r.k === 'img') break; r.text = r.text.replace(/^ +/, ''); if (r.text) break; }
    for (let k = merged.length - 1; k >= 0; k--) { if (merged[k].k === 'img') break; merged[k].text = merged[k].text.replace(/ +$/, ''); if (merged[k].text) break; }
    return renderGroup(merged, 0).replace(/ {2,}/g, ' ');
  }

  // lines of inline markup (a <br> starts a new line); literal asterisks are still placeholders
  function inlineLines(nodes) {
    const runs = [];
    collectRuns(nodes, {}, runs);
    const lines = [[]];
    runs.forEach((r) => { if (r.k === 'br') lines.push([]); else lines[lines.length - 1].push(r); });
    return lines.map(renderRuns).filter((l) => l !== '');
  }

  const inlineFlat = (nodes) => inlineLines(nodes).join(' ');

  // A literal "*" survives only when it is the only asterisk on its line; otherwise it could pair
  // with another one into <em>/<strong>, so it is swapped for a look-alike character.
  function resolveStars(line) {
    const c = (line.match(/\uE000/g) || []).length;
    if (!c) return line;
    const others = (line.match(/\*/g) || []).length;
    return line.replace(/\uE000/g, c === 1 && others === 0 ? '*' : LOOKALIKE_STAR);
  }

  // text that merely looks like block markup gets a zero-width guard in front of it
  const GUARD = /^(?:#{1,6} |[*+-] |\d+\. |>|\||<|(?:-{3,}|\*{3,}|_{3,})[ \t]*$)/;
  const guard = (line) => (GUARD.test(line) ? ZW + line : line);

  /* ------------------------------------------------------------------ blocks */

  function paragraph(nodes) {
    const lines = inlineLines(nodes).map(resolveStars).map(guard);
    return lines.join('\n');
  }

  function heading(level, node) {
    const text = resolveStars(inlineFlat(node.children));
    return text ? '#'.repeat(level) + ' ' + text : '';
  }

  // inline nodes of a list item / quote, with block children (p, div) flattened into the flow
  function flowNodes(children) {
    const out = [];
    children.forEach((c, idx) => {
      if (isEl(c) && (c.tag === 'p' || c.tag === 'div') && !shouldSkip(c)) {
        if (idx > 0) out.push({ type: 'text', text: ' ' });
        out.push(...flowNodes(c.children));
        out.push({ type: 'text', text: ' ' });
      } else out.push(c);
    });
    return out;
  }

  const TASK_LOOK = /^\[[ xX]\] /;     // list-item text that would be re-read as a task marker

  // Flattens a (possibly nested) list into [{ depth, ordered, text }] in document order.
  // A <ul>/<ol> that sits directly inside a list (what Chromium's "indent" produces) is a nested
  // list one level below the <li> before it, exactly like one inside that <li>.
  function collectItems(list, out, depth) {
    const ordered = list.tag === 'ol';
    list.children.forEach((li) => {
      if (!isEl(li) || shouldSkip(li)) return;
      if (li.tag === 'ul' || li.tag === 'ol') { collectItems(li, out, depth + 1); return; }
      if (li.tag !== 'li') return;
      const inline = [];
      const nested = [];
      flowNodes(li.children).forEach((c) => { if (isEl(c) && (c.tag === 'ul' || c.tag === 'ol')) nested.push(c); else inline.push(c); });
      const box = inline.find((c) => isEl(c) && c.tag === 'input' && (c.attrs.type || '').toLowerCase() === 'checkbox');
      let text = resolveStars(inlineFlat(inline));
      if (box) text = (box.attrs.checked !== undefined ? '[x] ' : '[ ] ') + text;
      else if (TASK_LOOK.test(text)) text = ZW + text;
      if (text) out.push({ depth, ordered, text });
      nested.forEach((nl) => collectItems(nl, out, depth + 1));
    });
  }

  // two spaces per level (what parseMarkdown reads); numbered lists count per list and level
  function listBlock(node) {
    const items = [];
    collectItems(node, items, 0);
    if (!items.length) return '';
    const counters = [];
    return items.map((it) => {
      counters.length = it.depth + 1;                       // leaving a level forgets the deeper counters
      counters[it.depth] = (it.ordered && counters[it.depth] !== undefined ? counters[it.depth] : 0) + 1;
      const marker = it.ordered ? counters[it.depth] + '. ' : '* ';
      return '  '.repeat(it.depth) + marker + it.text;
    }).join('\n');
  }

  function quoteBlock(node) {
    const lines = [];
    const walk = (children) => {
      let buf = [];
      const flush = () => { if (buf.length) { inlineLines(buf).forEach((l) => lines.push(l)); buf = []; } };
      children.forEach((c) => {
        if (isEl(c) && shouldSkip(c)) return;
        if (isEl(c) && isBlock(c)) { flush(); walk(c.children); } else buf.push(c);
      });
      flush();
    };
    walk(node.children);
    return lines.map((l) => '> ' + resolveStars(l)).join('\n');
  }

  function tableBlock(node) {
    const rows = [];
    const walk = (n) => n.children.forEach((c) => {
      if (!isEl(c) || shouldSkip(c)) return;
      if (c.tag === 'tr') rows.push(c.children.filter((x) => isEl(x) && (x.tag === 'td' || x.tag === 'th') && !shouldSkip(x)));
      else if (c.tag === 'thead' || c.tag === 'tbody' || c.tag === 'tfoot') walk(c);
    });
    walk(node);
    const data = rows.filter((r) => r.length).map((r) => r.map((cell) => inlineFlat(cell.children).replace(/\|/g, LOOKALIKE_PIPE)));
    if (!data.length) return '';
    const cols = Math.max.apply(null, data.map((r) => r.length));
    const fmt = (cells) => resolveStars('| ' + cells.concat(Array(cols - cells.length).fill('')).join(' | ') + ' |');
    // column alignment comes from the header row's cells (style="text-align:..." or align="...")
    const alignOf = (cell) => {
      const sm = /text-align\s*:\s*(left|right|center)/i.exec(cell.attrs.style || '');
      const a = (sm ? sm[1] : (cell.attrs.align || '')).toLowerCase();
      return a === 'left' ? ':---' : (a === 'right' ? '---:' : (a === 'center' ? ':---:' : '---'));
    };
    const header = rows.filter((r) => r.length)[0];
    const seps = Array.from({ length: cols }, (_, i) => (header[i] ? alignOf(header[i]) : '---'));
    const lines = [fmt(data[0]), '| ' + seps.join(' | ') + ' |'];
    data.slice(1).forEach((r) => lines.push(fmt(r)));
    return lines.join('\n');
  }

  function fence(lang, text) {
    const clean = String(text).replace(/```/g, LOOKALIKE_TICK.repeat(3)).replace(/^\n+|\n+$/g, '');
    return '```' + lang + '\n' + clean + (clean ? '\n' : '') + '```';
  }

  function codeBlock(node) {
    const code = node.children.find((c) => isEl(c) && c.tag === 'code');
    const target = code || node;
    const m = /(?:^|\s)language-([A-Za-z0-9_]*)/.exec((code && code.attrs.class) || '');
    return fence(m ? m[1] : '', textContent(target));
  }

  function blockOf(n) {
    const h = HEADING.exec(n.tag);
    if (h) return heading(Number(h[1]), n);
    switch (n.tag) {
      case 'p': case 'li': case 'summary': case 'figcaption': case 'dt': case 'dd': return paragraph(n.children);
      case 'ul': case 'ol': return listBlock(n);
      case 'blockquote': return quoteBlock(n);
      case 'pre': return codeBlock(n);
      case 'table': return tableBlock(n);
      case 'hr': return '---';
      case 'div': {
        if (hasClass(n, 'mermaid-diagram-container')) {
          const src = n.attrs['data-mermaid-source'];
          return src === undefined ? '' : fence('mermaid', src);
        }
        const dir = (n.attrs.dir || '').toLowerCase();
        if (dir === 'rtl' || dir === 'ltr') {
          const inner = blocksFrom(n.children).join('\n\n');
          return '<div dir="' + dir + '">\n' + inner + (inner ? '\n' : '') + '</div>';
        }
        return blocksFrom(n.children);
      }
      default: return blocksFrom(n.children);
    }
  }

  function blocksFrom(nodes) {
    const out = [];
    let buf = [];
    const flush = () => { if (buf.length) { const p = paragraph(buf); if (p) out.push(p); buf = []; } };
    nodes.forEach((n) => {
      if (isEl(n) && shouldSkip(n)) return;
      if (!isEl(n) || !isBlock(n)) { buf.push(n); return; }
      flush();
      const b = blockOf(n);
      if (Array.isArray(b)) b.forEach((x) => { if (x) out.push(x); }); else if (b) out.push(b);
    });
    flush();
    return out;
  }

  function htmlToMarkdown(html) {
    const tree = parseHtml(html);
    const blocks = blocksFrom(tree.children);
    return blocks.length ? blocks.join('\n\n') + '\n' : '';
  }

  /* ------------------------------------------------------------------ paste (plain text only) */

  function plainTextToHtml(text) {
    const t = String(text == null ? '' : text).replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '');
    if (!t) return '';
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const paras = t.split(/\n{2,}/).map((p) => esc(p).replace(/\n/g, '<br>'));
    return paras.length === 1 ? paras[0] : paras.map((p) => '<p>' + p + '</p>').join('');
  }

  return { ZW, parseHtml, htmlToMarkdown, plainTextToHtml, textContent, safeUrl };
});
