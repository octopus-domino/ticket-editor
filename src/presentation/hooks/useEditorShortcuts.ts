import { useEffect } from 'react';
import type { DocumentStore, DocumentState } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '../stores/SelectionStore';
import type { ModalsStore } from '../stores/ModalsStore';
import type { GroupElement } from '@/shared/types';
import { generateIdWithPrefix } from '@/shared/utils/id';
import { matches, type KeySpec } from './shortcuts';

interface Args {
  docStore: DocumentStore;
  selStore: SelectionStore;
  modalsStore: ModalsStore;
  clipboardActions: {
    copy: (elements: any[]) => void;
    cut: (elements: any[]) => void;
    paste: () => void;
    duplicate: (elements: any[]) => void;
  };
}

interface Handler {
  spec: KeySpec;
  handle(e: KeyboardEvent): void;
}

const isEditable = (el: EventTarget | null): boolean => {
  const h = el as HTMLElement | null;
  if (!h) return false;
  return (
    h.isContentEditable ||
    h.tagName === 'INPUT' ||
    h.tagName === 'TEXTAREA' ||
    h.tagName === 'SELECT'
  );
};

export function useEditorShortcuts({ docStore, selStore, modalsStore, clipboardActions }: Args) {
  useEffect(() => {
    const groupSelection = (): void => {
      const ids = selStore.getState().selectedIds;
      if (ids.length < 2) return;
      
      docStore.commit((draft: DocumentState) => {
        const s = draft.slides.find((x) => x.id === draft.activeId);
        if (!s) return;
        
        const selected = s.elements.filter(e => ids.includes(e.id));
        if (selected.length < 2) return;

        const minX = Math.min(...selected.map(e => e.x));
        const minY = Math.min(...selected.map(e => e.y));
        const maxX = Math.max(...selected.map(e => e.x + e.width));
        const maxY = Math.max(...selected.map(e => e.y + e.height));

        const group: GroupElement = {
          id: generateIdWithPrefix('group'),
          type: 'group',
          x: minX, y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
          children: ids,
        };
        
        s.elements.push(group);
      }, 'group');
      
      const newGroup = docStore.getState().slides.find(x => x.id === docStore.getState().activeId)?.elements.slice(-1)[0];
      if (newGroup && newGroup.type === 'group') {
        selStore.setIds([newGroup.id, ...(newGroup as GroupElement).children]);
      }
    };

    const ungroupSelection = (): void => {
      const state = docStore.getState();
      const slide = state.slides.find(x => x.id === state.activeId);
      if (!slide) return;

      const ids = selStore.getState().selectedIds;
      const groupId = ids.find(id => {
        const el = slide.elements.find(e => e.id === id);
        return el?.type === 'group';
      });
      
      if (!groupId) return;
      
      docStore.commit((draft: DocumentState) => {
        const s = draft.slides.find((x) => x.id === draft.activeId);
        if (!s) return;
        s.elements = s.elements.filter(e => e.id !== groupId);
      }, 'ungroup');
      selStore.clear();
    };

    const getSelectedElements = () => {
      const state = docStore.getState();
      const slide = state.slides.find(x => x.id === state.activeId);
      if (!slide) return [];
      const ids = selStore.getState().selectedIds;
      return slide.elements.filter(e => ids.includes(e.id));
    };

    const handlers: Handler[] = [
      { spec: { key: 'Escape' }, handle: () => selStore.clear() },
      {
        spec: { key: 'Delete' },
        handle: (e) => {
          const ids = selStore.getState().selectedIds;
          if (!ids.length) return;
          e.preventDefault();
          docStore.commit((draft: DocumentState) => {
            const s = draft.slides.find((x) => x.id === draft.activeId);
            if (!s) return;
            s.elements = s.elements.filter(el => !ids.includes(el.id));
          });
          selStore.clear();
        },
      },
      {
        spec: { key: 'Backspace' },
        handle: (e) => {
          const ids = selStore.getState().selectedIds;
          if (!ids.length) return;
          e.preventDefault();
          docStore.commit((draft: DocumentState) => {
            const s = draft.slides.find((x) => x.id === draft.activeId);
            if (!s) return;
            s.elements = s.elements.filter(el => !ids.includes(el.id));
          });
          selStore.clear();
        },
      },
      { spec: { code: 'KeyZ', ctrl: true, shift: false }, handle: (e) => { e.preventDefault(); docStore.undo(); } },
      { spec: { code: 'KeyY', ctrl: true }, handle: (e) => { e.preventDefault(); docStore.redo(); } },
      { spec: { code: 'KeyZ', ctrl: true, shift: true }, handle: (e) => { e.preventDefault(); docStore.redo(); } },
      {
        spec: { code: 'KeyC', ctrl: true },
        handle: (e) => { e.preventDefault(); clipboardActions.copy(getSelectedElements()); }
      },
      {
        spec: { code: 'KeyX', ctrl: true },
        handle: (e) => { e.preventDefault(); clipboardActions.cut(getSelectedElements()); }
      },
      {
        spec: { code: 'KeyV', ctrl: true },
        handle: (e) => { e.preventDefault(); clipboardActions.paste(); }
      },
      {
        spec: { code: 'KeyD', ctrl: true },
        handle: (e) => { e.preventDefault(); clipboardActions.duplicate(getSelectedElements()); }
      },
      { 
        spec: { code: 'KeyG', ctrl: true, shift: false }, 
        handle: (e) => { 
          e.preventDefault(); 
          groupSelection(); 
        } 
      },
      { 
        spec: { code: 'KeyG', ctrl: true, shift: true }, 
        handle: (e) => { 
          e.preventDefault(); 
          ungroupSelection(); 
        } 
      },
    ];

    const onKey = (e: KeyboardEvent): void => {
      const ms = modalsStore.getState();
      if (ms.stampEditorTarget || ms.diagramEditorTarget) return;
      if (isEditable(e.target) && !ms.editing) return;

      for (const h of handlers) {
        if (matches(e, h.spec)) {
          h.handle(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [docStore, selStore, modalsStore, clipboardActions]);
}