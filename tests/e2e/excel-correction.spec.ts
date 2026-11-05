import { test,expect } from '@playwright/test';
test('invalid Excel values can be corrected before saving and preserve the source record ID',async({page})=>{
  const schema={id:'S',name:'Amounts',fields:[{path:'amount',type:'number',required:true}],createdAt:'',updatedAt:''};let imported:Record<string,unknown>|undefined;
  await page.addInitScript(()=>localStorage.setItem('codoc:language','en'));
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;if(!path.startsWith('/api/'))return route.continue();
    if(path==='/api/auth/refresh')return route.fulfill({json:{accessToken:'test',user:{id:'owner',email:'owner@example.test',name:'Owner'}}});
    if(path==='/api/schemas')return route.fulfill({json:[schema]});
    if(path==='/api/data-models/import'){imported=route.request().postDataJSON() as Record<string,unknown>;return route.fulfill({json:{imported:1,issues:[]}});}
    return route.fulfill({json:[]});
  });
  await page.goto('/app/data-models?schemaId=S');await page.getByTitle('Import Excel or JSON',{exact:true}).click();
  const bytes=await page.evaluate(async schema=>{const path='/src/features/data-models/api/ExcelModelIO.ts';const {createWorkbook}=await import(path);return Array.from(createWorkbook(schema,[{id:'M',schemaId:'S',name:'Original',values:{amount:'bad-number'},createdAt:'',updatedAt:''}])) as number[];},schema);
  await page.locator('.dm-importer input[type=file]').setInputFiles({name:'amounts.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
  const submit=page.locator('.dm-importer .schema-btn-submit');await expect(submit).toBeDisabled();expect(imported).toBeUndefined();
  await page.getByText('Review and correct a row',{exact:true}).click();await page.locator('.dm-importer .mv-field input').fill('123.45');await expect(submit).toBeEnabled();await submit.click();
  await expect(page.locator('.dm-importer')).toHaveCount(0);expect(imported).toMatchObject({schemaId:'S',items:[{id:'M',name:'Original',values:{amount:'123.45'}}]});
});
