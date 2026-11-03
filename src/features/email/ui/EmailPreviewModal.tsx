import React, { useState } from 'react';
import { useStore } from '@/shared/store/store';
import { emailStore } from '../state/EmailStore';

export const EmailPreviewModal: React.FC = () => {
  const modal = useStore(emailStore, (s) => s.modal);
  const html = useStore(emailStore, (s) => s.previewHtml);
  const loading = useStore(emailStore, (s) => s.previewLoading);
  const error = useStore(emailStore, (s) => s.previewError);
  const slides = useStore(emailStore, (s) => s.slides);

  const [client, setClient] = useState<'gmail' | 'outlook' | 'apple'>('outlook');
  const [width, setWidth] = useState<number>(600);

  if (modal !== 'preview') return null;

  const slideName = slides && slides.length > 0 ? slides[0].name : null;
  const clientWidth = client === 'gmail' ? 640 : client === 'outlook' ? 600 : 580;

  const downloadHtml = (): void => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const download = (): void => {
    if (!slides || slides.length === 0) return;
    void emailStore.downloadEml({
      inlineSlides: slides,
      items: [{ inlineValues: {}, to: 'preview@local', subject: 'Превью' }],
    });
  };

  const openSend = (): void => {
    if (!slides) return;
    emailStore.openSend(slides);
  };

  return (
    <div className="email-modal-backdrop" onMouseDown={() => emailStore.close()}>
      <div className="email-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="email-modal-head">
          <h3>
            📧 Email-превью
            {slideName && (
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                · {slideName}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="email-client-tabs">
              {(['gmail', 'outlook', 'apple'] as const).map((c) => (
                <button
                  key={c}
                  className={client === c ? 'active' : ''}
                  onClick={() => setClient(c)}
                >
                  {c === 'gmail' ? 'Gmail' : c === 'outlook' ? 'Outlook' : 'Apple Mail'}
                </button>
              ))}
            </div>
            <label className="email-width-slider">
              <span>{width}px</span>
              <input
                type="range"
                min={320}
                max={800}
                value={width}
                onChange={(e) => setWidth(+e.target.value)}
                title="Ширина окна"
              />
            </label>
            <button className="email-modal-close" onClick={() => emailStore.close()}>×</button>
          </div>
        </header>

        <div className="email-modal-toolbar">
          <button className="toolbar-btn" onClick={download}>📥 Скачать .eml</button>
          <button className="toolbar-btn" onClick={downloadHtml} disabled={!html}>📄 Скачать HTML</button>
          <button className="toolbar-btn primary" onClick={openSend}>📤 Отправить</button>
          <div style={{ flex: 1 }} />
          <span className="email-hint">
            {slideName ? `Отправляется: ${slideName}. ` : ''}
            .eml открывается в Outlook двойным кликом.
          </span>
        </div>

        <div
          className="email-modal-body"
          style={{ background: client === 'outlook' ? '#eaeaea' : '#f0f0f0' }}
        >
          {loading && <div className="email-loading">Загрузка превью…</div>}
          {error && <div className="email-error">{error}</div>}
          {html && !loading && (
            <div
              className="email-client-frame"
              style={{ width: Math.min(width, clientWidth), maxWidth: '100%' }}
            >
              <div className="email-client-chrome">
                <div className="email-client-dots">
                  <span /><span /><span />
                </div>
                <div className="email-client-title">
                  {client === 'outlook' ? 'Новое сообщение — Outlook' :
                   client === 'gmail' ? 'Черновик — Gmail' : 'Новое сообщение — Mail'}
                </div>
              </div>
              <iframe
                key={html.length + client}
                title="Email preview"
                srcDoc={html}
                sandbox="allow-same-origin allow-popups"
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', border: 'none', background: '#f4f4f5' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};