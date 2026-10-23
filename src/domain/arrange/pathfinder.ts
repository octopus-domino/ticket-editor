/* ============================================================
   domain/arrange/pathfinder.ts

   Тонкий реэкспорт типов pathfinder из lib/graphics.
   Нужен для обратной совместимости: presentation-хуки и тесты
   импортируют PathfinderOp и isBooleanOperand отсюда.

   ARC-LAYER: domain может зависеть от lib (lib ниже domain),
   поэтому такой реэкспорт архитектурно корректен.
   ============================================================ */

export {
  PATHFINDER_OPS,
  isBooleanOperand,
} from '@/lib/graphics/pathfinder';

export type {
  PathfinderOp,
  PolygonPoints,
} from '@/lib/graphics/pathfinder';