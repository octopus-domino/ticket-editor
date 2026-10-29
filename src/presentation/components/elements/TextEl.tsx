import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Group, Rect, Text as KonvaText, Shape } from 'react-konva';
import type Konva from 'konva';
import type { TextElement } from '@/shared/types';
import type { CommonProps } from './types';
import {
  parseHtmlToBlocks, layoutRuns, plainToHtml,
  computeTableLayout,
} from '@/lib/richText';
import { RichTable } from './RichTable';
import { TEXT_PLACEHOLDER } from '@/shared/constants';
import { drawArcText, canvasFont } from '@/lib/stamps/render';

const HIT_RECT_NAME = 'hit-rect';

interface Props extends CommonProps<TextElement> {
  el: TextElement;
  onUpdate: (p: Partial<TextElement>) => void;
  isEditing?: boolean;
}

type PreparedItem =
  | { kind: 'text'; layout: ReturnType<typeof layoutRuns>; height: number }
  | { kind: 'table'; data: any; height: number; width: number };

export const TextEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDragStart, onDragMove, onDragEnd,
  onContextMenu, onDblClick,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const lastEmittedHeightRef = useRef<number>(el.height);

  const isPlaceholder = !el.html && (el.text === TEXT_PLACEHOLDER || !el.text?.trim());
  const effectiveFill = isPlaceholder ? '#9ca3af' : (el.fill || '#000000');
  const isArc = el.textMode === 'arc';

  const padding = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = Math.max(1, el.width - padding.left - padding.right);
  const innerHeight = Math.max(1, el.height - padding.top - padding.bottom);

  const blocks = useMemo(() => {
    if (isArc) return [];
    const resolvedFontStyle = isPlaceholder
      ? `${el.fontStyle || 'normal'} italic`
      : (el.fontStyle || 'normal');
    const resolvedFill = isPlaceholder ? '#9ca3af' : (el.fill || '#000000');
    const sourceHtml = el.html && el.html.trim() ? el.html : plainToHtml(el.text || '');
    return parseHtmlToBlocks(sourceHtml, {
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      fontStyle: resolvedFontStyle,
      textDecoration: el.textDecoration || '',
      fill: resolvedFill,
    });
  }, [el.html, el.text, el.fontSize, el.fontFamily, el.fontStyle, el.textDecoration, el.fill, isPlaceholder, isArc]);

  const lineHeightCoef = el.lineHeight || 1.5;

  const prepared = useMemo(() => {
    if (isArc) return { items: [] as PreparedItem[], totalHeight: 0 };
    const items: PreparedItem[] = [];
    let totalHeight = 0;

    for (const block of blocks) {
      if (block.kind === 'text') {
        const layout = layoutRuns(block.runs, innerWidth, lineHeightCoef);
        if (layout.lines.length === 0) continue;
        items.push({ kind: 'text', layout, height: layout.totalHeight });
        totalHeight += layout.totalHeight;
      } else if (block.kind === 'table') {
        const tl = computeTableLayout(block.data, innerWidth, el.fontSize, lineHeightCoef);
        items.push({ kind: 'table', data: block.data, height: tl.totalHeight, width: tl.totalWidth });
        totalHeight += tl.totalHeight;
      }
    }
    return { items, totalHeight };
  }, [blocks, innerWidth, lineHeightCoef, isArc, el.fontSize]);

  const contentHeight = padding.top + prepared.totalHeight + padding.bottom;

  /**
   * Авто-расширение ТОЛЬКО высоты. Ширину НЕ трогаем — она под
   * resize-handle пользователя. Длинный текст переносится по innerWidth,
   * широкая таблица ужимается resolveColPixelWidths до innerWidth.
   * Никакого горизонтального скролла канвы быть не может.
   */
  useLayoutEffect(() => {
    if (isArc) return;
    const neededHeight = Math.ceil(contentHeight);
    if (Math.abs(neededHeight - el.height) > 2
        && Math.abs(neededHeight - lastEmittedHeightRef.current) > 2) {
      lastEmittedHeightRef.current = neededHeight;
      onUpdate({ height: neededHeight });
    }
  }, [contentHeight, el.height, onUpdate, isArc]);

  const scaleX = el.flipX ? -1 : 1;
  const scaleY = el.flipY ? -1 : 1;
  const offsetX = el.flipX ? el.width : 0;
  const offsetY = el.flipY ? el.height : 0;

  const baseProps = {
    id: el.id, name: 'element',
    x: el.x + offsetX, y: el.y + offsetY,
    scaleX, scaleY, rotation: el.rotation,
    draggable: true,
    onMouseDown: (e: any) => { e.cancelBubble = true; onSelect(e); },
    onTap: (e: any) => { e.cancelBubble = true; onSelect(e); },
    onDblClick: (e: any) => { e.cancelBubble = true; onDblClick?.(e); },
    onDblTap: (e: any) => { e.cancelBubble = true; onDblClick?.(e); },
    onDragStart, onDragMove,
    onDragEnd: (e: any) => { onDragEnd?.(e); },
    onContextMenu,
  };

  if (isArc) {
    const radius = el.arcRadius ?? 150;
    const startDeg = el.arcStartAngle ?? -90;
    const endDeg = el.arcEndAngle ?? 90;
    const flip = el.arcFlip ?? false;
    const cx = el.width / 2;
    const cy = radius + el.height / 2;

    return (
      <Group {...baseProps}>
        <Rect name={HIT_RECT_NAME} width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
        <Shape
          listening={false}
          perfectDrawEnabled={false}
          sceneFunc={(ctx) => {
            const c = (ctx as any)._context as CanvasRenderingContext2D;
            drawArcText(c, { text: el.text, cx, cy, radius, startDeg, endDeg, flip, font: canvasFont(el.fontFamily, el.fontStyle, el.fontSize), fill: effectiveFill });
          }}
        />
      </Group>
    );
  }

  let offsetYContent = padding.top;
  if (el.verticalAlign === 'middle') offsetYContent = padding.top + Math.max(0, (innerHeight - prepared.totalHeight) / 2);
  else if (el.verticalAlign === 'bottom') offsetYContent = padding.top + Math.max(0, innerHeight - prepared.totalHeight);

  const bg = el.background && el.background !== 'transparent' ? el.background : 'transparent';
  const hitFill = bg === 'transparent' ? 'rgba(0,0,0,0.001)' : bg;
  let cursorY = offsetYContent;

  return (
    <Group ref={groupRef} {...baseProps}>
      <Rect name={HIT_RECT_NAME} width={el.width} height={el.height} fill={hitFill} listening />
      {prepared.items.map((item, bi) => {
        const blockTop = cursorY;
        cursorY += item.height;

        if (item.kind === 'text') {
          return (
            <React.Fragment key={`b-${bi}`}>
              {item.layout.lines.map((line, i) => {
                const lw = line.reduce((acc, r) => acc + r.width, 0);
                let lineOffsetX = 0;
                if (el.align === 'center') lineOffsetX = Math.max(0, (innerWidth - lw) / 2);
                else if (el.align === 'right') lineOffsetX = Math.max(0, innerWidth - lw);
                return line.map((run, j) => {
                  const x = padding.left + lineOffsetX + run.x;
                  const y = blockTop + run.y;
                  const resolvedFontStyle = run.bold && run.italic
                    ? 'italic bold' : run.bold ? 'bold' : run.italic ? 'italic' : isPlaceholder ? 'italic' : 'normal';
                  return (
                    <React.Fragment key={`${i}-${j}`}>
                      {run.bgColor && <Rect x={x} y={y} width={run.width} height={run.actualFontSize * 1.2} fill={run.bgColor} listening={false} />}
                      <KonvaText x={x} y={y} text={run.text} fontSize={run.actualFontSize} fontFamily={run.fontFamily || el.fontFamily} fontStyle={resolvedFontStyle} textDecoration={run.underline && run.strike ? 'underline line-through' : run.underline ? 'underline' : run.strike ? 'line-through' : ''} fill={run.color || effectiveFill} listening={false} />
                    </React.Fragment>
                  );
                });
              })}
            </React.Fragment>
          );
        }

        return (
          <RichTable
            key={`b-${bi}`}
            data={item.data}
            x={padding.left}
            y={blockTop}
            width={innerWidth}
            fontFamily={el.fontFamily}
            fallbackFontSize={el.fontSize}
            fallbackFill={effectiveFill}
            lineHeightCoef={lineHeightCoef}
          />
        );
      })}
    </Group>
  );
};