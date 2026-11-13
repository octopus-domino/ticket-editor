import { test, expect } from '@playwright/test';

test('poetry on a phone uses the selected local region and keeps age, mood and language explicit', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    geolocation: { latitude: 43.1155, longitude: 131.8855 }, permissions: ['geolocation'] });
  let request: Record<string, unknown> | undefined;
  await context.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/journeys/poetry' && route.request().method() === 'POST') {
      request = route.request().postDataJSON();
      return route.fulfill({ status: 503, json: { error: 'journey.poetry.sources-unavailable' } });
    }
    return route.fulfill({ status: 401, json: {} });
  });
  try {
    const page = await context.newPage();
    await page.goto('/start/poetry');
    const form = page.locator('.poetry-wizard');
    await expect(form).toBeVisible();
    await expect(form.getByRole('button', { name: 'Choose poems for seven days', exact: true })).toBeDisabled();
    await form.getByLabel('Poem language', { exact: true }).selectOption('ru');
    await form.getByLabel('Mood', { exact: true }).selectOption('funny');
    await form.getByLabel('Who are these cards for?', { exact: true }).selectOption('child');
    await form.getByRole('button', { name: 'Use my location', exact: true }).tap();
    await expect(form.getByRole('status')).toHaveText('Your location');
    await form.getByRole('button', { name: 'Choose poems for seven days', exact: true }).tap();
    await expect.poll(() => request).toBeDefined();
    expect(request).toMatchObject({ latitude: 43.12, longitude: 131.89, zone: 'Asia/Vladivostok', language: 'ru', mood: 'funny', audience: 'child' });
    expect(request).not.toHaveProperty('label');
    await expect(form.getByRole('alert')).toHaveText('The poetry sources are unavailable. Try again a little later.');
    await expect(form.getByRole('button', { name: 'Choose poems for seven days', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '../ticket-infra/reports/poetry-mobile-region.png', fullPage: true });
  } finally { await context.close(); }
});
