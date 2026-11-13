import {test,expect} from '@playwright/test';

for(const width of [1440,390])test(`authoring surfaces use available width at ${width}px`,async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>localStorage.setItem('codoc:language','en'));
  await page.route('**/api/**',route=>{
    if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();
    return route.fulfill({status:401,json:{error:'Unauthorized'}});
  });
  for(const kind of ['invite','certificates','menu','tours','poetry','albums']){
    await page.goto(`/start/${kind}`);
    const main=page.locator('main').first();await expect(main).toBeVisible();
    const box=await main.boundingBox();
    if(width>=1024)expect(box!.width,kind).toBeGreaterThan(width*.85);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),kind).toBe(true);
    if(kind==='tours'){
      const zone=page.getByRole('combobox',{name:'Time zone',exact:true}).first();
      await zone.selectOption('Europe/Berlin');await expect(zone).toHaveValue('Europe/Berlin');
      expect(await zone.locator('option:checked').textContent()).toContain('Europe/Berlin');
    }
  }
});
