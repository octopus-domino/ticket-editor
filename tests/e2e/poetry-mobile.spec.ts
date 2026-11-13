import { test, expect } from '@playwright/test';
test.describe.configure({timeout:60000});

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

test('poetry on a phone uses the selected local region and keeps age, mood and language explicit', async ({ browser }) => {
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
    await page.screenshot({ path: '../ticket-infra/reports/poetry-mobile-region.png', fullPage: true });
  } finally { await context.close(); }
});
