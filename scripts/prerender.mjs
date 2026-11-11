import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';

// The same component supplies both crawlable HTML and the interactive landing.
// No browser, backend or additional SSR service is needed at deployment time.
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  mode: 'production',
});
try {
  const { LandingPage } = await vite.ssrLoadModule('/src/marketing/LandingPage.tsx');
  const { SearchLandingPage, NotFoundPage } = await vite.ssrLoadModule(
    '/src/marketing/SearchLandingPage.tsx',
  );
  const { SEARCH_PAGES } = await vite.ssrLoadModule('/src/marketing/searchPages.ts');
  const { JOURNEY_PAGES } = await vite.ssrLoadModule('/src/marketing/journeyPages.ts');
  const { JourneyMarketingPage } = await vite.ssrLoadModule('/src/marketing/JourneyMarketingPage.tsx');
  const { getPageMetadata, renderSeoHead, SITE_URL } =
    await vite.ssrLoadModule('/src/marketing/seo.ts');
  const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  if (!template.includes('<div id="root"></div>') || !template.includes('<!-- codoc-seo:start -->'))
    throw new Error('Prerender placeholders missing');
  const pages = [
    { path: '/', Component: LandingPage },
    ...SEARCH_PAGES.map((page) => ({ path: page.path, Component: SearchLandingPage })),
    ...JOURNEY_PAGES.map(page => ({path:page.path,Component:JourneyMarketingPage})),
    { path: '/404/', Component: NotFoundPage },
  ];
  for (const { path, Component } of pages) {
    const markup = renderToString(
      React.createElement(
        StaticRouter,
        { location: vite.config.base + path.slice(1), basename: vite.config.base },
        React.createElement(Component),
      ),
    );
    const head = renderSeoHead(getPageMetadata(path));
    const html = template
      .replace(
        /<!-- codoc-seo:start -->[\s\S]*?<!-- codoc-seo:end -->/,
        `<!-- codoc-seo:start -->\n${head}\n<!-- codoc-seo:end -->`,
      )
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
    const directory = new URL(path === '/404/' ? '../dist/' : `../dist${path}`, import.meta.url);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL(path === '/404/' ? '404.html' : 'index.html', directory), html);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .filter((page) => page.path !== '/404/')
    .map((page) => `  <url><loc>${SITE_URL}${page.path}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  await writeFile(new URL('../dist/sitemap.xml', import.meta.url), sitemap);
  console.log(`Prerendered ${pages.length - 1} public pages, 404 page and sitemap`);
} finally {
  await vite.close();
}
