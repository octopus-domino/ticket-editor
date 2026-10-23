/* ============================================================
   DiagramEditor.tsx — полный

   F-DG-01..11, F-ERR-02.
   draw.io embed-протокол (JSON-сообщения) вместо устаревших строк.
   ============================================================ */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface DiagramEditorProps {
  svg: string;
  xml: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (svg: string, xml: string) => void;
}

import { CONFIG } from '@/shared/config';

const DRAWIO_URL = CONFIG.DRAWIO_URL;

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  svg: _initialSvg,
  xml: initialXml,
  isOpen,
  onClose,
  onSave,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastXmlRef = useRef<string>(initialXml);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      const allowed = (() => {
        try { return event.origin === new URL(DRAWIO_URL).origin; }
        catch { return false; }
      })();
      if (!allowed) return;

      let msg: any;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      if (msg.event === 'init') {
        setIsLoading(false);
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'load', autosave: 1, xml: lastXmlRef.current || '<mxGraphModel/>' }),
          '*',
        );
      } else if (msg.event === 'autosave' || msg.event === 'save') {
        if (typeof msg.xml === 'string') lastXmlRef.current = msg.xml;
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'export', format: 'svg', xml: lastXmlRef.current }),
          '*',
        );
      } else if (msg.event === 'export') {
        const svgOut = decodeURIComponent(msg.data || msg.xml || '');
        onSave(svgOut, lastXmlRef.current);
      } else if (msg.event === 'exit') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onSave, onClose]);

  const handleSave = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ action: 'save', xml: lastXmlRef.current }),
      '*',
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div className="diagram-editor-backdrop">
      <div className="diagram-editor-modal">
        <div className="diagram-editor-header">
          <h3>Diagram Editor</h3>
          <div className="diagram-editor-actions">
            <button className="diagram-btn" onClick={handleSave}>💾 Save</button>
            <button className="diagram-btn" onClick={onClose}>✕ Close</button>
          </div>
        </div>
        <div className="diagram-editor-body">
          {isLoading && (
            <div className="diagram-loading">
              <div className="diagram-spinner" />
              <p>Loading editor...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={`${DRAWIO_URL}?embed=1&proto=json&spin=1&configure=1`}
            className="diagram-iframe"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
};

DiagramEditor.displayName = 'DiagramEditor';