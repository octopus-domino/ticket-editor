import type { Draft, DraftRepository } from '@/application/ports/DraftRepository';
import { isGuest,guestRead,guestWrite,guestRemove } from '@/shared/session/guest';

/** IndexedDB performs structured persistence without synchronous JSON/localStorage writes. */
export class IndexedDraftRepository<T> implements DraftRepository<T> {
  private database: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    return (this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('ticket-editor-drafts', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }
  private async transaction<R>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<R>,
  ): Promise<R> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', mode);
      const request = operation(transaction.objectStore('drafts'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Draft transaction aborted'));
    });
  }
  async read(id: string): Promise<Draft<T> | null> {
    if(id.startsWith('guest:')&&!isGuest())return null;
    if(isGuest())return JSON.parse(guestRead(`draft:${id}`)??'null') as Draft<T>|null;
    return (await this.transaction('readonly', (store) => store.get(id))) ?? null;
  }
  async write(id: string, draft: Draft<T>): Promise<void> {
    if(id.startsWith('guest:')&&!isGuest())return;
    if(isGuest()){guestWrite(`draft:${id}`,JSON.stringify(draft));return;}
    await this.transaction('readwrite', (store) => store.put(draft, id));
  }
  async remove(id: string, revision?: string): Promise<void> {
    if(id.startsWith('guest:')&&!isGuest())return;
    if(isGuest()){const draft=await this.read(id);if(!revision||draft?.revision===revision)guestRemove(`draft:${id}`);return;}
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      const store = transaction.objectStore('drafts');
      const request = store.get(id);
      request.onsuccess = () => {
        if (!revision || request.result?.revision === revision) store.delete(id);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
    });
  }
}
