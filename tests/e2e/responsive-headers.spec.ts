import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`solutions and both builders have usable navigation at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.addInitScript(() => localStorage.setItem('codoc:language', 'ru'));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path === '/api/auth/refresh') {
        return route.fulfill({ json: {
          accessToken: 'test', user: { id: 'owner', name: 'Анна', email: 'owner@example.test' },
        } });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto('/solutions/');
    const header = page.locator('.solution-header');
    await expect(header.getByRole('combobox')).toHaveValue('ru');
    await checkWidth();
    await page.screenshot({ path: testInfo.outputPath('solutions.png') });
    await header.locator('summary').click();
    const popup = header.locator('.solutions-menu-panel');
    await expect(popup.getByRole('link', { name: 'Все готовые решения', exact: true })).toBeVisible();
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath('solutions-menu.png') });
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(header.locator('summary')).toBeFocused();

    await page.goto('/sites/new');
    await expect(header).toBeVisible();
    await checkWidth();
    await page.screenshot({ path: testInfo.outputPath('site-builder.png') });

    await page.goto('/app/editor/local');
    const workspace = page.locator('.workspace-header');
    await expect(workspace.getByRole('combobox')).toHaveValue('ru');
    await expect(workspace.getByRole('link', { name: 'Профиль клиента' })).toBeVisible();
    if (width === 390) {
      const documents = workspace.getByRole('button', { name: 'Документы', exact: true });
      await documents.click();
      await expect(documents).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(documents).toHaveAttribute('aria-expanded', 'false');
    }
    await checkWidth();
    await page.screenshot({ path: testInfo.outputPath('document-builder.png') });
    await workspace.locator('summary').click();
    const feedback = workspace.getByRole('button', { name: 'Обратная связь' });
    await expect(feedback).toBeVisible();
    await feedback.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(feedback).toBeFocused();

    async function checkWidth() {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}
