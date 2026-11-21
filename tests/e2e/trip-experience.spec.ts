import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
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
const owner = { accessToken: 'test-token', user: { id: 'owner', name: 'Owner', email: 'owner@example.test' } };

test('keeps a walk on the receiving city and retains the draft when starting a new trip', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER_V2 !== 'true', 'Requires the new planner');
  await page.addInitScript(source => {
    if (window.top === window && !localStorage.getItem('codoc/trip-planner/draft/v2'))
      localStorage.setItem('codoc/trip-planner/draft/v2', JSON.stringify(source));
  }, draft);
  await page.route('**/api/auth/refresh', route => route.fulfill({ json: owner }));
  let roadRequests = 0;
  await page.route('**/api/journeys/routes/road', route => {
    roadRequests++;
    const { start, end } = route.request().postDataJSON();
    return route.fulfill({ json: { distanceMeters: 150_000, durationSeconds: 7200,
      coordinates: [[start.longitude, start.latitude], [end.longitude, end.latitude]] } });
  });
  await page.route('**/private-journey/?*', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.goto('/start/tours');
  const workspace = page.locator('.trip-exp[data-mode="planner"]');
  const map = workspace.locator('.route-map');
  await workspace.locator('button[data-trip-day="2"]').click();
  const cityPin = map.locator('[title="Tver"]');
  await expect(cityPin).toBeInViewport();
  const [pin, bounds] = await Promise.all([cityPin.boundingBox(), map.boundingBox()]);
  expect(Math.abs(pin!.x + pin!.width / 2 - bounds!.x - bounds!.width / 2)).toBeLessThan(20);

  await workspace.getByRole('button', { name: /Plan walk in Journey/ }).click();
  const iframe = workspace.locator('iframe');
  const frame = await (await iframe.elementHandle())!.contentFrame();
  await frame!.waitForURL('**/private-journey/?*');
  await frame!.evaluate(() => {
    const channel = new URLSearchParams(location.search).get('channel');
    window.parent.postMessage({ type: 'private-walk:complete', channel, walk: {
      version: 1, title: 'Tver riverside walk',
      points: [{ name: 'Tver pier', lat: 56.86, lng: 35.91 }, { name: 'Tver bridge', lat: 56.862, lng: 35.912 }],
      route: { legs: [{ fromIndex: 0, toIndex: 1, distanceMeters: 300, durationSeconds: 210,
        geometry: [[56.86, 35.91], [56.862, 35.912]] }] },
    } }, location.origin);
  });
  await expect(workspace.getByText('Tver riverside walk', { exact: true })).toBeVisible();
  await workspace.locator('button[data-trip-day="3"]').click();
  await expect(map.locator('[title="Yaroslavl"]')).toBeInViewport();
  await expect(map.locator('[title="Tver bridge"]')).toHaveCount(0);
  await workspace.locator('button[data-trip-day="2"]').click();
  await expect(map.locator('[title="Tver bridge"]')).toBeInViewport();
  await expect.poll(() => roadRequests).toBe(4);
  await workspace.getByRole('button', { name: 'Trip map', exact: true }).click();
  await expect(map.locator('[title="Nizhny Novgorod"]')).toBeVisible();
  await workspace.locator('button[data-trip-day="2"]').click();
  await expect(map.locator('[title="Tver bridge"]')).toBeInViewport();
  expect(roadRequests).toBe(4);
  await page.route('**/api/trips/visual-trip', route => route.fulfill({ json: {} }));
  const requestPromise = page.waitForRequest(request => request.url().endsWith('/api/trips/visual-trip') && request.method() === 'PUT');
  await workspace.getByRole('button', { name: 'Save trip to account' }).click();
  const saved = (await requestPromise).postDataJSON() as AccountTrip;
  expect(saved.days[1].note).toBe('Tver riverside walk');
  expect(saved.days[1].walkingSections).toHaveLength(1);
  await expect(workspace.getByRole('link', { name: 'Open account trip' })).toBeVisible();

  await workspace.getByRole('button', { name: 'New trip' }).click();
  await expect(workspace.getByRole('heading', { name: 'Travel planner' })).toBeVisible();
  await page.reload();
  await workspace.getByText('Recent trip drafts', { exact: true }).click();
  await workspace.getByRole('button', { name: draft.title }).click();
  await workspace.locator('button[data-trip-day="2"]').click();
  await expect(map.locator('[title="Tver bridge"]')).toBeInViewport();
});

async function tripFixture(page: Page, source = draft): Promise<AccountTrip> {
  return page.evaluate(async draftFixture => {
    const modulePath = '/src/features/journeys/api/tripDraft.ts';
    const { tripPayload } = await import(modulePath);
    return tripPayload(draftFixture, draftFixture.title);
  }, source);
}
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
      { json: owner } :
      { status: 401, json: {} }));
    await page.goto('/start/tours', { waitUntil: 'domcontentloaded' });
    const trip = await tripFixture(page);
    await page.route('**/api/trips/**', route => {
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
    if (mode === 'shared') {
      await expect(workspace.getByRole('button', { name: 'Rename places' })).toHaveCount(0);
      expect(tripRequests).toEqual([]);
    }
  });
}

test('planner opens a selected day beside the same map and supports mobile planning', async ({ page }, testInfo) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER_V2 !== 'true', 'Requires the new planner');
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, json: {} }));
  await page.route('**/api/journeys/routes/road', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/start/tours', { waitUntil: 'domcontentloaded' });
  const workspace = page.locator('.trip-exp[data-mode="planner"]');
  await expect(workspace.getByRole('heading', { name: 'Travel planner' })).toBeVisible();
  await expect(workspace.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 25_000 });
  await expect(workspace.locator('.leaflet-tile:not(.leaflet-tile-loaded)')).toHaveCount(0, { timeout: 25_000 });
  await page.screenshot({ path: testInfo.outputPath('planner-empty-desktop.png'), animations: 'disabled', fullPage: true });
  const plannerDraft: LocalTripDraft = { ...draft, days: { ...draft.days, 2: { ...draft.days[2],
    visits: [{ id: 'second-tver-stop', city: 'Volga embankment',
      stops: [{ id: 'volga-start', label: 'Volga start', latitude: 56.86, longitude: 35.91, zone: 'Europe/Moscow', stayMinutes: 0 },
        { id: 'volga-finish', label: 'Volga finish', latitude: 56.862, longitude: 35.912, zone: 'Europe/Moscow', stayMinutes: 0 }],
      importedWalk: { title: 'Volga walking route', legs: [{
        mode: 'foot', distanceMeters: 300, durationSeconds: 200, coordinates: [[35.91, 56.86], [35.912, 56.862]],
      }] },
    }],
  } } };
  await page.evaluate(source => localStorage.setItem('codoc/trip-planner/draft/v2', JSON.stringify(source)), plannerDraft);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(workspace.getByRole('heading', { name: draft.title })).toBeVisible();
  await expect(workspace.getByRole('button', { name: /Plan walk in Journey/ })).toBeVisible();
  await expect(workspace.locator('.trip-day-program')).toHaveCount(0);
  const map = workspace.locator('.route-map');
  await expect(map).toHaveCount(1);
  const element = await map.elementHandle();
  await workspace.getByRole('button', { name: 'City list', exact: true }).click();
  const cities = workspace.getByRole('table', { name: 'City list' });
  await expect(cities.getByRole('row')).toHaveCount(7);
  await cities.getByRole('button', { name: 'Tver', exact: true }).click();
  await expect(workspace.getByRole('heading', { name: 'Tver' })).toBeVisible();
  await workspace.locator('button[data-trip-day="overview"]').click();
  await expect(workspace.locator('.trip-summary[data-compact]')).toBeVisible();
  const dayWidths = await workspace.locator('.trip-summary .trip-day-timeline-item').evaluateAll(
    days => days.map(day => day.getBoundingClientRect().width),
  );
  expect(Math.max(...dayWidths)).toBeLessThanOrEqual(160);
  expect(new Set(dayWidths).size).toBe(1);
  const dayTab = await workspace.locator('button[data-trip-day="2"]').boundingBox();
  expect(dayTab?.width).toBeLessThanOrEqual(128);
  await expect(workspace.locator('.trip-planner-overview')).toBeHidden();
  await workspace.locator('.trip-summary').getByRole('button', { name: 'Tver', exact: true }).click();
  await expect(map.locator('[data-focused]')).toHaveCount(1);
  await workspace.locator('button[data-trip-day="2"]').click();
  await expect(map.locator('.leaflet-marker-icon[title="Volga finish"]')).toHaveCount(1);
  await workspace.locator('button[data-trip-day="3"]').click();
  await expect(map.locator('.leaflet-marker-icon[title="Volga finish"]')).toHaveCount(0);
  await workspace.locator('button[data-trip-day="2"]').click();
  await expect(map.locator('.leaflet-marker-icon[title="Volga finish"]')).toHaveCount(1);
  expect(await element?.evaluate(node => node.isConnected)).toBe(true);
  await workspace.locator('button[data-trip-day="1"]').click();
  await expect(map.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 25_000 });
  await page.screenshot({ path: testInfo.outputPath('planner-desktop.png'), animations: 'disabled', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(workspace.getByRole('heading', { name: 'Moscow' })).toBeInViewport();
  await expect(map).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('planner-desktop-1280.png'), animations: 'disabled', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(workspace.getByRole('heading', { name: draft.title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('planner-mobile.png'), animations: 'disabled', fullPage: true });
  await workspace.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(map).toBeVisible();
});

test('renames one saved place without rewriting the rest of the account trip', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/api/auth/refresh', route => route.fulfill({ json: owner }));
  await page.goto('/start/tours', { waitUntil: 'domcontentloaded' });
  const original = await tripFixture(page, {
    ...draft, budget: { amount: 42000, currency: 'RUB' },
    documents: [{ id: 'ticket', title: 'Private ticket', url: 'https://example.test/ticket' }],
    days: { ...draft.days, 1: { ...draft.days[1],
      lodging: { name: 'Station hotel', address: 'Station Square', checkIn: '2027-05-03', checkOut: '2027-05-04' },
      importedWalk: { title: 'Old station walk', legs: [{
        mode: 'foot', durationSeconds: 240, distanceMeters: 420, coordinates: [[37.62, 55.75], [37.626, 55.751]],
      }] },
    }, 2: { ...draft.days[2], transfer: {
      from: 'Moscow', to: 'Tver', transport: 'CAR', bookingUrl: 'https://example.test/reservation',
      departure: '2027-05-04T10:00:00+03:00', arrival: '2027-05-04T12:30:00+03:00',
      road: { geometry: [{ latitude: 55.75, longitude: 37.62 }, { latitude: 56.86, longitude: 35.91 }],
        distanceMeters: 175000, durationSeconds: 9000 },
    } } },
  });
  const expected = structuredClone(original);
  expect(original.legs[0]).toMatchObject({ bookingUrl: 'https://example.test/reservation' });
  expect(original.days[0].walkingSections).toHaveLength(1);
  expected.days[0].segments.find(segment => segment.title === 'Theatre Square')!.title = 'Theatre Square, east entrance';
  let saved = original;
  const writes: AccountTrip[] = [];
  await page.route('**/api/trips/visual-trip', route => {
    if (route.request().method() === 'PUT') {
      saved = route.request().postDataJSON() as AccountTrip;
      writes.push(saved);
    }
    return route.fulfill({ json: saved });
  });
  await page.goto('/trip/visual-trip', { waitUntil: 'domcontentloaded' });
  const workspace = page.locator('.trip-exp');
  await workspace.getByRole('button', { name: 'Rename places' }).click();
  await workspace.locator('.trip-exp-itinerary').getByRole('button', { name: 'Theatre Square', exact: true }).click();
  await workspace.getByLabel('Place name').fill('Theatre Square, east entrance');
  await workspace.getByRole('button', { name: 'Apply', exact: true }).click();
  await workspace.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(workspace.getByLabel('Place name')).toHaveValue('Theatre Square');
  await workspace.getByRole('button', { name: 'Redo', exact: true }).click();
  await workspace.getByRole('button', { name: 'Save trip to account' }).click();
  await expect(workspace.getByRole('status')).toHaveText('Trip saved to account.');
  expect(writes).toEqual([expected]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(workspace.locator('.trip-exp-itinerary').getByRole('button', { name: 'Theatre Square, east entrance' })).toBeVisible();
  await expect(workspace.getByText('Station hotel', { exact: true })).toBeVisible();
});
