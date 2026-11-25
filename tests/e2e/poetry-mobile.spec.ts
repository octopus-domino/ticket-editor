import { test, expect } from '@playwright/test';
test.describe.configure({timeout:60000});

test('an unavailable next collection leaves the previous preview usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  const id = 'a'.repeat(64);
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/journeys/poetry', route => {
    requests.push(route.request().postDataJSON());
    if (requests.length > 1) {
      const error = requests.length === 2 ? 'journey.poetry.sources-unavailable' : 'journey.poetry.not-enough-new';
      return route.fulfill({ status: 503, json: { error } });
    }
    return route.fulfill({ json: { id, bundle: { language: 'en', cards: [] }, weatherSource: '', weatherLicense: '' } });
  });
  await page.route('**/api/journeys/artwork', route => route.fulfill({ json: { pages: [] } }));
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/start/poetry');
  await page.getByRole('button', { name: 'Choose poems for seven days' }).click();
  const preview = page.getByRole('heading', { name: 'Your seven cards' });
  await expect(preview).toBeVisible();
  await page.getByRole('button', { name: 'Choose another seven poems' }).click();
  await expect(page.getByText('The poetry sources are unavailable. Try again a little later.')).toBeVisible();
  expect(requests[1]).toMatchObject({ previousId: id });
  await expect(preview).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save cards and get PDF' })).toBeEnabled();

  await page.getByLabel('Who are these cards for?', { exact: true }).selectOption('teen');
  await page.getByRole('button', { name: 'Choose poems for seven days' }).click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]).toMatchObject({ audience: 'teen', previousId: id, recentIds: [] });
  await expect(page.getByRole('alert')).toHaveText('We could not find seven different verified poems. Try a different mood.');
});

test('poetry can be selected on a phone without location or weather',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let payload:Record<string,unknown>|undefined;
  await context.addInitScript(()=>localStorage.setItem('codoc:language','en'));
  await context.route('**/api/**',route=>{
    if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();
    if(new URL(route.request().url()).pathname==='/api/journeys/poetry'&&route.request().method()==='POST'){
      payload=route.request().postDataJSON();return route.fulfill({status:503,json:{error:'journey.poetry.sources-unavailable'}});
    }
    return route.fulfill({status:401,json:{}});
  });
  try{
    const page=await context.newPage();await page.goto('/start/poetry');
    await page.getByRole('button',{name:'Choose poems for seven days',exact:true}).tap();
    await expect.poll(()=>payload).toBeDefined();
    expect(payload).not.toHaveProperty('latitude');expect(payload).not.toHaveProperty('longitude');
    expect(payload?.zone).toBeTruthy();
    await expect(page.getByRole('button',{name:'Choose poems for seven days',exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await context.close();}
});

test('poetry on a phone uses the selected local region and keeps age, mood and language explicit', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    geolocation: { latitude: 43.1155, longitude: 131.8855 }, permissions: ['geolocation'] });
  let request: Record<string, unknown> | undefined;
  await context.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/journeys/poetry' && route.request().method() === 'POST') {
      request = route.request().postDataJSON();
      return route.fulfill({ status: 503, json: { error: 'journey.poetry.sources-unavailable' } });
    }
    return route.fulfill({ status: 401, json: {} });
  });
  try {
    const page = await context.newPage();
    await page.goto('/start/poetry');
    const form = page.locator('.poetry-wizard');
    await expect(form).toBeVisible();
    await expect(form.getByRole('button', { name: 'Choose poems for seven days', exact: true })).toBeEnabled();
    await form.getByLabel('Poem language', { exact: true }).selectOption('ru');
    await form.getByLabel('Mood', { exact: true }).selectOption('funny');
    await form.getByLabel('Your mood in a few words (optional)').fill('радостный');
    await form.getByLabel('Who are these cards for?', { exact: true }).selectOption('child');
    await form.getByRole('button', { name: 'Use my location', exact: true }).tap();
    await expect(form.getByRole('status')).toHaveText('Your location');
    await form.getByRole('button', { name: 'Choose poems for seven days', exact: true }).tap();
    await expect.poll(() => request).toBeDefined();
    expect(request).toMatchObject({ latitude: 43.12, longitude: 131.89, zone: 'Asia/Vladivostok', language: 'ru', mood: 'funny', audience: 'child', moodText: 'радостный' });
    expect(request).not.toHaveProperty('label');
    await expect(form.getByRole('alert')).toHaveText('The poetry sources are unavailable. Try again a little later.');
    await expect(form.getByRole('button', { name: 'Choose poems for seven days', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('poetry-mobile-region.png'), fullPage: true });
  } finally { await context.close(); }
});
