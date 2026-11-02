// A tiny ZIP reader for tests (STORE and DEFLATE entries). It is deliberately independent of export-core.js:
// it reads the archive through the central directory, like a real unzip tool, and checks every CRC.
const zlib = require('node:zlib');

function crc32Reference(buf) {
  let c; let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xFF;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// returns [{ name, flags, method, crc, size, data(Buffer), localOffset }] in central-directory order
function readZip(bytes) {
  const buf = Buffer.from(bytes);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('no end-of-central-directory record');
  const total = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset + cdSize !== eocd) throw new Error('central directory does not end where the end record starts');
  const entries = [];
  let p = cdOffset;
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central header at ' + p);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('bad local header for ' + name);
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    let data = buf.slice(start, start + compSize);
    if (method === 8) data = zlib.inflateRawSync(data);
    else if (method !== 0) throw new Error('unsupported method ' + method);
    if (data.length !== size) throw new Error('size mismatch for ' + name);
    if (crc32Reference(data) !== crc) throw new Error('CRC mismatch for ' + name);
    entries.push({ name, flags, method, crc, size, data, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

module.exports = { readZip, crc32Reference };
