import { readFile, writeFile } from 'node:fs/promises';
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
  const markup = renderToString(
    React.createElement(
      StaticRouter,
      { location: vite.config.base, basename: vite.config.base },
      React.createElement(LandingPage),
    ),
  );
  const file = new URL('../dist/index.html', import.meta.url);
  const html = await readFile(file, 'utf8');
  if (!html.includes('<div id="root"></div>'))
    throw new Error('Prerender: root placeholder missing');
  await writeFile(file, html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`));
  console.log('Prerendered CoDoc landing page into dist/index.html');
} finally {
  await vite.close();
}
