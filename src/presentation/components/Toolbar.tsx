import React from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore } from '../providers/EditorProvider';
import { download } from '@/lib/download';
import { serializeSlideToSvg } from '@/lib/svg/serialize';

export const Toolbar: React.FC = () => {
  const docStore = useDocumentStore();
  const slides = useStore(docStore, (s) => s.slides);
  const activeId = useStore(docStore, (s) => s.activeId);
  const data = useStore(docStore, (s) => s.data);
  // Триггер перерисовки при изменении истории:
  useStore(docStore, (s) => s.historyVersion);

  const canUndo = docStore.canUndo;
  const canRedo = docStore.canRedo;

  const activeSlide = slides.find((s) => s.id === activeId);

  const handleExportJson = () => {
    const payload = { version: '2.0', exportedAt: new Date().toISOString(), slides, data };
    download(JSON.stringify(payload, null, 2), `ticket-editor-${Date.now()}.json`, 'application/json');
  };

  const handleExportSvg = () => {
    if (!activeSlide) return;
    const svgString = serializeSlideToSvg(activeSlide);
    download(svgString, `slide-${activeSlide.id}.svg`, 'image/svg+xml');
  };

  return (
    <header className="toolbar">
      <h1>Редактор шаблонов</h1>
      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={() => docStore.undo()} disabled={!canUndo}>↶ Отменить</button>
        <button className="toolbar-btn" onClick={() => docStore.redo()} disabled={!canRedo}>↷ Повторить</button>
        <div style={{ width: 16 }} />
        <button className="toolbar-btn" onClick={handleExportSvg}>🖼 Экспорт SVG</button>
        <button className="toolbar-btn primary" onClick={handleExportJson}>📥 Экспорт JSON</button>
      </div>
    </header>
  );
};