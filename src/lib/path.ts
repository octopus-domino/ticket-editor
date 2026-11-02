/**
 * Единая точка для парсинга пути с array-index: "event.items[0].code".
 * Возвращает сегменты: ['event', 'items', 0, 'code'].
 */
export function parsePath(path: string): (string | number)[] {
  const parts: (string | number)[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) parts.push(m[1]);
    else if (m[2] !== undefined) parts.push(parseInt(m[2], 10));
  }
  return parts;
}

/** Достаёт значение по пути. Поддерживает "a.b[0].c". */
export function getByPath(obj: unknown, path: string): unknown {
  return parsePath(path).reduce<unknown>((acc, seg) => {
    if (acc == null) return undefined;
    if (typeof seg === 'number') {
      return Array.isArray(acc) ? acc[seg] : undefined;
    }
    if (typeof acc === 'object' && seg in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[seg];
    }
    return undefined;
  }, obj);
}

/** Иммутабельно устанавливает значение. Создаёт промежуточные объекты/массивы. */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = parsePath(path);
  const copy = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  let cur: unknown = copy;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const wantArray = typeof nextSeg === 'number';

    if (typeof seg === 'number') {
      const arr = cur as unknown[];
      if (!Array.isArray(arr[seg])) {
        arr[seg] = wantArray ? [] : {};
      }
      cur = arr[seg];
    } else {
      const rec = cur as Record<string, unknown>;
      if (rec[seg] == null || typeof rec[seg] !== 'object') {
        rec[seg] = wantArray ? [] : {};
      }
      cur = rec[seg];
    }
  }

  const last = segments[segments.length - 1];
  if (typeof last === 'number') {
    (cur as unknown[])[last] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
  return copy;
}