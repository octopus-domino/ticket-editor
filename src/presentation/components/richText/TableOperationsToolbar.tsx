import { t as __tr } from '@/shared/i18n';
import React, { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { TableSizePicker } from './TableSizePicker';
import { CellFillPopover, CellBorderPopover, CellPadPopover } from './TableCellPopovers';

type PopKind = null | 'size' | 'fill' | 'border' | 'pad';

export const TableOperationsToolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [pop, setPop] = useState<PopKind>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = (k: Exclude<PopKind, null>) =>
    setPop((v) => (v === k ? null : k));

  const insideTable = editor.isActive('table');

  useEffect(() => {
    if (!pop) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPop(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pop]);

  const setCellAttrs = (attrs: Record<string, any>) => {
    editor.chain().focus().updateAttributes('tableCell', attrs).run();
    editor.chain().focus().updateAttributes('tableHeader', attrs).run();
  };

  const handleInsertTable = (r: number, c: number) => {
    editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();

    const { doc } = editor.state;
    const lastNode = doc.lastChild;
    if (lastNode && lastNode.type.name === 'table') {
      editor.chain().focus().insertContentAt(doc.content.size, '<p></p>').run();
    }

    setPop(null);
  };

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      {/* ВСТАВКА ТАБЛИЦЫ */}
      <div className="rt-sep" />
      <div className="rt-popover-wrap">
        <button
          type="button"
          className="rt-btn"
          title={__tr("Вставить таблицу")}
          onMouseDown={(e) => { e.preventDefault(); toggle('size'); }}
        >
          {__tr("⊞ Таблица")}</button>
        {pop === 'size' && <TableSizePicker onPick={handleInsertTable} />}
      </div>

      {insideTable && (
        <>
          {/* СТРОКИ И КОЛОНКИ */}
          <div className="rt-sep" />
          <div className="rt-group">
            <button type="button" className="rt-btn" title={__tr("Добавить строку")}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}>{__tr("+Стр")}</button>
            <button type="button" className="rt-btn" title={__tr("Удалить строку")}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}>{__tr("-Стр")}</button>
            <button type="button" className="rt-btn" title={__tr("Добавить колонку")}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}>{__tr("+Кол")}</button>
            <button type="button" className="rt-btn" title={__tr("Удалить колонку")}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}>{__tr("-Кол")}</button>
          </div>

          {/* ОБЪЕДИНЕНИЕ / РАЗДЕЛЕНИЕ */}
          <div className="rt-sep" />
          <div className="rt-group">
            <button type="button" className="rt-btn" title={__tr("Объединить ячейки")}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }}>{__tr("Объед")}</button>
            <button type="button" className="rt-btn" title={__tr("Разделить ячейку")}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().splitCell().run(); }}>{__tr("Разъед")}</button>
          </div>

          {/* ВЫРАВНИВАНИЕ */}
          <div className="rt-sep" />
          <div className="rt-group">
            <button type="button" className="rt-btn" title={__tr("По левому краю")}
              onMouseDown={(e) => { e.preventDefault(); setCellAttrs({ textAlign: 'left' }); }}>◧</button>
            <button type="button" className="rt-btn" title={__tr("По центру")}
              onMouseDown={(e) => { e.preventDefault(); setCellAttrs({ textAlign: 'center' }); }}>◫</button>
            <button type="button" className="rt-btn" title={__tr("По правому краю")}
              onMouseDown={(e) => { e.preventDefault(); setCellAttrs({ textAlign: 'right' }); }}>◨</button>
            <button type="button" className="rt-btn" title={__tr("По ширине")}
              onMouseDown={(e) => { e.preventDefault(); setCellAttrs({ textAlign: 'justify' }); }}>☰</button>
          </div>

          {/* ГРАНИЦЫ */}
          <div className="rt-sep" />
          <div className="rt-popover-wrap">
            <button type="button" className="rt-btn"
              title={__tr("Границы ячейки")}
              onMouseDown={(e) => { e.preventDefault(); toggle('border'); }}>
              {__tr("╳ Границы")}</button>
            {pop === 'border' && (
              <CellBorderPopover
                editor={editor}
                onSet={(patch) => { setCellAttrs(patch); setPop(null); }}
              />
            )}
          </div>

          {/* ОТСТУПЫ */}
          <div className="rt-popover-wrap">
            <button type="button" className="rt-btn"
              title={__tr("Отступы в ячейке")}
              onMouseDown={(e) => { e.preventDefault(); toggle('pad'); }}>
              {__tr("↔ Отступы")}</button>
            {pop === 'pad' && (
              <CellPadPopover onSet={(padding) => { setCellAttrs({ cellPadding: padding }); setPop(null); }} />
            )}
          </div>

          {/* ЗАЛИВКА */}
          <div className="rt-sep" />
          <div className="rt-popover-wrap">
            <button type="button" className="rt-btn"
              title={__tr("Заливка ячейки")}
              onMouseDown={(e) => { e.preventDefault(); toggle('fill'); }}>
              {__tr("▣ Заливка")}</button>
            {pop === 'fill' && (
              <CellFillPopover onSet={(c) => { setCellAttrs({ bgColor: c }); setPop(null); }} />
            )}
          </div>
        </>
      )}
    </div>
  );
};