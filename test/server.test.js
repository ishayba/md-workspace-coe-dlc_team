const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server');

function request(server, requestPath) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: address.address, port: address.port, path: requestPath }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
  });
}

test('serves the application shell from /', async (t) => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  t.after(() => server.close());

  const response = await request(server, '/');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.body, /MD Workspace/);
});

test('returns 404 for a missing file', async (t) => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  t.after(() => server.close());

  const response = await request(server, '/does-not-exist.txt');
  assert.equal(response.status, 404);
});

test('does not serve files outside the workspace', async (t) => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  t.after(() => server.close());

  const response = await request(server, '/../package.json');
  assert.ok([403, 404].includes(response.status));
  assert.notEqual(response.body, fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
});
