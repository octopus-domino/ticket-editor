import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import type { AccountTrip, LocalTripDraft } from '../../src/features/journeys/api/tripDraft';

const draft: LocalTripDraft = {
  id: 'visual-trip', version: 2, title: 'A week along the Volga',
  startDate: '2027-05-03', endDate: '2027-05-07',
  days: Object.fromEntries(([
    ['Moscow', 55.75, 37.62],
    ['Tver', 56.86, 35.91],
    ['Yaroslavl', 57.63, 39.88],
    ['Kostroma', 57.77, 40.93],
    ['Nizhny Novgorod', 56.33, 44],
  ] as const).map(([city, latitude, longitude], index) => [index + 1, {
    city, cityPoint: { latitude, longitude }, stops: index === 0 ? [
      { id: 'square', label: 'Theatre Square', zone: 'Europe/Moscow', stayMinutes: 25, latitude: 55.7603, longitude: 37.6186 },
      { id: 'garden', label: 'Alexander Garden', zone: 'Europe/Moscow', stayMinutes: 45, latitude: 55.752, longitude: 37.613 },
    ] : [],
  }])),
};
test.beforeEach(async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER !== 'true', 'Requires the trip planner flag');
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
});

for (const mode of ['owner', 'shared'] as const) {
  test(`${mode} trip uses one map and restores the selected day`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const tripRequests: string[] = [];
    await page.route('**/api/auth/refresh', route => route.fulfill(mode === 'owner' ?
      { json: { accessToken: 'test-token', user: { id: 'owner', name: 'Owner', email: 'owner@example.test' } } } :
      { status: 401, json: {} }));
    await page.goto('/start/tours', { waitUntil: 'domcontentloaded' });
    const trip: AccountTrip = await page.evaluate(async source => {
      const modulePath = '/src/features/journeys/api/tripDraft.ts';
      const { tripPayload } = await import(modulePath);
      return tripPayload(source, source.title);
    }, draft);
    await page.route('**/api/routing/v1/trips/visual-trip', route => {
      tripRequests.push(route.request().method());
      return route.fulfill({ json: trip });
    });
    const data = gzipSync(JSON.stringify(trip)).toString('base64url');
    await page.goto(mode === 'owner' ? `/trip/${trip.id}` : `/trip/view?data=${data}`, { waitUntil: 'domcontentloaded' });
    const workspace = page.locator('.trip-exp');
    await expect(workspace).toHaveAttribute('data-mode', mode);
    await expect(workspace.getByRole('heading', { name: trip.title })).toBeVisible();
    await expect(workspace.getByRole('button', { name: 'Share', exact: true })).toHaveCount(mode === 'owner' ? 1 : 0);
    const map = workspace.locator('.route-map');
    await expect(map).toHaveCount(1);
    const originalMap = await map.elementHandle();
    const square = workspace.getByRole('button', { name: 'Theatre Square', exact: true }).first();
    await square.click();
    await expect(square).toHaveAttribute('aria-pressed', 'true');
    await workspace.locator('button[data-trip-day="2"]').click();
    await workspace.locator('button[data-trip-day="2"]').press('ArrowRight');
    await expect(workspace.getByRole('heading', { name: 'Yaroslavl' })).toBeVisible();
    expect(await originalMap?.evaluate(node => node.isConnected)).toBe(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(workspace.getByRole('heading', { name: 'Yaroslavl' })).toBeVisible();
    await workspace.locator('button[data-trip-day="1"]').click();
    await expect(workspace.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 25_000 });
    await page.screenshot({ path: testInfo.outputPath(`${mode}-desktop.png`), animations: 'disabled', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(workspace.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 25_000 });
    await expect(workspace.locator('.leaflet-marker-icon').first()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath(`${mode}-mobile.png`), animations: 'disabled', fullPage: true });
    if (mode === 'shared') expect(tripRequests).toEqual([]);
  });
}
