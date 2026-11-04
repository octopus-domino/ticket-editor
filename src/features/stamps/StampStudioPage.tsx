import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllStamps,
  addCustomStamp,
  updateCustomStamp,
  removeCustomStamp,
  type StampTemplate,
} from '@/lib/stamps/library';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import { StampEditor } from '@/presentation/components/stamps/StampEditor';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import { exportPdfServer } from '@/lib/serverExport';
import { downloadFile } from '@/shared/files/download';
import type { Slide } from '@/shared/types';
import { t, useLocale } from '@/shared/i18n';
import '../library/product-library.css';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { svgToPng } from '@/lib/svg/toPng';
import { authStore } from '@/auth/store';
import { useStore } from '@/shared/store/store';
import { useSearchParams } from 'react-router-dom';
import { buildTutorialStamp } from '../../templates/tutorials';
import { TutorialCoach } from '@/features/learning/TutorialCoach';

function stampSlide(stamp: StampTemplate): Slide {
  return {
    id: 'stamp-page',
    name: stamp.name,
    width: stamp.width,
    height: stamp.height,
    format: 'custom',
    orientation: stamp.width > stamp.height ? 'landscape' : 'portrait',
    background: 'transparent',
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    elements: [newStampFromTemplate(stamp, 0, 0)],
  };
}
function preview(stamp: StampTemplate) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeSlideToSvg(stampSlide(stamp)))}`;
}
export function StampStudioPage() {
  const locale = useLocale();
  const [params] = useSearchParams();
  const user = useStore(authStore, (state) => state.user);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<StampTemplate | null>(() =>
    params.get('lesson') === 'stamp' ? buildTutorialStamp() : null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const library = useMemo(() => {
    void locale;
    void version;
    return getAllStamps();
  }, [locale, version]);
  const previews = useMemo(
    () => new Map(library.map((stamp) => [stamp.id, preview(stamp)])),
    [library],
  );
  const stamps = library.filter((stamp) =>
    stamp.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const save = (data: Omit<StampTemplate, 'id'>) => {
    if (!selected) return;
    if (selected.custom) updateCustomStamp(selected.id, data);
    else addCustomStamp({ ...data, id: `custom-${crypto.randomUUID()}`, custom: true });
    setSelected(null);
    setVersion((value) => value + 1);
  };
  return (
    <section className="product-library">
      <TutorialCoach topic="stamp" />
      <LanguageSwitcher />
      <header>
        <div>
          <h1>{t('Stamp studio')}</h1>
          <p>{t('Create a stamp without creating a document. Edit, save and download it here.')}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setSelected({
              id: '',
              name: t('My stamp'),
              width: 240,
              height: 240,
              shapes: [],
              texts: [],
              images: [],
            })
          }
        >
          {t('Create a stamp')} +
        </button>
      </header>
      <nav className="library-tabs">
        <Link to="/app/library">{t('Document library')}</Link>
        <Link to="/app/stamps" aria-current="page">
          {t('Stamps')}
        </Link>
        <Link to="/app/learn?lesson=stamp">{t('Learn step by step')}</Link>
      </nav>
      <p>
        {t(
          'Custom stamps are saved in this browser. Download a backup to move them to another device.',
        )}
      </p>
      <input
        aria-label={t('Search stamps')}
        placeholder={t('Search stamps')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <div className="library-grid">
        {stamps.map((stamp) => (
          <article className="library-card" key={stamp.id}>
            <img
              className="stamp-preview"
              src={previews.get(stamp.id)}
              alt={stamp.name}
              loading="lazy"
            />
            <div>
              <h2>{stamp.name}</h2>
              <div className="library-card-actions">
                <button
                  className="stamp-edit"
                  type="button"
                  onClick={() => setSelected(structuredClone(stamp))}
                >
                  {t('Edit')} <span aria-hidden="true">↗</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      new Blob([serializeSlideToSvg(stampSlide(stamp))], { type: 'image/svg+xml' }),
                      `${stamp.name}.svg`,
                    )
                  }
                >
                  SVG
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    setError('');
                    void svgToPng(serializeSlideToSvg(stampSlide(stamp)), stamp.width, stamp.height)
                      .then((blob) => downloadFile(blob, `${stamp.name}.png`))
                      .catch((reason: Error) => setError(reason.message))
                      .finally(() => setBusy(false));
                  }}
                >
                  PNG
                </button>
                {user ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      setError('');
                      void exportPdfServer([stampSlide(stamp)])
                        .catch((reason: Error) => setError(reason.message))
                        .finally(() => setBusy(false));
                    }}
                  >
                    PDF
                  </button>
                ) : (
                  <Link to="/login?next=%2Fstamp-editor">PDF · {t('Sign in')}</Link>
                )}
                <button
                  className="stamp-backup"
                  type="button"
                  onClick={() =>
                    downloadFile(
                      new Blob([JSON.stringify(stamp)], { type: 'application/json' }),
                      `${stamp.name}.json`,
                    )
                  }
                >
                  {t('Backup')}
                </button>
                {stamp.custom && (
                  <button
                    className="stamp-delete"
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('Delete this stamp?'))) {
                        removeCustomStamp(stamp.id);
                        setVersion((value) => value + 1);
                      }
                    }}
                  >
                    {t('Delete')}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!stamps.length && <p role="status">{t('No results')}</p>}
      {selected && (
        <StampEditor
          key={selected.id}
          initialWidth={selected.width}
          initialHeight={selected.height}
          initialShapes={selected.shapes}
          initialTexts={selected.texts}
          initialImages={selected.images}
          initialName={selected.name}
          onSave={save}
          onCancel={() => setSelected(null)}
        />
      )}
    </section>
  );
}
