const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server');
const { listen, request } = require('../test-support/server-utils');

test('serves the application shell from /', async (t) => {
  const server = createServer();
  await listen(server);
  t.after(() => server.close());

  const response = await request(server, '/');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.body, /MD Workspace/);
});

test('returns 404 for a missing file', async (t) => {
  const server = createServer();
  await listen(server);
  t.after(() => server.close());

  const response = await request(server, '/does-not-exist.txt');
  assert.equal(response.status, 404);
});

test('does not serve files outside the workspace', async (t) => {
  const server = createServer();
  await listen(server);
  t.after(() => server.close());

  const response = await request(server, '/../package.json');
  assert.ok([403, 404].includes(response.status));
  assert.notEqual(response.body, fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
});
