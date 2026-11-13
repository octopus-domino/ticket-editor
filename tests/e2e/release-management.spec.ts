import { test, expect } from '@playwright/test';

test('a phone opens a grouped account release and changes real status commands without losing its management link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  const ids = ['Aabc123Def456', 'Babc123Def456'], actions: string[] = [];
  const documents = ids.map((id, index) => ({ document: { id, kind: 'TICKET', title: 'School play',
    data: { recipient: index ? 'Guest B' : 'Guest A', valid_until: '2100-01-01' }, updatedAt: '2026-11-12T12:00:00Z' },
    status: { state: index ? 'ACTIVE' : 'USED', usedAt: index ? null : '2026-11-12T12:00:00Z', validUntil: '2100-01-01', consumable: true } }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'test', user: { id: 'owner', email: 'owner@example.test', name: 'Owner' } } });
    if (path === '/api/publications/batches') return route.fulfill({ json: { items: [{ id: 'release-1', title: 'School play', kind: 'TICKET', count: 2, createdAt: '2026-11-12T12:00:00Z' }], page: 0, pages: 1, total: 1 } });
    if (path === '/api/publications/batches/release-1') {
      expect(route.request().headers().authorization).toBe('Bearer test');
      return route.fulfill({ json: { id: 'release-1', title: 'School play', documents } });
    }
    if (path === `/api/publications/${ids[0]}/status`) {
      const action = route.request().postDataJSON().action; actions.push(action);
      const status = documents[0].status;
      status.state = action === 'REVOKE' ? 'REVOKED' : action === 'RESTORE' ? 'USED' : 'ACTIVE';
      if (action === 'RESET_USAGE') status.usedAt = null;
      return route.fulfill({ json: status });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/app/publications?tab=batches');
  await expect(page.getByRole('heading', { name: 'School play', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Open release management', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\/release-1$/);
  const article = page.locator('.journey-results article').first();
  await expect(article.getByRole('heading', { name: 'Guest A' })).toBeVisible();
  await article.getByText('Change document status', { exact: true }).click();
  await article.getByRole('button', { name: 'Revoke document', exact: true }).click();
  await article.getByRole('button', { name: 'Confirm revocation', exact: true }).click();
  await expect(article.getByRole('button', { name: 'Restore publication', exact: true })).toBeVisible();
  await expect(article.locator(`a[href^="/manage/${ids[0]}"]`)).toBeVisible();
  await article.getByRole('button', { name: 'Restore publication', exact: true }).click();
  await article.getByRole('button', { name: 'Cancel admission or redemption mark', exact: true }).click();
  expect(actions).toEqual(['REVOKE', 'RESTORE', 'RESET_USAGE']);
  await expect(article.getByRole('button', { name: 'Cancel admission or redemption mark', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../ticket-infra/reports/release-management-mobile.png', fullPage: true });
});

test('attendance checks on a phone are explicit and a repeated visit is shown rather than posted twice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  const id = 'a'.repeat(32), commands: boolean[] = [];
  const status = { id, title: 'Workshop', issuedAt: '2026-11-12T12:00:00Z', checkedAt: null as string | null, visitedAt: null as string | null, canCheck: true, checkedBy: null as string | null, note: null };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'test', user: { id: 'owner', email: 'owner@example.test', name: 'Owner' } } });
    if (path === `/api/public/workflows/visits/${id}`) return route.fulfill({ json: status });
    if (path === `/api/workflows/visits/${id}/check`) {
      expect(route.request().headers().authorization).toBe('Bearer test');
      const visited = route.request().postDataJSON().visited; commands.push(visited);
      status.checkedAt = '2026-11-12T12:10:00Z'; status.checkedBy = 'owner';
      if (visited) status.visitedAt = '2026-11-12T12:11:00Z';
      return route.fulfill({ json: status });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto(`/visits/${id}`);
  await page.getByRole('button', { name: 'Mark as checked', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Document checked');
  await page.getByRole('button', { name: 'Mark attendance', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Attendance recorded');
  await expect(page.getByRole('button', { name: 'Mark attendance', exact: true })).toBeDisabled();
  expect(commands).toEqual([false, true]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
