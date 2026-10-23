import React, { useState, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { BG_COLORS, BORDER_COLORS, BORDER_WIDTHS, CELL_PADDINGS } from './palettes';

/* ============================================================
   CellFillPopover
   ============================================================ */

export const CellFillPopover: React.FC<{ onSet: (color: string | null) => void }> = ({ onSet }) => (
  <div className="rt-popover">
    <div className="rt-popover-title">Заливка ячейки</div>
    <div className="rt-color-grid">
      {BG_COLORS.flat().map((c) => (
        <button
          key={c} type="button" className="rt-color-cell" style={{ background: c }} title={c}
          onMouseDown={(e) => { e.preventDefault(); onSet(c); }}
        />
      ))}
      <button type="button" className="rt-color-cell color-reset" title="Без заливки"
        onMouseDown={(e) => { e.preventDefault(); onSet(null); }}>×</button>
    </div>
  </div>
);

/* ============================================================
   CellBorderPopover
   ============================================================ */

export type BorderSidePreset =
  | 'all'
  | 'topBottom'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'none';

const SIDE_LABEL: Record<BorderSidePreset, string> = {
  all: 'Все 4 стороны',
  topBottom: 'Сверху и снизу',
  top: 'Только сверху',
  right: 'Только справа',
  bottom: 'Только снизу',
  left: 'Только слева',
  none: 'Без границ',
};

const SIDES_CAP = ['Top', 'Right', 'Bottom', 'Left'] as const;
type SideCap = typeof SIDES_CAP[number];

interface SideAttrs {
  color?: string;
  width?: string;
  style?: string;
}

function readSideAttrs(editor: Editor): Record<SideCap, SideAttrs> {
  const attrs = editor.isActive('tableHeader')
    ? editor.getAttributes('tableHeader')
    : editor.getAttributes('tableCell');
  const out = {} as Record<SideCap, SideAttrs>;
  for (const s of SIDES_CAP) {
    out[s] = {
      color: attrs[`border${s}Color`] as string | undefined,
      width: attrs[`border${s}Width`] as string | undefined,
      style: attrs[`border${s}Style`] as string | undefined,
    };
  }
  return out;
}

function parsePx(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(String(v).trim().replace('px', ''));
  return Number.isFinite(n) ? n : 0;
}

function sideIsVisible(a: SideAttrs): boolean {
  const w = parsePx(a.width);
  const st = (a.style ?? '').toLowerCase();
  return w > 0 && st !== 'none';
}

function detectPreset(sides: Record<SideCap, SideAttrs>): BorderSidePreset {
  const v = SIDES_CAP.map((s) => sideIsVisible(sides[s]));
  const count = v.filter(Boolean).length;

  if (count === 0) return 'none';
  if (count === 4) return 'all';
  if (count === 2 && v[0] && !v[1] && v[2] && !v[3]) return 'topBottom';
  if (count === 1) {
    if (v[0]) return 'top';
    if (v[1]) return 'right';
    if (v[2]) return 'bottom';
    if (v[3]) return 'left';
  }
  return 'all';
}

/**
 * Формируем patch, где КАЖДАЯ из 4 сторон имеет явное значение.
 *  - активные: реальные color/width/style
 *  - неактивные: width='0px', style='none' (а не null!)
 *
 * Иначе inline-стили не перекрывают ни CSS, ни TipTap-defaults,
 * и граница выглядит «не снялась».
 */
function buildPatch(
  preset: BorderSidePreset,
  color: string,
  width: string,
  style: string,
): Record<string, string> {
  const active: Record<SideCap, boolean> = {
    Top: false, Right: false, Bottom: false, Left: false,
  };

  switch (preset) {
    case 'all':
      active.Top = active.Right = active.Bottom = active.Left = true;
      break;
    case 'topBottom':
      active.Top = active.Bottom = true;
      break;
    case 'top':    active.Top = true;    break;
    case 'right':  active.Right = true;  break;
    case 'bottom': active.Bottom = true; break;
    case 'left':   active.Left = true;   break;
    case 'none':   /* всё false */ break;
  }

  const patch: Record<string, string> = {};
  for (const s of SIDES_CAP) {
    if (active[s]) {
      patch[`border${s}Color`] = color;
      patch[`border${s}Width`] = width;
      patch[`border${s}Style`] = style;
    } else {
      patch[`border${s}Color`] = color;   // не важно, невидимо
      patch[`border${s}Width`] = '0px';
      patch[`border${s}Style`] = 'none';
    }
  }
  return patch;
}

interface CellBorderPopoverProps {
  editor: Editor;
  onSet: (patch: Record<string, string>) => void;
}

export const CellBorderPopover: React.FC<CellBorderPopoverProps> = ({ editor, onSet }) => {
  const initial = useMemo(() => {
    const sides = readSideAttrs(editor);
    const preset = detectPreset(sides);
    const ref = SIDES_CAP.find((s) => sideIsVisible(sides[s])) ?? 'Top';
    const r = sides[ref];
    return {
      preset,
      color: r.color ?? '#cbd5e1',
      width: r.width ?? '1px',
      style: r.style ?? 'solid',
    };
  }, [editor]);

  const [preset, setPreset] = useState<BorderSidePreset>(initial.preset);
  const [color, setColor] = useState(initial.color);
  const [width, setWidth] = useState(initial.width);
  const [style, setStyle] = useState(initial.style);

  const apply = () => {
    onSet(buildPatch(preset, color, width, style));
  };

  return (
    <div className="rt-popover" style={{ minWidth: 280 }}>
      <div className="rt-popover-title">Границы ячейки</div>

      <select
        className="rt-select"
        value={preset}
        onChange={(e) => setPreset(e.target.value as BorderSidePreset)}
        style={{ width: '100%', marginBottom: 10 }}
      >
        {(Object.keys(SIDE_LABEL) as BorderSidePreset[]).map((p) => (
          <option key={p} value={p}>{SIDE_LABEL[p]}</option>
        ))}
      </select>

      {preset !== 'none' && (
        <>
          <div className="rt-popover-title" style={{ marginTop: 4 }}>Цвет</div>
          <div className="rt-color-grid">
            {BORDER_COLORS.map((c) => (
              <button key={c} type="button"
                className={`rt-color-cell ${color === c ? 'active' : ''}`}
                style={{ background: c, outline: color === c ? '2px solid #6366f1' : undefined }}
                title={c}
                onMouseDown={(e) => { e.preventDefault(); setColor(c); }} />
            ))}
          </div>

          <div className="rt-popover-title" style={{ marginTop: 10 }}>Толщина</div>
          <div className="rt-row">
            {BORDER_WIDTHS.map((w) => {
              const val = `${w}px`;
              return (
                <button key={w} type="button"
                  className={`rt-btn ${width === val ? 'active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); setWidth(val); }}>
                  {w}px
                </button>
              );
            })}
          </div>

          <div className="rt-popover-title" style={{ marginTop: 10 }}>Стиль</div>
          <div className="rt-row">
            {[
              { v: 'solid', label: '──' },
              { v: 'dashed', label: '- - -' },
              { v: 'dotted', label: '···' },
            ].map((s) => (
              <button key={s.v} type="button"
                className={`rt-btn ${style === s.v ? 'active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setStyle(s.v); }}>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        className="rt-btn primary"
        style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
        onMouseDown={(e) => { e.preventDefault(); apply(); }}
      >
        Применить
      </button>
    </div>
  );
};

/* ============================================================
   CellPadPopover
   ============================================================ */

export const CellPadPopover: React.FC<{ onSet: (padding: string | null) => void }> = ({ onSet }) => (
  <div className="rt-popover" style={{ minWidth: 200 }}>
    <div className="rt-popover-title">Отступы (padding)</div>
    <div className="rt-row">
      {CELL_PADDINGS.map((p) => (
        <button key={p} type="button" className="rt-btn"
          onMouseDown={(e) => { e.preventDefault(); onSet(`${p}px`); }}>
          {p}
        </button>
      ))}
    </div>
    <button type="button" className="rt-popover-action"
      onMouseDown={(e) => { e.preventDefault(); onSet(null); }}>
      Сбросить
    </button>
  </div>
);