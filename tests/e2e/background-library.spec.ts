import { test, expect } from '@playwright/test';
import { BACKGROUND_CATALOG } from '../../src/shared/backgrounds/catalog';
import { readFile } from 'node:fs/promises';

test('all 60 lightweight previews have real dimensions and nine localized names', async ({ page }) => {
  await page.goto('/solutions/');
  const images = await page.evaluate(async () => {
    const catalog = await (await fetch('/backgrounds/catalog.json')).json() as { id: string; names: Record<string,string> }[];
    const results = [];
    for (const item of catalog) {
      const image = new Image(); image.src = `/backgrounds/thumbs/${item.id}.jpg`; await image.decode();
      results.push({ id: item.id, width: image.naturalWidth, height: image.naturalHeight, names: Object.keys(item.names) });
    }
    return results;
  });
  expect(images).toHaveLength(60);
  for (const image of images) { expect(image.width).toBe(240); expect(image.height).toBe(240); expect(image.names).toHaveLength(9); }
});

test('a phone can select a business background in each application language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', route => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/')) return route.continue();
    return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  const background = BACKGROUND_CATALOG.find(item => item.id === 'corporate-blue')!;
  for (const language of ['ru','en','zh','pl','it','es','nl','fr','de']) {
    await page.addInitScript(locale => localStorage.setItem('codoc:language', locale), language);
    await page.goto('/sites/new');
    const library = page.locator('.background-library');
    await library.locator('summary').click();
    await library.locator('select').selectOption('business');
    const choice = library.getByRole('button', { name: background.names[language], exact: true });
    await choice.click(); await expect(choice).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: '../reports/background-library-mobile.png' });
});

test('selected lossless artwork survives the native document export at the original resolution', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('codoc:language','en');
    localStorage.setItem('ticket-editor:offline-doc', JSON.stringify({ version:'2.0', activeId:'page', data:[], slides:[{
      id:'page', name:'Page', width:794, height:1123, format:'a4', orientation:'portrait', padding:{ top:20,right:20,bottom:20,left:20 }, background:'#ffffff', elements:[],
    }] }));
  });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken:'test',user:{id:'owner',name:'Owner',email:'owner@example.test'} } });
    return route.fulfill({json:[]});
  });
  await page.goto('/app/editor/local');
  await page.getByRole('button',{name:'Tool library',exact:true}).click();
  await page.locator('.section-head').filter({ hasText: 'Images' }).click();
  const library = page.locator('.background-library'); await library.locator('summary').click();
  await library.getByRole('button',{name:'Sage paper',exact:true}).click();
  await expect(library.getByRole('button',{name:'Sage paper',exact:true})).toHaveAttribute('aria-pressed','true');
  const downloading = page.waitForEvent('download');
  await page.locator('.toolbar').getByRole('button',{name:/JSON/}).click();
  const path = await (await downloading).path();
  const exported = JSON.parse(await readFile(path!, 'utf8')) as { slides:{ backgroundImage:string }[] };
  expect(exported.slides[0].backgroundImage).toMatch(/^data:image\/png;base64,/);
  const identical = await page.evaluate(async (png) => {
    const pixels = async (source:string) => {
      const image = new Image(); image.src=source; await image.decode();
      const canvas=document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
      const context=canvas.getContext('2d')!; context.drawImage(image,0,0);
      return { width:canvas.width, height:canvas.height, data:context.getImageData(0,0,canvas.width,canvas.height).data };
    };
    const expected=await pixels('/backgrounds/lossless/sage-paper.webp'), actual=await pixels(png);
    return actual.width===expected.width && actual.height===expected.height && actual.width>1000 && actual.data.every((value,index)=>value===expected.data[index]);
  }, exported.slides[0].backgroundImage);
  expect(identical).toBe(true);
});
