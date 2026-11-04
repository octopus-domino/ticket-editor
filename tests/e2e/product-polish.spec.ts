import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';

async function mockAccount(page: Page) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/refresh')
      return route.fulfill({
        json: {
          accessToken: 'test',
          user: { id: 'owner', name: 'Tester', email: 'test@example.test' },
        },
      });
    if (path === '/api/schemas')
      return route.fulfill({
        json: [
          {
            id: 'S',
            name: 'Contacts',
            fields: [{ path: 'name', type: 'string', required: true }],
            createdAt: '',
            updatedAt: '',
          },
        ],
      });
    return route.fulfill({ json: [] });
  });
}

test('the nine-language flows contain no leftover Russian outside the language picker', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  for (const locale of ['en', 'zh', 'pl', 'it', 'es', 'nl', 'fr', 'de', 'ru']) {
    const context = await browser.newContext({ locale: `${locale}-${locale.toUpperCase()}` });
    const page = await context.newPage();
    await mockAccount(page);
    await page.addInitScript((value) => localStorage.setItem('codoc:language', value), locale);
    for (const [path, selector] of [
      ['/', '.codoc-hero'],
      ['/learn?lesson=stamp', '.lesson-index'],
      ['/stamp-editor', '.library-card'],
      ['/app/library', '.library-card'],
      ['/app/sign', '.signing-page'],
      ['/app/editor/local', '.toolbar'],
      ['/app/data-models', '.dm-page'],
    ]) {
      await page.goto(path);
      await expect(page.locator(selector).first()).toBeVisible();
      expect(await page.locator('html').getAttribute('lang')).toBe(locale);
      if (locale !== 'ru') {
        const text = await page.evaluate(() => {
          const copy = document.body.cloneNode(true) as HTMLElement;
          copy
            .querySelectorAll('.language-switcher,script,style,noscript')
            .forEach((node) => node.remove());
          return copy.textContent ?? '';
        });
        expect(text.match(/[А-Яа-яЁё][А-Яа-яЁё\s.,!?—:;()]{2,}/g), `${locale}: ${path}`).toBeNull();
      }
    }
    await context.close();
  }
});

test('concrete tutorials show evolving artifacts and open the round stamp with an image', async ({
  page,
}) => {
  await mockAccount(page);
  await page.goto('/learn?lesson=document');
  await expect(page.locator('.lesson-index button')).toHaveCount(23);
  const image = page.locator('.lesson-paper>img');
  const before = await image.getAttribute('src');
  await page.locator('.lesson-index button').nth(11).click();
  await expect(image).not.toHaveAttribute('src', before!);
  await expect(page.locator('.lesson-description')).toContainText('4 × 2');
  await page.goto('/learn?lesson=stamp');
  await expect(page.locator('.lesson-index button')).toHaveCount(12);
  await page.locator('.lesson-index button').nth(6).click();
  expect(decodeURIComponent((await image.getAttribute('src'))!)).toContain('<image');
  await page.getByRole('link', { name: 'Открыть пример в редакторе' }).click();
  await expect(page.locator('.stamp-editor-modal')).toBeVisible();
  await expect(page.locator('.tutorial-coach')).toBeVisible();
  await expect(page.locator('.stamp-editor-modal canvas').first()).toBeVisible();
});

test('landing, lessons and stamp library fit a normal phone', async ({ page }) => {
  await mockAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, selector] of [
    ['/', '.codoc-hero'],
    ['/learn', '.lesson-stage'],
    ['/stamp-editor', '.library-card'],
  ]) {
    await page.goto(path);
    await expect(page.locator(selector).first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const root = document.querySelector('.codoc-landing,.learning-page,.product-library')!;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(overflow, path).toBe(false);
    const buttons = await page
      .locator('.lesson-controls button,.product-library>header button')
      .all();
    for (const button of buttons)
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(40);
  }
});

test('signing opens the exact generated PDF and offers no arbitrary upload', async ({ page }) => {
  await mockAccount(page);
  const template = {
    id: 'T',
    name: 'Workshop brochure',
    schemaId: null,
    bindings: [],
    slides: [
      {
        id: 'S',
        name: 'Page',
        width: 1123,
        height: 794,
        format: 'a4',
        orientation: 'landscape',
        background: '#ffffff',
        padding: { top: 28, right: 28, bottom: 28, left: 28 },
        elements: [],
      },
    ],
    createdAt: '',
    updatedAt: '',
  };
  await page.route('**/api/templates**', (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === '/api/templates'
          ? [{ ...template, slideCount: 1 }]
          : template,
    }),
  );
  const pdf = '%PDF-1.7\nCoDoc generated original\n%%EOF';
  await page.route('**/api/generate/sync', (route) =>
    route.fulfill({
      contentType: 'application/pdf',
      headers: {
        'Content-Disposition': 'attachment; filename="workshop.pdf"',
        'X-Generation-Count': '1',
        'X-Generation-Failed': '0',
        'Access-Control-Expose-Headers':
          'Content-Disposition, X-Generation-Count, X-Generation-Failed',
      },
      body: pdf,
    }),
  );
  await page.goto('/app/generate?templateId=T&format=pdf&packAs=single');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Сгенерировать/ }).click();
  expect((await download).suggestedFilename()).toBe('workshop.pdf');
  await page.getByRole('link', { name: /Подписать готовый документ/ }).click();
  await expect(page.locator('.signing-source select')).toHaveValue('document');
  await expect(page.locator('.signing-source')).toContainText('workshop.pdf');
  await expect(page.locator('.signing-page code')).toHaveText(
    createHash('sha256').update(pdf).digest('hex'),
  );
  await expect(page.locator('.signing-page input[type=file]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Подписать документ', exact: true }),
  ).toBeDisabled();
});
