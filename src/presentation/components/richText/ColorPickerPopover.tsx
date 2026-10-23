import React from 'react';

interface Props {
  title: string;
  colors: string[];
  onPick: (color: string) => void;
  onReset?: () => void;
  resetLabel?: string;
}

export const ColorPickerPopover: React.FC<Props> = ({
  title, colors, onPick, onReset, resetLabel = 'Сбросить',
}) => (
  <div className="rt-popover">
    <div className="rt-popover-title">{title}</div>
    <div className="rt-color-grid">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className="rt-color-cell"
          style={{ background: c }}
          title={c}
          onMouseDown={(e) => { e.preventDefault(); onPick(c); }}
        />
      ))}
    </div>
    {onReset && (
      <button
        type="button"
        className="rt-popover-action"
        onMouseDown={(e) => { e.preventDefault(); onReset(); }}
      >
        {resetLabel}
      </button>
    )}
  </div>
);