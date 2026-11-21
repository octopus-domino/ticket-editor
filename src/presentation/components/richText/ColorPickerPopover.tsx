import { t as __tr } from '@/shared/i18n';
import { useRef } from 'react';
import { RichTextPopover } from './RichTextPopover';

interface Props {
  title: string;
  colors: string[];
  onPick: (color: string) => void;
  onReset?: () => void;
  resetLabel?: string;
  anchor: HTMLElement | null;
}

export function ColorPickerPopover({ title, colors, onPick, onReset, anchor, resetLabel = __tr("Сбросить") }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <RichTextPopover anchor={anchor} panelRef={panelRef}>
      <div className="rt-popover">
        <div className="rt-popover-title">{title}</div>
        <div className="rt-color-grid">
          {[...new Set(colors)].map((color) => (
            <button
              key={color}
              type="button"
              className="rt-color-cell"
              style={{ background: color }}
              title={color}
              aria-label={color}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onPick(color)}
            />
          ))}
        </div>
        {onReset && (
          <button
            type="button"
            className="rt-popover-action"
            onMouseDown={event => event.preventDefault()}
            onClick={onReset}
          >
            {resetLabel}
          </button>
        )}
      </div>
    </RichTextPopover>
  );
}
