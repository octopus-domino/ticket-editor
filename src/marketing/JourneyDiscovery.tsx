import { Link } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { JOURNEY_PAGES } from './journeyPages';
import './journey-discovery.css';
import { reachGoal } from '@/shared/analytics/metrika';
import { solutionBenefit } from './solutionBenefits';
import { useState } from 'react';
import { SOLUTION_GROUPS } from './ReadySolutionsMenu';

export function JourneyDiscovery() {
  const [query,setQuery]=useState(''),[group,setGroup]=useState('featured');
  const kinds=SOLUTION_GROUPS.find(item=>item.kinds[0]===group)?.kinds;
  const builder=JOURNEY_PAGES.find(page=>page.kind==='builder')!;
  const visible=JOURNEY_PAGES.filter(page=>page.kind!=='hub'&&page.kind!=='builder'
    && (group==='featured'?['invite','certificates','menu'].includes(page.kind):!kinds||kinds.includes(page.kind))
    && `${page.label} ${page.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const choose=(value:string)=>{setGroup(value);reachGoal('solutions_filter_selected',{group:value});};
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
      <div className="discovery-filters">
        <label>{t('Search')}<input type="search" value={query} onChange={event=>{setQuery(event.target.value);if(event.target.value&&group==='featured')choose('all');}} /></label>
        <div role="group" aria-label={t('Ready-to-use services')}>
          <button type="button" aria-pressed={group==='featured'} onClick={()=>choose('featured')}>{t('Start here')}</button>
          {SOLUTION_GROUPS.map(item=><button type="button" key={item.kinds[0]} aria-pressed={group===item.kinds[0]} onClick={()=>choose(item.kinds[0])}>{item.label()}</button>)}
          <button type="button" aria-pressed={group==='all'} onClick={()=>choose('all')}>{t('All solutions')}</button>
        </div>
      </div>
      <div className="discovery-grid">
        {visible.map(
          (page, index) => (
            <article className={`discovery-card discovery-${page.kind} ${group==='featured'?'is-featured':'is-compact'}`} key={page.path}>
              <div className="discovery-preview" aria-hidden="true">
                <span>CoDoc / 0{index + 1}</span>
                <strong>{page.label}</strong>
                <i>✳</i>
                <div className="discovery-paper-lines" />
                <small>PDF · QR · {t('Share')}</small>
              </div>
              <h3>{page.label}</h3>
              <p>{page.description}</p>
              <details className="discovery-benefits"><summary>{t('Benefits for you and your recipients')}</summary><p>{solutionBenefit(page.kind)}</p></details>
              <Link
                className="codoc-button codoc-primary"
                to={page.action}
                onClick={() =>
                  reachGoal('start_journey', { kind: page.kind, group, placement: 'service_card' })
                }
              >
                {page.actionLabel} ↗
              </Link>
              <Link className="discovery-more" to={page.path} onClick={()=>reachGoal('solution_details_opened',{kind:page.kind,group})}>
                {t('How it works')} →
              </Link>
            </article>
          ),
        )}
      </div>
      {visible.length===0&&<p role="status">{t('No matching solutions. Try another search.')}</p>}
      <aside className="discovery-builder">
        <div>
          <span className="codoc-eyebrow">{t('Website builder')}</span>
          <h3>{builder.heading}</h3>
          <p>{builder.description}</p>
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
