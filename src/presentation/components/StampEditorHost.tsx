import React from 'react';
import { StampEditor } from './stamps/StampEditor';
import type { StampElement } from '@/shared/types';

interface Props {
  element: StampElement;
  onClose: () => void;
  onSave: (patch: Partial<StampElement>) => void;
}

/**
 * Адаптер между элементом `StampElement` (в документе) и модульным
 * редактором `stamps/StampEditor`, который работает на «initial*» props.
 * Сохраняет все поля патчем в документ.
 */
export const StampEditorHost: React.FC<Props> = ({ element, onClose, onSave }) => (
  <StampEditor
    initialWidth={element.width}
    initialHeight={element.height}
    initialShapes={element.shapes ?? []}
    initialTexts={element.texts ?? []}
    initialImages={element.images ?? []}
    initialName={element.name}
    onSave={(data) =>
      onSave({
        name: data.name,
        width: data.width,
        height: data.height,
        shapes: data.shapes,
        texts: data.texts,
        images: data.images,
      })
    }
    onCancel={onClose}
  />
);