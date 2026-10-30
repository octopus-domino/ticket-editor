/* ============================================================
   DiagramEditor.tsx

   F-DG-01..11, F-ERR-02.
   draw.io embed-протокол (JSON-сообщения).

   v10.4 — починка зависания спиннера:
     - Добавлены подробные console.log для отладки postMessage.
     - Таймаут не сбрасывается при изменении isLoading.
     - Отправка пустого конфига ({}), чтобы не ломать self-hosted drawio.
     - Ослаблена проверка event.source (иногда в iframe она null).
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

/** Origin для postMessage. Если URL относительный — берём origin текущей страницы. */
const DRAWIO_ORIGIN: string = (() => {
  try {
    const u = new URL(DRAWIO_URL, window.location.href);
    if (!/^https?:/i.test(u.protocol)) return window.location.origin;
    return u.origin;
  } catch {
    return 'https://embed.diagrams.net';
  }
})();

const LOAD_TIMEOUT_MS = 20_000; // Увеличили до 20с для медленных сетей

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

  /* ---------- Отправка сообщения в iframe ---------- */
  const post = useCallback((msg: unknown) => {
    const w = iframeRef.current?.contentWindow;
    if (!w) {
      console.warn('[DiagramEditor] iframe contentWindow is null');
      return;
    }
    try {
      const json = JSON.stringify(msg);
      console.log('[DiagramEditor] sending:', json);
      w.postMessage(json, DRAWIO_ORIGIN);
    } catch (err) {
      console.error('[DiagramEditor] postMessage failed:', err);
    }
  }, []);

  /* ---------- Инициализация и таймаут ---------- */
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setLoadError(null);
    savedRef.current = false;
    lastXmlRef.current = initialXml || '<mxGraphModel/>';

    // Таймаут: если drawio не прислал init за 20s — показываем ошибку.
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          setLoadError(
            'Не удалось загрузить draw.io за 20 секунд. Проверьте интернет, VPN или блокировщик рекламы.',
          );
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

  /* ---------- Обработка postMessage ---------- */
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // Логируем всё, что приходит (для отладки)
      console.log('[DiagramEditor] message received:', event.origin, event.data);

      // Проверка origin (ослаблена: 'null' разрешён для sandbox)
      if (event.origin !== DRAWIO_ORIGIN && event.origin !== 'null') {
        console.warn('[DiagramEditor] ignored message from unexpected origin:', event.origin);
        return;
      }

      // Проверка source (если iframe ещё не готов, source может быть null)
      if (iframeRef.current && iframeRef.current.contentWindow && event.source !== iframeRef.current.contentWindow) {
        console.warn('[DiagramEditor] ignored message from unexpected source');
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      const ev = msg.event;

      if (ev === 'configure') {
        // Отправляем пустой конфиг (самый безопасный вариант для self-hosted)
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
          console.warn('[DiagramEditor] invalid SVG from drawio:', decoded.substring(0, 100));
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

  /* ---------- Кнопка Save ---------- */
  const handleSave = useCallback(() => {
    post({ action: 'save', xml: lastXmlRef.current });
  }, [post]);

  /* ---------- Esc закрывает ---------- */
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

  /* ---------- Формирование URL ---------- */
  const iframeSrc = useMemo(() => {
    const u = new URL(DRAWIO_URL, window.location.href);
    u.searchParams.set('embed', '1');
    u.searchParams.set('proto', 'json');
    u.searchParams.set('spin', '1');
    u.searchParams.set('configure', '1');
    u.searchParams.set('libraries', 'general');
    // Принудительно отключаем сохранение в localStorage drawio
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