import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Group, Rect, Text as KonvaText, Shape } from 'react-konva';
import type Konva from 'konva';
import type { TextElement } from '@/shared/types';
import type { CommonProps } from './types';
import { parseHtmlToBlocks, layoutRuns, plainToHtml, measureTableHeight } from '@/lib/richText';
import { RichTable } from './RichTable';
import { TEXT_PLACEHOLDER } from '@/shared/constants';
import { drawArcText, canvasFont } from '@/lib/stamps/render';

const HIT_RECT_NAME = 'hit-rect';

interface Props extends CommonProps<TextElement> {
  el: TextElement;
  onUpdate: (p: Partial<TextElement>) => void;
  isEditing?: boolean;
}

export const TextEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDragStart, onDragMove, onDragEnd,
  onContextMenu, onDblClick, isEditing,
}) => {
  const groupRef = useRef<Konva.Group>(null);

  const isPlaceholder = !el.html && (el.text === TEXT_PLACEHOLDER || !el.text?.trim());
  const effectiveFill = isPlaceholder ? '#9ca3af' : (el.fill || '#000000');
  const isArc = el.textMode === 'arc';

  const padding = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = Math.max(1, el.width - padding.left - padding.right);
  const innerHeight = Math.max(1, el.height - padding.top - padding.bottom);

  const blocks = useMemo(() => {
    if (isArc) return [];
    const baseFontStyle = el.fontStyle || 'normal';
    const resolvedFontStyle = isPlaceholder ? `${baseFontStyle} italic` : baseFontStyle;
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
    if (isArc) return { items: [], totalHeight: 0 };
    const items: any[] = [];
    let totalHeight = 0;
    
    for (const block of blocks) {
      if (block.kind === 'text') {
        const layout = layoutRuns(block.runs, innerWidth, lineHeightCoef);
        if (layout.lines.length === 0) continue;
        items.push({ kind: 'text', layout, height: layout.totalHeight });
        totalHeight += layout.totalHeight;
      } else if (block.kind === 'table') {
        // Вычисляем высоту таблицы, чтобы правильно позиционировать следующие блоки
        const tableHeight = measureTableHeight(block.data, innerWidth, el.fontSize, lineHeightCoef);
        items.push({ kind: 'table', data: block.data, height: tableHeight });
        totalHeight += tableHeight;
      }
    }
    return { items, totalHeight };
  }, [blocks, innerWidth, lineHeightCoef, isArc, el.fontSize]);

  const contentHeight = padding.top + prepared.totalHeight + padding.bottom;

  useLayoutEffect(() => {
    if (isArc) return;
    const g = groupRef.current;
    if (!g) return;
    let maxBottom = 0;
    for (const child of g.getChildren()) {
      if (child.name() === HIT_RECT_NAME) continue;
      if (!child.visible()) continue;
      const r = child.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true });
      const bottom = r.y + r.height;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    const measured = Math.ceil(Math.max(maxBottom, contentHeight));
    if (Math.abs(measured - el.height) > 2) {
      onUpdate({ height: measured });
    }
  }, [contentHeight, el.height, el.width, el.padding, el.fontSize, onUpdate, isArc]);

  if (isArc) {
    const radius = el.arcRadius ?? 150;
    const startDeg = el.arcStartAngle ?? -90;
    const endDeg = el.arcEndAngle ?? 90;
    const flip = el.arcFlip ?? false;

    const cx = el.width / 2;
    const cy = radius + el.height / 2;

    return (
      <Group
        id={el.id} name="element"
        x={el.x} y={el.y} rotation={el.rotation}
        draggable dragDistance={3}
        onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
        onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
        onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
        onDragStart={onDragStart} onDragMove={onDragMove}
        onDragEnd={(e) => { onDragEnd?.(e); }}
        onContextMenu={onContextMenu}
      >
        <Rect name={HIT_RECT_NAME} width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
        <Shape
          listening={false}
          perfectDrawEnabled={false}
          sceneFunc={(ctx) => {
            const c = (ctx as any)._context as CanvasRenderingContext2D;
            drawArcText(c, {
              text: el.text,
              cx,
              cy,
              radius,
              startDeg,
              endDeg,
              flip,
              font: canvasFont(el.fontFamily, el.fontStyle, el.fontSize),
              fill: effectiveFill,
            });
          }}
        />
      </Group>
    );
  }

  let offsetY = padding.top;
  if (el.verticalAlign === 'middle') offsetY = padding.top + Math.max(0, (innerHeight - prepared.totalHeight) / 2);
  else if (el.verticalAlign === 'bottom') offsetY = padding.top + Math.max(0, innerHeight - prepared.totalHeight);

  const bg = el.background && el.background !== 'transparent' ? el.background : 'transparent';
  const hitFill = bg === 'transparent' ? 'rgba(0,0,0,0.001)' : bg;
  let cursorY = offsetY;

  return (
    <Group
      ref={groupRef}
      id={el.id} name="element"
      x={el.x} y={el.y} rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Rect name={HIT_RECT_NAME} width={el.width} height={el.height} fill={hitFill} listening />
      {!isEditing && prepared.items.map((item, bi) => {
        const blockTop = cursorY;
        cursorY += item.height;
        
        if (item.kind === 'text') {
          return (
            <React.Fragment key={`b-${bi}`}>
              {item.layout.lines.map((line: any[], i: number) => {
                const lw = line.reduce((acc: number, r: any) => acc + r.width, 0);
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
        
        if (item.kind === 'table') {
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
        }
        
        return null;
      })}
    </Group>
  );
};