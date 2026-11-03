import { test, expect } from '@playwright/test';

test('landing works on mobile and preserves creation intent across auth screens', async ({
  page,
}) => {
  await page.route('**/api/**', (route) =>
    new URL(route.request().url()).pathname.startsWith('/api/')
      ? route.fulfill({ status: 401, json: {} })
      : route.continue(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveTitle(/CoDoc.*генератор PDF/);
  await expect(page.locator('h1')).toContainText('Документы разные.');
  await expect(page.locator('.codoc-hero-art img')).toHaveJSProperty('naturalWidth', 1536);
  expect(
    await page.locator('.codoc-landing').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole('link', { name: 'Создать свой шаблон' }).click();
  await expect(page).toHaveURL(/register\?next=/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await page.getByRole('link', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/login\?next=/);
});

test('creates an actual reusable template directly and opens its editor', async ({ page }) => {
  let created: Record<string, unknown> | null = null;
  let savedSchemaId: unknown = null;
  const schemas = [{ id: 'existing-schema', name: 'Существующая схема', fields: [], createdAt: '', updatedAt: '' }];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/auth/refresh')
      return json({
        accessToken: 'test-token',
        user: { id: 'owner', name: 'Tester', email: 'test@example.com' },
      });
    if (path === '/api/schemas' && route.request().method() === 'POST') {
      const schema = { ...route.request().postDataJSON(), id: 'new-schema', createdAt: '', updatedAt: '' };
      schemas.push(schema);
      return json(schema, 201);
    }
    if (path === '/api/schemas') return json(schemas);
    if (path === '/api/templates' && route.request().method() === 'POST') {
      created = route.request().postDataJSON() as Record<string, unknown>;
      return json(
        {
          ...created,
          id: 'created-template',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        201,
      );
    }
    if (path === '/api/templates/created-template' && route.request().method() === 'PUT') {
      created = route.request().postDataJSON() as Record<string, unknown>;
      savedSchemaId = created.schemaId;
    }
    if (path === '/api/templates/created-template')
      return json({
        ...created,
        id: 'created-template',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    return json([]);
  });
  await page.goto('/app/templates');
  await page.getByRole('link', { name: '+ Создать шаблон' }).click();
  await page.getByLabel('Название шаблона').fill('Сертификат участника');
  await page.getByLabel('Поля данных').selectOption('');
  await page.getByRole('button', { name: 'Создать и открыть редактор' }).click();
  await expect(page).toHaveURL('/app/templates/created-template/edit');
  await expect(page.locator('.template-editor-toolbar')).toContainText('Сертификат участника');
  expect(created).toMatchObject({ name: 'Сертификат участника', schemaId: null, bindings: [] });
  expect(created?.['slides']).toHaveLength(1);
  await expect(page.getByRole('application')).toBeVisible();
  const dataPanel = page.locator('.right-panel');
  await expect(dataPanel.getByLabel('Схема данных')).toBeVisible();
  await dataPanel.getByRole('button', { name: '+ Создать схему', exact: true }).click();
  await expect(dataPanel.getByLabel('Схема данных')).toHaveValue('new-schema');
  await expect.poll(() => savedSchemaId).toBe('new-schema');
  await expect(page.locator('.template-next')).toContainText('Шаблон сохранён');
  await expect(page.getByRole('status').filter({ hasText: /^saved$/ })).toHaveCount(0);
  await page.reload();
  await dataPanel.getByRole('button', { name: '📊 Данные', exact: true }).click();
  await expect(dataPanel.getByLabel('Схема данных')).toHaveValue('new-schema');
});
