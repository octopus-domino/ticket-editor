import { useEffect, useMemo, useState } from 'react';
import {
  DocumentPersistence,
  type PersistenceStatus,
} from '@/application/use-cases/DocumentPersistence';
import { IndexedDraftRepository } from '@/infra/state/IndexedDraftRepository';
import type { EditorInitialDoc } from '@/shared/types/document';
import { documentPreview } from '@/application/use-cases/DocumentPreview';

export const documentDrafts = new IndexedDraftRepository<EditorInitialDoc>();
export function useDocumentPersistence(
  id: string,
  snapshot: EditorInitialDoc,
  save?: (value: EditorInitialDoc) => Promise<void>,
) {
  const [status, setStatus] = useState<PersistenceStatus>('saved');
  const [error, setError] = useState<string | undefined>();
  const persistence = useMemo(
    () =>
      save
        ? new DocumentPersistence(id, documentDrafts, save, (next, reason) => {
            setStatus(next);
            setError(reason);
          })
        : null,
    [id, save],
  );
  const { slides, data, activeId, bindings } = snapshot;
  useEffect(() => {
    documentPreview.set(id.split(':')[0], slides);
  }, [id, slides]);
  useEffect(() => {
    persistence?.update({ slides, data, activeId, bindings });
  }, [persistence, slides, data, activeId, bindings]);
  useEffect(() => {
    const flush = () => {
      void persistence?.flush().catch(() => undefined);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [persistence]);
  return { status, error, retry: () => persistence?.flush() };
}
