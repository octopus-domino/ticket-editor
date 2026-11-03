import { registerAllElements } from '@/presentation/components/elements/register-all';
import { EmailModals } from '@/features/email';
import '@/features/email/email.css';
import { WorkspaceLayout } from './WorkspaceLayout';

// Rendering tools and email UI are downloaded only when the workspace is opened.
registerAllElements();

export function WorkspaceRuntime() {
  return (
    <>
      <WorkspaceLayout />
      <EmailModals />
    </>
  );
}
