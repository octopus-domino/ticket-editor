import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenerationStore } from '@/features/generation/state/GenerationStore';
import type {
  GenerationClient,
  GenerationJobStatus,
  GenerationRequest,
} from '@/features/generation/api/GenerationClient';
import { newQr, newText } from '@/lib/factories';
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
