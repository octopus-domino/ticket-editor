export class DragLiveStore {
  private positions: Record<string, { x: number; y: number }> = {};
  private listeners = new Set<() => void>();
  private version = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = () => this.version;

  get(id: string): { x: number; y: number } | undefined {
    return this.positions[id];
  }

  set(positions: Record<string, { x: number; y: number }>) {
    let changed = false;
    const keysA = Object.keys(this.positions);
    const keysB = Object.keys(positions);

    if (keysA.length !== keysB.length) {
      changed = true;
    } else {
      for (const k of keysB) {
        const a = this.positions[k];
        const b = positions[k];
        if (!a || a.x !== b.x || a.y !== b.y) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) return;

    this.positions = positions;
    this.version++;
    this.listeners.forEach((l) => l());
  }

  clear() {
    if (Object.keys(this.positions).length === 0) return;
    this.positions = {};
    this.version++;
    this.listeners.forEach((l) => l());
  }
}

export const dragLiveStore = new DragLiveStore();