import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  align: string;
  fill: string;
  onChange: (v: string) => void;
  onCommit: (value: string, height: number) => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<Props> = ({
  x, y, width, height, value, fontSize, fontFamily,
  fontStyle, textDecoration, align, fill,
  onChange, onCommit, onCancel,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [local, setLocal] = useState(value);
  const committed = useRef(false);

  useEffect(() => { setLocal(value); }, [value]);

  useEffect(() => {
    ref.current?.focus();
    const len = value.length;
    ref.current?.setSelectionRange(len, len);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const needed = el.scrollHeight;
    el.style.height = `${Math.max(height, needed)}px`;
  }, [local, height, width, fontSize]);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const h = ref.current?.scrollHeight ?? height;
    onCommit(local, h);
  };

  const cancel = () => {
    if (committed.current) return;
    committed.current = true;
    onCancel();
  };

  return (
    <textarea
      ref={ref}
      className="inline-text-editor"
      style={{
        left: x, top: y, width,
        minHeight: height,
        fontSize, fontFamily,
        fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
        fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
        textDecoration,
        textAlign: align as any,
        color: fill,
        lineHeight: 1.3,
      }}
      value={local}
      onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); commit(); }
        e.stopPropagation();
      }}
      autoFocus
      spellCheck={false}
    />
  );
};