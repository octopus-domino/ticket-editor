/* ============================================================
   presentation/stores/HoverStore.ts

   REG-B3, NFR-PERF-01: hover не должен триггерить ререндер Canvas.
   Микро-store вне React, подписка — useSyncExternalStore
   в CanvasPreviewLayer.
   ============================================================ */

export class HoverStore {
  private hoveredId: string | null = null;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = (): string | null => this.hoveredId;

  set(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.listeners.forEach((l) => l());
  }

  clear(): void { this.set(null); }
}

export const hoverStore = new HoverStore();