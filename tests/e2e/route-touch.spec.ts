import { test, expect } from '@playwright/test';

for (const input of ['mouse', 'touch'] as const) test(`route stops reorder using ${input} with scrolling`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('https://tiles.openfreemap.org/**', route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#edf2e8' } }] } }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/journeys/artwork') return route.fulfill({ json: { pages: [{ width: 794, height: 1123, svg: '<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"/>' }] } });
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  try {
    await page.goto('/start/tours');
    const stops = page.locator('.route-stops > li');
    await stops.nth(0).getByLabel('Notes for this stop (optional)').fill('First point note');
    await stops.nth(1).getByLabel('Notes for this stop (optional)').fill('Second point note');
    const handle = stops.nth(1).locator('.route-reorder-handle');
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const endY = await handle.evaluate(element => {
      let scroller: HTMLElement | null = element.closest('ol');
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
      return Math.max(0, scroller?.getBoundingClientRect().top ?? 0) + 25;
    });
    const cdp = await context.newCDPSession(page);
    if (input === 'touch') {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: endY }] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, endY, { steps: 10 });
    }
    await expect(stops.nth(0)).toHaveAttribute('data-drop-target', 'true', { timeout: 10000 });
    if (input === 'touch') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
    await expect(stops.nth(0).getByLabel('Notes for this stop (optional)')).toHaveValue('Second point note');
    await expect(stops.nth(1).getByLabel('Notes for this stop (optional)')).toHaveValue('First point note');
    await page.screenshot({ path: `../reports/route-reorder-${input}.png` });
  } finally { await context.close(); }
});
