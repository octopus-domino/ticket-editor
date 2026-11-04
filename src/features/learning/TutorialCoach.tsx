import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { lessons } from './lessons';
import './learning-page.css';

export function TutorialCoach({ topic }: { topic: 'document' | 'stamp' }) {
  const [params, setParams] = useSearchParams();
  const [index, setIndex] = useState(0),
    [expanded, setExpanded] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  if (!params.has('lesson')) return null;
  const list = lessons()[topic].steps,
    current = list[index];
  return (
    <aside className="tutorial-coach" aria-label={t('Learn step by step')}>
      <div>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {t('Learn step by step')} · {index + 1}/{list.length}
        </button>
        <button
          type="button"
          aria-label={t('Close')}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete('lesson');
            setParams(next, { replace: true });
          }}
        >
          ×
        </button>
      </div>
      {expanded && (
        <>
          <strong>{current.title}</strong>
          <p>{current.detail}</p>
          <div>
            <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              ← {t('Back')}
            </button>
            <span>{current.tool}</span>
            <button
              type="button"
              disabled={index === list.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              {t('Next')} →
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
