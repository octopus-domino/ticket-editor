export interface GenerationItem {
  dataModelId?: string;
  inlineValues?: Record<string, unknown>;
  filenameOverride?: string;
}

export interface GenerationRequest {
  inlineSlides: unknown[];
  items: GenerationItem[];
  format: 'svg' | 'pdf' | 'pdfa';
  packAs: 'zip' | 'single';
  filenamePattern?: string;
  options?: Record<string, unknown>;
}

export interface GenerationResult {
  blob: Blob;
  filename: string;
  count: number;
  failed: number;
}

export interface GenerationJobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  progress: { total: number; completed: number; failed: number };
  errors: { index: number; message: string }[];
  resultUrl: string | null;
  expiresAt: string;
}

export interface GenerationClient {
  generateSync(req: GenerationRequest): Promise<GenerationResult>;
  startJob(req: GenerationRequest): Promise<{ jobId: string; total: number }>;
  pollJob(jobId: string): Promise<GenerationJobStatus>;
  downloadResult(jobId: string): Promise<GenerationResult>;
  cancelJob(jobId: string): Promise<void>;
}