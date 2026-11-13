import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function guest(page: Page) {
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'Unauthorized' } }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue without registration', exact: true }).click();
}
async function seed(page: Page) {
  return page.evaluate(async () => {
    const apiPath = '/src/shared/api/client.ts',
      factoryPath = '/src/lib/factories.ts';
    const { authFetch } = await import(apiPath),
      { newShape, newSimpleText } = await import(factoryPath);
    const slide = {
      id: 'page',
      name: 'Triangles',
      width: 400,
      height: 300,
      format: 'custom',
      orientation: 'landscape',
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: '#ffffff',
      elements: [
        { ...newShape('triangle', 50, 50), id: 'first', width: 100, height: 90, fill: '#177d6e' },
        { ...newShape('triangle', 230, 80), id: 'second', width: 100, height: 90, fill: '#c4914b' },
        {
          ...newSimpleText(40, 240),
          text: 'Two lines\nare visible',
          fontSize: 15,
          width: 300,
          height: 45,
        },
      ],
    };
    const created = await (
      await authFetch('/api/workspace/documents', {
        method: 'POST',
        body: JSON.stringify({ name: 'Guest triangles', folderId: null }),
      })
    ).json();
    await authFetch(`/api/workspace/documents/${created.id}/content`, {
      method: 'PUT',
      body: JSON.stringify({
        content: JSON.stringify({ version: '2.0', slides: [slide], activeId: 'page', data: [] }),
      }),
    });
    return created.id as string;
  });
}
async function elements(page: Page, id: string) {
  return page.evaluate((id) => {
    const state = JSON.parse(sessionStorage.getItem('codoc:guest:resources')!) as {
      document: { id: string; content: string }[];
    };
    return JSON.parse(state.document.find((d) => d.id === id)!.content).slides[0].elements as {
      id: string;
      x: number;
      y: number;
      shape?: string;
    }[];
  }, id);
}
test('guest triangle drag and context actions persist only in this tab; PowerPoint exports and reimports', async ({
  page,
}) => {
  test.setTimeout(60000);
  const writes: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      path.startsWith('/api/') &&
      !path.startsWith('/api/guest/') &&
      !path.startsWith('/api/auth/') &&
      request.method() !== 'GET'
    )
      writes.push(path);
  });
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible({ timeout: 15000 });
  let bounds = await stage.boundingBox();
  expect(bounds).not.toBeNull();
  const scale = bounds!.width / 400;
  const x = bounds!.x + 100 * scale,
    y = bounds!.y + 110 * scale;
  await page.keyboard.down('Control');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40 * scale, y + 30 * scale, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect
    .poll(async () => {
      const first = (await elements(page, id)).find((e) => e.id === 'first')!;
      return Math.abs(first.x - 90) + Math.abs(first.y - 80);
    })
    .toBeLessThan(3);
  bounds = await stage.boundingBox();
  await page.mouse.click(bounds!.x + 280 * scale, bounds!.y + 140 * scale, { button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menu').getByText('Duplicate', { exact: true }).click();
  await expect.poll(async () => (await elements(page, id)).length).toBe(4);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PowerPoint', exact: true }).click();
  const file = await downloadPromise;
  expect(file.suggestedFilename()).toBe('presentation.pptx');
  const buffer = await readFile((await file.path())!);
  expect(buffer.subarray(0, 2).toString()).toBe('PK');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Import PowerPoint', exact: true }).click();
  await page.locator('.powerpoint-actions input[type=file]').setInputFiles({
    name: 'presentation.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    buffer,
  });
  await page.getByRole('button', { name: 'Add slides', exact: true }).click();
  await expect(page.locator('.slide-thumb')).toHaveCount(2);
  expect(writes).toEqual([]);
  await page.reload();
  await expect(page.locator('.slide-thumb')).toHaveCount(2);
  expect(writes).toEqual([]);
});
test('mobile editor keeps slides horizontal and opens shapes from Tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  await expect(page.locator('.stage-wrap')).toBeVisible();
  const strip = await page.locator('.slides-panel').boundingBox();
  expect(strip!.height).toBeLessThan(100);
  expect(strip!.width).toBeGreaterThan(300);
  const canvas = await page.locator('.canvas-area').boundingBox();
  expect(canvas!.width).toBeGreaterThan(370);
  expect(canvas!.height).toBeGreaterThan(844 * 0.55);
  const dock = await page.locator('.canvas-dock').boundingBox();
  expect(dock!.height).toBeLessThanOrEqual(46);
  await page.getByRole('button', { name: /Tools/ }).click();
  await expect(page.locator('.left-panel')).toBeVisible();
  await expect(page.locator('.left-panel').getByRole('button', { name: /Triangle/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('all library tools accept drops and fullscreen can be exited on a phone', async ({ page }) => {
  test.setTimeout(90_000);
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  const types = [
    'text',
    'simple-text',
    'footer',
    'table',
    'line',
    'line-arrow',
    'rect',
    'roundRect',
    'circle',
    'triangle',
    'star',
    'arc',
    'path',
    'chart-bar',
    'chart-donut',
    'qr',
    'diagram',
  ];
  for (const elementType of types) {
    const count = (await elements(page, id)).length;
    await stage.evaluate((node, elementType) => {
      const transfer = new DataTransfer();
      transfer.setData('application/json', JSON.stringify({ kind: 'new-element', elementType }));
      const rect = node.getBoundingClientRect();
      node.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
          clientX: rect.x + 100,
          clientY: rect.y + 100,
        }),
      );
    }, elementType);
    await expect
      .poll(async () => (await elements(page, id)).length, { message: elementType })
      .toBe(count + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.locator('.editor-shell')).toHaveAttribute('data-canvas-fullscreen', 'true');
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect(page.locator('.editor-shell')).toHaveAttribute('data-canvas-fullscreen', 'false');
});

test('pinching over an element keeps its saved position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  const box = (await stage.boundingBox())!;
  const before = (await elements(page, id)).find((el) => el.id === 'first')!;
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width * 0.24,
    y = box.y + box.height * 0.3;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 12, y: y + 8, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x + 12, y: y + 8, id: 1 },
      { x: x + 70, y: y + 25, id: 2 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 10, y: y + 5, id: 1 },
      { x: x + 90, y: y + 30, id: 2 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(async () => {
      const el = (await elements(page, id)).find((el) => el.id === 'first')!;
      return [el.x, el.y];
    })
    .toEqual([before.x, before.y]);
});

test('visible controls group shapes and open object actions without right click', async ({
  page,
}) => {
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  await page.getByRole('button', { name: 'Select multiple objects', exact: true }).click();
  const box = (await stage.boundingBox())!,
    scale = box.width / 400;
  await page.mouse.click(box.x + 100 * scale, box.y + 110 * scale);
  await page.mouse.click(box.x + 280 * scale, box.y + 140 * scale);
  const dock = page.locator('.canvas-dock');
  await expect(dock.getByRole('button', { name: 'Group', exact: true })).toBeEnabled();
  await dock.getByRole('button', { name: 'Group', exact: true }).click();
  await expect.poll(async () => (await elements(page, id)).length).toBe(4);
  await dock.getByRole('button', { name: 'Object actions', exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
});

test('text formatting toolbar stays outside the edited text', async ({ page }) => {
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  const box = (await stage.boundingBox())!,
    scale = box.width / 400;
  await page.mouse.dblclick(box.x + 140 * scale, box.y + 258 * scale);
  const editor = page.locator('.inline-editor-overlay');
  const toolbar = page.locator('.text-toolbar');
  await expect(editor).toBeVisible();
  await expect(toolbar).toBeVisible();
  const text = (await editor.boundingBox())!,
    bar = (await toolbar.boundingBox())!;
  expect(bar.y + bar.height <= text.y || bar.y >= text.y + text.height).toBe(true);
});

test('canvas recovers a multi-selection drag when mouse release is intercepted', async ({
  page,
}) => {
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  const bounds = (await stage.boundingBox())!;
  const scale = bounds.width / 400;
  await page.getByRole('button', { name: 'Select multiple objects', exact: true }).click();
  await page.mouse.click(bounds.x + 100 * scale, bounds.y + 110 * scale);
  await page.mouse.click(bounds.x + 280 * scale, bounds.y + 140 * scale);
  await page.mouse.move(bounds.x + 100 * scale, bounds.y + 110 * scale);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 130 * scale, bounds.y + 125 * scale, { steps: 10 });
  await page.evaluate(() =>
    document.addEventListener('mouseup', (event) => event.stopPropagation(), { once: true }),
  );
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const konva = (window as unknown as { Konva: { stages: import('konva').default.Stage[] } })
          .Konva;
        const active = konva.stages.find((item) => item.container().isConnected)!;
        return ['first', 'second'].map((key) => {
          const node = active.findOne(`#${key}`)!;
          return [node.isListening(), node.getLayer()?.name()];
        });
      }),
    )
    .toEqual([
      [true, 'elements-layer'],
      [true, 'elements-layer'],
    ]);
});

test('selection survives repeated dragging, grouping, resize and right-click', async ({ page }) => {
  test.setTimeout(90_000);
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  const bounds = (await stage.boundingBox())!,
    scale = bounds.width / 400;
  await page.getByRole('button', { name: 'Select multiple objects', exact: true }).click();
  await page.mouse.click(bounds.x + 100 * scale, bounds.y + 110 * scale);
  await page.mouse.click(bounds.x + 280 * scale, bounds.y + 140 * scale);
  const dock = page.locator('.canvas-dock');
  await expect(dock.getByRole('button', { name: 'Group', exact: true })).toBeEnabled();
  await page.mouse.move(bounds.x + 100 * scale, bounds.y + 110 * scale);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 140 * scale, bounds.y + 130 * scale, { steps: 14 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const items = await elements(page, id);
      const first = items.find((el) => el.id === 'first')!,
        second = items.find((el) => el.id === 'second')!;
      return [
        Math.round(second.x - first.x),
        Math.round(second.y - first.y),
        first.x > 50,
        first.y > 50,
      ];
    })
    .toEqual([180, 30, true, true]);
  await expect(dock.getByRole('button', { name: 'Group', exact: true })).toBeEnabled();
  await dock.getByRole('button', { name: 'Group', exact: true }).click();
  await expect.poll(async () => (await elements(page, id)).length).toBe(4);
  const anchor = await page.evaluate(() => {
    const konva = (window as unknown as { Konva: { stages: import('konva').default.Stage[] } })
      .Konva;
    const stage = konva.stages.find((stage) => stage.container().isConnected)!;
    const transformer = stage.findOne('Transformer') as import('konva').default.Transformer;
    const anchor = transformer.findOne('.bottom-right')!;
    const point = anchor.getAbsolutePosition(),
      rect = stage.container().getBoundingClientRect();
    return { x: rect.x + point.x, y: rect.y + point.y };
  });
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 45, anchor.y + 25, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      page.evaluate((id) => {
        const resources = JSON.parse(sessionStorage.getItem('codoc:guest:resources')!);
        const doc = JSON.parse(resources.document.find((d: { id: string }) => d.id === id).content);
        return doc.slides[0].elements.find((el: { type: string }) => el.type === 'group').width;
      }, id),
    )
    .toBeGreaterThan(280);
  await page.mouse.click(bounds.x + 140 * scale, bounds.y + 130 * scale, { button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.screenshot({ path: '../reports/editor-grouping.png', fullPage: true });
});

test('a triangle can be resized by its corner after another element was dragged', async ({
  page,
}) => {
  await guest(page);
  const id = await seed(page);
  await page.goto(`/app/editor/${id}`);
  const stage = page.locator('.stage-wrap');
  await expect(stage).toBeVisible();
  const box = (await stage.boundingBox())!,
    scale = box.width / 400;
  await page.mouse.move(box.x + 280 * scale, box.y + 140 * scale);
  await page.mouse.down();
  await page.mouse.move(box.x + 290 * scale, box.y + 160 * scale, { steps: 10 });
  await page.mouse.up();
  await page.mouse.click(box.x + 100 * scale, box.y + 110 * scale);
  const anchor = await page.evaluate(() => {
    const konva = (window as unknown as { Konva: { stages: import('konva').default.Stage[] } })
      .Konva;
    const stage = konva.stages.find((stage) => stage.container().isConnected)!;
    const transformer = stage.findOne('Transformer') as import('konva').default.Transformer;
    const point = transformer.findOne('.bottom-right')!.getAbsolutePosition(),
      rect = stage.container().getBoundingClientRect();
    return { x: rect.x + point.x, y: rect.y + point.y };
  });
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 35, anchor.y + 35, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      page.evaluate((id) => {
        const resources = JSON.parse(sessionStorage.getItem('codoc:guest:resources')!);
        return JSON.parse(
          resources.document.find((d: { id: string }) => d.id === id).content,
        ).slides[0].elements.find((el: { id: string }) => el.id === 'first').width;
      }, id),
    )
    .toBeGreaterThan(100);
  await page.mouse.click(box.x + 100 * scale, box.y + 110 * scale, { button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
});
