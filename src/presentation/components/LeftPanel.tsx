import React, { useState } from 'react';
import type { DocFormat, Orientation, Padding, CanvasElement } from '@/shared/types';
import { FORMATS } from '@/shared/constants';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore, useModalsStore } from '../providers/EditorProvider';
import { StampLibraryPanel } from './StampLibraryPanel';
import { changeFormat, changeOrientation } from '@/domain/slide/operations';
import { 
  newText, newSimpleText, newFooter, newTable, newLine, newShape, 
  newPath, newChart, newDiagram 
} from '@/lib/factories';
import { TYPICAL_LAYOUTS, BUNDLES } from '../../templates';
import { useFileIO } from '../hooks/editor/useFileIO';
import { ArrangePanel } from './panels/ArrangePanel';
import { PathfinderPanel } from './panels/PathfinderPanel';
import { GraphToolPanel } from './panels/GraphToolPanel';
import { StylesPanel } from './panels/StylesPanel';
import { SymbolsPanel } from './panels/SymbolsPanel';
import { QrModal } from './QrModal';
import { generateId } from '@/shared/utils/id';

const Section: React.FC<{ title: string; icon?: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`tool-section ${open ? 'open' : ''}`}>
      <button type="button" className="section-head" onClick={() => setOpen((v) => !v)}>
        <span className="section-ico">{icon}</span>
        <span className="section-title">{title}</span>
        <span className="section-chev">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
};

const PaddingEditor: React.FC<{ value: Padding; onChange: (p: Padding) => void }> = ({ value, onChange }) => {
  const keys: Array<{ k: keyof Padding; label: string }> = [
    { k: 'top', label: 'Верх' }, { k: 'bottom', label: 'Низ' }, { k: 'left', label: 'Лево' }, { k: 'right', label: 'Право' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {keys.map(({ k, label }) => (
        <label key={k} className="field-label">
          {label}
          <input type="number" min={0} value={value[k]} onChange={(e) => onChange({ ...value, [k]: +e.target.value })} className="field" />
        </label>
      ))}
    </div>
  );
};

export const LeftPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const modalsStore = useModalsStore();
  const fileIO = useFileIO();

  const activeSlide = useStore(docStore, (s) => s.slides.find((x) => x.id === s.activeId));
  const fillMode = useStore(modalsStore, (s) => s.fillMode);
  const fillColor = useStore(modalsStore, (s) => s.fillColor);
  const showGrid = useStore(modalsStore, (s) => s.showGrid);
  
  const editorMode = useStore(modalsStore, (s) => s.editorMode);

  const canUndo = docStore.canUndo;
  const canRedo = docStore.canRedo;

  const [pdfBusy, setPdfBusy] = useState(false);
  const [svgBusy, setSvgBusy] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  if (!activeSlide) return null;

  const add = (el: CanvasElement) => {
    docStore.commit((draft) => { const s = draft.slides.find((x) => x.id === draft.activeId); if (s) s.elements.push(el); }, 'add-element');
    selStore.select(el.id);
  };

  const resetAfterLoad = () => { selStore.clear(); modalsStore.closeEditor(); modalsStore.setFloatingPos(null); modalsStore.setFillPoints([]); };

  const handleFormat = (format: DocFormat) => {
    if (format === activeSlide.format) return;
    docStore.commit((draft) => {
      const i = draft.slides.findIndex((s) => s.id === draft.activeId);
      if (i < 0) return;
      draft.slides[i] = changeFormat(draft.slides[i], format);
    }, 'change-format');
    selStore.clear();
  };

  const handleOrientation = (orientation: Orientation) => {
    if (orientation === activeSlide.orientation) return;
    docStore.commit((draft) => {
      const i = draft.slides.findIndex((s) => s.id === draft.activeId);
      if (i < 0) return;
      draft.slides[i] = changeOrientation(draft.slides[i], orientation);
    }, 'change-orientation');
    selStore.clear();
  };

  const updatePadding = (padding: Padding) => {
    docStore.commit((draft) => { const s = draft.slides.find((x) => x.id === draft.activeId); if (s) s.padding = padding; }, 'padding');
  };

  const updateBackground = (color: string) => {
    if (activeSlide.background === color) return;
    docStore.commit((draft) => { 
      const s = draft.slides.find((x) => x.id === draft.activeId); 
      if (s) s.background = color; 
    }, 'bg-color');
  };

  const changeCustomSize = (w: number, h: number) => {
    if (activeSlide.format !== 'custom') return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      const newW = s.orientation === 'portrait' ? w : h;
      const newH = s.orientation === 'portrait' ? h : w;
      s.width = newW; s.height = newH;
    }, 'custom-size');
  };

  const applyLayout = (layoutId: string) => {
    const layout = TYPICAL_LAYOUTS.find((l) => l.id === layoutId);
    if (!layout) return;
    docStore.commit((draft) => {
      const slide = layout.build();
      draft.slides = [slide]; draft.activeId = slide.id;
    }, 'apply-layout');
    resetAfterLoad();
  };

  const applyBundle = (bundleId: string) => {
    const bundle = BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    const { slide, data: bundleData } = bundle.build();
    docStore.commit((draft) => {
      draft.slides = [slide]; draft.activeId = slide.id; draft.data = bundleData;
    }, 'apply-bundle');
    resetAfterLoad();
  };

  const handleExportSvgServer = async () => {
    if (svgBusy) return;
    setSvgBusy(true);
    try {
      await fileIO.exportSvgServer();
    } catch (err) {
      alert(`Не удалось получить SVG с сервера: ${(err as Error).message}`);
    } finally {
      setSvgBusy(false);
    }
  };

  const handleExportPdfaServer = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await fileIO.exportPdfaServer();
    } catch (err) {
      alert(`Не удалось получить PDF/A с сервера: ${(err as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  };

  const startDragNew = (e: React.DragEvent, elementType: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'new-element', elementType }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderElementTiles = () => {
    if (editorMode === 'schema') {
      return (
        <>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'simple-text')} onClick={() => add(newSimpleText())}><span className="tile-ico">A</span><span>Текст</span></button>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'rect')} onClick={() => add(newShape('rect'))}><span className="tile-ico">▭</span><span>Блок</span></button>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'roundRect')} onClick={() => add(newShape('roundRect'))}><span className="tile-ico">▢</span><span>Блок (R)</span></button>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'circle')} onClick={() => add(newShape('circle'))}><span className="tile-ico">○</span><span>Круг</span></button>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'triangle')} onClick={() => add(newShape('triangle'))}><span className="tile-ico">△</span><span>Треуг.</span></button>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'line')} onClick={() => add(newLine())}><span className="tile-ico">╱</span><span>Линия</span></button>
          <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'line-arrow')} onClick={() => { const l = newLine(); l.isArrow = true; add(l); }}><span className="tile-ico">➔</span><span>Стрелка</span></button>
        </>
      );
    }
    return (
      <>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'simple-text')} onClick={() => add(newSimpleText())}><span className="tile-ico">A</span><span>Текст</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'text')} onClick={() => add(newText())}><span className="tile-ico">📝</span><span>Rich</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'footer')} onClick={() => add(newFooter(activeSlide))}><span className="tile-ico">¬</span><span>Футер</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'table')} onClick={() => add(newTable())}><span className="tile-ico">▦</span><span>Таблица</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'line')} onClick={() => add(newLine())}><span className="tile-ico">╱</span><span>Линия</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'rect')} onClick={() => add(newShape('rect'))}><span className="tile-ico">▭</span><span>Прямоуг.</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'roundRect')} onClick={() => add(newShape('roundRect'))}><span className="tile-ico">▢</span><span>Округл.</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'circle')} onClick={() => add(newShape('circle'))}><span className="tile-ico">○</span><span>Круг</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'triangle')} onClick={() => add(newShape('triangle'))}><span className="tile-ico">△</span><span>Треуг.</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'star')} onClick={() => add(newShape('star'))}><span className="tile-ico">☆</span><span>Звезда</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'arc')} onClick={() => add(newShape('arc'))}><span className="tile-ico">◔</span><span>Дуга</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'path')} onClick={() => add(newPath())}><span className="tile-ico">✎</span><span>Path</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'chart-bar')} onClick={() => add(newChart('bar'))}><span className="tile-ico">📊</span><span>Bar</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'chart-donut')} onClick={() => add(newChart('donut'))}><span className="tile-ico">◎</span><span>Donut</span></button>
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'qr')} onClick={() => setQrModalOpen(true)}><span className="tile-ico">🔳</span><span>QR-код</span></button>
        
        {/* НОВАЯ КНОПКА: Диаграмма (drawio) */}
        <button type="button" className="tool-tile" draggable onDragStart={(e) => startDragNew(e, 'diagram')} onClick={() => add(newDiagram())}>
          <span className="tile-ico">🖼</span>
          <span>Диаграмма</span>
        </button>
      </>
    );
  };

  return (
    <aside className="left-panel">
      
      <div style={{ 
        display: 'flex', gap: 4, padding: 4, background: '#e2e8f0', borderRadius: 8, marginBottom: 12, border: '2px solid #6366f1'
      }}>
        <button 
          type="button"
          style={{ 
            flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 13,
            background: editorMode === 'print' ? '#fff' : 'transparent',
            color: editorMode === 'print' ? '#4f46e5' : '#64748b',
            boxShadow: editorMode === 'print' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
          onClick={() => modalsStore.setEditorMode('print')}
        >
          🖨 Полиграфия
        </button>
        <button 
          type="button"
          style={{ 
            flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 13,
            background: editorMode === 'schema' ? '#fff' : 'transparent',
            color: editorMode === 'schema' ? '#4f46e5' : '#64748b',
            boxShadow: editorMode === 'schema' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
          onClick={() => modalsStore.setEditorMode('schema')}
        >
          📐 Схемы
        </button>
      </div>

      <Section title="Файл" icon="📁" defaultOpen>
        <button type="button" className="tool-btn" onClick={fileIO.importJson}>📥 Импорт JSON</button>
        <button type="button" className="tool-btn" onClick={fileIO.exportJson}>📤 Экспорт JSON</button>
        <div style={{ height: 8 }} />
        <button type="button" className="tool-btn" onClick={fileIO.exportSvgLocal}>🖼 SVG (локально)</button>
        <button type="button" className="tool-btn" onClick={handleExportSvgServer} disabled={svgBusy}>
          {svgBusy ? '⏳ SVG (сервер)…' : '🖼 SVG (сервер)'}
        </button>
        <button type="button" className="tool-btn primary" onClick={handleExportPdfaServer} disabled={pdfBusy}>
          {pdfBusy ? '⏳ PDF/A (сервер)…' : '📄 PDF/A (сервер)'}
        </button>
      </Section>

      {editorMode === 'print' && (
        <>
          <Section title="Макеты" icon="🎨">
            {TYPICAL_LAYOUTS.map((l) => (
              <button key={l.id} type="button" className="tool-btn" title={l.description} onClick={() => applyLayout(l.id)}>{l.icon} {l.name}</button>
            ))}
          </Section>

          <Section title="Документы" icon="📄">
            {BUNDLES.map((b) => (
              <button key={b.id} type="button" className="tool-btn" title={b.description} onClick={() => applyBundle(b.id)}>{b.icon} {b.name}</button>
            ))}
          </Section>
        </>
      )}

      <Section title="Формат" icon="📐" defaultOpen>
        <label className="field-label">Размер</label>
        <select className="field" value={activeSlide.format} onChange={(e) => handleFormat(e.target.value as DocFormat)}>
          {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <label className="field-label">Ориентация</label>
        <div className="segmented">
          <button type="button" className={activeSlide.orientation === 'portrait' ? 'active' : ''} onClick={() => handleOrientation('portrait')}>Книжная</button>
          <button type="button" className={activeSlide.orientation === 'landscape' ? 'active' : ''} onClick={() => handleOrientation('landscape')}>Альбомная</button>
        </div>

        <label className="field-label">Цвет фона</label>
        <input type="color" className="field" value={activeSlide.background} onChange={(e) => updateBackground(e.target.value)} />

        {activeSlide.format === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <label className="field-label">Ширина<input className="field" type="number" min={50} value={activeSlide.width} onChange={(e) => changeCustomSize(+e.target.value, activeSlide.height)} /></label>
            <label className="field-label">Высота<input className="field" type="number" min={50} value={activeSlide.height} onChange={(e) => changeCustomSize(activeSlide.width, +e.target.value)} /></label>
          </div>
        )}

        <div className="hint-sm">{activeSlide.width} × {activeSlide.height} px</div>

        <h4 style={{ margin: '10px 0 4px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Отступы страницы</h4>
        <PaddingEditor value={activeSlide.padding} onChange={updatePadding} />
      </Section>

      <Section title="Изображения" icon="🖼">
        <button type="button" className="tool-btn" onClick={() => fileIO.addImage({ centered: true })}>🖼 Добавить картинку</button>
        <button type="button" className="tool-btn" onClick={fileIO.setBackgroundImage}>🖼 Установить фон</button>
        <button type="button" className="tool-btn danger" onClick={fileIO.removeBackgroundImage} disabled={!activeSlide.backgroundImage}>✕ Убрать фон</button>
      </Section>

      <Section title="Элементы" icon="🧩" defaultOpen>
        <div className="tool-grid">
          {renderElementTiles()}
        </div>
      </Section>

      {editorMode === 'print' && (
        <>
          <Section title="Штампы" icon="🔖"><StampLibraryPanel /></Section>
          <Section title="Графы" icon="📊"><GraphToolPanel /></Section>
        </>
      )}

      <Section title="Компоновка" icon="🎯"><ArrangePanel /></Section>
      
      {editorMode === 'print' && (
        <Section title="Pathfinder" icon="⚡"><PathfinderPanel /></Section>
      )}
      
      <Section title="Стили" icon="🎨"><StylesPanel /></Section>
      <Section title="Символы" icon="🔗"><SymbolsPanel /></Section>

      {editorMode === 'print' && (
        <Section title="Заливка" icon="🎨">
          <label className="check-row"><input type="checkbox" checked={fillMode} onChange={(e) => modalsStore.setFillMode(e.target.checked)} /><span>Режим заливки</span></label>
          <label className="field-label">Цвет заливки</label>
          <input type="color" className="field" value={fillColor} onChange={(e) => modalsStore.setFillColor(e.target.value)} />
          <p className="hint-sm">Клик по фигуре — залить область.<br />Клик по пустому месту — добавить точку.<br />Esc — отменить.</p>
        </Section>
      )}

      <Section title="Вид" icon="👁">
        <label className="check-row"><input type="checkbox" checked={showGrid} onChange={(e) => modalsStore.setShowGrid(e.target.checked)} /><span>Показать сетку</span></label>
        <div className="row-2">
          <button type="button" className="tool-btn" onClick={() => docStore.undo()} disabled={!canUndo}>↶ Отменить</button>
          <button type="button" className="tool-btn" onClick={() => docStore.redo()} disabled={!canRedo}>↷ Повторить</button>
        </div>
      </Section>

      {qrModalOpen && (
        <QrModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          onSave={(el) => {
            add(el);
          }}
        />
      )}
    </aside>
  );
};