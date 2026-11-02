const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const version = JSON.parse(read('package.json')).version;

test('every place that shows the version agrees with package.json', () => {
  assert.match(read('index.html'), new RegExp(`const APP_VERSION = '${version.replace(/\./g, '\\.')}'`));
  assert.match(read('index.html'), new RegExp(`<title>[^<]*v${version.replace(/\./g, '\\.')}</title>`));
  assert.match(read('index.html'), new RegExp(`גרסה v${version.replace(/\./g, '\\.')}`));
  assert.match(read('sw.js'), new RegExp(`md-workspace-offline-v${version.replace(/\./g, '\\.')}-build-`));
  assert.match(read('README.md'), new RegExp(`^# .*\\(v${version.replace(/\./g, '\\.')}\\)`));
  assert.match(read('MVP_SPEC.md'), new RegExp(`^# .*\\(v${version.replace(/\./g, '\\.')}\\)`));
});

test('v4.7.0: the version is 4.7.0 and package.json wires the coverage script and the new e2e file', () => {
  assert.equal(version, '4.7.0');
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.coverage, /--experimental-test-coverage/);
  assert.match(pkg.scripts.coverage, /--test-coverage-lines=90/);
  assert.match(pkg.scripts.e2e, /node e2e\/v47-a11y-export\.e2e\.js/);
});

test('MVP_SPEC has a changelog entry for the current version', () => {
  assert.match(read('MVP_SPEC.md'), new RegExp(`שינויים מ-v[\\d.]+ → v${version.replace(/\./g, '\\.')}`));
});

test('the backlog file exists and tracks the parser-extension follow-up', () => {
  const backlog = read('BACKLOG.md');
  assert.match(backlog, /v4\.6\.0/);
  assert.match(backlog, /parser/i);
});
