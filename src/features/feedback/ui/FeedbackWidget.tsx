import { t as __tr } from '@/shared/i18n';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/presentation/hooks/useFocusTrap';
import { reachGoal } from '@/shared/analytics/metrika';
import { metrikaFeedbackClient } from '../api/MetrikaFeedbackClient';
import {
  FEEDBACK_TOPICS,
  yandexFormUrls,
  type FeedbackClient,
  type FeedbackRating,
} from '../domain/Feedback';
import './feedback.css';

interface Props {
  surface: FeedbackRating['surface'];
  client?: FeedbackClient;
  formUrl?: string;
}

export function FeedbackWidget({
  surface,
  client = metrikaFeedbackClient,
  formUrl = import.meta.env.VITE_FEEDBACK_FORM_URL,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [topic, setTopic] = useState<FeedbackRating['topic']>('general');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [detailed, setDetailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const topicId = useId();
  const forms = yandexFormUrls(formUrl);
  const close = useCallback(() => setOpen(false), []);
  useFocusTrap(root, open, close);

  useEffect(() => {
    if (!open) return;
    const app = document.getElementById('root');
    const triggerElement = trigger.current;
    const wasInert = app?.inert ?? false;
    if (app) app.inert = true;
    return () => {
      if (app) app.inert = wasInert;
      triggerElement?.focus();
    };
  }, [open]);

  function show() {
    setOpen(true);
    reachGoal('feedback_opened', { surface });
  }
  function showDetailed() {
    setDetailed(true);
    reachGoal('feedback_form_opened', { surface });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rating === null || status === 'sending' || status === 'sent') return;
    setStatus('sending');
    setError('');
    try {
      await client.submitRating({ rating, topic, surface });
      setStatus('sent');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : __tr("Не удалось отправить оценку. Попробуйте ещё раз."),
      );
      setStatus('error');
    }
  }

  return (
    <>
      <button ref={trigger} type="button" className="feedback-trigger" onClick={show}>
        {__tr("Обратная связь")}</button>
      {open &&
        createPortal(
          <div
            className="feedback-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              ref={root}
              className={`feedback-dialog${detailed ? ' feedback-dialog-wide' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
            >
              <header className="feedback-header">
                <h2 id={headingId}>{__tr("Как вам CoDoc?")}</h2>
                <button
                  type="button"
                  className="feedback-close"
                  aria-label={__tr("Закрыть обратную связь")}
                  onClick={close}
                >
                  ×
                </button>
              </header>
              {detailed && forms ? (
                <>
                  <p className="feedback-description">
                    {__tr("Расскажите, что стоит улучшить. Ответ получит команда CoDoc.")}</p>
                  <iframe
                    className="feedback-frame"
                    src={forms.embedUrl}
                    title={__tr("Подробный отзыв о CoDoc")}
                    referrerPolicy="no-referrer"
                  />
                  <p className="feedback-fallback">
                    {__tr("Если форма не открылась,")}{' '}
                    <a
                      href={forms.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {__tr("откройте её в новой вкладке ↗")}</a>
                    .
                  </p>
                  <button
                    type="button"
                    className="feedback-secondary"
                    onClick={() => setDetailed(false)}
                  >
                    {__tr("← К оценке")}</button>
                </>
              ) : status === 'sent' ? (
                <div className="feedback-success" role="status">
                  <span aria-hidden="true">✓</span>
                  <h3>{__tr("Спасибо за вашу оценку!")}</h3>
                  <p>{__tr("Она поможет нам сделать CoDoc удобнее.")}</p>
                  {forms && (
                    <button type="button" className="feedback-secondary" onClick={showDetailed}>
                      {__tr("Написать подробнее →")}</button>
                  )}
                  <button type="button" className="feedback-primary" onClick={close}>
                    {__tr("Вернуться к работе")}</button>
                </div>
              ) : (
                <>
                  <p className="feedback-description">
                    {__tr("Что получилось хорошо, а что стоит улучшить? Оценка займёт несколько секунд.")}</p>
                  <form onSubmit={(event) => void submit(event)}>
                    <fieldset className="feedback-ratings" disabled={status === 'sending'}>
                      <legend>{__tr("Насколько вам удобно пользоваться сервисом?")}</legend>
                      <div>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <label
                            key={value}
                            className={rating === value ? 'feedback-rating-selected' : ''}
                          >
                            <input
                              type="radio"
                              name={`rating-${headingId}`}
                              value={value}
                              checked={rating === value}
                              onChange={() => setRating(value)}
                              aria-label={__tr("Оценка {0} из 5", value)}
                            />
                            <span>{value}</span>
                          </label>
                        ))}
                      </div>
                      <p>
                        <span>{__tr("Совсем неудобно")}</span>
                        <span>{__tr("Всё отлично")}</span>
                      </p>
                    </fieldset>
                    <label className="feedback-topic-label" htmlFor={topicId}>
                      {__tr("О чём отзыв?")}</label>
                    <select
                      id={topicId}
                      className="feedback-topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value as FeedbackRating['topic'])}
                      disabled={status === 'sending'}
                    >
                      {FEEDBACK_TOPICS.map((item) => (
                        <option value={item.value} key={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    {status === 'error' && (
                      <p role="alert" className="feedback-error">
                        {error}
                      </p>
                    )}
                    <button
                      className="feedback-primary"
                      type="submit"
                      disabled={rating === null || status === 'sending'}
                    >
                      {status === 'sending' ? __tr("Отправляем…") : __tr("Отправить оценку")}
                    </button>
                  </form>
                  {forms && (
                    <button type="button" className="feedback-secondary" onClick={showDetailed}>
                      {__tr("Хочу написать подробнее →")}</button>
                  )}
                  <p className="feedback-note">{__tr("Без регистрации и обязательных контактов.")}</p>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
