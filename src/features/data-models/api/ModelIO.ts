import type { DataModel } from '../domain/DataModel';

export interface ImportedModel {
  readonly name: string;
  readonly values: Record<string, unknown>;
}

export interface ImportResult {
  readonly ok: boolean;
  readonly models?: ImportedModel[];
  readonly issues?: readonly { index: number; message: string }[];
}

/**
 * Единый IO: parse / fromFile / export / download.
 * Формат: { version: "1.0", items: [{name, values}] } или массив [{name, values}].
 */
export class ModelIO {
  parse(text: string): ImportResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, issues: [{ index: 0, message: `JSON: ${(e as Error).message}` }] };
    }
    return this.extract(parsed);
  }

  async fromFile(file: File): Promise<ImportResult> {
    return this.parse(await file.text());
  }

  export(models: DataModel[]): string {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      items: models.map((m) => ({ name: m.name, values: m.values })),
    }, null, 2);
  }

  download(models: DataModel[], filename = 'data-models.json'): void {
    const blob = new Blob([this.export(models)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private extract(parsed: unknown): ImportResult {
    const issues: { index: number; message: string }[] = [];
    const models: ImportedModel[] = [];

    const push = (item: unknown, idx: number): void => {
      if (!item || typeof item !== 'object') {
        issues.push({ index: idx, message: 'item не является объектом' });
        return;
      }
      const raw = item as { name?: unknown; values?: unknown };
      if (!raw.values || typeof raw.values !== 'object' || Array.isArray(raw.values)) {
        issues.push({ index: idx, message: 'values отсутствует или не объект' });
        return;
      }
      models.push({
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `model-${idx + 1}`,
        values: raw.values as Record<string, unknown>,
      });
    };

    if (Array.isArray(parsed)) {
      parsed.forEach(push);
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)) {
      ((parsed as { items: unknown[] }).items).forEach(push);
    } else if (parsed && typeof parsed === 'object' && 'values' in parsed) {
      push(parsed, 0);
    } else {
      issues.push({ index: 0, message: 'Ожидался объект, массив или {items:[...]}' });
    }

    return models.length > 0
      ? { ok: true, models, issues }
      : { ok: false, issues };
  }
}

export const modelIO = new ModelIO();