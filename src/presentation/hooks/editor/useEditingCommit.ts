import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { EditingState } from '../../stores/ModalsStore';

export function useEditingCommit(docStore: DocumentStore) {
  return useCallback((editing: EditingState, html: string | undefined, text: string) => {
    docStore.commit((draft) => {
      const slide = draft.slides.find((s) => s.id === draft.activeId);
      const el = slide?.elements.find((e) => e.id === editing.id);
      if (!el) return;

      const safeText = text ?? '';

      switch (editing.field) {
        case 'text': {
          if (el.type !== 'text') return;
          const hasRichContent = html && (html.includes('<table') || html.includes('<img'));
          const isEmpty = !safeText.trim() && !hasRichContent;

          el.text = isEmpty ? 'Введите текст' : safeText;
          el.html = isEmpty ? undefined : html;
          if (hasRichContent) el.richText = true;
          return;
        }
        case 'footerText':
          if (el.type !== 'footer') return;
          el.text = safeText;
          if (html !== undefined) el.html = html || undefined;
          return;
        case 'shapeText':
          if (el.type !== 'shape') return;
          el.text = safeText;
          return;
        case 'tableCell': {
          if (el.type !== 'table') return;
          const r = editing.tableRow ?? 0;
          const c = editing.tableCol ?? 0;
          const rows = el.data.map((row) => [...row]);
          if (rows[r] && c < rows[r].length) rows[r][c] = safeText;
          el.data = rows;
          return;
        }
        default:
          return;
      }
    }, `commit-${editing.id}`);
  }, [docStore]);
}