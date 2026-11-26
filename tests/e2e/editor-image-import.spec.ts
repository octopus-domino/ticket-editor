import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openToolbarDetails } from './helpers/toolbar';

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
  const menu = await openToolbarDetails(page);
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    menu.getByRole('button', { name: '📥 JSON', exact: true }).click(),
  ]);
  await menu.locator('summary').click();
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
 for (const sourceKind of ['image', 'pdf'] as const) {
  test(`imports ${sourceKind} into an existing ${kind} without losing pages and supports undo`, async ({
    page,
  }) => {
    test.setTimeout(45_000);
    const errors: string[] = [];
    await page.setViewportSize({ width: 390, height: 844 });
    page.on('pageerror', (error) => errors.push(error.message));
    let recognitionRequests = 0;
    const pdfPages: number[] = [];
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
      if (path === '/api/recognition/pdf-page') {
        const request: { page: number } = route.request().postDataJSON();
        pdfPages.push(request.page);
        return route.fulfill({ json: { image: `data:image/png;base64,${png}`, pages: 2 } });
      }
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
    await expect(page.locator('.slide-thumb')).toHaveCount(1, { timeout: 15000 });
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
      await page.getByRole('button', { name: 'Import image or PDF', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Import image or PDF' })
        .locator('input[type=file]')
        .setInputFiles({
          name: sourceKind === 'pdf' ? 'styled-page.pdf' : 'styled-page.png',
          mimeType: sourceKind === 'pdf' ? 'application/pdf' : 'image/png',
          buffer: sourceKind === 'pdf' ? Buffer.from('%PDF-1.7 test') : Buffer.from(png, 'base64'),
        });
    };
    await upload();
    const addedSlides = sourceKind === 'pdf' ? 2 : 1;
    const dialog = page.getByRole('dialog', { name: 'Import image or PDF' });
    if (sourceKind === 'pdf') {
      await expect(dialog.getByText(/PDF page: 1–2/)).toBeVisible();
      expect(pdfPages).toEqual([1]);
    }
    // Closing a pending import must not touch the current document.
    await page.getByRole('dialog', { name: 'Import image or PDF' }).getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('.slide-thumb')).toHaveCount(1);
    await upload();
    await page
      .getByRole('button', {
        name: kind === 'document' ? 'Keep original appearance' : 'Recognize locally',
        exact: true,
      })
      .click();
    const apply = dialog.getByRole('button', { name: addedSlides === 1 ? 'Add as a new slide' : 'Add as a new slide (2)', exact: true });
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(page.getByRole('dialog', { name: 'Import image or PDF' })).toHaveCount(0);
    await expect(page.locator('.slide-thumb')).toHaveCount(1 + addedSlides);
    expect(pdfPages).toEqual(sourceKind === 'pdf' ? [1, 1, 2] : []);
    const slides = await exportedSlides(page);
    expect(slides[0].id).toBe('existing');
    expect(slides).toHaveLength(1 + addedSlides);
    expect(slides.slice(1).map(slide => [slide.width, slide.height])).toEqual(
      Array.from({ length: addedSlides }, () => [400, 300]),
    );
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
      expect(recognitionRequests).toBe(addedSlides);
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
    await expect(page.locator('.slide-thumb')).toHaveCount(1 + addedSlides);
    expect(errors).toEqual([]);
  });
 }
}
