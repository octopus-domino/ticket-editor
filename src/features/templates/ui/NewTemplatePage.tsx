import { t as __tr } from '@/shared/i18n';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { templateStore } from '../state/TemplateStore';
import { createSlide } from '@/domain/slide/operations';
import { workspaceStore } from '@/workspace/store';
import { useStore } from '@/shared/store/store';
import { DOCUMENT_PRESETS } from '../../../templates/catalog';
import { t } from '@/shared/i18n';
import './template-journey.css';
import { buildTutorialBrochure } from '../../../templates/tutorials';
import { ImageTemplateImport } from '@/features/image-template/ui/ImageTemplateImport';
import type { Slide } from '@/shared/types';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { productGoal } from '@/shared/analytics/ProductMetrics';

export function NewTemplatePage() {
  const navigate = useNavigate();
  const folderId = useStore(workspaceStore, (state) => state.activeFolderId);
  const [params] = useSearchParams();
  const { schemas, activeSchema, loading, error: schemaError } = useSchemas();
  const tutorial = params.get('lesson') === 'brochure';
  const [name, setName] = useState(tutorial ? t('Workshop handout brochure') : '');
  const [presetId, setPresetId] = useState(
    tutorial ? 'tutorial-brochure' : (params.get('preset') ?? ''),
  );
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognized, setRecognized] = useState<Slide | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const selectedSchema =
    schemaId ?? params.get('schemaId') ?? (tutorial ? '' : activeSchema?.id) ?? '';
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || recognizing || !name.trim() || (presetId === '__image__' && !recognized)) return;
    setBusy(true);
    setError(null);
    try {
      const slides =
        presetId === '__image__' && recognized
          ? [recognized]
          : tutorial
            ? buildTutorialBrochure()
            : (DOCUMENT_PRESETS.find((preset) => preset.id === presetId)?.build() ?? [
                createSlide(1),
              ]);
      const template = await templateStore.create({
        name: name.trim(),
        folderId,
        schemaId: schemas.some((s) => s.id === selectedSchema) ? selectedSchema : null,
        slides,
        bindings: resolveBindings(slides),
      });
      const preset = DOCUMENT_PRESETS.find((item) => item.id === presetId);
      if (preset)
        productGoal('preset_used', { category: preset.category, count: template.slides.length });
      if (folderId) workspaceStore.expandFolders([folderId]);
      await workspaceStore.refresh();
      navigate(
        `/app/templates/${encodeURIComponent(template.id)}/edit${tutorial ? '?lesson=brochure' : ''}`,
        { replace: true },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : __tr('Не удалось создать шаблон. Попробуйте ещё раз.'),
      );
      setBusy(false);
    }
  }
  return (
    <main className="template-new">
      <Link to="/app/library">← {t('Document library')}</Link>
      <p className="template-eyebrow">{__tr('Макет → Данные → Готовые документы')}</p>
      <h1>{__tr('Начнём с вашего шаблона')}</h1>
      <p>{__tr('Дайте ему название — и переходите к макету. Подготовить данные можно позже.')}</p>
      <p role="status">
        {folderId
          ? __tr('Шаблон появится в выбранной слева папке.')
          : __tr('Шаблон появится в корневой папке документов.')}
      </p>
      <form onSubmit={(event) => void submit(event)} className="template-form">
        <label htmlFor="document-preset">{t('Starting layout')}</label>
        <select
          id="document-preset"
          value={presetId}
          onChange={(event) => setPresetId(event.target.value)}
          disabled={busy || recognizing || tutorial}
        >
          {tutorial && <option value="tutorial-brochure">{t('Workshop handout brochure')}</option>}
          <option value="">{t('Blank document')}</option>
          <option value="__image__">{t('Create a template from an image')}</option>
          {DOCUMENT_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {t(preset.name)}
            </option>
          ))}
        </select>
        {presetId === '__image__' && (
          <ImageTemplateImport onDraft={setRecognized} onBusy={setRecognizing} />
        )}
        <label htmlFor="template-name">{__tr('Название шаблона')}</label>
        <input
          id="template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={__tr('Например, сертификат участника')}
          required
          maxLength={200}
          autoFocus
          disabled={busy}
        />
        <label htmlFor="template-schema">
          {__tr('Схема данных')} <span>{__tr('(необязательно)')}</span>
        </label>
        <select
          id="template-schema"
          value={selectedSchema}
          onChange={(event) => setSchemaId(event.target.value)}
          disabled={busy || loading}
          aria-describedby="schema-help"
        >
          <option value="">{__tr('Добавлю позже в редакторе')}</option>
          {schemas.map((schema) => (
            <option value={schema.id} key={schema.id}>
              {schema.name}
            </option>
          ))}
        </select>
        <p id="schema-help">
          {__tr(
            'Схема — список полей, которые меняются: имя, дата, номер. Выберите существующую или создайте её в панели «Данные».',
          )}
        </p>
        {schemaError && (
          <p role="status">
            {__tr('Не удалось загрузить схемы. Можно начать без них и добавить поля позже.')}
          </p>
        )}
        {error && (
          <p role="alert" className="schema-error">
            {error}
          </p>
        )}
        <button
          className="schema-btn-fill"
          type="submit"
          disabled={
            busy || recognizing || !name.trim() || (presetId === '__image__' && !recognized)
          }
        >
          {busy ? __tr('Создаём шаблон…') : __tr('Создать и открыть редактор →')}
        </button>
      </form>
      <aside className="template-help">
        <strong>{__tr('Что дальше?')}</strong>
        <ol>
          <li>{__tr('Разместите текст, изображения и другие элементы.')}</li>
          <li>{__tr('Свяжите переменные со своими полями данных.')}</li>
          <li>{__tr('Сохраните шаблон и перейдите к генерации документов.')}</li>
        </ol>
      </aside>
    </main>
  );
}
