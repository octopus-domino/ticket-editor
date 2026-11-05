import { test, expect } from '@playwright/test';
test('client edits and reopens their profile', async ({page}) => {
 let profile={id:'owner',name:'Tester',email:'test@example.test',organization:'',position:'',phone:'',avatar:''};
 await page.route('**/api/**', route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith('/api/'))return route.continue();
  if(path==='/api/auth/refresh')return route.fulfill({json:{accessToken:'test',user:profile}});
  if(path==='/api/profile'){
   if(route.request().method()==='PUT')profile={...profile,...route.request().postDataJSON()};
   return route.fulfill({json:profile});
  }
  return route.fulfill({json:[]});
 });
 await page.goto('/app/profile');
 await page.locator('input[maxlength="100"]').first().fill('Client Name');
 await page.locator('input[maxlength="200"]').fill('Studio');
 await page.locator('input[type="tel"]').fill('+7 999 123-45-67');
 await page.locator('button[type="submit"]').click();
 await expect(page.getByRole('status')).toBeVisible();
 await page.reload();
 await expect(page.locator('input[maxlength="200"]')).toHaveValue('Studio');
 await expect(page.locator('input[type="email"]')).toHaveAttribute('readonly','');
 await expect(page.locator('.workspace-username')).toHaveText('Client Name');
});
