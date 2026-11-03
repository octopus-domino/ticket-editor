import React, { useEffect, useState } from 'react';
import { useStore } from '@/shared/store/store';
import { emailStore } from '../state/EmailStore';
import { modelStore } from '@/features/data-models/state/ModelStore';

export const EmailSendModal: React.FC = () => {
  const modal = useStore(emailStore, (s) => s.modal);
  const slides = useStore(emailStore, (s) => s.slides);
  const busy = useStore(emailStore, (s) => s.sendBusy);
  const error = useStore(emailStore, (s) => s.sendError);
  const done = useStore(emailStore, (s) => s.sendDone);

  const models = useStore(modelStore, (s) => s.models);
  const selectedId = useStore(modelStore, (s) => s.selectedId);
  const activeModel = models.find((m) => m.id === selectedId);

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [from, setFrom] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('Документ от ticket-editor');

  useEffect(() => {
    if (modal !== 'send') return;
    setTo('');
    setCc('');
    setBcc('');
    setFrom('');
    setReplyTo('');
    setSubject('Документ от ticket-editor');
  }, [modal]);

  if (modal !== 'send' || !slides) return null;

  const slideName = slides.length > 0 ? slides[0].name : 'без названия';

  const parseEmails = (v: string): string[] =>
    v.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const toList = parseEmails(to);
    if (toList.length === 0) return;

    const items = toList.map((addr) => ({
      ...(activeModel
        ? { dataModelId: activeModel.id, inlineValues: { ...activeModel.values } }
        : { inlineValues: {} }),
      to: addr,
      cc: parseEmails(cc),
      bcc: parseEmails(bcc),
      subject,
    }));

    void emailStore.send({
      inlineSlides: slides,
      items,
      email: {
        from: from.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
        subject,
      },
    });
  };

  return (
    <div className="email-modal-backdrop" onMouseDown={() => !busy && emailStore.close()}>
      <div className="email-modal email-modal--narrow" onMouseDown={(e) => e.stopPropagation()}>
        <header className="email-modal-head">
          <div>
            <h3 style={{ margin: 0 }}>📤 Отправить по email</h3>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Слайд: <b style={{ color: '#475569' }}>{slideName}</b>
            </div>
          </div>
          <button className="email-modal-close" onClick={() => emailStore.close()} disabled={busy}>×</button>
        </header>

        {done ? (
          <div className="email-send-done">
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 8px' }}>Письмо отправлено</h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
              Проверьте папку «Входящие» в Outlook. Дальше — «Переслать» или «Сохранить как черновик».
            </p>
            <button className="toolbar-btn primary" onClick={() => emailStore.close()}>
              Готово
            </button>
          </div>
        ) : (
          <form className="email-form" onSubmit={submit}>
            <label>
              <span>Кому</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="you@company.ru"
                required
                autoFocus
              />
            </label>

            <label>
              <span>Тема</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </label>

            <div className="email-form-row">
              <label>
                <span>Копия</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="необязательно"
                />
              </label>
              <label>
                <span>Скрытая копия</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="необязательно"
                />
              </label>
            </div>

            <div className="email-form-row">
              <label>
                <span>От кого</span>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="noreply@company.ru"
                />
              </label>
              <label>
                <span>Reply-To</span>
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="support@company.ru"
                />
              </label>
            </div>

            {error && <div className="email-error">{error}</div>}

            {!activeModel && (
              <div className="email-hint" style={{ color: '#d97706', padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
                ⚠️ Модель не выбрана — плейсхолдеры <code>{'{{...}}'}</code> останутся в письме.
                Выберите модель в панели «Данные», если хотите заполнить.
              </div>
            )}

            <div className="email-form-actions">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => emailStore.close()}
                disabled={busy}
              >
                Отмена
              </button>
              <button type="submit" className="toolbar-btn primary" disabled={busy || !to.trim()}>
                {busy ? 'Отправка…' : 'Отправить'}
              </button>
            </div>

            <p className="email-hint">
              Письмо уйдёт через SMTP-сервер, настроенный в backend.
              Если хотите сначала проверить — «Отмена» и «📥 Скачать .eml».
            </p>
          </form>
        )}
      </div>
    </div>
  );
};