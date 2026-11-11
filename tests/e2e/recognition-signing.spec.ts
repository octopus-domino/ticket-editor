import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type {} from '../../src/features/signing/CryptoProProvider';

test('image import becomes editable objects, generates a PDF and signs its original bytes', async ({ page }) => {
  page.on('pageerror', (error) => console.error('Browser error:', error.message));
  const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  let saved: Record<string, unknown> | null = null;
  const pdf = '%PDF-1.7\noriginal recognized document\n%%EOF';
  await page.addInitScript(() => {
    localStorage.setItem('codoc:language', 'en');
    const certificate = { HasPrivateKey: async () => true, ValidToDate: '2099-01-01', Thumbprint: 'ABC', SubjectName: 'CN=Test', IsValid: async () => ({ Result: true }) };
    const list = { Count: 1, Item: async () => certificate, Find: async () => ({ Count: 1, Item: async () => certificate }) };
    const objects: Record<string, Record<string, unknown>> = {
      'CAdESCOM.Store': { Open: async () => undefined, Close: async () => undefined, Certificates: list },
      'CAdESCOM.CPSigner': { propset_Certificate: async () => undefined, propset_CheckCertificate: async () => undefined },
      'CAdESCOM.CadesSignedData': {
        propset_ContentEncoding: async (value: number) => { (window as unknown as Record<string, unknown>).signingEncoding = value; },
        propset_Content: async (value: string) => { (window as unknown as Record<string, unknown>).signedContent = value; },
        SignCades: async (_signer: unknown, type: number, detached: boolean) => {
          if (type !== 1 || !detached) throw new Error('Incorrect signature format');
          return btoa('test-detached-signature');
        },
      },
    };
    window.cadesplugin = Object.assign(Promise.resolve(), { CreateObjectAsync: async (name: string) => objects[name] });
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/api/auth/refresh') return json({ accessToken: 'test', user: { id: 'owner', name: 'Tester', email: 'test@example.test' } });
    if (path === '/api/recognition/capabilities') return json({ ocr: true, ollama: false });
    if (path === '/api/recognition') {
      const input = route.request().postDataJSON() as { image: string; engine: string };
      expect(input.engine).toBe('ocr'); expect(input.image).toMatch(/^data:image\/png;base64,/);
      return json({ width: 600, height: 800, engine: 'ocr', warnings: ['recognition.review_required'], elements: [
        { type: 'text', x: 40, y: 40, width: 300, height: 40, properties: { text: 'RECOGNIZED INVOICE', fontSize: 24 } },
        { type: 'table', x: 40, y: 140, width: 500, height: 160, properties: { data: [['Item', 'Total'], ['Service', '100']], fontSize: 16 } },
        { type: 'image', x: 400, y: 400, width: 120, height: 120, properties: { src: `data:image/png;base64,${image}` } },
      ] });
    }
    if (path === '/api/templates' && route.request().method() === 'POST') {
      saved = route.request().postDataJSON() as Record<string, unknown>;
      return json({ ...saved, id: 'recognized', createdAt: '', updatedAt: '2026-11-05T00:00:00Z' });
    }
    if (path === '/api/templates') return json(saved ? [{ ...saved, id: 'recognized', slideCount: 1 }] : []);
    if (path === '/api/templates/recognized') return json({ ...saved, id: 'recognized', createdAt: '', updatedAt: '2026-11-05T00:00:00Z' });
    if (path === '/api/generate/sync') return route.fulfill({ body: pdf, contentType: 'application/pdf', headers: {
      'Content-Disposition': 'attachment; filename="recognized.pdf"', 'X-Generation-Count': '1', 'X-Generation-Failed': '0',
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Generation-Count, X-Generation-Failed',
    } });
    return json([]);
  });
  await page.goto('/app/templates/new?preset=__image__');
  await expect(page.locator('#document-preset')).toHaveValue('__image__');
  // Generate a real browser-decodable page without external assets.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 800;
    const g = canvas.getContext('2d')!; g.fillStyle = 'white'; g.fillRect(0, 0, 600, 800);
    g.fillStyle = 'black'; g.font = '24px Arial'; g.fillText('INVOICE', 40, 70);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'invoice.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByRole('button', { name: 'Recognize locally', exact: true }).click();
  await expect(page.getByText('Editable objects: 3')).toBeVisible();
  expect(saved).toBeNull();
  await page.locator('#template-name').fill('Imported invoice');
  await page.locator('.template-form button[type=submit]').click();
  await expect(page).toHaveURL(/templates\/recognized\/edit/);
  await expect(page.locator('canvas').first()).toBeVisible();
  const payload = saved as unknown as { slides: { elements: { type: string }[] }[] };
  expect(payload.slides[0].elements.map((e) => e.type)).toEqual(['text', 'table', 'image']);
  await page.goto('/app/generate?templateId=recognized&format=pdf&packAs=single');
  const documentDownload = page.waitForEvent('download');
  await page.locator('.dp-btn-submit').click();
  expect((await documentDownload).suggestedFilename()).toBe('recognized.pdf');
  await page.getByRole('link', { name: /Sign generated document/ }).click();
  await expect(page.locator('.signing-page code')).toBeVisible();
  await page.locator('.signing-page select').nth(1).selectOption('RU');
  await page.getByRole('button', { name: 'Connect certificate' }).click();
  await page.locator('.signing-page input[type=checkbox]').check();
  const signatureDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sign document', exact: true }).click();
  const signature = await signatureDownload;
  expect(signature.suggestedFilename()).toBe('recognized.pdf.sig');
  expect(await readFile((await signature.path())!, 'utf8')).toBe('test-detached-signature');
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).signedContent)).toBe(Buffer.from(pdf).toString('base64'));
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).signingEncoding)).toBe(1);
});
