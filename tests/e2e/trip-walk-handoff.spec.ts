import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { photoFixtures } from './helpers/handoff-fixture';

test('round-trips a trip with two cities, train, hotel and a Journey walk after a date review', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER_V2 !== 'true', 'Requires the date review in trip planner V2');
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/auth/refresh', route => route.fulfill({
    json: { accessToken: 'test', user: { id: 'trip-owner', name: 'Trip owner', email: 'owner@example.test' } },
  }));
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
  const accountWrites: { id: string; endDate: string; days: { date: string; walkingSections: unknown[] }[];
    accommodations: { name: string; checkIn: string; checkOut: string }[] }[] = [];
  await page.route('**/api/trips/*', route => {
    if (route.request().method() === 'GET' && accountWrites.length) return route.fulfill({ json: accountWrites.at(-1) });
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
  await page.goto('/start/tours?planner=v2');
  await expect(page.locator('.journey-form-panel')).toHaveCount(0);
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await planner.getByLabel('Trip name').fill('Winter trip');
  await expect(planner.getByRole('button', { name: 'Build walking route' })).toHaveCount(0);
  await expect(planner.getByRole('button', { name: 'Find ideas on the map' })).toHaveCount(0);
  await planner.getByLabel('Start date').fill('2026-12-31');
  await planner.getByLabel('End date').fill('2027-01-01');
  const city = planner.getByRole('combobox', { name: 'City', exact: true });
  await page.route('**/api/journeys/routes/addresses?*', route => route.fulfill({ json: [] }));
  await city.fill('Petersburg');
  await city.press('Enter');
  await planner.getByRole('button', { name: 'Next day' }).click();
  await city.fill('Moscow');
  await city.press('Enter');
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
  await planner.getByText('Trip lodging', { exact: true }).click();
  await planner.getByLabel('Hotel name').fill('Station hotel');
  await planner.getByRole('button', { name: 'Save lodging' }).click();
  await planner.getByLabel('End date').fill('2027-01-02');
  const review = planner.locator('.trip-date-review');
  await expect(review).toContainText('Station hotel');
  await expect(review).toContainText('Express');
  await review.getByRole('button', { name: 'Apply' }).click();
  expect(accountWrites).toHaveLength(0);
  await planner.getByRole('button', { name: 'Save trip to account' }).click();
  const link = planner.getByRole('link', { name: 'Open account trip' });
  await expect(link).toBeVisible();
  expect(accountWrites).toHaveLength(1);
  expect(accountWrites[0].endDate).toBe('2027-01-02');
  const arrivalDay = accountWrites[0].days.find(day => day.date === '2027-01-01');
  expect(arrivalDay?.walkingSections).toHaveLength(1);
  expect(accountWrites[0].accommodations).toContainEqual(expect.objectContaining({
    name: 'Station hotel', checkIn: '2027-01-01', checkOut: '2027-01-02',
  }));
  await link.click();
  await expect(page.getByRole('heading', { name: 'Winter trip' })).toBeVisible();
  await page.locator('button[data-trip-day="2"]').click();
  await expect(page.getByText('Station hotel', { exact: true })).toBeVisible();
  await expect(page.getByText('Pier', { exact: true })).toBeVisible();
  await page.goto('/start/tours?planner=v2');
  await page.reload();
  await expect(planner.getByText('Pier', { exact: true })).toHaveCount(0);
  await planner.getByRole('button', { name: 'Next day' }).click();
  await expect(planner.getByText('Pier', { exact: true })).toBeVisible();
  await planner.getByRole('button', { name: 'Share', exact: true }).click();
  const share = planner.getByRole('textbox', { name: 'Trip link' });
  await expect(share).toHaveValue(/\/trip\/view\?data=/);
  await page.goto(await share.inputValue());
  await expect(page.getByRole('heading', { name: 'Winter trip' })).toBeVisible();
  await page.locator('button[data-trip-day="2"]').click();
  await expect(page.getByText('Pier', { exact: true })).toBeVisible();
  await page.getByText('Transfer details', { exact: true }).click();
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
    categoryIds: ['historical-house'], facts: [], details: { photos: ['File:Licensed.jpg'] } };
  const second = { ...first, id: 'second', name: 'Второй дом', lng: 30.29, details: { photos: ['File:Unlicensed.jpg'] } };
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
  await photoFixtures(page);
  await page.route('**/api/auth/refresh', route => route.fulfill({
    json: { accessToken: 'test', user: { id: 'walk-owner', name: 'Walk owner', email: 'owner@example.invalid' } },
  }));
  let saved: unknown;
  await page.route('**/api/routing/v1/trips**', route => {
    if (['POST', 'PUT'].includes(route.request().method())) saved = route.request().postDataJSON();
    return saved ? route.fulfill({ json: saved }) : route.fulfill({ status: 404 });
  });
  await page.route('**/*.tile.openstreetmap.org/**', request => request.abort());
  await page.route('https://tiles.openfreemap.org/**', request => request.fulfill({
    json: { version: 8, sources: {}, layers: [{ id: 'base', type: 'background' }] },
  }));
  await page.goto('/start/tours?planner=v2');
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await planner.getByLabel('Start date').fill('2026-12-31');
  await planner.getByLabel('End date').fill('2027-01-01');
  await planner.getByRole('button', { name: 'Next day' }).click();
  const openJourney = planner.getByRole('button', { name: 'Plan walk in Journey' });
  await openJourney.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.private-walk-overlay')).toHaveCount(0);
  await expect(openJourney).toBeFocused();
  await openJourney.press('Enter');
  await expect.poll(async () => (await page.locator('dialog.private-walk-overlay iframe').boundingBox())?.height ?? 0)
    .toBeGreaterThan((page.viewportSize()?.height ?? 600) * .65);
  const frame = page.frameLocator('iframe[src^="/private-journey/"]');
  await expect(frame.getByRole('textbox', { name: 'Название прогулки' })).toHaveValue(draft.title);
  const routePanel = frame.getByRole('button', { name: /📍 Маршрут/ });
  if (await routePanel.isVisible()) await routePanel.click();
  await frame.getByRole('button', { name: 'Включить в общий маршрут' }).click();
  await frame.getByText('Точки прогулки и заметки', { exact: true }).click();
  await frame.getByRole('textbox', { name: first.name }).fill('Meet by the door');
  await frame.getByRole('button', { name: 'Добавить в путешествие CoDoc' }).click();
  await planner.getByRole('button', { name: 'Use this walk' }).click();
  await expect(planner.getByText(first.name, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2') ?? 'null')
    ?.days['2']?.importedWalk?.legs[0]?.coordinates)).toEqual([[first.lng, first.lat], [second.lng, second.lat]]);
  await planner.getByRole('button', { name: 'Save trip to account' }).click();
  await expect(planner.getByRole('link', { name: 'Open account trip' })).toBeVisible();
  expect(saved).toMatchObject({ days: expect.arrayContaining([expect.objectContaining({
    date: '2027-01-01',
    segments: [expect.objectContaining({ title: first.name, walkId: draft.id, walkNote: 'Meet by the door',
      photoCredits: [expect.objectContaining({ author: 'Fixture photographer', license: 'CC BY-SA 4.0' })] }),
    expect.objectContaining({ title: second.name, photoRefs: [], photoCredits: [] })],
  })]) });
  await planner.getByRole('link', { name: 'Open account trip' }).click();
  const day = page.getByRole('navigation', { name: 'Trip overview' }).getByRole('button', { name: /Jan 1, 2027/ });
  await day.click();
  const firstStop = page.locator('.trip-exp-itinerary').getByRole('button', { name: first.name, exact: true });
  await firstStop.click();
  await expect(page.getByText('Meet by the door', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fixture photographer' })).toBeVisible();
  await page.getByRole('button', { name: 'Rename places' }).click();
  await page.getByLabel('Notes for this stop (optional)').fill('Meet by the courtyard');
  await firstStop.locator('..').getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('button', { name: 'Save trip to account' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Trip saved to account.' })).toBeVisible();
  await page.reload();
  await firstStop.click();
  await expect(page.getByText('Meet by the courtyard', { exact: true })).toBeVisible();
});

test('plans from address suggestions and selects transport between the chosen cities', async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER !== 'true', 'Requires the trip planner flag');
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/journeys/routes/addresses?**', request => {
    const query = new URL(request.request().url()).searchParams.get('q');
    return request.fulfill({ json: query === 'Mos'
      ? [{ label: 'Moscow', latitude: 55.75, longitude: 37.62 }]
      : [{ label: 'Tver', latitude: 56.86, longitude: 35.91 }] });
  });
  await page.route('**/api/journeys/routes/places/trains/places?**', route => {
    const city = new URL(route.request().url()).searchParams.get('q');
    return route.fulfill({ json: [{ title: city, code: city === 'moscow' ? 'c213' : 'c14', region: '' }] });
  });
  await page.route('**/api/journeys/routes/places/trains', route => {
    expect(route.request().postDataJSON()).toMatchObject({ from: 'c213', to: 'c14', date: '2027-01-01' });
    return route.fulfill({ json: { available: true, stale: false, trains: [
      { number: '124', title: 'Direct service', from: 'Moscow', to: 'Tver',
        departure: '2027-01-01T11:30:00+03:00', arrival: '2027-01-01T13:10:00+03:00' },
    ] } });
  });
  await page.route('**/api/journeys/routes/places/hotels', route => route.fulfill({
    json: { available: true, provider: 'OSTROVOK_MCP', catalogOnly: true,
      hotels: [
        { id: 'station', name: 'Hotel near station', latitude: 56.862, longitude: 35.91 },
        { id: 'river', name: 'Hotel near river', latitude: 56.882, longitude: 35.91 },
      ] },
  }));
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/start/tours?planner=v2');
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await expect(planner).toBeVisible();
  await expect(page.locator('.journey-form-panel')).toHaveCount(0);
  await planner.getByRole('button', { name: 'City list' }).click();
  const city = planner.getByRole('combobox', { name: 'City', exact: true });
  await city.fill('Mos');
  await expect(planner.getByRole('listbox').getByRole('button', { name: 'Moscow' })).toBeVisible();
  await planner.getByRole('button', { name: 'Add city', exact: true }).click();
  await expect(city).toHaveValue('Moscow');
  await planner.getByRole('button', { name: 'Next day' }).click();
  await city.fill('Tve');
  await planner.getByRole('listbox').getByRole('button', { name: 'Tver' }).click();
  await planner.getByRole('button', { name: 'Trip map', exact: true }).click();
  const map = planner.locator('.trip-planner-overview .route-map');
  await expect(map.locator('.leaflet-marker-icon')).toHaveCount(2);
  await expect(map.locator('.maplibregl-ctrl-compass')).toHaveCount(0);
  await planner.getByLabel('Start date').fill('2026-12-31');
  await planner.getByLabel('End date').fill('2027-01-01');
  const connection = planner.getByRole('group', { name: 'Moscow → Tver' });
  await expect(connection.getByRole('button', { name: 'Car' })).toHaveAttribute('aria-pressed', 'true');
  const pin = await map.locator('.leaflet-marker-icon').first().elementHandle();
  await connection.getByRole('button', { name: 'Train' }).click();
  const timetable = planner.locator('.trip-connection-timetable');
  await timetable.locator('summary').click();
  await expect(timetable.getByText('124 Direct service')).toBeVisible();
  await expect(timetable.getByText('1 hr 40 min')).toBeVisible();
  await connection.getByRole('button', { name: 'Flight' }).click();
  await expect(connection.getByRole('button', { name: 'Flight' })).toHaveAttribute('aria-pressed', 'true');
  await expect(planner.getByText(/Estimated flight time/)).toBeVisible();
  expect(await pin?.evaluate(node => node.isConnected)).toBe(true);
  await expect(planner.getByRole('button', { name: 'Export Word' })).toHaveCount(0);
  await expect(planner.getByRole('button', { name: 'Measure distance' })).toHaveCount(0);
  await expect(planner.getByRole('button', { name: 'Create a trip template' })).toBeVisible();
  await planner.getByRole('button', { name: 'Enter transfer manually' }).click();
  const types = planner.getByRole('group', { name: 'Transport type' });
  await types.getByRole('button', { name: 'Car' }).click();
  await expect(types.getByRole('button', { name: 'Car' })).toHaveAttribute('aria-pressed', 'true');
  await expect(planner.getByRole('group', { name: 'Departure' }).getByLabel('City')).toHaveValue('Moscow');
  await expect(planner.getByRole('group', { name: 'Arrival' }).getByLabel('City')).toHaveValue('Tver');
  const mapElement = await map.elementHandle();
  await planner.locator('.trip-planner-day').getByRole('button', { name: 'Find hotels', exact: true }).click();
  const hotel = planner.locator('.trip-hotel-list > li').first();
  await expect(hotel).toContainText('Hotel near station');
  await expect(planner.locator('.route-map')).toHaveCount(1);
  await expect(map.locator('.leaflet-marker-icon')).toHaveCount(2);
  expect(await mapElement?.evaluate(node => node.isConnected)).toBe(true);
  await map.getByRole('button', { name: 'Hotel near station' }).click();
  await expect(hotel).toHaveAttribute('data-active', 'true');
  await expect(planner.getByRole('button', { name: 'Hotel near river', exact: true })).toHaveCount(0);
  await planner.getByRole('button', { name: 'Search the whole city' }).click();
  await expect(planner.locator('.trip-hotel-list').getByRole('button', { name: 'Hotel near river' })).toBeVisible();
  await expect(planner.locator('.route-map')).toHaveCount(1);
  await planner.getByRole('button', { name: 'Back', exact: true }).click();
  expect(await mapElement?.evaluate(node => node.isConnected)).toBe(true);
  await planner.getByRole('button', { name: 'Create a trip template' }).click();
  await expect(page).toHaveURL(/\/app\/templates\/[^/]+\/edit/);
  await expect(page.locator('.template-editor-canvas')).toBeVisible();
  await expect(page.locator('.toolbar-actions').getByRole('button', { name: 'Export Word' })).toBeInViewport();
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: 'Export Word' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('document.docx');
  expect(await download.failure()).toBeNull();
});
