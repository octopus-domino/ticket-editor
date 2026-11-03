import { describe, expect, it } from 'vitest';
import * as connectors from '@/lib/connectors';
import * as geometry from '@/lib/geometry';
import * as hitTest from '@/domain/slide/hitTest';
import * as factory from '@/lib/factories';
import { generateBarChart, generateDonutChart } from '@/lib/graphics/graphs';
import { fillToKonva, fillToSvg, strokeToSvg } from '@/lib/graphics/fills';
import { migrateDocument } from '@/lib/migrations';
import type { AppearanceFill } from '@/shared/types';

describe('layout geometry', () => {
  it.each(['top', 'right', 'bottom', 'left'] as const)(
    'routes connectors from %s anchors with stable endpoints',
    (side) => {
      const first = factory.newShape('rect', 0, 0),
        second = factory.newShape('rect', 400, 300);
      const opposite = connectors.oppositeAnchor(side);
      expect(connectors.oppositeAnchor(opposite)).toBe(side);
      const from = connectors.getAnchorPoint(first, side),
        to = connectors.getAnchorPoint(second, opposite);
      expect(connectors.findNearestAnchor(first, from.x, from.y)).toMatchObject({
        side,
        distance: 0,
      });
      for (const routing of ['straight', 'orthogonal'] as const) {
        const points = connectors.routeConnector(first, side, second, opposite, routing, [
          factory.newShape('circle', 250, 50),
        ]);
        expect(points.slice(0, 2)).toEqual([from.x, from.y]);
        expect(points.slice(-2)).toEqual([to.x, to.y]);
        expect(points.every(Number.isFinite)).toBe(true);
        expect(Object.values(connectors.midpointOfPath(points)).every(Number.isFinite)).toBe(true);
      }
      const rect = connectors.computeGhostRect(first, side, 50, 50);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(connectors.nearestAnchorForSource(rect, first)).toMatch(/top|right|bottom|left/);
      const copy = connectors.cloneForConnector(rect, first);
      expect(copy.id).not.toBe(first.id);
      expect(copy).toMatchObject({ text: '', x: rect.x, y: rect.y });
      expect(
        connectors.resolveConnectorEnds({ fromId: first.id, toId: second.id }, [first, second]),
      ).toEqual({ from: first, to: second });
      expect(connectors.findElementAt([first], 20, 20)).toBe(first);
      expect(connectors.findElementAt([first], 20, 20, [first.id])).toBeNull();
      expect(connectors.findElementWithPadding([first], -5, -5, 10)).toBe(first);
    },
  );
  it('hit tests topmost unlocked elements and table boundaries', () => {
    const shape = factory.newShape('circle', 0, 0),
      other = { ...shape, id: 'locked', locked: true };
    expect(hitTest.findElementAt([shape, other], 50, 50)).toBe(shape);
    expect(hitTest.findElementAt([shape, other], 50, 50, { includeLocked: true })).toBe(other);
    expect(hitTest.findElementAt([shape], -20, -20)).toBeNull();
    const table = factory.newTable(0, 0);
    expect(hitTest.findTableCellAt(table, table.width, table.height)).toEqual({
      row: 2,
      col: 2,
    });
    expect(hitTest.findTableCellAt(table, -1, 0)).toBeNull();
    expect(geometry.hitShapeEl(shape, shape.width / 2, shape.height / 2)).toBe(true);
    expect(geometry.hitShapeEl(shape, 0, 0)).toBe(false);
    const line = { ...factory.newLine(10, 20), points: [0, 0, 100, 50] };
    expect(geometry.getBBox(line)).toEqual({ x: 10, y: 20, w: 100, h: 50 });
    expect(geometry.findElementAt({ ...factory.newSlide(1), elements: [line] }, 30, 30)).toBe(line);
    expect(geometry.gridRound(20)).toBeGreaterThanOrEqual(0);
  });
  it('generates charts with stable totals and proportional bars', () => {
    const bars = generateBarChart([10, 20, 0]);
    expect(bars.length).toBeGreaterThanOrEqual(3);
    expect(generateBarChart([])).toEqual([]);
    expect(generateDonutChart([0])).toEqual([]);
    const sectors = generateDonutChart([10, 20, 30]);
    expect(sectors).toHaveLength(3);
    for (const sector of sectors) expect(sector.polygonPoints?.every(Number.isFinite)).toBe(true);
  });
  it.each(['solid', 'linear', 'radial'] as const)(
    'keeps %s appearance consistent between Canvas and SVG',
    (type) => {
      const fill: AppearanceFill = {
        id: 'fill',
        type,
        color: '#123456',
        opacity: 0.5,
        angle: 45,
        stops: [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#ffffff' },
        ],
      };
      const props = fillToKonva(fill, { width: 100, height: 80 });
      expect(props.opacity).toBe(0.5);
      const svg = fillToSvg(fill, { width: 100, height: 80 });
      if (type === 'solid') expect(svg.fillAttr).toBe('#123456');
      else expect(svg.defs).toContain('<stop');
      expect(fillToKonva(fill, { width: 100, height: 80 }, true).fill).toBe('#123456');
      expect(
        strokeToSvg({
          id: 's',
          color: '#123456',
          width: 3,
          align: 'center',
          dash: 'dashed',
        }).dashAttr,
      ).toContain('10,6');
    },
  );
  it('migrates legacy data and repairs group bounds', () => {
    const text = factory.newSimpleText(10, 20);
    const group = {
      id: 'group',
      type: 'group',
      children: [text.id],
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
    };
    const result = migrateDocument({
      version: '1.0',
      slides: [
        {
          ...factory.newSlide(1),
          elements: [text, group, factory.newStamp('circle')],
        },
      ],
    });
    expect(result.slides[0].elements[1]).toMatchObject({
      x: text.x,
      y: text.y,
      width: text.width,
      height: text.height,
    });
    expect(result.slides[0].elements[0]).toMatchObject({
      verticalAlign: 'top',
    });
  });
});
