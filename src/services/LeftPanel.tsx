import React, { useState } from 'react';
import type { DocFormat, Padding } from '../../types';
import { FORMATS } from '../../types';
import {
  newText, newSimpleText, newShape, newLine, newTable, newFooter, newStamp,
} from '../../lib/factories';
import { BUNDLES } from '../../templates';
import { TYPICAL_LAYOUTS, type TypicalLayout } from '../../templates/typical';
import { StampLibraryPanel } from '../stamps/StampLibraryPanel';

import { useSlidesContext } from '../../editor/contexts/SlidesContext';
import { useSelectionContext } from '../../editor/contexts/SelectionContext';
import { useViewContext } from '../../editor/contexts/ViewContext';
import { useActionsContext } from '../../editor/contexts/ActionsContext';
import { useModalsContext } from '../../editor/contexts/ModalsContext';
import { useDataContext } from '../../editor/contexts/DataContext';
import { useFillModeContext } from '../../editor/contexts/FillModeContext';

const ToolSection: React.FC<{
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = false, children }) => {
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
    <div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Верх</div>
      <input type="number" min="0" value={value.top} onChange={(e) => onChange({ ...value, top: +e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: 12 }} />
    </div>
    <div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Низ</div>
      <input type="number" min="0" value={value.bottom} onChange={(e) => onChange({ ...value, bottom: +e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: 12 }} />
    </div>
    <div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Слева</div>
      <input type="number" min="0" value={value.left} onChange={(e) => onChange({ ...value, left: +e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: 12 }} />
    </div>
    <div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Справа</div>
      <input type="number" min="0" value={value.right} onChange={(e) => onChange({ ...value, right: +e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: 12 }} />
    </div>
  </div>
);

type ServerExportKind = null | 'svg' | 'pdfa';

const LeftPanelInner: React.FC = () => {
  const slides = useSlidesContext();
  const selection = useSelectionContext();
  const view = useViewContext();
  const actions = useActionsContext();
  const modals = useModalsContext();
  const data = useDataContext();
  const fillMode = useFillModeContext();

  const [busy, setBusy] = useState<ServerExportKind>(null);

  const add = (el: any) => actions.addElementWithHistory(el);

  const startDragNewElement = (e: React.DragEvent, elementType: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'new-element', elementType }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const resetAfterLoad = () => {
    selection.clearSelection();
    modals.setEditing(null);
    modals.setFloatingPos(null);
    modals.setShowTextToolbar(false);
    view.setGuides({ v: [], h: [] });
  };

  const applyBundle = (bundleId: string) => {
    const bundle = BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    const { slide, data: bundleData } = bundle.build();
    slides.setSlides([slide]);
    slides.setActiveId(slide.id);
    data.setData(bundleData);
    resetAfterLoad();
  };

  const applyLayout = (layout: TypicalLayout) => {
    const slide = layout.build();
    slides.setSlides([slide]);
    slides.setActiveId(slide.id);
    resetAfterLoad();
  };

  const handleServerSvg = async () => {
    setBusy('svg');
    try {
      await actions.exportSvgServer();
    } catch (err) {
      alert(`SVG экспорт не удался: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleServerPdfa = async () => {
    setBusy('pdfa');
    try {
      await actions.exportPdfaServer();
    } catch (err) {
      alert(`PDF/A экспорт не удался: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="tools">
      <ToolSection title="Файл" icon="📁" defaultOpen>
        <button className="tool-btn" onClick={actions.importJson}>📥 Импорт шаблона (JSON)</button>
        <button className="tool-btn" onClick={actions.exportJson}>📤 Экспорт шаблона (JSON)</button>

        <div style={{ height: 10 }} />

        <button
          className="tool-btn"
          onClick={handleServerSvg}
          disabled={busy !== null}
        >
          {busy === 'svg' ? '⏳ Генерация SVG…' : '🖼 SVG (вектор, сервер)'}
        </button>

        <button
          className="tool-btn"
          onClick={handleServerPdfa}
          disabled={busy !== null}
        >
          {busy === 'pdfa' ? '⏳ Генерация PDF/A…' : '📄 PDF/A (типография)'}
        </button>

        <div style={{ height: 10 }} />

        <button className="tool-btn" onClick={actions.exportSvg}>
          🖼 SVG (локально, fallback)
        </button>
      </ToolSection>

      <ToolSection title="Макеты" icon="🧩">
        {TYPICAL_LAYOUTS.map((t) => (
          <button key={t.id} className="tool-btn" onClick={() => applyLayout(t)} title={t.description}>
            {t.icon} {t.name}
          </button>
        ))}
      </ToolSection>

      <ToolSection title="Готовые документы" icon="📚">
        {BUNDLES.map((b) => (
          <button key={b.id} className="tool-btn" onClick={() => applyBundle(b.id)} title={b.description}>
            {b.icon} {b.name}
          </button>
        ))}
      </ToolSection>

      <ToolSection title="Формат" icon="📐">
        <label className="field-label">Размер</label>
        <select
          value={slides.activeSlide.format}
          onChange={(e) => slides.changeFormat(e.target.value as DocFormat)}
          className="field"
        >
          {Object.entries(FORMATS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <label className="field-label">Ориентация</label>
        <div className="segmented">
          <button
            className={slides.activeSlide.orientation === 'portrait' ? 'active' : ''}
            onClick={() => slides.changeOrientation('portrait')}
          >
            Книжная
          </button>
          <button
            className={slides.activeSlide.orientation === 'landscape' ? 'active' : ''}
            onClick={() => slides.changeOrientation('landscape')}
          >
            Альбомная
          </button>
        </div>

        {slides.activeSlide.format === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <label className="field-label">Ширина
              <input
                className="field"
                type="number"
                min="50"
                value={slides.customSize.w}
                onChange={(e) => slides.changeCustomSize(+e.target.value, slides.customSize.h)}
              />
            </label>
            <label className="field-label">Высота
              <input
                className="field"
                type="number"
                min="50"
                value={slides.customSize.h}
                onChange={(e) => slides.changeCustomSize(slides.customSize.w, +e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="hint-sm">{slides.activeSlide.width} × {slides.activeSlide.height} px</div>

        <h4 style={{ margin: '10px 0 4px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>
          Отступы страницы
        </h4>
        <PaddingEditor
          value={slides.activeSlide.padding}
          onChange={(p) => slides.updateSlide({ padding: p })}
        />

        <label className="check-row" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={view.showMargins}
            onChange={(e) => view.setShowMargins(e.target.checked)}
          />
          <span>Показать границы</span>
        </label>
      </ToolSection>

      <ToolSection title="Медиа" icon="🖼">
        <button className="tool-btn" onClick={() => actions.addImage()}>🖼 Загрузить картинку</button>
        <button className="tool-btn" onClick={actions.setBackgroundImage}>🌄 Загрузить фон</button>
        <button
          className="tool-btn danger"
          onClick={actions.removeBackgroundImage}
          disabled={!slides.activeSlide.backgroundImage}
        >
          ✕ Убрать фон
        </button>
      </ToolSection>

      <ToolSection title="Добавить (перетащите на холст)" icon="➕" defaultOpen>
        <div className="tool-grid">
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'text')}
            onClick={() => add(newText())}>
            <span className="tile-ico">📝</span><span>Rich</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'simple-text')}
            onClick={() => add(newSimpleText())}>
            <span className="tile-ico">A</span><span>Текст</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'footer')}
            onClick={() => add(newFooter(slides.activeSlide))}>
            <span className="tile-ico">▬</span><span>Футер</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'table')}
            onClick={() => add(newTable())}>
            <span className="tile-ico">▦</span><span>Таблица</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'line')}
            onClick={() => add(newLine())}>
            <span className="tile-ico">╱</span><span>Линия</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'line-arrow')}
            onClick={() => { const l = newLine(); l.isArrow = true; add(l); }}>
            <span className="tile-ico">↗</span><span>Стрелка</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'rect')}
            onClick={() => add(newShape('rect'))}>
            <span className="tile-ico">▭</span><span>Прямоуг.</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'roundRect')}
            onClick={() => add(newShape('roundRect'))}>
            <span className="tile-ico">▢</span><span>Округл.</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'circle')}
            onClick={() => add(newShape('circle'))}>
            <span className="tile-ico">●</span><span>Круг</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'triangle')}
            onClick={() => add(newShape('triangle'))}>
            <span className="tile-ico">▲</span><span>Треуг.</span>
          </button>
          <button className="tool-tile" draggable
            onDragStart={(e) => startDragNewElement(e, 'star')}
            onClick={() => add(newShape('star'))}>
            <span className="tile-ico">★</span><span>Звезда</span>
          </button>
        </div>
      </ToolSection>

            <ToolSection title="Штампы" icon="📮">
        <StampLibraryPanel />
      </ToolSection>

      <ToolSection title="Заливка областей" icon="🎨">
        <label className="check-row">
          <input
            type="checkbox"
            checked={fillMode.fillMode}
            onChange={(e) => fillMode.setFillMode(e.target.checked)}
          />
          <span>Режим заливки</span>
        </label>
        <label className="field-label">Цвет заливки</label>
        <input
          type="color"
          className="field"
          value={fillMode.fillColor}
          onChange={(e) => fillMode.setFillColor(e.target.value)}
        />
        <p className="hint-sm">
          Клик по фигуре заливает её.<br />
          Клики по пустому месту — точки полигона.<br />
          Enter / двойной клик — замкнуть.<br />
          Esc — отменить.
        </p>
      </ToolSection>

      <ToolSection title="Вид" icon="⚙">
        <label className="check-row">
          <input
            type="checkbox"
            checked={view.showGrid}
            onChange={(e) => view.setShowGrid(e.target.checked)}
          />
          <span>Показать сетку</span>
        </label>
        <div className="row-2">
          <button className="tool-btn" onClick={actions.undo} disabled={!actions.canUndo}>
            ↶ Отменить
          </button>
          <button className="tool-btn" onClick={actions.redo} disabled={!actions.canRedo}>
            ↷ Повторить
          </button>
        </div>
      </ToolSection>
    </aside>
  );
};

export const LeftPanel = React.memo(LeftPanelInner);