import type { Page } from '@playwright/test';

export async function openToolbarDetails(page: Page) {
  const menu = page.locator('details.toolbar-more');
  if ((await menu.getAttribute('open')) === null) await menu.locator('summary').click();
  return menu;
}
