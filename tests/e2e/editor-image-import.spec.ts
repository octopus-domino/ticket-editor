import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const existing = {
  id: 'existing',
  name: 'Existing page',
  width: 400,
  height: 300,
  format: 'custom',
  orientation: 'landscape',
  background: '#ffffff',
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  elements: [],
};

async function exportedSlides(page: Page) {
  const downloading = page.waitForEvent('download');
  await page.locator('.toolbar').getByRole('button', { name: /JSON/ }).click();
  const file = await downloading;
  return JSON.parse(await readFile((await file.path())!, 'utf8')).slides as {
    id: string;
    width: number;
    height: number;
    elements: {
      type: string;
      fill?: string;
      fontFamily?: string;
      fontStyle?: string;
      src?: string;
      html?: string;
      richText?: boolean;
      d?: string;
    }[];
  }[];
}

for (const kind of ['document', 'template'] as const) {
  test(`imports an image into an existing ${kind} without losing pages and supports undo`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let recognitionRequests = 0;
    await page.addInitScript((slide) => {
      localStorage.setItem('codoc:language', 'en');
      localStorage.setItem(
        'ticket-editor:offline-doc',
        JSON.stringify({ version: '2.0', slides: [slide], activeId: slide.id, data: [] }),
      );
    }, existing);
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path === '/api/auth/refresh')
        return route.fulfill({
          json: {
            accessToken: 'test',
            user: { id: 'owner', name: 'Owner', email: 'owner@example.test' },
          },
        });
      if (path === '/api/templates/T')
        return route.fulfill({
          json: {
            id: 'T',
            name: 'Existing template',
            schemaId: null,
            slides: [existing],
            bindings: [],
            createdAt: '',
            updatedAt: '2026-11-06T00:00:00Z',
          },
        });
      if (path === '/api/recognition/capabilities')
        return route.fulfill({ json: { ocr: true, ollama: false } });
      if (path === '/api/recognition') {
        recognitionRequests++;
        return route.fulfill({
          json: {
            width: 400,
            height: 300,
            engine: 'dual',
            warnings: [],
            elements: [
              {
                type: 'text',
                x: 20,
                y: 20,
                width: 300,
                height: 50,
                properties: {
                  text: 'Colored title',
                  fontSize: 24,
                  fill: '#ab1234',
                  fontFamily: 'Georgia',
                  fontStyle: 'bold italic',
                  richText: true,
                  html: '<div><span style="font-family:Georgia;font-size:24px;font-weight:700;font-style:italic;color:#ab1234">Colored</span> <span style="font-family:Arial;font-size:18px;text-decoration:underline">title</span></div>',
                },
              },
              {
                type: 'path',
                x: 34,
                y: 180,
                width: 200,
                height: 62,
                properties: {
                  d: 'M34 180 L234 180 L234 242 L34 242 Z',
                  fill: '#eae7e0',
                  stroke: 'transparent',
                  strokeWidth: 0,
                },
              },
            ],
          },
        });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(kind === 'document' ? '/app/editor/local' : '/app/templates/T/edit');
    await expect(page.locator('.slide-thumb')).toHaveCount(1);
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#ab1234';
      g.fillRect(0, 0, 400, 300);
      g.fillStyle = 'white';
      g.font = 'italic bold 24px Georgia';
      g.fillText('Colored title', 20, 50);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const upload = async () => {
      await page.getByRole('button', { name: 'Import from image', exact: true }).click();
      await page
        .getByRole('dialog')
        .locator('input[type=file]')
        .setInputFiles({
          name: 'styled-page.png',
          mimeType: 'image/png',
          buffer: Buffer.from(png, 'base64'),
        });
    };
    await upload();
    // Closing a pending import must not touch the current document.
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('.slide-thumb')).toHaveCount(1);
    await upload();
    await page
      .getByRole('button', {
        name: kind === 'document' ? 'Keep original appearance' : 'Recognize locally',
        exact: true,
      })
      .click();
    const apply = page.getByRole('button', { name: 'Add as a new slide', exact: true });
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.slide-thumb')).toHaveCount(2);
    const slides = await exportedSlides(page);
    expect(slides[0].id).toBe('existing');
    expect([slides[1].width, slides[1].height]).toEqual([400, 300]);
    if (kind === 'document') {
      expect(recognitionRequests).toBe(0);
      expect(slides[1].elements[0].type).toBe('image');
      const pixel = await page.evaluate(async (src) => {
        const image = new Image();
        image.src = src!;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const g = canvas.getContext('2d')!;
        g.drawImage(image, 0, 0);
        return Array.from(g.getImageData(5, 5, 1, 1).data);
      }, slides[1].elements[0].src);
      expect(pixel).toEqual([171, 18, 52, 255]);
    } else {
      expect(recognitionRequests).toBe(1);
      expect(slides[1].elements[0]).toMatchObject({
        type: 'text',
        fill: '#ab1234',
        fontFamily: 'Georgia',
        fontStyle: 'bold italic',
        richText: true,
      });
      expect(slides[1].elements[0].html).toContain('font-size: 24px');
      expect(slides[1].elements[0].html).toContain('text-decoration: underline');
      expect(slides[1].elements[1].d).toBe('M0 0 L200 0 L200 62 L0 62 Z');
    }
    await page.locator('.toolbar').getByRole('button', { name: '↶', exact: true }).click();
    await expect(page.locator('.slide-thumb')).toHaveCount(1);
    await page.locator('.toolbar').getByRole('button', { name: '↷', exact: true }).click();
    await expect(page.locator('.slide-thumb')).toHaveCount(2);
    expect(errors).toEqual([]);
  });
}
