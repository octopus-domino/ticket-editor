import { produce } from 'immer';
import type { Slide, DataRoot } from '../../shared/types';
import { SimpleStore } from '../../shared/store/store';
import { Slide as SlideClass } from '../entities/Slide';

export interface DocumentState {
  slides: Slide[];
  activeId: string;
  data: DataRoot[];
}

interface HistoryEntry {
  state: DocumentState;
  mergeKey?: string;
  timestamp: number;
}

const MAX_HISTORY = 100;
const MERGE_TIMEOUT = 600;

export class DocumentStore extends SimpleStore<DocumentState> {
  private history: HistoryEntry[] = [];
  private historyIndex = -1;

  constructor() {
    const initial = new SlideClass({ name: 'Слайд 1' }).toPlainObject();
    super({
      slides: [initial],
      activeId: initial.id,
      data: [],
    });
    this.pushHistory();
  }

  commit(recipe: (draft: DocumentState) => void, mergeKey?: string) {
    const nextState = produce(this.state, recipe);
    this.setState(nextState);
    this.pushHistory(mergeKey);
  }

  private pushHistory(mergeKey?: string) {
    const now = Date.now();
    const last = this.history[this.historyIndex];

    if (mergeKey && last?.mergeKey === mergeKey && now - last.timestamp < MERGE_TIMEOUT) {
      this.history[this.historyIndex] = { state: this.state, mergeKey, timestamp: now };
      return;
    }

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ state: this.state, mergeKey, timestamp: now });
    if (this.history.length > MAX_HISTORY) this.history.shift();
    else this.historyIndex++;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.setState(this.history[this.historyIndex].state);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.setState(this.history[this.historyIndex].state);
    }
  }

  get canUndo() { return this.historyIndex > 0; }
  get canRedo() { return this.historyIndex < this.history.length - 1; }
}