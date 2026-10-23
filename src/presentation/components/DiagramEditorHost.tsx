import React from 'react';
import { DiagramEditor } from './DiagramEditor';
import type { DiagramElement } from '@/shared/types';

interface Props {
  element: DiagramElement;
  onClose: () => void;
  onSave: (patch: Partial<DiagramElement>) => void;
}

export const DiagramEditorHost: React.FC<Props> = ({
  element,
  onClose,
  onSave,
}) => (
  <DiagramEditor
    svg={element.svg}
    xml={element.xml}
    isOpen
    onClose={onClose}
    onSave={(svg, xml) => onSave({ svg, xml })}
  />
);