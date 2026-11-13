import { test, expect, type BrowserContext } from '@playwright/test';

test('two phones contribute to one album; organiser reorders while contributors edit only their own captions', async ({ browser }) => {
  test.setTimeout(60000);
  const id = 'Album1234567', ownerKey = 'o'.repeat(64), inviteKey = 'i'.repeat(64);
  const albumDocument = { id, kind: 'ALBUM', title: 'Birthday memories', data: { description: 'Made together', locale: 'en' }, updatedAt: '2026-11-12T12:00:00Z' };
  const photos: { id: string; caption: string; contributor: string; image: string; editKey: string }[] = [];
  let revision = 0;
  const owner = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mock = async (context: BrowserContext, manager: boolean) => {
    await context.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method();
      if (!path.startsWith('/api/')) return route.continue();
      const state = () => ({ revision, canManage: manager, photos: photos.map(({ id, caption, contributor }) => ({ id, caption, contributor })) });
      if (path === '/api/auth/refresh') return route.fulfill(manager ? { json: { accessToken: 'test', user: { id: 'owner', name: 'Owner', email: 'owner@example.test' } } } : { status: 401, json: {} });
      if (path.startsWith('/api/journeys/fonts/')) return route.fulfill({ path: `../ticket-pdf/src/main/resources/fonts/${path.endsWith('handwriting-zh') ? 'ZhiMangXing-Regular.ttf' : 'MarckScript-Regular.ttf'}`, contentType: 'font/ttf' });
      if (path === `/api/journeys/${id}` || path === `/api/journeys/${id}/manage`) return route.fulfill({ json: albumDocument });
      if (path.endsWith('/status')) return route.fulfill({ json: { state: 'ACTIVE', usedAt: null, validUntil: '', consumable: false } });
      if (path.endsWith('/responses')) return route.fulfill({ json: [] });
      if (path === `/api/journeys/${id}/album`) return route.fulfill({ json: state() });
      if (path.endsWith('/album/invitation')) return route.fulfill({ json: { key: inviteKey } });
      if (path.endsWith('/album/photos') && method === 'POST') {
        expect(route.request().headers()['x-contribution-key']).toBe(inviteKey);
        const photoId = String(photos.length + 1), editKey = `${photoId}${'e'.repeat(63)}`;
        photos.push({ ...route.request().postDataJSON(), id: photoId, editKey }); revision++;
        return route.fulfill({ json: { album: state(), photoId, editKey } });
      }
      if (path.endsWith('/album/order')) {
        expect(manager).toBe(true); const input = route.request().postDataJSON(); expect(input.revision).toBe(revision);
        const ordered = input.ids.map((id: string) => photos.find(photo => photo.id === id)!); photos.splice(0, photos.length, ...ordered); revision++;
        return route.fulfill({ json: state() });
      }
      const photo = photos.find(photo => path.endsWith(`/album/photos/${photo.id}`));
      if (photo && method === 'GET') return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from(photo.image.split(',')[1], 'base64') });
      if (photo && method === 'PUT') {
        if (!manager) expect(route.request().headers()['x-photo-edit-key']).toBe(photo.editKey);
        Object.assign(photo, route.request().postDataJSON()); revision++;
        return route.fulfill({ json: state() });
      }
      return route.fulfill({ status: 401, json: {} });
    });
  };
  try {
    await mock(owner, true); await mock(guest, false);
    const organiser = await owner.newPage(), contributor = await guest.newPage();
    await organiser.goto(`/manage/${id}#key=${ownerKey}`);
    const ownerPanel = organiser.locator('.album-panel');
    await ownerPanel.getByText('Invite contributors', { exact: true }).tap();
    await ownerPanel.getByRole('button', { name: 'Get the contributor link', exact: true }).tap();
    await expect(ownerPanel.getByLabel('Link for adding photos')).toHaveValue(new RegExp(`#contribute=${inviteKey}$`));
    await contributor.goto(`/d/${id}#contribute=${inviteKey}`);
    const guestPanel = contributor.locator('.album-panel');
    await guestPanel.getByLabel('Your name (optional)').fill('Anna');
    await guestPanel.getByLabel('Photo caption', { exact: true }).fill('С любовью, от друзей');
    await guestPanel.getByLabel('Add photos', { exact: true }).setInputFiles('public/backgrounds/thumbs/sage-paper.jpg');
    await expect(guestPanel.locator('.album-photos > li')).toHaveCount(1);
    await ownerPanel.getByRole('button', { name: 'Refresh album', exact: true }).tap();
    await ownerPanel.getByLabel('Photo caption', { exact: true }).fill('Another lovely memory');
    await ownerPanel.getByLabel('Add photos', { exact: true }).setInputFiles('public/backgrounds/thumbs/sage-paper.jpg');
    await expect(ownerPanel.locator('.album-photos > li')).toHaveCount(2);
    await ownerPanel.getByRole('button', { name: 'Move photo earlier', exact: true }).nth(1).tap();
    await expect(ownerPanel.locator('.album-photos > li').first()).toContainText('Another lovely memory');
    await guestPanel.getByRole('button', { name: 'Refresh album', exact: true }).tap();
    await expect(guestPanel.locator('.album-photos > li')).toHaveCount(2);
    await expect(guestPanel.locator('.album-photos > li').first().getByRole('button', { name: 'Edit caption', exact: true })).toHaveCount(0);
    const ownPhoto = guestPanel.locator('[data-photo-id="1"]');
    await contributor.bringToFront();
    await ownPhoto.getByRole('button', { name: 'Edit caption', exact: true }).tap();
    await contributor.screenshot({ path: '../ticket-infra/reports/shared-album-edit-review.png', fullPage: true });
    await expect(ownPhoto.getByLabel('Photo caption', { exact: true })).toBeVisible({ timeout: 5000 });
    await ownPhoto.getByLabel('Photo caption', { exact: true }).fill('С днём рождения!');
    await ownPhoto.getByRole('button', { name: 'Save caption', exact: true }).tap();
    await expect(ownPhoto.locator('.album-caption')).toHaveText('С днём рождения!');
    expect(await contributor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ownerPanel.getByRole('button', { name: 'Refresh album', exact: true }).tap();
    await ownerPanel.screenshot({ path: '../ticket-infra/reports/shared-album-mobile.png' });
  } finally { await owner.close(); await guest.close(); }
});
