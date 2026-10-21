const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_PORT } = require('../server');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('server exposes its default port', () => {
  assert.equal(typeof DEFAULT_PORT, 'number');
});

for (const launcher of ['START.cmd', 'START.command']) {
  test(`${launcher} opens the same port the server listens on by default`, () => {
    const ports = [...read(launcher).matchAll(/localhost:(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(ports.length > 0, 'launcher should open a localhost URL');
    for (const p of ports) assert.equal(p, DEFAULT_PORT);
  });
}
