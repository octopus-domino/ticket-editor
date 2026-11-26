import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import type Konva from 'konva';
import type { TableElement } from '@/shared/types';
import { editTableCell } from '@/lib/tableEditing';
import { useCanvasCellFrame } from '../hooks/canvas/useCanvasCellFrame';

interface Props {
  table: TableElement;
  row: number;
  col: number;
  zoom: number;
  stageRef: RefObject<Konva.Stage>;
  onUpdate(patch: Partial<TableElement>): void;
  onMove(row: number, col: number): void;
  onClose(): void;
}

/** Lives in the stage coordinate system so zooming and scrolling preserve cell alignment. */
export function TableCellEditor({ table, row, col, stageRef, onUpdate, onMove, onClose }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const frame = useCanvasCellFrame(stageRef, table.id, { row, col }, table);
  const style = table.cellStyles?.[row]?.[col];
  const canFocus = Boolean(frame);
  useLayoutEffect(() => {
    if (!canFocus) return;
    input.current?.focus();
    input.current?.select();
  }, [canFocus, row, col]);

  if (!frame) return null;
  return createPortal(<>
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
      style={{ ...frame, minWidth: 0, minHeight: 0, maxWidth: 'none', maxHeight: 'none', boxSizing: 'border-box', margin: 0, border: '1px solid #6366f1',
        outline: 'none', borderRadius: 0, padding: table.cellPadding ?? 6,
        fontSize: style?.fontSize ?? table.fontSize, fontFamily: style?.fontFamily ?? 'Arial',
        fontWeight: style?.fontStyle.includes('bold') ? 700 : 400,
        fontStyle: style?.fontStyle.includes('italic') ? 'italic' : 'normal', lineHeight: 1,
        color: style?.color ?? '#111', background: style?.background ?? (row === 0 ? table.headerBg : '#fff'),
        resize: 'none', overflow: 'hidden', pointerEvents: 'auto' }} />
  </>, document.body);
}
