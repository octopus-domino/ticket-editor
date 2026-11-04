import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { templateStore } from '../state/TemplateStore';
import { createSlide } from '@/domain/slide/operations';
import { workspaceStore } from '@/workspace/store';
import { useStore } from '@/shared/store/store';
import './template-journey.css';

export function NewTemplatePage() {
  const navigate = useNavigate();
  const folderId = useStore(workspaceStore, (state) => state.activeFolderId);
  const [params] = useSearchParams();
  const { schemas, activeSchema, loading, error: schemaError } = useSchemas();
  const [name, setName] = useState('');
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedSchema = schemaId ?? params.get('schemaId') ?? activeSchema?.id ?? '';
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const template = await templateStore.create({
        name: name.trim(),
        folderId,
        schemaId: schemas.some((s) => s.id === selectedSchema) ? selectedSchema : null,
        slides: [createSlide(1)],
        bindings: [],
      });
      if (folderId) workspaceStore.expandFolders([folderId]);
      await workspaceStore.refresh();
      navigate(`/app/templates/${encodeURIComponent(template.id)}/edit`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось создать шаблон. Попробуйте ещё раз.',
      );
      setBusy(false);
    }
  }
  return (
    <main className="template-new">
      <Link to="/app/templates">← Все шаблоны</Link>
      <p className="template-eyebrow">Макет → Данные → Готовые документы</p>
      <h1>Начнём с вашего шаблона</h1>
      <p>Дайте ему название — и переходите к макету. Подготовить данные можно позже.</p>
      <p role="status">
        {folderId
          ? 'Шаблон появится в выбранной слева папке.'
          : 'Шаблон появится в корневой папке документов.'}
      </p>
      <form onSubmit={(event) => void submit(event)} className="template-form">
        <label htmlFor="template-name">Название шаблона</label>
        <input
          id="template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, сертификат участника"
          required
          maxLength={200}
          autoFocus
          disabled={busy}
        />
        <label htmlFor="template-schema">
          Схема данных <span>(необязательно)</span>
        </label>
        <select
          id="template-schema"
          value={selectedSchema}
          onChange={(event) => setSchemaId(event.target.value)}
          disabled={busy || loading}
          aria-describedby="schema-help"
        >
          <option value="">Добавлю позже в редакторе</option>
          {schemas.map((schema) => (
            <option value={schema.id} key={schema.id}>
              {schema.name}
            </option>
          ))}
        </select>
        <p id="schema-help">
          Схема — список полей, которые меняются: имя, дата, номер. Выберите существующую или
          создайте её в панели «Данные».
        </p>
        {schemaError && (
          <p role="status">
            Не удалось загрузить схемы. Можно начать без них и добавить поля позже.
          </p>
        )}
        {error && (
          <p role="alert" className="schema-error">
            {error}
          </p>
        )}
        <button className="schema-btn-fill" type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Создаём шаблон…' : 'Создать и открыть редактор →'}
        </button>
      </form>
      <aside className="template-help">
        <strong>Что дальше?</strong>
        <ol>
          <li>Разместите текст, изображения и другие элементы.</li>
          <li>Свяжите переменные со своими полями данных.</li>
          <li>Сохраните шаблон и перейдите к генерации документов.</li>
        </ol>
      </aside>
    </main>
  );
}
