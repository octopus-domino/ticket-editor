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
          user: { id: 'owner', name: 'Client', email: 'client@example.test' },
        },
      });
    if (path === '/api/client-keys')
      return route.fulfill({ json: { enabled: true, baseUrl: '/client-api', keys: [] } });
    if (path === '/api/profile')
      return route.fulfill({
        json: {
          id: 'owner',
          name: 'Client',
          email: 'client@example.test',
          organization: '',
          position: '',
          phone: '',
          avatar: '',
        },
      });
    return route.fulfill({ json: [] });
  });
}

test('integration sections use styled navigation and the header opens the profile', async ({
  page,
}) => {
  await account(page);
  for (const [path, label] of [
    ['/app/api-access', 'Client API'],
    ['/app/integrations', 'Data connections'],
    ['/app/libraries', 'Shared libraries'],
    ['/app/history', 'Generation history'],
  ]) {
    await page.goto(path);
    const link = page.locator('.workspace-nav').getByRole('link', { name: label });
    await expect(link).toHaveClass(/active/);
    await expect(page.locator('.template-new')).toBeVisible();
    if (path === '/app/integrations') await page.locator('.template-new summary').click();
    const button = page.locator('.template-new button:visible').first();
    await expect(button).toBeVisible();
    expect(
      await button.evaluate((el) => parseFloat(getComputedStyle(el).borderRadius)),
    ).toBeGreaterThanOrEqual(8);
    if (path === '/app/api-access')
      await page.screenshot({ path: '../reports/workspace-api-preview.png' });
  }
  await page.locator('.workspace-profile-link').click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(page.locator('input[type=email]')).toHaveValue('client@example.test');
});

test('custom orientation switches immediately and saving does not move the canvas', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'Unauthorized' } }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue without registration', exact: true }).click();
  const id = await page.evaluate(async () => {
    const api = '/src/shared/api/client.ts',
      factory = '/src/lib/factories.ts';
    const { authFetch } = await import(api),
      { newSlide } = await import(factory);
    const slide = {
      ...newSlide(1),
      id: 'sheet',
      format: 'custom',
      orientation: 'portrait',
      width: 400,
      height: 600,
    };
    const created = await (
      await authFetch('/api/workspace/documents', {
        method: 'POST',
        body: JSON.stringify({ name: 'Orientation', folderId: null }),
      })
    ).json();
    await authFetch(`/api/workspace/documents/${created.id}/content`, {
      method: 'PUT',
      body: JSON.stringify({
        content: JSON.stringify({ version: '2.0', slides: [slide], activeId: 'sheet', data: [] }),
      }),
    });
    return created.id as string;
  });
  await page.goto(`/app/editor/${id}`);
  const layout = page.locator('.editor-layout'),
    stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  await page.getByRole('button', { name: 'Tool library', exact: true }).click();
  await expect(page.locator('.editor-save-status')).toHaveCount(0);
  const before = await layout.boundingBox();
  await page.getByRole('button', { name: 'Landscape', exact: true }).click();
  await expect
    .poll(async () => {
      const b = await stage.boundingBox();
      return b!.width / b!.height;
    })
    .toBeCloseTo(1.5, 1);
  const during = await layout.boundingBox();
  expect(during!.y).toBeCloseTo(before!.y, 1);
  expect(during!.height).toBeCloseTo(before!.height, 1);
  await expect(page.locator('.editor-save-status')).toHaveCount(0);
  const after = await layout.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 1);
  expect(after!.height).toBeCloseTo(before!.height, 1);
  await page.getByRole('button', { name: 'Portrait', exact: true }).click();
  await expect
    .poll(async () => {
      const b = await stage.boundingBox();
      return b!.width / b!.height;
    })
    .toBeCloseTo(2 / 3, 1);
  await page.locator('.left-panel').getByLabel('Width', { exact: true }).fill('450');
  await expect
    .poll(async () => {
      const b = await stage.boundingBox();
      return b!.width / b!.height;
    })
    .toBeCloseTo(0.75, 1);
});

test('lesson highlights stay inside the visible print margins', async ({ page }) => {
  await account(page);
  await page.goto('/learn?lesson=document');
  await expect(page.locator('.lesson-margin-guide')).toBeVisible();
  await page.locator('.lesson-index button').nth(1).click();
  const rect = page.locator('.lesson-focus rect');
  const bounds = await rect.evaluate((el) => ({
    x: Number(el.getAttribute('x')),
    y: Number(el.getAttribute('y')),
    w: Number(el.getAttribute('width')),
    h: Number(el.getAttribute('height')),
  }));
  expect(bounds.y).toBeGreaterThanOrEqual(28);
  expect(bounds.x + bounds.w).toBeLessThanOrEqual(1095);
  expect(bounds.y + bounds.h).toBeLessThanOrEqual(766);
  await page.screenshot({ path: '../reports/learning-margins-preview.png' });
});
