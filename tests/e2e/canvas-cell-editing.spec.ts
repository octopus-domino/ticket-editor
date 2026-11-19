import { test, expect, type Page } from '@playwright/test';

async function openEditor(page: Page, rich = false) {
  await page.addInitScript((rich) => {
    localStorage.setItem('codoc:language', 'en');
    localStorage.setItem('ticket-editor:offline-doc', JSON.stringify({ version: '2.0', activeId: 'S1', data: [], slides: [{
      id: 'S1', name: 'Cells', width: 600, height: 700, format: 'custom', orientation: 'portrait',
      padding: { top: 0, left: 0, right: 0, bottom: 0 }, background: '#fff', elements: [{
        id: 'table', type: 'table', x: 80, y: 160, width: 400, height: 140, rotation: 0,
        rows: 2, cols: 2, columnWidths: [100, 300], rowHeights: [40, 100],
        data: [['First', 'Second'], ['Third', 'Fourth']], fontSize: 16, borderColor: '#333', headerBg: '#eee',
      }],
    }] }));
    if (rich) {
      const document = JSON.parse(localStorage.getItem('ticket-editor:offline-doc')!);
      document.slides[0].elements = [{ id: 'rich', type: 'text', x: 60, y: 360, width: 440, height: 260,
        rotation: 0, text: 'Above table', richText: true, fontSize: 16, fontFamily: 'Arial', fontStyle: 'normal',
        textDecoration: '', fill: '#111', background: 'transparent', align: 'left', verticalAlign: 'top', lineHeight: 1.3,
        padding: { top: 10, right: 12, bottom: 8, left: 18 },
        html: '<p>Above table</p><table data-editor-width="410"><colgroup><col width="100"><col width="310"></colgroup><tbody>'
          + '<tr><th colspan="2"><p>Merged header</p></th></tr>'
          + '<tr><td><p><strong>First</strong></p></td><td><p>Second</p></td></tr>'
          + '<tr><td><p>Third</p></td><td><p>Fourth</p></td></tr></tbody></table>',
      }];
      localStorage.setItem('ticket-editor:offline-doc', JSON.stringify(document));
    }
  }, rich);
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

async function paintedCell(page: Page, id: string, index: number, rich: boolean) {
  return page.evaluate(async ({ id, index, rich }) => {
    const module = '/node_modules/.vite/deps/konva.js';
    const { default: Konva } = await import(module);
    const stage = Konva.stages.find((stage: any) => stage.container().isConnected);
    const group = stage.findOne('#' + id);
    const cells = group.find(rich ? '.rich-table-cell' : '.table-cell');
    const cell = cells[index];
    const bounds = cell.getClientRect({ skipStroke: true, skipShadow: true });
    const root = stage.container().getBoundingClientRect();
    return { x: root.left + bounds.x, y: root.top + bounds.y, width: bounds.width, height: bounds.height };
  }, { id, index, rich });
}

async function expectCellBounds(input: ReturnType<Page['locator']>, cell: Awaited<ReturnType<typeof paintedCell>>) {
  const bounds = (await input.boundingBox())!;
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(bounds[key]).toBeCloseTo(cell[key], 0);
}

test('rich text table opens just the clicked cell after a paragraph, with merged cells, zoom and scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openEditor(page, true);
  await page.locator('.zoom-bar').getByRole('button', { name: '+', exact: true }).click();
  await page.locator('.canvas-area').evaluate(node => node.scrollTop = 180);
  const cell = await paintedCell(page, 'rich', 1, true);
  await page.mouse.dblclick(cell.x + cell.width / 2, cell.y + cell.height / 2);
  const input = page.getByRole('textbox', { name: 'Rich table cell 1, 2', exact: true });
  await expect(input).toBeFocused();
  await expectCellBounds(page.locator('.canvas-cell-editor'), cell);
  await expect(page.locator('.rt-toolbar')).toHaveCount(0);
  await input.press('Control+End');
  await input.press('Control+Enter');
  await page.keyboard.insertText('New line');
  await expect(input).toContainText('New line');
  await expect.poll(async () => (await paintedCell(page, 'rich', 1, true)).height).toBeGreaterThan(cell.height);
  await expectCellBounds(page.locator('.canvas-cell-editor'), await paintedCell(page, 'rich', 1, true));
  await input.press('Tab');
  const next = page.getByRole('textbox', { name: 'Rich table cell 1, 3', exact: true });
  await expect(next).toBeFocused();
  await expectCellBounds(page.locator('.canvas-cell-editor'), await paintedCell(page, 'rich', 2, true));
  await next.press('Shift+Tab');
  await expect(input).toBeFocused();
  await input.press('Escape');
  const merged = await paintedCell(page, 'rich', 0, true);
  await page.mouse.dblclick(merged.x + merged.width / 2, merged.y + merged.height / 2);
  await expect(page.getByRole('textbox', { name: 'Rich table cell 1, 1', exact: true })).toBeFocused();
  await expectCellBounds(page.locator('.canvas-cell-editor'), merged);
});

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

test('standalone cell bounds remain exact after zooming and scrolling while it is being edited', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openEditor(page);
  await page.locator('.zoom-bar').getByRole('button', { name: '+', exact: true }).click();
  await page.locator('.zoom-bar').getByRole('button', { name: '+', exact: true }).click();
  let cell = await paintedCell(page, 'table', 1, false);
  await page.mouse.dblclick(cell.x + cell.width / 2, cell.y + cell.height / 2);
  const input = page.getByRole('textbox', { name: 'Table cell 1, 2', exact: true });
  await expect(input).toBeFocused();
  await expectCellBounds(input, cell);
  await page.locator('.canvas-area').evaluate(node => node.scrollTop += 90);
  cell = await paintedCell(page, 'table', 1, false);
  await expectCellBounds(input, cell);
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

test('manual zoom from buttons and Ctrl-wheel survives viewport resize without a canvas click', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openEditor(page);
  const stage = page.locator('.konvajs-content');
  await page.locator('.zoom-bar').getByRole('button', { name: '+', exact: true }).click();
  await expect(stage).toHaveCSS('width', '660px');
  await page.setViewportSize({ width: 1300, height: 768 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(stage).toHaveCSS('width', '660px');
  const area = (await page.locator('.canvas-area').boundingBox())!;
  await page.mouse.move(area.x + 300, area.y + 160);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await expect(stage).toHaveCSS('width', '690px');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(stage).toHaveCSS('width', '690px');
});

test('dropped simple and rich text remain visible and selected when a data set is active', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openEditor(page);
  await page.evaluate(async () => {
    const path = '/src/features/data-models/state/ModelStore.ts';
    const { modelStore } = await import(path);
    modelStore.setState((state: any) => ({ ...state, models: [{ id: 'data', name: 'Data', schemaId: 'S', values: {} }], selectedId: 'data' }));
  });
  await page.getByRole('button', { name: 'Tool library', exact: true }).click();
  for (const label of ['Text', 'Rich']) {
    const tile = page.locator('.left-panel .tool-tile').filter({ hasText: label }).first();
    await tile.dragTo(page.locator('.konvajs-content'), { targetPosition: { x: 240, y: label === 'Text' ? 100 : 400 } });
    const result = await page.evaluate(async () => {
      const path = '/node_modules/.vite/deps/konva.js';
      const { default: Konva } = await import(path);
      const stage = Konva.stages.find((stage: any) => stage.container().isConnected);
      const transformer = stage.findOne('Transformer');
      const selected = transformer.nodes()[0];
      return { selected: selected?.id(), texts: selected?.find('Text').map((node: any) => node.text()) ?? [] };
    });
    expect(result.selected).toBeTruthy();
    expect(result.texts.join('')).toContain('Enter text');
  }
});
