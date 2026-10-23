/* Реэкспорт для обратной совместимости. Реализация — в ./parser/*. */
export { parseHtmlToRuns } from './parser/runs';
export { parseHtmlToBlocks, parseCellBlocks } from './parser/blocks';
export { parseTableEl } from './parser/table';