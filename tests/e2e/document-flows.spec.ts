import { test, expect, type Page } from '@playwright/test';
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => console.error('browser error:', error));
});

const schema = {
  id: 'S',
  name: 'Ticket',
  fields: [{ path: 'name', type: 'string', required: true }],
  createdAt: '',
  updatedAt: '2026-01-01T00:00:00Z',
};
const slide = {
  id: 'slide',
  name: 'Ticket',
  format: 'a4',
  orientation: 'portrait',
  width: 794,
  height: 1123,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
  background: '#fff',
  elements: [],
};
const template = {
  id: 'T',
  schemaId: 'S',
  name: 'Ticket template',
  slides: [slide],
  bindings: [],
  createdAt: '',
  updatedAt: '2026-01-01T00:00:00Z',
};
async function api(page: Page, count = 2) {
  const writes: { id: string; values: unknown }[] = [];
  const templateWrites: { slides: (typeof slide)[] }[] = [];
  let asyncStarted = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    if (path === '/api/auth/refresh')
      return json({
        accessToken: 'test-token',
        user: { id: 'owner', name: 'Tester', email: 'test@example.com' },
      });
    if (path === '/api/workspace/tree') return json([]);
    if (path === '/api/schemas') return json([schema]);
    if (path === '/api/schemas/S') return json(schema);
    if (path === '/api/templates') return json([{ ...template, slideCount: 1 }]);
    if (path === '/api/templates/T') {
      if (request.method() === 'PUT')
        templateWrites.push(request.postDataJSON() as { slides: (typeof slide)[] });
      return json(template);
    }
    if (path === '/api/data-models')
      return json(
        Array.from({ length: count }, (_, index) => ({
          id: `M${index}`,
          schemaId: 'S',
          name: `Model ${index}`,
          values: { name: `Person ${index}` },
          createdAt: '',
          updatedAt: '',
        })),
      );
    if (path.startsWith('/api/data-models/') && request.method() === 'PUT') {
      const body = request.postDataJSON() as { name: string; values: unknown };
      const id = path.split('/').pop()!;
      writes.push({ id, values: body.values });
      return json({
        id,
        schemaId: 'S',
        ...body,
        createdAt: '',
        updatedAt: new Date().toISOString(),
      });
    }
    if (path === '/api/generate' && request.method() === 'POST') {
      asyncStarted = true;
      return json({ jobId: 'J', total: count }, 202);
    }
    if (path === '/api/generate/J')
      return json({
        jobId: 'J',
        status: 'done',
        progress: { total: count, completed: count, failed: 0 },
        errors: [],
        resultUrl: '/api/generate/J/result',
        expiresAt: '',
      });
    if (path === '/api/generate/J/result')
      return route.fulfill({
        contentType: 'application/zip',
        headers: {
          'Content-Disposition': 'attachment; filename="documents.zip"',
          'X-Generation-Count': String(count),
        },
        body: 'PK-test-result',
      });
    return json({ error: `Unexpected API ${request.method()} ${path}` }, 500);
  });
  return { writes, templateWrites, started: () => asyncStarted };
}
test('switching models within debounce saves both independent edits', async ({ page }) => {
  const state = await api(page);
  await page.goto('/app/data-models');
  const input = page.locator('.mv-field input').first();
  await expect(input).toHaveValue('Person 0');
  await input.fill('Alice');
  await page.getByRole('button', { name: /Model 1/ }).click();
  await expect(input).toHaveValue('Person 1');
  await input.fill('Bob');
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes).toEqual(
    expect.arrayContaining([
      { id: 'M0', values: { name: 'Alice' } },
      { id: 'M1', values: { name: 'Bob' } },
    ]),
  );
});
test('saved template opens the template editor rather than a workspace document', async ({
  page,
}) => {
  await api(page);
  await page.goto('/app/templates');
  await page.getByRole('button', { name: /Ticket template/ }).dblclick();
  await expect(page).toHaveURL(/\/app\/templates\/T\/edit/);
  await expect(page.locator('canvas').first()).toBeVisible();
});
test('dedicated generation route sends 101 models to async and offers the download', async ({
  page,
}) => {
  const state = await api(page, 101);
  const ids = Array.from({ length: 101 }, (_, index) => `M${index}`).join(',');
  await page.goto(`/app/generate?templateId=T&models=${ids}`);
  const run = page.getByRole('button', { name: /Сгенерировать/ });
  await expect(run).toBeEnabled();
  await run.click();
  await expect.poll(state.started).toBe(true);
  await expect(page.getByRole('button', { name: 'Скачать снова' })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать снова' }).click();
  expect((await downloaded).suggestedFilename()).toBe('documents.zip');
});

test('recovers the newer owner-scoped template draft from IndexedDB', async ({ page }) => {
  const state = await api(page);
  await page.goto('/app/templates');
  await expect(page.getByRole('button', { name: /Ticket template/ })).toBeVisible();
  await page.evaluate(
    async (snapshot) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('ticket-editor-drafts', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('drafts');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('drafts', 'readwrite');
          transaction
            .objectStore('drafts')
            .put({ snapshot, savedAt: Date.now(), revision: 'recovery' }, 'owner:template:T');
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      });
    },
    { slides: [{ ...slide, name: 'Recovered draft' }], activeId: slide.id, data: [], bindings: [] },
  );
  await page.goto('/app/templates/T/edit');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect
    .poll(() => state.templateWrites.some((write) => write.slides[0].name === 'Recovered draft'))
    .toBe(true);
});
