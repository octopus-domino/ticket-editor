import { test, expect, type Page } from '@playwright/test';

async function account(page: Page) {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh')
      return route.fulfill({
        json: {
          accessToken: 'test',
          user: { id: 'owner', name: 'Tester', email: 'test@example.test' },
        },
      });
    if (path === '/api/schemas')
      return route.fulfill({
        json: [
          {
            id: 'S',
            name: 'Contacts',
            fields: [{ path: 'name', type: 'string', required: true }],
            createdAt: '',
            updatedAt: '',
          },
        ],
      });
    if (path === '/api/data-models')
      return route.fulfill({
        json: Array.from({ length: 25 }, (_, i) => ({
          id: `M${i}`,
          schemaId: 'S',
          name: `Contact ${i + 1}`,
          values: { name: `Name ${i + 1}` },
          createdAt: '',
          updatedAt: '',
        })),
      });
    if (path === '/api/templates')
      return route.fulfill({
        json: [
          {
            id: 'T',
            name: 'Invitation template',
            schemaId: 'S',
            slideCount: 1,
            createdAt: '',
            updatedAt: '',
          },
        ],
      });
    return route.fulfill({ json: [] });
  });
}

test('data list scrolls and schema deletion shows dependencies beside its row', async ({
  page,
}) => {
  await account(page);
  await page.goto('/app/data');
  await expect(page.locator('.dm-sidebar .ssl-row')).toHaveCount(25);
  const list = page.locator('.dm-sidebar .ssl-list');
  expect(
    await list.evaluate((node) => ({ height: node.clientHeight, scroll: node.scrollHeight })),
  ).toEqual(expect.objectContaining({ height: expect.any(Number) }));
  expect(await list.evaluate((node) => node.clientHeight)).toBeGreaterThan(100);
  expect(await list.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await page.locator('.dm-sidebar .ssl-row').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.dm-sidebar .ssl-row').last()).toBeInViewport();
  await expect(page.getByRole('button', { name: '+ New data set', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete schema Contacts?', exact: true }).click();
  const deletion = page.locator('.schema-delete-panel');
  await expect(deletion.getByRole('link', { name: 'Invitation template' })).toHaveAttribute(
    'href',
    '/app/templates/T/edit',
  );
  await expect(deletion.getByRole('button', { name: 'Delete', exact: true }).last()).toBeDisabled();
  await expect(page.locator('.workspace-profile-link')).toHaveAttribute('href', '/app/profile');
  await expect(page.locator('.workspace-header .logo')).toHaveAttribute('href', '/');
  await expect(
    page.locator('.workspace-sidebar').getByRole('link', { name: 'Client profile' }),
  ).toHaveCount(0);
});

test('stamp layers and properties stay within the modal beside the canvas', async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/stamp-editor?lesson=stamp');
  const modal = page.locator('.stamp-editor-modal');
  await expect(modal).toBeVisible();
  const left = (await page.locator('.stamp-editor-left').boundingBox())!;
  const canvas = (await page.locator('.stamp-editor-canvas').boundingBox())!;
  const right = (await page.locator('.stamp-editor-right').boundingBox())!;
  const bounds = (await modal.boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(canvas.x + 1);
  expect(canvas.x + canvas.width).toBeLessThanOrEqual(right.x + 1);
  expect(right.x + right.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
});

test('selected data set opens its values and a schema field can be dragged onto the canvas', async ({
  page,
}) => {
  await account(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      'ticket-editor:offline-doc',
      JSON.stringify({
        version: '2.0',
        activeId: 'S1',
        data: [],
        slides: [
          {
            id: 'S1',
            name: 'Fields',
            width: 400,
            height: 300,
            format: 'custom',
            orientation: 'landscape',
            padding: { top: 20, left: 20, right: 20, bottom: 20 },
            background: '#ffffff',
            elements: [],
          },
        ],
      }),
    ),
  );
  await page.goto('/app/editor/local?tab=data&schemaId=S');
  await expect(page.locator('.stage-wrap')).toBeVisible();
  await expect(page.locator('.right-panel .mv-editor')).toBeVisible();
  const field = page.locator('.dp-field-chip').filter({ hasText: 'name' }).first();
  await expect(field).toBeVisible();
  const stage = page.locator('.stage-wrap');
  await field.dragTo(stage, { targetPosition: { x: 120, y: 100 } });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const doc = JSON.parse(localStorage.getItem('ticket-editor:offline-doc')!);
        return doc.slides[0].elements.map((el: { text?: string }) => el.text).join('|');
      }),
    )
    .toContain('{{name}}');
});

test('a saved array table follows the active data set on canvas, in bindings and in PDF export', async ({ page }) => {
  await page.setViewportSize({ width: 1728, height: 960 });
  await account(page);
  const rows = [{ code: 'First' }, { code: 'Second' }, { code: 'Third' }, { code: 'Fourth' }];
  await page.route('**/api/schemas', route => route.fulfill({ json: [{
    id: 'S', name: 'Orders', createdAt: '', updatedAt: '',
    fields: [{ path: 'pos', type: 'array', required: true }, { path: 'pos.code', type: 'string', required: true }],
  }] }));
  await page.route('**/api/data-models?*', route => route.fulfill({ json: [
    { id: 'L', schemaId: 'S', name: 'Four rows', values: { pos: rows } },
    { id: 'S1', schemaId: 'S', name: 'One row', values: { pos: [rows[0]] } },
  ] }));
  await page.route('**/api/templates/T', route => route.fulfill({ json: {
    id: 'T', name: 'Offer', schemaId: 'S', bindings: [], createdAt: '', updatedAt: '',
    slides: [{ id: 'page', name: 'Page', width: 500, height: 400, format: 'custom',
      orientation: 'landscape', background: '#fff', padding: { top: 0, bottom: 0, left: 0, right: 0 },
      elements: [{ id: 'lines', type: 'table', x: 30, y: 30, width: 300, height: 80, rotation: 0,
        rows: 2, cols: 1, data: [['Code'], ['{{pos[0].code}}']], fontSize: 16, headerBg: '#eee', borderColor: '#333' }],
    }],
  } }));
  await page.route('**/api/export/pdf?mode=pdf', route =>
    route.fulfill({ contentType: 'application/pdf', body: '%PDF-test' }));
  await page.goto('/app/templates/T/edit?tab=data');
  const paintedRows = () => page.evaluate(async () => {
    const module = '/node_modules/.vite/deps/konva.js';
    const { default: Konva } = await import(module);
    const stage = Konva.stages.find((item: { container(): HTMLElement }) => item.container().isConnected);
    return stage?.findOne('#lines')?.find('Text').map((node: { text(): string }) => node.text());
  });
  const dataPanel = page.locator('.right-panel');
  await dataPanel.getByText('Four rows', { exact: true }).click();
  await expect.poll(paintedRows).toEqual(['Code', ...rows.map(row => row.code)]);
  const exportRequest = page.waitForRequest('**/api/export/pdf?mode=pdf');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect((await exportRequest).postDataJSON().slides[0].elements[0]).toMatchObject({ rows: 5,
    data: [['Code'], ...rows.map(row => [row.code])],
  });
  await dataPanel.getByText('One row', { exact: true }).click();
  await expect.poll(paintedRows).toEqual(['Code', 'First']);
  await dataPanel.getByRole('button', { name: /Links|Bindings/ }).click();
  await expect(dataPanel.locator('.dm-table select')).toHaveValue('pos');
  await expect(dataPanel.locator('.schema-error')).toHaveCount(0);
});

for (const count of [0, 1])
  test(`generation defaults to one PDF for ${count} data sets`, async ({ page }) => {
    await account(page);
    await page.route('**/api/data-models**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      return route.fulfill({
        json: count
          ? [
              {
                id: 'M',
                schemaId: 'S',
                name: 'One model',
                values: { name: 'Anna' },
                createdAt: '',
                updatedAt: '',
              },
            ]
          : [],
      });
    });
    await page.goto('/app/editor/local?tab=generate&schemaId=S');
    const selects = page.locator('.right-panel .gen-select');
    await expect(selects.nth(0)).toHaveValue('pdf', { timeout: 15000 });
    await expect(selects.nth(1)).toHaveValue('single');
    await page.route('**/api/templates/T', (route) =>
      route.fulfill({
        json: {
          id: 'T',
          name: 'Invitation template',
          schemaId: 'S',
          bindings: [],
          createdAt: '',
          updatedAt: '',
          slides: [
            {
              id: 'page',
              name: 'Page',
              width: 400,
              height: 300,
              format: 'custom',
              orientation: 'landscape',
              padding: { top: 20, right: 20, bottom: 20, left: 20 },
              background: '#ffffff',
              elements: [],
            },
          ],
        },
      }),
    );
    await page.goto('/app/generate?templateId=T');
    await expect(
      page.locator('.gen-page').getByRole('combobox', { name: 'Format', exact: true }),
    ).toHaveValue('pdf');
    await expect(
      page.locator('.gen-page').getByRole('combobox', { name: 'Packaging', exact: true }),
    ).toHaveValue('single');
  });
