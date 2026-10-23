import type { StampShapeItem, StampShapeKind } from '@/shared/types';

export interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformInput {
  shape: StampShapeItem;
  /** Позиция центра (node.x, node.y). */
  nodeX: number;
  nodeY: number;
  /** Угол node.rotation. */
  nodeRotation: number;
  scaleX: number;
  scaleY: number;
  /** Зажат Ctrl / Cmd — свободный режим. */
  ctrl: boolean;
  /** Все фигуры в штампе. */
  shapes: StampShapeItem[];
}

export interface TransformOutput {
  patch: Partial<StampShapeItem>;
  /** true — сбросить node.scaleX/scaleY в 1 (обычно да). */
  resetScale: boolean;
}

export interface ShapeStrategy {
  kind: StampShapeKind;

  /** Размеры и corner при создании. */
  defaultSize: { w: number; h: number; corner: number };

  /** Нормализует геометрию после computeNewShapeGeometry (например, круг → квадрат). */
  normalizeGeometry(geom: Geometry): Geometry;

  /** Path2D по фигуре для fill/clip. */
  toPath(shape: StampShapeItem): Path2D;

  /** Трансформация после Konva.Transformer. */
  applyTransform(input: TransformInput): TransformOutput;
}