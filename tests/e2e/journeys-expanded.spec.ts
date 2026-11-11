import { test, expect } from '@playwright/test';
import { JOURNEYS, JOURNEY_CAPABILITIES } from '../../src/features/journeys/domain/definitions';
import { zipSync, strToU8 } from 'fflate';

test('renewing a pass refreshes its validity immediately after saving', async ({ page }) => {
  let document = {
    id: 'Abc123Def456',
    kind: 'PASS',
    title: 'Пропуск',
    data: { recipient: 'Анна', valid_until: '2000-01-01' },
    updatedAt: '2026-01-01T00:00:00Z',
  };
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path.endsWith('/status'))
      return route.fulfill({
        json: {
          state: document.data.valid_until === '2000-01-01' ? 'EXPIRED' : 'ACTIVE',
          usedAt: null,
          validUntil: document.data.valid_until,
          consumable: false,
        },
      });
    if (path.endsWith('/responses')) return route.fulfill({ json: [] });
    if (path === '/api/journeys/Abc123Def456' && route.request().method() === 'PUT') {
      document = { ...route.request().postDataJSON(), updatedAt: '2026-01-02T00:00:00Z' };
      return route.fulfill({ json: document });
    }
    if (path.endsWith('/manage')) return route.fulfill({ json: document });
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  await page.goto('/manage/Abc123Def456#key=owner-key');
  await expect(page.getByRole('heading', { name: 'Срок истёк' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Действует по (ГГГГ-ММ-ДД)', exact: true })
    .fill('2100-01-01');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByRole('heading', { name: 'Действителен', exact: true })).toBeVisible();
});

for (const slug of [
  'certificates',
  'menu',
  'tickets',
  'gifts',
  'badges',
  'passes',
  'resume',
  'schedule',
  'greetings',
]) {
  test(`${slug}: fill, preview, publish and open the release`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const definition = JOURNEYS[slug];
    let docs: any[] = [];
    let used = false;
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      const method = route.request().method();
      if (path === '/api/journeys' && method === 'POST') {
        const input = route.request().postDataJSON();
        docs = (input.recipients.length ? input.recipients : ['']).map(
          (recipient: string, index: number) => ({
            id: `Abc123Def45${index}`,
            kind: input.kind,
            title: input.title,
            data: { ...input.data, ...(recipient ? { recipient } : {}) },
            updatedAt: new Date().toISOString(),
          }),
        );
        return route.fulfill({
          json: docs.map((document) => ({
            document,
            managementKey: 'owner-key',
            batchId: 'batch-id',
          })),
        });
      }
      if (path === '/api/journeys/batches/batch-id') {
        expect(route.request().headers()['x-management-key']).toBe('owner-key');
        return route.fulfill({
          json: {
            id: 'batch-id',
            title: docs[0].title,
            documents: docs.map((document) => ({
              document,
              status: {
                state: used ? 'USED' : 'ACTIVE',
                usedAt: null,
                validUntil: '2100-01-01',
                consumable: ['TICKET', 'GIFT'].includes(document.kind),
              },
            })),
          },
        });
      }
      if (path.endsWith('/consume')) {
        used = true;
        return route.fulfill({ json: { state: 'USED' } });
      }
      return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    });
    await page.goto(`/start/${slug}`);
    await expect(page.locator('.journey-app')).toBeVisible();
    expect(
      await page.locator('.journey-app').evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    for (const field of definition.fields) {
      if (!field.required) continue;
      const value =
        field.type === 'date'
          ? '2100-01-01'
          : field.type === 'time'
            ? '12:00'
            : field.name === 'amount'
              ? '1000'
              : field.name === 'timezone'
                ? 'Europe/Moscow'
                : 'Пример';
      await page.getByLabel(field.label, { exact: true }).fill(value);
    }
    if (JOURNEY_CAPABILITIES[definition.kind].batch)
      await page.getByLabel('Имена участников — каждое с новой строки').fill('Анна Иванова');
    if (slug === 'schedule') {
      await page.getByRole('button', { name: 'Добавить занятие' }).click();
      await page.getByLabel('Дата', { exact: true }).fill('2100-01-01');
      await page.getByLabel('Время', { exact: true }).fill('12:00');
      await page.getByLabel('Занятие', { exact: true }).fill('Английский');
    }
    await page.getByRole('button', { name: 'Посмотреть результат' }).click();
    await page.getByRole('button', { name: 'Получить ссылку и PDF' }).click();
    await expect(
      page.getByRole('heading', { name: 'Готово. Теперь можно поделиться.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Отправить по email' })).toHaveAttribute(
      'href',
      /^mailto:/,
    );
    await page
      .getByRole('link', { name: 'Открыть реестр выпуска и скачать все документы' })
      .click();
    await expect(page.getByRole('button', { name: /Скачать весь выпуск PDF/ })).toBeVisible();
    if (slug === 'tickets' || slug === 'gifts') {
      await page
        .getByRole('button', {
          name: slug === 'gifts' ? 'Подтвердить погашение' : 'Подтвердить проход',
        })
        .click();
      await expect(
        page.getByRole('button', {
          name: slug === 'gifts' ? 'Подтвердить погашение' : 'Подтвердить проход',
        }),
      ).toBeDisabled();
      await expect(page.locator('.journey-results')).toContainText('Использован');
    }
  });
}

test('proposal imports an external XLSX, maps columns and publishes checked totals', async ({
  page,
}) => {
  let published: any;
  await page.route('**/api/**', (route) => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/')) return route.continue();
    if (
      new URL(route.request().url()).pathname === '/api/journeys' &&
      route.request().method() === 'POST'
    ) {
      published = route.request().postDataJSON();
      return route.fulfill({
        json: [
          {
            document: { ...published, id: 'Abc123Def456', updatedAt: new Date().toISOString() },
            managementKey: 'key',
          },
        ],
      });
    }
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  const strings = ['Наименование', 'Кол-во', 'Цена', 'Услуга'];
  const bytes = zipSync({
    'xl/workbook.xml': strToU8(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet r:id="r1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>${strings[0]}</t></is></c><c r="B1" t="inlineStr"><is><t>${strings[1]}</t></is></c><c r="C1" t="inlineStr"><is><t>${strings[2]}</t></is></c></row><row><c r="A2" t="inlineStr"><is><t>${strings[3]}</t></is></c><c r="B2"><v>1.5</v></c><c r="C2"><v>10.01</v></c></row></sheetData></worksheet>`,
    ),
  });
  await page.goto('/commercial-proposal/');
  await page.getByRole('link', { name: 'Создать КП', exact: false }).first().click();
  await page.getByLabel('Ваша компания', { exact: true }).fill('Студия');
  await page.getByLabel('Кому адресовано', { exact: true }).fill('Клиент');
  await page.getByLabel('Как заказать или связаться', { exact: true }).fill('hello@example.com');
  await page.getByLabel('Загрузить из Excel (.xlsx)', { exact: true }).setInputFiles({
    name: 'export.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(bytes),
  });
  await page.getByRole('button', { name: 'Проверить и добавить позиции' }).click();
  await expect(page.locator('.proposal-action-summary strong')).toContainText('15,02');
  await page.getByRole('button', { name: 'Посмотреть результат' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.locator('.journey-app').evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.locator('.journey-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../reports/proposal-mobile.png' });
  await page.getByRole('button', { name: 'Получить ссылку и PDF' }).click();
  await expect(
    page.getByRole('heading', { name: 'Готово. Теперь можно поделиться.' }),
  ).toBeVisible();
  expect(JSON.parse(published.data.positions)).toEqual([
    { name: 'Услуга', quantity: '1.5', price: '10.01' },
  ]);
});
