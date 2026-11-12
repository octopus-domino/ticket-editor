import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
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
    return route.fulfill({ json: [] });
  });
});

test('primary journey actions remain visible after the generic button styles load', async ({
  page,
}) => {
  await page.goto('/start/invite');
  const button = page.locator('button.journey-primary').first();
  await expect(button).toBeVisible();
  const colors = await button.evaluate((node) => {
    const style = getComputedStyle(node);
    return { foreground: style.color, background: style.backgroundColor };
  });
  expect(colors.foreground).toBe('rgb(255, 255, 255)');
  expect(colors.background).not.toBe('rgb(255, 255, 255)');
  expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
});

test('site section headings fit inside their white panels', async ({ page }) => {
  await page.goto('/sites/new');
  const panels = page.locator('.journey-builder-form fieldset');
  await expect(panels).toHaveCount(5);
  for (const panel of await panels.all()) {
    const bounds = (await panel.boundingBox())!;
    const heading = (await panel.locator('legend').boundingBox())!;
    expect(heading.y).toBeGreaterThanOrEqual(bounds.y + 10);
    expect(heading.x + heading.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  }
});

test('professional workflow steps scroll within the workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/app/workflows');
  const screen = page.locator('.workflow-page');
  await expect(screen).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Add step/i }).click();
  expect(await screen.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  const last = page.locator('.workflow-panel fieldset').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  expect((await screen.boundingBox())!.height).toBeLessThanOrEqual(720);
});

test('canvas tools have their own column next to the canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/app/editor/local');
  const dock = page.locator('.canvas-dock');
  await expect(dock).toBeVisible();
  const canvas = page.locator('.canvas-area');
  let rail = (await dock.boundingBox())!;
  let area = (await canvas.boundingBox())!;
  expect(rail.x + rail.width).toBeLessThanOrEqual(area.x + 1);
  await page.getByRole('button', { name: 'Tool library', exact: true }).click();
  await expect(page.locator('.left-panel')).toBeVisible();
  rail = (await dock.boundingBox())!;
  area = (await canvas.boundingBox())!;
  expect(rail.x + rail.width).toBeLessThanOrEqual(area.x + 1);
});
