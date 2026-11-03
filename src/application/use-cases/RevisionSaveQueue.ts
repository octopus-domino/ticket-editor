/** Serial writes per resource, coalescing pending revisions without losing other resources. */
export class RevisionSaveQueue<T> {
  private pending = new Map<string, T>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private running = new Map<string, Promise<void>>();
  private generation = 0;

  constructor(
    private readonly save: (id: string, snapshot: T) => Promise<void>,
    private readonly delay = 2000,
  ) {}

  enqueue(id: string, snapshot: T): void {
    this.pending.set(id, snapshot);
    const old = this.timers.get(id);
    if (old) clearTimeout(old);
    this.timers.set(
      id,
      setTimeout(() => {
        void this.flush(id).catch(() => undefined);
      }, this.delay),
    );
  }

  isDirty(id: string): boolean {
    return this.pending.has(id) || this.running.has(id);
  }

  async flush(id?: string): Promise<void> {
    if (id === undefined) {
      await Promise.all(
        [...new Set([...this.pending.keys(), ...this.running.keys()])].map((key) =>
          this.flush(key),
        ),
      );
      return;
    }
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    const active = this.running.get(id);
    if (active) {
      await active;
      if (this.pending.has(id)) await this.flush(id);
      return;
    }
    if (!this.pending.has(id)) return;
    const snapshot = this.pending.get(id)!;
    const generation = this.generation;
    this.pending.delete(id);
    const write = this.save(id, snapshot).catch((error: unknown) => {
      if (generation === this.generation && !this.pending.has(id)) this.pending.set(id, snapshot);
      throw error;
    });
    this.running.set(id, write);
    try {
      await write;
    } finally {
      this.running.delete(id);
    }
    if (this.pending.has(id)) await this.flush(id);
  }

  discard(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.pending.delete(id);
  }
  clear(): void {
    this.generation++;
    for (const id of this.pending.keys()) this.discard(id);
  }
}
