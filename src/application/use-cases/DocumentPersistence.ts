import type { DraftRepository } from '../ports/DraftRepository';
import { RevisionSaveQueue } from './RevisionSaveQueue';

export type PersistenceStatus = 'saving' | 'saved' | 'error';
/** Persist a local recovery copy before enqueueing a serialized remote write. */
export class DocumentPersistence<T> {
  private revision = 0;
  private readonly session = crypto.randomUUID();
  private local: Promise<void> = Promise.resolve();
  private readonly queue: RevisionSaveQueue<{ revision: number; snapshot: T }>;
  constructor(
    private readonly id: string,
    private readonly drafts: DraftRepository<T>,
    save: (snapshot: T) => Promise<void>,
    private readonly notify: (status: PersistenceStatus, error?: string) => void,
  ) {
    this.queue = new RevisionSaveQueue(async (_id, next) => {
      try {
        await save(next.snapshot);
        if (next.revision === this.revision) {
          await this.local;
          await this.drafts.remove(this.id, `${this.session}:${next.revision}`);
          if (next.revision === this.revision) this.notify('saved');
        }
      } catch (error) {
        this.notify('error', (error as Error).message);
        throw error;
      }
    }, 1500);
  }
  update(snapshot: T): void {
    const revision = ++this.revision;
    this.notify('saving');
    this.local = this.local
      .catch(() => undefined)
      .then(() =>
        this.drafts.write(this.id, {
          snapshot,
          savedAt: Date.now(),
          revision: `${this.session}:${revision}`,
        }),
      );
    void this.local.catch((error: unknown) => this.notify('error', (error as Error).message));
    this.queue.enqueue(this.id, { revision, snapshot });
  }
  async flush(): Promise<void> {
    await this.local;
    await this.queue.flush(this.id);
  }
}
