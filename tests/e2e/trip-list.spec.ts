import { expect, test } from '@playwright/test';

test('Routes lists the saved trip and starts a clean new trip', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER !== 'true', 'Requires the trip planner flag');
  const oldTrip = {
    id: 'saved-trip', title: 'Saved trip', version: 2,
    startDate: '2027-01-01', endDate: '2027-01-02',
    cities: [{ id: 'city', name: 'Moscow' }], days: [{ date: '2027-01-01', cityId: 'city', segments: [] }],
    legs: [], accommodations: [], documents: [], travelers: [], baseCurrency: 'RUB',
    meta: { mode: 'TRIP', source: 'MANUAL' },
  };
  let saved: typeof oldTrip | undefined;
  await page.addInitScript(() => {
    localStorage.setItem('codoc:language', 'en');
    localStorage.setItem('codoc/trip-planner/draft/v2', JSON.stringify({
      id: 'stale', version: 2, title: 'Stale local route',
      startDate: '2026-01-01', endDate: '2026-01-02', days: { 1: { stops: [], city: 'City' } },
    }));
  });
  await page.route('**/api/auth/refresh', route => route.fulfill({ json: {
    accessToken: 'test-token', user: { id: 'owner', name: 'Owner', email: 'owner@example.test' },
  } }));
  await page.route('**/api/routing/v1/trips?page=*', route => route.fulfill({
    json: { items: saved ? [saved, oldTrip] : [oldTrip], hasNext: false },
  }));
  await page.route('**/api/routing/v1/trips/saved-trip', route => route.fulfill({ json: oldTrip }));
  await page.route('**/api/routing/v1/trips', route => {
    expect(route.request().method()).toBe('POST');
    saved = route.request().postDataJSON() as typeof oldTrip;
    return route.fulfill({ status: 201, json: saved });
  });

  await page.goto('/start/tours');
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.getByRole('heading', { name: 'My routes' })).toBeVisible();
  await page.getByRole('link', { name: /Saved trip/ }).click();
  await expect(page.getByRole('heading', { name: 'Saved trip' })).toBeVisible();
  await page.getByRole('link', { name: 'My routes' }).click();
  await page.getByRole('link', { name: 'Create route' }).click();
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await expect(planner.getByLabel('Trip name')).toHaveValue('');
  await expect(planner.getByLabel('Start date')).toHaveValue('');
  await planner.getByLabel('Trip name').fill('New route');
  await planner.getByLabel('Start date').fill('2027-02-01');
  await planner.getByRole('button', { name: 'Save trip to account' }).click();
  await expect(planner.getByRole('link', { name: 'Open account trip' })).toBeVisible();
  expect(saved).toMatchObject({ title: 'New route', cities: [], days: [] });
  expect(saved?.id).not.toBe(oldTrip.id);
  await planner.getByRole('link', { name: 'My routes' }).click();
  await expect(page.getByRole('link', { name: /New route/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Saved trip/ })).toBeVisible();
});
