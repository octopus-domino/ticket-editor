import React from 'react';
import type {
  CanvasElement, AppearanceFill, AppearanceStroke,
  AppearanceFillType, GradientStop,
} from '@/shared/types';
import { generateIdWithPrefix } from '@/shared/utils/id';

const inputStyle: React.CSSProperties = {
  padding: '5px 8px', fontSize: 12,
  border: '1px solid #cbd5e1', borderRadius: 4, boxSizing: 'border-box',
};

interface Props {
  element: CanvasElement;
  update: (patch: Partial<CanvasElement>) => void;
}

const FILL_TYPE_LABEL: Record<AppearanceFillType, string> = {
  solid: 'Сплошная',
  linear: 'Линейный',
  radial: 'Радиальный',
};

const DEFAULT_STOPS: GradientStop[] = [
  { offset: 0, color: '#6366f1' },
  { offset: 1, color: '#ec4899' },
];

export const AppearancePanel: React.FC<Props> = ({ element, update }) => {
  const appearance = element.appearance ?? {};

  // ИСПРАВЛЕНИЕ: стабильный ID, чтобы React не размонтировал DOM-элементы
  const ensureFills = (): AppearanceFill[] => {
    if (appearance.fills && appearance.fills.length) return appearance.fills;
    const color = 'fill' in element && typeof element.fill === 'string' ? element.fill : '#888888';
    return [{ id: '__legacy_fill', type: 'solid', color, opacity: 1 }];
  };

  // ИСПРАВЛЕНИЕ: стабильный ID
  const ensureStrokes = (): AppearanceStroke[] => {
    if (appearance.strokes && appearance.strokes.length) return appearance.strokes;
    if (
      'stroke' in element && 'strokeWidth' in element
      && typeof element.stroke === 'string'
      && typeof element.strokeWidth === 'number'
      && element.stroke !== 'transparent'
    ) {
      return [{ id: '__legacy_stroke', color: element.stroke, width: element.strokeWidth, align: 'center' }];
    }
    return [];
  };

  const fills = ensureFills();
  const strokes = ensureStrokes();

  const setFills = (next: AppearanceFill[]) => {
    update({ appearance: { ...appearance, fills: next }, styleId: null });
  };

  const setStrokes = (next: AppearanceStroke[]) => {
    update({ appearance: { ...appearance, strokes: next }, styleId: null });
  };

  const changeFillType = (idx: number, type: AppearanceFillType) => {
    const next = fills.map((f, i) => {
      if (i !== idx) return f;
      if (type === 'solid') return { ...f, type, color: f.color ?? '#6366f1', stops: undefined, angle: undefined };
      return {
        ...f,
        type,
        angle: type === 'linear' ? (f.angle ?? 0) : undefined,
        stops: f.stops && f.stops.length >= 2 ? f.stops : DEFAULT_STOPS,
      };
    });
    setFills(next);
  };

  const changeStop = (fillIdx: number, stopIdx: number, patch: Partial<GradientStop>) => {
    const next = fills.map((f, i) => {
      if (i !== fillIdx || !f.stops) return f;
      const stops = f.stops.map((s, j) => (j === stopIdx ? { ...s, ...patch } : s));
      return { ...f, stops };
    });
    setFills(next);
  };

  const moveStroke = (from: number, to: number) => {
    if (to < 0 || to >= strokes.length) return;
    const next = [...strokes];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setStrokes(next);
  };

  return (
    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
        Appearance
      </h4>

      {/* ---------- Fills ---------- */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
        Заливки ({fills.length})
      </div>
      {fills.map((fill, idx) => (
        <div
          key={fill.id}
          style={{
            padding: 6, marginBottom: 6, border: '1px solid #e2e8f0',
            borderRadius: 4, background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <select
              style={{ ...inputStyle, flex: 1 }}
              value={fill.type}
              onChange={e => changeFillType(idx, e.target.value as AppearanceFillType)}
            >
              {(['solid', 'linear', 'radial'] as AppearanceFillType[]).map(t => (
                <option key={t} value={t}>{FILL_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <button
              type="button"
              title="Удалить заливку"
              style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}
              onClick={() => setFills(fills.filter((_, i) => i !== idx))}
            >×</button>
          </div>

          {fill.type === 'solid' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input
                type="color"
                value={fill.color ?? '#6366f1'}
                onChange={e => setFills(fills.map((f, i) => i === idx ? { ...f, color: e.target.value } : f))}
                style={{ width: '100%', height: 28, padding: 2, cursor: 'pointer' }}
              />
            </div>
          )}

          {(fill.type === 'linear' || fill.type === 'radial') && (
            <div style={{ marginBottom: 4 }}>
              {(fill.stops ?? []).map((stop, sIdx) => (
                <div key={sIdx} style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={stop.offset}
                    onChange={e => changeStop(idx, sIdx, { offset: parseFloat(e.target.value) })}
                    style={{ flex: 1 }}
                    title="Позиция"
                  />
                  <input
                    type="color"
                    value={stop.color}
                    onChange={e => changeStop(idx, sIdx, { color: e.target.value })}
                    style={{ width: 40, height: 24, padding: 2, cursor: 'pointer' }}
                  />
                </div>
              ))}
              {fill.type === 'linear' && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Угол:</span>
                  <input
                    type="number"
                    value={fill.angle ?? 0}
                    onChange={e => setFills(fills.map((f, i) => i === idx ? { ...f, angle: parseFloat(e.target.value) || 0 } : f))}
                    style={{ ...inputStyle, width: 60 }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>°</span>
                </div>
              )}
            </div>
          )}

          {/* Прозрачность (видна для всех типов заливок) */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', width: 80 }}>Прозрачность:</span>
            <input
              type="range" min={0} max={1} step={0.01}
              value={fill.opacity ?? 1}
              onChange={e => setFills(fills.map((f, i) => i === idx ? { ...f, opacity: parseFloat(e.target.value) } : f))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, width: 30, textAlign: 'right', color: '#64748b' }}>
              {Math.round((fill.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      ))}
      <button
        type="button"
        style={{ ...inputStyle, width: '100%', cursor: 'pointer', marginBottom: 12 }}
        onClick={() => setFills([...fills, { id: generateIdWithPrefix('fill'), type: 'solid', color: '#10b981', opacity: 1 }])}
      >
        + Заливка
      </button>

      {/* ---------- Strokes ---------- */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
        Обводки ({strokes.length})
      </div>
      {strokes.map((stroke, idx) => (
        <div key={stroke.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
          <input
            type="color"
            value={stroke.color}
            onChange={e => setStrokes(strokes.map((s, i) => i === idx ? { ...s, color: e.target.value } : s))}
            style={{ width: 32, height: 28, padding: 2, cursor: 'pointer' }}
          />
          <input
            type="number" min={0} max={40} step={0.5}
            value={stroke.width}
            onChange={e => setStrokes(strokes.map((s, i) => i === idx ? { ...s, width: parseFloat(e.target.value) || 0 } : s))}
            style={{ ...inputStyle, width: 50 }}
            title="Толщина"
          />
          <button
            type="button"
            title="Выше"
            disabled={idx === 0}
            onClick={() => moveStroke(idx, idx - 1)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
          >↑</button>
          <button
            type="button"
            title="Ниже"
            disabled={idx === strokes.length - 1}
            onClick={() => moveStroke(idx, idx + 1)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx === strokes.length - 1 ? 0.3 : 1 }}
          >↓</button>
          <button
            type="button"
            title="Удалить обводку"
            style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}
            onClick={() => setStrokes(strokes.filter((_, i) => i !== idx))}
          >×</button>
        </div>
      ))}
      <button
        type="button"
        style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
        onClick={() => setStrokes([...strokes, { id: generateIdWithPrefix('stroke'), color: '#0f172a', width: 2, align: 'center' }])}
      >
        + Обводка
      </button>
    </div>
  );
};