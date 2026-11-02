import { authFetch } from '@/shared/api/client';
import type {
  GenerationClient, GenerationRequest, GenerationResult, GenerationJobStatus,
} from './GenerationClient';

export class HttpGenerationClient implements GenerationClient {
  async generateSync(req: GenerationRequest): Promise<GenerationResult> {
    const res = await authFetch('/api/generate/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inlineSlides: req.inlineSlides,
        items: req.items,
        format: req.format,
        packAs: req.packAs,
        filenamePattern: req.filenamePattern ?? 'document-{{name}}',
        options: req.options ?? {},
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return this.readResult(res);
  }

  async startJob(req: GenerationRequest): Promise<{ jobId: string; total: number }> {
    const res = await authFetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inlineSlides: req.inlineSlides, items: req.items,
        format: req.format, packAs: req.packAs,
        filenamePattern: req.filenamePattern ?? 'document-{{name}}',
        options: req.options ?? {},
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async pollJob(jobId: string): Promise<GenerationJobStatus> {
    const res = await authFetch(`/api/generate/${encodeURIComponent(jobId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async downloadResult(jobId: string): Promise<GenerationResult> {
    const res = await authFetch(`/api/generate/${encodeURIComponent(jobId)}/result`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return this.readResult(res);
  }

  async cancelJob(jobId: string): Promise<void> {
    await authFetch(`/api/generate/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
  }

  private async readResult(res: Response): Promise<GenerationResult> {
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const m = /filename="([^"]+)"/.exec(disposition);
    return {
      blob: await res.blob(),
      filename: m ? m[1] : 'documents.zip',
      count: Number(res.headers.get('X-Generation-Count') ?? 0),
      failed: Number(res.headers.get('X-Generation-Failed') ?? 0),
    };
  }
}

export const httpGenerationClient = new HttpGenerationClient();