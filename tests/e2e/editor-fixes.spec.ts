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
  await page.locator('.canvas-dock').getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(page.locator('.right-panel .mv-editor')).toBeVisible();
  const field = page.locator('.dp-field-chip').filter({ hasText: 'name' }).first();
  await expect(field).toBeVisible();
  const stage = page.locator('.stage-wrap');
  await field.dragTo(stage, { force: true, targetPosition: { x: 120, y: 100 } });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const doc = JSON.parse(localStorage.getItem('ticket-editor:offline-doc')!);
        return doc.slides[0].elements.map((el: { text?: string }) => el.text).join('|');
      }),
    )
    .toContain('{{name}}');
});

test('switching schemas keeps the canvas mounted and a four-column array on the slide', async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const columns = ['code', 'name', 'amount', 'status'];
  await page.route('**/api/schemas', route => route.fulfill({ json: [
    { id: 'S1', name: 'First schema', fields: [{ path: 'title', type: 'string' }] },
    { id: 'S2', name: 'Order schema', fields: [{ path: 'items', type: 'array' },
      ...columns.map(name => ({ path: `items[0].${name}`, type: 'string' }))] },
  ] }));
  await page.addInitScript(() => localStorage.setItem('ticket-editor:offline-doc', JSON.stringify({
    version: '2.0', activeId: 'test-slide', data: [], slides: [{ id: 'test-slide', name: 'Order',
      width: 400, height: 400, format: 'custom', orientation: 'portrait',
      padding: { top: 0, left: 0, right: 0, bottom: 0 }, background: '#fff', elements: [] }],
  })));
  await page.goto('/app/editor/local?tab=data&schemaId=S1');
  const stage = page.locator('.stage-wrap');
  const stageHandle = await stage.elementHandle();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await page.locator('.canvas-dock').getByRole('button', { name: 'Properties', exact: true }).click();
  await page.locator('.dp-select-model').selectOption('S2');
  const array = page.locator('.dp-field-chip').filter({ hasText: /^items\s*→/ });
  await expect(array).toBeVisible();
  expect(await stageHandle?.evaluate(node => node.isConnected)).toBe(true);
  const bounds = (await stage.boundingBox())!;
  await array.dragTo(stage, { force: true, targetPosition: { x: bounds.width - 12, y: 80 } });
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('ticket-editor:offline-doc')!);
    const table = saved.slides[0].elements.find((element: { type: string }) => element.type === 'table');
    return table && { cols: table.cols, header: table.data[0], cells: table.data[1], right: table.x + table.width, schemaId: saved.schemaId };
  })).toEqual({ cols: 4, header: columns, cells: columns.map(name => `{{items[0].${name}}}`), right: 400, schemaId: 'S2' });
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
