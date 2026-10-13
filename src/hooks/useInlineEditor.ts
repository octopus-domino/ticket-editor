import { useState, useCallback, useEffect, RefObject } from 'react';
import type { CanvasElement, Slide, TableElement, TextAlign } from '../types';
import type Konva from 'konva';

export type EditField =
  | 'topText' | 'bottomText' | 'centerText'
  | 'text' | 'footerText' | 'shapeText' | 'tableCell';
export type EditKind = 'text' | 'shape' | 'footer' | 'stamp' | 'table';
type Zone = 'top' | 'center' | 'bottom';

export interface EditState {
  id: string;
  field: EditField;
  kind: EditKind;
  zone?: Zone;
  tableRow?: number;
  tableCol?: number;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  align: TextAlign;
  fill: string;
}

interface Args {
  wrapRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  zoom: number;
  activeSlide: Slide;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
}

export function useInlineEditor({ wrapRef, stageRef, zoom, activeSlide, updateElement }: Args) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  const commit = useCallback((value?: string) => {
    setEditing((cur) => {
      if (!cur) return null;
      const v = value !== undefined ? value : cur.value;

      if (cur.field === 'tableCell') {
        const el = activeSlide.elements.find((e) => e.id === cur.id) as TableElement | undefined;
        if (el && el.type === 'table') {
          const dataArr = el.data.map((rr) => [...rr]);
          if (dataArr[cur.tableRow!] && cur.tableCol! < dataArr[cur.tableRow!].length) {
            dataArr[cur.tableRow!][cur.tableCol!] = v;
            updateElement(cur.id, { data: dataArr });
          }
        }
      } else if (cur.field === 'text' || cur.field === 'footerText' || cur.field === 'shapeText') {
        updateElement(cur.id, { text: v });
      } else {
        updateElement(cur.id, { [cur.field]: v } as any);
      }

      setShowToolbar(false);
      return null;
    });
  }, [activeSlide, updateElement]);

  const open = useCallback((el: CanvasElement, field: EditField) => {
    if (editing) commit();
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const wrapRect = wrap.getBoundingClientRect();
    const stageRect = stage.container().getBoundingClientRect();
    const offsetX = stageRect.left - wrapRect.left;
    const offsetY = stageRect.top - wrapRect.top;

    let kind: EditKind = 'text';
    let zone: Zone | undefined;
    let value = '';
    let fontSize = 16;
    let fontFamily = 'Arial';
    let fontStyle = 'normal';
    let textDecoration = '';
    let align: TextAlign = 'center';
    let fill = '#000';

    if (el.type === 'text') {
      kind = 'text';
      value = el.text;
      fontSize = el.fontSize;
      fontFamily = el.fontFamily;
      fontStyle = el.fontStyle;
      textDecoration = el.textDecoration;
      align = el.align;
      fill = el.fill;
    } else if (el.type === 'footer') {
      kind = 'footer';
      value = el.text;
      fontSize = el.fontSize;
      fill = el.fill;
    } else if (el.type === 'shape') {
      kind = 'shape';
      value = el.text;
      fontSize = el.fontSize;
      fill = el.textFill;
    } else if (el.type === 'stamp') {
      kind = 'stamp';
      if (field === 'topText') zone = 'top';
      else if (field === 'bottomText') zone = 'bottom';
      else zone = 'center';

      if (zone === 'top') {
        value = el.topText;
        fontSize = el.topFontSize || 14;
        fontFamily = el.topFontFamily || 'Arial';
        fontStyle = el.topFontStyle || 'normal';
        textDecoration = el.topTextDecoration || '';
        fill = el.topColor || el.stampColor;
      } else if (zone === 'bottom') {
        value = el.bottomText;
        fontSize = el.bottomFontSize || 12;
        fontFamily = el.bottomFontFamily || 'Arial';
        fontStyle = el.bottomFontStyle || 'normal';
        textDecoration = el.bottomTextDecoration || '';
        fill = el.bottomColor || el.stampColor;
      } else {
        value = el.centerText;
        fontSize = el.centerFontSize || 20;
        fontFamily = el.centerFontFamily || 'Arial';
        fontStyle = el.centerFontStyle || 'normal';
        textDecoration = el.centerTextDecoration || '';
        fill = el.centerColor || el.stampColor;
      }
    }

    setEditing({
      id: el.id, field, kind, zone, value,
      x: offsetX + el.x * zoom,
      y: offsetY + el.y * zoom,
      width: el.width * zoom,
      height: fontSize * 1.6 * zoom,
      fontSize: fontSize * zoom,
      fontFamily, fontStyle, textDecoration, align, fill,
    });
    setShowToolbar(true);
  }, [editing, commit, wrapRef, stageRef, zoom]);

  const openCell = useCallback((el: TableElement, r: number, c: number) => {
    if (editing) commit();
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const wrapRect = wrap.getBoundingClientRect();
    const stageRect = stage.container().getBoundingClientRect();
    const offsetX = stageRect.left - wrapRect.left;
    const offsetY = stageRect.top - wrapRect.top;
    const cw = el.width / el.cols;
    const ch = el.height / el.rows;
    setEditing({
      id: el.id, field: 'tableCell', kind: 'table',
      tableRow: r, tableCol: c, value: el.data[r]?.[c] ?? '',
      x: offsetX + (el.x + c * cw) * zoom,
      y: offsetY + (el.y + r * ch) * zoom,
      width: cw * zoom, height: ch * zoom,
      fontSize: el.fontSize * zoom,
      fontFamily: 'Arial', fontStyle: 'normal', textDecoration: '',
      align: 'left', fill: '#111',
    });
    setShowToolbar(false);
  }, [editing, commit, wrapRef, stageRef, zoom]);

  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const ed = document.querySelector('.inline-text-editor');
      const tb = document.querySelector('.text-toolbar');
      if (ed?.contains(t) || tb?.contains(t)) return;
      commit();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', onDown, true), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', onDown, true); };
  }, [editing, commit]);

  const onToolbarChange = useCallback((patch: any) => {
    setEditing((cur) => {
      if (!cur) return null;
      const next = { ...cur };
      if (patch.fontSize !== undefined) next.fontSize = patch.fontSize * zoom;
      if (patch.fontFamily !== undefined) next.fontFamily = patch.fontFamily;
      if (patch.fontStyle !== undefined) next.fontStyle = patch.fontStyle;
      if (patch.textDecoration !== undefined) next.textDecoration = patch.textDecoration;
      if (patch.fill !== undefined) next.fill = patch.fill;
      if (patch.align !== undefined) next.align = patch.align;

      const realPatch: any = {};
      if (cur.kind === 'stamp' && cur.zone) {
        const prefix = cur.zone === 'top' ? 'top' : cur.zone === 'bottom' ? 'bottom' : 'center';
        if (patch.fontSize !== undefined) realPatch[`${prefix}FontSize`] = patch.fontSize;
        if (patch.fontFamily !== undefined) realPatch[`${prefix}FontFamily`] = patch.fontFamily;
        if (patch.fontStyle !== undefined) realPatch[`${prefix}FontStyle`] = patch.fontStyle;
        if (patch.textDecoration !== undefined) realPatch[`${prefix}TextDecoration`] = patch.textDecoration;
        if (patch.fill !== undefined) realPatch[`${prefix}Color`] = patch.fill;
      } else if (cur.kind === 'text') {
        if (patch.fontSize !== undefined) realPatch.fontSize = patch.fontSize;
        if (patch.fontFamily !== undefined) realPatch.fontFamily = patch.fontFamily;
        if (patch.fontStyle !== undefined) realPatch.fontStyle = patch.fontStyle;
        if (patch.textDecoration !== undefined) realPatch.textDecoration = patch.textDecoration;
        if (patch.fill !== undefined) realPatch.fill = patch.fill;
        if (patch.align !== undefined) realPatch.align = patch.align;
      } else {
        if (patch.fontSize !== undefined) realPatch.fontSize = patch.fontSize;
        if (patch.fill !== undefined) {
          if (cur.kind === 'shape') realPatch.textFill = patch.fill;
          else if (cur.kind === 'footer') realPatch.fill = patch.fill;
        }
      }
      updateElement(cur.id, realPatch);
      return next;
    });
  }, [zoom, updateElement]);

  return { editing, setEditing, showToolbar, setShowToolbar, open, openCell, commit, onToolbarChange };
}