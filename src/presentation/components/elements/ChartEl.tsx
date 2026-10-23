import React, { useMemo } from 'react';
import { Group, Rect, Path, Line, Text as KonvaText } from 'react-konva';
import type { ChartElement, DataRoot, DataField } from '@/shared/types';
import type { CommonProps } from './types';
import { useStore } from '@/shared/store/store';
import { useDocumentStore } from '@/ui/providers/EditorProvider';
import { computeBarGeometry, computeDonutGeometry, CHART_PALETTE } from '@/lib/graphics/charts';

interface Props extends CommonProps<ChartElement> {
  el: ChartElement;
  onUpdate: (p: Partial<ChartElement>) => void;
}

function parseSample(sample: string | undefined): number[] {
  if (!sample) return [];
  const str = String(sample).trim();
  if (!str) return [];
  return str
    .split(/[,;\s]+/)
    .map((s) => parseFloat(s.replace(',', '.')))
    .filter((n) => Number.isFinite(n));
}

function resolveValuesFromData(
  data: DataRoot[],
  path: string | null,
  valueField?: string,
): number[] | null {
  if (!path) return null;
  const clean = path.replace(/\[\d+\]/g, '');
  const parts = clean.split('.');
  const rootName = parts.shift();
  if (!rootName) return null;
  const root = data.find((r) => r.name === rootName);
  if (!root) return null;

  let fields: DataField[] = root.fields;
  let current: DataField | null = null;
  for (const p of parts) {
    current = fields.find((f) => f.name === p) ?? null;
    if (!current) return null;
    fields = current.children ?? [];
  }
  if (!current) return null;

  // Case 1: current field has sampleValues
  if (current.sampleValues && current.sampleValues.length > 0) {
    return current.sampleValues.slice();
  }

  // Case 2: current is number field with sample (single or comma-separated)
  if (current.type === 'number') {
    const parsed = parseSample(current.sample);
    if (parsed.length) return parsed;
  }

  // Case 3: current is array
  if (current.type === 'array' && current.children && current.children.length > 0) {
    const numericChildren = current.children.filter((c) => c.type === 'number');
    const target = valueField
      ? current.children.find((c) => c.name === valueField)
      : numericChildren[0];

    if (target) {
      if (target.sampleValues && target.sampleValues.length > 0) {
        return target.sampleValues.slice();
      }
      const parsed = parseSample(target.sample);
      if (parsed.length) return parsed;
    }

    // Fallback: collect from all numeric children
    const all: number[] = [];
    for (const c of numericChildren) {
      if (c.sampleValues && c.sampleValues.length > 0) {
        all.push(...c.sampleValues);
      } else {
        all.push(...parseSample(c.sample));
      }
    }
    if (all.length) return all;

    // Last resort: any child with numeric sample
    for (const c of current.children) {
      const parsed = parseSample(c.sample);
      if (parsed.length) return parsed;
    }
  }

  return null;
}

export const ChartEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const docStore = useDocumentStore();
  const data = useStore(docStore, (s) => s.data);

  const values = useMemo(() => {
    if (el.dataPath) {
      const fromData = resolveValuesFromData(data, el.dataPath, el.valueField);
      if (fromData && fromData.length > 0) return fromData;
      return []; // No silent fallback to defaults when dataPath is set
    }
    return el.values;
  }, [data, el.dataPath, el.valueField, el.values]);

  const palette = el.palette.length ? el.palette : CHART_PALETTE;

  const bars = useMemo(() => {
    if (el.chartKind !== 'bar') return [];
    return computeBarGeometry(values, el.width, el.height, {
      barWidth: el.barWidth,
      gap: el.gap,
      palette,
    });
  }, [el.chartKind, values, el.width, el.height, el.barWidth, el.gap, palette]);

  const donut = useMemo(() => {
    if (el.chartKind !== 'donut') return [];
    return computeDonutGeometry(values, el.width, el.height, {
      innerRatio: el.donutInnerRatio,
      palette,
    });
  }, [el.chartKind, values, el.width, el.height, el.donutInnerRatio, palette]);

  const emptyLabel = !values.length
    ? el.dataPath
      ? `нет данных: ${el.dataPath}`
      : 'нет данных'
    : null;

  return (
    <Group
      id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation}
      draggable dragDistance={3}
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />

      {el.chartKind === 'bar' && (
        <>
          <Line points={[40, el.height - 40, el.width - 10, el.height - 40]} stroke="#cbd5e1" strokeWidth={2} listening={false} />
          <Line points={[40, 20, 40, el.height - 40]} stroke="#cbd5e1" strokeWidth={2} listening={false} />
          {bars.map((b, i) => (
            <Rect key={i} x={b.x} y={b.y} width={b.width} height={b.height} fill={b.fill} listening={false} />
          ))}
        </>
      )}

      {el.chartKind === 'donut' && donut.map((d, i) => (
        <Path key={i} data={d.path} fill={d.fill} stroke="#ffffff" strokeWidth={2} listening={false} />
      ))}

      {emptyLabel && (
        <KonvaText x={0} y={el.height / 2 - 8} width={el.width} align="center" text={emptyLabel} fontSize={14} fill="#94a3b8" listening={false} />
      )}

      {isSelected && (
        <Rect width={el.width} height={el.height} stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />
      )}
    </Group>
  );
};