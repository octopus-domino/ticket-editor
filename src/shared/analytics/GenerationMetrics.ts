import { reachGoal } from './metrika';

interface GenerationContext {
  source: 'generation' | 'editor_export';
  mode: 'sync' | 'async' | 'local';
  format: 'pdf' | 'pdfa' | 'svg' | 'unknown';
  requestedCount: number | null;
}

/** One operation owns its terminal event; progress updates and downloads do not create events. */
export class GenerationMetrics {
  private readonly startedAt = Date.now();
  private finished = false;

  constructor(
    private readonly context: GenerationContext,
    private readonly resumed = false,
  ) {
    if (!resumed) reachGoal('generation_started', this.params());
  }

  complete(
    result: { count: number; failed: number },
    requestedCount = this.context.requestedCount,
  ): void {
    if (this.finished) return;
    this.finished = true;
    reachGoal('generation_completed', {
      ...this.params(requestedCount),
      document_count: String(result.count),
      failed_count: String(result.failed),
      outcome: result.failed > 0 ? (result.count > 0 ? 'partial' : 'failed') : 'success',
      duration_ms: String(Date.now() - this.startedAt),
    });
  }

  fail(stage: 'request' | 'poll' | 'download' | 'execution'): void {
    if (this.finished) return;
    this.finished = true;
    reachGoal('generation_failed', {
      ...this.params(),
      stage,
      duration_ms: String(Date.now() - this.startedAt),
    });
  }

  cancel(): void {
    if (this.finished) return;
    this.finished = true;
    reachGoal('generation_cancelled', this.params());
  }

  private params(requestedCount = this.context.requestedCount): Record<string, string> {
    return {
      source: this.context.source,
      mode: this.context.mode,
      format: this.context.format,
      requested_count: requestedCount === null ? 'unknown' : String(requestedCount),
      resumed: String(this.resumed),
    };
  }
}

export async function measureEditorExport(
  format: 'svg' | 'pdf' | 'pdfa',
  mode: 'local' | 'sync',
  operation: () => Promise<void>,
): Promise<void> {
  const metrics = new GenerationMetrics({
    source: 'editor_export',
    mode,
    format,
    requestedCount: 1,
  });
  try {
    await operation();
    metrics.complete({ count: 1, failed: 0 });
  } catch (error) {
    metrics.fail('execution');
    throw error;
  }
}
