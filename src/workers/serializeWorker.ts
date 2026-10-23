/// <reference lib="webworker" />
/* ============================================================
   workers/serializeWorker.ts

   NFR-PERF-10 / REG-B8: JSON.stringify вне main thread.
   Принимает { id, payload }, возвращает { id, ok, text }.
   ============================================================ */

interface SerializeRequest {
  id: number;
  payload: unknown;
}

interface SerializeResponse {
  id: number;
  ok: boolean;
  text?: string;
  error?: string;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<SerializeRequest>) => {
  const { id, payload } = e.data;
  try {
    const text = JSON.stringify(payload);
    const response: SerializeResponse = { id, ok: true, text };
    ctx.postMessage(response);
  } catch (err) {
    const response: SerializeResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(response);
  }
};