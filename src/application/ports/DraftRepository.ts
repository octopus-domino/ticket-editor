export interface Draft<T> {
  snapshot: T;
  savedAt: number;
  revision?: string;
}
/** Asynchronous structured storage; large document strings never block input. */
export interface DraftRepository<T> {
  read(id: string): Promise<Draft<T> | null>;
  write(id: string, draft: Draft<T>): Promise<void>;
  remove(id: string, revision?: string): Promise<void>;
}
