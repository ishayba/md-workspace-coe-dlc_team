// Loads the pure Markdown functions out of index.html (where the app logic lives)
// so they can be unit-tested with the built-in Node test runner — no jsdom, no deps.
// Extraction relies on the file's formatting: each helper is a top-level function
// of the main <script> indented by exactly 4 spaces and closed by a line "    }".
const fs = require('node:fs');
const path = require('node:path');

const INDEX = path.join(__dirname, '..', 'index.html');

function extractFunction(source, name) {
  const lines = source.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`    function ${name}(`));
  if (start < 0) throw new Error(`function ${name} not found in index.html`);
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '    }') return lines.slice(start, i + 1).join('\n');
  }
  throw new Error(`end of function ${name} not found`);
}

function loadParser() {
  const source = fs.readFileSync(INDEX, 'utf8');
  const names = ['escapeHtml', 'parseMarkdown', 'generateOfflineDiagramSvg'];
  const code = names.map((n) => extractFunction(source, n)).join('\n\n');
  // eslint-disable-next-line no-new-func
  return new Function(`${code}\nreturn { escapeHtml, parseMarkdown };`)();
}

// Generic loader for any other pure top-level function of the main script.
function loadFunctions(names) {
  const source = fs.readFileSync(INDEX, 'utf8');
  const code = names.map((n) => extractFunction(source, n)).join('\n\n');
  // eslint-disable-next-line no-new-func
  return new Function(`${code}\nreturn { ${names.join(', ')} };`)();
}

module.exports = { loadParser, loadFunctions, extractFunction };
