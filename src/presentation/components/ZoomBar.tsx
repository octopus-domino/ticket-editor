import React from 'react';

interface Props {
  zoom: number;
  onChange: (z: number) => void;
  selectedCount?: number;
  fillMode?: boolean;
}

export const ZoomBar: React.FC<Props> = ({ zoom, onChange, selectedCount, fillMode }) => (
  <div className="zoom-bar">
    <button onClick={() => onChange(Math.max(0.2, +(zoom - 0.1).toFixed(2)))}>−</button>
    <span>{Math.round(zoom * 100)}%</span>
    <button onClick={() => onChange(Math.min(10, +(zoom + 0.1).toFixed(2)))}>+</button>
    <button onClick={() => onChange(1)}>100%</button>
    {typeof selectedCount === 'number' && selectedCount > 1 && (
      <span className="style-badge">Выбрано: {selectedCount}</span>
    )}
    {fillMode && <span className="style-badge">🎨 Заливка</span>}
  </div>
);