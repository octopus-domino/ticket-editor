import React from 'react';
import { useEditor } from './hooks/useEditor';
import { useDropHandler } from './hooks/useDropHandler';
import { EditorStage } from './components/canvas/EditorStage';
import { LeftPanel } from './components/panels/LeftPanel';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SlidesBar } from './components/panels/SlidesBar';
import { DataPanel } from './DataPanel';
import { InlineTextEditor } from './InlineTextEditor';
import { TextToolbar } from './TextToolbar';
import { ContextMenu } from './ContextMenu';
import type { ContextAction } from './ContextMenu';
import { FloatingProps } from './FloatingProps';
import './App.css';

export default function App() {
  const editor = useEditor();
  const drop = useDropHandler(editor);

  const contextMenuActions: ContextAction[] = React.useMemo(() => {
    const actions: ContextAction[] = [];

    // Действия для линии
    if (editor.selected && editor.selected.type === 'line') {
      actions.push({
        label: '➕ Добавить опорную точку (в конец)',
        action: () => editor.appendAnchor(editor.selected as any),
      });
      const pts = (editor.selected as any).points || [];
      if (pts.length > 4) {
        actions.push({
          label: '➖ Удалить последнюю точку',
          action: () => editor.removeLastAnchor(editor.selected as any),
        });
      }
    }

    actions.push(
      { label: '✂ Вырезать', shortcut: 'Ctrl+X', action: () => editor.cut() },
      { label: '📋 Копировать', shortcut: 'Ctrl+C', action: () => editor.copy() },
      { label: '📌 Вставить', shortcut: 'Ctrl+V', action: () => editor.paste() },
      { label: '📑 Дублировать', shortcut: 'Ctrl+D', action: () => editor.duplicate() },
      { label: '🎨 Копировать стиль', action: () => editor.copyStyle() },
      { label: '🖌 Применить стиль', action: () => editor.applyStyle() },
      { label: '⬆ Вперёд на слой', action: () => editor.moveLayer(1) },
      { label: '⬇ Назад на слой', action: () => editor.moveLayer(-1) },
      { label: '🗑 Удалить', shortcut: 'Delete', action: () => editor.removeSelected(), danger: true },
    );

    return actions;
  }, [editor]);

  return (
    <div className="app">
      <LeftPanel editor={editor} />

      <main
        className={`canvas-wrap ${drop.dragOver ? 'drag-over' : ''} ${editor.fillMode ? 'fill-mode' : ''}`}
        ref={editor.wrapRef}
        onDragOver={drop.onDragOver}
        onDragLeave={drop.onDragLeave}
        onDrop={drop.onDrop}
      >
        <div className="zoom-bar">
          <button onClick={() => editor.setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}>−</button>
          <span>{Math.round(editor.zoom * 100)}%</span>
          <button onClick={() => editor.setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
          {editor.copiedStyle && <span className="style-badge">🎨 Стиль скопирован</span>}
          {editor.selectedIds.length > 1 && <span className="style-badge">Выбрано: {editor.selectedIds.length}</span>}
          {editor.fillMode && (
            <span className="style-badge" style={{ background: editor.fillColor, color: '#000' }}>🪣 Заливка</span>
          )}
          <span className="hint-drag">Перетащите элемент из левой панели или атрибут из панели данных</span>
        </div>

        <EditorStage editor={editor} wrapRef={editor.wrapRef as any} />

        {editor.editing && (
          <InlineTextEditor
            x={editor.editing.x} y={editor.editing.y}
            width={editor.editing.width} height={editor.editing.height}
            value={editor.editing.value}
            fontSize={editor.editing.fontSize}
            fontFamily={editor.editing.fontFamily}
            fontStyle={editor.editing.fontStyle}
            textDecoration={editor.editing.textDecoration}
            align={editor.editing.align}
            fill={editor.editing.fill}
            onChange={(v) => editor.setEditing({ ...editor.editing!, value: v })}
            onCommit={(v) => editor.commitEdit(v)}
            onCancel={() => { editor.setEditing(null); editor.setShowTextToolbar(false); }}
          />
        )}

        {editor.editing && editor.showTextToolbar && (
          <TextToolbar
            x={editor.editing.x}
            y={Math.max(0, editor.editing.y - 50)}
            fontSize={editor.editing.fontSize / editor.zoom}
            fontFamily={editor.editing.fontFamily}
            fontStyle={editor.editing.fontStyle}
            textDecoration={editor.editing.textDecoration}
            fill={editor.editing.fill}
            align={editor.editing.align}
            onCommit={() => editor.commitEdit()}
            onChange={editor.onToolbarChange}
          />
        )}

        {editor.floatingPos && editor.selected && !editor.editing && (
          <FloatingProps
            x={editor.floatingPos.x} y={editor.floatingPos.y}
            element={editor.selected}
            onUpdate={(p) => editor.updateWithHistory(editor.selectedId!, p)}
            onClose={() => editor.setFloatingPos(null)}
            onBringForward={() => editor.moveLayer(1)}
            onSendBackward={() => editor.moveLayer(-1)}
            onDelete={editor.removeSelected}
          />
        )}
      </main>

      <DataPanel data={editor.data} setData={editor.setData} />
      <PropertiesPanel editor={editor} />
      <SlidesBar editor={editor} />

      {editor.contextMenu && (
        <ContextMenu
          x={editor.contextMenu.x} y={editor.contextMenu.y}
          actions={contextMenuActions}
          onClose={() => editor.setContextMenu(null)}
        />
      )}
    </div>
  );
}