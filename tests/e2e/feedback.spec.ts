import { test, expect } from '@playwright/test';

test('feedback is voluntary, keyboard accessible and restores focus', async ({ page }) => {
  await page.route('**/api/**', (route) =>
    new URL(route.request().url()).pathname.startsWith('/api/')
      ? route.fulfill({ status: 401, json: {} })
      : route.continue(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const formRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://forms.yandex.')) formRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(formRequests).toHaveLength(0);
  const trigger = page.getByRole('button', { name: 'Обратная связь', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Как вам CoDoc?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Отправить оценку' })).toBeDisabled();
  await dialog.getByRole('radio', { name: 'Оценка 5 из 5' }).check();
  await expect(dialog.getByRole('button', { name: 'Отправить оценку' })).toBeEnabled();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(formRequests).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
});
