import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenerationStore } from '@/features/generation/state/GenerationStore';
import type {
  GenerationClient,
  GenerationJobStatus,
  GenerationRequest,
} from '@/features/generation/api/GenerationClient';
import { makeArrayTable, newQr, newTable, newText } from '@/lib/factories';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { validateBindings } from '@/features/bindings/domain/BindingValidator';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import { createSlide } from '@/domain/slide/operations';
import { materializeSlide } from '@/lib/materialize';
import { DocumentSchema } from '@/shared/schemas/document';
import { hydrateDocument } from '@/workspace/hydrateDocument';
import { importElements } from '@/application/use-cases/importElements';

afterEach(() => vi.useRealTimers());
describe('generation contracts', () => {
  it('preserves QR documents through validation and hydration', () => {
    const slide = createSlide(1);
    slide.elements = [newQr()];
    const document = { version: '2.0', slides: [slide], data: [] };
    expect(DocumentSchema.safeParse(document).success).toBe(true);
    expect(hydrateDocument(JSON.stringify(document)).slides[0].elements[0].type).toBe('qr');
  });
  it('renders independent model values and escapes rich substitutions without touching templates', () => {
    const slide = createSlide(1),
      text = newText(),
      qr = newQr();
    text.text = '{{name}}';
    text.html = '<p>{{name}}</p>';
    qr.text = '{{name}}';
    slide.elements = [text, qr];
    const first = materializeSlide(slide, { name: '<Alice>' });
    const second = materializeSlide(slide, { name: 'Bob' });
    expect(first.elements[0]).toMatchObject({
      text: '<Alice>',
      html: '<p>&lt;Alice&gt;</p>',
    });
    expect(second.elements[1]).toMatchObject({ text: 'Bob' });
    expect(slide.elements[1]).toMatchObject({ text: '{{name}}' });
  });
  it('rejects partial imports atomically and remaps valid IDs', () => {
    expect(() => importElements([newQr(), { type: 'unknown' }], 0)).toThrow();
    const original = newQr();
    const result = importElements(original, 0)!;
    expect(result[0].id).not.toBe(original.id);
    expect(() => importElements([original], 2000)).toThrow();
  });
  it('fills every table column with independent scalar and nested array bindings', () => {
    const slide = createSlide(1);
    const table = { ...newTable(), data: [
      ['{{name}}', '{{layout.items[0].count}}', '{{layout.items[0].price}}'],
    ] };
    slide.elements = [table];
    const bindings = resolveBindings([slide]).map(binding => ({
      ...binding, schemaPath: binding.placeholder === '{{name}}' ? 'customer' : 'invoice.lines',
    }));
    expect(bindings.map(binding => binding.expectedType)).toEqual(['string', 'array']);
    expect(materializeSlide(slide, {
      customer: 'Anna', invoice: { lines: [{ count: 0, price: 42 }] },
    }, bindings).elements[0]).toMatchObject({ data: [['Anna', '0', '42']] });
    expect(materializeSlide(slide, {
      customer: 'Anna', 'invoice.lines': [{ count: 0, price: 42 }],
    }, bindings).elements[0]).toMatchObject({ data: [['Anna', '0', '42']] });
  });
  it('expands a saved array table and shrinks it again without editing the template', () => {
    const slide = createSlide(1);
    const legacy = {
      ...newTable(), rows: 2, cols: 2, height: 80, rowHeights: [30, 50],
      data: [['Code', 'Count'], ['{{pos[0].code}}', '{{pos[0].count}}']],
    };
    slide.elements = [legacy];
    const values = { pos: [
      { code: 'First', count: 0 }, { code: 'Second', count: 2 },
      { code: 'Third', count: 3 }, { code: 'Fourth', count: 4 },
    ] };
    expect(materializeSlide(slide, values).elements[0]).toMatchObject({
      rows: 5, height: 230, rowHeights: [30, 50, 50, 50, 50],
      data: [['Code', 'Count'], ['First', '0'], ['Second', '2'], ['Third', '3'], ['Fourth', '4']],
    });
    expect(materializeSlide(slide, { pos: [values.pos[0]] }).elements[0]).toMatchObject({
      rows: 2, data: [['Code', 'Count'], ['First', '0']],
    });
    expect(materializeSlide(slide, { pos: [] }).elements[0]).toMatchObject({
      rows: 1, height: 30, data: [['Code', 'Count']],
    });
    expect(legacy.data[1]).toEqual(['{{pos[0].code}}', '{{pos[0].count}}']);
  });
  it('marks only rendered or explicitly linked array fields as used', () => {
    const slide = createSlide(1);
    const table = makeArrayTable(0, 0, { path: 'pos', arrayChildren: [{ name: 'code', type: 'string' }] });
    slide.elements = [table];
    const schema: DataSchema = { id: 'S', name: 'Items', createdAt: '', updatedAt: '', fields: [
      { path: 'items', type: 'array', required: true },
      { path: 'items.code', type: 'string', required: true },
      { path: 'items.price', type: 'number', required: true },
    ] };
    const bindings = resolveBindings([slide]).map(binding => ({ ...binding, schemaPath: 'items' }));
    expect(validateBindings(bindings, schema, [slide])).toMatchObject([
      { path: 'items.price', kind: 'required-unbound' },
    ]);
    expect(materializeSlide(slide, { pos: [{ code: 'Stale' }], items: [{ code: 'A' }, { code: 'B' }] }, bindings)
      .elements[0]).toMatchObject({ rows: 3, data: [['code'], ['A'], ['B']] });
    expect(validateBindings(bindings, { ...schema, fields: schema.fields.filter(field => field.path !== 'items.code') }, [slide]))
      .toMatchObject([{ path: 'items.code', kind: 'missing' }, { path: 'items.price', kind: 'required-unbound' }]);
  });
  it('uses async for 101 items and stops polling after completion', async () => {
    vi.useFakeTimers();
    const status: GenerationJobStatus = {
      jobId: 'J',
      status: 'running',
      progress: { completed: 0, failed: 0, total: 101 },
      errors: [],
      resultUrl: null,
      expiresAt: '',
    };
    const result = {
      blob: new Blob(),
      filename: 'documents.zip',
      count: 101,
      failed: 0,
    };
    const client = {
      startJob: vi.fn().mockResolvedValue({ jobId: 'J' }),
      pollJob: vi
        .fn()
        .mockResolvedValueOnce(status)
        .mockResolvedValue({ ...status, status: 'done' }),
      downloadResult: vi.fn().mockResolvedValue(result),
      generateSync: vi.fn(),
      cancelJob: vi.fn(),
    };
    const store = new GenerationStore(client as GenerationClient, null);
    await store.run({
      inlineSlides: [],
      items: Array.from({ length: 101 }, () => ({ inlineValues: {} })),
      format: 'pdf',
      packAs: 'zip',
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.generateSync).not.toHaveBeenCalled();
    expect(client.pollJob).toHaveBeenCalledTimes(2);
    expect(client.downloadResult).toHaveBeenCalledTimes(1);
    expect(store.getState().phase).toBe('async-done');
  });
  it('does not continue an interval after a failed poll', async () => {
    vi.useFakeTimers();
    const client = {
      pollJob: vi.fn().mockRejectedValue(new Error('offline')),
    } as unknown as GenerationClient;
    const store = new GenerationStore(client, null);
    await store.resumeJob('J');
    await vi.advanceTimersByTimeAsync(10000);
    expect(client.pollJob).toHaveBeenCalledTimes(1);
    expect(store.getState().phase).toBe('error');
  });
  it('uses sync for a small batch', async () => {
    const client = {
      generateSync: vi.fn().mockResolvedValue({ count: 1 }),
    } as unknown as GenerationClient;
    const store = new GenerationStore(client, null);
    await store.run({
      inlineSlides: [],
      items: [{ inlineValues: {} }],
      format: 'pdf',
      packAs: 'single',
    } satisfies GenerationRequest);
    expect(client.generateSync).toHaveBeenCalledTimes(1);
  });
});
