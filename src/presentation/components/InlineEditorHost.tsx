import React, { useCallback, useRef } from 'react';
import { InlineEditor } from './InlineEditor';
import type { EditingState } from '../stores/ModalsStore';

interface Props {
  editing: EditingState;
  onClose: () => void;
  onCommit: (html: string | undefined, text: string) => void;
}

export const InlineEditorHost: React.FC<Props> = ({ editing, onClose, onCommit }) => {
  const valueRef = useRef(editing.value || '');

  const handlePlainCommit = useCallback(() => onCommit(undefined, valueRef.current), [onCommit]);

  return (
    <InlineEditor
      isOpen
      x={editing.x} y={editing.y}
      width={editing.width} height={editing.height}
      value={editing.value}
      html={editing.html}
      fontSize={editing.fontSize} fontFamily={editing.fontFamily}
      fontStyle={editing.fontStyle} textDecoration={editing.textDecoration}
      fill={editing.fill} align={editing.align} verticalAlign={editing.verticalAlign}
      lineHeight={editing.lineHeight} padding={editing.padding} background={editing.background}
      onChange={(val) => { if (val.value !== undefined) valueRef.current = val.value; }}
      onCommit={handlePlainCommit}
      onCancel={onClose}
    />
  );
};