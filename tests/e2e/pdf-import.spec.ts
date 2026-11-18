import { test, expect, type Page } from '@playwright/test';

async function account(page: Page) {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh') return route.fulfill({ json: {
      accessToken: 'test', user: { id: 'owner', name: 'Tester', email: 'test@example.test' },
    } });
    if (path === '/api/recognition/capabilities') return route.fulfill({ json: { ocr: true, ollama: false } });
    return route.fulfill({ json: [] });
  });
}

test('all PDF pages become ordered editable slides without sending native text through OCR', async ({ page }) => {
  await account(page);
  const requested: number[] = [];
  let saved: { slides: { elements: { text?: string }[] }[] } | undefined;
  await page.route('**/api/recognition/pdf-page', async route => {
    const input = route.request().postDataJSON() as { page: number; editable: boolean };
    expect(input.editable).toBe(true);
    requested.push(input.page);
    await route.fulfill({ json: { image: 'data:image/png;base64,AA==', pages: 3, draft: {
      width: 600, height: 800, engine: 'ocr', warnings: [], elements: [
        { type: 'text', x: 20, y: 20, width: 300, height: 30,
          properties: { text: `Native page ${input.page}`, fontSize: 18 } },
      ],
    } } });
  });
  await page.route('**/api/recognition', () => { throw new Error('Native PDF text must not use image OCR'); });
  await page.route('**/api/templates', async route => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: [] });
    saved = route.request().postDataJSON();
    await route.fulfill({ json: { ...saved, id: 'imported', createdAt: '', updatedAt: '' } });
  });
  await page.goto('/app/templates/new?preset=__image__');
  await page.locator('input[type=file]').setInputFiles({ name: 'three-pages.pdf',
    mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 test fixture') });
  await page.getByRole('button', { name: 'Recognize locally', exact: true }).click();
  await expect(page.getByText('Editable objects: 1')).toBeVisible();
  expect(requested).toEqual([1, 2, 3]);
  await page.locator('#template-name').fill('Three pages');
  await page.locator('.template-form button[type=submit]').click();
  await expect.poll(() => saved?.slides.length).toBe(3);
  expect(saved!.slides.map(slide => slide.elements[0].text)).toEqual(['Native page 1', 'Native page 2', 'Native page 3']);
});

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`import stays inside a separate dialog at ${viewport.width}px without moving the canvas`, async ({ page }) => {
    await account(page);
    await page.setViewportSize(viewport);
    await page.goto('/app/editor/local');
    const stage = page.locator('.stage-wrap');
    await expect(stage).toBeVisible();
    const before = await stage.boundingBox();
    expect(before!.width).toBeGreaterThan(viewport.width * .65);
    await page.getByRole('button', { name: 'Import image or PDF', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Import image or PDF', exact: true });
    await expect(dialog).toBeVisible();
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(await stage.boundingBox()).toEqual(before);
    await page.screenshot({ path: `test-results/import-dialog-${viewport.width}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

test('rich text table picker is visible outside the clipped toolbar and inserts an editable table', async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/app/editor/local');
  await expect(page.locator('.stage-wrap')).toBeVisible();
  await page.evaluate(async () => {
    const reactPath = '/node_modules/.vite/deps/react.js';
    const domPath = '/node_modules/.vite/deps/react-dom_client.js';
    const editorPath = '/src/presentation/components/RichTextEditor.tsx';
    const [react, dom, editor] = await Promise.all([import(reactPath), import(domPath), import(editorPath)]);
    const node = document.createElement('div');
    document.body.append(node);
    (dom.default ?? dom).createRoot(node).render((react.default ?? react).createElement(editor.RichTextEditor, {
      isOpen: true, initialHtml: '<p>Editable text</p>', contentWidth: 600,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }, fontFamily: 'Arial',
      fontSize: 16, lineHeight: 1.2, fill: '#111111', zoom: 1,
      onClose() {}, onSave() {},
    }));
  });
  await page.getByRole('button', { name: /⊞/ }).click();
  const picker = page.locator('.rt-floating-popover .rt-table-grid');
  await expect(picker).toBeVisible();
  const box = (await picker.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1024);
  expect(box.y + box.height).toBeLessThanOrEqual(768);
  await picker.getByRole('button', { name: '2 × 3', exact: true }).click();
  await expect(page.locator('.ProseMirror table tr')).toHaveCount(2);
  await expect(page.locator('.ProseMirror table tr').first().locator('th,td')).toHaveCount(3);
});
