import React, { useState } from 'react';
import type { EditorApi } from '../../hooks/useEditor';
import type { DocFormat, Padding } from '../../types';
import { FORMATS } from '../../types';
import {
  newText, newShape, newLine, newTable, newFooter, newStamp,
} from '../../lib/factories';
import { BUNDLES } from '../../templates';
import { TYPICAL_LAYOUTS, type TypicalLayout } from '../../templates/typical';

interface Props {
  editor: EditorApi;
}

const ToolSection: React.FC<{
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`tool-section ${open ? 'open' : ''}`}>
      <button className="section-head" onClick={() => setOpen((v) => !v)}>
        <span className="section-ico">{icon}</span>
        <span className="section-title">{title}</span>
        <span className="section-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
};

const PaddingEditor: React.FC<{ value: Padding; onChange: (p: Padding) => void }> = ({ value, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
    <label>Верх<input type="number" min="0" value={value.top} onChange={(e) => onChange({ ...value, top: +e.target.value })} /></label>
    <label>Низ<input type="number" min="0" value={value.bottom} onChange={(e) => onChange({ ...value, bottom: +e.target.value })} /></label>
    <label>Слева<input type="number" min="0" value={value.left} onChange={(e) => onChange({ ...value, left: +e.target.value })} /></label>
    <label>Справа<input type="number" min="0" value={value.right} onChange={(e) => onChange({ ...value, right: +e.target.value })} /></label>
  </div>
);

export const LeftPanel: React.FC<Props> = ({ editor }) => {
  const add = (el: any) => editor.addElementWithHistory(el);

  const startDragNewElement = (e: React.DragEvent, elementType: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'new-element', elementType }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  /** Общая функция сброса состояния при загрузке любого шаблона */
  const resetAfterLoad = () => {
    editor.clearSelection();
    editor.setEditing(null);
    editor.setFloatingPos(null);
    editor.setShowTextToolbar(false);
    editor.setGuides({ v: [], h: [] });
  };

  const applyBundle = (bundleId: string) => {
    const bundle = BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    const { slide, data } = bundle.build();
    editor.setSlides([slide]);
    editor.setActiveId(slide.id);
    editor.setData(data);
    resetAfterLoad();
  };

  const applyLayout = (layout: TypicalLayout) => {
    const slide = layout.build();
    editor.setSlides([slide]);
    editor.setActiveId(slide.id);
    resetAfterLoad();
  };

  return (
    <aside className="tools">
      <ToolSection title="Файл" icon="💾" defaultOpen>
        <button className="tool-btn" onClick={editor.importJson}>📥 Импорт шаблона (JSON)</button>
        <button className="tool-btn" onClick={editor.exportJson}>📤 Экспорт шаблона (JSON)</button>
        <button className="tool-btn" onClick={editor.exportSvg}>🖨 Экспорт страницы в SVG</button>
      </ToolSection>

      <ToolSection title="Типовые макеты" icon="🧩" defaultOpen>
        {TYPICAL_LAYOUTS.map((t) => (
          <button
            key={t.id}
            className="tool-btn"
            onClick={() => applyLayout(t)}
            title={t.description}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </ToolSection>

      <ToolSection title="Готовые документы" icon="📚" defaultOpen={false}>
        {BUNDLES.map((b) => (
          <button
            key={b.id}
            className="tool-btn"
            onClick={() => applyBundle(b.id)}
            title={b.description}
          >
            {b.icon} {b.name}
          </button>
        ))}
      </ToolSection>

      <ToolSection title="Формат" icon="📄" defaultOpen={false}>
        <label className="field-label">Размер</label>
        <select
          value={editor.activeSlide.format}
          onChange={(e) => editor.changeFormat(e.target.value as DocFormat)}
          className="field"
        >
          {Object.entries(FORMATS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <label className="field-label">Ориентация</label>
        <div className="segmented">
          <button className={editor.activeSlide.orientation === 'portrait' ? 'active' : ''}
            onClick={() => editor.changeOrientation('portrait')}>Книжная</button>
          <button className={editor.activeSlide.orientation === 'landscape' ? 'active' : ''}
            onClick={() => editor.changeOrientation('landscape')}>Альбомная</button>
        </div>

        {editor.activeSlide.format === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <label className="field-label">Ширина
              <input className="field" type="number" min="50"
                value={editor.customSize.w}
                onChange={(e) => editor.changeCustomSize(+e.target.value, editor.customSize.h)} />
            </label>
            <label className="field-label">Высота
              <input className="field" type="number" min="50"
                value={editor.customSize.h}
                onChange={(e) => editor.changeCustomSize(editor.customSize.w, +e.target.value)} />
            </label>
          </div>
        )}

        <div className="hint-sm">{editor.activeSlide.width} × {editor.activeSlide.height} px</div>

        <h4 style={{ margin: '10px 0 4px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>
          Отступы страницы
        </h4>
        <PaddingEditor
          value={editor.activeSlide.padding}
          onChange={(p) => editor.updateSlide({ padding: p })}
        />

        <label className="check-row" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={editor.showMargins} onChange={(e) => editor.setShowMargins(e.target.checked)} />
          <span>Показывать границу</span>
        </label>
      </ToolSection>

      <ToolSection title="Медиа" icon="🖼" defaultOpen={false}>
        <button className="tool-btn" onClick={editor.addImage}>🖼 Загрузить картинку</button>
        <button className="tool-btn" onClick={editor.setBackgroundImage}>🌄 Загрузить фон</button>
        <button className="tool-btn danger" onClick={editor.removeBackgroundImage}
          disabled={!editor.activeSlide.backgroundImage}>✕ Убрать фон</button>
      </ToolSection>

      <ToolSection title="Добавить (перетащите на холст)" icon="➕" defaultOpen={false}>
        <div className="tool-grid">
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'text')} onClick={() => add(newText())}>
            <span className="tile-ico">📝</span><span>Текст</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'footer')} onClick={() => add(newFooter())}>
            <span className="tile-ico">▬</span><span>Футер</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'table')} onClick={() => add(newTable())}>
            <span className="tile-ico">▦</span><span>Таблица</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'line')} onClick={() => add(newLine())}>
            <span className="tile-ico">➖</span><span>Линия</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'line-arrow')}
            onClick={() => { const l = newLine(); l.isArrow = true; add(l); }}>
            <span className="tile-ico">➤</span><span>Стрелка</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'rect')} onClick={() => add(newShape('rect'))}>
            <span className="tile-ico">▭</span><span>Прямоуг.</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'roundRect')} onClick={() => add(newShape('roundRect'))}>
            <span className="tile-ico">▢</span><span>Скругл.</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'circle')} onClick={() => add(newShape('circle'))}>
            <span className="tile-ico">⬤</span><span>Круг</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'triangle')} onClick={() => add(newShape('triangle'))}>
            <span className="tile-ico">△</span><span>Треуг.</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'star')} onClick={() => add(newShape('star'))}>
            <span className="tile-ico">★</span><span>Звезда</span>
          </button>
        </div>

        <label className="field-label" style={{ marginTop: 10 }}>Штампы</label>
        <div className="tool-grid">
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'stamp-circle')} onClick={() => add(newStamp('circle'))}>
            <span className="tile-ico">◯</span><span>Круглый</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'stamp-oval')} onClick={() => add(newStamp('oval'))}>
            <span className="tile-ico">⬭</span><span>Овал</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'stamp-rect')} onClick={() => add(newStamp('rect'))}>
            <span className="tile-ico">▭</span><span>Прямоуг.</span>
          </button>
          <button className="tool-tile" draggable onDragStart={(e) => startDragNewElement(e, 'stamp-triangle')} onClick={() => add(newStamp('triangle'))}>
            <span className="tile-ico">△</span><span>Треуг.</span>
          </button>
        </div>
      </ToolSection>

      <ToolSection title="Заливка областей" icon="🪣" defaultOpen={false}>
        <label className="check-row">
          <input type="checkbox" checked={editor.fillMode} onChange={(e) => editor.setFillMode(e.target.checked)} />
          <span>Режим заливки</span>
        </label>
        <label className="field-label">Цвет заливки</label>
        <input type="color" className="field" value={editor.fillColor} onChange={(e) => editor.setFillColor(e.target.value)} />
        <p className="hint-sm">
          Клик по фигуре заливает её.<br />
          Клики по пустому месту — рисуют полигон.<br />
          Enter / двойной клик — замкнуть.<br />
          Esc — отменить.
        </p>
      </ToolSection>

      <ToolSection title="Вид" icon="⚙" defaultOpen={false}>
        <label className="check-row">
          <input type="checkbox" checked={editor.showGrid} onChange={(e) => editor.setShowGrid(e.target.checked)} />
          <span>Показать сетку</span>
        </label>
        <div className="row-2">
          <button className="tool-btn" onClick={editor.undo} disabled={!editor.canUndo}>↶ Отменить</button>
          <button className="tool-btn" onClick={editor.redo} disabled={!editor.canRedo}>↷ Повторить</button>
        </div>
      </ToolSection>
    </aside>
  );
};