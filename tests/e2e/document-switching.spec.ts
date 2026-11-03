import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function exportDocument(page: Page) {
  const downloaded = page.waitForEvent('download');
  await page
    .locator('.toolbar-actions')
    .getByRole('button', { name: '📥 JSON', exact: true })
    .click();
  const file = await downloaded;
  return JSON.parse(await readFile((await file.path())!, 'utf8')) as {
    slides: { name: string; elements: unknown[] }[];
  };
}

test('switching and creating documents never copies the previous canvas into another document', async ({
  page,
}) => {
  const slide = {
    id: 'slide',
    name: 'ALPHA_SLIDE',
    format: 'a4',
    orientation: 'portrait',
    width: 794,
    height: 1123,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    background: '#fff',
    elements: [],
  };
  const documents: Record<
    string,
    { id: string; name: string; folderId: null; content: string; updatedAt: string }
  > = {
    A: {
      id: 'A',
      name: 'Document A',
      folderId: null,
      content: JSON.stringify({
        version: '2.0',
        slides: [slide, { ...slide, id: 'second', name: 'ALPHA_SECOND' }],
        data: [],
        activeId: 'slide',
      }),
      updatedAt: '2026-01-01T00:00:00Z',
    },
    B: {
      id: 'B',
      name: 'Document B',
      folderId: null,
      content: JSON.stringify({
        version: '2.0',
        slides: [{ ...slide, name: 'BETA_SLIDE' }],
        data: [],
        activeId: 'slide',
      }),
      updatedAt: '2026-01-01T00:00:00Z',
    },
  };
  const writes: { id: string; content: string }[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/auth/refresh')
      return json({
        accessToken: 'test-token',
        user: { id: 'owner', name: 'Tester', email: 'owner@example.test' },
      });
    if (path === '/api/workspace/tree')
      return json(
        Object.values(documents).map((doc) => ({
          id: doc.id,
          name: doc.name,
          type: 'document',
          parentId: null,
          updatedAt: doc.updatedAt,
          children: [],
        })),
      );
    if (path === '/api/workspace/documents' && request.method() === 'POST') {
      documents.C = {
        id: 'C',
        name: 'New document',
        folderId: null,
        content: '{}',
        updatedAt: new Date().toISOString(),
      };
      return json(documents.C, 201);
    }
    const match = path.match(/^\/api\/workspace\/documents\/([^/]+)(\/content)?$/);
    if (match) {
      const id = match[1];
      if (request.method() === 'PUT') {
        const { content } = request.postDataJSON() as { content: string };
        writes.push({ id, content });
        documents[id] = { ...documents[id], content, updatedAt: new Date().toISOString() };
      } else if (id === 'B') await new Promise((resolve) => setTimeout(resolve, 300));
      return json(documents[id]);
    }
    return json([]);
  });
  await page.goto('/app/editor/A');
  await expect(page.locator('.slide-thumb')).toHaveCount(2);
  expect((await exportDocument(page)).slides[0].name).toBe('ALPHA_SLIDE');
  await page.getByText('Document B', { exact: true }).click();
  await expect(page).toHaveURL('/app/editor/B');
  await expect(page.locator('.slide-thumb')).toHaveCount(1);
  expect((await exportDocument(page)).slides[0].name).toBe('BETA_SLIDE');
  await page.getByText('Document A', { exact: true }).click();
  await expect(page.locator('.slide-thumb')).toHaveCount(2);
  expect((await exportDocument(page)).slides[0].name).toBe('ALPHA_SLIDE');
  await page.getByRole('button', { name: '+ Документ', exact: true }).click();
  await page.getByPlaceholder('Название документа…').fill('New document');
  await page.getByPlaceholder('Название документа…').press('Enter');
  await expect(page).toHaveURL('/app/editor/C');
  await expect(page.locator('.slide-thumb')).toHaveCount(1);
  const fresh = await exportDocument(page);
  expect(fresh.slides[0].elements).toHaveLength(0);
  expect(JSON.stringify(fresh)).not.toMatch(/ALPHA|BETA/);
  await expect.poll(() => writes.some((write) => write.id === 'C')).toBe(true);
  expect(
    writes.filter((write) => write.id === 'B').every((write) => !write.content.includes('ALPHA')),
  ).toBe(true);
  expect(
    writes.filter((write) => write.id === 'C').every((write) => !/ALPHA|BETA/.test(write.content)),
  ).toBe(true);
});
