import { authStore } from './auth/store';
import { modelStore } from './features/data-models/state/ModelStore';
import { schemaStore } from './features/schemas/state/SchemaStore';
import { templateStore } from './features/templates/state/TemplateStore';
import { generationStore } from './features/generation/state/GenerationStore';
import { emailStore } from './features/email/state/EmailStore';
import { workspaceStore } from './workspace/store';
import { documentPreview } from '@/application/use-cases/DocumentPreview';

/** Composition-root lifecycle; stores do not import one another to manage sessions. */
export function installSessionLifecycle(): () => void {
  let owner = authStore.getState().user?.id;
  return authStore.subscribe(() => {
    const next = authStore.getState().user?.id;
    if (owner === next) return;
    owner = next;
    documentPreview.clear();
    modelStore.reset();
    templateStore.reset();
    emailStore.close();
    schemaStore.reset();
    workspaceStore.reset();
    generationStore.setOwner(next ?? 'anonymous');
  });
}
