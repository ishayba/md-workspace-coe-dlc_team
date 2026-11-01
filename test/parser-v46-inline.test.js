// v4.6.0 — inline Markdown features of parseMarkdown(): strikethrough, links, images (and URL safety).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadParser } = require('../test-support/load-app');

const { parseMarkdown } = loadParser();
const body = (md) => parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim();

/* ---------- SC-6: strikethrough ---------- */

test('strike: ~~x~~ becomes <del>x</del>', () => {
  assert.equal(body('a ~~x~~ b'), '<p>a <del>x</del> b</p>');
  assert.equal(body('~~טקסט עברי~~'), '<p><del>טקסט עברי</del></p>');
});

test('strike: works inside list items and table cells', () => {
  assert.equal(body('* a ~~b~~'), '<ul><li>a <del>b</del></li></ul>');
  assert.match(body('| h |\n| --- |\n| ~~c~~ |'), /<td><del>c<\/del><\/td>/);
});

test('strike: combines with bold and italic in either nesting order', () => {
  assert.equal(body('**~~x~~**'), '<p><strong><del>x</del></strong></p>');
  assert.equal(body('~~**x**~~'), '<p><del><strong>x</strong></del></p>');
  assert.equal(body('~~a *b*~~'), '<p><del>a <em>b</em></del></p>');
});

test('strike: an unmatched ~~ stays literal text', () => {
  assert.equal(body('a ~~ b'), '<p>a ~~ b</p>');
  assert.equal(body('a ~ b ~ c'), '<p>a ~ b ~ c</p>');
});

/* ---------- SC-1: links ---------- */

test('links: http, https, mailto and relative addresses become <a href>', () => {
  assert.equal(body('[a](https://x.y)'), '<p><a href="https://x.y">a</a></p>');
  assert.equal(body('[a](http://x.y/p)'), '<p><a href="http://x.y/p">a</a></p>');
  assert.equal(body('[a](mailto:p@q.r)'), '<p><a href="mailto:p@q.r">a</a></p>');
  assert.equal(body('[a](docs/p.md)'), '<p><a href="docs/p.md">a</a></p>');
  assert.equal(body('[a](#s)'), '<p><a href="#s">a</a></p>');
  assert.equal(body('[a](?q=1)'), '<p><a href="?q=1">a</a></p>');
});

test('links: Hebrew link text, inline formatting inside the text, and ampersands in the address', () => {
  assert.equal(body('ראו [המסמך **החדש**](https://x.y?a=1&b=2) שלנו'),
    '<p>ראו <a href="https://x.y?a=1&amp;b=2">המסמך <strong>החדש</strong></a> שלנו</p>');
});

test('links: * and _ inside the address are not turned into emphasis', () => {
  assert.equal(body('[a](https://x.y/a*b*c) and *it*'), '<p><a href="https://x.y/a*b*c">a</a> and <em>it</em></p>');
  assert.equal(body('[a](https://x.y/a_b_c)'), '<p><a href="https://x.y/a_b_c">a</a></p>');
});

test('links: inside list items and table cells', () => {
  assert.equal(body('* [a](b.md)'), '<ul><li><a href="b.md">a</a></li></ul>');
  assert.match(body('| h |\n| --- |\n| [c](c.md) |'), /<td><a href="c.md">c<\/a><\/td>/);
});

test('links: nothing is linked inside inline code', () => {
  assert.equal(body('`[a](https://x.y)`'), '<p><code>[a](https://x.y)</code></p>');
});

test('links (security): javascript:, data:, vbscript: and protocol-relative addresses stay visible text', () => {
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert`1`', 'data:text/html,hi', 'vbscript:x', 'file:///etc/passwd', '//evil.example/x', '\\\\evil.example', '"javascript:x', 'jav%09ascript:x']) {
    const html = body(`[click](${url})`);
    assert.doesNotMatch(html, /<a[\s>]/i, url);
    assert.doesNotMatch(html, /\son\w+\s*=/i, url);
    assert.match(html, /\[click\]\(/, `${url} stays as visible text`);
  }
});

test('links (security): an entity-encoded address is a harmless relative path, not a scheme', () => {
  // "&" is escaped first, so "java&#10;script:x" stays literal text inside the href (a fragment of a relative URL)
  assert.equal(body('[click](java&#10;script:x)'), '<p><a href="java&amp;#10;script:x">click</a></p>');
});

test('links (security): quotes and angle brackets in the address cannot break out of the attribute', () => {
  const html = body('[a](https://x.y/"onmouseover="alert(1))');
  assert.doesNotMatch(html, /<a[^>]*\sonmouseover/i);
  const html2 = body('[a](https://x.y/<img/src/onerror=alert(1)>)');
  assert.doesNotMatch(html2, /<img/i);
});

/* ---------- SC-2: images ---------- */

test('images: ![alt](src) becomes <img src alt> for allowed sources', () => {
  assert.equal(body('![alt](icon.svg)'), '<p><img src="icon.svg" alt="alt"></p>');
  assert.equal(body('![a](https://x/y.png)'), '<p><img src="https://x/y.png" alt="a"></p>');
  assert.equal(body('![לוגו](icon.svg)'), '<p><img src="icon.svg" alt="לוגו"></p>');
  assert.equal(body('![](x.png)'), '<p><img src="x.png" alt=""></p>');
});

test('images: an image can sit inside a link', () => {
  assert.equal(body('[![a](i.png)](https://x.y)'), '<p><a href="https://x.y"><img src="i.png" alt="a"></a></p>');
});

test('images (security): javascript: and data: sources do not produce <img>', () => {
  assert.doesNotMatch(body('![x](javascript:alert(1))'), /<img/i);
  assert.doesNotMatch(body('![x](data:image/png;base64,AAAA)'), /<img/i);
  assert.doesNotMatch(body('![x](//evil.example/a.png)'), /<img/i);
  assert.doesNotMatch(body('![x](vbscript:y)'), /<img/i);
});

test('images (security): quotes and markup in alt text stay escaped; * in alt is not emphasis', () => {
  const html = body('![a" onerror="alert(1)](x.png)');
  // the quotes are escaped, so "onerror=" is only text inside the alt value and never an attribute
  assert.match(html, /^<p><img src="x\.png" alt="[^"]*"><\/p>$/);
  assert.match(html, /alt="a&quot; onerror=&quot;alert\(1\)"/);
  assert.equal(body('![a *b* c](x.png)'), '<p><img src="x.png" alt="a *b* c"></p>');
  assert.doesNotMatch(body('![<script>](x.png)'), /<script/i);
});
