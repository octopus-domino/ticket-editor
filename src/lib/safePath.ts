const UNSAFE = new Set(['__proto__', 'prototype', 'constructor']);
/** Parse paths without permitting prototype traversal or unbounded sparse arrays. */
export function parsePath(path: string): (string | number)[] {
  if (!path || path.length > 1000 || !/^[^.[\]]+(?:\[\d+\]|\.[^.[\]]+)*$/.test(path))
    throw new Error('Invalid field path');
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((part) => {
      if (UNSAFE.has(part)) throw new Error('Unsafe field path');
      if (!/^\d+$/.test(part)) return part;
      const index = Number(part);
      if (!Number.isSafeInteger(index) || index > 10000)
        throw new Error('Array index exceeds limit');
      return index;
    });
}
export function getByPath(obj: unknown, path: string): unknown {
  const segments = parsePath(path);
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  if (Object.hasOwn(record, path)) return record[path];
  const read = (source: unknown, keys: (string | number)[]) => keys.reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    return (value as Record<string | number, unknown>)[key];
  }, source);
  const value = read(record, segments);
  if (value !== undefined) return value;
  const boundaries = [...path.matchAll(/[.[]/g)];
  for (let index = boundaries.length - 1; index >= 0; index--) {
    const offset = boundaries[index].index;
    const prefix = path.slice(0, offset);
    if (Object.hasOwn(record, prefix)) {
      return read(record[prefix], segments.slice(parsePath(prefix).length));
    }
  }
  return undefined;
}
/** Copy only ancestors, preserving sibling values and structural sharing. */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = parsePath(path);
  const update = (current: unknown, depth: number): unknown => {
    if (depth === segments.length) return value;
    const key = segments[depth];
    const copy =
      typeof key === 'number'
        ? Array.isArray(current)
          ? [...current]
          : []
        : current && typeof current === 'object' && !Array.isArray(current)
          ? { ...current }
          : {};
    const record = copy as Record<string | number, unknown>;
    record[key] = update(record[key], depth + 1);
    return copy;
  };
  return update(obj, 0) as Record<string, unknown>;
}
