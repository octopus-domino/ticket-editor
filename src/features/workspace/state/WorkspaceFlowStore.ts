// src/features/workspace/state/WorkspaceFlowStore.ts
import { SimpleStore } from '@/shared/store/store';
import { FlowStep, FlowState } from '../domain/WorkspaceFlow';

interface FlowStoreState extends FlowState {
  readonly isInitialized: boolean;
}

export class WorkspaceFlowStore extends SimpleStore<FlowStoreState> {
  constructor() {
    super({
      current: 'schema',
      completed: new Set(),
      isInitialized: false,
    });
  }

  public goTo(step: FlowStep): void {
    this.setState((s) => ({ ...s, current: step }));
  }

  public markCompleted(step: FlowStep): void {
    this.setState((s) => {
      const nextCompleted = new Set(s.completed);
      nextCompleted.add(step);
      return { ...s, completed: nextCompleted };
    });
  }
}

export const workspaceFlowStore = new WorkspaceFlowStore();