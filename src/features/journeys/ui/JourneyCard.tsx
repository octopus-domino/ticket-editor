import { t, getLocale } from '@/shared/i18n';
import type { JourneyDocument } from '../domain/definitions';
import { JOURNEY_CAPABILITIES } from '../domain/definitions';
import { lessons } from '../domain/schedule';
import { JourneyArtwork } from './JourneyArtwork';
export function JourneyCard({
  document,
  compact = false,
}: {
  document: Pick<JourneyDocument, 'kind' | 'title' | 'data'> & { id?: string };
  compact?: boolean;
}) {
  if (document.kind === 'INVITATION' || document.kind === 'TICKET' || document.kind === 'PROPOSAL')
    return <JourneyArtwork document={document} />;
  return (
    <article
      className={`journey-card journey-${document.kind.toLowerCase()} theme-${document.data.theme ?? 'sage'} ${compact ? 'compact' : ''}`}
    >
      <div className="journey-card-mark">
        C<span>o</span>Doc / {JOURNEY_CAPABILITIES[document.kind].label}
      </div>
      <div className="journey-ornament" aria-hidden="true">
        ✳
      </div>
      <h2>{document.title}</h2>
      {document.data.recipient && <h3>{document.data.recipient}</h3>}
      {document.data.issuer && <p className="journey-issuer">{document.data.issuer}</p>}
      {document.data.description && (
        <p className="journey-description">{document.data.description}</p>
      )}
      {document.data.date && (
        <p className="journey-date">
          {new Date(`${document.data.date}T12:00:00`).toLocaleDateString(getLocale(), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}{' '}
          {document.data.time}
        </p>
      )}
      {document.data.items && (
        <div className="journey-menu-items">
          {document.data.items
            .split('\n')
            .filter(Boolean)
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
        </div>
      )}
      {document.kind === 'SCHEDULE' && (
        <ul>
          {lessons(document.data.events ?? '[]').map((item) => (
            <li key={item.id}>
              {item.date} · {item.time} — {item.title}
              {item.location ? ` / ${item.location}` : ''}
            </li>
          ))}
        </ul>
      )}
      {document.data.portfolio && /^https?:\/\//i.test(document.data.portfolio) && (
        <a href={document.data.portfolio} target="_blank" rel="noreferrer">
          {t('Открыть портфолио ↗')}
        </a>
      )}
      {Object.entries(document.data)
        .filter(
          ([key]) =>
            ![
              'theme',
              'site',
              'recipient',
              'issuer',
              'description',
              'date',
              'time',
              'items',
              'location',
              'contact',
              'positions',
              'currency',
              'events',
              'timezone',
              'portfolio',
            ].includes(key),
        )
        .map(([key, value]) => (
          <p key={key}>{value}</p>
        ))}
      <footer>
        {document.data.location && <p>{document.data.location}</p>}
        {document.data.contact && <p>{document.data.contact}</p>}
      </footer>
    </article>
  );
}
