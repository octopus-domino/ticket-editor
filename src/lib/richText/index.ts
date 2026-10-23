export type {
  TextRun,
  BaseStyle,
  PositionedRun,
  LayoutResult,
  RichTableCell,
  RichTableCellPadding,
  RichTableData,
  RichBlock,
} from './types';

export { measureText } from './measure';
export { layoutRuns } from './layout';
export { parseHtmlToRuns, parseHtmlToBlocks, parseTableEl } from './parser';
export { plainToHtml } from './plainHtml';

export {
  computeTableLayout,
  measureTableHeight,
  cellPad,
  lineWidth,
  CELL_PADDING_DEFAULT,
  CELL_BLOCK_MARGIN,
  MAX_NEST_DEPTH,
} from './tableLayout';
export type { CellBlockItem, TableLayout } from './tableLayout';