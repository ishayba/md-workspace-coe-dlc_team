const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');
const { listen, request } = require('../test-support/server-utils');

const H = { 'X-MDW-Request': '1' };

async function start(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-themes-'));
  const themesDir = path.join(dir, 'themes'); // deliberately does not exist yet
  const server = createServer({ themesDir });
  await listen(server);
  t.after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  return { server, themesDir };
}

const put = (server, id, css, headers = H) => request(server, `/api/themes/${id}`, { method: 'PUT', headers, body: css });

test('GET /api/themes → empty list when the folder does not exist yet', async (t) => {
  const { server } = await start(t);
  const r = await request(server, '/api/themes');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /application\/json/);
  assert.deepEqual(JSON.parse(r.body), { themes: [] });
});

test('PUT saves <id>.css, GET lists it (with name from the header) and returns its text', async (t) => {
  const { server, themesDir } = await start(t);
  const css = '/* mdw-theme v1 | id: exec | name: מסמך הנהלה */\n.template-exec h1 { color: #123456; }\n';
  const r = await put(server, 'exec', css);
  assert.equal(r.status, 201);
  assert.equal(fs.readFileSync(path.join(themesDir, 'exec.css'), 'utf8'), css);
  assert.deepEqual(fs.readdirSync(themesDir), ['exec.css'], 'no temp files left behind');

  const list = JSON.parse((await request(server, '/api/themes')).body).themes;
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'exec');
  assert.equal(list[0].name, 'מסמך הנהלה');

  const one = await request(server, '/api/themes/exec');
  assert.equal(one.status, 200);
  assert.match(one.headers['content-type'], /text\/css/);
  assert.equal(one.body, css);
});

test('PUT overwrites an existing theme', async (t) => {
  const { server, themesDir } = await start(t);
  await put(server, 'a', '.template-a h1 { color: red; }');
  const r = await put(server, 'a', '.template-a h1 { color: blue; }');
  assert.equal(r.status, 200);
  assert.match(fs.readFileSync(path.join(themesDir, 'a.css'), 'utf8'), /blue/);
});

test('rejects requests without the custom header, with a foreign Origin, or a non-local Host', async (t) => {
  const { server, themesDir } = await start(t);
  assert.equal((await put(server, 'a', 'x', {})).status, 403);
  assert.equal((await put(server, 'a', 'x', { ...H, Origin: 'https://evil.example' })).status, 403);
  assert.equal((await put(server, 'a', 'x', { ...H, Host: 'evil.example' })).status, 403);
  assert.equal((await request(server, '/api/themes', { headers: { Host: 'evil.example' } })).status, 403);
  assert.ok(!fs.existsSync(themesDir) || fs.readdirSync(themesDir).length === 0);
  // same-origin requests are fine
  const addr = server.address();
  const origin = `http://127.0.0.1:${addr.port}`;
  assert.equal((await put(server, 'a', '.template-a h1 {}', { ...H, Origin: origin })).status, 201);
});

test('rejects unsafe ids, oversized bodies, unknown routes and unsupported methods', async (t) => {
  const { server, themesDir } = await start(t);
  for (const bad of ['..%2Fescape', 'A%20B', 'a.b', '', 'x'.repeat(80), '-lead']) {
    const r = await put(server, bad, '.template-x {}');
    assert.ok([400, 404].includes(r.status), `id "${bad}" got ${r.status}`);
  }
  assert.equal((await put(server, 'big', 'a{}'.repeat(100000))).status, 413);
  assert.equal((await request(server, '/api/nope')).status, 404);
  assert.equal((await request(server, '/api/themes/exec', { method: 'DELETE', headers: H })).status, 405);
  assert.equal((await request(server, '/api/themes/missing')).status, 404);
  assert.ok(!fs.existsSync(themesDir) || fs.readdirSync(themesDir).length === 0);
});

test('the server sanitises before writing (defence in depth)', async (t) => {
  const { server, themesDir } = await start(t);
  const r = await put(server, 'evil', '.template-evil h1{color:red}\n</style><script>alert(1)</script>\n@import url(https://evil.example/x.css);');
  assert.equal(r.status, 201);
  const saved = fs.readFileSync(path.join(themesDir, 'evil.css'), 'utf8');
  assert.ok(!saved.includes('</'));
  assert.ok(!/@import/i.test(saved));
  assert.ok(JSON.parse(r.body).warnings.length >= 2);
});

test('the existing static behaviour is unchanged', async (t) => {
  const { server } = await start(t);
  assert.equal((await request(server, '/')).status, 200);
  assert.equal((await request(server, '/does-not-exist.txt')).status, 404);
});
