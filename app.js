(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const editor = $('#editor');
  const preview = $('#preview');
  const fileInput = $('#fileInput');
  const status = $('#status');
  const dirSelect = $('#dirSelect');
  let currentFileName = 'document.md';
  const APP_VERSION = '0.3.9';
  const SW_VERSION = '0.3.9';
  const BUILD_ID = '20260906-01';
  const BUILD_TIME = '2026-09-06 12:00';
  let waitingWorker = null;

  // תבניות ברירת מחדל
  const defaultTemplates = {
    requirements: { name: 'אפיון דרישה', icon: '▧', content: `# אפיון דרישה\n\n## רקע עסקי\n\n## מטרת הדרישה\n\n## תכולה\n\n## משתמשים / בעלי עניין\n\n## דרישות פונקציונליות\n- \n\n## דרישות לא פונקציונליות\n- אבטחת מידע\n- נגישות\n- תפעול ותחזוקה\n\n## תרשים תהליך\n\n\`\`\`mermaid\nflowchart LR\n    A[פתיחת דרישה] --> B[אפיון]\n    B --> C[פיתוח]\n    C --> D[QA]\n\`\`\`\n` },
    prd: { name: 'PRD', icon: '▱', content: `# PRD\n\n## Problem\n\n## Goal\n\n## Users\n\n## Scope\n\n## User Stories\n- As a [Role], I want [Feature], So that [Benefit]\n\n## Acceptance Criteria\n- [ ] \n` },
    hld: { name: 'HLD', icon: '◇', content: `# HLD\n\n## מטרות\n\n## ארכיטקטורה\n\n\`\`\`mermaid\nflowchart LR\n    UI[Client] --> API[API]\n    API --> DB[(Database)]\n\`\`\`\n\n## אבטחת מידע\n\n## תפעול\n` },
    aidlc: { name: 'AI-DLC', icon: '◎', content: `# AI-DLC\n\n## Context\n\n## Required Inputs\n1. \n\n## Human-in-the-Loop Gates\n- [ ] Gate 1: Product approval\n- [ ] Gate 2: Architecture approval\n\n## Deliverables\n- \n` },
    meeting: { name: 'סיכום פגישה', icon: '≡', content: `# סיכום פגישה\n\n**תאריך:** \n\n**משתתפים:** \n\n## נושאים מרכזיים\n- \n\n## החלטות\n- \n\n## משימות\n- [ ] משימה — Owner — תאריך\n` },
    pmo: { name: 'הנחיית PMO', icon: '◫', content: `# הנחיית PMO\n\n## מטרה\n\n## אחריות\n\n## תהליך עבודה\n\n\`\`\`mermaid\nflowchart LR\n    A[דרישה] --> B[תעדוף]\n    B --> C[תמחור]\n\`\`\`\n\n## נקודות בקרה\n- [ ] \n` },
    qa: { name: 'QA Checklist', icon: '✓', content: `# QA Checklist\n\n- [ ] הוגדרו Acceptance Criteria\n- [ ] קיימת תוכנית בדיקות\n- [ ] בוצעו בדיקות פונקציונליות\n- [ ] בוצעו בדיקות Regression\n- [ ] תועדו תוצאות\n` },
    security: { name: 'הגנת מידע', icon: '◈', content: `# הגנת מידע\n\n## מידע ורגישות\n\n## הרשאות\n\n## Logging\n\n## הצפנה\n\n## Checklist\n- [ ] בוצע תיקוף הגנת מידע\n- [ ] אין מידע רגיש בלוגים\n` }
  };

  // משיכת תבניות אישיות מה-LocalStorage
  let customTemplates = JSON.parse(localStorage.getItem('mdw_custom_templates') || '{}');

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function inlineMd(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }

  function parseMarkdown(md) {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    let html = '';
    let i = 0;
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    };

    while (i < lines.length) {
      const line = lines[i];

      if (/^```/.test(line)) {
        closeLists();
        const lang = line.slice(3).trim().toLowerCase();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        const code = buf.join('\n');
        if (lang === 'mermaid') {
          html += `<div class="mermaid-lite" data-mermaid="${encodeURIComponent(code)}"></div>`;
        } else {
          html += `<pre><code>${escapeHtml(code)}</code></pre>`;
        }
        i++;
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        closeLists();
        const headers = line.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim()));
          i++;
        }
        html += '<table><thead><tr>' + headers.map(x => `<th>${inlineMd(x)}</th>`).join('') + '</tr></thead><tbody>';
        html += rows.map(r => '<tr>' + headers.map((_, idx) => `<td>${inlineMd(r[idx] || '')}</td>`).join('') + '</tr>').join('');
        html += '</tbody></table>';
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeLists();
        const level = h[1].length;
        html += `<h${level}>${inlineMd(h[2])}</h${level}>`;
        i++; continue;
      }

      const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (task) {
        if (inOl) { html += '</ol>'; inOl = false; }
        if (!inUl) { html += '<ul class="task-list">'; inUl = true; }
        html += `<li><input type="checkbox" disabled ${task[1].toLowerCase() === 'x' ? 'checked' : ''}> ${inlineMd(task[2])}</li>`;
        i++; continue;
      }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        if (inOl) { html += '</ol>'; inOl = false; }
        if (!inUl) { html += '<ul>'; inUl = true; }
        html += `<li>${inlineMd(ul[1])}</li>`;
        i++; continue;
      }

      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) {
        if (inUl) { html += '</ul>'; inUl = false; }
        if (!inOl) { html += '<ol>'; inOl = true; }
        html += `<li>${inlineMd(ol[1])}</li>`;
        i++; continue;
      }

      if (/^>\s?/.test(line)) {
        closeLists();
        const quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i++; }
        html += `<blockquote>${quote.map(inlineMd).join('<br>')}</blockquote>`;
        continue;
      }

      if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        closeLists(); html += '<hr>'; i++; continue;
      }

      if (!line.trim()) { closeLists(); i++; continue; }

      closeLists();
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^```/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i]) && !/^>\s?/.test(lines[i])) {
        para.push(lines[i].trim()); i++;
      }
      html += `<p>${inlineMd(para.join(' '))}</p>`;
    }
    closeLists();
    return html;
  }

  function svgEl(name, attrs = {}, text = '') {
    const ns = 'http://www.w3.org/2000/svg';
    const el = document.createElementNS(ns, name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    if (text) el.textContent = text;
    return el;
  }

  function renderFlowchart(code, host) {
    const lines = code.split('\n').map(x => x.trim()).filter(Boolean);
    const directionMatch = (lines[0] || '').match(/^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)/i);
    const dir = (directionMatch?.[1] || 'TD').toUpperCase();
    const body = directionMatch ? lines.slice(1) : lines;
    const nodes = new Map();
    const edges = [];
    const nodePattern = /([A-Za-z0-9_]+)\s*(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\}|\[\(([^)]+)\)\])?/g;

    function remember(fragment) {
      let m;
      nodePattern.lastIndex = 0;
      while ((m = nodePattern.exec(fragment))) {
        const id = m[1];
        const label = m[2] || m[3] || m[4] || m[5] || id;
        if (!nodes.has(id)) nodes.set(id, { id, label });
      }
    }

    body.forEach(line => {
      remember(line);
      const arrow = line.match(/^(.+?)\s*--(?:>|\|([^|]+)\|\s*>)\s*(.+)$/) || line.match(/^(.+?)\s*-->\s*(.+)$/);
      if (arrow) {
        const left = arrow[1];
        const label = arrow.length > 3 ? (arrow[2] || '') : '';
        const right = arrow.length > 3 ? arrow[3] : arrow[2];
        const lid = left.match(/([A-Za-z0-9_]+)/)?.[1];
        const rid = right.match(/([A-Za-z0-9_]+)/)?.[1];
        if (lid && rid) edges.push({ from: lid, to: rid, label });
      }
    });

    if (!nodes.size) return false;
    const arr = [...nodes.values()];
    const horizontal = ['LR', 'RL'].includes(dir);
    const nodeW = 150, nodeH = 54, gap = 80, pad = 36;
    const width = horizontal ? pad * 2 + arr.length * nodeW + Math.max(0, arr.length - 1) * gap : 520;
    const height = horizontal ? 180 : pad * 2 + arr.length * nodeH + Math.max(0, arr.length - 1) * gap;
    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Mermaid flowchart' });
    const defs = svgEl('defs');
    const marker = svgEl('marker', { id: 'arrow', markerWidth: 10, markerHeight: 10, refX: 9, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' });
    marker.appendChild(svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: '#475569' })); defs.appendChild(marker); svg.appendChild(defs);

    const pos = new Map();
    arr.forEach((n, idx) => {
      let x, y;
      if (horizontal) { x = pad + idx * (nodeW + gap); y = 63; }
      else { x = (width - nodeW) / 2; y = pad + idx * (nodeH + gap); }
      if (dir === 'RL') x = width - pad - nodeW - idx * (nodeW + gap);
      if (dir === 'BT') y = height - pad - nodeH - idx * (nodeH + gap);
      pos.set(n.id, { x, y });
    });

    edges.forEach(e => {
      const a = pos.get(e.from), b = pos.get(e.to); if (!a || !b) return;
      const x1 = a.x + nodeW / 2, y1 = a.y + nodeH / 2, x2 = b.x + nodeW / 2, y2 = b.y + nodeH / 2;
      svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: '#475569', 'stroke-width': 2, 'marker-end': 'url(#arrow)' }));
      if (e.label) svg.appendChild(svgEl('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 7, 'text-anchor': 'middle', fill: '#334155', 'font-size': 12 }, e.label));
    });

    arr.forEach(n => {
      const p = pos.get(n.id);
      svg.appendChild(svgEl('rect', { x: p.x, y: p.y, width: nodeW, height: nodeH, rx: 10, fill: '#f8fafc', stroke: '#64748b', 'stroke-width': 1.5 }));
      const text = svgEl('text', { x: p.x + nodeW / 2, y: p.y + nodeH / 2 + 4, 'text-anchor': 'middle', fill: '#0f172a', 'font-size': 13, direction: 'rtl' }, n.label);
      svg.appendChild(text);
    });
    host.appendChild(svg);
    return true;
  }

  function renderSequence(code, host) {
    const lines = code.split('\n').map(x => x.trim()).filter(Boolean);
    const participants = [];
    const messages = [];
    lines.forEach(line => {
      let m = line.match(/^participant\s+([^\s]+)(?:\s+as\s+(.+))?$/i);
      if (m) { if (!participants.find(p => p.id === m[1])) participants.push({ id: m[1], label: m[2] || m[1] }); return; }
      m = line.match(/^([^\s]+)\s*[-.]+>>?\+?\s*([^:]+):\s*(.+)$/);
      if (m) {
        [m[1], m[2].trim()].forEach(id => { if (!participants.find(p => p.id === id)) participants.push({ id, label: id }); });
        messages.push({ from: m[1], to: m[2].trim(), text: m[3] });
      }
    });
    if (!participants.length) return false;
    const w = Math.max(640, participants.length * 180 + 80), h = 120 + Math.max(1, messages.length) * 64;
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': 'Mermaid sequence diagram' });
    const xMap = new Map();
    participants.forEach((p, idx) => {
      const x = 70 + idx * ((w - 140) / Math.max(1, participants.length - 1)); xMap.set(p.id, x);
      svg.appendChild(svgEl('rect', { x: x - 60, y: 20, width: 120, height: 38, rx: 7, fill: '#f8fafc', stroke: '#64748b' }));
      svg.appendChild(svgEl('text', { x, y: 44, 'text-anchor': 'middle', fill: '#0f172a', 'font-size': 13 }, p.label));
      svg.appendChild(svgEl('line', { x1: x, y1: 58, x2: x, y2: h - 24, stroke: '#94a3b8', 'stroke-dasharray': '5,5' }));
    });
    messages.forEach((m, idx) => {
      const y = 96 + idx * 64, x1 = xMap.get(m.from), x2 = xMap.get(m.to);
      svg.appendChild(svgEl('line', { x1, y1: y, x2, y2: y, stroke: '#475569', 'stroke-width': 2 }));
      const dir = x2 >= x1 ? 1 : -1;
      svg.appendChild(svgEl('path', { d: `M ${x2} ${y} l ${-9 * dir} -5 l 0 10 z`, fill: '#475569' }));
      svg.appendChild(svgEl('text', { x: (x1 + x2) / 2, y: y - 9, 'text-anchor': 'middle', fill: '#334155', 'font-size': 12 }, m.text));
    });
    host.appendChild(svg); return true;
  }

  function renderState(code, host) {
    const normalized = code.replace(/^stateDiagram(?:-v2)?\s*/i, 'flowchart TD\n').replace(/\[\*\]/g, 'StartEnd');
    return renderFlowchart(normalized, host);
  }

  function renderGantt(code, host) {
    const lines = code.split('\n').map(x => x.trim()).filter(Boolean);
    let section = 'Tasks'; const tasks = [];
    for (const line of lines) {
      if (/^gantt$/i.test(line) || /^(title|dateFormat|axisFormat|excludes)\b/i.test(line)) continue;
      const sm = line.match(/^section\s+(.+)/i); if (sm) { section = sm[1]; continue; }
      const m = line.match(/^([^:]+):\s*(.+)$/); if (m) tasks.push({ section, name: m[1].trim(), meta: m[2].trim() });
    }
    if (!tasks.length) return false;
    const w = 760, rowH = 38, h = 50 + tasks.length * rowH;
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': 'Mermaid gantt diagram' });
    tasks.forEach((t, idx) => {
      const y = 28 + idx * rowH; const x = 230; const len = 180 + (idx % 3) * 70;
      svg.appendChild(svgEl('text', { x: 10, y: y + 16, fill: '#334155', 'font-size': 12 }, `${t.section} — ${t.name}`));
      svg.appendChild(svgEl('rect', { x, y, width: len, height: 20, rx: 4, fill: '#dbeafe', stroke: '#64748b' }));
      svg.appendChild(svgEl('text', { x: x + 6, y: y + 14, fill: '#1e293b', 'font-size': 10 }, t.meta));
    });
    host.appendChild(svg); return true;
  }

  function renderER(code, host) {
    const lines = code.split('\n').map(x => x.trim()).filter(Boolean).filter(x => !/^erDiagram$/i.test(x));
    const entities = [];
    lines.forEach(line => {
      const m = line.match(/^([A-Za-z0-9_]+)\s+[^\s]+\s+([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
      if (m) { [m[1], m[2]].forEach(e => { if (!entities.includes(e)) entities.push(e); }); }
    });
    if (!entities.length) return false;
    const pseudo = 'flowchart LR\n' + entities.map((e, idx) => `${e}[${e}]${idx < entities.length - 1 ? ' --> ' + entities[idx + 1] : ''}`).join('\n');
    return renderFlowchart(pseudo, host);
  }

  function renderMermaidBlocks() {
    preview.querySelectorAll('.mermaid-lite').forEach(host => {
      const code = decodeURIComponent(host.dataset.mermaid || '');
      const first = code.trim().split(/\s+/)[0]?.toLowerCase() || '';
      let ok = false;
      try {
        if (first === 'flowchart' || first === 'graph') ok = renderFlowchart(code, host);
        else if (first === 'sequencediagram') ok = renderSequence(code, host);
        else if (first.startsWith('statediagram')) ok = renderState(code, host);
        else if (first === 'gantt') ok = renderGantt(code, host);
        else if (first === 'erdiagram') ok = renderER(code, host);
      } catch (e) { ok = false; }
      if (!ok) {
        host.innerHTML = `<div class="diagram-fallback"><strong>תרשים Mermaid לא נתמך במנוע Offline Lite</strong><pre><code>${escapeHtml(code)}</code></pre></div>`;
      } else {
        const note = document.createElement('div'); note.className = 'diagram-note'; note.textContent = 'Rendered locally · Mermaid Offline Lite'; host.appendChild(note);
      }
    });
  }


  function baseName(name) {
    return (name || 'document.md').replace(/\.(md|markdown|html?)$/i, '') || 'document';
  }

  function downloadBlob(content, type, fileName) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildExportHtml() {
    const direction = dirSelect.value === 'ltr' ? 'ltr' : 'rtl';
    const lang = direction === 'rtl' ? 'he' : 'en';
    const title = baseName(currentFileName);
    const content = preview.innerHTML;
    const attributionEnabled = $('#includeAttribution')?.checked !== false;
    const css = `
      *{box-sizing:border-box} body{margin:0;background:#f6f7f9;color:#1f2937;font-family:Arial,"Segoe UI",sans-serif;line-height:1.65}
      .page{max-width:1100px;margin:24px auto;background:#fff;padding:36px 44px;border:1px solid #e2e8f0;border-radius:12px}
      h1,h2,h3{border-bottom:1px solid #e5e7eb;padding-bottom:.25em} table{width:100%;border-collapse:collapse;margin:12px 0} th,td{border:1px solid #cbd5e1;padding:7px 9px;text-align:start} th{background:#f8fafc}
      pre{background:#0f172a;color:#e2e8f0;border-radius:8px;padding:12px;overflow:auto;direction:ltr;text-align:left} code{font-family:Consolas,monospace} blockquote{margin:12px 0;padding:4px 12px;border-inline-start:4px solid #94a3b8;background:#f8fafc;color:#475569}
      .mermaid-lite{margin:16px 0;padding:12px;border:1px solid #dbe2ea;border-radius:10px;overflow:auto;background:#fff}.mermaid-lite svg{max-width:100%;height:auto;display:block;margin:auto}.diagram-note{font-size:11px;color:#64748b;margin-top:6px}
      .export-footer{margin-top:34px;padding-top:10px;border-top:1px solid #e5e7eb;color:#64748b;font-size:11px;display:flex;gap:14px;justify-content:space-between;flex-wrap:wrap}
      @page{size:A4;margin:16mm} @media print{body{background:#fff}.page{max-width:none;margin:0;padding:0;border:0;border-radius:0}.export-footer{break-inside:avoid}}
    `;
    return `<!doctype html>\n<html lang="${lang}" dir="${direction}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${escapeHtml(title)}</title>\n<style>${css}</style>\n</head>\n<body>\n<main class="page" dir="${direction}">\n${content}\n${attributionEnabled ? `<footer class="export-footer"><span>הופק מקומית באמצעות MD Workspace</span><span>v${APP_VERSION} · Build ${BUILD_ID}</span></footer>` : ''}\n</main>\n</body>\n</html>`;
  }

  function updateConnectivity() {
    const badge = $('#connectivityBadge');
    if (!badge) return;
    badge.textContent = navigator.onLine ? 'Local · Online' : 'Local · Offline';
  }

  function showUpdate(worker) {
    waitingWorker = worker || waitingWorker;
    const btn = $('#updateBtn');
    if (btn) { btn.hidden = false; btn.textContent = 'גרסה חדשה זמינה · עדכן וטען מחדש'; }
  }

  function render() {
    preview.innerHTML = parseMarkdown(editor.value);
    preview.dir = dirSelect.value;
    editor.dir = dirSelect.value;
    renderMermaidBlocks();
  }

  function setText(text, name = 'document.md') {
    editor.value = text; currentFileName = name; status.textContent = name; render();
  }

  function insertAtCursor(text) {
    const start = editor.selectionStart, end = editor.selectionEnd;
    editor.setRangeText(text, start, end, 'end'); editor.focus(); render();
  }

  // --- ניהול תבניות דינמי ---
  function renderTemplateMenu() {
    const menu = $('#templateMenu');
    menu.innerHTML = '';
    
    // תבניות ברירת מחדל
    Object.entries(defaultTemplates).forEach(([key, val]) => {
      menu.insertAdjacentHTML('beforeend', `<button type="button" role="menuitem" data-template="${key}" data-type="default"><span class="ui-icon">${val.icon}</span>${val.name}</button>`);
    });

    // תבניות אישיות (Custom)
    const customKeys = Object.keys(customTemplates);
    if (customKeys.length > 0) {
      menu.insertAdjacentHTML('beforeend', `<div class="menu-divider" style="height:1px; background:var(--border-main); margin:4px 0;"></div>`);
      customKeys.forEach(key => {
        menu.insertAdjacentHTML('beforeend', `<button type="button" role="menuitem" data-template="${key}" data-type="custom"><span class="ui-icon" style="color:#d97706;">★</span>${escapeHtml(key)}</button>`);
      });
    }

    // פעולות מערכת לתבניות
    menu.insertAdjacentHTML('beforeend', `<div class="menu-divider" style="height:1px; background:var(--border-main); margin:4px 0;"></div>`);
    menu.insertAdjacentHTML('beforeend', `<button type="button" role="menuitem" id="openSaveTemplateDialogBtn"><span class="ui-icon">＋</span>שמור / עדכן כתבנית...</button>`);
    menu.insertAdjacentHTML('beforeend', `<button type="button" role="menuitem" id="openManageTemplatesBtn"><span class="ui-icon">⚙</span>ניהול תבניות אישיות</button>`);
  }

  function renderManageTemplates() {
    const list = $('#customTemplatesList');
    list.innerHTML = '';
    const keys = Object.keys(customTemplates);
    if (keys.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center;">אין תבניות אישיות כרגע.</p>';
      return;
    }
    keys.forEach(key => {
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center';
      row.style.padding = '8px 0'; row.style.borderBottom = '1px solid var(--border-main)';
      const nameSpan = document.createElement('span'); nameSpan.textContent = key;
      const delBtn = document.createElement('button');
      delBtn.textContent = 'מחק'; delBtn.type = 'button';
      delBtn.style.color = '#ef4444'; delBtn.style.borderColor = '#fca5a5';
      delBtn.onclick = () => {
        if (confirm(`האם אתה בטוח שברצונך למחוק את התבנית "${key}"?`)) {
          delete customTemplates[key];
          localStorage.setItem('mdw_custom_templates', JSON.stringify(customTemplates));
          renderTemplateMenu(); renderManageTemplates();
        }
      };
      row.appendChild(nameSpan); row.appendChild(delBtn); list.appendChild(row);
    });
  }

  // אתחול התפריט
  renderTemplateMenu();

  const templateBtn = $('#templateBtn');
  const templateMenu = $('#templateMenu');
  templateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = templateMenu.hidden;
    templateMenu.hidden = !willOpen;
    templateBtn.setAttribute('aria-expanded', String(willOpen));
  });

  // Event Delegation לתפריט התבניות
  templateMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    if (btn.id === 'openSaveTemplateDialogBtn') {
      $('#saveTemplateDialog').showModal();
      templateMenu.hidden = true; templateBtn.setAttribute('aria-expanded', 'false');
    } else if (btn.id === 'openManageTemplatesBtn') {
      renderManageTemplates();
      $('#manageTemplatesDialog').showModal();
      templateMenu.hidden = true; templateBtn.setAttribute('aria-expanded', 'false');
    } else if (btn.dataset.template) {
      const key = btn.dataset.template;
      const isCustom = btn.dataset.type === 'custom';
      const content = isCustom ? customTemplates[key] : defaultTemplates[key].content;
      const title = isCustom ? key : defaultTemplates[key].name;
      setText(content || '# מסמך חדש\n', `${title}.md`);
      templateMenu.hidden = true; templateBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // שמירה / דריסת תבנית
  $('#confirmSaveTemplateBtn').addEventListener('click', () => {
    const name = $('#templateNameInput').value.trim();
    if (!name) { alert('נא להזין שם לתבנית'); return; }
    customTemplates[name] = editor.value;
    localStorage.setItem('mdw_custom_templates', JSON.stringify(customTemplates));
    renderTemplateMenu();
    $('#saveTemplateDialog').close();
    $('#templateNameInput').value = '';
    status.textContent = `תבנית "${name}" נשמרה`;
  });
  // -------------------------

  $('#openBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    const text = await file.text(); setText(text, file.name); fileInput.value = '';
  });
  $('#newBtn').addEventListener('click', () => setText('# מסמך חדש\n\n', 'document.md'));
  $('#settingsBtn').addEventListener('click', () => $('#settingsDialog').showModal());
  $('#exportBtn').addEventListener('click', () => {
    const name = /\.(md|markdown)$/i.test(currentFileName || '') ? currentFileName : `${baseName(currentFileName)}.md`;
    downloadBlob(editor.value, 'text/markdown;charset=utf-8', name);
    status.textContent = `${name} · נשמר ל-MD`;
  });
  $('#exportHtmlBtn').addEventListener('click', () => {
    const name = `${baseName(currentFileName)}_RTL.html`;
    downloadBlob(buildExportHtml(), 'text/html;charset=utf-8', name);
    status.textContent = `${name} · יוצא HTML`;
  });
  $('#printBtn').addEventListener('click', () => {
    document.body.classList.toggle('hide-print-attribution', $('#includeAttribution')?.checked === false);
    window.print();
  });
  $('#updateBtn').addEventListener('click', () => {
    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    else location.reload();
  });
  document.querySelectorAll('[data-insert]').forEach(btn => btn.addEventListener('click', () => insertAtCursor(btn.dataset.insert)));
  $('#diagramBtn').addEventListener('click', () => insertAtCursor('\n```mermaid\nflowchart LR\n    A[שלב א] --> B[שלב ב]\n```\n'));
  dirSelect.addEventListener('change', render);
  editor.addEventListener('input', render);


  // v0.3.8 - quiet local auto-save with visible saving state
  let autosaveTimer = null;
  const autosaveStatus = $('#autosaveStatus');
  const autosaveText = $('#autosaveText');
  function setAutosaveState(state) {
    if (!autosaveStatus || !autosaveText) return;
    autosaveStatus.dataset.state = state;
    autosaveText.textContent =
      state === 'saving' ? 'שומר מקומית…' :
      state === 'pending' ? 'שינויים ממתינים' : 'נשמר מקומית';
  }
  function saveDraftLocal() {
    setAutosaveState('saving');
    window.setTimeout(() => {
      localStorage.setItem('mdw_draft', editor.value);
      localStorage.setItem('mdw_name', currentFileName);
      setAutosaveState('saved');
    }, 180);
  }
  function scheduleAutosave() {
    setAutosaveState('pending');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraftLocal, 1200);
  }
  editor.addEventListener('input', scheduleAutosave);

  document.addEventListener('click', (e) => {
    if (templateMenu && !templateMenu.hidden && !e.target.closest('.template-menu-wrap')) {
      templateMenu.hidden = true;
      templateBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && templateMenu && !templateMenu.hidden) {
      templateMenu.hidden = true;
      templateBtn.setAttribute('aria-expanded', 'false');
      templateBtn.focus();
    }
  });

  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return; refreshing = true; location.reload();
    });
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        if (reg.waiting) showUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing; if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
          });
        });
        reg.update().catch(() => {});
      } catch (_) {}
    });
  }

  // UPDATE VERSION DISPLAY HERE:
  $('#versionInfo').textContent = `App v${APP_VERSION} (SW v${SW_VERSION}) · Build ${BUILD_ID}`;
  $('#versionInfo').title = `Build time: ${BUILD_TIME}`;
  
  updateConnectivity();
  window.addEventListener('online', updateConnectivity);
  window.addEventListener('offline', updateConnectivity);

  const saved = localStorage.getItem('mdw_draft');
  if (saved) setText(saved, localStorage.getItem('mdw_name') || 'draft.md');
  else setText(`# MD Workspace Offline\n\nהמערכת פועלת ללא CDN וללא Backend.\n\n## דוגמת תרשים\n\n\`\`\`mermaid\nflowchart LR\n    A[פתיחת MD] --> B[עריכה]\n    B --> C[Preview]\n    C --> D[ייצוא MD]\n\`\`\`\n`, 'welcome.md');
})();


// ===== Theme support v0.3.5 =====
(function () {
  const STORAGE_KEY = "mdw-theme";
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const btn = document.getElementById("themeToggleBtn");
  const icon = document.getElementById("themeToggleIcon");

  function getPreference() {
    return localStorage.getItem(STORAGE_KEY) || "system";
  }

  function effectiveTheme(pref) {
    if (pref === "dark" || pref === "light") return pref;
    return media && media.matches ? "dark" : "light";
  }

  function render(pref) {
    const actual = effectiveTheme(pref);
    document.documentElement.dataset.themePreference = pref;
    document.documentElement.dataset.theme = actual;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', actual === 'dark' ? '#111827' : '#ffffff');

    if (btn) {
      btn.dataset.mode = pref;
      const labels = {
        system: "מצב תצוגה: לפי מערכת ההפעלה. לחץ למצב בהיר",
        light: "מצב תצוגה: בהיר. לחץ למצב כהה",
        dark: "מצב תצוגה: כהה. לחץ לחזרה להתאמה אוטומטית"
      };
      btn.title = labels[pref];
      btn.setAttribute("aria-label", labels[pref]);
    }
    if (icon) {
      icon.textContent = pref === "light" ? "☀" : pref === "dark" ? "☾" : "◐";
    }
  }

  function cycleTheme() {
    const current = getPreference();
    const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
    localStorage.setItem(STORAGE_KEY, next);
    render(next);
  }

  if (btn) btn.addEventListener("click", cycleTheme);

  if (media) {
    const listener = function () {
      if (getPreference() === "system") render("system");
    };
    if (media.addEventListener) media.addEventListener("change", listener);
    else if (media.addListener) media.addListener(listener);
  }

  render(getPreference());
})();


// ===== v0.3.8: sync active theme into preview containers =====
(function () {
  function syncPreviewTheme() {
    const theme = document.documentElement.dataset.theme || "light";
    document.querySelectorAll("#preview,.preview,.markdown-preview,.preview-panel,.preview-content,.preview-pane,.preview-container,.preview-wrapper")
      .forEach(el => {
        el.dataset.theme = theme;
        el.classList.toggle("theme-light", theme === "light");
        el.classList.toggle("theme-dark", theme === "dark");
      });
  }

  const observer = new MutationObserver(syncPreviewTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncPreviewTheme);
  } else {
    syncPreviewTheme();
  }
})();
