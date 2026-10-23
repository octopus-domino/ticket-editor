import React, { useCallback, useRef } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { InlineEditor } from './InlineEditor';
import type { EditingState } from '../stores/ModalsStore';

interface Props {
  editing: EditingState;
  onClose: () => void;
  onCommit: (html: string | undefined, text: string) => void;
}

export const InlineEditorHost: React.FC<Props> = ({ editing, onClose, onCommit }) => {
  const valueRef = useRef(editing.value || '');

  const handlePlainCommit = useCallback(() => {
    onCommit(undefined, valueRef.current);
  }, [onCommit]);

  if (editing.isRich) {
    return (
      <RichTextEditor
        isOpen
        initialHtml={editing.html ?? `<p>${escapeHtml(editing.value ?? '')}</p>`}
        onClose={onClose}
        onSave={(html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          let text = doc.body.textContent ?? '';
          text = text.replace(/\u00a0/g, ' ');
          onCommit(html, text);
        }}
      />
    );
  }

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
      onChange={(val) => {
        if (val.value !== undefined) valueRef.current = val.value;
      }}
      onCommit={handlePlainCommit}
      onCancel={onClose}
    />
  );
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}