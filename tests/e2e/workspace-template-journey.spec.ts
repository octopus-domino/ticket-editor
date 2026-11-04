import { test, expect, type Page } from '@playwright/test';

async function mockWorkspace(page: Page) {
  let template: Record<string, unknown> | null = null;
  const schemas = [
    {
      id: 'S',
      name: 'Participants',
      fields: [{ path: 'name', type: 'string', required: true }],
      createdAt: '',
      updatedAt: '',
    },
  ];
  let generated: Record<string, unknown> | null = null;
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/auth/refresh')
      return json({
        accessToken: 'test',
        user: { id: 'owner', name: 'Tester', email: 'test@example.test' },
      });
    if (path === '/api/schemas') return json(schemas);
    if (path === '/api/workspace/tree')
      return json([
        {
          id: 'F',
          type: 'folder',
          name: 'My folder',
          parentId: null,
          updatedAt: null,
          children: template
            ? [
                {
                  id: 'T',
                  type: 'template',
                  name: template.name,
                  parentId: template.folderId,
                  updatedAt: template.updatedAt,
                  children: [],
                },
              ]
            : [],
        },
      ]);
    if (path === '/api/templates' && request.method() === 'POST') {
      template = {
        ...request.postDataJSON(),
        id: 'T',
        createdAt: '',
        updatedAt: new Date().toISOString(),
      };
      return json(template, 201);
    }
    if (path === '/api/templates') return json(template ? [{ ...template, slideCount: 1 }] : []);
    if (path === '/api/templates/T') {
      if (request.method() === 'PUT') template = { ...template, ...request.postDataJSON() };
      return json(template);
    }
    if (path === '/api/data-models')
      return json([
        {
          id: 'M',
          schemaId: 'S',
          name: 'Alice',
          values: { name: 'Alice' },
          createdAt: '',
          updatedAt: '',
        },
      ]);
    if (path === '/api/generate/sync') {
      generated = request.postDataJSON();
      return route.fulfill({
        contentType: 'image/svg+xml',
        headers: {
          'Content-Disposition': 'attachment; filename="certificate.svg"',
          'X-Generation-Count': '1',
        },
        body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
      });
    }
    return json([]);
  });
  return { template: () => template, generated: () => generated };
}

test('creates template in selected folder, reopens the same item and generates without a schema', async ({
  page,
}) => {
  const api = await mockWorkspace(page);
  await page.goto('/app');
  await page.getByText('My folder', { exact: true }).click();
  await page.locator('.workspace-nav').getByRole('link', { name: 'Библиотека документов' }).click();
  await page.getByRole('link', { name: 'Пустой документ' }).click();
  await page.getByLabel('Название шаблона').fill('Certificate');
  await page.getByLabel('Схема данных').selectOption('');
  await page.getByRole('button', { name: 'Создать и открыть редактор' }).click();
  await expect(page).toHaveURL(/templates\/T\/edit/);
  expect(api.template()).toMatchObject({ folderId: 'F', schemaId: null });
  const treeItem = page.locator('aside').getByText('Certificate', { exact: true });
  await expect(treeItem).toBeVisible();
  await page.locator('.workspace-nav').getByRole('link', { name: /Рабочая область/ }).click();
  await treeItem.click();
  await expect(page).toHaveURL(/templates\/T\/edit/);
  const panel = page.locator('.right-panel');
  await panel.getByRole('button', { name: '📦 Генерация' }).click();
  await expect(panel.locator('.gen-preview')).toContainText('Документ без подстановки данных');
  await panel.getByRole('combobox', { name: 'Формат', exact: true }).selectOption('svg');
  await panel.getByRole('combobox', { name: 'Упаковка', exact: true }).selectOption('single');
  const inlineDownload = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Сгенерировать' }).click();
  await inlineDownload;
  expect(api.generated()).toMatchObject({ items: [{ inlineValues: {} }], format: 'svg' });
  expect(api.generated()?.inlineSlides).toHaveLength(1);
  await page.locator('.workspace-nav').getByRole('link', { name: 'Генерация' }).click();
  await page.locator('.gen-sidebar select').first().selectOption('T');
  await page.getByRole('combobox', { name: 'Формат', exact: true }).selectOption('svg');
  await page.getByRole('combobox', { name: 'Упаковка', exact: true }).selectOption('single');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сгенерировать' }).click();
  await download;
  expect(api.generated()).toMatchObject({
    templateId: 'T',
    items: [{ inlineValues: {} }],
    format: 'svg',
  });
});

test('data section offers schema selection after opening a template without schema', async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.goto('/app/templates/new');
  await page.getByLabel('Название шаблона').fill('Static');
  await page.getByLabel('Схема данных').selectOption('');
  await page.getByRole('button', { name: 'Создать и открыть редактор' }).click();
  await expect(page).toHaveURL(/templates\/T\/edit/);
  await expect(page.getByRole('application')).toBeVisible();
  await page.locator('.workspace-nav').getByRole('link', { name: 'Наборы данных' }).click();
  await page.getByLabel('Схема данных').selectOption('S');
  await expect(page.getByText('Alice', { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(/schemaId=S/);
});
