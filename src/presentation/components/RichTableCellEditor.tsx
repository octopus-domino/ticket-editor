import { useLayoutEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import type Konva from 'konva';
import type { TextElement } from '@/shared/types';
import type { RichTableCell } from '@/lib/richText/types';
import { cellPad } from '@/lib/richText/tableLayout';
import { richCellDocument, patchRichCell } from '@/lib/richText/cellEditing';
import { findCanvasCell, useCanvasCellFrame } from '../hooks/canvas/useCanvasCellFrame';
import { FontSize } from './richText/extensions';
import './canvas-cell-editor.css';

interface Props {
  element: TextElement;
  tableIndex: number;
  cellIndex: number;
  stageRef: RefObject<Konva.Stage>;
  onUpdate(html: string): void;
  onMove(index: number): void;
  onClose(): void;
}

/** Edits one HTML table cell without opening or reflowing the surrounding rich text editor. */
export function RichTableCellEditor(props: Props) {
  const { element, tableIndex, cellIndex, stageRef, onMove, onClose } = props;
  const latest = useRef(props);
  latest.current = props;
  const moving = useRef(false);
  const source = richCellDocument(element.html ?? '', tableIndex, cellIndex);
  const frame = useCanvasCellFrame(stageRef, element.id, { tableIndex, cellIndex }, element);
  const data = findCanvasCell(stageRef.current, element.id, { tableIndex, cellIndex })?.getAttr('cellData') as RichTableCell | undefined;
  const padding = data ? cellPad(data) : element.padding;
  const firstBlock = data?.blocks.find(block => block.kind === 'text');
  const firstRun = firstBlock?.kind === 'text' ? firstBlock.runs[0] : undefined;
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color, FontFamily, FontSize],
    content: source.cell?.innerHTML ?? '<p></p>',
    editorProps: { attributes: { role: 'textbox', 'aria-label': `Rich table cell ${tableIndex + 1}, ${cellIndex + 1}` } },
    onUpdate: ({ editor }) => {
      const current = latest.current;
      current.onUpdate(patchRichCell(current.element.html ?? '', current.tableIndex, current.cellIndex, editor.getHTML()));
    },
  });
  const canFocus = Boolean(frame && source.cell);
  useLayoutEffect(() => {
    if (canFocus) editor?.commands.focus('end');
  }, [canFocus, editor]);
  if (!editor || !frame || !source.cell) return null;

  return createPortal(<div className="canvas-cell-editor" style={{ ...frame, boxSizing: 'border-box',
    padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
    background: data?.bgColor ?? (data?.isHeader ? '#f1f5f9' : '#fff'),
    fontSize: firstRun?.fontSize ?? element.fontSize, fontFamily: firstRun?.fontFamily ?? element.fontFamily,
    color: firstRun?.color ?? element.fill, fontWeight: firstRun?.bold ? 700 : 400,
    fontStyle: firstRun?.italic ? 'italic' : 'normal',
    lineHeight: element.lineHeight, textAlign: data?.align ?? 'left' }}
    onBlur={() => { if (!moving.current) onClose(); }}
    onKeyDownCapture={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); event.stopPropagation(); editor.commands.setHardBreak();
      }
      if (event.key === 'Tab') {
        event.preventDefault(); event.stopPropagation(); moving.current = true;
        onMove((cellIndex + (event.shiftKey ? -1 : 1) + source.count) % source.count);
      }
    }}>
    <EditorContent editor={editor} />
  </div>, document.body);
}
