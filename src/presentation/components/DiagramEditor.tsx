import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '@/shared/config';
import { embedImagesInSvg } from '@/lib/drawio/embedImagesInSvg';

interface DiagramEditorProps {
  svg: string;
  xml: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (svg: string, xml: string) => void;
}

const DRAWIO_URL = CONFIG.DRAWIO_URL;

const DRAWIO_ORIGIN: string = (() => {
  try {
    const u = new URL(DRAWIO_URL, window.location.href);
    if (!/^https?:/i.test(u.protocol)) return window.location.origin;
    return u.origin;
  } catch {
    return 'https://embed.diagrams.net';
  }
})();

const LOAD_TIMEOUT_MS = 15_000;

function isValidSvg(s: string): boolean {
  return typeof s === 'string' && s.trim().startsWith('<svg') && s.trim().endsWith('</svg>');
}

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  svg: _initialSvg,
  xml: initialXml,
  isOpen,
  onClose,
  onSave,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastXmlRef = useRef<string>(initialXml || '<mxGraphModel/>');
  const savedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const post = useCallback((msg: unknown) => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      // Отправляем с targetOrigin для безопасности
      w.postMessage(JSON.stringify(msg), DRAWIO_ORIGIN);
    } catch (err) {
      console.error('[DiagramEditor] postMessage failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setLoadError(null);
    savedRef.current = false;
    lastXmlRef.current = initialXml || '<mxGraphModel/>';

    timeoutRef.current = window.setTimeout(() => {
      if (isLoading) {
        setLoadError('Не удалось загрузить draw.io. Проверьте интернет или блокировщик рекламы.');
        setIsLoading(false);
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen, initialXml, isLoading]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // 1. Проверяем, что сообщение пришло от нашего iframe
      if (event.source !== iframeRef.current?.contentWindow) return;
      
      // 2. Ослабляем проверку origin (чтобы работало даже в sandbox с origin="null")
      if (event.origin !== DRAWIO_ORIGIN && event.origin !== 'null') return;

      let msg: Record<string, unknown>;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      const ev = msg.event;

      if (ev === 'configure') {
        post({
          action: 'configure',
          config: {
            css: '',
            defaultFonts: ['Arial', 'Helvetica', 'Times New Roman'],
          },
        });
        return;
      }

      if (ev === 'init') {
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsLoading(false);
        setLoadError(null);
        post({
          action: 'load',
          autosave: 1,
          xml: lastXmlRef.current,
        });
        return;
      }

      if (ev === 'autosave' || ev === 'save') {
        if (typeof msg.xml === 'string') lastXmlRef.current = msg.xml;
        post({
          action: 'export',
          format: 'svg',
          xml: lastXmlRef.current,
        });
        return;
      }

      if (ev === 'export') {
        const raw = typeof msg.data === 'string' ? msg.data : '';
        let decoded = '';
        try {
          decoded = decodeURIComponent(raw);
        } catch {
          decoded = raw;
        }

        if (!isValidSvg(decoded)) {
          console.warn('[DiagramEditor] drawio returned invalid SVG');
          return;
        }

        void embedImagesInSvg(decoded)
          .then((embedded: string) => {
            if (savedRef.current) return;
            savedRef.current = true;
            onSave(embedded, lastXmlRef.current);
          })
          .catch((err: unknown) => {
            console.error('[DiagramEditor] embedImagesInSvg failed:', err);
            if (savedRef.current) return;
            savedRef.current = true;
            onSave(decoded, lastXmlRef.current);
          });
        return;
      }

      if (ev === 'exit') {
        onClose();
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onSave, onClose, post]);

  const handleSave = useCallback(() => {
    post({ action: 'save', xml: lastXmlRef.current });
  }, [post]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const iframeSrc = useMemo(() => {
    const u = new URL(DRAWIO_URL, window.location.href);
    u.searchParams.set('embed', '1');
    u.searchParams.set('proto', 'json');
    u.searchParams.set('spin', '1');
    u.searchParams.set('configure', '1');
    u.searchParams.set('libraries', 'general');
    return u.toString();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="diagram-editor-backdrop">
      <div className="diagram-editor-modal">
        <div className="diagram-editor-header">
          <h3>Diagram Editor</h3>
          <div className="diagram-editor-actions">
            <button type="button" className="diagram-btn" onClick={handleSave} disabled={isLoading || !!loadError}>
              💾 Сохранить
            </button>
            <button type="button" className="diagram-btn" onClick={onClose}>
              ✕ Закрыть
            </button>
          </div>
        </div>

        <div className="diagram-editor-body" style={{ position: 'relative', flex: 1 }}>
          {isLoading && !loadError && (
            <div className="diagram-loading" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: '#fff' }}>
              <div className="diagram-spinner" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 16, color: '#64748b' }}>Загрузка редактора…</p>
            </div>
          )}

          {loadError && (
            <div className="diagram-error" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: '#fff' }}>
              <p style={{ color: '#dc2626', marginBottom: 16 }}>{loadError}</p>
              <button
                type="button"
                className="diagram-btn"
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeRef.current.src;
                  }
                }}
              >
                Попробовать снова
              </button>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="diagram-iframe"
            // allow-same-origin ОБЯЗАТЕЛЕН для правильной работы postMessage (без него origin="null")
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
            allow="clipboard-write"
            title="Draw.io editor"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
};

DiagramEditor.displayName = 'DiagramEditor';