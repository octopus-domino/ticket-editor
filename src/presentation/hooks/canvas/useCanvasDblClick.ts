import { useCallback } from 'react';
import type { ModalsStore } from '../../stores/ModalsStore';
import type { CanvasElement } from '@/shared/types';
import { findTableCellAt } from '@/domain/slide/hitTest';

export interface DblClickViewport {
  viewportLeft: number;
  viewportTop: number;
  clientX: number;
  clientY: number;
}

export function useCanvasDblClick(params: {
  modalsStore: ModalsStore;
  zoom: number;
}) {
  const { modalsStore, zoom } = params;

  const handle = useCallback((el: CanvasElement, vp: DblClickViewport) => {
    const screenX = vp.viewportLeft + el.x * zoom;
    const screenY = vp.viewportTop + el.y * zoom;
    const screenW = el.width * zoom;
    const screenH = el.height * zoom;

    /* ---------- text: rich, если не отключён явно ---------- */
    if (el.type === 'text') {
      const isRich = el.richText !== false;
      modalsStore.openEditor({
        id: el.id,
        field: 'text',
        kind: 'text',
        value: el.text ?? '',
        html: el.html,
        x: screenX, y: screenY,
        width: screenW, height: screenH,
        fontSize: (el.fontSize ?? 16) * zoom,
        fontFamily: el.fontFamily,
        fontStyle: el.fontStyle,
        textDecoration: el.textDecoration,
        fill: el.fill ?? '#000',
        align: el.align,
        verticalAlign: el.verticalAlign,
        lineHeight: el.lineHeight,
        padding: {
          top: el.padding.top * zoom,
          right: el.padding.right * zoom,
          bottom: el.padding.bottom * zoom,
          left: el.padding.left * zoom,
        },
        background: el.background,
        isRich,
      });
      return;
    }

    /* ---------- footer: только plain (rich-html на Konva не рендерится) ---------- */
    if (el.type === 'footer') {
      modalsStore.openEditor({
        id: el.id,
        field: 'footerText',
        kind: 'footer',
        value: el.text ?? '',
        html: el.html,
        x: screenX, y: screenY,
        width: screenW, height: screenH,
        fontSize: (el.fontSize ?? 16) * zoom,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        textDecoration: '',
        fill: el.fill ?? '#000',
        align: 'center',
        verticalAlign: 'top',
        lineHeight: 1.5,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        background: 'transparent',
        isRich: false,
      });
      return;
    }

    /* ---------- shape: inline plain ---------- */
    if (el.type === 'shape') {
      modalsStore.openEditor({
        id: el.id, field: 'shapeText', kind: 'shape',
        value: el.text ?? '',
        x: screenX, y: screenY,
        width: screenW, height: screenH,
        fontSize: (el.fontSize ?? 16) * zoom,
        fontFamily: el.textFontFamily ?? 'Arial',
        fontStyle: el.textFontStyle ?? 'normal',
        textDecoration: el.textDecoration ?? '',
        fill: el.textFill ?? '#000',
        align: el.textAlign ?? 'center',
        verticalAlign: el.textVerticalAlign ?? 'middle',
        lineHeight: el.textLineHeight ?? 1.3,
        padding: el.textPadding
          ? {
              top: el.textPadding.top * zoom,
              right: el.textPadding.right * zoom,
              bottom: el.textPadding.bottom * zoom,
              left: el.textPadding.left * zoom,
            }
          : { top: 8, right: 8, bottom: 8, left: 8 },
        background: 'transparent',
        isRich: false,
      });
      return;
    }

    /* ---------- table: inline plain, ячейка ---------- */
    if (el.type === 'table') {
      const worldX = (vp.clientX - vp.viewportLeft) / zoom;
      const worldY = (vp.clientY - vp.viewportTop) / zoom;
      const cell = findTableCellAt(el, worldX, worldY);
      if (!cell) return;
      const cellW = (el.width * zoom) / el.cols;
      const cellH = (el.height * zoom) / el.rows;
      modalsStore.openEditor({
        id: el.id, field: 'tableCell', kind: 'table',
        tableRow: cell.row, tableCol: cell.col,
        value: el.data[cell.row]?.[cell.col] ?? '',
        x: screenX + cell.col * cellW,
        y: screenY + cell.row * cellH,
        width: cellW, height: cellH,
        fontSize: el.fontSize * zoom,
        fontFamily: 'Arial', fontStyle: 'normal', textDecoration: '',
        fill: '#111', align: 'left', verticalAlign: 'top', lineHeight: 1.2,
        padding: { top: 6 * zoom, right: 6 * zoom, bottom: 6 * zoom, left: 6 * zoom },
        background: '#fff', isRich: false,
      });
      return;
    }

    /* ---------- stamp / diagram ---------- */
    if (el.type === 'stamp') {
      modalsStore.openStampEditor(el.id);
      return;
    }
    if (el.type === 'diagram') {
      modalsStore.openDiagramEditor(el.id);
    }
  }, [modalsStore, zoom]);

  return { handle };
}