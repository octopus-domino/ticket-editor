import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { t, useLocale } from '@/shared/i18n';
import { lessons, type LessonTopic, type LessonStep } from './lessons';
import {
  buildTutorialBrochure,
  buildTutorialStamp,
  TUTORIAL_LOGO,
} from '../../templates/tutorials';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import type { Slide } from '@/shared/types';
import './learning-page.css';

function demonstration(topic: LessonTopic, current: LessonStep): string {
  if (topic === 'stamp') {
    const stamp = buildTutorialStamp(current.stage);
    const slide: Slide = {
      id: 'stamp-demo',
      name: stamp.name,
      width: 240,
      height: 240,
      background: 'transparent',
      format: 'custom',
      orientation: 'portrait',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      elements: [newStampFromTemplate(stamp, 0, 0)],
    };
    return serializeSlideToSvg(slide);
  }
  const slide = buildTutorialBrochure(current.stage)[current.side ?? 0];
  // Mirror the editor's explicit placeholder; never display a fabricated QR pattern.
  for (const element of slide.elements)
    if (element.type === 'qr') {
      element._qrDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170"><rect x="2" y="2" width="166" height="166" fill="white" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 4"/><text x="85" y="85" text-anchor="middle" font-family="Arial" font-size="38" fill="#183c39">QR</text><text x="85" y="120" text-anchor="middle" font-family="Arial" font-size="11" fill="#64748b">codoc.site/learn</text></svg>')}`;
    }
  return serializeSlideToSvg(slide);
}
export function LessonPlayer() {
  const locale = useLocale(),
    [params, setParams] = useSearchParams();
  const library = useMemo(() => {
    void locale;
    return lessons();
  }, [locale]);
  const stageRef = useRef<HTMLElement>(null);
  const requested = params.get('lesson') ?? 'document';
  const topic: LessonTopic = requested in library ? (requested as LessonTopic) : 'document';
  const lesson = library[topic];
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false);
  const current = lesson.steps[Math.min(step, lesson.steps.length - 1)];
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [topic]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step < lesson.steps.length - 1) setStep(step + 1);
      else setPlaying(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, [step, playing, lesson.steps.length]);
  const preview = useMemo(
    () =>
      topic === 'data'
        ? ''
        : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(demonstration(topic, current))}`,
    [topic, current],
  );
  const move = (next: number) => {
    setPlaying(false);
    setStep(next);
    stageRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };
  return (
    <main className="learning-page">
      <header>
        <div className="learning-topline">
          <Link to="/">← CoDoc</Link>
          <LanguageSwitcher />
        </div>
        <h1>{t('Learning center')}</h1>
        <p>
          {t('Real examples. Follow the steps, inspect the result and open the editable original.')}
        </p>
      </header>
      <nav className="lesson-tabs" aria-label={t('Lessons')}>
        {(Object.keys(library) as LessonTopic[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={topic === id}
            onClick={() => setParams({ lesson: id })}
          >
            {library[id].title}
          </button>
        ))}
      </nav>
      <div className="lesson-layout">
        <section ref={stageRef} className="lesson-stage" aria-label={t('Animated demonstration')}>
          <div className="lesson-demo-toolbar">
            <span>{current.tool}</span>
            <span>
              {topic === 'stamp'
                ? '240 × 240 px'
                : topic === 'document'
                  ? 'A4 · 297 × 210 mm'
                  : 'XLSX'}
            </span>
          </div>
          <div className={`lesson-demo-canvas lesson-demo-${topic}`} key={`${topic}-${step}`}>
            {topic === 'data' ? (
              <table>
                <thead>
                  <tr>
                    <th>__codoc_name</th>
                    <th>name</th>
                    <th>date</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((row) => (
                    <tr key={row}>
                      <td>{current.stage >= 2 ? `${t('Data set')} ${row}` : ''}</td>
                      <td>{current.stage >= 2 ? t('YOUR NAME') : ''}</td>
                      <td>{current.stage >= 2 ? '2026-01-01' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="lesson-paper">
                <img src={preview} alt={current.title} />
                {current.focus && (
                  <svg className="lesson-focus" viewBox="0 0 1123 794" aria-hidden="true">
                    <rect
                      x={current.focus[0]}
                      y={current.focus[1]}
                      width={current.focus[2]}
                      height={current.focus[3]}
                      fill="#ff4d0009"
                      stroke="#ff4d00"
                      strokeWidth="5"
                      strokeDasharray="12 7"
                      rx="6"
                    />
                  </svg>
                )}
              </div>
            )}
          </div>
          <div className="lesson-progress-track">
            <span style={{ width: `${((step + 1) / lesson.steps.length) * 100}%` }} />
          </div>
          <div className="lesson-controls">
            <button type="button" disabled={step === 0} onClick={() => move(step - 1)}>
              ← {t('Back')}
            </button>
            <button
              type="button"
              aria-pressed={playing}
              onClick={() => {
                if (step === lesson.steps.length - 1) setStep(0);
                setPlaying(!playing);
              }}
            >
              {t(playing ? 'Pause' : 'Play')}
            </button>
            <button
              type="button"
              disabled={step === lesson.steps.length - 1}
              onClick={() => move(step + 1)}
            >
              {t('Next')} →
            </button>
          </div>
          <p className="lesson-demo-caption">
            {t(
              'Preview of the actual editable example. The highlighted area changes with each step.',
            )}
            {topic === 'document' && current.stage >= 13 && (
              <>
                {' '}
                {t(
                  'На канве отображается placeholder. Реальная картинка генерируется при экспорте SVG / PDF на сервере.',
                )}
              </>
            )}
          </p>
        </section>
        <section className="lesson-description" aria-live="polite">
          <p>
            {step + 1} / {lesson.steps.length} · {current.tool}
          </p>
          <h2>{current.title}</h2>
          <p>{current.detail}</p>
          {topic === 'stamp' && current.stage >= 6 && (
            <a className="lesson-resource" href={TUTORIAL_LOGO} download="workshop-leaf.svg">
              {t('Download practice image')} ↓
            </a>
          )}
          <Link to={lesson.href}>
            {t('Open editable example')} <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </div>
      <section className="lesson-index">
        <h2>{t('All lesson steps')}</h2>
        <ol>
          {lesson.steps.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                aria-current={step === index ? 'step' : undefined}
                onClick={() => move(index)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.tool}</small>
                </div>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
