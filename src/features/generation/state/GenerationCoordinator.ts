import { SimpleStore } from '@/shared/store/store';
import type {
  GenerationClient,
  GenerationJobStatus,
  GenerationRequest,
  GenerationResult,
} from '../api/GenerationClient';
import { httpGenerationClient } from '../api/HttpGenerationClient';

export type GenPhase =
  'idle' | 'sync-running' | 'sync-done' | 'async-running' | 'async-done' | 'error';
export interface GenState {
  readonly phase: GenPhase;
  readonly result: GenerationResult | null;
  readonly job: GenerationJobStatus | null;
  readonly error: string | null;
}
const initial = (): GenState => ({
  phase: 'idle',
  result: null,
  job: null,
  error: null,
});
interface Bookmark {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** One owner for the job lifecycle; polls are sequential and obsolete responses are discarded. */
export class GenerationStore extends SimpleStore<GenState> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;
  private jobId: string | null = null;
  private owner = 'local';
  constructor(
    private readonly client: GenerationClient = httpGenerationClient,
    private readonly storage: Bookmark | null = typeof localStorage === 'undefined'
      ? null
      : localStorage,
  ) {
    super(initial());
  }
  private key(): string {
    return `ticket-editor:job:${this.owner}`;
  }
  private remember(id: string | null): void {
    this.jobId = id;
    try {
      if (id) this.storage?.setItem(this.key(), id);
      else this.storage?.removeItem(this.key());
    } catch {
      /* memory-only still works */
    }
  }
  private stop(): number {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    return ++this.version;
  }
  setOwner(owner: string): void {
    if (this.owner === owner) return;
    this.stop();
    this.owner = owner;
    this.jobId = null;
    this.setState(initial());
  }
  resumeSaved(): void {
    if (this.jobId) return;
    try {
      const id = this.storage?.getItem(this.key());
      if (id) void this.resumeJob(id);
    } catch {
      /* unavailable storage */
    }
  }
  async run(req: GenerationRequest): Promise<GenerationResult | undefined> {
    if (this.getState().phase.endsWith('running')) throw new Error('Генерация уже выполняется');
    if (req.items.length > 100) {
      await this.runAsync(req);
      return;
    }
    return this.runSync(req);
  }
  async runSync(req: GenerationRequest): Promise<GenerationResult> {
    const version = this.stop();
    this.remember(null);
    this.setState({ ...initial(), phase: 'sync-running' });
    try {
      const result = await this.client.generateSync(req);
      if (version === this.version) this.setState({ ...initial(), phase: 'sync-done', result });
      return result;
    } catch (error) {
      if (version === this.version)
        this.setState({
          ...initial(),
          phase: 'error',
          error: (error as Error).message,
        });
      throw error;
    }
  }
  async runAsync(req: GenerationRequest): Promise<void> {
    const version = this.stop();
    this.setState({ ...initial(), phase: 'async-running' });
    try {
      const { jobId } = await this.client.startJob(req);
      if (version !== this.version) return;
      this.remember(jobId);
      void this.poll(jobId, version);
    } catch (error) {
      if (version === this.version)
        this.setState({
          ...initial(),
          phase: 'error',
          error: (error as Error).message,
        });
    }
  }
  async resumeJob(id: string): Promise<void> {
    const version = this.stop();
    this.remember(id);
    this.setState({ ...initial(), phase: 'async-running' });
    await this.poll(id, version);
  }
  async cancel(): Promise<void> {
    const id = this.jobId;
    this.stop();
    if (id) await this.client.cancelJob(id);
    this.remember(null);
    this.setState(initial());
  }
  private async poll(id: string, version: number): Promise<void> {
    try {
      const job = await this.client.pollJob(id);
      if (version !== this.version) return;
      this.setState((state) => ({ ...state, job }));
      if (job.status === 'done') {
        const result = await this.client.downloadResult(id);
        if (version !== this.version) return;
        this.remember(null);
        this.setState((state) => ({ ...state, phase: 'async-done', result }));
      } else if (job.status === 'failed' || job.status === 'cancelled') {
        this.remember(null);
        this.setState((state) => ({
          ...state,
          phase: 'error',
          error: job.errors[0]?.message ?? job.status,
        }));
      } else
        this.timer = setTimeout(() => {
          void this.poll(id, version);
        }, 500);
    } catch (error) {
      if (version !== this.version) return;
      this.stop();
      this.setState((state) => ({
        ...state,
        phase: 'error',
        error: (error as Error).message,
      }));
    }
  }
}
export const generationStore = new GenerationStore();
