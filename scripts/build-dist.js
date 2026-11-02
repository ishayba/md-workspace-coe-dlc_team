#!/usr/bin/env node
// Builds dist/ — a folder with only the files needed to run MD Workspace (no tests, e2e, AI-DLC records or docs).
// Zero dependencies. Run: npm run dist   (or: node scripts/build-dist.js)
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');

// Browser app: index.html plus everything the service worker precaches (kept in sync below).
// Local server: server.js needs css-studio.js (already listed). Launchers and help files for Windows and macOS.
const FILES = [
  'index.html',
  'css-studio.js',
  'css-studio-ui.js',
  'md-visual.js',
  'md-visual-ui.js',
  'a11y.js',
  'a11y-ui.js',
  'export-core.js',
  'export-ui.js',
  'sw.js',
  'icon.svg',
  'manifest.webmanifest',
  'server.js',
  'START.cmd',
  'START.command',
  'CHECK_ENV.cmd',
  'STOP_HELP.txt',
  'themes/README.md',
  'LICENSE',
  'README.md'
];
const EXECUTABLE = new Set(['START.command']);

// Every file the service worker precaches must be in dist/, otherwise the offline install fails.
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const precached = Array.from(sw.matchAll(/'\.\/([^']+)'/g)).map((m) => m[1]);
const missing = precached.filter((f) => !FILES.includes(f));
if (missing.length) {
  console.error('ERROR: sw.js precaches files that are not in the dist list: ' + missing.join(', '));
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
for (const rel of FILES) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) {
    console.error('ERROR: missing source file: ' + rel);
    process.exit(1);
  }
  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  if (EXECUTABLE.has(rel)) fs.chmodSync(dest, 0o755);
}

console.log('dist/ built with ' + FILES.length + ' files:');
FILES.forEach((f) => console.log('  ' + f));
console.log('Run it: open dist/ and start START.command (macOS) or START.cmd (Windows), or: node dist/server.js');
