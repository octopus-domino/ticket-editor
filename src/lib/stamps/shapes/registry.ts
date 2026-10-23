import type { StampShapeKind } from '@/shared/types';
import type { ShapeStrategy } from './types';
import {
  rectStrategy, circleStrategy, ellipseStrategy,
  triangleStrategy, lineStrategy, fillStrategy,
} from './strategies';

const ALL: ShapeStrategy[] = [
  rectStrategy, circleStrategy, ellipseStrategy,
  triangleStrategy, lineStrategy, fillStrategy,
];

const registry = new Map<StampShapeKind, ShapeStrategy>();
for (const s of ALL) registry.set(s.kind, s);

export function getShapeStrategy(kind: StampShapeKind): ShapeStrategy {
  const s = registry.get(kind);
  if (!s) throw new Error(`[stamps] no strategy for kind="${kind}"`);
  return s;
}

export function getAllStrategies(): readonly ShapeStrategy[] {
  return ALL;
}