import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'ru'));
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh')
      return route.fulfill({
        json: {
          accessToken: 'test',
          user: { id: 'owner', name: 'Анна', email: 'owner@example.test' },
        },
      });
    return route.fulfill({ json: [] });
  });
});

test('homepage explains the services and opens the constructor without entering an address', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#services')).toContainText('Приглашения с ответами гостей');
  await expect(page.locator('#services')).toContainText('Сертификаты с QR');
  await expect(page.locator('#services')).toContainText('QR-меню');
  await page
    .locator('.codoc-hero')
    .getByRole('link', { name: /Создать сайт/ })
    .click();
  await expect(page).toHaveURL(/\/sites\/new$/);
  await expect(page.locator('.journey-builder')).toBeVisible();
});

test('workspace navigation exposes the constructor and ready workflows', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.workspace-services')).toBeVisible();
  await page.locator('.workspace-nav details').first().locator('summary').click();
  await page
    .locator('.workspace-nav')
    .getByRole('link', { name: /Готовые сервисы/ })
    .click();
  await expect(page).toHaveURL(/\/solutions\/$/);
  await page
    .locator('.discovery-invite')
    .getByRole('link', { name: /Создать приглашение/ })
    .click();
  await expect(page).toHaveURL(/\/start\/invite$/);
  await expect(page.locator('.journey-form-panel')).toBeVisible();
});

test('service landing pages have metadata and stay usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/solutions/',
    '/website-builder/',
    '/invitations-online/',
    '/certificates-with-qr/',
    '/qr-menu/',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      `https://codoc.site${path}`,
    );
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'index, follow');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
  await page.screenshot({ path: '../reports/service-discovery-mobile.png', fullPage: true });
  await page.goto('/sites/new');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
});
