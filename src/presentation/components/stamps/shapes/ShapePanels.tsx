import React from 'react';
import type {
  StampShapeKind, DashType, StampFillMode,
} from '@/shared/types';
import type { ShapePanelContext } from './types';

const KIND_LABEL: Record<StampShapeKind, string> = {
  ellipse: 'Эллипс',
  circle: 'Круг',
  rect: 'Прямоугольник',
  triangle: 'Треугольник',
  line: 'Линия',
  fill: 'Заливка',
};

export const ClosedShapePanel: React.FC<ShapePanelContext & { showCornerRadius?: boolean }> =
  ({ shape, onChange, showCornerRadius }) => (
    <>
      <h4>Свойства</h4>
      <label>
        Имя
        <input value={shape.name || ''} placeholder={KIND_LABEL[shape.kind]} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <label className="check" style={{ flex: 1 }}>
          <input type="checkbox" checked={!!shape.locked} onChange={(e) => onChange({ locked: e.target.checked })} /> Закрепить
        </label>
        <label className="check" style={{ flex: 1 }}>
          <input type="checkbox" checked={!!shape.hidden} onChange={(e) => onChange({ hidden: e.target.checked })} /> Скрыть
        </label>
      </div>

      <h4>Геометрия</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <label>X <input type="number" value={Math.round(shape.x)} onChange={(e) => onChange({ x: +e.target.value })} /></label>
        <label>Y <input type="number" value={Math.round(shape.y)} onChange={(e) => onChange({ y: +e.target.value })} /></label>
        <label>Ширина <input type="number" min="1" value={Math.round(shape.width)} onChange={(e) => onChange({ width: Math.max(1, +e.target.value) })} /></label>
        <label>Высота <input type="number" min="1" value={Math.round(shape.height)} onChange={(e) => onChange({ height: Math.max(1, +e.target.value) })} /></label>
      </div>
      {showCornerRadius && (
        <label>Радиус <input type="number" min="0" value={shape.cornerRadius} onChange={(e) => onChange({ cornerRadius: +e.target.value })} /></label>
      )}

      <h4>Обводка</h4>
      <label>Цвет <input type="color" value={shape.stroke || '#000000'} onChange={(e) => onChange({ stroke: e.target.value })} /></label>
      <label>Толщина <input type="number" min="0.25" max="40" step="0.25" value={shape.strokeWidth} onChange={(e) => onChange({ strokeWidth: +e.target.value })} /></label>
      <label>
        Стиль
        <select value={shape.dash} onChange={(e) => onChange({ dash: e.target.value as DashType })}>
          <option value="solid">Сплошная</option>
          <option value="dashed">Штрих</option>
          <option value="dotted">Точки</option>
          <option value="dashdot">Штрих-пунктир</option>
          <option value="longdash">Длинный штрих</option>
        </select>
      </label>

      <h4>Заливка</h4>
      <label>Цвет <input type="color" value={shape.fill || '#ffffff'} onChange={(e) => onChange({ fill: e.target.value })} /></label>
      <button onClick={() => onChange({ fill: undefined })}>Прозрачная</button>
    </>
  );

export const LinePanel: React.FC<ShapePanelContext> = ({ shape, onChange }) => {
  const points = shape.points && shape.points.length >= 4
    ? shape.points
    : [0, shape.height / 2, shape.width, shape.height / 2];
  const pointCount = points.length / 2;

  const setPoint = (index: number, x: number, y: number) => {
    const next = [...points];
    next[index * 2] = x;
    next[index * 2 + 1] = y;
    onChange({ points: next });
  };

  const addPointAtEnd = () => {
    const lastX = points[points.length - 2];
    const lastY = points[points.length - 1];
    const prevX = points[points.length - 4];
    const prevY = points[points.length - 3];
    onChange({ points: [...points, lastX + (lastX - prevX), lastY + (lastY - prevY)] });
  };

  const removePointAt = (index: number) => {
    if (pointCount <= 2) return;
    const next = points.slice();
    next.splice(index * 2, 2);
    onChange({ points: next });
  };

  return (
    <>
      <h4>Линия</h4>
      <label>
        Имя
        <input value={shape.name || ''} placeholder="Линия" onChange={(e) => onChange({ name: e.target.value })} />
      </label>

      <h4>Точки ({pointCount})</h4>
      <p className="hint-sm" style={{ margin: 0 }}>
        Двойной клик — добавить точку. ПКМ по точке — удалить.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
        {Array.from({ length: pointCount }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#6b7280', width: 20 }}>#{i + 1}</span>
            <input
              type="number"
              value={Math.round(points[i * 2])}
              onChange={(e) => setPoint(i, +e.target.value, points[i * 2 + 1])}
              style={{ width: 60, padding: '4px 6px', fontSize: 11 }}
            />
            <input
              type="number"
              value={Math.round(points[i * 2 + 1])}
              onChange={(e) => setPoint(i, points[i * 2], +e.target.value)}
              style={{ width: 60, padding: '4px 6px', fontSize: 11 }}
            />
            <button
              type="button"
              disabled={pointCount <= 2}
              onClick={() => removePointAt(i)}
              style={{
                padding: '4px 8px', fontSize: 11,
                color: pointCount <= 2 ? '#9ca3af' : '#dc2626',
                border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff',
              }}
            >—</button>
          </div>
        ))}
      </div>
      <button type="button" className="tool-btn" onClick={addPointAtEnd}>+ Добавить точку</button>

      <h4>Обводка</h4>
      <label>Цвет <input type="color" value={shape.stroke || '#000000'} onChange={(e) => onChange({ stroke: e.target.value })} /></label>
      <label>Толщина <input type="number" min="0.25" max="40" step="0.25" value={shape.strokeWidth} onChange={(e) => onChange({ strokeWidth: +e.target.value })} /></label>
      <label>
        Стиль
        <select value={shape.dash} onChange={(e) => onChange({ dash: e.target.value as DashType })}>
          <option value="solid">Сплошная</option>
          <option value="dashed">Штрих</option>
          <option value="dotted">Точки</option>
          <option value="dashdot">Штрих-пунктир</option>
          <option value="longdash">Длинный штрих</option>
        </select>
      </label>

      <label className="check" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={!!shape.isArrow}
          onChange={(e) => onChange({ isArrow: e.target.checked })}
        /> Стрелка
      </label>
    </>
  );
};

const AnchorFillPanel: React.FC<ShapePanelContext> = ({ shape, allShapes, onChange }) => {
  const target = shape.fillTargetShapeId
    ? allShapes.find((s) => s.id === shape.fillTargetShapeId) || null
    : null;
  return (
    <>
      <h4>Заливка области</h4>
      {target && <p className="hint-sm">Привязана к <b>{target.name || target.kind}</b>.</p>}
      <label>
        Цвет
        <input
          type="color"
          value={(shape.fill && shape.fill.startsWith('#')) ? shape.fill : '#fbbf24'}
          onChange={(e) => onChange({ fill: e.target.value })}
        />
      </label>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <label className="check" style={{ flex: 1 }}>
          <input type="checkbox" checked={!!shape.locked} onChange={(e) => onChange({ locked: e.target.checked })} /> Закрепить
        </label>
        <label className="check" style={{ flex: 1 }}>
          <input type="checkbox" checked={!!shape.hidden} onChange={(e) => onChange({ hidden: e.target.checked })} /> Скрыть
        </label>
      </div>
    </>
  );
};

const LegacyPathFillPanel: React.FC<ShapePanelContext> = ({ shape, allShapes, onChange }) => {
  const fillMode: StampFillMode = shape.fillMode || 'subtract';
  const outer = shape.fillOuterId
    ? allShapes.find((s) => s.id === shape.fillOuterId) || null
    : null;
  const holeIds = shape.fillHoleIds || [];
  const candidates = allShapes.filter((s) => s.id !== shape.id && s.kind !== 'fill');

  const toggleHole = (id: string) => {
    const next = holeIds.includes(id)
      ? holeIds.filter((x) => x !== id)
      : [...holeIds, id];
    onChange({ fillHoleIds: next });
  };

  return (
    <>
      <h4>Заливка области</h4>
      <label>
        Режим
        <select value={fillMode} onChange={(e) => onChange({ fillMode: e.target.value as StampFillMode })}>
          <option value="subtract">Вычесть</option>
          <option value="intersect">Пересечение</option>
        </select>
      </label>
      <label>
        Цвет
        <input
          type="color"
          value={(shape.fill && shape.fill.startsWith('#')) ? shape.fill : '#bfdbfe'}
          onChange={(e) => onChange({ fill: e.target.value })}
        />
      </label>

      <h4>Фигура-основа</h4>
      <select value={shape.fillOuterId || ''} onChange={(e) => onChange({ fillOuterId: e.target.value || undefined })}>
        <option value="">-- не выбрана --</option>
        {candidates.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name || KIND_LABEL[s.kind]} ({s.id.slice(0, 4)}…)
          </option>
        ))}
      </select>
      {!outer && <p className="hint-sm" style={{ color: '#c00' }}>Выберите фигуру.</p>}

      <h4>{fillMode === 'intersect' ? 'Пересечение с' : 'Вычесть'}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {candidates.filter((s) => s.id !== shape.fillOuterId).map((s) => (
          <label key={s.id} className="check" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={holeIds.includes(s.id)}
              onChange={() => toggleHole(s.id)}
            />
            <span>
              {s.name || KIND_LABEL[s.kind]}{' '}
              <span style={{ color: '#999', fontSize: 10 }}>{s.id.slice(0, 4)}…</span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
};

export const FillPanel: React.FC<ShapePanelContext> = (props) => {
  if (props.shape.fillTargetShapeId) return <AnchorFillPanel {...props} />;
  return <LegacyPathFillPanel {...props} />;
};