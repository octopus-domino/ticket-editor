/* ============================================================
   presentation/hooks/shortcuts/keyMatcher.ts

   CQ-SIZE-04: декларативная спецификация клавиш вместо
   вложенных if/else. Каждый handler описывается объектом KeySpec.
   ============================================================ */

export interface KeySpec {
  key?: string;
  code?: string;
  /** true — требует Ctrl/Cmd; false — не требует; undefined — не проверяет. */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export function matches(e: KeyboardEvent, spec: KeySpec): boolean {
  if (spec.key !== undefined && e.key !== spec.key) return false;
  if (spec.code !== undefined && e.code !== spec.code) return false;

  const ctrl = e.ctrlKey || e.metaKey;
  if (spec.ctrl !== undefined && spec.ctrl !== ctrl) return false;
  if (spec.shift !== undefined && spec.shift !== e.shiftKey) return false;
  if (spec.alt !== undefined && spec.alt !== e.altKey) return false;

  return true;
}