/* ============================================================
   DiagramEditor.tsx

   F-DG-01..11, F-ERR-02.
   draw.io embed-протокол (JSON-сообщения).

   v10.5 — финальная починка:
     - Функция extractSvg корректно распаковывает base64 data URL,
       который присылает draw.io при экспорте.
     - Кнопка "Сохранить" теперь отправляет action: 'export',
       а не 'save' (save — это только исходящее событие).
     - Логи стали чище.
   ============================================================ */

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

const LOAD_TIMEOUT_MS = 20_000;

/**
 * Draw.io может отдавать SVG в двух форматах:
 * 1. Обычная строка, начинающаяся с <svg...
 * 2. data:image/svg+xml;base64,PHN2Zy...
 * Эта функция обрабатывает оба варианта и чистит XML-пролог.
 */
function extractSvg(input: string): string | null {
  let cleaned = input.trim();

  // 1. Если это base64 data URL — декодируем
  if (cleaned.startsWith('data:image/svg+xml;base64,')) {
    try {
      const base64Str = cleaned.substring('data:image/svg+xml;base64,'.length);
      // atob возвращает бинарную строку, прогоняем через escape/unescape для UTF-8
      const raw = atob(base64Str);
      cleaned = decodeURIComponent(escape(raw));
    } catch (e) {
      console.error('[DiagramEditor] failed to decode base64 SVG:', e);
      return null;
    }
  }

  // 2. Убираем XML-пролог и DOCTYPE
  cleaned = cleaned
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .trim();

  // 3. Валидация
  if (cleaned.startsWith('<svg') && cleaned.endsWith('</svg>')) {
    return cleaned;
  }

  return null;
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

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          setLoadError('Не удалось загрузить draw.io за 20 секунд. Проверьте интернет.');
          return false;
        }
        return prev;
      });
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen, initialXml]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== DRAWIO_ORIGIN && event.origin !== 'null') return;
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return;

      let msg: Record<string, unknown>;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      const ev = msg.event;

      if (ev === 'configure') {
        post({ action: 'configure', config: {} });
        return;
      }

      if (ev === 'init') {
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsLoading(false);
        setLoadError(null);
        post({ action: 'load', autosave: 1, xml: lastXmlRef.current });
        return;
      }

      if (ev === 'autosave' || ev === 'save') {
        if (typeof msg.xml === 'string') lastXmlRef.current = msg.xml;
        // При автосохранении от draw.io мы НЕ вызываем onSave сразу,
        // чтобы не спамить историю. Но если пользователь нажал "Save" в самом draw.io,
        // мы должны забрать SVG.
        if (ev === 'save') {
          post({ action: 'export', format: 'svg', xml: lastXmlRef.current });
        }
        return;
      }

      if (ev === 'export') {
        const raw = typeof msg.data === 'string' ? msg.data : '';
        let decoded = raw;
        try {
          decoded = decodeURIComponent(raw);
        } catch {
          decoded = raw;
        }

        const validSvg = extractSvg(decoded);
        if (!validSvg) {
          console.warn('[DiagramEditor] invalid SVG after decode:', decoded.substring(0, 50));
          return;
        }

        void embedImagesInSvg(validSvg)
          .then((embedded: string) => {
            if (savedRef.current) return;
            savedRef.current = true;
            onSave(embedded, lastXmlRef.current);
          })
          .catch((err: unknown) => {
            console.error('[DiagramEditor] embedImagesInSvg failed:', err);
            if (savedRef.current) return;
            savedRef.current = true;
            onSave(validSvg, lastXmlRef.current);
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

  // ИСПРАВЛЕНО: вместо 'save' (который drawio не понимает) отправляем 'export'
  const handleSave = useCallback(() => {
    post({ action: 'export', format: 'svg', xml: lastXmlRef.current });
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
    u.searchParams.set('noSaveBtn', '1');
    return u.toString();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="diagram-editor-backdrop">
      <div className="diagram-editor-modal">
        <div className="diagram-editor-header">
          <h3>Diagram Editor</h3>
          <div className="diagram-editor-actions">
            <button
              type="button"
              className="diagram-btn"
              onClick={handleSave}
              disabled={isLoading || !!loadError}
            >
              💾 Сохранить
            </button>
            <button type="button" className="diagram-btn" onClick={onClose}>
              ✕ Закрыть
            </button>
          </div>
        </div>

        <div className="diagram-editor-body">
          {isLoading && !loadError && (
            <div className="diagram-loading">
              <div className="diagram-spinner" />
              <p>Загрузка редактора…</p>
            </div>
          )}

          {loadError && (
            <div className="diagram-error">
              <p>{loadError}</p>
              <button
                type="button"
                className="diagram-btn"
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
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
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
            allow="clipboard-write"
            title="Draw.io editor"
          />
        </div>
      </div>
    </div>
  );
};

DiagramEditor.displayName = 'DiagramEditor';