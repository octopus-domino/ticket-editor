import { test, expect } from '@playwright/test';

test('email shows partial failures, safely retries and confirms SMTP acceptance', async ({
  page,
}) => {
  const sends: { requestId: string; items: { to: string }[] }[] = [];
  const schema = { id: 'S', name: 'Поля', fields: [], createdAt: '', updatedAt: '' };
  const slide = {
    id: 'slide',
    name: 'Документ',
    format: 'a4',
    orientation: 'portrait',
    width: 794,
    height: 1123,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    background: '#fff',
    elements: [],
  };
  const template = {
    id: 'T',
    schemaId: 'S',
    name: 'Email template',
    slides: [slide],
    bindings: [],
    createdAt: '',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/auth/refresh')
      return json({
        accessToken: 'test-token',
        user: { id: 'owner', name: 'Tester', email: 'owner@example.test' },
      });
    if (path === '/api/schemas') return json([schema]);
    if (path === '/api/schemas/S') return json(schema);
    if (path === '/api/templates') return json([{ ...template, slideCount: 1 }]);
    if (path === '/api/templates/T') return json(template);
    if (path === '/api/email/preview')
      return route.fulfill({ contentType: 'text/html', body: '<p>Test email preview</p>' });
    if (path === '/api/email/send') {
      sends.push(request.postDataJSON());
      return sends.length === 1
        ? json(
            {
              sent: 0,
              failed: 1,
              errors: [{ index: 0, to: 'recipient@example.test', message: 'Temporary test error' }],
            },
            202,
          )
        : json({ sent: 1, failed: 0, errors: [] }, 202);
    }
    return json([]);
  });
  await page.goto('/app/templates/T/edit');
  await page.getByRole('button', { name: '📧 Email-превью', exact: true }).click();
  await page
    .locator('.email-modal-toolbar')
    .getByRole('button', { name: '📤 Отправить', exact: true })
    .click();
  await page.locator('.email-form').getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: '📤 Отправить по email', exact: true }).click();
  const form = page.locator('.email-form');
  await form.getByLabel('Кому', { exact: true }).fill('recipient@example.test');
  await form.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(page.locator('.email-error')).toContainText('Не отправлено: 1');
  await expect(page.locator('.email-send-done')).toHaveCount(0);
  await form.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(page.locator('.email-send-done')).toContainText('Письмо передано почтовому серверу');
  expect(sends).toHaveLength(2);
  expect(sends[0].requestId).toBeTruthy();
  expect(sends[0].requestId).toBe(sends[1].requestId);
  expect(sends[0].items[0].to).toBe('recipient@example.test');
});
