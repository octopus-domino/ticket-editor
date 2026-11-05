import { useEffect, useMemo, useRef, useState } from 'react';
import type { Slide } from '@/shared/types';
import { t } from '@/shared/i18n';
import { authFetch } from '@/shared/api/client';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import { prepareImage, recognizeImage } from '../api/recognitionClient';
import './image-template.css';

const messages: Record<string, string> = {
  'recognition.invalid_image': 'Use a PNG, JPEG or WebP image up to 8 MB.',
  'recognition.ocr_unavailable': 'Local OCR is unavailable. Ask the administrator to install Tesseract and language data.',
  'recognition.vision_unavailable': 'The local vision model is unavailable. Check Ollama and the configured model.',
  'recognition.timeout': 'Recognition timed out. Try a smaller or clearer image.',
  'recognition.busy': 'Another document is being recognized. Please try again shortly.',
  'recognition.too_complex': 'This page is too complex. Crop the document or split it into pages.',
  'recognition.invalid_result': 'The recognition result could not be converted safely. Try a clearer image.',
  'recognition.no_text': 'No text was recognized. Graphic regions were kept as images.',
  'recognition.low_confidence': 'Some text is uncertain. Compare it with the original before generating documents.',
  'recognition.review_required': 'Review text, positions and data bindings before saving. Recognition can make mistakes.',
};
export function ImageTemplateImport({ onDraft, onBusy }: { onDraft(slide: Slide | null): void; onBusy(value: boolean): void }) {
  const [source, setSource] = useState(''), [filename, setFilename] = useState('');
  const [slide, setSlide] = useState<Slide | null>(null), [warnings, setWarnings] = useState<string[]>([]);
  const [language, setLanguage] = useState('rus+eng'), [engine, setEngine] = useState('ocr');
  const [vision, setVision] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null), revision = useRef(0);
  const preview = useMemo(() => slide ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeSlideToSvg(slide))}` : '', [slide]);
  useEffect(() => {
    const lifecycle = revision;
    const abort = new AbortController();
    void authFetch('/api/recognition/capabilities', { signal: abort.signal }).then(async (response) => {
      if (response.ok && !abort.signal.aborted) setVision((await response.json() as { ollama?: boolean }).ollama === true);
    }).catch(() => { /* OCR can still return a specific setup error on request. */ });
    return () => { abort.abort(); controller.current?.abort(); lifecycle.current++; onBusy(false); };
  }, [onBusy]);
  function reset() { controller.current?.abort(); revision.current++; setSlide(null); setWarnings([]); setError(''); onDraft(null); }
  async function select(file?: File) {
    reset(); setSource(''); setFilename('');
    if (!file) return;
    const current = revision.current;
    setBusy(true); onBusy(true);
    try {
      const image = await prepareImage(file);
      if (current === revision.current) { setSource(image); setFilename(file.name); }
    } catch (reason) { if (current === revision.current) setError(reason instanceof Error ? reason.message : 'recognition.failed'); }
    finally { if (current === revision.current) { setBusy(false); onBusy(false); } }
  }
  async function recognize() {
    reset(); const current = revision.current;
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 150_000);
    setBusy(true); onBusy(true);
    try {
      const result = await recognizeImage(source, language, engine, filename, abort.signal);
      if (current === revision.current) { setSlide(result.slide); setWarnings(result.warnings); onDraft(result.slide); }
    } catch (reason) { if (current === revision.current) setError(abort.signal.aborted ? 'recognition.timeout' : reason instanceof Error ? reason.message : 'recognition.failed'); }
    finally { window.clearTimeout(timeout); if (current === revision.current) { setBusy(false); onBusy(false); } }
  }
  return <section className="image-template-import" aria-busy={busy}>
    <h2>{t('Create a template from an image')}</h2>
    <p>{t('Recognition runs on your own server. No external AI service receives the image.')}</p>
    <label>{t('Document image')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => void select(event.target.files?.[0])} /></label>
    <p>{t('Use a PNG, JPEG or WebP image up to 8 MB.')}</p>
    <label>{t('Recognition language')}<select value={language} disabled={busy} onChange={(event) => { reset(); setLanguage(event.target.value); }}>
      <option value="rus+eng">{t('Russian and English')}</option><option value="eng">English</option>
    </select></label>
    {vision && <label>{t('Recognition method')}<select value={engine} disabled={busy} onChange={(event) => { reset(); setEngine(event.target.value); }}>
      <option value="ocr">{t('Local OCR')}</option><option value="ollama">Ollama</option>
    </select></label>}
    <div className="image-template-actions"><button type="button" disabled={!source || busy} onClick={() => void recognize()}>{t(busy ? 'Recognizing…' : 'Recognize locally')}</button>
      {busy && <button type="button" onClick={() => { reset(); setBusy(false); onBusy(false); }}>{t('Cancel')}</button>}</div>
    {busy && <p role="status">{t('Reading text and reconstructing the layout. This may take up to a minute.')}</p>}
    {error && <p role="alert">{t(messages[error] ?? error)}</p>}
    {source && <div className="image-template-comparison">
      <figure><figcaption>{t('Original image')}</figcaption><img src={source} alt={t('Original image')} /></figure>
      {preview && <figure><figcaption>{t('Editable result')}</figcaption><img src={preview} alt={t('Editable result')} /></figure>}
    </div>}
    {slide && <p role="status">{t('Editable objects')}: {slide.elements.length}</p>}
    {warnings.map((warning) => <p key={warning}>{t(messages[warning] ?? warning)}</p>)}
    {slide && <p>{t('Create the template to edit objects, add fields and connect your data in the editor.')}</p>}
  </section>;
}
