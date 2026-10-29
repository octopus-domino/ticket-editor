import { registerElement } from './registry';
import { TextEl } from './TextEl';
import { ShapeEl } from './ShapeEl';
import { PathEl } from './PathEl';
import { ChartEl } from './ChartEl';
import { LineEl } from './LineEl';
import { TableEl } from './TableEl';
import { FooterEl } from './FooterEl';
import { ImageEl } from './ImageEl';
import { PlaceholderEl } from './PlaceholderEl';
import { FillEl } from './FillEl';
import { ConnectorEl } from './ConnectorEl';
import { DiagramEl } from './DiagramEl';
import { StampEl } from './StampEl';
import { GroupEl } from './GroupEl';
import { QrEl } from './QrEl';

import { TextProps } from './properties/TextProps';
import { ShapeProps } from './properties/ShapeProps';
import { PathProps } from './properties/PathProps';
import { ChartProps } from './properties/ChartProps';
import { TableProps } from './properties/TableProps';
import {
  LineProps, ImageProps, FooterProps, PlaceholderProps,
  FillProps, ConnectorProps, StampProps, DiagramProps, QrProps,
} from './properties/MiscProps';

import {
  toSvgText, toSvgShape, toSvgLine, toSvgTable, toSvgImage,
  toSvgFooter, toSvgPlaceholder, toSvgFill, toSvgConnector,
  toSvgDiagram, toSvgStamp, toSvgPath, toSvgChart, toSvgQr,
} from '@/lib/svg/exporters';

import type { ConnectorElement } from '@/shared/types';

export function registerAllElements(): void {
  registerElement({ type: 'text',        KonvaView: TextEl        as never, PropertiesPanel: TextProps        as never, toSvg: toSvgText });
  registerElement({ type: 'shape',       KonvaView: ShapeEl       as never, PropertiesPanel: ShapeProps       as never, toSvg: toSvgShape });
  registerElement({ type: 'path',        KonvaView: PathEl        as never, PropertiesPanel: PathProps        as never, toSvg: toSvgPath });
  registerElement({ type: 'chart',       KonvaView: ChartEl       as never, PropertiesPanel: ChartProps       as never, toSvg: toSvgChart });
  registerElement({ type: 'line',        KonvaView: LineEl        as never, PropertiesPanel: LineProps        as never, toSvg: toSvgLine });
  registerElement({ type: 'table',       KonvaView: TableEl       as never, PropertiesPanel: TableProps       as never, toSvg: toSvgTable });
  registerElement({ type: 'footer',      KonvaView: FooterEl      as never, PropertiesPanel: FooterProps      as never, toSvg: toSvgFooter });
  registerElement({ type: 'image',       KonvaView: ImageEl       as never, PropertiesPanel: ImageProps       as never, toSvg: toSvgImage });
  registerElement({ type: 'placeholder', KonvaView: PlaceholderEl as never, PropertiesPanel: PlaceholderProps as never, toSvg: toSvgPlaceholder });
  registerElement({ type: 'fill',        KonvaView: FillEl        as never, PropertiesPanel: FillProps        as never, toSvg: toSvgFill });
  registerElement({
    type: 'connector',
    KonvaView: ConnectorEl as never,
    PropertiesPanel: ConnectorProps as never,
    toSvg: (el, ctx) => toSvgConnector(el as ConnectorElement, ctx?.allElements ?? []),
  });
  registerElement({ type: 'diagram', KonvaView: DiagramEl as never, PropertiesPanel: DiagramProps as never, toSvg: toSvgDiagram });
  registerElement({ type: 'stamp',   KonvaView: StampEl   as never, PropertiesPanel: StampProps   as never, toSvg: toSvgStamp });
  registerElement({ type: 'group',   KonvaView: GroupEl   as never, PropertiesPanel: undefined as never, toSvg: () => '' });
  registerElement({ type: 'qr',      KonvaView: QrEl      as never, PropertiesPanel: QrProps      as never, toSvg: toSvgQr });
}