import { test, expect, type Page } from '@playwright/test';

async function openEditor(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('codoc:language', 'en');
    localStorage.setItem('ticket-editor:offline-doc', JSON.stringify({ version: '2.0', activeId: 'S1', data: [], slides: [{
      id: 'S1', name: 'Cells', width: 600, height: 700, format: 'custom', orientation: 'portrait',
      padding: { top: 0, left: 0, right: 0, bottom: 0 }, background: '#fff', elements: [{
        id: 'table', type: 'table', x: 80, y: 160, width: 400, height: 140, rotation: 0,
        rows: 2, cols: 2, columnWidths: [100, 300], rowHeights: [40, 100],
        data: [['First', 'Second'], ['Third', 'Fourth']], fontSize: 16, borderColor: '#333', headerBg: '#eee',
      }],
    }] }));
  });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh') return route.fulfill({ json: {
      accessToken: 'test', user: { id: 'owner', name: 'Tester', email: 'test@example.test' },
    } });
    return route.fulfill({ json: [] });
  });
  await page.goto('/app/editor/local');
  await expect(page.locator('.stage-wrap')).toBeVisible();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('.konvajs-content')).toHaveCSS('width', '600px');
}

test('cell editor matches unequal cells, Tab navigates and multiline content grows the row', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await openEditor(page);
  const stage = page.locator('.konvajs-content');
  const bounds = (await stage.boundingBox())!;
  const zoom = bounds.width / 600;
  await stage.dblclick({ position: { x: 110 * zoom, y: 180 * zoom } });
  const first = page.getByRole('textbox', { name: 'Table cell 1, 1', exact: true });
  await expect(first).toBeFocused();
  const box = (await first.boundingBox())!;
  expect(box.x).toBeCloseTo(bounds.x + 80 * zoom, 0);
  expect(box.y).toBeCloseTo(bounds.y + 160 * zoom, 0);
  expect(box.width).toBeCloseTo(100 * zoom, 0);
  expect(box.height).toBeCloseTo(40 * zoom, 0);
  await first.fill('One');
  await first.press('Control+Enter');
  await page.keyboard.insertText('Two');
  await first.press('Control+Enter');
  await page.keyboard.insertText('Three');
  await expect(first).toHaveValue('One\nTwo\nThree');
  expect((await first.boundingBox())!.height).toBeGreaterThan(box.height);
  await first.press('Tab');
  const second = page.getByRole('textbox', { name: 'Table cell 1, 2', exact: true });
  await expect(second).toBeFocused();
  expect((await second.boundingBox())!.width).toBeCloseTo(300 * zoom, 0);
  await second.press('Shift+Tab');
  await expect(first).toBeFocused();
  await first.press('Escape');
  await expect(first).toHaveCount(0);
});

test('tools can be dragged from both compact toolbar and library drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await openEditor(page);
  const stage = page.locator('.konvajs-content');
  await page.locator('.canvas-dock').getByRole('button', { name: 'Text', exact: true }).dragTo(stage,
    { targetPosition: { x: 210, y: 100 } });
  await stage.dblclick({ position: { x: 210, y: 100 } });
  await expect(page.locator('.inline-editor')).toBeVisible();
  expect((await page.locator('.inline-editor').boundingBox())!.height).toBeGreaterThan(25);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tool library', exact: true }).click();
  const tile = page.locator('.left-panel .tool-tile').filter({ hasText: 'Table' }).first();
  await expect(tile).toBeVisible();
  await tile.scrollIntoViewIfNeeded();
  const source = (await tile.boundingBox())!;
  const target = (await stage.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 12, source.y + source.height / 2, { steps: 3 });
  await expect(page.locator('body')).toHaveClass(/canvas-tool-dragging/);
  await page.mouse.move(target.x + 500, target.y + 420, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.left-panel')).not.toBeVisible();
  await stage.dblclick({ position: { x: 500, y: 420 } });
  await expect(page.locator('textarea[aria-label^="Table cell"]')).toBeVisible();
});
