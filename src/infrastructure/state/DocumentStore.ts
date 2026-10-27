/* ============================================================
   infrastructure/state/DocumentStore.ts
   F-H-01..07, I-05, I-13, F-DATA-07, F-DATA-11.
   NFR-MEM-02, REG-P6: лимит истории и по кол-ву, и по байтам.
   ============================================================ */

import { produce, type Draft } from 'immer';
import { SimpleStore } from '@/shared/store/store';
import type {
  Slide, DataRoot, DataField, PlaceholderElement,
} from '@/shared/types';
import { createSlide } from '@/domain/slide/operations';
import { generateId } from '@/shared/utils/id';
import { fixGroupBoundsInPlace } from '@/lib/migrations';

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

function createDefaultData(): DataRoot[] {
  return [
    {
      id: generateId(),
      name: 'event',
      fields: [
        { id: generateId(), name: 'title',    type: 'string', sample: 'ГАЛА-КОНЦЕРТ' },
        { id: generateId(), name: 'subtitle', type: 'string', sample: 'Симфонический оркестр' },
        { id: generateId(), name: 'day',      type: 'string', sample: '15' },
        { id: generateId(), name: 'month',    type: 'string', sample: 'МАРТА' },
        { id: generateId(), name: 'time',     type: 'string', sample: '19:00' },
        { id: generateId(), name: 'venue',    type: 'string', sample: 'Большой театр' },
        { id: generateId(), name: 'address',  type: 'string', sample: 'Театральная пл., 1' },
      ],
    },
    {
      id: generateId(),
      name: 'ticket',
      fields: [
        { id: generateId(), name: 'row',    type: 'string', sample: '12' },
        { id: generateId(), name: 'seat',   type: 'string', sample: '8' },
        { id: generateId(), name: 'sector', type: 'string', sample: 'Партер' },
        { id: generateId(), name: 'price',  type: 'string', sample: '4500 ₽' },
      ],
    },
    {
      id: generateId(),
      name: 'applicant',
      fields: [
        { id: generateId(), name: 'fio',     type: 'string', sample: 'Иванов Иван Иванович' },
        { id: generateId(), name: 'address', type: 'string', sample: 'г. Москва, ул. Пушкина, д. 1' },
        { id: generateId(), name: 'phone',   type: 'string', sample: '+7 (999) 123-45-67' },
      ],
    },
  ];
}

function estimateBytes(state: DocumentState): number {
  let total = 1024;
  for (const slide of state.slides) {
    total += 512;
    total += slide.elements.length * 512;
  }
  for (const root of state.data) {
    total += 128;
    const walkFields = (fields: DataField[]): number => {
      let n = 0;
      for (const f of fields) {
        n += 1;
        if (f.children && f.children.length) n += walkFields(f.children);
      }
      return n;
    };
    total += walkFields(root.fields) * 64;
  }
  return total;
}

function resolveSampleFromData(
  data: readonly DataRoot[],
  path: string,
): string | null {
  if (!path) return null;
  const clean = path.replace(/\[\d+\]/g, '');
  const parts = clean.split('.');
  const rootName = parts.shift();
  if (!rootName) return null;
  const root = data.find((d) => d.name === rootName);
  if (!root) return null;

  let fields: readonly DataField[] = root.fields;
  let current: DataField | null = null;
  for (const p of parts) {
    current = fields.find((f) => f.name === p) ?? null;
    if (!current) return null;
    fields = current.children ?? [];
  }
  return current ? current.sample : null;
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
        data: initial.data.length > 0 ? initial.data : createDefaultData(),
        historyVersion: 0,
      });
      // Однократная нормализация групп на случай, если пришли раздутые bounds
      this.fixAllGroupBounds();
    } else {
      const slide = createSlide(1);
      super({
        slides: [slide],
        activeId: slide.id,
        data: createDefaultData(),
        historyVersion: 0,
      });
    }
    this.pushHistory();
  }

  private applySamplesFromData(draft: Draft<DocumentState>): void {
    for (const slide of draft.slides) {
      for (const el of slide.elements) {
        if (el.type !== 'placeholder') continue;
        const placeholder = el as Draft<PlaceholderElement>;
        if (!placeholder.fieldPath) continue;
        const sample =
          resolveSampleFromData(draft.data, placeholder.fieldPath) ?? '';
        if (sample !== placeholder.sample) {
          placeholder.sample = sample;
        }
      }
    }
  }

  commit(mutator: Mutator, mergeKey?: string): void {
    const prev = this.getState();
    const next = produce(prev, (draft) => {
      mutator(draft);
    });
    if (next === prev) return;

    const final =
      next.data !== prev.data
        ? produce(next, (draft) => this.applySamplesFromData(draft))
        : next;

    this.setState(final);
    this.pushHistory(mergeKey);
  }

  setStateForDrag(mutator: Mutator): void {
    const prev = this.getState();
    const next = produce(prev, mutator);
    if (next === prev) return;
    this.setState(next);
  }

  /**
   * Пересчитывает bounds всех групп во всех слайдах.
   * Не пишет в историю — это техническая нормализация данных.
   */
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

  syncSamplesFromData(): void {
    const state = this.getState();
    const next = produce(state, (draft) => this.applySamplesFromData(draft));
    if (next !== state) this.setState(next);
  }

  private pushHistory(mergeKey?: string): void {
    const now = Date.now();
    const last = this.history[this.historyIndex];

    if (
      mergeKey &&
      last?.mergeKey === mergeKey &&
      now - last.timestamp < MERGE_TIMEOUT_MS
    ) {
      const state = this.getState();
      const bytes = estimateBytes(state);
      this.historyBytes += bytes - last.bytes;
      this.history[this.historyIndex] = {
        state,
        bytes,
        mergeKey,
        timestamp: now,
      };
      this.trimHistoryBytes();
      this.bumpHistoryVersion();
      return;
    }

    this.history = this.history.slice(0, this.historyIndex + 1);
    const state = this.getState();
    const bytes = estimateBytes(state);
    this.history.push({ state, bytes, mergeKey, timestamp: now });
    this.historyBytes += bytes;

    if (this.history.length > MAX_HISTORY) {
      const removed = this.history.shift();
      if (removed) {
        this.historyBytes -= removed.bytes;
        this.historyIndex--;
      }
    } else {
      this.historyIndex++;
    }

    this.trimHistoryBytes();
    this.bumpHistoryVersion();
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
    this.setState((prev) => ({
      ...prev,
      historyVersion: prev.historyVersion + 1,
    }));
  }

  undo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    const prev = this.history[this.historyIndex].state;
    this.setState({
      ...prev,
      historyVersion: this.getState().historyVersion + 1,
    });
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    const next = this.history[this.historyIndex].state;
    this.setState({
      ...next,
      historyVersion: this.getState().historyVersion + 1,
    });
  }

  get canUndo(): boolean {
    return this.historyIndex > 0;
  }

  get canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }
}

export function approximateDocumentBytes(state: DocumentState): number {
  return estimateBytes(state);
}