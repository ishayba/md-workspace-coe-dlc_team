// v4.7.0 — export-core.js: CRC32, UTF-8 and the STORE-only ZIP writer (WF7.6, NFR7.6, NFR7.7, NFR8.8).
// The archive is opened with an independent reader (test-support/zip-reader.js) and, when the tool exists, with `unzip -t`.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const E = require('../export-core');
const { readZip, crc32Reference } = require('../test-support/zip-reader');

const u8 = (s) => new Uint8Array(Buffer.from(s, 'utf8'));

test('crc32("123456789") is the standard check value 0xCBF43926 (NFR7.7)', () => {
  assert.equal(E.crc32(u8('123456789')), 0xCBF43926);
  assert.equal(E.crc32('123456789'), 0xCBF43926);
});

test('crc32: empty input is 0, the result is unsigned, and it matches a bitwise reference on random data', () => {
  assert.equal(E.crc32(new Uint8Array(0)), 0);
  const data = new Uint8Array(5000).map((_, i) => (i * 131 + 7) & 0xFF);
  assert.equal(E.crc32(data), crc32Reference(data));
  assert.ok(E.crc32(u8('שלום')) >= 0);
});

test('utf8: Hebrew takes two bytes, an emoji four, and the bytes equal Node’s encoder', () => {
  assert.deepEqual([...E.utf8('א')], [0xD7, 0x90]);
  assert.equal(E.utf8('😀').length, 4);
  const s = 'Hello שלום 😀 — "x"';
  assert.deepEqual(Buffer.from(E.utf8(s)), Buffer.from(s, 'utf8'));
  assert.ok(E.utf8('') instanceof Uint8Array);
});

test('zipStore: signatures, UTF-8 flag, STORE method, sizes and CRC are right (WF7.6)', () => {
  const zip = E.zipStore([{ path: 'a.txt', data: 'hello' }, { path: 'dir/ב.xml', data: u8('<x>שלום</x>') }]);
  assert.ok(zip instanceof Uint8Array);
  const buf = Buffer.from(zip);
  assert.equal(buf.readUInt32LE(0), 0x04034b50);                   // PK\x03\x04
  assert.equal(buf.slice(0, 4).toString('latin1'), 'PK\x03\x04');
  assert.ok(buf.includes(Buffer.from('PK\x01\x02', 'latin1')));
  assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);     // PK\x05\x06
  const entries = readZip(zip);
  assert.deepEqual(entries.map((e) => e.name), ['a.txt', 'dir/ב.xml']);
  entries.forEach((e) => {
    assert.equal(e.method, 0, 'STORE');
    assert.equal(e.flags & 0x0800, 0x0800, 'UTF-8 names');
  });
  assert.equal(entries[0].data.toString(), 'hello');
  assert.equal(entries[0].crc, E.crc32('hello'));
  assert.equal(entries[1].data.toString('utf8'), '<x>שלום</x>');
  assert.equal(entries[1].size, Buffer.byteLength('<x>שלום</x>'));
});

test('zipStore: [Content_Types].xml is always the first entry, whatever the input order', () => {
  const zip = E.zipStore([{ path: 'word/document.xml', data: '<d/>' }, { path: '[Content_Types].xml', data: '<t/>' }, { path: '_rels/.rels', data: '<r/>' }]);
  assert.deepEqual(readZip(zip).map((e) => e.name), ['[Content_Types].xml', 'word/document.xml', '_rels/.rels']);
});

test('zipStore: the output is deterministic — same input, same bytes (NFR8.8)', () => {
  const parts = [{ path: '[Content_Types].xml', data: '<t/>' }, { path: 'a/b.txt', data: 'שלום' }];
  const a = E.zipStore(parts);
  const b = E.zipStore(parts.map((p) => ({ path: p.path, data: p.data })));
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
});

test('zipStore: a fixed DOS date and time (1980-01-01 00:00), no extra fields, no comment', () => {
  const buf = Buffer.from(E.zipStore([{ path: 'a', data: 'x' }]));
  assert.equal(buf.readUInt16LE(10), 0, 'time');
  assert.equal(buf.readUInt16LE(12), 0x0021, 'date = 1980-01-01');
  assert.equal(buf.readUInt16LE(28), 0, 'no extra field');
  assert.equal(buf.readUInt16LE(buf.length - 2), 0, 'no archive comment');
});

test('zipStore: an empty list gives a valid empty archive; bad input throws', () => {
  const empty = E.zipStore([]);
  assert.equal(empty.length, 22);
  assert.deepEqual(readZip(empty), []);
  assert.throws(() => E.zipStore([{ path: 'a', data: 'x' }, { path: 'a', data: 'y' }]), /duplicate/i);
  assert.throws(() => E.zipStore([{ path: '', data: 'x' }]), /path/i);
  assert.throws(() => E.zipStore([{ path: 'a', data: 42 }]), /data/i);
});

test('zipStore: a 1 MB part is stored without error and reads back identical (NFR7.6)', () => {
  const big = new Uint8Array(1024 * 1024).map((_, i) => (i * 31) & 0xFF);
  const entries = readZip(E.zipStore([{ path: '[Content_Types].xml', data: '<t/>' }, { path: 'word/big.bin', data: big }]));
  assert.equal(entries[1].size, big.length);
  assert.equal(Buffer.compare(entries[1].data, Buffer.from(big)), 0);
});

test('zipStore: `unzip -t` accepts the archive when the tool is available (independent check)', (t) => {
  const probe = spawnSync('unzip', ['-v'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) { t.skip('unzip is not installed on this machine — the independent reader above is the check'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdw-zip-'));
  try {
    const file = path.join(dir, 't.zip');
    fs.writeFileSync(file, E.zipStore([{ path: '[Content_Types].xml', data: '<t/>' }, { path: 'word/ב.xml', data: 'שלום' }]));
    const r = spawnSync('unzip', ['-t', file], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /No errors detected/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
