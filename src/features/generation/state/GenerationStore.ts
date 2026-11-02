import { SimpleStore } from '@/shared/store/store';
import type {
  GenerationClient, GenerationJobStatus, GenerationRequest, GenerationResult,
} from '../api/GenerationClient';
import { httpGenerationClient } from '../api/HttpGenerationClient';

export type GenPhase = 'idle' | 'sync-running' | 'sync-done' | 'async-running' | 'async-done' | 'error';

export interface GenState {
  readonly phase: GenPhase;
  readonly result: GenerationResult | null;
  readonly job: GenerationJobStatus | null;
  readonly error: string | null;
}

const INITIAL: GenState = { phase: 'idle', result: null, job: null, error: null };

export class GenerationStore extends SimpleStore<GenState> {
  private readonly client: GenerationClient;
  private pollTimer: number | null = null;

  constructor(client: GenerationClient = httpGenerationClient) {
    super(INITIAL);
    this.client = client;
  }

  async runSync(req: GenerationRequest): Promise<GenerationResult> {
    this.setState({ phase: 'sync-running', result: null, job: null, error: null });
    try {
      const r = await this.client.generateSync(req);
      this.setState({ phase: 'sync-done', result: r, job: null, error: null });
      return r;
    } catch (e) {
      this.setState({ phase: 'error', result: null, job: null, error: (e as Error).message });
      throw e;
    }
  }

  async runAsync(req: GenerationRequest): Promise<void> {
    this.setState({ phase: 'async-running', result: null, job: null, error: null });
    try {
      const { jobId } = await this.client.startJob(req);
      this.pollJob(jobId);
    } catch (e) {
      this.setState({ phase: 'error', result: null, job: null, error: (e as Error).message });
    }
  }

  async resumeJob(jobId: string): Promise<void> {
    this.setState({ phase: 'async-running', result: null, job: null, error: null });
    this.pollJob(jobId);
  }

  async cancel(): Promise<void> {
    if (!this.getState().job) return;
    if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
    await this.client.cancelJob(this.getState().job!.jobId).catch(() => undefined);
    this.setState({ ...INITIAL });
  }

  private pollJob(jobId: string): void {
    const tick = async (): Promise<void> => {
      try {
        const status = await this.client.pollJob(jobId);
        this.setState((s) => ({ ...s, job: status }));
        if (status.status === 'done') {
          if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
          const r = await this.client.downloadResult(jobId);
          this.setState((s) => ({ ...s, phase: 'async-done', result: r }));
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
          this.setState((s) => ({ ...s, phase: 'error', error: status.errors[0]?.message ?? 'Failed' }));
        }
      } catch (e) {
        this.setState((s) => ({ ...s, phase: 'error', error: (e as Error).message }));
      }
    };
    void tick();
    this.pollTimer = window.setInterval(tick, 500);
  }
}

export const generationStore = new GenerationStore();