import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { captureAssets, installAssets, validateAsset, type Asset } from './assets';
import { newSimpleText } from '@/lib/factories';
import { prepareImage } from '@/features/image-template/api/recognitionClient';
import '../templates/ui/template-journey.css';

import { libraryRequest as request, type Library } from './libraryApi';
import { assetDocument } from './assetDocument';
import { workspaceApi } from '@/workspace/api';
import './libraries.css';

export function AssetLibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<Asset[]>([]);
  const [name, setName] = useState('');
  const [assetName, setAssetName] = useState('');
  const [addMode, setAddMode] = useState('text');
  const [folder, setFolder] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [colors, setColors] = useState('#1a365d,#ffffff');
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [brandFont, setBrandFont] = useState('Arial');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const writable = library && library.role !== 'viewer';
  async function list() {
    setLibraries(await request<Library[]>('/api/libraries'));
  }
  useEffect(() => {
    void list().catch((e: Error) => setError(e.message));
    void request<{ id: string; name: string }[]>('/api/templates')
      .then(setTemplates)
      .catch(() => {});
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function accept(value: Library) {
    setLibrary(value);
    setItems(value.items.map(validateAsset));
    setDirty(false);
    setFolder('');
  }
  function add(assets: Asset[]) {
    setItems((old) => [
      ...old,
      ...assets
        .filter((a) => !old.some((item) => item.id === a.id))
        .map((a) => ({ ...a, folderId: folder })),
    ]);
    setDirty(true);
  }
  function createLibrary() {
    void run(async () => {
      accept(await request<Library>('/api/libraries', 'POST', { name }));
      setName('');
      await list();
    });
  }

  function reloadLibrary() {
    if (!library) return;
    void run(async () => accept(await request<Library>(`/api/libraries/${library.id}`)));
  }

  function saveLibrary() {
    if (!library) return;
    void run(async () => {
      const value = await request<Library>(`/api/libraries/${library.id}`, 'PUT', {
        revision: library.revision,
        items,
      });
      accept(value);
      await list();
      setMessage(t('Saved'));
    });
  }

  function installCopies() {
    void run(async () => {
      installAssets(items);
      setMessage(t('Copies added. Open the editor to use them.'));
    });
  }

  function addBrandText() {
    const id = crypto.randomUUID();
    add([
      validateAsset({
        id,
        kind: 'symbol',
        name: assetName,
        payload: {
          id,
          name: assetName,
          prototype: { ...newSimpleText(0, 0), text: assetName, fontFamily: brandFont },
        },
      }),
    ]);
    setAssetName('');
  }

  function addFolder() {
    add([{ id: crypto.randomUUID(), kind: 'folder', name: assetName }]);
    setAssetName('');
  }

  function addPalette() {
    void run(async () => {
      const palette = colors.split(',').map((c) => c.trim());
      if (!palette.length || palette.length > 20 || palette.some((c) => !/^#[a-f\d]{6}$/i.test(c)))
        throw new Error(t('Use comma-separated HEX colors.'));
      add(
        palette.map((color, index) => {
          const id = crypto.randomUUID();
          return validateAsset({
            id,
            kind: 'brand',
            name: `${assetName} ${index + 1}`,
            payload: {
              id,
              name: `${assetName} ${index + 1}`,
              fills: [{ id: crypto.randomUUID(), type: 'solid', color }],
              strokes: [],
            },
          });
        }),
      );
      setAssetName('');
    });
  }

  function addTemplateCopy() {
    void run(async () => {
      const payload = await request<{ name: string }>(`/api/templates/${templateId}`);
      add([
        validateAsset({
          id: `template:${templateId}`,
          name: payload.name,
          kind: 'template',
          payload,
        }),
      ]);
    });
  }

  function removeAsset(item: Asset) {
    setItems((old) =>
      old
        .filter((a) => a.id !== item.id)
        .map((a) => (a.folderId === item.id ? { ...a, folderId: '' } : a)),
    );
    setDirty(true);
  }

  function createTemplateFromAsset(item: Asset) {
    void run(async () => {
      const copy = await request<{ id: string }>('/api/templates', 'POST', {
        ...(validateAsset(item).payload as object),
        schemaId: null,
        folderId: null,
      });
      navigate(`/app/templates/${copy.id}/edit`);
    });
  }

  function openMaterialDocument(item: Asset) {
    if (!library) return;
    void run(async () => {
      const content = assetDocument(item, items);
      if (dirty && writable)
        accept(
          await request<Library>(`/api/libraries/${library.id}`, 'PUT', {
            revision: library.revision,
            items,
          }),
        );
      const created = await workspaceApi.createDocument(item.name, null);
      try {
        await workspaceApi.saveDocument(created.id, content);
      } catch (reason) {
        await workspaceApi.deleteDocument(created.id).catch(() => {});
        throw reason;
      }
      navigate(`/app/editor/${created.id}`);
    });
  }

  function applyAccess() {
    if (!library) return;
    void run(async () => {
      await request<void>(`/api/libraries/${library.id}/members`, 'POST', {
        email,
        role,
      });
      accept(await request<Library>(`/api/libraries/${library.id}`));
      setEmail('');
      setMessage(t('Saved'));
    });
  }

  return (
    <main className="template-new asset-libraries-page">
      <h1>{t('Shared libraries')}</h1>
      <p>
        {t(
          'Save a library on the server and load it on another device. Local assets are uploaded only when you choose to save.',
        )}
      </p>
      <ol className="library-steps">
        <li>{t('Choose or create a library')}</li>
        <li>{t('Add and save materials')}</li>
        <li>{t('Use a material in a new document')}</li>
      </ol>
      <label>
        {t('Library')}
        <select
          value={library?.id ?? ''}
          disabled={busy || dirty}
          onChange={(e) => {
            const id = e.target.value;
            if (id) void run(async () => accept(await request<Library>(`/api/libraries/${id}`)));
            else {
              setLibrary(null);
              setItems([]);
            }
          }}
        >
          <option value="">—</option>
          {libraries.map((l) => (
            <option value={l.id} key={l.id}>
              {l.name} ·{' '}
              {l.role === 'owner' ? t('Owner') : l.role === 'editor' ? t('Editor') : t('Viewer')}
            </option>
          ))}
        </select>
      </label>
      <details open={libraries.length === 0} className="library-create">
        <summary>{t('Create library')}</summary>
        <label>
          {t('Name')}
          <input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </label>
        <button disabled={busy || dirty || !name.trim()} onClick={createLibrary}>
          {t('Create library')}
        </button>
      </details>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {library && (
        <>
          <p>
            {library.name} ·{' '}
            {library.role === 'owner'
              ? t('Owner')
              : library.role === 'editor'
                ? t('Editor')
                : t('Viewer')}
            {dirty ? ' *' : ''}
          </p>
          <button disabled={busy} onClick={reloadLibrary}>
            {t('Reload library')}
          </button>
          <button disabled={busy || !writable || !dirty} onClick={saveLibrary}>
            {t('Save library')}
          </button>
          <p>
            {t(
              'Reload discards unsaved library changes. A version conflict never overwrites the server copy.',
            )}
          </p>
          {dirty && (
            <p className="library-save-hint">
              {t('Save the library before switching to another.')}
            </p>
          )}
          <details className="library-transfer">
            <summary>{t('Local copies')}</summary>
            <button
              disabled={busy || !writable}
              onClick={() =>
                void run(async () => {
                  const captured = captureAssets();
                  if (!captured.length)
                    throw new Error(
                      t(
                        'No local materials found. Create a stamp, style or symbol in the editor first.',
                      ),
                    );
                  add(captured);
                })
              }
            >
              {t('Add local stamps, styles and symbols')}
            </button>
            <button
              disabled={busy || !items.some((item) => !['folder', 'template'].includes(item.kind))}
              onClick={installCopies}
            >
              {t('Install local copies')}
            </button>
          </details>
          {writable && (
            <details className="template-form library-add-materials" open>
              <summary>{t('Add materials')}</summary>
              <label>
                {t('Material type')}
                <select value={addMode} onChange={(event) => setAddMode(event.target.value)}>
                  <option value="text">{t('Text')}</option>
                  <option value="logo">{t('Image')}</option>
                  <option value="palette">{t('Styles')}</option>
                  <option value="folder">{t('Folder')}</option>
                  <option value="template">{t('Template')}</option>
                </select>
              </label>
              {addMode !== 'template' && (
                <label>
                  {t('Material name')}
                  <input
                    aria-label={t('Material name')}
                    value={assetName}
                    maxLength={200}
                    onChange={(event) => setAssetName(event.target.value)}
                  />
                  {!assetName.trim() && (
                    <small>{t('Enter a name before adding a material.')}</small>
                  )}
                </label>
              )}
              <label>
                {t('Folder')}
                <select value={folder} onChange={(e) => setFolder(e.target.value)}>
                  <option value="">—</option>
                  {items
                    .filter((a) => a.kind === 'folder')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
              <div hidden={addMode !== 'text'}>
                <label>
                  {t('Font')}
                  <select value={brandFont} onChange={(e) => setBrandFont(e.target.value)}>
                    {['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'].map(
                      (font) => (
                        <option key={font}>{font}</option>
                      ),
                    )}
                  </select>
                </label>
                <button disabled={busy || !assetName.trim()} onClick={addBrandText}>
                  {t('Add brand text')}
                </button>
              </div>
              <div hidden={addMode !== 'logo'}>
                <label>
                  {t('Brand logo')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy || !assetName.trim()}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void run(async () => {
                          const src = await prepareImage(file);
                          const bitmap = await createImageBitmap(file);
                          const ratio = bitmap.width / bitmap.height;
                          bitmap.close();
                          const id = crypto.randomUUID();
                          add([
                            validateAsset({
                              id,
                              kind: 'symbol',
                              name: assetName,
                              payload: {
                                id,
                                name: assetName,
                                prototype: {
                                  id: crypto.randomUUID(),
                                  type: 'image',
                                  x: 0,
                                  y: 0,
                                  width: 200,
                                  height: 200 / ratio,
                                  rotation: 0,
                                  src,
                                },
                              },
                            }),
                          ]);
                          setAssetName('');
                        });
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              <button
                hidden={addMode !== 'folder'}
                disabled={busy || !assetName.trim()}
                onClick={addFolder}
              >
                {t('Add folder')}
              </button>
              <div hidden={addMode !== 'palette'}>
                <label>
                  {t('Brand colors')}
                  <input
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="#1a365d,#ffffff"
                  />
                </label>
                <button disabled={busy || !assetName.trim()} onClick={addPalette}>
                  {t('Add brand palette')}
                </button>
              </div>
              <div hidden={addMode !== 'template'}>
                <label>
                  {t('Template')}
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">—</option>
                    {templates.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={!templateId || busy} onClick={addTemplateCopy}>
                  {t('Add template copy')}
                </button>
              </div>
            </details>
          )}
          {items.map((item) => (
            <article className="template-help" key={item.id}>
              <strong>{item.name}</strong> ·{' '}
              {t(
                item.kind === 'folder'
                  ? 'Folder'
                  : item.kind === 'stamp'
                    ? 'Stamps'
                    : item.kind === 'template'
                      ? 'Template'
                      : item.kind === 'symbol'
                        ? 'Symbols'
                        : 'Styles',
              )}
              {item.folderId && ` · ${items.find((a) => a.id === item.folderId)?.name ?? ''}`}
              {library.role === 'owner' && (
                <label>
                  <input
                    type="checkbox"
                    checked={!!item.locked}
                    onChange={(e) => {
                      setItems((old) =>
                        old.map((a) => (a.id === item.id ? { ...a, locked: e.target.checked } : a)),
                      );
                      setDirty(true);
                    }}
                  />
                  {t('Protected')}
                </label>
              )}
              {writable && (
                <button
                  disabled={busy || (library.role !== 'owner' && !!item.locked)}
                  onClick={() => removeAsset(item)}
                >
                  {t('Remove')}
                </button>
              )}
              {item.kind === 'template' && (
                <button disabled={busy} onClick={() => createTemplateFromAsset(item)}>
                  {t('Create template')}
                </button>
              )}
              {item.kind !== 'folder' && (
                <button
                  className="library-use"
                  disabled={busy}
                  onClick={() => openMaterialDocument(item)}
                >
                  {t('Use in a new document')} ↗
                </button>
              )}
            </article>
          ))}
          {library.role === 'owner' && (
            <details className="template-form">
              <summary>{t('Library access')}</summary>
              <p>
                {t(
                  'Grant access to a registered user. Viewers can copy assets; editors can modify unprotected items. Only owners manage protection and access.',
                )}
              </p>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="viewer">{t('Viewer')}</option>
                <option value="editor">{t('Editor')}</option>
                <option value="remove">{t('Remove access')}</option>
              </select>
              <button disabled={busy || dirty || !email} onClick={applyAccess}>
                {t('Apply access')}
              </button>
            </details>
          )}
        </>
      )}
    </main>
  );
}
