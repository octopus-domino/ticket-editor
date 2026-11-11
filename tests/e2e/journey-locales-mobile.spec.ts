import {test,expect} from '@playwright/test';

const messages={
 ru:['Этот адрес уже занят. Выберите другой.','Этот адрес доступен.'],
 en:['This address is already taken. Choose another.','This address is available.'],
 zh:['该地址已被占用。选择另一个。','该地址可用。'],
 pl:['Ten adres jest już zajęty. Wybierz inny.','Ten adres jest dostępny.'],
 it:['Questo indirizzo è già occupato. Scegline un altro.','questo indirizzo è disponibile.'],
 es:['Esta dirección ya está ocupada. Elige otro.','Esta dirección está disponible.'],
 nl:['Dit adres is al in gebruik. Kies een andere.','Dit adres is beschikbaar.'],
 fr:['Cette adresse est déjà utilisée. Choisissez-en une autre.','Cette adresse est disponible.'],
 de:['Diese Adresse ist bereits vergeben. Wählen Sie ein anderes.','Diese Adresse ist verfügbar.'],
};
for(const [language,[taken,available]]of Object.entries(messages))test(`${language}: inline address validation on a 320px phone`,async({page})=>{
 await page.setViewportSize({width:320,height:740});
 await page.addInitScript(value=>localStorage.setItem('codoc:language',value),language);
 let creates=0;
 await page.route('**/api/**',route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();if(url.pathname==='/api/journey-sites/availability')return route.fulfill({json:{status:url.searchParams.get('slug')==='taken-address'?'taken':'available'}});if(route.request().method()==='POST'&&url.pathname==='/api/journey-sites')creates++;return route.fulfill({status:401,json:{error:'Unauthorized'}});});
 await page.goto('/sites/new');
 await page.locator('input[placeholder="my-event"]').fill('taken-address');
 await expect(page.locator('#site-address-status')).toHaveText(taken);
 await expect(page.locator('form button[type="submit"]')).toBeDisabled();
 expect(creates).toBe(0);
 await page.locator('input[placeholder="my-event"]').fill('free-address');
 await expect(page.locator('#site-address-status')).toHaveText(available);
 await expect(page.locator('form button[type="submit"]')).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.language-switcher select')).toHaveValue(language);
});

test('changing language keeps the unfinished site form',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('codoc:language'))localStorage.setItem('codoc:language','en');});
 await page.route('**/api/journey-sites/availability?**',route=>route.fulfill({json:{status:'available'}}));
 await page.goto('/sites/new');
 await page.locator('input[maxlength="120"]').fill('My personal site');
 await page.locator('input[placeholder="my-event"]').fill('personal-site');
 await page.locator('.language-switcher select').selectOption('de');
 await expect(page.locator('.language-switcher select')).toHaveValue('de');
 await expect(page.locator('input[maxlength="120"]')).toHaveValue('My personal site');
 await expect(page.locator('input[placeholder="my-event"]')).toHaveValue('personal-site');
});

test('changing language translates untouched preset fields and keeps authored text', async ({ page }) => {
 await page.addInitScript(() => { if (!localStorage.getItem('codoc:language')) localStorage.setItem('codoc:language', 'ru'); });
 await page.route('**/api/journey-sites/availability?**', route => route.fulfill({ json: { status: 'available' } }));
 await page.goto('/sites/new');
 await page.locator('input[maxlength="120"]').fill('Our own event');
 const fields = page.locator('.journey-builder-field input:not([type="checkbox"])');
 expect(await fields.first().inputValue()).toMatch(/[А-Яа-я]/);
 await page.locator('.language-switcher select').selectOption('en');
 await expect(page.locator('.language-switcher select')).toHaveValue('en');
 await expect(page.locator('input[maxlength="120"]')).toHaveValue('Our own event');
 for (const field of await fields.all()) expect(await field.inputValue()).not.toMatch(/[А-Яа-я]/);
});
