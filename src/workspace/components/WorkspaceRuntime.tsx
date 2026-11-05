import { registerAllElements } from '@/presentation/components/elements/register-all';
import { EmailModals } from '@/features/email';
import '@/features/email/email.css';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useEffect } from 'react';
import { registerLanguageSave } from '@/shared/i18n';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { generationStore } from '@/features/generation/state/GenerationStore';
import { toast } from '@/presentation/components/toast';
import { t } from '@/shared/i18n';

// Rendering tools and email UI are downloaded only when the workspace is opened.
registerAllElements();

export function WorkspaceRuntime() {
  useEffect(() => registerLanguageSave(() => modelStore.flush()), []);
  useEffect(()=>{
    let previous=generationStore.getState().phase;
    return generationStore.subscribe(()=>{
      const state=generationStore.getState();
      if(previous==='async-running'&&state.phase==='async-done')toast.success(t('Generation complete'),t('Open Generation history to download the result.'));
      if(previous==='async-running'&&state.phase==='error')toast.error(t('Generation failed'),t('Open Generation history to inspect failed items.'));
      previous=state.phase;
    });
  },[]);
  return (
    <>
      <WorkspaceLayout />
      <EmailModals />
    </>
  );
}
