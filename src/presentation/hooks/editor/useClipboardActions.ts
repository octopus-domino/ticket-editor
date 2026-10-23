import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '../../stores/SelectionStore';
import type { ModalsStore } from '../../stores/ModalsStore';
import type { CanvasElement } from '@/shared/types';
import { generateId } from '@/shared/utils/id';

export function useClipboardActions(
  docStore: DocumentStore,
  selStore: SelectionStore,
  modalsStore: ModalsStore,
) {
  const copy = useCallback((elements: CanvasElement[]) => {
    const copyable = elements.filter((e) => e.type !== 'connector');
    if (!copyable.length) return;
    modalsStore.copy(copyable);
  }, [modalsStore]);

  const cut = useCallback((elements: CanvasElement[]) => {
    const ids = elements.map((e) => e.id);
    if (!ids.length) return;
    copy(elements);
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      s.elements = s.elements.filter((el) => {
        if (ids.includes(el.id)) return false;
        if (el.type === 'connector' && (ids.includes(el.fromId) || ids.includes(el.toId))) return false;
        return true;
      });
    }, 'cut');
    selStore.clear();
  }, [docStore, selStore, copy]);

  const paste = useCallback(() => {
    const buf = modalsStore.getClipboard();
    if (!buf.length) return;
    const newIds: string[] = [];
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      for (const el of buf) {
        const clone = JSON.parse(JSON.stringify(el)) as CanvasElement;
        clone.id = generateId();
        clone.x += 20;
        clone.y += 20;
        s.elements.push(clone);
        newIds.push(clone.id);
      }
    }, 'paste');
    selStore.setIds(newIds);
  }, [docStore, selStore, modalsStore]);

  const duplicate = useCallback((elements: CanvasElement[]) => {
    copy(elements);
    paste();
  }, [copy, paste]);

  /* v8: copy/paste как JSON-текст */

  const copyAsJson = useCallback((elements: CanvasElement[]) => {
    if (!elements.length) return;
    const payload = elements.length === 1 ? elements[0] : elements;
    try {
      const json = JSON.stringify(payload, null, 2);
      modalsStore.setClipboardJson(json);
    } catch {
      modalsStore.setClipboardJson(null);
    }
  }, [modalsStore]);

  const pasteFromJson = useCallback((): { ok: boolean; error?: string } => {
    const json = modalsStore.getClipboardJson();
    if (!json) return { ok: false, error: 'Буфер JSON пуст. Сначала «Копировать как JSON».' };
    try {
      const parsed = JSON.parse(json);
      const list: CanvasElement[] = Array.isArray(parsed) ? parsed : [parsed];
      if (!list.length) return { ok: false, error: 'Пустой массив' };
      const newIds: string[] = [];
      docStore.commit((draft) => {
        const s = draft.slides.find((x) => x.id === draft.activeId);
        if (!s) return;
        for (const el of list) {
          const clone = JSON.parse(JSON.stringify(el)) as CanvasElement;
          clone.id = generateId();
          if (typeof clone.x === 'number') clone.x += 20;
          if (typeof clone.y === 'number') clone.y += 20;
          s.elements.push(clone);
          newIds.push(clone.id);
        }
      }, 'paste-json');
      selStore.setIds(newIds);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }, [docStore, selStore, modalsStore]);

  return { copy, cut, paste, duplicate, copyAsJson, pasteFromJson };
}