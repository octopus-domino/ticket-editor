import { test,expect } from '@playwright/test';

test('library conflict preserves the server version and installing adds independent styles',async({page})=>{
  test.setTimeout(60000);
  await page.addInitScript(()=>localStorage.setItem('codoc:language','en'));
  const saved={id:'shared',name:'Company',revision:2,role:'owner',items:[{id:'blue',name:'Blue',kind:'brand',payload:{id:'blue',name:'Blue',fills:[{id:'fill',type:'solid',color:'#123456'}],strokes:[]}}]};
  let writeCount=0;
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;if(!path.startsWith('/api/'))return route.continue();
    if(path==='/api/auth/refresh')return route.fulfill({json:{accessToken:'test',user:{id:'owner',email:'owner@example.test',name:'Owner'}}});
    if(path==='/api/libraries/shared'&&route.request().method()==='PUT'){writeCount++;return route.fulfill({status:409,json:{error:'Library changed on another device; reload before saving'}});}
    if(path==='/api/libraries/shared')return route.fulfill({json:saved});
    if(path==='/api/libraries')return route.fulfill({json:[saved]});
    return route.fulfill({json:[]});
  });
  await page.goto('/app/libraries');await page.getByRole('combobox',{name:'Library',exact:true}).selectOption('shared');
  await page.getByLabel('Name',{exact:true}).fill('Brand');await page.getByRole('button',{name:'Add brand palette',exact:true}).click();
  await page.getByRole('button',{name:'Save library',exact:true}).click();await expect(page.getByRole('alert')).toContainText('another device');expect(writeCount).toBe(1);
  await page.getByRole('button',{name:'Reload library',exact:true}).click();await expect(page.getByRole('button',{name:'Save library',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Install local copies',exact:true}).click();await expect(page.getByRole('status')).toContainText('Copies added');
  const graphics=await page.evaluate(()=>JSON.parse(localStorage.getItem('ticket-editor:graphics:v1')!) as {styles:{id:string;name:string}[]});expect(graphics.styles).toHaveLength(1);expect(graphics.styles[0].name).toBe('Blue');expect(graphics.styles[0].id).not.toBe('blue');
});
