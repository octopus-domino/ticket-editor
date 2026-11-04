import { registerAllElements } from '@/presentation/components/elements/register-all';
import { EmailModals } from '@/features/email';
import '@/features/email/email.css';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useEffect } from 'react';
import { registerLanguageSave } from '@/shared/i18n';
import { modelStore } from '@/features/data-models/state/ModelStore';

// Rendering tools and email UI are downloaded only when the workspace is opened.
registerAllElements();

export function WorkspaceRuntime() {
  useEffect(() => registerLanguageSave(() => modelStore.flush()), []);
  return (
    <>
      <WorkspaceLayout />
      <EmailModals />
    </>
  );
}
