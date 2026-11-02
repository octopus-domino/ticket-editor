/* ============================================================
   infrastructure/state/DocumentStore.ts
   ============================================================ */

import { produce, type Draft } from 'immer';
import { SimpleStore } from '@/shared/store/store';
import type { Slide, DataRoot } from '@/shared/types';
import { createSlide } from '@/domain/slide/operations';
import { fixGroupBoundsInPlace } from '@/lib/migrations';
import { getByPath } from '@/lib/path';

export interface DocumentState {
  slides: Slide[];
  activeId: string;
  data: DataRoot[];
  historyVersion: number;
}

export type Mutator = (draft: Draft<DocumentState>) => void;

export interface InitialDocument {
  slides: Slide[];
  data: DataRoot[];
  activeId: string;
}

interface HistoryEntry {
  state: DocumentState;
  bytes: number;
  mergeKey?: string;
  timestamp: number;
}

const MAX_HISTORY = 100;
const MAX_HISTORY_BYTES = 80 * 1024 * 1024;
const MERGE_TIMEOUT_MS = 600;

function estimateBytes(state: DocumentState): number {
  let total = 1024;
  for (const slide of state.slides) {
    total += 512;
    total += slide.elements.length * 512;
  }
  for (const root of state.data) {
    total += 128;
  }
  return total;
}

export class DocumentStore extends SimpleStore<DocumentState> {
  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private historyBytes = 0;

  constructor(initial?: InitialDocument) {
    if (initial && initial.slides.length > 0) {
      super({
        slides: initial.slides,
        activeId: initial.activeId || initial.slides[0].id,
        data: initial.data || [],
        historyVersion: 0,
      });
      this.fixAllGroupBounds();
    } else {
      const slide = createSlide(1);
      super({
        slides: [slide],
        activeId: slide.id,
        data: [],
        historyVersion: 0,
      });
    }
    this.pushHistory();
  }

  commit(mutator: Mutator, mergeKey?: string): void {
    const prev = this.getState();
    const next = produce(prev, (draft) => { mutator(draft); });
    if (next === prev) return;
    this.setState(next);
    this.pushHistory(mergeKey);
  }

  /**
   * Применяет значения модели ко всем PlaceholderElement на холсте.
   * Использует getByPath — поддерживает array-index: event.items[0].code.
   */
  applyModelToSlides(values: Record<string, unknown>): void {
    this.commit((draft) => {
      for (const slide of draft.slides) {
        for (const el of slide.elements) {
          if (el.type !== 'placeholder') continue;
          const v = getByPath(values, el.fieldPath);
          if (v !== undefined && v !== null) {
            el.sample = String(v);
          }
        }
      }
    }, 'apply-model');
  }

  setStateForDrag(mutator: Mutator): void {
    const prev = this.getState();
    const next = produce(prev, mutator);
    if (next === prev) return;
    this.setState(next);
  }

  fixAllGroupBounds(): void {
    this.setStateForDrag((draft) => {
      for (const slide of draft.slides) {
        fixGroupBoundsInPlace(slide.elements as any[]);
      }
    });
  }

  commitSnapshot(): void {
    this.pushHistory();
  }

  private pushHistory(mergeKey?: string): void {
    const now = Date.now();
    const last = this.history[this.historyIndex];
    const approxBytes = 4096;

    if (mergeKey && last?.mergeKey === mergeKey && now - last.timestamp < MERGE_TIMEOUT_MS) {
      this.history[this.historyIndex] = {
        state: this.getState(),
        bytes: approxBytes,
        mergeKey,
        timestamp: now,
      };
      this.bumpHistoryVersion();
      return;
    }

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      state: this.getState(),
      bytes: approxBytes,
      mergeKey,
      timestamp: now,
    });
    this.historyBytes += approxBytes;

    if (this.history.length > MAX_HISTORY) {
      const removed = this.history.shift();
      if (removed) {
        this.historyBytes -= removed.bytes;
        this.historyIndex--;
      }
    } else {
      this.historyIndex++;
    }
    this.bumpHistoryVersion();
    setTimeout(() => this.recalculateHistoryBytes(), 0);
  }

  private recalculateHistoryBytes(): void {
    let total = 0;
    for (const entry of this.history) {
      const b = estimateBytes(entry.state);
      entry.bytes = b;
      total += b;
    }
    this.historyBytes = total;
    this.trimHistoryBytes();
  }

  private trimHistoryBytes(): void {
    while (this.historyBytes > MAX_HISTORY_BYTES && this.history.length > 1) {
      const removed = this.history.shift();
      if (removed) {
        this.historyBytes -= removed.bytes;
        if (this.historyIndex > 0) this.historyIndex--;
      }
    }
  }

  private bumpHistoryVersion(): void {
    this.setState((prev) => ({ ...prev, historyVersion: prev.historyVersion + 1 }));
  }

  undo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.setState({
      ...this.history[this.historyIndex].state,
      historyVersion: this.getState().historyVersion + 1,
    });
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.setState({
      ...this.history[this.historyIndex].state,
      historyVersion: this.getState().historyVersion + 1,
    });
  }

  get canUndo(): boolean { return this.historyIndex > 0; }
  get canRedo(): boolean { return this.historyIndex < this.history.length - 1; }
}