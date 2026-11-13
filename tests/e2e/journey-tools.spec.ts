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
    if (url.pathname === '/api/journeys/routes/places') return route.fulfill({ json: { available: false, places: [] } });
    if (url.pathname === '/api/journeys/routes/road') return route.fulfill({ json: {
      coordinates: [[13.4, 52.5], [13.41, 52.48], [13.4, 52.4]], durationSeconds: 600, distanceMeters: 12000,
    } });
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

test('a phone chooses a route point on the map when address search is unavailable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  let searches = 0;
  await page.route('**/api/journeys/routes/addresses?*', route => { searches++; return route.fulfill({ status: 503, json: {} }); });
  await page.goto('/start/tours');
  const stops = page.locator('.route-stops > li');
  await stops.first().getByRole('button', { name: 'Choose on map', exact: true }).click();
  await page.getByLabel('Point name (optional)').fill('Meeting by the river');
  const map = page.getByLabel('Route map', { exact: true });
  await expect(map.locator('canvas')).toBeVisible();
  await map.locator('canvas').click({ position: { x: 110, y: 70 } });
  await expect(page.getByRole('button', { name: 'Confirm point', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm point', exact: true }).click();
  await expect(stops.first().getByRole('combobox', { name: 'Address', exact: true })).toHaveValue('Meeting by the river');
  expect(searches).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a separate walking map keeps numbered photos and the city plan out of the main route', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockApi(page);
  const media = new Map<string, string>();
  await page.route('**/api/journeys/media**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      const id = (media.size + 1).toString(16).padStart(64, '0');
      media.set(id, route.request().postDataJSON().image);
      return route.fulfill({ json: { id } });
    }
    const image = media.get(path.split('/').at(-1)!);
    if (!image) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from(image.split(',')[1], 'base64') });
  });
  await page.route('**/api/journeys/routes/places?*', route => route.fulfill({ json: { available: true, source: 'OpenStreetMap', places: [
    { id: 'museum', label: 'City Museum', longitude: 13.41, latitude: 52.501, url: 'https://www.openstreetmap.org/node/1', photoReference: 'File:Museum.jpg' },
    { id: 'tower', label: 'Town Tower', longitude: 13.412, latitude: 52.502, url: 'https://www.openstreetmap.org/node/2', photoReference: 'File:Tower.jpg' },
  ] } }));
  await page.route('https://commons.wikimedia.org/w/api.php?*', route => route.fulfill({ json: { query: { pages: [{ imageinfo: [{
    thumburl: 'https://upload.wikimedia.org/museum.jpg', mime: 'image/jpeg', extmetadata: {
      Artist: { value: '<a>Photo Author</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    },
  }] }] } } }));
  await page.route('https://upload.wikimedia.org/museum.jpg', route => route.fulfill({ path: 'public/backgrounds/thumbs/sage-paper.jpg', contentType: 'image/jpeg' }));
  await page.goto('/start/tours');
  const stops = page.locator('.route-stops > li');
  await stops.nth(1).getByRole('combobox', { name: 'Address', exact: true }).fill('Museum Berlin');
  await page.getByRole('option', { name: 'Berlin Museum' }).getByRole('button').click();
  const panel = stops.nth(1).locator('.route-place-panel');
  await panel.locator(':scope > summary').click();
  await panel.getByRole('button', { name: 'Generate a walking map' }).click();
  await expect(panel.locator('.route-walk-print')).toBeVisible({ timeout: 30000 });
  expect(state.snapshot.photos).toHaveLength(2);
  expect(state.snapshot.stops).toHaveLength(4);
  expect(state.snapshot.legs.every((leg: any) => leg.mode === 'foot')).toBe(true);
  expect(state.snapshot.photos.map((photo: any) => state.snapshot.stops.findIndex((stop: any) => stop.id === photo.stopId) + 1)).toEqual([2, 3]);
  await expect(stops).toHaveCount(2);
  const mapImage = media.get(state.snapshot.mapId)!;
  const size = await page.evaluate(async image => {
    const bitmap = await createImageBitmap(await (await fetch(image)).blob());
    const size = [bitmap.width, bitmap.height]; bitmap.close(); return size;
  }, mapImage);
  expect(size).toEqual([2200, 1800]);
  await panel.getByText('Photo credits', { exact: true }).click();
  await expect(panel.locator('.route-photo-credits')).toContainText('2. Photo Author');
  await page.screenshot({ path: '../ticket-infra/reports/walking-map-collage-mobile.png', fullPage: true });
});

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
  await page.getByLabel('Часовой пояс', { exact: true }).nth(1).selectOption('Asia/Dubai');
  await page.getByLabel('Как добраться до следующей остановки').selectOption('flight');
  await page.getByLabel('Вылет, местное время').fill('2026-12-12T10:00');
  await page.getByLabel('Прилёт, местное время').fill('2026-12-12T16:00');
  await page.getByRole('button', { name: 'Рассчитать время выезда к рейсу' }).click();
  await expect(page.locator('.route-timeline')).toContainText('Регистрация и досмотр');
  await expect(page.locator('.route-timeline')).toContainText('Europe/Berlin → Asia/Dubai');
  await page.getByRole('button', { name: '\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442' }).click();
  await expect(page.locator('.journey-artwork-page svg')).toBeVisible();
  await expect.poll(() => state.image, { timeout: 20000 }).toMatch(/^data:image/);
  const dimensions = await page.evaluate(async (image) => {
    const bitmap = await createImageBitmap(await (await fetch(image)).blob());
    const size = [bitmap.width, bitmap.height];
    bitmap.close();
    return size;
  }, state.image);
  expect(dimensions).toEqual([2400, 1500]);
  expect(state.snapshot.timeline.map((row: any) => row.kind)).toContain('flight');
  expect(state.snapshot.stops[0].zone).toBe('Europe/Berlin');
  await page.getByRole('button', { name: 'Получить ссылку и PDF' }).click();
  await expect(
    page.getByRole('heading', { name: 'Готово. Теперь можно поделиться.' }),
  ).toBeVisible();
  expect(state.document.data.route).toBe('b'.repeat(64));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('route edits keep notes with their point and require selecting an edited address', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/start/tours');
  const stops = page.locator('.route-stops > li');
  await stops.nth(0).getByRole('combobox', { name: 'Address', exact: true }).fill('Museum Berlin');
  await page.getByRole('option', { name: 'Berlin Museum' }).getByRole('button').click();
  await stops.nth(0).getByLabel('Notes for this stop (optional)').fill('Meet by the main entrance');
  await stops.nth(1).getByRole('combobox', { name: 'Address', exact: true }).fill('Airport Berlin');
  await page.getByRole('option', { name: 'Berlin Airport' }).getByRole('button').click();
  await stops.nth(0).getByRole('button', { name: /Move stop/ }).press('ArrowDown');
  await expect(stops.nth(0)).toContainText('Departure point');
  await expect(stops.nth(0).getByRole('combobox', { name: 'Address', exact: true })).toHaveValue('Berlin Airport');
  await expect(stops.nth(1).getByLabel('Notes for this stop (optional)')).toHaveValue('Meet by the main entrance');
  const address = stops.nth(0).getByRole('combobox', { name: 'Address', exact: true });
  await address.fill('Unconfirmed location');
  await expect(address).toHaveAttribute('aria-invalid', 'true');
  await address.press('Escape');
  await expect(address).toHaveValue('Berlin Airport');
  await expect(address).toHaveAttribute('aria-invalid', 'false');
  await expect(stops.nth(0).locator('.route-place-panel')).toHaveCount(0);
  await stops.nth(1).locator('.route-place-panel > summary').click();
  await stops.nth(1).getByText('Hotels', {exact:true}).click();
  await stops.nth(1).getByRole('button', { name: 'Find nearby places' }).click();
  await expect(stops.nth(1)).toContainText('require the administrator to connect 2GIS');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('solutions dropdown remains inside a narrow phone viewport', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await mockApi(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/travel-itineraries/');
  await page.locator('.solutions-menu > summary').click();
  const menu = page.locator('.solutions-menu-panel');
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: '../reports/route-solutions-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});

test('nearby visits create a daytime plan and enter the route only when requested', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await mockApi(page);
  await page.route('**/api/journeys/routes/places?*', route => route.fulfill({ json: { available: true, places: [{
    id: '12345', label: 'City Gallery', longitude: 13.41, latitude: 52.5, url: 'https://2gis.ru/firm/12345',
    schedule: { Thu: { working_hours: [{ from: '10:00', to: '18:00' }] } },
  }] } }));
  await page.goto('/start/tours');
  const stops = page.locator('.route-stops > li');
  await stops.nth(1).getByRole('combobox', { name: 'Address', exact: true }).fill('Museum Berlin');
  await page.getByRole('option', { name: 'Berlin Museum' }).getByRole('button').click();
  const panel = stops.nth(1).locator('.route-place-panel');
  await panel.locator(':scope > summary').click();
  await panel.getByRole('button', { name: 'Generate a walking map' }).click();
  await expect(panel.locator('.route-walk-print')).toBeVisible();
  await panel.getByText('Plan this day', {exact:true}).first().click();
  await panel.getByRole('checkbox', { name: 'City Gallery' }).check();
  await panel.getByLabel('Visit date').fill('2026-11-12');
  await panel.getByRole('button', { name: 'Plan this day' }).click();
  await expect(panel).toContainText('10:00–11:00 · City Gallery');
  await expect(stops).toHaveCount(2);
  await panel.getByRole('button', { name: 'Add day plan to notes' }).click();
  await expect(stops.nth(1).getByLabel('Notes for this stop (optional)')).toHaveValue('2026-11-12\n10:00–11:00 City Gallery');
  await expect(panel.getByRole('button', { name: 'Add stop', exact: true })).toHaveCount(0);
  await expect(stops).toHaveCount(2);
});

test('themed walks preserve the trip and print seven numbered photographs on a phone',async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('codoc:language','en'));
  const state=await mockApi(page);let searchTheme='',photoRequests=0;
  await page.route('**/api/journeys/routes/places/themed?*',route=>{
    searchTheme=new URL(route.request().url()).searchParams.get('theme')??'';
    const places=Array.from({length:7},(_,i)=>({id:i===0?'wikimapia-123':`node-${i}`,label:i===0?'Legend courtyard':`Quiet place ${i}`,
      longitude:13.4002+i*.0003,latitude:52.5002+i*.0003,url:i===0?'https://wikimapia.org/123':`https://www.openstreetmap.org/node/${i}`,
      source:i===0?'wikimapia':'osm',inOsm:i!==0,description:'A local story about this place.',visitStatus:i===1?'CLOSED':'UNKNOWN',
      meta:{source:i===0?'wikimapia':'osm',theme:'mystic',in_osm:String(i!==0),visit_status:i===1?'CLOSED':'UNKNOWN'}}));
    return route.fulfill({json:{available:true,source:'OpenStreetMap / Wikimapia',places}});
  });
  await page.route('**/api/journeys/routes/places/themed/enrich?*',route=>{
    photoRequests++;const points=route.request().postDataJSON() as {id:string}[];
    return route.fulfill({json:points.map(point=>({stopId:point.id,imageId:'c'.repeat(64),sourceUrl:'https://commons.wikimedia.org/wiki/File:Fixture.jpg',
      author:'Fixture photographer',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'}))});
  });
  await page.route('**/api/journeys/media/*',route=>{
    if(new URL(route.request().url()).pathname.endsWith('c'.repeat(64)))return route.fulfill({path:'public/backgrounds/thumbs/sage-paper.jpg',contentType:'image/jpeg'});
    if(!state.image)return route.fulfill({status:404});
    return route.fulfill({contentType:'image/jpeg',body:Buffer.from(state.image.split(',')[1],'base64')});
  });
  await page.route('**/api/journeys/routes/road',route=>{
    const input=route.request().postDataJSON();return route.fulfill({json:{coordinates:[[input.start.longitude,input.start.latitude],[input.end.longitude,input.end.latitude]],durationSeconds:60,distanceMeters:100}});
  });
  await page.goto('/start/tours');const stops=page.locator('.route-stops > li');
  await stops.nth(1).getByRole('combobox',{name:'Address',exact:true}).fill('Museum Berlin');
  await page.getByRole('option',{name:'Berlin Museum'}).getByRole('button').click();
  const panel=stops.nth(1).locator('.route-place-panel');await panel.locator(':scope > summary').click();
  await panel.getByLabel('Walk theme',{exact:true}).selectOption('mystic');
  await expect(stops.first().locator('.route-place-panel')).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Create walk from selected places',exact:true})).toHaveCount(0);
  await panel.getByRole('button',{name:'Generate a walking map',exact:true}).click();
  await expect(panel).toContainText('Community place');await expect(panel).toContainText('Closed according to OSM');
  await expect(panel.getByRole('checkbox',{name:'Quiet place 1',exact:true})).toBeChecked();
  await expect(panel.locator('.route-walk-print')).toBeVisible({timeout:30000});
  expect(searchTheme).toBe('mystic');expect(photoRequests).toBe(1);expect(state.snapshot.photos).toHaveLength(7);expect(state.snapshot.stops).toHaveLength(9);
  expect(state.snapshot.stops[1].meta.theme).toBe('mystic');expect(state.snapshot.stops[1].meta.photo_image_id).toBe('c'.repeat(64));
  await expect(stops).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'../ticket-infra/reports/themed-walk-mobile.png',fullPage:true});
});
