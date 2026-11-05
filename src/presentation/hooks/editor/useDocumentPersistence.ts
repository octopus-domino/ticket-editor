import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentPersistence,
  type PersistenceStatus,
} from '@/application/use-cases/DocumentPersistence';
import { IndexedDraftRepository } from '@/infra/state/IndexedDraftRepository';
import type { EditorInitialDoc } from '@/shared/types/document';
import { documentPreview } from '@/application/use-cases/DocumentPreview';
import { registerLanguageSave } from '@/shared/i18n';
import { isGuest } from '@/shared/session/guest';

export const documentDrafts = new IndexedDraftRepository<EditorInitialDoc>();
export function useDocumentPersistence(
  id: string,
  snapshot: EditorInitialDoc,
  save?: (value: EditorInitialDoc) => Promise<void>,
  saveContext?: string | null,
) {
  const [status, setStatus] = useState<PersistenceStatus>('saved');
  const [error, setError] = useState<string | undefined>();
  const targetRef = useRef({ id, save });
  if (targetRef.current.id !== id || Boolean(targetRef.current.save) !== Boolean(save)) {
    targetRef.current = { id, save };
  } else targetRef.current.save = save;
  const target = targetRef.current;
  const enabled = Boolean(save);
  const persistence = useMemo(
    () =>
      enabled
        ? new DocumentPersistence(
            id,
            documentDrafts,
            (value) => id.startsWith('guest:')&&!isGuest()?Promise.resolve():target.save!(value),
            (next, reason) => {
              setStatus(next);
              setError(reason);
            },
          )
        : null,
    [id, enabled, target],
  );
  const { slides, data, activeId, bindings } = snapshot;
  useEffect(() => registerLanguageSave(async () => { await persistence?.flush(); }), [persistence]);
  useEffect(() => {
    documentPreview.set(id.split(':')[0], slides);
  }, [id, slides]);
  useEffect(() => {
    persistence?.update({ slides, data, activeId, bindings }, saveContext);
  }, [persistence, slides, data, activeId, bindings, saveContext]);
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
