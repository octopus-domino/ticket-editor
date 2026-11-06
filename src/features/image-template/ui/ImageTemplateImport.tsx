import { useEffect, useMemo, useRef, useState } from 'react';
import type { Slide, CanvasElement, ImageElement, TextElement } from '@/shared/types';
import { t } from '@/shared/i18n';
import { authFetch } from '@/shared/api/client';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import { originalImageSlide, prepareImage, recognizeImage } from '../api/recognitionClient';
import './image-template.css';

const messages: Record<string, string> = {
  'recognition.invalid_image': 'Use a PNG, JPEG or WebP image up to 8 MB.',
  'recognition.ocr_unavailable':
    'Local OCR is unavailable. Ask the administrator to install Tesseract and language data.',
  'recognition.vision_unavailable':
    'The local vision model is unavailable. Check Ollama and the configured model.',
  'recognition.timeout': 'Recognition timed out. Try a smaller or clearer image.',
  'recognition.busy': 'Another document is being recognized. Please try again shortly.',
  'recognition.too_complex': 'This page is too complex. Crop the document or split it into pages.',
  'recognition.invalid_result':
    'The recognition result could not be converted safely. Try a clearer image.',
  'recognition.no_text': 'No text was recognized. Graphic regions were kept as images.',
  'recognition.low_confidence':
    'Some text is uncertain. Compare it with the original before generating documents.',
  'recognition.review_required':
    'Review text, positions and data bindings before saving. Recognition can make mistakes.',
};

const CORRUPT_AREA_RATIO = 0.4;

function isDarkColor(fill: string | undefined | null): boolean {
  if (!fill) return false;
  const v = fill.trim().toLowerCase();
  if (v === 'black' || v === '#000' || v === '#000000') return true;
  if (!/^#[a-f\d]{3,8}$/i.test(v)) return false;
  const hex = v.length === 4 ? v.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : v.slice(0, 7);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) < 0.4;
}

function normalizeForComposite(el: CanvasElement): CanvasElement {
  if (el.type !== 'text' && el.type !== 'footer') return el;
  const text = el as TextElement;
  return { ...text, background: 'transparent' };
}

function composeWithBackground(slide: Slide, imageSrc: string): Slide {
  const image: ImageElement = {
    id: crypto.randomUUID(),
    type: 'image',
    x: 0,
    y: 0,
    width: slide.width,
    height: slide.height,
    rotation: 0,
    src: imageSrc,
  };

  const foreground = slide.elements
    .filter((el) => ['text', 'table'].includes(el.type))
    .map(normalizeForComposite);

  return { ...slide, elements: [image, ...foreground] };
}

export function ImageTemplateImport({
  onDraft,
  onBusy,
  context = 'template',
}: {
  onDraft(slide: Slide | null): void;
  onBusy(value: boolean): void;
  context?: 'template' | 'document';
}) {
  const [source, setSource] = useState('');
  const [filename, setFilename] = useState('');
  const [rawSlide, setRawSlide] = useState<Slide | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [language, setLanguage] = useState('rus+eng');
  const [engine, setEngine] = useState('ocr');
  const [vision, setVision] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keepBackground, setKeepBackground] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);

  const composedSlide = useMemo<Slide | null>(() => {
    if (!rawSlide) return null;
    return keepBackground && source
      ? composeWithBackground(rawSlide, source)
      : rawSlide;
  }, [rawSlide, keepBackground, source]);

  const preview = useMemo(
    () =>
      composedSlide
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeSlideToSvg(composedSlide))}`
        : '',
    [composedSlide],
  );

  useEffect(() => {
    const lifecycle = revision;
    const abort = new AbortController();
    void authFetch('/api/recognition/capabilities', { signal: abort.signal })
      .then(async (response) => {
        if (response.ok && !abort.signal.aborted)
          setVision(((await response.json()) as { ollama?: boolean }).ollama === true);
      })
      .catch(() => {});
    return () => {
      abort.abort();
      controller.current?.abort();
      lifecycle.current++;
      onBusy(false);
    };
  }, [onBusy]);

  useEffect(() => {
    onDraft(composedSlide);
  }, [composedSlide, onDraft]);

  function reset() {
    controller.current?.abort();
    revision.current++;
    setRawSlide(null);
    setWarnings([]);
    setError('');
    setKeepBackground(false);
    onDraft(null);
  }

  async function select(file?: File) {
    reset();
    setSource('');
    setFilename('');
    if (!file) return;
    const current = revision.current;
    setBusy(true);
    onBusy(true);
    try {
      const image = await prepareImage(file);
      if (current === revision.current) {
        setSource(image);
        setFilename(file.name);
      }
    } catch (reason) {
      if (current === revision.current)
        setError(reason instanceof Error ? reason.message : 'recognition.failed');
    } finally {
      if (current === revision.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }

  async function recognize() {
    reset();
    const current = revision.current;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 150_000);
    setBusy(true);
    onBusy(true);
    try {
      const result = await recognizeImage(source, language, engine, filename, abort.signal);
      if (current === revision.current) {
        setRawSlide(result.slide);
        setWarnings(result.warnings);

        const elements = result.slide.elements;
        const hasHugeDarkElement = elements.some(
          (el) =>
            (el.type === 'shape' || el.type === 'path') &&
            el.width * el.height > result.slide.width * result.slide.height * CORRUPT_AREA_RATIO &&
            isDarkColor((el as { fill?: string }).fill),
        );
        const nonText = elements.filter((el) => el.type !== 'text').length;
        if (hasHugeDarkElement || (engine !== 'ocr' && nonText < 3)) {
          setKeepBackground(true);
        }
      }
    } catch (reason) {
      if (current === revision.current)
        setError(
          abort.signal.aborted
            ? 'recognition.timeout'
            : reason instanceof Error
              ? reason.message
              : 'recognition.failed',
        );
    } finally {
      window.clearTimeout(timeout);
      if (current === revision.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }

  async function keepOriginal() {
    reset();
    const current = revision.current;
    setBusy(true);
    onBusy(true);
    try {
      const original = await originalImageSlide(source, filename);
      if (current === revision.current) {
        setRawSlide(original);
      }
    } catch {
      if (current === revision.current) setError('recognition.invalid_image');
    } finally {
      if (current === revision.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }

  const hasRecognizedText =
    rawSlide !== null && rawSlide.elements.some((el) => el.type === 'text');

  return (
    <section className="image-template-import" aria-busy={busy}>
      {context === 'template' && <h2>{t('Create a template from an image')}</h2>}
      <p>{t('Recognition runs on your own server. No external AI service receives the image.')}</p>
      <label>
        {t('Document image')}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => void select(event.target.files?.[0])}
        />
      </label>
      <p>{t('Use a PNG, JPEG or WebP image up to 8 MB.')}</p>
      <label>
        {t('Recognition language')}
        <select
          value={language}
          disabled={busy}
          onChange={(event) => {
            reset();
            setLanguage(event.target.value);
          }}
        >
          <option value="rus+eng">{t('Russian and English')}</option>
          <option value="eng">English</option>
        </select>
      </label>
      {vision && (
        <label>
          {t('Recognition method')}
          <select
            value={engine}
            disabled={busy}
            onChange={(event) => {
              reset();
              setEngine(event.target.value);
            }}
          >
            <option value="ocr">{t('Local OCR')}</option>
            <option value="ollama">Ollama</option>
          </select>
        </label>
      )}
      {hasRecognizedText && (
        <label className="image-template-keep-bg">
          <input
            type="checkbox"
            checked={keepBackground}
            disabled={busy}
            onChange={(event) => setKeepBackground(event.target.checked)}
          />
          {t('Keep original as background (editable text over the raster)')}
        </label>
      )}
      <div className="image-template-actions">
        <button type="button" disabled={!source || busy} onClick={() => void keepOriginal()}>
          {t('Keep original appearance')}
        </button>
        <button type="button" disabled={!source || busy} onClick={() => void recognize()}>
          {t(busy ? 'Recognizing…' : 'Recognize locally')}
        </button>
        {busy && (
          <button
            type="button"
            onClick={() => {
              reset();
              setBusy(false);
              onBusy(false);
            }}
          >
            {t('Cancel')}
          </button>
        )}
      </div>
      <p>
        {t(
          'Keep the original as an image, or recognize editable objects with approximate formatting.',
        )}
      </p>
      {busy && (
        <p role="status">
          {t('Reading text and reconstructing the layout. This may take up to a minute.')}
        </p>
      )}
      {error && <p role="alert">{t(messages[error] ?? error)}</p>}
      {source && (
        <div className="image-template-comparison">
          <figure>
            <figcaption>{t('Original image')}</figcaption>
            <img src={source} alt={t('Original image')} />
          </figure>
          {preview && (
            <figure>
              <figcaption>{t('Editable result')}</figcaption>
              <img src={preview} alt={t('Editable result')} />
            </figure>
          )}
        </div>
      )}
      {composedSlide && (
        <p role="status">
          {t('Editable objects')}: {composedSlide.elements.length}
          {keepBackground && (
            <>
              {' · '}
              {t('Graphics from the original raster')}
            </>
          )}
        </p>
      )}
      {warnings.map((warning) => (
        <p key={warning}>{t(messages[warning] ?? warning)}</p>
      ))}
      {composedSlide && context === 'template' && (
        <p>
          {t(
            'Create the template to edit objects, add fields and connect your data in the editor.',
          )}
        </p>
      )}
    </section>
  );
}