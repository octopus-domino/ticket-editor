import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSlide } from '@/domain/slide/operations';
import { SchemaStore } from '@/features/schemas/state/SchemaStore';
import { ModelStore } from '@/features/data-models/state/ModelStore';
import type { DataModelRepository } from '@/features/data-models/api/DataModelRepository';
import { TemplateStore } from '@/features/templates/state/TemplateStore';
import type { TemplateRepository } from '@/features/templates/api/TemplateRepository';
import { GenerationStore } from '@/features/generation/state/GenerationStore';
import type {
  GenerationClient,
  GenerationRequest,
  GenerationJobStatus,
} from '@/features/generation/api/GenerationClient';
import { reachGoal } from '@/shared/analytics/metrika';
import { measureEditorExport } from '@/shared/analytics/GenerationMetrics';

const schemaRepository = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock('@/features/schemas/api/HttpSchemaRepository', () => ({
  httpSchemaRepository: schemaRepository,
}));
vi.mock('@/shared/analytics/metrika', () => ({ reachGoal: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

const schema = {
  id: 'private-id',
  name: 'Private schema',
  fields: [{ path: 'private_field', type: 'string' as const, required: true }],
  createdAt: '',
  updatedAt: '',
};
const model = {
  id: 'private-model',
  schemaId: schema.id,
  name: 'Private name',
  values: { password: 'private-value' },
  createdAt: '',
  updatedAt: '',
};
const template = {
  id: 'private-template',
  schemaId: schema.id,
  name: 'Private template',
  slides: [createSlide(1)],
  bindings: [],
  createdAt: '',
  updatedAt: '',
};
const request: GenerationRequest = {
  inlineSlides: template.slides,
  items: [{ inlineValues: model.values }],
  format: 'pdf',
  packAs: 'zip',
};
const result = { count: 1, failed: 0, filename: 'private-file.zip', blob: new Blob() };
const job: GenerationJobStatus = {
  jobId: 'private-job',
  status: 'running',
  progress: { total: 101, completed: 0, failed: 0 },
  errors: [],
  resultUrl: null,
  expiresAt: '',
};

describe('creation events', () => {
  it('records successful creations once without private resource values; updates do not count', async () => {
    schemaRepository.create.mockResolvedValue(schema);
    schemaRepository.update.mockResolvedValue(schema);
    const schemas = new SchemaStore();
    await schemas.create({ name: schema.name, fields: schema.fields });
    await schemas.update(schema.id, { name: schema.name, fields: schema.fields });
    const models = new ModelStore({
      create: vi.fn().mockResolvedValue(model),
    } as unknown as DataModelRepository);
    await models.create(schema.id, model.name, model.values);
    const templates = new TemplateStore({
      create: vi.fn().mockResolvedValue(template),
      update: vi.fn().mockResolvedValue(template),
    } as unknown as TemplateRepository);
    await templates.create(template);
    await templates.update(template.id, template);
    expect(vi.mocked(reachGoal).mock.calls).toEqual([
      ['schema_created', { field_count: '1' }],
      ['model_created', { source: 'manual', model_count: '1' }],
      ['template_created', { slide_count: '1', has_schema: 'true' }],
    ]);
  });

  it('does not count failed or obsolete creations', async () => {
    schemaRepository.create.mockRejectedValueOnce(new Error('private error'));
    await expect(new SchemaStore().create({ name: 'Test', fields: [] })).rejects.toThrow();
    let finish!: (value: typeof template) => void;
    const templates = new TemplateStore({
      create: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    } as unknown as TemplateRepository);
    const creation = templates.create(template);
    templates.reset();
    finish(template);
    await creation;
    expect(reachGoal).not.toHaveBeenCalled();
  });

  it('counts the server-confirmed imported models even when some imports fail', async () => {
    const models = new ModelStore({
      importMany: vi
        .fn()
        .mockResolvedValue({ imported: 2, issues: [{ index: 2, message: 'private error' }] }),
      list: vi.fn().mockResolvedValue([]),
    } as unknown as DataModelRepository);
    await expect(models.importMany(schema.id, [])).rejects.toThrow();
    expect(reachGoal).toHaveBeenCalledTimes(1);
    expect(reachGoal).toHaveBeenCalledWith('model_created', { source: 'import', model_count: '2' });
  });
});

describe('generation events', () => {
  it('records sync start and partial completion once without filenames or error texts', async () => {
    const store = new GenerationStore(
      {
        generateSync: vi
          .fn()
          .mockResolvedValue({
            ...result,
            failed: 1,
            errors: [{ index: 1, message: 'private error' }],
          }),
      } as unknown as GenerationClient,
      null,
    );
    await store.run(request);
    await store.cancel();
    expect(vi.mocked(reachGoal).mock.calls.map(([goal]) => goal)).toEqual([
      'generation_started',
      'generation_completed',
    ]);
    expect(reachGoal).toHaveBeenLastCalledWith(
      'generation_completed',
      expect.objectContaining({
        mode: 'sync',
        format: 'pdf',
        document_count: '1',
        failed_count: '1',
        outcome: 'partial',
      }),
    );
    expect(JSON.stringify(vi.mocked(reachGoal).mock.calls)).not.toContain('private');
  });

  it('does not count progress polls as new generations', async () => {
    vi.useFakeTimers();
    const client = {
      startJob: vi.fn().mockResolvedValue({ jobId: job.jobId }),
      pollJob: vi
        .fn()
        .mockResolvedValueOnce(job)
        .mockResolvedValue({ ...job, status: 'done' }),
      downloadResult: vi.fn().mockResolvedValue({ ...result, count: 101 }),
    } as unknown as GenerationClient;
    const store = new GenerationStore(client, null);
    await store.run({ ...request, items: Array.from({ length: 101 }, () => ({})) });
    await vi.advanceTimersByTimeAsync(3000);
    expect(vi.mocked(reachGoal).mock.calls.map(([goal]) => goal)).toEqual([
      'generation_started',
      'generation_completed',
    ]);
    expect(reachGoal).toHaveBeenLastCalledWith(
      'generation_completed',
      expect.objectContaining({ mode: 'async', requested_count: '101', document_count: '101' }),
    );
  });

  it('resumes an existing job without a second start event', async () => {
    const store = new GenerationStore(
      {
        pollJob: vi.fn().mockResolvedValue({ ...job, status: 'done' }),
        downloadResult: vi.fn().mockResolvedValue(result),
      } as unknown as GenerationClient,
      null,
    );
    await store.resumeJob(job.jobId);
    expect(reachGoal).toHaveBeenCalledTimes(1);
    expect(reachGoal).toHaveBeenCalledWith(
      'generation_completed',
      expect.objectContaining({ format: 'unknown', requested_count: '101' }),
    );
  });

  it('records failed polls once without sending raw errors', async () => {
    vi.useFakeTimers();
    const store = new GenerationStore(
      {
        pollJob: vi.fn().mockRejectedValue(new Error('secret payload')),
      } as unknown as GenerationClient,
      null,
    );
    await store.resumeJob(job.jobId);
    await vi.advanceTimersByTimeAsync(3000);
    expect(reachGoal).toHaveBeenCalledTimes(1);
    expect(reachGoal).toHaveBeenCalledWith(
      'generation_failed',
      expect.objectContaining({ stage: 'poll' }),
    );
    expect(JSON.stringify(vi.mocked(reachGoal).mock.calls)).not.toContain('secret');
  });

  it('also counts direct editor exports and propagates application failures', async () => {
    await expect(
      measureEditorExport('pdfa', 'sync', async () => {
        throw new Error('export failed');
      }),
    ).rejects.toThrow('export failed');
    expect(vi.mocked(reachGoal).mock.calls.map(([goal]) => goal)).toEqual([
      'generation_started',
      'generation_failed',
    ]);
    expect(reachGoal).toHaveBeenLastCalledWith(
      'generation_failed',
      expect.objectContaining({ source: 'editor_export', format: 'pdfa' }),
    );
  });
});
