import { test, expect } from '@playwright/test';
import { JOURNEYS } from '../../src/features/journeys/domain/definitions';

test('invitation publishes, accepts RSVP and keeps guest replies private', async ({ page }) => {
  const id = 'Abc123Def456';
  let document: any;
  const replies: any[] = [];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/journeys' && method === 'POST') {
      const input = route.request().postDataJSON();
      document = { ...input, id, updatedAt: new Date().toISOString() };
      return route.fulfill({ json: [{ document, managementKey: 'owner-secret' }] });
    }
    if (path === `/api/journeys/${id}/responses`) {
      if (method === 'POST') {
        replies.push(route.request().postDataJSON());
        return route.fulfill({ status: 204 });
      }
      expect(route.request().headers()['x-management-key']).toBe('owner-secret');
      return route.fulfill({ json: replies });
    }
    if (path.startsWith(`/api/journeys/${id}`)) return route.fulfill({ json: document });
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  await page.goto('/start/invite');
  await page.getByLabel('Повод и приглашение').fill('Приходите на день рождения!');
  await page.getByLabel('Дата', { exact: true }).fill('2026-12-12');
  await page.getByLabel('Время', { exact: true }).fill('18:00');
  await page.getByLabel('Место', { exact: true }).fill('Наш дом');
  await page.locator('form button[type=submit]').click();
  await page.getByRole('button', { name: 'Получить ссылку и PDF' }).click();
  await expect(
    page.getByRole('heading', { name: 'Готово. Теперь можно поделиться.' }),
  ).toBeVisible();
  await page.goto(`/d/${id}`);
  await page.getByLabel('Ваше имя').fill('Анна');
  await page.getByRole('button', { name: 'Отправить ответ' }).click();
  await expect(page.getByRole('status')).toContainText('Ваш ответ сохранён');
  expect(replies).toHaveLength(1);
  await page.goto(`/manage/${id}#key=owner-secret`);
  await expect(page.locator('.journey-manage')).toContainText('Анна');
});

test('constructor publishes a configured site and opens its form on mobile', async ({ page }) => {
  const definition = { ...JOURNEYS.menu, slug: 'test-cafe', title: 'Наше кафе' };
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/journey-sites' && route.request().method() === 'POST')
      return route.fulfill({
        json: { site: route.request().postDataJSON(), managementKey: 'site-key' },
      });
    if(path==='/api/journey-sites/availability')return route.fulfill({json:{status:'available'}});
    if (path === '/api/journey-sites/test-cafe') return route.fulfill({ json: definition });
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  await page.goto('/sites/new');
  await page.getByRole('button', { name: 'QR-меню' }).click();
  await page.getByLabel('Название сайта', { exact: true }).fill('Наше кафе');
  await page.locator('input[placeholder=my-event]').fill('test-cafe');
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('a[href$="/s/test-cafe"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/s/test-cafe');
  await expect(page.getByRole('heading', { name: 'Наше кафе', exact: true })).toBeVisible();
  await expect(page.getByLabel('Блюда и цены — каждое с новой строки')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../reports/consumer-mobile.png', fullPage: true });
});
