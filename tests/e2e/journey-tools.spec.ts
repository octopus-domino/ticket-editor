import { test, expect, type Page } from '@playwright/test';
import { JOURNEYS } from '../../src/features/journeys/domain/definitions';

async function mockApi(page: Page) {
  const state = { document: null as any, image: '', snapshot: null as any };
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#edf2e8' } },
        ],
      },
    }),
  );
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.startsWith('/api/journeys/fonts/'))
      return route.fulfill({
        path: '../ticket-pdf/src/main/resources/fonts/DejaVuSans.ttf',
        contentType: 'font/ttf',
      });
    if (url.pathname === '/api/journeys/artwork') {
      const input = route.request().postDataJSON();
      return route.fulfill({
        json: {
          pages: [
            {
              width: 794,
              height: 1123,
              svg: `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><rect width="794" height="1123" fill="#fff"/><text x="30" y="60">${input.kind} preview</text></svg>`,
            },
          ],
        },
      });
    }
    if (url.pathname === '/api/journeys/routes/addresses')
      return route.fulfill({
        json: [
          {
            label: url.searchParams.get('q')?.includes('Airport')
              ? 'Berlin Airport'
              : 'Berlin Museum',
            longitude: 13.4,
            latitude: url.searchParams.get('q')?.includes('Airport') ? 52.4 : 52.5,
          },
        ],
      });
    if (url.pathname === '/api/journeys/media' && method === 'POST') {
      state.image = route.request().postDataJSON().image;
      return route.fulfill({ json: { id: 'a'.repeat(64) } });
    }
    if (url.pathname === '/api/journeys/routes' && method === 'POST') {
      state.snapshot = route.request().postDataJSON();
      return route.fulfill({ json: { id: 'b'.repeat(64) } });
    }
    if (url.pathname === '/api/journeys' && method === 'POST') {
      state.document = {
        ...route.request().postDataJSON(),
        id: 'Abc123Def456',
        updatedAt: new Date().toISOString(),
      };
      return route.fulfill({ json: [{ document: state.document, managementKey: 'owner-key' }] });
    }
    if (url.pathname.endsWith('/reviews'))
      return method === 'POST'
        ? route.fulfill({ status: 200 })
        : route.fulfill({ json: { items: [], page: 0, pages: 0, total: 0, average: 0 } });
    if (url.pathname === '/api/journeys/Abc123Def456')
      return route.fulfill({ json: state.document });
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  return state;
}

for (const slug of ['cards', 'labels', 'price-tags', 'properties'])
  test(`${slug}: a 320px phone completes the form and gets a publication`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const state = await mockApi(page),
      definition = JOURNEYS[slug];
    await page.goto(`/start/${slug}`);
    for (const field of definition.fields) {
      if (!field.required) continue;
      await page
        .getByLabel(field.label, { exact: true })
        .fill(
          field.type === 'date'
            ? '2100-01-01'
            : field.name === 'price'
              ? '1200'
              : field.name === 'currency'
                ? 'RUB'
                : 'Пример',
        );
    }
    if (slug === 'cards') {
      await page.getByLabel('Ширина', { exact: true }).fill('90');
      await page.getByLabel('Высота', { exact: true }).fill('50');
    }
    await page.getByRole('button', { name: 'Посмотреть результат' }).click();
    await expect(page.locator('.journey-artwork-page svg')).toBeVisible();
    await page.getByRole('button', { name: 'Получить ссылку и PDF' }).click();
    await expect(
      page.getByRole('heading', { name: 'Готово. Теперь можно поделиться.' }),
    ).toBeVisible();
    expect(state.document.kind).toBe(definition.kind);
    expect(state.document.data.field_labels).not.toContain('Пример');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (slug === 'price-tags') {
      await page.goto('/d/Abc123Def456');
      await page.getByLabel('Ваш отзыв', { exact: true }).fill('Удобно');
      await page.getByRole('button', { name: 'Отправить отзыв' }).click();
      await expect(page.getByText('Спасибо! Ваш отзыв сохранён.')).toBeVisible();
    }
  });

test('airport itinerary saves a print-resolution map and a coherent timeline on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockApi(page);
  await page.goto('/start/tours');
  await page.getByLabel('Дата начала', { exact: true }).fill('2026-12-12');
  const addresses = page.getByRole('combobox', { name: 'Адрес', exact: true });
  await addresses.nth(0).fill('Museum Berlin');
  await page.getByRole('option', { name: 'Berlin Museum' }).click();
  await addresses.nth(1).fill('Airport Berlin');
  await page.getByRole('option', { name: 'Berlin Airport' }).click();
  await page.getByLabel('Часовой пояс', { exact: true }).nth(1).fill('Asia/Dubai');
  await page.getByLabel('Как добраться до следующей остановки').selectOption('flight');
  await page.getByLabel('Вылет, местное время').fill('2026-12-12T10:00');
  await page.getByLabel('Прилёт, местное время').fill('2026-12-12T16:00');
  await page.getByRole('button', { name: 'Рассчитать время выезда к рейсу' }).click();
  await expect(page.locator('.route-timeline')).toContainText('Регистрация и досмотр');
  await expect(page.locator('.route-timeline')).toContainText('Europe/Berlin → Asia/Dubai');
  await page.getByRole('button', { name: 'Сохранить маршрут и карту для печати' }).click();
  await expect(page.getByText('Маршрут сохранён', { exact: true })).toBeVisible({ timeout: 20000 });
  const dimensions = await page.evaluate(async (image) => {
    const bitmap = await createImageBitmap(await (await fetch(image)).blob());
    const size = [bitmap.width, bitmap.height];
    bitmap.close();
    return size;
  }, state.image);
  expect(dimensions).toEqual([2400, 1500]);
  expect(state.snapshot.timeline.map((row: any) => row.kind)).toContain('flight');
  expect(state.snapshot.stops[0].zone).toBe('Europe/Berlin');
  await page.getByRole('button', { name: 'Посмотреть результат' }).click();
  await page.getByRole('button', { name: 'Получить ссылку и PDF' }).click();
  await expect(
    page.getByRole('heading', { name: 'Готово. Теперь можно поделиться.' }),
  ).toBeVisible();
  expect(state.document.data.route).toBe('b'.repeat(64));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
