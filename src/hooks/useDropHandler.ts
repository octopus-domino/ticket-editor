import { useCallback, useState } from 'react';
import type { EditorApi } from './useEditor';
import type { CanvasElement, DataFieldType } from '../types';
import { findElementAt } from '../lib/geometry';
import {
  newText, newFooter, newTable, newLine, newShape, newStamp,
  makePlaceholder, makeArrayTable,
} from '../lib/factories';

export function useDropHandler(editor: EditorApi) {
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const stage = editor.stageRef.current;
      if (!stage) return;

      const rect = stage.container().getBoundingClientRect();
      const zoom = editor.zoom;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      /* ---------- Атрибут из панели данных ---------- */
      if (payload.kind === 'array') {
        editor.addElementWithHistory(makeArrayTable(x, y, payload));
        return;
      }

      if (payload.kind === 'field') {
        // Если попали в текстовый элемент — вставим {{path}} прямо в текст
        const target = findElementAt(editor.activeSlide, x, y);
        if (target && target.type === 'text') {
          const path = `{{${payload.path}}}`;
          const oldText = target.text || '';
          const sep = oldText.length && !/[\s\n]$/.test(oldText) ? ' ' : '';
          editor.updateWithHistory(target.id, { text: oldText + sep + path });
          editor.setSelectedIds([target.id]);
          return;
        }
        editor.addElementWithHistory(
          makePlaceholder(x, y, payload.path, payload.fieldType as DataFieldType, payload.sample),
        );
        return;
      }

      /* ---------- Новый элемент с левой панели ---------- */
      if (payload.kind === 'new-element') {
        const t = payload.elementType as string;
        const cx = Math.max(0, x - 100);
        const cy = Math.max(0, y - 60);
        let el: CanvasElement | null = null;

        if (t === 'text') el = newText(cx, cy);
        else if (t === 'footer') {
          const f = newFooter();
          f.x = 0;
          f.y = Math.max(0, y);
          el = f;
        }
        else if (t === 'table') el = newTable(cx, cy);
        else if (t === 'line') el = newLine(cx, cy);
        else if (t === 'line-arrow') { const l = newLine(cx, cy); l.isArrow = true; el = l; }
        else if (t === 'rect') el = newShape('rect', cx, cy);
        else if (t === 'roundRect') el = newShape('roundRect', cx, cy);
        else if (t === 'circle') el = newShape('circle', cx, cy);
        else if (t === 'triangle') el = newShape('triangle', cx, cy);
        else if (t === 'star') el = newShape('star', cx, cy);
        else if (t === 'stamp-circle') el = newStamp('circle', cx, cy);
        else if (t === 'stamp-oval') el = newStamp('oval', cx, cy);
        else if (t === 'stamp-rect') el = newStamp('rect', cx, cy);
        else if (t === 'stamp-triangle') el = newStamp('triangle', cx, cy);

        if (el) editor.addElementWithHistory(el);
      }
    } catch (err) {
      console.warn('Drop parse error', err);
    }
  }, [editor]);

  return { dragOver, onDragOver, onDragLeave, onDrop };
}