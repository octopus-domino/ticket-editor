/* ============================================================
   presentation/stores/GraphicsStore.ts

   Кросс-документные библиотеки: Graphic Styles и Symbols.
   Хранятся в localStorage, доступны во всех документах редактора.
   ============================================================ */

import { SimpleStore } from '@/shared/store/store';
import type { GraphicStyle, SymbolDef } from '@/shared/types';
import { generateIdWithPrefix } from '@/shared/utils/id';
import { logger } from '@/shared/logger';

const STORAGE_KEY = 'ticket-editor:graphics:v1';

export interface GraphicsState {
  styles: GraphicStyle[];
  symbols: SymbolDef[];
}

function loadFromStorage(): GraphicsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { styles: [], symbols: [] };
    const parsed = JSON.parse(raw);
    return {
      styles: Array.isArray(parsed.styles) ? parsed.styles : [],
      symbols: Array.isArray(parsed.symbols) ? parsed.symbols : [],
    };
  } catch (err) {
    logger.warn('graphics.load_failed', { error: String(err) });
    return { styles: [], symbols: [] };
  }
}

function saveToStorage(state: GraphicsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    logger.warn('graphics.save_failed', { error: String(err) });
  }
}

export class GraphicsStore extends SimpleStore<GraphicsState> {
  constructor() {
    super(loadFromStorage());
    this.subscribe(() => saveToStorage(this.getState()));
  }

  /* ---------- Styles ---------- */

  addStyle(
    name: string,
    fills: GraphicStyle['fills'],
    strokes: GraphicStyle['strokes'],
  ): string {
    const style: GraphicStyle = {
      id: generateIdWithPrefix('style'),
      name,
      fills,
      strokes,
    };
    this.setState(s => ({ ...s, styles: [...s.styles, style] }));
    return style.id;
  }

  removeStyle(id: string): void {
    this.setState(s => ({
      ...s,
      styles: s.styles.filter(st => st.id !== id),
    }));
  }

  /* ---------- Symbols ---------- */

  addSymbol(name: string, prototype: SymbolDef['prototype']): string {
    const symbol: SymbolDef = {
      id: generateIdWithPrefix('sym'),
      name,
      prototype,
    };
    this.setState(s => ({ ...s, symbols: [...s.symbols, symbol] }));
    return symbol.id;
  }

  removeSymbol(id: string): void {
    this.setState(s => ({
      ...s,
      symbols: s.symbols.filter(sym => sym.id !== id),
    }));
  }

  getSymbol(id: string): SymbolDef | null {
    return this.getState().symbols.find(s => s.id === id) ?? null;
  }

  /**
   * Обновить прототип существующего символа.
   * Все инстансы на холсте, ссылающиеся на этот symbol.id,
   * мгновенно перерисуются (подписка в ElementRenderer).
   */
  updateSymbol(id: string, prototype: SymbolDef['prototype']): void {
    this.setState(s => ({
      ...s,
      symbols: s.symbols.map(sym =>
        sym.id === id ? { ...sym, prototype } : sym,
      ),
    }));
  }
}