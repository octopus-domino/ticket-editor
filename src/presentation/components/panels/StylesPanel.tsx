import React from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../../providers/EditorProvider';
import { useGraphicsStore } from '../../providers/EditorProvider';
import type { GraphicStyle } from '@/shared/types';

export const StylesPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const graphicsStore = useGraphicsStore();
  const styles = useStore(graphicsStore, s => s.styles);
  const selectedIds = useStore(selStore, s => s.selectedIds);

  const saveStyle = () => {
    const state = docStore.getState();
    const slide = state.slides.find(s => s.id === state.activeId);
    const firstId = selStore.getState().selectedIds[0];
    const el = slide?.elements.find(e => e.id === firstId);
    if (!el) return;
    const name = prompt('Название стиля:', `Стиль ${styles.length + 1}`);
    if (!name) return;
    const fills = el.appearance?.fills
      ?? ('fill' in el ? [{ id: 'f1', type: 'solid' as const, color: el.fill, opacity: 1 }] : []);
    const strokes = el.appearance?.strokes ?? [];
    graphicsStore.addStyle(name, fills, strokes);
  };

  const applyStyle = (style: GraphicStyle) => {
    const ids = selStore.getState().selectedIds;
    if (!ids.length) return;
    docStore.commit((draft) => {
      const s = draft.slides.find(x => x.id === draft.activeId);
      if (!s) return;
      for (const el of s.elements) {
        if (!ids.includes(el.id)) continue;
        el.appearance = { fills: style.fills, strokes: style.strokes };
        el.styleId = style.id;
      }
    }, `apply-style-${style.id}`);
  };

  return (
    <div>
      <button
        type="button"
        disabled={!selectedIds.length}
        onClick={saveStyle}
        style={{ width: '100%', padding: '6px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
      >
        + Сохранить стиль
      </button>
      {styles.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          Сохраните стиль из выделенного элемента.
        </p>
      )}
      {styles.map(style => (
        <div key={style.id} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 8px', background: '#f8fafc', borderRadius: 5,
          marginBottom: 4, fontSize: 12,
        }}>
          <button
            type="button"
            onClick={() => applyStyle(style)}
            style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 600 }}
          >
            {style.name}
          </button>
          <button
            type="button"
            title="Удалить стиль"
            onClick={() => graphicsStore.removeStyle(style.id)}
            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}
          >×</button>
        </div>
      ))}
    </div>
  );
};