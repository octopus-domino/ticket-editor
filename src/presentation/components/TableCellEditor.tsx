import { useLayoutEffect, useRef } from 'react';
import type { TableElement } from '@/shared/types';
import { tableAxis } from '@/lib/tableGeometry';
import { editTableCell } from '@/lib/tableEditing';

interface Props {
  table: TableElement;
  row: number;
  col: number;
  zoom: number;
  onUpdate(patch: Partial<TableElement>): void;
  onMove(row: number, col: number): void;
  onClose(): void;
}

/** Lives in the stage coordinate system so zooming and scrolling preserve cell alignment. */
export function TableCellEditor({ table, row, col, zoom, onUpdate, onMove, onClose }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const xs = tableAxis(table.width, table.cols, table.columnWidths);
  const ys = tableAxis(table.height, table.rows, table.rowHeights);
  const style = table.cellStyles?.[row]?.[col];
  useLayoutEffect(() => { input.current?.focus(); input.current?.select(); }, [row, col]);

  return <div style={{ position: 'absolute', left: table.x * zoom, top: table.y * zoom,
    width: table.width, height: table.height, pointerEvents: 'none', zIndex: 110,
    transform: `scale(${zoom}) rotate(${table.rotation}deg)`, transformOrigin: 'top left' }}>
    <textarea ref={input} aria-label={`Table cell ${row + 1}, ${col + 1}`}
      value={table.data[row]?.[col] ?? ''}
      onChange={event => onUpdate(editTableCell(table, row, col, event.target.value))}
      onBlur={onClose}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          const target = event.currentTarget;
          const start = target.selectionStart;
          const value = target.value.slice(0, start) + '\n' + target.value.slice(target.selectionEnd);
          onUpdate(editTableCell(table, row, col, value));
          requestAnimationFrame(() => target.setSelectionRange(start + 1, start + 1));
          return;
        }
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const count = table.rows * table.cols;
        const next = (row * table.cols + col + (event.shiftKey ? -1 : 1) + count) % count;
        onMove(Math.floor(next / table.cols), next % table.cols);
      }}
      style={{ position: 'absolute', left: xs[col], top: ys[row], width: xs[col + 1] - xs[col],
        height: ys[row + 1] - ys[row], boxSizing: 'border-box', margin: 0, border: '1px solid #6366f1',
        outline: '1px solid #6366f1', borderRadius: 0, padding: table.cellPadding ?? 6,
        fontSize: style?.fontSize ?? table.fontSize, fontFamily: style?.fontFamily ?? 'Arial',
        fontWeight: style?.fontStyle.includes('bold') ? 700 : 400,
        fontStyle: style?.fontStyle.includes('italic') ? 'italic' : 'normal', lineHeight: 1,
        color: style?.color ?? '#111', background: style?.background ?? (row === 0 ? table.headerBg : '#fff'),
        resize: 'none', overflow: 'hidden', pointerEvents: 'auto' }} />
  </div>;
}
