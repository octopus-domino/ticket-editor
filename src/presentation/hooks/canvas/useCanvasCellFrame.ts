import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import type Konva from 'konva';

export interface CellAddress { row?: number; col?: number; tableIndex?: number; cellIndex?: number }

/** Hit-tests rendered cell outlines in the same transformed coordinates used by Konva. */
export function findCanvasCellAt(stage: Konva.Stage | null, id: string, point: { x: number; y: number }, name: string): Konva.Rect | undefined {
  return stage?.findOne<Konva.Group>(`#${id}`)?.findOne<Konva.Rect>((node: Konva.Node) => {
    if (node.name() !== name) return false;
    const local = node.getAbsoluteTransform().copy().invert().point(point);
    return local.x >= 0 && local.y >= 0 && local.x < node.width() && local.y < node.height();
  });
}

/** Resolves the painted cell, including symbol geometry, rotation and the stage's current scale. */
export function findCanvasCell(stage: Konva.Stage | null, id: string, address: CellAddress): Konva.Rect | undefined {
  const group = stage?.findOne<Konva.Group>(`#${id}`);
  return group?.findOne<Konva.Rect>((node: Konva.Node) => address.tableIndex !== undefined
    ? node.name() === 'rich-table-cell' && node.getAttr('tableIndex') === address.tableIndex && node.getAttr('cellIndex') === address.cellIndex
    : node.name() === 'table-cell' && node.getAttr('row') === address.row && node.getAttr('col') === address.col);
}

/** A body portal follows the real canvas cell rather than reconstructing its location from document fields. */
export function useCanvasCellFrame(stageRef: RefObject<Konva.Stage>, id: string, address: CellAddress, revision: unknown): CSSProperties | null {
  const [frame, setFrame] = useState<CSSProperties | null>(null);
  const { row, col, tableIndex, cellIndex } = address;
  useLayoutEffect(() => {
    const update = () => {
      const stage = stageRef.current;
      const cell = findCanvasCell(stage, id, { row, col, tableIndex, cellIndex });
      if (!stage || !cell) return;
      const rect = stage.container().getBoundingClientRect();
      const [a, b, c, d, x, y] = cell.getAbsoluteTransform().getMatrix();
      const sx = rect.width / stage.width(), sy = rect.height / stage.height();
      setFrame({ position: 'fixed', left: rect.left, top: rect.top, width: cell.width(), height: cell.height(),
        transform: `matrix(${a * sx},${b * sy},${c * sx},${d * sy},${x * sx},${y * sy})`, transformOrigin: 'top left', zIndex: 110 });
    };
    update();
    document.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    if (stageRef.current) observer.observe(stageRef.current.container());
    return () => { document.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); observer.disconnect(); };
  }, [stageRef, id, row, col, tableIndex, cellIndex, revision]);
  return frame;
}
