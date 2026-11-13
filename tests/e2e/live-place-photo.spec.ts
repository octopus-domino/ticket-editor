import { test, expect } from '@playwright/test';

test('live Wikidata and Commons photo resolves with licence and decodes on a phone', async ({ page }) => {
  test.skip(process.env.LIVE_EXTERNAL !== '1', 'Explicit network audit; public providers are not a deterministic CI dependency.');
  const network: string[] = [];
  page.on('response', response => { if (/wikimedia|wikidata/.test(response.url())) network.push(`${new URL(response.url()).hostname}: ${response.status()}`); });
  page.on('requestfailed', request => { if (/wikimedia|wikidata/.test(request.url())) network.push(`${new URL(request.url()).hostname}: ${request.failure()?.errorText}`); });
  page.on('response', async response => {
    if (response.url().startsWith('https://commons.wikimedia.org/w/api.php')) {
      const json = await response.json().catch(() => ({}));
      network.push(JSON.stringify(json.query?.pages?.[0]?.imageinfo?.[0] ?? json.error ?? {}));
    }
  });
  await page.route('**/api/journeys/media', async route => {
    const image = route.request().postDataJSON().image;
    expect(image).toMatch(/^data:image\/jpeg;base64,/);
    expect(image.length).toBeLessThan(180000);
    await route.fulfill({ json: { id: 'a'.repeat(64) } });
  });
  await page.goto('/');
  const photos = await page.evaluate(async () => {
    // Exercise the production resolver and real public metadata/image endpoints.
    const moduleUrl = '/src/features/journeys/api/placePhotos.ts';
    const { placePhotos } = await import(/* @vite-ignore */ moduleUrl);
    return placePhotos([{ id: 'tower', stopId: 'tower', label: 'Eiffel Tower', longitude: 2.2945,
      latitude: 48.8584, url: 'https://www.wikidata.org/wiki/Q243', photoReference: 'Q243' }]);
  });
  expect(photos, network.join('\n')).toHaveLength(1);
  expect(photos[0].author).toBeTruthy();
  expect(photos[0].licenseUrl).toMatch(/^https:\/\/creativecommons.org\//);
  expect(photos[0].sourceUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
});
