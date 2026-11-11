import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const fixture = (name: string) =>
  readFileSync(
    new URL(
      `../fixtures/journeys/${name}`,
      import.meta.url,
    ),
  );
const fonts: Record<string, string> = {
  sans: 'DejaVuSans',
  'sans-bold': 'DejaVuSans-Bold',
  serif: 'DejaVuSerif',
  'serif-italic': 'DejaVuSerif-Italic',
};

for (const theme of ['rose', 'sage', 'ink', 'proposal'])
  test(`${theme}: browser document and actual PDF have the same composition`, async ({ page }) => {
    const document = JSON.parse(fixture(`${theme}-document.json`).toString());
    const artwork = JSON.parse(fixture(`${theme}.json`).toString());
    await page.setViewportSize({ width: 1600, height: 1400 });
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path === '/api/journeys/artwork') return route.fulfill({ json: artwork });
      if (path.startsWith('/api/journeys/fonts/')) {
        const font = fonts[path.split('/').at(-1)!];
        if (!font) return route.fulfill({ status: 404 });
        return route.fulfill({
          contentType: 'font/ttf',
          headers: { 'access-control-allow-origin': '*' },
          body: readFileSync(
            new URL(`../fixtures/journeys/fonts/${font}.ttf`, import.meta.url),
          ),
        });
      }
      if (path === `/api/journeys/${document.id}`) return route.fulfill({ json: document });
      if (path === `/api/journeys/${document.id}/responses`) return route.fulfill({ status: 204 });
      return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    });
    await page.goto(`/d/${document.id}`);
    await expect(page.locator('.journey-artwork-page svg')).toBeVisible();
    await expect(page.locator('.journey-artwork')).toHaveAttribute('aria-busy', 'false');
    await page.screenshot({ path: `../reports/invitation-${theme}-desktop.png` });
    await page.addStyleTag({
      content: '.journey-public .journey-artwork-page{width:794px!important}',
    });
    const browserPng = await page
      .locator('.journey-artwork-page')
      .screenshot({ path: `../reports/invitation-${theme}-browser.png` });
    const comparison = await page.evaluate(
      async ({ browser, pdf }) => {
        async function pixels(base64: string) {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = window.document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = 1123;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          if (image.height < 1123) {
            const paper = context.getImageData(0, 0, 1, 1).data;
            context.fillStyle = `rgb(${paper[0]},${paper[1]},${paper[2]})`;
            context.fillRect(0, image.height, image.width, 1123 - image.height);
          }
          return {
            width: image.width,
            height: 1123,
            originalHeight: image.height,
            data: context.getImageData(0, 0, image.width, 1123).data,
          };
        }
        const a = await pixels(browser),
          b = await pixels(pdf);
        if (a.width !== b.width || Math.abs(a.originalHeight - b.originalHeight) > 2)
          return { sameSize: false, difference: 1 };
        const flat = (data: Uint8ClampedArray, index: number, width: number) => {
          for (const offset of [-4, 4, -width * 4, width * 4]) {
            const neighbor = index + offset;
            if (neighbor < 0 || neighbor + 2 >= data.length) continue;
            if (
              Math.max(
                Math.abs(data[index] - data[neighbor]),
                Math.abs(data[index + 1] - data[neighbor + 1]),
                Math.abs(data[index + 2] - data[neighbor + 2]),
              ) > 2
            )
              return false;
          }
          return true;
        };
        const delta = (i: number, j: number) => {
          // Windows LCD text has coloured edge pixels; PDFBox uses greyscale antialiasing.
          // Compare edge luminance, retaining RGB checks for flat fills and backgrounds.
          if (!flat(a.data, i, a.width) || !flat(b.data, j, b.width))
            return Math.abs(
              0.299 * (a.data[i] - b.data[j]) +
                0.587 * (a.data[i + 1] - b.data[j + 1]) +
                0.114 * (a.data[i + 2] - b.data[j + 2]),
            );
          return Math.max(
            Math.abs(a.data[i] - b.data[j]),
            Math.abs(a.data[i + 1] - b.data[j + 1]),
            Math.abs(a.data[i + 2] - b.data[j + 2]),
          );
        };
        let different = 0,
          raw = 0;
        for (let y = 0; y < a.height; y++)
          for (let x = 0; x < a.width; x++) {
            const index = (y * a.width + x) * 4;
            if (delta(index, index) <= 50) continue;
            raw++;
            // PDFBox and Chromium round subpixels/antialias glyph edges differently.
            let matched = false;
            for (let dy = -1; dy <= 1 && !matched; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx,
                  yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= b.width || yy >= b.height) continue;
                if (delta(index, (yy * b.width + xx) * 4) <= 50) {
                  matched = true;
                  break;
                }
              }
            if (!matched) different++;
          }
        return {
          sameSize: true,
          difference: different / (a.width * a.height),
          rawDifference: raw / (a.width * a.height),
        };
      },
      {
        browser: browserPng.toString('base64'),
        pdf: fixture(`${theme}-pdf.png`).toString('base64'),
      },
    );
    writeFileSync(
      new URL(`../../../reports/invitation-${theme}-comparison.json`, import.meta.url),
      JSON.stringify(comparison),
    );
    expect(comparison.sameSize).toBe(true);
    expect(comparison.difference).toBeLessThan(0.015);
    await page.addStyleTag({
      content: '.journey-public .journey-artwork-page{width:100%!important}',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.locator('.journey-app').evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `../reports/invitation-${theme}-mobile.png` });
    if (theme === 'proposal') {
      await expect(page.locator('.proposal-paper-pagination')).toBeVisible();
      await page.locator('.proposal-paper-pagination select').selectOption('1');
      await expect(page.locator('.journey-artwork-page')).toHaveCount(1);
      return;
    }
    await page.getByRole('textbox', { name: 'Ваше имя', exact: true }).fill('Анна');
    await page.getByRole('button', { name: 'Отправить ответ' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Ваш ответ сохранён' })).toBeVisible();
  });
