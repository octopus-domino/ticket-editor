import { test, expect } from '@playwright/test';

test('authenticated owner constructs and publishes a new path; visitor receives PDF', async ({
  page,
}) => {
  let saved: any = null;
  let published: any = null;
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
    if (path === '/api/workflows/availability')
      return route.fulfill({ json: { status: 'available' } });
    if (path === '/api/templates')
      return route.fulfill({
        json: [{ id: 'T', name: 'My document', schemaId: 'S', slideCount: 1, updatedAt: '' }],
      });
    if (path === '/api/workflows/template-fields')
      return route.fulfill({
        json: [{ path: 'name', label: 'Имя', type: 'text', required: true, options: [] }],
      });
    if (path === '/api/workflows' && route.request().method() === 'GET')
      return route.fulfill({ json: saved ? [saved] : [] });
    if (path === '/api/workflows' && route.request().method() === 'POST') {
      expect(route.request().headers().authorization).toBe('Bearer test');
      saved = {
        definition: route.request().postDataJSON().definition,
        revision: 1,
        published: false,
        shared: false,
        administrator: false,
      };
      return route.fulfill({ json: saved });
    }
    if (path.endsWith('/publish')) {
      saved = { ...saved, revision: 2, published: true };
      published = { definition: saved.definition, revision: 2 };
      return route.fulfill({ json: saved });
    }
    if (path === '/api/public/workflows/my-service') return route.fulfill({ json: published });
    if (path === '/api/public/workflows/my-service/pdf') {
      expect(route.request().postDataJSON()).toEqual({ revision: 2, values: { name: 'Анна' } });
      return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n' });
    }
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/workflows');
  await page.getByLabel('Название', { exact: true }).fill('Мой новый сервис');
  await page.getByLabel('Адрес /flows/').fill('my-service');
  await page.getByLabel('Шаблон PDF').selectOption('T');
  await page.getByRole('button', { name: 'Загрузить поля из схемы шаблона' }).click();
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Открыть путь' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../reports/workflow-builder-mobile.png', fullPage: true });
  await page.goto('/flows/my-service');
  await expect(page.getByRole('heading', { name: 'Мой новый сервис' })).toBeVisible();
  await page.getByLabel('Имя *').fill('Анна');
  await page.getByRole('button', { name: 'Получить PDF', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Скачать PDF' })).toHaveAttribute('href', /^blob:/);
});
