/* ============================================================
   richText/extensions.ts
   ============================================================ */

import { Extension, type CommandProps } from '@tiptap/core';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

type HtmlAttrs = Record<string, unknown>;

const asStr = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : '';

/* ============================================================
   FontSize
   ============================================================ */

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement): string | null =>
              el.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attrs: HtmlAttrs) =>
              attrs.fontSize ? { style: `font-size: ${asStr(attrs.fontSize)}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: CommandProps) =>
        chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }: CommandProps) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

/* ============================================================
   CELL_ATTRIBUTES — общие + per-side borders
   ============================================================ */

const CELL_COMMON_ATTRIBUTES = {
  bgColor: {
    default: null,
    parseHTML: (el: HTMLElement): string | null => el.style.backgroundColor || null,
    renderHTML: (attrs: HtmlAttrs) =>
      attrs.bgColor ? { style: `background-color: ${asStr(attrs.bgColor)}` } : {},
  },
  cellPadding: {
    default: null,
    parseHTML: (el: HTMLElement): string | null => el.style.padding || null,
    renderHTML: (attrs: HtmlAttrs) =>
      attrs.cellPadding ? { style: `padding: ${asStr(attrs.cellPadding)}` } : {},
  },
  textAlign: {
    default: null,
    parseHTML: (el: HTMLElement): string | null => el.style.textAlign || null,
    renderHTML: (attrs: HtmlAttrs) =>
      attrs.textAlign ? { style: `text-align: ${asStr(attrs.textAlign)}` } : {},
  },
  verticalAlign: {
    default: null,
    parseHTML: (el: HTMLElement): string | null => el.style.verticalAlign || null,
    renderHTML: (attrs: HtmlAttrs) =>
      attrs.verticalAlign ? { style: `vertical-align: ${asStr(attrs.verticalAlign)}` } : {},
  },
};

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
type SideCap = typeof SIDES[number];

/**
 * ВАЖНО: у border-атрибутов заданы дефолты (#cbd5e1 / 1px / solid).
 * Это значит, что:
 *   1) новая таблица сразу имеет сетку — как визуально в редакторе,
 *      так и в inline-стилях при getHTML();
 *   2) CSS-правило `border: 1px solid ...` в td/th можно убрать —
 *      дефолт приходит из TipTap-атрибутов;
 *   3) при смене пресета мы ЯВНО ставим `width: 0px; style: none`
 *      на невидимых сторонах, а не «null», иначе inline-стиль
 *      не перекрывает никакой внешний CSS и граница остаётся видна.
 */
function buildSideAttributes(sideCap: SideCap) {
  const side = sideCap.toLowerCase() as 'top' | 'right' | 'bottom' | 'left';
  return {
    [`border${sideCap}Color`]: {
      default: '#cbd5e1',
      parseHTML: (el: HTMLElement): string | null =>
        el.style.getPropertyValue(`border-${side}-color`) || null,
      renderHTML: (attrs: HtmlAttrs) => {
        const v = attrs[`border${sideCap}Color`];
        return v ? { style: `border-${side}-color: ${asStr(v)}` } : {};
      },
    },
    [`border${sideCap}Width`]: {
      default: '1px',
      parseHTML: (el: HTMLElement): string | null =>
        el.style.getPropertyValue(`border-${side}-width`) || null,
      renderHTML: (attrs: HtmlAttrs) => {
        const v = attrs[`border${sideCap}Width`];
        return v ? { style: `border-${side}-width: ${asStr(v)}` } : {};
      },
    },
    [`border${sideCap}Style`]: {
      default: 'solid',
      parseHTML: (el: HTMLElement): string | null =>
        el.style.getPropertyValue(`border-${side}-style`) || null,
      renderHTML: (attrs: HtmlAttrs) => {
        const v = attrs[`border${sideCap}Style`];
        return v ? { style: `border-${side}-style: ${asStr(v)}` } : {};
      },
    },
  };
}

const CELL_BORDERS = {
  ...buildSideAttributes('Top'),
  ...buildSideAttributes('Right'),
  ...buildSideAttributes('Bottom'),
  ...buildSideAttributes('Left'),
};

const CELL_ATTRIBUTES = {
  ...CELL_COMMON_ATTRIBUTES,
  ...CELL_BORDERS,
};

/* ============================================================
   CustomTableCell / CustomTableHeader
   ============================================================ */

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...CELL_ATTRIBUTES };
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...CELL_ATTRIBUTES };
  },
});

/* ============================================================
   Indent
   ============================================================ */

export const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return { types: ['paragraph', 'heading'] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement): number =>
              parseInt(element.style.paddingLeft) / 20 || 0,
            renderHTML: (attributes: HtmlAttrs) => {
              const n = typeof attributes.indent === 'number' ? attributes.indent : 0;
              if (!n) return {};
              return { style: `padding-left: ${n * 20}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }: CommandProps) => {
        const { selection } = state;
        const { from, to } = selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const current = typeof node.attrs.indent === 'number' ? node.attrs.indent : 0;
            const next = Math.min(current + 1, 10);
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      outdent: () => ({ tr, state, dispatch }: CommandProps) => {
        const { selection } = state;
        const { from, to } = selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const current = typeof node.attrs.indent === 'number' ? node.attrs.indent : 0;
            const next = Math.max(current - 1, 0);
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});