import { Link } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { JOURNEY_PAGES } from './journeyPages';
import './journey-discovery.css';
import { reachGoal } from '@/shared/analytics/metrika';
import { solutionBenefit } from './solutionBenefits';

export function JourneyDiscovery() {
  return (
    <section
      className="codoc-container journey-discovery"
      id="services"
      aria-labelledby="services-heading"
    >
      <div className="codoc-section-heading">
        <div>
          <p className="codoc-eyebrow">{t('Ready-to-use services')}</p>
          <h2 id="services-heading">{t('From an idea to a page, PDF and QR')}</h2>
        </div>
        <p>{JOURNEY_PAGES[0].description}</p>
      </div>
      <div className="discovery-grid">
        {JOURNEY_PAGES.filter((page) => page.kind !== 'hub' && page.kind !== 'builder').map(
          (page, index) => (
            <article className={`discovery-card discovery-${page.kind}`} key={page.path}>
              <div className="discovery-preview" aria-hidden="true">
                <span>CoDoc / 0{index + 1}</span>
                <strong>{page.label}</strong>
                <i>✳</i>
                <div className="discovery-paper-lines" />
                <small>PDF · QR · {t('Share')}</small>
              </div>
              <h3>{page.label}</h3>
              <p>{page.description}</p>
              <p>{solutionBenefit(page.kind)}</p>
              <Link
                className="codoc-button codoc-primary"
                to={page.action}
                onClick={() =>
                  reachGoal('start_journey', { kind: page.kind, placement: 'service_card' })
                }
              >
                {page.actionLabel} ↗
              </Link>
              <Link className="discovery-more" to={page.path}>
                {t('How it works')} →
              </Link>
            </article>
          ),
        )}
      </div>
      <aside className="discovery-builder">
        <div>
          <span className="codoc-eyebrow">{t('Website builder')}</span>
          <h3>{JOURNEY_PAGES[4].heading}</h3>
          <p>{JOURNEY_PAGES[4].description}</p>
        </div>
        <div>
          <Link
            className="codoc-button codoc-primary"
            to="/sites/new"
            onClick={() => reachGoal('start_site', { placement: 'service_banner' })}
          >
            {t('Create a website')} ↗
          </Link>
          <Link className="discovery-more" to="/website-builder/">
            {t('How it works')} →
          </Link>
        </div>
      </aside>
    </section>
  );
}
