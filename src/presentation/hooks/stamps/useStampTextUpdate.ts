/* ============================================================
   presentation/hooks/stamps/useStampTextUpdate.ts
   REG-B1, REG-S1, F-SGEO-02, F-STMP-N-05.
   ============================================================ */

import { useCallback } from 'react';
import type {
  StampShapeItem, StampTextItem, StampImageItem,
} from '@/shared/types';
import {
  MIN_ARC_SPAN_DEG, MAX_ARC_SPAN_DEG, DEFAULT_ARC_SPAN_DEG, DEFAULT_ARC_OFFSET,
  type ArcDirection,
} from '@/lib/stamps/geometry';
import { autoKey } from '@/lib/stamps/history/autoKey';

interface Args {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  commit: (
    s: StampShapeItem[],
    t: StampTextItem[],
    i: StampImageItem[],
    mergeKey?: string,
  ) => void;
}

const clampSpan = (v: number): number =>
  Math.min(MAX_ARC_SPAN_DEG, Math.max(MIN_ARC_SPAN_DEG, v));

function resolveHost(
  t: StampTextItem,
  shapes: StampShapeItem[],
): StampShapeItem | null {
  if (t.arcHostId) {
    const found = shapes.find((s) => s.id === t.arcHostId);
    if (found) return found;
  }
  return shapes.find((s) => {
    if (s.hidden || s.kind === 'line' || s.kind === 'fill') return false;
    return (
      Math.abs(s.x + s.width / 2 - t.arcCx) < 1 &&
      Math.abs(s.y + s.height / 2 - t.arcCy) < 1
    );
  }) || null;
}

/**
 * Пересчитывает arc-параметры изменившегося поля.
 * Возвращает patch для merge с исходным patch.
 */
function recalcArc(
  t: StampTextItem,
  merged: StampTextItem,
  host: StampShapeItem,
  patch: Partial<StampTextItem>,
): Partial<StampTextItem> {
  const hostId = host.id;
  const direction = (merged.arcDirection ?? 'cw') as ArcDirection;
  const span = clampSpan(
    merged.arcSpanDeg ??
      Math.abs(merged.arcEndDeg - merged.arcStartDeg) ??
      DEFAULT_ARC_SPAN_DEG,
  );

  // Переключение направления
  if ('arcDirection' in patch) {
    const endDeg =
      direction === 'cw'
        ? merged.arcStartDeg + span
        : merged.arcStartDeg - span;
    return {
      arcDirection: direction,
      arcStartDeg: merged.arcStartDeg,
      arcEndDeg: endDeg,
      arcSpanDeg: span,
      arcFlip: direction === 'ccw',
      arcHostId: hostId,
    };
  }

  // Изменение span
  if ('arcSpanDeg' in patch) {
    const endDeg =
      direction === 'cw'
        ? merged.arcStartDeg + span
        : merged.arcStartDeg - span;
    return {
      arcSpanDeg: span,
      arcStartDeg: merged.arcStartDeg,
      arcEndDeg: endDeg,
      arcFlip: direction === 'ccw',
      arcHostId: hostId,
    };
  }

  // Изменение start
  if ('arcStartDeg' in patch) {
    const endDeg =
      direction === 'cw'
        ? merged.arcStartDeg + span
        : merged.arcStartDeg - span;
    return {
      arcStartDeg: merged.arcStartDeg,
      arcEndDeg: endDeg,
      arcSpanDeg: span,
      arcFlip: direction === 'ccw',
      arcHostId: hostId,
    };
  }

  // Изменение end — пересчитываем span и direction
  if ('arcEndDeg' in patch) {
    const rawSpan = merged.arcEndDeg - merged.arcStartDeg;
    const newDirection: ArcDirection = rawSpan >= 0 ? 'cw' : 'ccw';
    return {
      arcDirection: newDirection,
      arcEndDeg: merged.arcEndDeg,
      arcSpanDeg: clampSpan(Math.abs(rawSpan) || DEFAULT_ARC_SPAN_DEG),
      arcFlip: newDirection === 'ccw',
      arcHostId: hostId,
    };
  }

  // Изменение offset / fontSize / arcOutside
  if ('arcOffset' in patch || 'fontSize' in patch || 'arcOutside' in patch) {
    const hostBaseR = Math.min(host.width, host.height) / 2;
    const arcOffset = Math.max(0, merged.arcOffset ?? DEFAULT_ARC_OFFSET);
    const isOutside = !!merged.arcOutside;
    const isPerimeterHost = host.kind === 'rect' || host.kind === 'triangle';
    const newRadius = isPerimeterHost
      ? hostBaseR
      : isOutside
        ? hostBaseR + arcOffset
        : Math.max(merged.fontSize * 0.8, hostBaseR - arcOffset);
    return {
      arcRadius: newRadius,
      arcHostId: hostId,
    };
  }

  return {};
}

export function useStampTextUpdate({ shapes, texts, images, commit }: Args) {
  return useCallback((id: string, patch: Partial<StampTextItem>) => {
    const key = autoKey(id, patch);
    const t = texts.find((x) => x.id === id);

    if (!t) {
      commit(
        shapes,
        texts.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        images,
        key,
      );
      return;
    }

    const merged: StampTextItem = { ...t, ...patch };

    if (merged.mode === 'arc') {
      const host = resolveHost(t, shapes);
      if (host) {
        const extras = recalcArc(t, merged, host, patch);
        commit(
          shapes,
          texts.map((x) => (x.id === id ? { ...x, ...patch, ...extras } : x)),
          images,
          key,
        );
        return;
      }
    }

    commit(
      shapes,
      texts.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      images,
      key,
    );
  }, [shapes, texts, images, commit]);
}