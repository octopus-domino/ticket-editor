import React, { useMemo } from 'react';
import { ContextMenu, type ContextAction } from '../ContextMenu';
import { useModalsContext } from '../editor/contexts/ModalsContext';
import { useActionsContext } from '../editor/contexts/ActionsContext';
import { useSelectionContext } from '../editor/contexts/SelectionContext';

export const EditorContextMenu: React.FC = () => {
  const modals = useModalsContext();
  const actions = useActionsContext();
  const selection = useSelectionContext();

  const items: ContextAction[] = useMemo(() => {
    const list: ContextAction[] = [];
    const sel = selection.selected;

    if (sel && sel.type === 'line') {
      list.push({
        label: '➕ Добавить опорную точку (в конце)',
        action: () => {
          const el = sel as any;
          const pts = el.points && el.points.length >= 4
            ? el.points
            : [0, el.height / 2, el.width, el.height / 2];
          const lastX = pts[pts.length - 2];
          const lastY = pts[pts.length - 1];
          const prevX = pts[pts.length - 4];
          const prevY = pts[pts.length - 3];
          actions.updateWithHistory(el.id, {
            points: [...pts, lastX + (lastX - prevX), lastY + (lastY - prevY)],
          });
        },
      });
      const pts = (sel as any).points || [];
      if (pts.length > 4) {
        list.push({
          label: '➖ Удалить последнюю точку',
          action: () => {
            const el = sel as any;
            actions.updateWithHistory(el.id, {
              points: el.points.slice(0, el.points.length - 2),
            });
          },
        });
      }
    }

    list.push(
      { label: '✂ Вырезать', shortcut: 'Ctrl+X', action: actions.cut },
      { label: '📋 Копировать', shortcut: 'Ctrl+C', action: actions.copy },
      { label: '📌 Вставить', shortcut: 'Ctrl+V', action: actions.paste },
      { label: '📄 Дублировать', shortcut: 'Ctrl+D', action: actions.duplicate },
      { label: '🖌 Копировать стиль', shortcut: 'Ctrl+Alt+C', action: actions.copyStyle },
      { label: '🖍 Применить стиль', shortcut: 'Ctrl+Alt+V', action: actions.applyStyle },
      { label: '⬆ Вверх на слой', action: () => actions.moveLayer(1) },
      { label: '⬇ Вниз на слой', action: () => actions.moveLayer(-1) },
      { label: '🗑 Удалить', shortcut: 'Delete', action: actions.removeSelected, danger: true },
    );

    return list;
  }, [selection.selected, actions]);

  if (!modals.contextMenu) return null;

  return (
    <ContextMenu
      x={modals.contextMenu.x}
      y={modals.contextMenu.y}
      actions={items}
      onClose={() => modals.setContextMenu(null)}
    />
  );
};