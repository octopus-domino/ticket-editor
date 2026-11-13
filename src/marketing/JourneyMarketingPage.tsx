import { Link, useLocation } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { JOURNEY_PAGES, JOURNEY_STEPS, JOURNEY_FAQ } from './journeyPages';
import { JourneyDiscovery } from './JourneyDiscovery';
import './landing.css';
import { reachGoal } from '@/shared/analytics/metrika';
import { ReadySolutionsMenu } from './ReadySolutionsMenu';
import { solutionBenefit } from './solutionBenefits';

export function JourneyMarketingPage() {
  const {pathname}=useLocation();
  const page=JOURNEY_PAGES.find(item=>item.path.replace(/\/$/,'')===pathname.replace(/\/$/,''))??JOURNEY_PAGES[0];
  return <div className="codoc-landing">
    <header className="codoc-header codoc-container"><Link className="codoc-brand" to="/">CoDoc.</Link>
      <ReadySolutionsMenu />
      <LanguageSwitcher/>
    </header>
    <main>
      <section className="codoc-container discovery-hero"><nav className="search-breadcrumbs"><Link to="/">CoDoc</Link> / <Link to="/solutions/">{t('Ready-to-use services')}</Link></nav>
        <p className="codoc-eyebrow">{page.label}</p><h1>{page.heading}</h1><p className="codoc-lead">{page.description}</p>
        <div className="codoc-actions"><Link className="codoc-button codoc-primary" to={page.action} onClick={()=>reachGoal(page.action==='/sites/new'?'start_site':'start_journey',{placement:page.path,kind:page.kind})}>{page.actionLabel} ↗</Link><Link className="codoc-text-link" to="/solutions/">{t('Choose a workflow')} →</Link></div>
        <p className="codoc-micro">{t('No design skills needed. Start with a ready form.')}</p>
      </section>
      <section className="codoc-container discovery-steps"><h2>{t('Three steps to a finished result')}</h2><ol>{JOURNEY_STEPS.map(([title,text],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
      {solutionBenefit(page.kind) && <section className="codoc-container discovery-details"><h2>{t('Benefits for you and your recipients')}</h2><p>{solutionBenefit(page.kind)}</p></section>}
      {page.kind==='builder'&&<section className="codoc-container discovery-details"><h2>{t('A website built from your settings')}</h2><p>{t('Choose invitations, certificates or a menu. Add fields, mark required answers and choose a theme. Publish the site and keep its management link for future changes.')}</p><Link className="codoc-button" to="/sites/new">{t('Open the website builder')} ↗</Link></section>}
      <JourneyDiscovery/>
      <section className="codoc-container discovery-details"><h2>{t('Questions before you start')}</h2>
        {JOURNEY_FAQ.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      </section>
    </main><footer className="codoc-container discovery-footer"><Link to="/">CoDoc</Link><Link to="/solutions/">{t('Ready-to-use services')}</Link><Link to="/sites/new">{t('Website builder')}</Link><Link to="/app">{t('Workspace')}</Link></footer>
  </div>;
}
