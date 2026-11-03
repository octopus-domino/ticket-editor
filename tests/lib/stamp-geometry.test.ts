import { describe, expect, it, vi } from 'vitest';
import * as geometry from '@/lib/stamps/geometry';
import * as factories from '@/lib/stamps/factories';
import { getAllStrategies } from '@/lib/stamps/shapes/registry';
import { canvasFont, drawArcText } from '@/lib/stamps/render';
import type { StampShapeItem } from '@/shared/types';

const context = {
  shapes: [] as StampShapeItem[],
  selectedId: null,
  selectedType: null,
  stampW: 400,
  stampH: 400,
  placementMode: 'inside' as const,
};
describe('stamp geometry invariants', () => {
  it.each(['rect', 'circle', 'ellipse', 'triangle'] as const)(
    'places arc text and nested %s contours with finite geometry',
    (kind) => {
      const shape = factories.createShape(kind, context);
      expect(shape.width).toBeGreaterThan(0);
      expect(shape.height).toBeGreaterThan(0);
      const cx = shape.x + shape.width / 2,
        cy = shape.y + shape.height / 2;
      expect(geometry.shapeContainsPoint(shape, cx, cy)).toBe(true);
      expect(geometry.shapeContainsPoint(shape, -100, -100)).toBe(false);
      expect(geometry.findContainingShape(cx, cy, '', [shape])?.id).toBe(shape.id);
      expect(geometry.findShapesContaining(cx, cy, [shape])).toEqual([shape]);
      expect(geometry.findNearestShapeByCursor(cx, cy, [shape])?.host.id).toBe(shape.id);
      expect(geometry.findHostShape(cx, cy, '', [shape])?.id).toBe(shape.id);
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const point = geometry.pointOnHostPerimeter(shape, 0, angle);
        expect(point.every(Number.isFinite)).toBe(true);
        const closest = geometry.closestPointOnHostPerimeter(
          shape,
          0,
          cx + 300 * Math.cos(angle),
          cy + 300 * Math.sin(angle),
        );
        expect(closest.every(Number.isFinite)).toBe(true);
        expect(geometry.distanceToPerimeter(shape, closest[0], closest[1])).toBeLessThan(2);
        expect(
          geometry.findSnapTarget(
            closest[0],
            closest[1],
            '',
            [shape],
            Math.max(shape.width, shape.height),
          )?.host.id,
        ).toBe(shape.id);
        for (const outside of [false, true]) {
          const params = geometry.computeArcParamsForAngle(
            shape,
            angle,
            14,
            outside,
            120,
            6,
            'cw',
            10,
          );
          expect(
            Object.values(params)
              .filter((value) => typeof value === 'number')
              .every(Number.isFinite),
          ).toBe(true);
        }
      }
      const nested = {
        ...context,
        shapes: [shape],
        selectedId: shape.id,
        selectedType: 'shape' as const,
      };
      for (const placementMode of ['inside', 'outside', 'next'] as const) {
        const child = factories.createShape(kind, { ...nested, placementMode });
        expect(child.width).toBeGreaterThan(0);
        expect(child.height).toBeGreaterThan(0);
      }
      expect(factories.createStraightText(nested).text.length).toBeGreaterThan(0);
      const text = factories.createArcText(nested);
      expect(text.arcHostId).toBe(shape.id);
      expect(geometry.arcTextBBox(text).width).toBeGreaterThan(0);
      const centered = geometry.snapToHostCenter(cx - 10, cy - 10, 20, 20, shape);
      expect(centered).toMatchObject({
        x: cx - 10,
        y: cy - 10,
        snappedX: true,
        snappedY: true,
      });
      expect(geometry.snapPosition(19, 21, 20, 20, '', [shape], 400, 400, true)).toMatchObject({
        x: 20,
        y: 20,
      });
    },
  );
  it('keeps fill references explicit and excludes hidden shapes', () => {
    const outer = factories.createShape('rect', context);
    const inner = {
      ...outer,
      id: 'hole',
      x: outer.x + 10,
      y: outer.y + 10,
      width: 20,
      height: 20,
    };
    expect(factories.createFillSubtract([outer, inner], outer.id)).toMatchObject({
      fillOuterId: outer.id,
      fillHoleIds: ['hole'],
    });
    expect(factories.createFillIntersect([outer, inner], null)).toMatchObject({
      fillOuterId: outer.id,
      fillHoleIds: ['hole'],
    });
    expect(factories.createFillBetween(outer, [inner], '#123456')).toMatchObject({
      fillHoleIds: ['hole'],
      fill: '#123456',
    });
    expect(factories.createFillSubtract([], null)).toBeNull();
    expect(factories.createFillIntersect([outer], null)).toBeNull();
    expect(geometry.findShapesContaining(200, 200, [{ ...outer, hidden: true }])).toEqual([]);
    expect(factories.createImage('data:image/png;base64,AAAA', 20, 30, 100, 100)).toMatchObject({
      x: 40,
      y: 35,
    });
  });
  it('normalizes transforms through every shape strategy', () => {
    for (const strategy of getAllStrategies()) {
      const shape = factories.createShape(strategy.kind, context);
      for (const ctrl of [false, true]) {
        const transformed = strategy.applyTransform({
          shape,
          nodeX: 100,
          nodeY: 100,
          nodeRotation: 20,
          scaleX: 1.5,
          scaleY: 2,
          ctrl,
          shapes: [shape],
        });
        expect(transformed.resetScale).toBe(strategy.kind !== 'fill');
        expect(
          Object.values(transformed.patch)
            .filter((value) => typeof value === 'number')
            .every(Number.isFinite),
        ).toBe(true);
      }
    }
  });
  it('draws each letter once on arcs and polygon perimeters', () => {
    const fillText = vi.fn(),
      save = vi.fn(),
      restore = vi.fn();
    const ctx = {
      save,
      restore,
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText,
      measureText: () => ({ width: 8 }),
    } as unknown as CanvasRenderingContext2D;
    for (const flip of [false, true]) {
      drawArcText(ctx, {
        text: 'ABC',
        cx: 100,
        cy: 100,
        radius: 70,
        radiusX: 80,
        radiusY: 60,
        startDeg: 0,
        endDeg: 180,
        flip,
        font: canvasFont('Arial', 'bold italic', 16),
        fill: '#123456',
      });
    }
    expect(fillText).toHaveBeenCalledTimes(6);
    for (const kind of ['rect', 'triangle'] as const)
      geometry.drawPerimeterText(ctx, {
        host: factories.createShape(kind, context),
        text: 'ABC',
        arcOffset: 5,
        isOutside: false,
        centerDeg: 90,
        fontSize: 16,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: '#123456',
      });
    expect(fillText).toHaveBeenCalledTimes(12);
    expect(save.mock.calls.length).toBe(restore.mock.calls.length);
  });
});
