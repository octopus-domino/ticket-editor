import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { embedImagesInSvg } from '@/lib/drawio/embedImagesInSvg';

describe('embedImagesInSvg', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает svg без <image> как есть', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g><rect/></g></svg>';
    const out = await embedImagesInSvg(svg);
    expect(out).toBe(svg);
  });

  it('возвращает svg с data: href как есть', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image href="data:image/png;base64,iVBOR" width="10" height="10"/>
    </svg>`;
    const out = await embedImagesInSvg(svg);
    expect(out).toBe(svg);
  });

  it('встраивает http URL как data URL', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]); // PNG magic
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob([pngBytes], { type: 'image/png' })),
      }),
    );

    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image href="https://example.com/a.png" width="10" height="10"/>
    </svg>`;

    const out = await embedImagesInSvg(svg);
    expect(out).toContain('data:image/png;base64,');
    expect(out).not.toContain('https://example.com/a.png');
  });

  it('оставляет http URL, если fetch упал', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS')));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image href="https://example.com/a.png" width="10" height="10"/>
    </svg>`;

    const out = await embedImagesInSvg(svg);
    expect(out).toContain('https://example.com/a.png');
  });

  it('не падает на невалидном svg', async () => {
    const out = await embedImagesInSvg('<svg><not-closed');
    expect(out).toBe('<svg><not-closed');
  });
});