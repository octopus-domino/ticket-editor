import { SimpleStore } from '@/shared/store/store';

export interface SelectionState {
  selectedIds: string[];
}

export class SelectionStore extends SimpleStore<SelectionState> {
  constructor() { super({ selectedIds: [] }); }

  select(id: string, multi = false) {
    this.setState((s) => ({
      selectedIds: multi
        ? (s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id])
        : [id],
    }));
  }

  toggle(id: string) {
    this.setState((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    }));
  }

  setIds(ids: string[]) {
    // getState() вместо this.state — state в SimpleStore объявлен private.
    const prev = this.getState().selectedIds;
    // Если массивы равны по длине и элементам — не триггерим ререндер
    if (
      prev.length === ids.length &&
      prev.every((v, i) => v === ids[i])
    ) {
      return;
    }
    this.setState({ selectedIds: ids });
  }

  clear() { this.setIds([]); }
}