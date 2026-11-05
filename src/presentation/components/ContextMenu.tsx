import { t as __tr } from '@/shared/i18n';
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

  const clampedX = Math.max(8,Math.min(x, window.innerWidth - 248));
  const clampedY = Math.max(8,Math.min(y, window.innerHeight - 568));
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
    <div ref={menuRef} role="menu" className="context-menu" style={{ left: clampedX, top: clampedY,maxHeight:'calc(100dvh - 16px)',overflowY:'auto' }}>
      {hasSelection && (
        <>
          <div className="context-menu-item" onClick={onCut}>
            <span>{__tr("Вырезать")}</span>
            <span className="shortcut">Ctrl+X</span>
          </div>
          <div className="context-menu-item" onClick={onCopy}>
            <span>{__tr("Копировать")}</span>
            <span className="shortcut">Ctrl+C</span>
          </div>
          <div className={`context-menu-item ${!canPaste ? 'disabled' : ''}`} onClick={canPaste ? onPaste : undefined}>
            <span>{__tr("Вставить")}</span>
            <span className="shortcut">Ctrl+V</span>
          </div>
          <div className="context-menu-item" onClick={onDuplicate}>
            <span>{__tr("Дублировать")}</span>
            <span className="shortcut">Ctrl+D</span>
          </div>

          {/* v8: JSON clipboard */}
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={onCopyAsJson}>
            <span>{__tr("Копировать как JSON")}</span>
          </div>
          <div
            className={`context-menu-item ${!canPasteJson ? 'disabled' : ''}`}
            onClick={canPasteJson ? onPasteFromJson : undefined}
          >
            <span>{__tr("Вставить из JSON")}</span>
          </div>

          <div className="context-menu-divider" />

          {canGroup && onGroup && (
            <div className="context-menu-item" onClick={handleGroup}>
              <span>{__tr("Сгруппировать")}</span>
              <span className="shortcut">Ctrl+G</span>
            </div>
          )}
          {canUngroup && onUngroup && (
            <div className="context-menu-item" onClick={handleUngroup}>
              <span>{__tr("Разгруппировать")}</span>
              <span className="shortcut">Ctrl+Shift+G</span>
            </div>
          )}

          <div className="context-menu-divider" />

          <div className="context-menu-item" onClick={onCopyStyle}>
            <span>{__tr("Копировать стиль")}</span>
            <span className="shortcut">Alt+C</span>
          </div>
          <div className={`context-menu-item ${!hasStyleCopied ? 'disabled' : ''}`} onClick={hasStyleCopied ? onApplyStyle : undefined}>
            <span>{__tr("Применить стиль")}</span>
            <span className="shortcut">Alt+V</span>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-item" onClick={onBringToFront}>
            <span>{__tr("На самый верх")}</span>
          </div>
          <div className="context-menu-item" onClick={onBringForward}>
            <span>{__tr("Переместить вперед")}</span>
            <span className="shortcut">]</span>
          </div>
          <div className="context-menu-item" onClick={onSendBackward}>
            <span>{__tr("Переместить назад")}</span>
            <span className="shortcut">[</span>
          </div>
          <div className="context-menu-item" onClick={onSendToBack}>
            <span>{__tr("На самый низ")}</span>
          </div>

          {isLine && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-item">
                <span>{__tr("Добавить точку")}</span>
              </div>
              <div className="context-menu-item">
                <span>{__tr("Удалить последнюю точку")}</span>
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
                  <span>{__tr("Обрезать по верхнему")}</span>
                </div>
              )}
              {canRemoveClip && onRemoveClip && (
                <div
                  className="context-menu-item"
                  onClick={() => { onRemoveClip(); onClose(); }}
                >
                  <span>{__tr("Снять обрезку")}</span>
                </div>
              )}
            </>
          )}

          <div className="context-menu-divider" />

          <div className="context-menu-item danger" onClick={onDelete}>
            <span>{__tr("Удалить")}</span>
            <span className="shortcut">Del</span>
          </div>
        </>
      )}
    </div>
  );
};
