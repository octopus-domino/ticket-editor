import { beforeAll, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { assetDocument } from '@/features/asset-libraries/assetDocument';
import { newShape, newSlide } from '@/lib/factories';
import { DocumentSchema } from '@/shared/schemas/document';

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
it('opens a symbol as a separate editable document and preserves source geometry', () => {
  const prototype = { ...newShape('triangle'), width: 900, height: 1400, fill: '#123456' };
  const sourceX = prototype.x;
  const doc = DocumentSchema.parse(
    JSON.parse(
      assetDocument({
        id: 'symbol',
        name: 'Triangle',
        kind: 'symbol',
        payload: { id: 'symbol', name: 'Triangle', prototype },
      }),
    ),
  );
  expect(doc.slides[0]).toMatchObject({ width: 980, height: 1480, format: 'custom' });
  expect(doc.slides[0].elements[0]).toMatchObject({
    type: 'shape',
    shape: 'triangle',
    fill: '#123456',
    x: 40,
    y: 40,
  });
  expect(doc.slides[0].elements[0].id).not.toBe(prototype.id);
  expect(prototype.x).toBe(sourceX);
});
it('creates an independent style sample and keeps a template multi-page', () => {
  const doc = JSON.parse(
    assetDocument({
      id: 'brand',
      name: 'Brand',
      kind: 'brand',
      payload: {
        id: 'style',
        name: 'Brand',
        fills: [{ id: 'f', type: 'solid', color: '#123456' }],
        strokes: [],
      },
    }),
  );
  expect(doc.slides[0].elements[0].appearance.fills[0].color).toBe('#123456');
  const template = JSON.parse(
    assetDocument({
      id: 'template',
      name: 'Pages',
      kind: 'template',
      payload: { name: 'Pages', slides: [newSlide(1), newSlide(2)], bindings: [] },
    }),
  );
  expect(template.slides).toHaveLength(2);
  expect(template.activeId).toBe(template.slides[0].id);
});
it('rejects folders and linked symbols instead of creating a broken document', () => {
  expect(() => assetDocument({ id: 'folder', name: 'Folder', kind: 'folder' })).toThrow();
});
