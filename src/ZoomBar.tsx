import React from 'react';
import { useZoomContext } from '../editor/contexts/ZoomContext';
import { useSelectionContext } from '../editor/contexts/SelectionContext';
import { useFillModeContext } from '../editor/contexts/FillModeContext';

export const ZoomBar: React.FC = () => {
  const zoom = useZoomContext();
  const selection = useSelectionContext();
  const fillMode = useFillModeContext();

  return (
    <div className="zoom-bar">
      <button onClick={() => zoom.setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}>−</button>
      <span>{Math.round(zoom.displayZoom * 100)}%</span>
      <button onClick={() => zoom.setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
      {selection.selectedIds.length > 1 && (
        <span className="style-badge">Выбрано: {selection.selectedIds.length}</span>
      )}
      {fillMode.fillMode && (
        <span
          className="style-badge"
          style={{ background: fillMode.fillColor, color: '#000' }}
        >
          🖌 Заливка
        </span>
      )}
      <span className="hint-drag">
        перетащите элемент из левой панели или элемент из панели данных
      </span>
    </div>
  );
};