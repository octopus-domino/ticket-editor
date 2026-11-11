import { test, expect } from '@playwright/test';

test('account registry lists sites, filters their documents and paginates without management keys', async ({
  page,
}) => {
  const queries: URL[] = [];
  const document = {
    id: 'AbCdEf123456',
    kind: 'TICKET',
    title: 'School play',
    data: { recipient: 'Alex' },
    updatedAt: '2026-11-11T12:00:00Z',
  };
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/refresh')
      return route.fulfill({
        json: {
          accessToken: 'test',
          user: { id: 'owner', email: 'owner@example.test', name: 'Owner' },
        },
      });
    if (url.pathname === '/api/publications/sites')
      return route.fulfill({
        json: {
          items: [
            {
              site: {
                slug: 'school',
                title: 'School',
                kind: 'TICKET',
                description: '',
                theme: 'ink',
                fields: [],
              },
              updatedAt: document.updatedAt,
            },
          ],
          page: 0,
          pages: 1,
          total: 1,
        },
      });
    if (url.pathname === '/api/publications') {
      queries.push(url);
      expect(route.request().headers().authorization).toBe('Bearer test');
      return route.fulfill({
        json: {
          items: [
            {
              document: {
                ...document,
                data: { recipient: url.searchParams.get('page') === '1' ? 'Morgan' : 'Alex' },
              },
              status: { state: 'ACTIVE' },
              siteSlug: 'school',
            },
          ],
          page: Number(url.searchParams.get('page')),
          pages: 2,
          total: 21,
        },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/app/publications');
  await expect(page.getByRole('heading', { name: 'School', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Site documents', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  expect(queries.at(-1)?.searchParams.get('site')).toBe('school');
  await expect(page.getByRole('link', { name: 'Manage', exact: true })).toHaveAttribute(
    'href',
    '/manage/AbCdEf123456',
  );
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Morgan', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: /^Search/ }).fill('Alex');
  await expect.poll(() => queries.at(-1)?.searchParams.get('search')).toBe('Alex');
  expect(queries.at(-1)?.searchParams.get('page')).toBe('0');
});
