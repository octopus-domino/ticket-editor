import React, { useEffect, useRef } from 'react';
import type { CanvasElement } from '@/shared/types';

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string | null;
  selectedElements: CanvasElement[];
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onCopyStyle: () => void;
  onApplyStyle: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  canPaste: boolean;
  hasStyleCopied: boolean;

  /* v8 */
  onCopyAsJson: () => void;
  onPasteFromJson: () => void;
  canPasteJson: boolean;
  onApplyClipByTop?: () => void;
  onRemoveClip?: () => void;
  canClip: boolean;
  canRemoveClip: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, selectedElements, onClose, onCut, onCopy, onPaste, onDuplicate,
  onDelete, onBringToFront, onBringForward, onSendBackward, onSendToBack,
  onCopyStyle, onApplyStyle, onGroup, onUngroup, canPaste, hasStyleCopied,
  onCopyAsJson, onPasteFromJson, canPasteJson,
  onApplyClipByTop, onRemoveClip, canClip, canRemoveClip,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const clampedX = Math.min(x, window.innerWidth - 240);
  const clampedY = Math.min(y, window.innerHeight - 560);
  const hasSelection = selectedElements.length > 0;
  const isLine = selectedElements.length === 1 && selectedElements[0].type === 'line';

  const canGroup = selectedElements.length > 1;
  const canUngroup = selectedElements.some((e) => e.type === 'group');

  const handleGroup = () => {
    if (onGroup) onGroup();
    onClose();
  };

  const handleUngroup = () => {
    if (onUngroup) onUngroup();
    onClose();
  };

  return (
    <div ref={menuRef} className="context-menu" style={{ left: clampedX, top: clampedY }}>
      {hasSelection && (
        <>
          <div className="context-menu-item" onClick={onCut}>
            <span>Вырезать</span>
            <span className="shortcut">Ctrl+X</span>
          </div>
          <div className="context-menu-item" onClick={onCopy}>
            <span>Копировать</span>
            <span className="shortcut">Ctrl+C</span>
          </div>
          <div className={`context-menu-item ${!canPaste ? 'disabled' : ''}`} onClick={canPaste ? onPaste : undefined}>
            <span>Вставить</span>
            <span className="shortcut">Ctrl+V</span>
          </div>
          <div className="context-menu-item" onClick={onDuplicate}>
            <span>Дублировать</span>
            <span className="shortcut">Ctrl+D</span>
          </div>

          {/* v8: JSON clipboard */}
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={onCopyAsJson}>
            <span>Копировать как JSON</span>
          </div>
          <div
            className={`context-menu-item ${!canPasteJson ? 'disabled' : ''}`}
            onClick={canPasteJson ? onPasteFromJson : undefined}
          >
            <span>Вставить из JSON</span>
          </div>

          <div className="context-menu-divider" />

          {canGroup && onGroup && (
            <div className="context-menu-item" onClick={handleGroup}>
              <span>Сгруппировать</span>
              <span className="shortcut">Ctrl+G</span>
            </div>
          )}
          {canUngroup && onUngroup && (
            <div className="context-menu-item" onClick={handleUngroup}>
              <span>Разгруппировать</span>
              <span className="shortcut">Ctrl+Shift+G</span>
            </div>
          )}

          <div className="context-menu-divider" />

          <div className="context-menu-item" onClick={onCopyStyle}>
            <span>Копировать стиль</span>
            <span className="shortcut">Alt+C</span>
          </div>
          <div className={`context-menu-item ${!hasStyleCopied ? 'disabled' : ''}`} onClick={hasStyleCopied ? onApplyStyle : undefined}>
            <span>Применить стиль</span>
            <span className="shortcut">Alt+V</span>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-item" onClick={onBringToFront}>
            <span>На самый верх</span>
          </div>
          <div className="context-menu-item" onClick={onBringForward}>
            <span>Переместить вперед</span>
            <span className="shortcut">]</span>
          </div>
          <div className="context-menu-item" onClick={onSendBackward}>
            <span>Переместить назад</span>
            <span className="shortcut">[</span>
          </div>
          <div className="context-menu-item" onClick={onSendToBack}>
            <span>На самый низ</span>
          </div>

          {isLine && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-item">
                <span>Добавить точку</span>
              </div>
              <div className="context-menu-item">
                <span>Удалить последнюю точку</span>
              </div>
            </>
          )}

          {/* v8: clip */}
          {(canClip || canRemoveClip) && (
            <>
              <div className="context-menu-divider" />
              {canClip && onApplyClipByTop && (
                <div
                  className="context-menu-item"
                  onClick={() => { onApplyClipByTop(); onClose(); }}
                >
                  <span>Обрезать по верхнему</span>
                </div>
              )}
              {canRemoveClip && onRemoveClip && (
                <div
                  className="context-menu-item"
                  onClick={() => { onRemoveClip(); onClose(); }}
                >
                  <span>Снять обрезку</span>
                </div>
              )}
            </>
          )}

          <div className="context-menu-divider" />

          <div className="context-menu-item danger" onClick={onDelete}>
            <span>Удалить</span>
            <span className="shortcut">Del</span>
          </div>
        </>
      )}
    </div>
  );
};