import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { DiagramEditor } from '@/presentation/components/DiagramEditor';

vi.mock('@/lib/drawio/embedImagesInSvg', () => ({
  embedImagesInSvg: vi.fn(async (s: string) => s),
}));

vi.mock('@/shared/config', () => ({
  CONFIG: {
    DRAWIO_URL: 'https://embed.diagrams.net/',
  },
}));

const DRAWIO_ORIGIN = 'https://embed.diagrams.net';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderEditor(props: React.ComponentProps<typeof DiagramEditor>): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<DiagramEditor {...props} />);
  });
}

function getIframe(): HTMLIFrameElement {
  const iframe = document.querySelector('iframe');
  if (!iframe) throw new Error('iframe not found');
  return iframe;
}

/**
 * Эмулирует сообщение от drawio-iframe.
 * source явно прокидываем, потому что jsdom не заполняет его автоматически.
 */
function postFromDrawio(
  msg: object,
  origin: string = DRAWIO_ORIGIN,
  source: MessageEventSource | null = null,
): void {
  const event = new MessageEvent('message', {
    data: JSON.stringify(msg),
    origin,
    source: source ?? (getIframe().contentWindow as MessageEventSource | null),
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe('DiagramEditor', () => {
  beforeEach(() => {
    // drawio не загружается в jsdom — эмулируем contentWindow.
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      configurable: true,
      get() {
        return window;
      },
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('отправляет configure на event=configure', async () => {
    const postSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    renderEditor({
      svg: '',
      xml: '<mxGraphModel/>',
      isOpen: true,
      onClose: () => {},
      onSave: () => {},
    });

    postFromDrawio({ event: 'configure' });

    await new Promise((r) => setTimeout(r, 0));

    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('"action":"configure"'),
      DRAWIO_ORIGIN,
    );
  });

  it('отправляет load на event=init и скрывает спиннер', async () => {
    const postSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    renderEditor({
      svg: '',
      xml: '<mxGraphModel><root/></mxGraphModel>',
      isOpen: true,
      onClose: () => {},
      onSave: () => {},
    });

    // До init спиннер должен быть
    expect(document.body.textContent).toContain('Загрузка');

    postFromDrawio({ event: 'init' });

    await new Promise((r) => setTimeout(r, 0));

    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('"action":"load"'),
      DRAWIO_ORIGIN,
    );

    // После init спиннер скрыт
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.textContent).not.toContain('Загрузка');
  });

  it('игнорирует сообщения с чужим origin', async () => {
    const onSave = vi.fn();

    renderEditor({
      svg: '',
      xml: '',
      isOpen: true,
      onClose: () => {},
      onSave,
    });

    postFromDrawio(
      { event: 'export', data: encodeURIComponent('<svg></svg>') },
      'https://evil.example',
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('вызывает onSave после save → export', async () => {
    const onSave = vi.fn();
    const postSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    renderEditor({
      svg: '',
      xml: '<mxGraphModel/>',
      isOpen: true,
      onClose: () => {},
      onSave,
    });

    postFromDrawio({ event: 'init' });
    await new Promise((r) => setTimeout(r, 0));

    postFromDrawio({ event: 'save', xml: '<mxGraphModel><root/></mxGraphModel>' });
    await new Promise((r) => setTimeout(r, 0));

    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('"action":"export"'),
      DRAWIO_ORIGIN,
    );

    postFromDrawio({
      event: 'export',
      data: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>'),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(onSave).toHaveBeenCalledWith(
      expect.stringContaining('<svg'),
      '<mxGraphModel><root/></mxGraphModel>',
    );
  });

  it('не вызывает onSave при невалидном export', async () => {
    const onSave = vi.fn();

    renderEditor({
      svg: '',
      xml: '',
      isOpen: true,
      onClose: () => {},
      onSave,
    });

    postFromDrawio({ event: 'init' });
    await new Promise((r) => setTimeout(r, 0));

    postFromDrawio({ event: 'export', data: 'garbage' });

    await new Promise((r) => setTimeout(r, 100));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Esc закрывает редактор', async () => {
    const onClose = vi.fn();

    renderEditor({
      svg: '',
      xml: '',
      isOpen: true,
      onClose,
      onSave: () => {},
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(onClose).toHaveBeenCalled();
  });
});