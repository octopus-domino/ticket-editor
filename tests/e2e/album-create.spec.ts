import {test,expect} from '@playwright/test';

test('phone creates an album and immediately adds a caption and photograph',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('codoc:language','en'));
  const id='Album1234567',key='o'.repeat(64);
  const photos:{id:string;caption:string;contributor:string}[]=[];
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(!path.startsWith('/api/'))return route.continue();
    if(path==='/api/journeys'&&route.request().method()==='POST')return route.fulfill({json:[{document:{id,kind:'ALBUM',title:'Friends',data:{},updatedAt:new Date().toISOString()},managementKey:key}]});
    if(path.endsWith('/album/photos')&&route.request().method()==='POST'){
      const data=route.request().postDataJSON();photos.push({id:'1',caption:data.caption,contributor:data.contributor});
      return route.fulfill({json:{album:{revision:1,canManage:true,photos},photoId:'1',editKey:'e'.repeat(64)}});
    }
    if(path.endsWith('/album'))return route.fulfill({json:{revision:photos.length,canManage:true,photos}});
    if(path.endsWith('/album/invitation'))return route.fulfill({json:{key:'i'.repeat(64)}});
    if(path.includes('/fonts/'))return route.fulfill({path:'../ticket-pdf/src/main/resources/fonts/MarckScript-Regular.ttf',contentType:'font/ttf'});
    return route.fulfill({status:401,json:{}});
  });
  await page.goto('/start/albums');
  await page.getByRole('textbox',{name:/^title$/i}).fill('Friends');
  await page.getByRole('button',{name:'Create',exact:true}).click();
  await expect(page.getByLabel('Add photos',{exact:true})).toBeVisible();
  await page.getByLabel('Photo caption',{exact:true}).fill('С любовью от друзей');
  await page.getByLabel('Add photos',{exact:true}).setInputFiles('public/backgrounds/thumbs/sage-paper.jpg');
  await expect(page.locator('.album-photos > li')).toHaveCount(1);
  await expect(page.locator('.album-caption')).toHaveText('С любовью от друзей');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
