import { expect, test } from '@playwright/test';
import { join } from 'node:path';

test('returns a ready Journey walk to its trip day and restores it after reload', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER !== 'true', 'Requires the trip planner flag');
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('https://tiles.openfreemap.org/**', route => route.fulfill({
    json: { version: 8, sources: {}, layers: [{ id: 'base', type: 'background' }] },
  }));
  await page.route('**/private-journey/?*', route => route.fulfill({
    contentType: 'text/html',
    body: `<button id="send">Return ready walk</button><script>
      document.getElementById('send').onclick=()=>parent.postMessage({
        type:'private-walk:complete',channel:new URLSearchParams(location.search).get('channel'),
        walk:{version:1,title:'River walk',points:[{lat:59.9,lng:30.3,name:'Pier'},
          {lat:59.91,lng:30.31,name:'Bridge'}],route:{legs:[{fromIndex:0,toIndex:1,
          geometry:[[59.9,30.3],[59.91,30.31]],distanceMeters:1500,durationSeconds:900}]}}
      },location.origin);
      </script>`,
  }));
  const accountWrites: { id: string; days: { date: string; walkingSections: unknown[] }[] }[] = [];
  await page.route('**/api/trips/*', route => {
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as typeof accountWrites[number];
    accountWrites.push(body);
    return route.fulfill({ json: body });
  });
  await page.route('**/api/journeys/routes/places/trains', route => route.fulfill({
    json: { available: true, stale: false, trains: [{
      number: '002', title: 'Express', from: 'Petersburg', to: 'Moscow',
      departure: '2027-01-01T10:00:00+03:00', arrival: '2027-01-01T14:00:00+03:00',
    }] },
  }));
  await page.route('**/api/journeys/routes/places/trains/places?*', route => route.fulfill({
    json: new URL(route.request().url()).searchParams.get('q') === 'Petersburg'
      ? [{ code: 'c2', title: 'Petersburg', region: 'Russia' }] : [{ code: 'c213', title: 'Moscow', region: 'Russia' }],
  }));
  await page.goto('/start/tours');
  const open = page.getByRole('button', { name: 'Travel planner', exact: true });
  await open.click();
  await expect(page.locator('.journey-form-panel')).toHaveCount(0);
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await planner.getByLabel('Trip name').fill('Winter trip');
  await expect(planner.getByRole('button', { name: 'Build walking route' })).toHaveCount(0);
  await expect(planner.getByRole('button', { name: 'Find ideas on the map' })).toHaveCount(0);
  await planner.getByLabel('Start date').fill('2026-12-31');
  await planner.getByLabel('End date').fill('2027-01-01');
  await planner.getByRole('button', { name: 'Next day' }).click();
  await planner.getByRole('button', { name: 'Plan walk in Journey' }).click();
  await page.frameLocator('iframe[src^="/private-journey/"]').getByRole('button', { name: 'Return ready walk' }).click();
  await planner.getByRole('button', { name: 'Use this walk' }).click();
  await expect(planner.getByText('Pier', { exact: true })).toBeVisible();
  await planner.getByText('Train timetable', { exact: true }).click();
  await planner.getByLabel('Departure city or station').fill('Petersburg');
  await planner.getByRole('button', { name: 'Petersburg · Russia' }).click();
  await planner.getByLabel('Arrival city or station').fill('Moscow');
  await planner.getByRole('button', { name: 'Moscow · Russia' }).click();
  await planner.getByRole('button', { name: /^Search/ }).click();
  await planner.getByRole('button', { name: 'Select', exact: true }).click();
  expect(accountWrites).toHaveLength(0);
  await planner.getByRole('button', { name: 'Save trip to account' }).click();
  const link = planner.getByRole('link', { name: 'Open account trip' });
  await expect(link).toBeVisible();
  expect(accountWrites).toHaveLength(1);
  expect(accountWrites[0].days[0].date).toBe('2027-01-01');
  expect(accountWrites[0].days[0].walkingSections).toHaveLength(1);
  await page.reload();
  await open.click();
  await expect(planner.getByText('Pier', { exact: true })).toHaveCount(0);
  await planner.getByRole('button', { name: 'Next day' }).click();
  await expect(planner.getByText('Pier', { exact: true })).toBeVisible();
  await planner.getByRole('button', { name: 'Share', exact: true }).click();
  const share = planner.getByRole('textbox', { name: 'Trip link' });
  await expect(share).toHaveValue(/\/trip\/view\?data=/);
  await page.goto(await share.inputValue());
  await expect(page.getByRole('heading', { name: 'Winter trip' })).toBeVisible();
  await expect(page.getByText('Pier', { exact: true })).toBeVisible();
  await expect(page.getByText('002 Express', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save trip to account' })).toHaveCount(0);
  expect(accountWrites).toHaveLength(1);
});

test('receives the finished walk from the built Journey application', async ({ page }) => {
  const journey = process.env.TRIP_JOURNEY_DIST;
  test.skip(!journey || process.env.VITE_ENABLE_TRIP_PLANNER !== 'true', 'Requires the Journey build and trip planner flag');
  test.setTimeout(60_000);
  if (process.env.TRIP_MOBILE_VIEWPORT === 'true') await page.setViewportSize({ width: 390, height: 844 });
  const first = { id: 'first', name: 'Первый дом', lat: 59.94, lng: 30.27, source: 'manual',
    categoryIds: ['historical-house'], facts: [], details: {} };
  const second = { ...first, id: 'second', name: 'Второй дом', lng: 30.29 };
  const geometry = [[first.lat, first.lng], [second.lat, second.lng]];
  const route = { geometry, legs: [{ fromIndex: 0, toIndex: 1, geometry, distanceMeters: 1200, durationSeconds: 900 }],
    totalDistanceMeters: 1200, totalDurationSeconds: 900 };
  const draft = { id: 'walk_test', title: 'Сохранённая прогулка', createdAt: '2026-11-17T00:00:00Z',
    updatedAt: '2026-11-17T00:00:00Z', area: { anchors: [], radiusMeters: 800 }, selectedCategoryIds: [],
    selectedPoiIds: ['first', 'second'], view: 'map', savedPois: [first, second], savedRoute: route,
    savedFailedSegments: [] };
  await page.addInitScript(value => {
    localStorage.setItem('codoc:language', 'en');
    if (location.pathname !== '/private-journey/') return;
    localStorage.setItem('private-walks/drafts/v1', JSON.stringify([value]));
    const url = new URL(location.href);
    url.searchParams.set('draft', value.id);
    history.replaceState(null, '', url);
  }, draft);
  await page.route('**/private-journey/**', request => {
    const path = new URL(request.request().url()).pathname;
    if (path === '/private-journey/') return request.fulfill({ path: join(journey!, 'index.html') });
    const match = /^\/private-journey\/assets\/([\w.-]+)$/.exec(path);
    return match ? request.fulfill({ path: join(journey!, 'assets', match[1]) }) : request.fallback();
  });
  await page.route('**/api/journeys/**', request => request.fulfill({ json: { available: true, places: [] } }));
  await page.route('**/*.tile.openstreetmap.org/**', request => request.abort());
  await page.route('https://tiles.openfreemap.org/**', request => request.fulfill({
    json: { version: 8, sources: {}, layers: [{ id: 'base', type: 'background' }] },
  }));
  await page.goto('/start/tours');
  await page.getByRole('button', { name: 'Travel planner', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await planner.getByLabel('Start date').fill('2026-12-31');
  await planner.getByLabel('End date').fill('2027-01-01');
  await planner.getByRole('button', { name: 'Next day' }).click();
  await planner.getByRole('button', { name: 'Plan walk in Journey' }).click();
  await expect.poll(async () => (await page.locator('dialog.private-walk-overlay iframe').boundingBox())?.height ?? 0)
    .toBeGreaterThan((page.viewportSize()?.height ?? 600) * .65);
  const frame = page.frameLocator('iframe[src^="/private-journey/"]');
  await expect(frame.getByRole('textbox', { name: 'Название прогулки' })).toHaveValue(draft.title);
  const routePanel = frame.getByRole('button', { name: /📍 Маршрут/ });
  if (await routePanel.isVisible()) await routePanel.click();
  await frame.getByRole('button', { name: 'Включить в общий маршрут' }).click();
  await frame.getByRole('button', { name: 'Добавить в путешествие CoDoc' }).click();
  await planner.getByRole('button', { name: 'Use this walk' }).click();
  await expect(planner.getByText(first.name, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2')!).days['2']
    .importedWalk.legs[0].coordinates)).toEqual([[first.lng, first.lat], [second.lng, second.lat]]);
});

test('plans from address suggestions and selects transport between the chosen cities', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER !== 'true', 'Requires the trip planner flag');
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/journeys/routes/addresses?**', request => {
    const query = new URL(request.request().url()).searchParams.get('q');
    return request.fulfill({ json: query === 'Mos'
      ? [{ label: 'Moscow', latitude: 55.75, longitude: 37.62 }]
      : [{ label: 'Tver', latitude: 56.86, longitude: 35.91 }] });
  });
  await page.goto('/start/tours');
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await expect(planner).toBeVisible();
  await expect(page.locator('.journey-form-panel')).toHaveCount(0);
  await planner.getByRole('button', { name: 'City list' }).click();
  const city = planner.getByRole('combobox', { name: 'City', exact: true });
  await city.fill('Mos');
  await planner.getByRole('listbox').getByRole('button', { name: 'Moscow' }).click();
  await planner.getByRole('button', { name: 'Add city', exact: true }).click();
  await city.fill('Tve');
  await planner.getByRole('listbox').getByRole('button', { name: 'Tver' }).click();
  await planner.getByLabel('Start date').fill('2026-12-31');
  await planner.getByLabel('End date').fill('2027-01-01');
  const connection = planner.getByRole('group', { name: 'Moscow → Tver' });
  await expect(connection.getByRole('button', { name: 'Car' })).toHaveAttribute('aria-pressed', 'true');
  await connection.getByRole('button', { name: 'Flight' }).click();
  await expect(connection.getByRole('button', { name: 'Flight' })).toHaveAttribute('aria-pressed', 'true');
  await expect(planner.getByText(/Estimated flight time/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'), planner.getByRole('button', { name: 'Export Word' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('trip-2026-12-31.docx');
  expect(await download.failure()).toBeNull();
  await planner.getByRole('button', { name: 'Enter transfer manually' }).click();
  const types = planner.getByRole('group', { name: 'Transport type' });
  await types.getByRole('button', { name: 'Car' }).click();
  await expect(types.getByRole('button', { name: 'Car' })).toHaveAttribute('aria-pressed', 'true');
  await expect(planner.getByRole('group', { name: 'Departure' }).getByLabel('City')).toHaveValue('Moscow');
  await expect(planner.getByRole('group', { name: 'Arrival' }).getByLabel('City')).toHaveValue('Tver');
});
