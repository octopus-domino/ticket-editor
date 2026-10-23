/* ============================================================
   GuidesStore.ts
   Микро-стор для линий прилипания.
   Изменение этого стора НЕ вызывает ререндер Canvas,
   а обновляет только компонент GuidesLayer.
   ============================================================ */

export class GuidesStore {
  private state = { v: [] as number[], h: [] as number[] };
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = () => this.state;

  set = (v: number[], h: number[]) => {
    // Предотвращаем лишние вызовы, если линии не изменились
    if (this.state.v.length === v.length && this.state.h.length === h.length) {
      let same = true;
      for (let i = 0; i < v.length; i++) if (this.state.v[i] !== v[i]) { same = false; break; }
      if (same) for (let i = 0; i < h.length; i++) if (this.state.h[i] !== h[i]) { same = false; break; }
      if (same) return;
    }
    this.state = { v, h };
    this.listeners.forEach(l => l());
  };

  clear = () => this.set([], []);
}

export const guidesStore = new GuidesStore();