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

    /* ---------- text / footer ---------- */
    if (el.type === 'text' || el.type === 'footer') {
      const isRich =
        el.type === 'footer'
          ? true
          : (el.type === 'text' ? el.richText !== false : false);

      modalsStore.openEditor({
        id: el.id,
        field: el.type === 'footer' ? 'footerText' : 'text',
        kind: el.type,
        value: el.text ?? '',
        html: 'html' in el ? el.html : undefined,
        x: screenX, y: screenY,
        width: screenW, height: screenH,
        fontSize: (el.fontSize ?? 16) * zoom,
        fontFamily: el.type === 'text' ? el.fontFamily : 'Arial',
        fontStyle: el.type === 'text' ? el.fontStyle : 'normal',
        textDecoration: el.type === 'text' ? el.textDecoration : '',
        fill: el.fill ?? '#000',
        align: el.type === 'text' ? el.align : 'center',
        verticalAlign: el.type === 'text' ? el.verticalAlign : 'top',
        lineHeight: el.type === 'text' ? el.lineHeight : 1.5,
        padding: el.type === 'text'
          ? {
              top: el.padding.top * zoom,
              right: el.padding.right * zoom,
              bottom: el.padding.bottom * zoom,
              left: el.padding.left * zoom,
            }
          : { top: 0, right: 0, bottom: 0, left: 0 },
        background: el.type === 'text' ? el.background : 'transparent',
        isRich,
      });
      return;
    }

    /* ---------- shape: inline plain-редактор ---------- */
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

    /* ---------- table: inline plain-редактор ячейки ---------- */
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