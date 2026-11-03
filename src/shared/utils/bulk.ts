/**
 * Runs an async operation over many IDs and reports partial failures.
 *
 * Why not Promise.all: one rejection kills the batch, and the caller
 * has no way to know which items succeeded. For "delete 42 selected"
 * we need the opposite semantics — every item attempted, partial
 * failures reported, successful ones kept.
 *
 * Pure, no React, no fetch — SRP. Reusable from any module.
 */
export interface BulkFailure {
  readonly id: string;
  readonly message: string;
}

export interface BulkResult {
  readonly ok: number;
  readonly failed: readonly BulkFailure[];
}

export async function runBulk(
  ids: readonly string[],
  fn: (id: string) => Promise<void>,
): Promise<BulkResult> {
  if (ids.length === 0) return { ok: 0, failed: [] };

  const results = await Promise.allSettled(ids.map((id) => fn(id)));
  const failed: BulkFailure[] = [];

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const reason = r.reason as Error | string | undefined;
      failed.push({
        id: ids[i],
        message: reason instanceof Error ? reason.message : String(reason ?? 'unknown'),
      });
    }
  });

  return { ok: ids.length - failed.length, failed };
}