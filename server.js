const http = require('http');
const fs = require('fs');
const path = require('path');
const { sanitizeCss, parseThemeFile, MAX_CSS_CHARS } = require('./css-studio');

const root = __dirname;
// Must match the URL opened by START.cmd / START.command (enforced by test/launcher-port.test.js)
const DEFAULT_PORT = 8080;
const THEME_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_BODY_BYTES = MAX_CSS_CHARS * 4; // generous for UTF-8; the real limit is MAX_CSS_CHARS after decoding
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Project theme library: <themesDir>/<id>.css  (plain CSS files you can commit to git)
// Security model: the server only listens on 127.0.0.1, and every /api/ request must
//  - carry a loopback Host header (blocks DNS-rebinding),
//  - carry the custom X-MDW-Request header (a cross-origin page cannot send it without a
//    CORS preflight, which this server never approves),
//  - and, if it carries an Origin header, that Origin must be this very server.
// ---------------------------------------------------------------------------
function isLoopbackHost(host) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host || '');
}

function apiGuard(req) {
  const host = req.headers.host || '';
  if (!isLoopbackHost(host)) return 'bad host';
  if (req.headers['x-mdw-request'] !== '1' && req.method !== 'GET') return 'missing header';
  const origin = req.headers.origin;
  if (origin && origin !== `http://${host}`) return 'bad origin';
  return null;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function listThemes(themesDir) {
  let files = [];
  try { files = fs.readdirSync(themesDir); } catch { return []; }
  return files
    .filter((f) => f.endsWith('.css') && THEME_ID_RE.test(f.slice(0, -4)))
    .sort()
    .map((f) => {
      const full = path.join(themesDir, f);
      const st = fs.statSync(full);
      const head = fs.readFileSync(full, 'utf8').slice(0, 400);
      const parsed = parseThemeFile(head);
      return { id: f.slice(0, -4), name: parsed.name || f.slice(0, -4), file: `themes/${f}`, size: st.size, mtime: st.mtime.toISOString() };
    });
}

async function handleApi(req, res, urlPath, themesDir) {
  const denied = apiGuard(req);
  if (denied) return sendJson(res, 403, { error: 'forbidden', reason: denied });

  if (urlPath === '/api/themes') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
    return sendJson(res, 200, { themes: listThemes(themesDir) });
  }

  const m = urlPath.match(/^\/api\/themes\/([^/]*)$/);
  if (!m) return sendJson(res, 404, { error: 'not found' });
  const id = m[1];
  if (!THEME_ID_RE.test(id)) return sendJson(res, req.method === 'GET' ? 404 : 400, { error: 'invalid theme id' });
  const file = path.join(themesDir, `${id}.css`);

  if (req.method === 'GET') {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { return sendJson(res, 404, { error: 'not found' }); }
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(text);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await readBody(req, MAX_BODY_BYTES); } catch (e) { return sendJson(res, e.status || 400, { error: 'too large' }); }
    const clean = sanitizeCss(body);
    if (!clean.ok) return sendJson(res, 413, { error: 'too large' });
    fs.mkdirSync(themesDir, { recursive: true });
    const existed = fs.existsSync(file);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, clean.css, 'utf8');
    fs.renameSync(tmp, file); // atomic replace
    return sendJson(res, existed ? 200 : 201, { id, file: `themes/${id}.css`, warnings: clean.warnings });
  }

  return sendJson(res, 405, { error: 'method not allowed' });
}

function createServer(options = {}) {
  const themesDir = options.themesDir || path.join(root, 'themes');
  return http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('400 - Bad request');
    }

    if (urlPath.startsWith('/api/')) {
      return handleApi(req, res, urlPath, themesDir).catch(() => sendJson(res, 500, { error: 'server error' }));
    }

    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = path.resolve(root, rel);

    if (!file.startsWith(path.resolve(root) + path.sep) && file !== path.resolve(root, 'index.html')) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 - File not found');
      }

      res.writeHead(200, {
        'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(file).pipe(res);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`MD Workspace Offline running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop.');
  });
}

module.exports = { createServer, DEFAULT_PORT };
