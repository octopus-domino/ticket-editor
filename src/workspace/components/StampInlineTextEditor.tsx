import React from 'react';
import type { StampTextItem } from '../../../types';
import { arcTextBBox } from '../../../lib/stamps/geometry';

interface Props {
  text: StampTextItem;
  zoom: number;
  pan: { x: number; y: number };
  onChange: (v: string) => void;
  onClose: () => void;
}

export const StampInlineTextEditor: React.FC<Props> = ({
  text, zoom, pan, onChange, onClose,
}) => {
  let left = 0, top = 0, width = 200, height = 30;

  if (text.mode === 'straight') {
    left = text.x * zoom + pan.x;
    top = text.y * zoom + pan.y;
    width = Math.max(80, text.width * zoom);
    height = Math.max(20, text.fontSize * 1.5 * zoom);
  } else {
    /* Для эллиптической дуги используем актуальные rx/ry */
    const rx = text.arcRx ?? text.arcRadius;
    const ry = text.arcRy ?? text.arcRadius;

    const bb = arcTextBBox({
      text: text.text,
      arcCx: text.arcCx, arcCy: text.arcCy,
      arcRadius: text.arcRadius,
      arcRx: rx, arcRy: ry,
      arcStartDeg: text.arcStartDeg, arcEndDeg: text.arcEndDeg,
      fontSize: text.fontSize,
    });
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    width = Math.max(140, Math.min(280, bb.width * zoom));
    height = Math.max(24, text.fontSize * 1.6 * zoom);
    left = cx * zoom + pan.x - width / 2;
    top = cy * zoom + pan.y - height / 2;
  }

  return (
    <textarea
      autoFocus
      value={text.text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', left, top, width, minHeight: height, zIndex: 50,
        boxSizing: 'border-box', padding: '2px 6px',
        border: '2px solid #6366f1', borderRadius: 4, outline: 'none', resize: 'none',
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 0 0 4px rgba(99,102,241,0.15)',
        fontSize: Math.max(10, text.fontSize * zoom),
        fontFamily: text.fontFamily,
        fontWeight: text.fontStyle.includes('bold') ? 700 : 400,
        fontStyle: text.fontStyle.includes('italic') ? 'italic' : 'normal',
        textDecoration: text.textDecoration,
        color: text.fill,
        textAlign: text.align as any,
        lineHeight: 1.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}
    />
  );
};