import type { Editor } from '@tiptap/react';

/** New empty tables use the available text width instead of collapsing to tiny intrinsic cells. */
export function initializeTableWidths(editor: Editor, columns: number): void {
  const { $from } = editor.state.selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth).type.name !== 'table') depth--;
  if (!depth) return;
  const table = $from.node(depth);
  const start = $from.start(depth);
  const width = Math.max(25, Math.floor(editor.view.dom.clientWidth / columns));
  const transaction = editor.state.tr;
  table.descendants((node, offset) => {
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader')
      transaction.setNodeMarkup(start + offset, undefined, { ...node.attrs, colwidth: [width] });
  });
  editor.view.dispatch(transaction);
}
