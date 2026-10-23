import React from 'react';
import type { CanvasElement } from '@/shared/types';
import { useStore } from '@/shared/store/store';
import {
  useDocumentStore, useGraphicsStore,
} from '../providers/EditorProvider';
import { useSelectedElement } from '../hooks/useSelectedElement';
import { getElementStrategy } from './elements/registry';
import { Group, L, inputStyle } from './elements/properties/ui';

/* ---------- Секция символа для инстанса ---------- */

const SymbolSection: React.FC<{ el: CanvasElement }> = ({ el }) => {
  const docStore = useDocumentStore();
  const graphicsStore = useGraphicsStore();
  const symbol = useStore(
    graphicsStore,
    React.useCallback(
      (s) => el.symbolId ? s.symbols.find(x => x.id === el.symbolId) ?? null : null,
      [el.symbolId],
    ),
  );

  if (!symbol) return null;

  const handleUpdateFromThis = () => {
    if (!confirm(`Обновить символ «${symbol.name}» из текущего элемента?\n\nВсе экземпляры на холсте будут изменены.`)) return;
    const prototype: CanvasElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: '',
      x: 0, y: 0, rotation: 0,
      symbolId: null,
      styleId: null,
    };
    graphicsStore.updateSymbol(symbol.id, prototype);
  };

  const handleDetach = () => {
    docStore.commit((draft) => {
      const s = draft.slides.find(x => x.id === draft.activeId);
      const target = s?.elements.find(x => x.id === el.id);
      if (target) target.symbolId = null;
    }, 'detach-symbol');
  };

  return (
    <div style={{
      marginBottom: 12, padding: '10px 12px',
      background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 4 }}>
        🔗 Инстанс символа «{symbol.name}»
      </div>
      <div style={{ fontSize: 10.5, color: '#6366f1', marginBottom: 8, lineHeight: 1.4 }}>
        Этот элемент — копия символа. Изменения прототипа отразятся на всех копиях.
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={handleUpdateFromThis}
          style={{
            flex: 1, padding: '5px 8px', fontSize: 11, fontWeight: 600,
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          Обновить символ
        </button>
        <button
          type="button"
          onClick={handleDetach}
          style={{
            flex: 1, padding: '5px 8px', fontSize: 11,
            background: '#fff', border: '1px solid #cbd5e1',
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          Отсоединить
        </button>
      </div>
    </div>
  );
};

/* ---------- Панель свойств ---------- */

export const PropertiesPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const el = useSelectedElement();

  if (!el) {
    return <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>
      Выделите элемент на холсте
    </div>;
  }

  const update = (patch: Partial<CanvasElement>) => {
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      const target = s?.elements.find((x) => x.id === el.id);
      if (target) Object.assign(target, patch);
    }, `update-${el.id}`);
  };

  const strategy = getElementStrategy(el.type);
  const PropsComponent = strategy?.PropertiesPanel;

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      {el.symbolId && <SymbolSection el={el} />}

      <Group title="Положение">
        <L label="X"><input style={inputStyle} type="number" value={Math.round(el.x)} onChange={(e) => update({ x: +e.target.value })} /></L>
        <L label="Y"><input style={inputStyle} type="number" value={Math.round(el.y)} onChange={(e) => update({ y: +e.target.value })} /></L>
        <L label="Ширина"><input style={inputStyle} type="number" value={Math.round(el.width)} onChange={(e) => update({ width: +e.target.value })} /></L>
        <L label="Высота"><input style={inputStyle} type="number" value={Math.round(el.height)} onChange={(e) => update({ height: +e.target.value })} /></L>
        <L label="Поворот"><input style={inputStyle} type="number" value={Math.round(el.rotation)} onChange={(e) => update({ rotation: +e.target.value })} /></L>
      </Group>

      {PropsComponent && <PropsComponent el={el as never} update={update as never} />}
    </div>
  );
};