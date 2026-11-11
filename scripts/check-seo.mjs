import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../dist/', import.meta.url);
const appShell = await readFile(new URL('app.html', root), 'utf8');
assert.match(appShell, /<div id="root"><\/div>/, 'Dynamic routes must not flash the homepage');
assert.doesNotMatch(appShell, /<h1(?:\s|>)/, 'App shell must not contain marketing content');
assert.match(appShell, /name="robots" content="noindex, follow"/);
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
assert.equal(urls.length, 18, 'Expected the homepage, four editor pages and thirteen service pages');
for (const path of ['/solutions/','/website-builder/','/invitations-online/','/certificates-with-qr/','/qr-menu/']) {
  assert.ok(urls.some(url=>url.pathname===path),`Missing discoverable service page: ${path}`);
}
const titles = new Set(),
  descriptions = new Set();
for (const url of urls) {
  assert.equal(url.origin, 'https://codoc.site');
  const html = await readFile(new URL(`${url.pathname.slice(1)}index.html`, root), 'utf8');
  assert.match(html, /<html lang="ru">/);
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) ?? []).length,
    1,
    `${url.pathname}: expected one static H1`,
  );
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && description, `${url.pathname}: missing metadata`);
  assert.ok(!titles.has(title) && !descriptions.has(description), 'Public metadata must be unique');
  titles.add(title);
  descriptions.add(description);
  assert.ok(html.includes(`<link rel="canonical" href="${url.href}"`));
  assert.ok(html.includes('name="robots" content="index, follow"'));
  const data = html.match(
    /<script id="codoc-structured-data" type="application\/ld\+json">([\s\S]+?)<\/script>/,
  )?.[1];
  assert.ok(data, 'Structured data missing');
  const structured = JSON.parse(data);
  if (['/solutions/','/website-builder/','/invitations-online/','/certificates-with-qr/','/qr-menu/'].includes(url.pathname)) {
    assert.ok(structured['@graph'].some(item=>item['@type']==='WebApplication'),'Service application markup missing');
    assert.ok(structured['@graph'].some(item=>item['@type']==='FAQPage'),'Visible FAQ markup missing');
    assert.ok(html.includes('href="/sites/new"'),'Constructor must be discoverable in static HTML');
  }
  assert.ok(
    !/<link[^>]+(?:konva-vendor|tiptap-vendor|WorkspaceRuntime|Editor-)/.test(html),
    'Editor code should not be preloaded on a public page',
  );
  assert.ok(html.includes('href="/"') || html.includes('CoDoc'));
}
const missing = await readFile(new URL('404.html', root), 'utf8');
assert.ok(missing.includes('name="robots" content="noindex, nofollow"'));
assert.ok(!missing.includes('rel="canonical"'));
console.log(
  `SEO checks passed: ${urls.length} static public pages, unique metadata, canonical URLs, JSON-LD and 404`,
);
