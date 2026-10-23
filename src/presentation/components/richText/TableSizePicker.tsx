import React, { useState } from 'react';

interface Props {
  onPick: (rows: number, cols: number) => void;
}

const MAX = 6;

export const TableSizePicker: React.FC<Props> = ({ onPick }) => {
  const [hover, setHover] = useState({ r: -1, c: -1 });

  return (
    <div className="rt-popover">
      <div className="rt-popover-title">Размер таблицы</div>
      <div className="rt-table-grid">
        {Array.from({ length: MAX }, (_, r) =>
          Array.from({ length: MAX }, (_, c) => {
            const active = r <= hover.r && c <= hover.c && hover.r >= 0 && hover.c >= 0;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={`rt-table-cell ${active ? 'active' : ''}`}
                onMouseEnter={() => setHover({ r, c })}
                onMouseLeave={() => setHover({ r: -1, c: -1 })}
                onMouseDown={(e) => { e.preventDefault(); onPick(r + 1, c + 1); }}
              />
            );
          })
        )}
      </div>
      <div className="rt-popover-hint">
        {hover.r >= 0 ? `${hover.r + 1} × ${hover.c + 1}` : 'Наведите курсор'}
      </div>
    </div>
  );
};