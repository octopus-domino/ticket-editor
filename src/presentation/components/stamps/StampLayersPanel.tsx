import { t as __tr } from '@/shared/i18n';
import React from 'react';
import type { StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';

type LayerKind = 'shape' | 'text' | 'image';
interface LayerItem { id: string; type: LayerKind; name: string; icon: string; hidden?: boolean; locked?: boolean; }
interface Props {
  shapes: StampShapeItem[]; texts: StampTextItem[]; images?: StampImageItem[];
  selectedId: string | null; selectedType: LayerKind | null;
  onSelect: (id: string, type: LayerKind) => void; onToggleHidden: (id: string, type: LayerKind) => void;
  onToggleLocked: (id: string, type: LayerKind) => void; onDelete: (id: string, type: LayerKind) => void; onReorder: (id: string, type: LayerKind, dir: 1 | -1) => void;
}

export const StampLayersPanel: React.FC<Props> = ({ shapes, texts, images = [], selectedId, selectedType, onSelect, onToggleHidden, onToggleLocked, onDelete, onReorder }) => {
  const items: LayerItem[] = [
    ...texts.map((t) => ({ id: t.id, type: 'text' as const, name: t.name || (t.mode === 'arc' ? __tr("Текст (дуга)") : __tr("Текст")), icon: t.mode === 'arc' ? '◯' : 'T', hidden: t.hidden, locked: t.locked })),
    ...images.map((im) => ({ id: im.id, type: 'image' as const, name: im.name || __tr("Картинка"), icon: '🖼', hidden: im.hidden, locked: im.locked })),
    ...shapes.map((s) => ({ id: s.id, type: 'shape' as const, name: s.name || ({ ellipse: __tr("Эллипс"), rect: __tr("Прямоугольник"), triangle: __tr("Треугольник"), line: __tr("Линия"), circle: __tr("Круг") } as any)[s.kind] || __tr("Фигура"), icon: s.kind === 'ellipse' || s.kind === 'circle' ? '○' : s.kind === 'rect' ? '▭' : s.kind === 'triangle' ? '△' : '╱', hidden: s.hidden, locked: s.locked })),
  ];

  return (
    <div className="stamp-layers">
      <div className="stamp-layers-head">{__tr("Слои (")}{items.length})</div>
      <div className="stamp-layers-list">
        {items.length === 0 && <p className="stamp-editor-empty">{__tr("Пусто. Добавьте фигуру, текст или картинку.")}</p>}
        {items.map((item) => {
          const active = item.id === selectedId && item.type === selectedType;
          return (
            <div key={item.id} className={`stamp-layer ${active ? 'active' : ''} ${item.hidden ? 'hidden' : ''}`} onClick={() => onSelect(item.id, item.type)}>
              <span className="stamp-layer-icon">{item.icon}</span>
              <span className="stamp-layer-name">{item.name}</span>
              <button className="stamp-layer-btn" title={item.hidden ? __tr("Показать") : __tr("Скрыть")} onClick={(e) => { e.stopPropagation(); onToggleHidden(item.id, item.type); }}>{item.hidden ? '👁' : '👁‍🗨'}</button>
              <button className="stamp-layer-btn" title={item.locked ? __tr("Разблокировать") : __tr("Заблокировать")} onClick={(e) => { e.stopPropagation(); onToggleLocked(item.id, item.type); }}>{item.locked ? '🔒' : '🔓'}</button>
              <button className="stamp-layer-btn" title={__tr("Выше")} onClick={(e) => { e.stopPropagation(); onReorder(item.id, item.type, 1); }}>▴</button>
              <button className="stamp-layer-btn" title={__tr("Ниже")} onClick={(e) => { e.stopPropagation(); onReorder(item.id, item.type, -1); }}>▾</button>
              <button className="stamp-layer-btn danger" title={__tr("Удалить")} onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.type); }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};